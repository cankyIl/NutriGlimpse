import Foundation
import CoreImage
import UIKit
import Vision

// Owned exclusively by the detector inference queue. No photos or grids are written to disk.
final class ShelfGridCollector {
  struct Track {
    let id: String
    var candidate: ShelfReadCandidate
    var seen: Double
  }
  struct Crop {
    let id: String
    let image: UIImage
    let jpeg: String
  }
  private let context = CIContext(options: [.cacheIntermediates: false])
  private var tracks: [Track] = []
  private var textKeys: [String: (UInt64, [Int])] = [:]
  private var pending: [Crop] = []
  private var outstanding = Set<String>()
  private var runId = ""
  private var capacity = 16
  private var serial = 0
  private var batch = 0
  private(set) var total = 0
  private(set) var skipped = 0
  var emit: (([String: Any]) -> Void)?
  var pendingCount: Int { pending.count }
  var blocked: Bool { outstanding.count >= 3 || total >= 500 }

  func reset(runId: String, capacity: Int) {
    self.runId = runId
    self.capacity = max(1, min(16, capacity))
    tracks = []; textKeys = [:]; pending = []; outstanding = []
    serial = 0; batch = 0; total = 0; skipped = 0
  }
  func cancel() { tracks = []; textKeys = [:]; pending = []; outstanding = [] }
  func acknowledge(_ id: String) { outstanding.remove(id) }
  private func overlap(_ a: CGRect, _ b: CGRect) -> CGFloat {
    let i = a.intersection(b)
    if i.isNull || i.isEmpty { return 0 }
    let area = i.width * i.height
    return area / max(0.000001, a.width * a.height + b.width * b.height - area)
  }
  private func similar(_ a: ShelfReadCandidate, _ b: ShelfReadCandidate) -> Bool {
    overlap(a.rect, b.rect) >= 0.70 && (a.visualHash ^ b.visualHash).nonzeroBitCount <= 4
      && zip(a.meanColor, b.meanColor).reduce(0) { $0 + abs($1.0 - $1.1) } <= 25
  }
  func ingest(pixels: CVPixelBuffer, candidates: [ShelfReadCandidate], now: Double) {
    guard !blocked, pending.count < capacity else { return }
    tracks.removeAll { now - $0.seen > 3 }
    var used = Set<String>()
    var processed = 0
    let width = CGFloat(CVPixelBufferGetWidth(pixels)), height = CGFloat(CVPixelBufferGetHeight(pixels))
    let frame = CIImage(cvPixelBuffer: pixels)
    guard let source = context.createCGImage(frame, from: frame.extent) else { return }
    for candidate in candidates {
      if let index = tracks.indices.first(where: { !used.contains(tracks[$0].id) && similar(tracks[$0].candidate, candidate) }) {
        tracks[index].candidate = candidate; tracks[index].seen = now; used.insert(tracks[index].id)
        continue
      }
      guard processed < 4, !blocked else { break }
      let box = candidate.rect
      // A clipped packet cannot be reconstructed; retain all visible edges and a bounded margin.
      guard box.minX > 0.006, box.minY > 0.006, box.maxX < 0.994, box.maxY < 0.994,
        box.width * width >= 120, box.height * height >= 140, candidate.confidence >= 0.35 else { skipped += 1; continue }
      let x = box.minX * width, y = (1 - box.maxY) * height
      let rect = CGRect(x: x, y: y, width: box.width * width, height: box.height * height)
        .insetBy(dx: -4, dy: -4).intersection(CGRect(x: 0, y: 0, width: width, height: height)).integral
      guard let image = source.cropping(to: rect) else { skipped += 1; continue }
      processed += 1
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false
      request.recognitionLanguages = ["en-US"]
      try? VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
      let lines = (request.results ?? []).compactMap { item -> String? in
        guard let text = item.topCandidates(1).first, text.confidence >= 0.35 else { return nil }
        return text.string.lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
      }
      let key = lines.sorted().joined(separator: "|")
      // Readable package text is also a quality gate; no local catalog match is required.
      guard key.count >= 6 else { skipped += 1; continue }
      serial += 1
      let id = "package-\(serial)"
      tracks.append(Track(id: id, candidate: candidate, seen: now)); used.insert(id)
      if key.count >= 20, let old = textKeys[key],
        (old.0 ^ candidate.visualHash).nonzeroBitCount <= 6,
        zip(old.1, candidate.meanColor).reduce(0, { $0 + abs($1.0 - $1.1) }) <= 35 {
        continue
      }
      // Conservative exact OCR + appearance check; similar text alone never merges variants.
      if key.count >= 20 { textKeys[key] = (candidate.visualHash, candidate.meanColor) }
      let original = UIImage(cgImage: image)
      let factor = min(1, 640 / max(original.size.width, original.size.height))
      let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
      let targetSize = CGSize(width: original.size.width * factor, height: original.size.height * factor)
      let resized = UIGraphicsImageRenderer(size: targetSize, format: format).image { ctx in
        UIColor.white.setFill(); ctx.fill(CGRect(origin: .zero, size: targetSize))
        original.draw(in: CGRect(origin: .zero, size: targetSize))
      }
      guard let jpeg = resized.jpegData(compressionQuality: 0.85) else { continue }
      pending.append(Crop(id: id, image: resized, jpeg: jpeg.base64EncodedString())); total += 1
      if pending.count >= capacity { flush(); break }
    }
  }
  func flush() {
    guard !pending.isEmpty, outstanding.count < 3 else { return }
    let crops = pending
    let columns = Int(ceil(sqrt(Double(min(capacity, crops.count))))), rows = Int(ceil(Double(crops.count) / Double(columns)))
    let side = 512, label = 32
    let size = CGSize(width: columns * side, height: rows * side)
    let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
    let grid = UIGraphicsImageRenderer(size: size, format: format).image { ctx in
      UIColor.white.setFill(); ctx.fill(CGRect(origin: .zero, size: size))
      for (index, crop) in crops.enumerated() {
        let x = CGFloat((index % columns) * side), y = CGFloat((index / columns) * side)
        UIColor(white: 0.88, alpha: 1).setStroke()
        ctx.cgContext.stroke(CGRect(x: x, y: y, width: CGFloat(side), height: CGFloat(side)))
        let available = CGSize(width: CGFloat(side - 16), height: CGFloat(side - label - 16))
        let scale = min(available.width / crop.image.size.width, available.height / crop.image.size.height)
        let w = crop.image.size.width * scale, h = crop.image.size.height * scale
        crop.image.draw(in: CGRect(x: x + (CGFloat(side) - w) / 2, y: y + CGFloat(label) + (available.height - h) / 2 + 8, width: w, height: h))
        ("\(index + 1)" as NSString).draw(at: CGPoint(x: x + 12, y: y + 4),
          withAttributes: [.font: UIFont.boldSystemFont(ofSize: 23), .foregroundColor: UIColor.black])
      }
    }
    guard let data = grid.jpegData(compressionQuality: 0.88), data.count <= 3 * 1024 * 1024 else { return }
    batch += 1; let batchId = "batch-\(batch)"
    outstanding.insert(batchId); pending = []
    let cells: [[String: Any]] = crops.enumerated().map { index, crop in
      ["cell": index + 1, "packageId": crop.id, "revision": 1, "photo": crop.jpeg]
    }
    emit?(["runId": runId, "batchId": batchId, "capacity": capacity, "columns": columns, "rows": rows,
      "width": Int(size.width), "height": Int(size.height), "imageBase64": data.base64EncodedString(), "cells": cells])
  }
}
