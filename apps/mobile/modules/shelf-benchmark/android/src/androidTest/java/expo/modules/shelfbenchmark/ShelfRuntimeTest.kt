package expo.modules.shelfbenchmark
import android.graphics.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.TimeUnit
@RunWith(AndroidJUnit4::class)
class ShelfRuntimeTest {
 @Test fun bothModelsExecuteOnFourAttributedFixtures(){
  val instrumentation=InstrumentationRegistry.getInstrumentation()
  val target=instrumentation.targetContext
  for(model in listOf("shelfset","sku110k"))ShelfDetector(target,model).use{detector->
   for(file in listOf("cereal-close.jpg","cereal-wide.jpg","cookies-wide.jpg","cheese-tubs.jpg")){
    val original=instrumentation.context.assets.open(file).use{BitmapFactory.decodeStream(it)}
    val frame=Bitmap.createScaledBitmap(original,original.width.coerceAtMost(1600),(original.height*minOf(1.0,1600.0/original.width)).toInt(),true)
    try{
     val boxes=detector.detect(frame)
     assertTrue("$model/$file must detect at least one package",boxes.isNotEmpty())
     assertTrue(boxes.size<=96)
     for(box in boxes){assertTrue(box.x>=0&&box.y>=0&&box.right<=frame.width&&box.bottom<=frame.height&&box.area>0&&box.score in .25f..1f)}
    }finally{if(frame!==original)frame.recycle();original.recycle()}
   }
  }
 }
 @Test fun bundledTextReaderReadsFictionalPackageWithoutDownload(){
  val image=Bitmap.createBitmap(1000,500,Bitmap.Config.ARGB_8888)
  val canvas=Canvas(image);canvas.drawColor(Color.WHITE)
  val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.BLACK;textSize=64f}
  canvas.drawText("FICTIONAL OAT CEREAL",30f,120f,paint)
  canvas.drawText("WHOLE GRAIN",30f,240f,paint)
  val reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  try{
   val result=Tasks.await(reader.process(InputImage.fromBitmap(image,0)),30,TimeUnit.SECONDS)
   assertTrue(result.text.contains("OAT"));assertTrue(result.text.contains("CEREAL"))
  }finally{reader.close();image.recycle()}
 }
}
