package expo.modules.privateinput

import android.content.ContentResolver
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.UUID

data class PrivateStagedReport(val handle: String, val file: File, val mime: String,
  val fingerprint: String, val pageCount: Int)

// Only app-owned cache copies and the current session folder may be removed.
internal object PrivateReportFiles {
  private const val journalName = "picker-baseline.json"
  private val generated = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:\\.[A-Za-z0-9]{1,10})?$")
  private fun roots(cache: File): List<Pair<String, File>> {
    val base = cache.canonicalFile
    return listOf("cache" to base, "ImagePicker" to File(base, "ImagePicker"), "DocumentPicker" to File(base, "DocumentPicker"))
      .filter { (key, root) -> key == "cache" || root.canonicalFile.parentFile == base }
  }
  private fun files(root: File): List<File> {
    if (!root.exists()) return emptyList()
    return requireNotNull(root.listFiles()) { "PICKER_CACHE_UNAVAILABLE" }.filter {
      it.isFile && it.canonicalFile == it.absoluteFile && it.canonicalFile.parentFile == root.canonicalFile && generated.matches(it.name)
    }
  }
  fun beginPicker(folder: File, cache: File) {
    val baseline = JSONObject()
    roots(cache).forEach { (key, root) ->
      val names = files(root).map { it.name }
      check(names.size <= 4096) { "PICKER_CACHE_LIMIT" }
      baseline.put(key, JSONArray(names))
    }
    PrivateReportJournal.write(File(folder, journalName),
      JSONObject().put("version", 1).put("baseline", baseline).toString().toByteArray(Charsets.UTF_8))
  }
  fun cleanupPickerCopies(folder: File, cache: File) {
    val journal = File(folder, journalName)
    if (!journal.exists()) return
    check(journal.length() in 1..(2 * 1024 * 1024).toLong()) { "PICKER_CLEANUP_FAILED" }
    val record = JSONObject(journal.readText())
    check(record.getInt("version") == 1) { "PICKER_CLEANUP_FAILED" }
    val baseline = record.getJSONObject("baseline")
    roots(cache).forEach { (key, root) ->
      val old = baseline.getJSONArray(key)
      check(old.length() <= 4096) { "PICKER_CLEANUP_FAILED" }
      val names = (0 until old.length()).map { old.getString(it) }.toSet()
      files(root).filter { it.name !in names }.forEach { check(it.delete()) { "PICKER_CLEANUP_FAILED" } }
    }
    check(journal.delete()) { "PICKER_CLEANUP_FAILED" }
  }
  fun stage(uriText: String, mime: String, folder: File, resolver: ContentResolver, checkSession: () -> Unit): PrivateStagedReport {
    require(mime in listOf("image/jpeg", "image/png", "application/pdf")) { "UNSUPPORTED_FORMAT" }
    val uri = Uri.parse(uriText)
    require(uri.scheme in listOf("file", "content")) { "LOCAL_INPUT_REQUIRED" }
    val target = File(folder, "report-source.bin")
    check(!target.exists()) { "INPUT_SOURCE_EXISTS" }
    try {
      val digest = MessageDigest.getInstance("SHA-256")
      digest.update("health-grocery-report-source-v1\u0000".toByteArray(Charsets.UTF_8))
      resolver.openInputStream(uri).use { incoming ->
        val input = requireNotNull(incoming) { "INPUT_SOURCE_UNAVAILABLE" }
        target.outputStream().use { output ->
          val buffer = ByteArray(65536)
          var size = 0
          while (true) {
            checkSession()
            val count = input.read(buffer)
            if (count < 0) break
            if (count == 0) continue
            size += count
            require(size <= 20 * 1024 * 1024) { "INPUT_TOO_LARGE" }
            digest.update(buffer, 0, count)
            output.write(buffer, 0, count)
          }
          require(size > 0) { "EMPTY_INPUT" }
          output.fd.sync()
        }
      }
      checkSession()
      val pages = if (mime == "application/pdf") {
        ParcelFileDescriptor.open(target, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
          PdfRenderer(descriptor).use { document ->
            require(document.pageCount in 1..10) { "PAGE_LIMIT" }
            document.pageCount
          }
        }
      } else {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(target.path, bounds)
        require(bounds.outMimeType == mime && bounds.outWidth > 0 && bounds.outHeight > 0 &&
          bounds.outWidth.toLong() * bounds.outHeight <= 40000000L) { "IMAGE_LIMIT_OR_FORMAT" }
        1
      }
      return PrivateStagedReport(UUID.randomUUID().toString(), target, mime,
        "sha256:" + digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }, pages)
    } catch (error: Exception) {
      if (target.exists()) check(target.delete()) { "CLEANUP_FAILED" }
      throw error
    }
  }
}
