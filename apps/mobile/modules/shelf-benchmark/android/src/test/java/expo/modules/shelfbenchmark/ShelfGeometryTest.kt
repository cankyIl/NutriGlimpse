package expo.modules.shelfbenchmark
import org.junit.Test
import org.junit.Assert.*
class ShelfGeometryTest {
 @Test fun letterboxMapsPortraitAndRejectsInvalid(){
  val g=ShelfLetterbox(300,600)
  val b=g.source(floatArrayOf(160f,0f,480f,640f,.9f))!!
  assertEquals(0f,b.x,.01f);assertEquals(300f,b.right,.01f);assertEquals(600f,b.bottom,.01f)
  assertNull(g.source(floatArrayOf(0f,0f,20f,20f,.2f)))
  assertNull(g.source(floatArrayOf(0f,Float.NaN,20f,20f,.9f)))
  assertNull(g.source(floatArrayOf(500f,0f,160f,640f,.9f)))
 }
 @Test fun nmsKeepsDistinctAndBoundsCrowdedFrame(){
  val a=ShelfBox(0f,0f,100f,100f,.9f)
  assertEquals(2,shelfNms(listOf(a,a.copy(score=.8f),ShelfBox(100f,0f,200f,100f,.7f))).size)
  assertEquals(96,shelfNms((0..150).map{ShelfBox(it*10f,0f,it*10f+5,5f,.8f)}).size)
 }
 @Test fun plannerLimitsRateAndRetainsNewVisualPackage(){
  val p=ShelfReadPlanner()
  val a=ShelfReadRegion(ShelfBox(0f,0f,100f,100f,.9f),0L,intArrayOf(50,50,50))
  assertNotNull(p.next(listOf(a),0));assertNull(p.next(listOf(a),500));assertNull(p.next(listOf(a),1000))
  assertNotNull(p.next(listOf(a),2000))
  val b=a.copy(hash=-1L,color=intArrayOf(200,200,200))
  assertNotNull(p.next(listOf(b),3000));assertEquals(2,p.size)
  p.next(emptyList(),10000);assertEquals(0,p.size)
 }
}
