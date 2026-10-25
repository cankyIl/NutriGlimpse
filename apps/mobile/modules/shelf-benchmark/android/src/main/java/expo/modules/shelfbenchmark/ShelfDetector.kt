package expo.modules.shelfbenchmark

import android.content.Context
import android.graphics.*
import ai.onnxruntime.*
import org.json.JSONObject
import java.nio.FloatBuffer
import java.security.MessageDigest

// Diagnostic assets only. No camera bitmap, crop, OCR transcript or tensor is written to disk.
class ShelfDetector(context: Context,val modelId:String):AutoCloseable {
  val metadata=JSONObject(context.assets.open("$modelId.json").bufferedReader().use{it.readText()})
  private val environment=OrtEnvironment.getEnvironment()
  private val session:OrtSession
  init {
    require(modelId in listOf("shelfset","sku110k"))
    val bytes=context.assets.open("$modelId.onnx").use{it.readBytes()}
    val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    check(digest==metadata.getString("sha256")){"MODEL_INTEGRITY"}
    OrtSession.SessionOptions().use { options ->
      options.setIntraOpNumThreads(2);options.setInterOpNumThreads(1)
      session=environment.createSession(bytes,options)
    }
    check(session.inputNames==setOf("image"))
  }
  fun detect(frame:Bitmap):List<ShelfBox> {
    val geometry=ShelfLetterbox(frame.width,frame.height)
    val input=Bitmap.createBitmap(640,640,Bitmap.Config.ARGB_8888)
    try {
      val canvas=Canvas(input);canvas.drawColor(Color.rgb(114,114,114))
      canvas.drawBitmap(frame,null,Rect(geometry.left,geometry.top,geometry.left+geometry.scaledWidth,geometry.top+geometry.scaledHeight),Paint(Paint.FILTER_BITMAP_FLAG))
      val pixels=IntArray(640*640);input.getPixels(pixels,0,640,0,0,640,640)
      val values=FloatArray(pixels.size*3)
      for(i in pixels.indices){values[i]=Color.red(pixels[i])/255f;values[i+pixels.size]=Color.green(pixels[i])/255f;values[i+2*pixels.size]=Color.blue(pixels[i])/255f}
      OnnxTensor.createTensor(environment,FloatBuffer.wrap(values),longArrayOf(1,3,640,640)).use { tensor ->
        session.run(mapOf("image" to tensor)).use { result ->
          @Suppress("UNCHECKED_CAST") val rows=result[0].value as Array<FloatArray>
          check(rows.size<=10000)
          return shelfNms(rows.mapNotNull{geometry.source(it)})
        }
      }
    } finally {input.recycle()}
  }
  override fun close(){session.close()}
}
