import Foundation
import CryptoKit
import ImageIO
import PDFKit

struct PrivateStagedReport {
  let handle: String
  let url: URL
  let mime: String
  let fingerprint: String
  let pageCount: Int
}

enum PrivateReportFiles {
  private static let journalName = "picker-baseline.json"
  private static let maximumBytes = 20 * 1024 * 1024
  static func failure(_ code: String) -> NSError {
    NSError(domain: "PrivateInput", code: 1, userInfo: [NSLocalizedDescriptionKey: code])
  }
  static func protect(_ url: URL) throws {
    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
    var writable = url
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try writable.setResourceValues(values)
  }
  private static func roots(_ cache: URL) -> [(String, URL)] {
    let base = cache.standardizedFileURL.resolvingSymlinksInPath()
    return [("cache", base), ("ImagePicker", base.appendingPathComponent("ImagePicker", isDirectory: true)),
      ("DocumentPicker", base.appendingPathComponent("DocumentPicker", isDirectory: true))].filter { key, url in
      key == "cache" || url.resolvingSymlinksInPath().deletingLastPathComponent() == base
    }
  }
  private static func generatedFiles(in directory: URL) throws -> [URL] {
    guard FileManager.default.fileExists(atPath: directory.path) else { return [] }
    let files = try FileManager.default.contentsOfDirectory(at: directory,
      includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey], options: [])
    return try files.filter { file in
      let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
      guard values.isRegularFile == true, values.isSymbolicLink != true,
        file.standardizedFileURL.resolvingSymlinksInPath().deletingLastPathComponent() == directory.standardizedFileURL.resolvingSymlinksInPath() else { return false }
      return file.lastPathComponent.range(of: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:\\.[A-Za-z0-9]{1,10})?$", options: .regularExpression) != nil
    }
  }
  // Written BEFORE the system picker opens. This also catches picker-created intermediates
  // and a process interruption before the selected URI reaches JavaScript.
  static func beginPicker(folder: URL, cache: URL) throws {
    var baseline: [String: [String]] = [:]
    for (key, root) in roots(cache) {
      let names = try generatedFiles(in: root).map { $0.lastPathComponent }
      guard names.count <= 4096 else { throw failure("PICKER_CACHE_LIMIT") }
      baseline[key] = names
    }
    let data = try JSONSerialization.data(withJSONObject: ["version": 1, "baseline": baseline])
    let journal = folder.appendingPathComponent(journalName)
    try data.write(to: journal, options: [.atomic, .completeFileProtection])
    try protect(journal)
  }
  static func cleanupPickerCopies(folder: URL, cache: URL) throws {
    let journal = folder.appendingPathComponent(journalName)
    guard FileManager.default.fileExists(atPath: journal.path) else { return }
    guard let size = try journal.resourceValues(forKeys: [.fileSizeKey]).fileSize, size <= 2 * 1024 * 1024,
      let record = try JSONSerialization.jsonObject(with: Data(contentsOf: journal)) as? [String: Any],
      record["version"] as? Int == 1, let baseline = record["baseline"] as? [String: [String]] else { throw failure("PICKER_CLEANUP_FAILED") }
    for (key, root) in roots(cache) {
      guard let oldNames = baseline[key], oldNames.count <= 4096 else { throw failure("PICKER_CLEANUP_FAILED") }
      let old = Set(oldNames)
      for file in try generatedFiles(in: root) where !old.contains(file.lastPathComponent) {
        try FileManager.default.removeItem(at: file) // Exact app-owned UUID cache file only; never a provider original.
      }
    }
    try FileManager.default.removeItem(at: journal)
  }
  static func stage(uri: String, mime: String, folder: URL, check: () throws -> Void) throws -> PrivateStagedReport {
    guard ["image/jpeg", "image/png", "application/pdf"].contains(mime),
      let source = URL(string: uri), source.isFileURL else { throw failure("LOCAL_INPUT_REQUIRED") }
    let granted = source.startAccessingSecurityScopedResource()
    defer { if granted { source.stopAccessingSecurityScopedResource() } }
    let target = folder.appendingPathComponent("report-source.bin")
    guard !FileManager.default.fileExists(atPath: target.path),
      FileManager.default.createFile(atPath: target.path, contents: nil, attributes: [.protectionKey: FileProtectionType.complete]) else { throw failure("INPUT_STORAGE_UNAVAILABLE") }
    try protect(target)
    do {
      let reader = try FileHandle(forReadingFrom: source)
      defer { try? reader.close() }
      let writer = try FileHandle(forWritingTo: target)
      defer { try? writer.close() }
      var hash = SHA256()
      hash.update(data: Data("health-grocery-report-source-v1\0".utf8))
      var count = 0
      while let data = try reader.read(upToCount: 65536), !data.isEmpty {
        try check()
        count += data.count
        guard count <= maximumBytes else { throw failure("INPUT_TOO_LARGE") }
        hash.update(data: data)
        try writer.write(contentsOf: data)
      }
      guard count > 0 else { throw failure("EMPTY_INPUT") }
      try writer.synchronize()
      try check()
      let pageCount: Int
      if mime == "application/pdf" {
        guard let pdf = PDFDocument(url: target), !pdf.isLocked, (1...10).contains(pdf.pageCount) else { throw failure("PDF_LIMIT_OR_LOCKED") }
        pageCount = pdf.pageCount
      } else {
        guard let image = CGImageSourceCreateWithURL(target as CFURL, nil),
          let type = CGImageSourceGetType(image) as String?, type == (mime == "image/jpeg" ? "public.jpeg" : "public.png"),
          let properties = CGImageSourceCopyPropertiesAtIndex(image, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int,
          width > 0, height > 0, Double(width) * Double(height) <= 40000000 else { throw failure("IMAGE_LIMIT_OR_FORMAT") }
        pageCount = 1
      }
      return PrivateStagedReport(handle: UUID().uuidString, url: target, mime: mime,
        fingerprint: "sha256:" + hash.finalize().map { String(format: "%02x", $0) }.joined(), pageCount: pageCount)
    } catch {
      try? FileManager.default.removeItem(at: target)
      throw error
    }
  }
}
