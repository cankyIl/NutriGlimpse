package expo.modules.shelfbenchmark
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShelfBenchmarkModule:Module() {
  private val memory=object:android.content.ComponentCallbacks2 {
    override fun onConfigurationChanged(config:android.content.res.Configuration){}
    override fun onLowMemory(){ShelfCameraRuntime.stop("memory_pressure")}
    override fun onTrimMemory(level:Int){if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)ShelfCameraRuntime.stop("memory_pressure")}
  }
  override fun definition()=ModuleDefinition {
    Name("ShelfBenchmark")
    Events("onBenchmarkComplete","onShelfScanState")
    OnCreate { appContext.reactContext?.registerComponentCallbacks(memory);ShelfCameraRuntime.listener={event,body->sendEvent(event,body)} }
    OnActivityEntersBackground { ShelfCameraRuntime.stop("background") }
    OnDestroy { appContext.reactContext?.unregisterComponentCallbacks(memory);ShelfCameraRuntime.stop("unmounted");ShelfCameraRuntime.listener=null }
    AsyncFunction("getAvailabilityAsync") { modelId:String ->
      val valid=modelId in listOf("shelfset","sku110k")
      val exists=valid && runCatching{requireNotNull(appContext.reactContext).assets.open("$modelId.onnx").close()}.isSuccess
      mapOf("modelId" to modelId,"available" to exists,"reason" to if(!valid)"invalid_model" else if(exists)"ready" else "model_missing",
        "modelName" to if(modelId=="shelfset")"ShelfSetDiagnostic" else "ShelfSKU11Diagnostic","modelBundled" to exists)
    }
    View(ShelfBenchmarkView::class) {
      Events("onStatus","onMetrics","onComplete","onError","onObservations","onScanState")
      Prop("mode"){view:ShelfBenchmarkView,value:String->view.mode=value}
      Prop("modelId"){view:ShelfBenchmarkView,value:String->view.modelId=value}
      Prop("active"){view:ShelfBenchmarkView,value:Boolean->view.active=value}
      Prop("durationSeconds"){view:ShelfBenchmarkView,value:Int->view.durationSeconds=value}
      Prop("runId"){view:ShelfBenchmarkView,value:String->view.runId=value}
      OnViewDidUpdateProps{view:ShelfBenchmarkView->view.applyConfiguration()}
      OnViewDestroys{view:ShelfBenchmarkView->view.stop("unmounted")}
    }
  }
}
