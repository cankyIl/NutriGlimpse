package expo.modules.shelfbenchmark

import android.Manifest
import android.content.Context
import android.graphics.*
import android.os.*
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Lifecycle
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import java.lang.ref.WeakReference
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.*

internal object ShelfCameraRuntime {
  // Shared worker keeps old and replacement views from overlapping inference or OCR.
  val readerBusy=java.util.concurrent.atomic.AtomicBoolean(false)
  val worker=Executors.newSingleThreadExecutor{r->Thread(r,"GroceryShelfReader").apply{isDaemon=true}}
  private var owner:WeakReference<ShelfBenchmarkView>?=null
  var listener:((String,Map<String,Any>)->Unit)?=null
  @Synchronized fun claim(view:ShelfBenchmarkView):Boolean {
    if(owner?.get()!=null && owner?.get()!==view)return false
    owner=WeakReference(view);return true
  }
  @Synchronized fun release(view:ShelfBenchmarkView){if(owner?.get()===view)owner=null}
  fun stop(reason:String){Handler(Looper.getMainLooper()).post{owner?.get()?.stop(reason)}}
}
class ShelfBenchmarkView(context:Context,appContext:AppContext):ExpoView(context,appContext) {
  override val shouldUseAndroidLayout=true
  val onStatus by EventDispatcher()
  val onMetrics by EventDispatcher()
  val onComplete by EventDispatcher()
  val onError by EventDispatcher()
  val onObservations by EventDispatcher()
  val onScanState by EventDispatcher()
  var mode="benchmark";var modelId="shelfset";var active=false;var durationSeconds=30;var runId=""
  private val preview=PreviewView(context).apply{scaleType=PreviewView.ScaleType.FIT_CENTER}
  private val main=Handler(Looper.getMainLooper())
  private val generation=AtomicLong()
  @Volatile private var running=false
  private var boundKey=""
  private var currentRun=""
  private var currentModel=""
  private var currentMode=""
  private var requestedDuration=30
  private var provider:ProcessCameraProvider?=null
  private var analysis:ImageAnalysis?=null
  private var cameraPreview:Preview?=null
  private var detector:ShelfDetector?=null // worker only
  private var planner=ShelfReadPlanner()
  private var start=0L;private var nextFrame=0L;private var sequence=0;private var frames=0
  private var skipped=0;private var failures=0;private var boxes=0;private var latestBoxes=0;private var modelLoad=0.0
  private var fingerprint="";private var exportFingerprint=""
  private val latencies=mutableListOf<Double>()
  private val thermals=mutableSetOf<String>()
  private var permissionPending=false
  init{addView(preview,LayoutParams(LayoutParams.MATCH_PARENT,LayoutParams.MATCH_PARENT))}
  override fun onAttachedToWindow(){super.onAttachedToWindow();applyConfiguration()}
  override fun onDetachedFromWindow(){stop("unmounted");super.onDetachedFromWindow()}
  fun applyConfiguration(){
    if(!isAttachedToWindow)return
    if(!active){stop("stopped");return}
    val key="$runId:$modelId:$mode"
    if(boundKey==key)return
    if(running||boundKey.isNotEmpty())stop("stopped")
    if(runId.isBlank()||modelId !in listOf("shelfset","sku110k")||mode !in listOf("scan","benchmark")||durationSeconds !in listOf(30,300)){fail("INVALID_CONFIGURATION","The camera configuration is unavailable.");return}
    val activity=appContext.currentActivity as? LifecycleOwner
    if(activity==null||!activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED))return
    val permissions=appContext.permissions
    if(permissions?.hasGrantedPermissions(Manifest.permission.CAMERA)!=true){
      if(permissionPending)return
      permissionPending=true
      onStatus(mapOf("runId" to runId,"state" to "permission_required","message" to "Allow the camera to read packages on this device."))
      permissions?.askForPermissions({result->
        main.post{
          permissionPending=false
          val response=result[Manifest.permission.CAMERA]
          if(response?.status==PermissionsStatus.GRANTED)main.postDelayed({applyConfiguration()},250)
          else fail("CAMERA_PERMISSION_DENIED","Camera permission is needed for shelf scanning.",response?.canAskAgain?:false)
        }
      },Manifest.permission.CAMERA)?:run{permissionPending=false;fail("CAMERA_PERMISSION_DENIED","Camera permission is unavailable.")}
      return
    }
    if(!ShelfCameraRuntime.claim(this)){fail("CAMERA_BUSY","Another camera task is finishing. Retry in a moment.");return}
    boundKey=key;currentRun=runId;currentModel=modelId;currentMode=mode;requestedDuration=durationSeconds
    val loadingModel=currentModel
    val token=generation.incrementAndGet()
    running=true
    onStatus(mapOf("runId" to currentRun,"state" to "loading","message" to "Preparing on-device shelf reading…"))
    ShelfCameraRuntime.worker.execute{
      try{
        val began=SystemClock.elapsedRealtime();val loaded=ShelfDetector(context,loadingModel)
        if(!valid(token)){loaded.close();return@execute}
        detector=loaded;modelLoad=(SystemClock.elapsedRealtime()-began).toDouble()
        fingerprint=loaded.metadata.getString("sourceSha256");exportFingerprint=loaded.metadata.getString("sha256")
        planner=ShelfReadPlanner();frames=0;skipped=0;failures=0;boxes=0;latestBoxes=0;sequence=0;latencies.clear();thermals.clear()
        main.post{if(valid(token))bindCamera(token,activity)}
      }catch(_:Exception){main.post{if(valid(token))fail("MODEL_UNAVAILABLE","The shelf model could not be loaded. Reinstall the complete diagnostic build.")}}
    }
  }
  private fun valid(token:Long)=running&&generation.get()==token
  private fun bindCamera(token:Long,owner:LifecycleOwner){
    val future=ProcessCameraProvider.getInstance(context)
    future.addListener({
      if(!valid(token))return@addListener
      try{
        val p=future.get();provider=p
        val previewUse=Preview.Builder().build().also{it.setSurfaceProvider(preview.surfaceProvider)}
        val imageUse=ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .setResolutionSelector(androidx.camera.core.resolutionselector.ResolutionSelector.Builder()
            .setResolutionStrategy(androidx.camera.core.resolutionselector.ResolutionStrategy(android.util.Size(1280,960),androidx.camera.core.resolutionselector.ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER)).build()).build()
        cameraPreview=previewUse;analysis=imageUse
        start=SystemClock.elapsedRealtime();nextFrame=start
        imageUse.setAnalyzer(ShelfCameraRuntime.worker){image->analyze(image,token)}
        p.bindToLifecycle(owner,CameraSelector.DEFAULT_BACK_CAMERA,previewUse,imageUse)
        val state=mapOf<String,Any>("runId" to currentRun,"state" to "running","reason" to "started")
        onScanState(state);ShelfCameraRuntime.listener?.invoke("onShelfScanState",state)
        onStatus(mapOf("runId" to currentRun,"state" to "running","message" to "Scanning on this device. Pause to check possible matches."))
        if(currentMode=="benchmark")main.postDelayed({if(valid(token))stop("completed")},requestedDuration*1000L)
      }catch(_:Exception){fail("CAMERA_UNAVAILABLE","The camera could not start. Close other camera screens and retry.")}
    },ContextCompat.getMainExecutor(context))
  }
  private fun analyze(image:ImageProxy,token:Long){
    val now=SystemClock.elapsedRealtime()
    if(!valid(token)){image.close();return}
    if(now<nextFrame||ShelfCameraRuntime.readerBusy.get()){skipped++;image.close();return}
    nextFrame=now+500
    var frame:Bitmap?=null
    try{
      val source=image.toBitmap()
      val rotation=image.imageInfo.rotationDegrees
      frame=if(rotation==0)source else Bitmap.createBitmap(source,0,0,source.width,source.height,Matrix().apply{postRotate(rotation.toFloat())},true).also{if(it!==source)source.recycle()}
      image.close()
      if(!valid(token))return
      val found=requireNotNull(detector).detect(frame)
      if(!valid(token))return
      boxes+=found.size;latestBoxes=found.size;frames++
      val took=(SystemClock.elapsedRealtime()-now).toDouble();latencies.add(took);if(latencies.size>1200)latencies.removeAt(0)
      thermals.add(thermal())
      if(currentMode=="scan"){
        val regions=found.filter{it.right-it.x>=24&&it.bottom-it.y>=24}.map{region(frame,it)}
        val selected=planner.next(regions,SystemClock.elapsedRealtime())
        if(selected!=null&&valid(token)){
          val observation=readPackage(frame,selected.first,selected.second.box,token)
          if(observation!=null&&valid(token)){
            val body=mapOf<String,Any>("runId" to currentRun,"sequence" to ++sequence,"observations" to listOf(observation))
            main.post{if(valid(token))onObservations(body)}
          }
        }
      }
      val report=metrics();main.post{if(valid(token))onMetrics(report)}
    }catch(_:Exception){
      failures++
      if(failures>=5)main.post{if(valid(token))fail("READER_FAILED","Scanning paused after repeated reader errors. Earlier products are preserved.")}
    }finally{image.close();frame?.recycle()}
  }
  private fun region(frame:Bitmap,box:ShelfBox):ShelfReadRegion{
    val colors=IntArray(64)
    for(y in 0..7)for(x in 0..7)colors[y*8+x]=frame.getPixel((box.x+(box.right-box.x)*(x+.5)/8).toInt().coerceIn(0,frame.width-1),(box.y+(box.bottom-box.y)*(y+.5)/8).toInt().coerceIn(0,frame.height-1))
    val gray=colors.map{(Color.red(it)+Color.green(it)+Color.blue(it))/3}
    val mean=gray.average();var hash=0L
    for(i in gray.indices)if(gray[i]>=mean)hash=hash or (1L shl i)
    return ShelfReadRegion(box,hash,intArrayOf(colors.sumOf{Color.red(it)}/64,colors.sumOf{Color.green(it)}/64,colors.sumOf{Color.blue(it)}/64))
  }
  private fun readPackage(frame:Bitmap,id:Int,box:ShelfBox,token:Long):Map<String,Any>?{
    val left=floor(box.x).toInt().coerceIn(0,frame.width-1);val top=floor(box.y).toInt().coerceIn(0,frame.height-1)
    if(!ShelfCameraRuntime.readerBusy.compareAndSet(false,true))return null
    val clipped=Bitmap.createBitmap(frame,left,top,(ceil(box.right).toInt()-left).coerceIn(1,frame.width-left),(ceil(box.bottom).toInt()-top).coerceIn(1,frame.height-top))
    val crop=clipped.copy(Bitmap.Config.ARGB_8888,false)
    if(clipped!==frame)clipped.recycle()
    val barcode=BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_EAN_13,Barcode.FORMAT_EAN_8,Barcode.FORMAT_UPC_A,Barcode.FORMAT_UPC_E,Barcode.FORMAT_ITF).build())
    val reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    var pending:com.google.android.gms.tasks.Task<*>?=null
    try{
      if(!valid(token))return null
      val input=InputImage.fromBitmap(crop,0)
      val task=barcode.process(input);pending=task
      val detected=Tasks.await(task,12,TimeUnit.SECONDS)
      if(!valid(token))return null
      val barcodes=detected.take(32).mapNotNull{item->
        val format=when(item.format){Barcode.FORMAT_EAN_13->Pair("ean13",13);Barcode.FORMAT_EAN_8->Pair("ean8",8);Barcode.FORMAT_UPC_A->Pair("upc_a",12);Barcode.FORMAT_UPC_E->Pair("upc_e",8);Barcode.FORMAT_ITF->Pair("itf14",14);else->null}
        val raw=item.rawValue
        if(format!=null&&raw!=null&&raw.length==format.second&&raw.all{it in '0'..'9'})mapOf("value" to raw,"symbology" to format.first)else null
      }.distinct().take(2)
      val text=mutableListOf<Map<String,Any>>()
      if(barcodes.isEmpty()){
        val read=reader.process(input);pending=read
        val result=Tasks.await(read,12,TimeUnit.SECONDS)
        if(!valid(token))return null
        var remaining=240
        for(line in result.textBlocks.flatMap{it.lines}.take(96).sortedWith(compareBy({it.boundingBox?.top?:0},{it.boundingBox?.left?:0}))){
          val confidence=line.confidence.toDouble()
          if(!confidence.isFinite()||confidence !in .3..1.0)continue
          val value=line.text.take(960).replace(Regex("[\\p{Cntrl}\\s]+")," ").trim().take(remaining)
          if(value.isNotEmpty()){text.add(mapOf("value" to value,"confidence" to confidence));remaining-=value.length}
          if(remaining==0||text.size==12)break
        }
      }
      if(!valid(token)||(barcodes.isEmpty()&&text.isEmpty()))return null
      return mapOf("observationId" to UUID.randomUUID().toString(),"trackIdHint" to "region-$id","rect" to mapOf("x" to box.x/frame.width,"y" to box.y/frame.height,"width" to (box.right-box.x)/frame.width,"height" to (box.bottom-box.y)/frame.height),"detectorConfidence" to box.score,"barcodes" to barcodes,"text" to text,"needsConfirmation" to true)
    }finally{
      val task=pending
      // A timed-out ML Kit task may still own its input. Suppress delivery and release only on completion.
      if(task!=null&&!task.isComplete)task.addOnCompleteListener{crop.recycle();barcode.close();reader.close();ShelfCameraRuntime.readerBusy.set(false)}
      else{crop.recycle();barcode.close();reader.close();ShelfCameraRuntime.readerBusy.set(false)}
    }
  }
  private fun thermal():String {
    if(Build.VERSION.SDK_INT<29)return "unknown"
    return when((context.getSystemService(Context.POWER_SERVICE) as PowerManager).currentThermalStatus){
      PowerManager.THERMAL_STATUS_NONE->"nominal";PowerManager.THERMAL_STATUS_LIGHT->"fair"
      PowerManager.THERMAL_STATUS_MODERATE,PowerManager.THERMAL_STATUS_SEVERE->"serious";else->"critical"
    }
  }
  private fun metrics():Map<String,Any>{
    val elapsed=if(start==0L)0.0 else (SystemClock.elapsedRealtime()-start)/1000.0
    val sorted=latencies.sorted()
    fun percentile(q:Double)=if(sorted.isEmpty())0.0 else sorted[(ceil(sorted.size*q).toInt()-1).coerceIn(0,sorted.lastIndex)]
    val scheduled=floor(elapsed*2).toInt()
    return mapOf("runId" to currentRun,"elapsedSeconds" to elapsed,"requestedDurationSeconds" to requestedDuration,"completedFrames" to frames,"acceptedFrames" to frames+failures,
      "scheduledSlots" to scheduled,"busyDroppedSlots" to 0,"missedCaptureSlots" to max(0,scheduled-frames-failures),"cameraDroppedFrames" to 0,"skippedCameraFrames" to skipped,
      "failedFrames" to failures,"detectedBoxes" to boxes,"latestBoxes" to latestBoxes,"completedFramesPerSecond" to if(elapsed>0)frames/elapsed else 0.0,
      "latencyP50Ms" to percentile(.5),"latencyP95Ms" to percentile(.95),"latencyMaxMs" to (sorted.lastOrNull()?:0.0),"thermalState" to thermal())
  }
  fun stop(reason:String){
    if(!running&&boundKey.isEmpty())return
    val id=currentRun;val selectedModel=currentModel;val selectedMode=currentMode;val duration=requestedDuration
    running=false;boundKey="";generation.incrementAndGet()
    analysis?.clearAnalyzer()
    val useCases=listOfNotNull(cameraPreview,analysis)
    runCatching{provider?.unbind(*useCases.toTypedArray())}
    analysis=null;cameraPreview=null;ShelfCameraRuntime.release(this)
    val state=mapOf<String,Any>("runId" to id,"state" to if(reason in listOf("stopped","completed","unmounted"))"stopped" else "interrupted","reason" to if(reason=="completed")"stopped" else reason)
    onScanState(state);ShelfCameraRuntime.listener?.invoke("onShelfScanState",state)
    ShelfCameraRuntime.worker.execute{
      detector?.close();detector=null
      if(selectedMode=="benchmark"){
        val m=metrics();val complete=reason=="completed"&&(m["elapsedSeconds"] as Double)>=duration
        val packageInfo=context.packageManager.getPackageInfo(context.packageName,0)
        val summary=m+mapOf("runId" to id,"schemaVersion" to 1,"modelId" to selectedModel,"preprocessing" to "RGB 640px letterbox; bilinear; 114 padding; float NCHW /255",
          "trueClassCount" to 1,"scoreColumnCount" to 1,"diagnosticOnly" to true,"licenseStatus" to "Research diagnostics only; distribution rights unapproved",
          "completedAt" to Instant.now().toString(),"termination" to reason,"durationComplete" to complete,"targetFramesPerSecond" to 2,
          "timingGatePassed" to (complete&&failures==0&&(m["completedFramesPerSecond"] as Double)>=1.8&&(m["latencyP95Ms"] as Double)<=500),
          "accuracyValidated" to false,"modelName" to if(selectedModel=="shelfset")"ShelfSetDiagnostic" else "ShelfSKU11Diagnostic","modelFingerprint" to fingerprint,
          "modelExportFingerprint" to exportFingerprint,"modelLoadMilliseconds" to modelLoad,"inputSize" to 640,"predictionMode" to "single-full-frame",
          "confidenceThreshold" to .25,"iouThreshold" to .5,"computeUnits" to "ONNX Runtime CPU / 2 threads","prompts" to listOf("product"),
          "appVersion" to (packageInfo.versionName?:"unknown"),"appBuildNumber" to packageInfo.longVersionCode.toString(),"buildConfiguration" to if(context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE!=0)"debug" else "release",
          "deviceModel" to Build.MODEL,"operatingSystemVersion" to Build.VERSION.RELEASE,"thermalStatesObserved" to thermals.toList(),
          "lowPowerMode" to (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isPowerSaveMode,
          "latencyScope" to "RGBA conversion, rotation, letterbox, CPU inference, NMS; camera-driver dropped frames are not observable",
          "retainedImages" to 0,"networkRequests" to 0)
        main.post{onComplete(summary);ShelfCameraRuntime.listener?.invoke("onBenchmarkComplete",summary)}
      }
    }
  }
  private fun fail(code:String,message:String,canAskAgain:Boolean=false){
    val id=if(currentRun.isNotBlank())currentRun else runId
    onError(mapOf("runId" to id,"code" to code,"message" to message,"canAskAgain" to canAskAgain));stop("error")
  }
}
