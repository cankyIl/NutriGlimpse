package expo.modules.shelfbenchmark

import kotlin.math.*
data class ShelfBox(val x: Float, val y: Float, val right: Float, val bottom: Float, val score: Float) {
  val area: Float get() = max(0f,right-x)*max(0f,bottom-y)
  fun overlap(b: ShelfBox): Float {
    val intersection=max(0f,min(right,b.right)-max(x,b.x))*max(0f,min(bottom,b.bottom)-max(y,b.y))
    return if(area+b.area-intersection>0) intersection/(area+b.area-intersection) else 0f
  }
}
data class ShelfLetterbox(val width: Int,val height: Int) {
  init { require(width in 1..4096 && height in 1..4096) }
  val ratio=min(640.0/width,640.0/height)
  val scaledWidth=(width*ratio).roundToInt()
  val scaledHeight=(height*ratio).roundToInt()
  val left=(640-scaledWidth)/2
  val top=(640-scaledHeight)/2
  fun source(row: FloatArray): ShelfBox? {
    if(row.size<5 || row.any{!it.isFinite()} || row[4] !in .25f..1f) return null
    val box=ShelfBox(((row[0]-left)/ratio).toFloat().coerceIn(0f,width.toFloat()),
      ((row[1]-top)/ratio).toFloat().coerceIn(0f,height.toFloat()),
      ((row[2]-left)/ratio).toFloat().coerceIn(0f,width.toFloat()),
      ((row[3]-top)/ratio).toFloat().coerceIn(0f,height.toFloat()),row[4])
    return box.takeIf{it.area>0}
  }
}
fun shelfNms(rows: List<ShelfBox>): List<ShelfBox> {
  val selected=mutableListOf<ShelfBox>()
  for(box in rows.sortedByDescending{it.score}) {
    if(selected.none{it.overlap(box)>.5f}) selected.add(box)
    if(selected.size==96) break
  }
  return selected
}
data class ShelfReadRegion(val box: ShelfBox,val hash: Long,val color: IntArray)
class ShelfReadPlanner {
  private data class Entry(val id: Int,var region:ShelfReadRegion,var seen:Long,var read:Long=Long.MIN_VALUE/2,var attempts:Int=0)
  private val entries=mutableListOf<Entry>()
  private var serial=0
  private var last=Long.MIN_VALUE/2
  val size get()=entries.size
  fun next(regions:List<ShelfReadRegion>,now:Long):Pair<Int,ShelfReadRegion>? {
    entries.removeAll{now-it.seen>6000}
    val used=mutableSetOf<Int>()
    for(region in regions.take(96)) {
      val entry=entries.filter{it.id !in used && it.region.box.overlap(region.box)>=.35f &&
        java.lang.Long.bitCount(it.region.hash xor region.hash)<=10 &&
        it.region.color.zip(region.color).sumOf{(a,b)->abs(a-b)}<=60}.maxByOrNull{it.region.box.overlap(region.box)}
        ?:Entry(++serial,region,now).also{entries.add(it)}
      entry.region=region;entry.seen=now;used.add(entry.id)
    }
    entries.sortWith(compareByDescending<Entry>{it.seen}.thenByDescending{it.region.box.area})
    while(entries.size>96) entries.removeAt(entries.lastIndex)
    if(now-last<1000)return null
    val selected=entries.filter{it.id in used && now-it.read>=if(it.attempts<3)2000 else 10000}
      .minWithOrNull(compareBy<Entry>{if(it.attempts==0)0 else 1}.thenBy{it.read}.thenByDescending{it.region.box.area})?:return null
    selected.read=now;selected.attempts++;last=now
    return Pair(selected.id,selected.region)
  }
}
