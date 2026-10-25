import CoreVideo
import Foundation

struct ShelfScanFingerprint {
  static func candidates(pixels: CVPixelBuffer, boxes: [ShelfBox]) -> [ShelfReadCandidate] {
    guard CVPixelBufferGetPixelFormatType(pixels) == kCVPixelFormatType_32BGRA,
      CVPixelBufferLockBaseAddress(pixels, .readOnly) == kCVReturnSuccess else { return [] }
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(pixels)?.assumingMemoryBound(to: UInt8.self) else { return [] }
    let width = CVPixelBufferGetWidth(pixels), height = CVPixelBufferGetHeight(pixels)
    let stride = CVPixelBufferGetBytesPerRow(pixels)
    let selected = boxes.filter { $0.rect.width * CGFloat(width) >= 48 && $0.rect.height * CGFloat(height) >= 48 }
      .sorted { $0.rect.width * $0.rect.height > $1.rect.width * $1.rect.height }.prefix(96)
    return selected.map { box in
      // Tiny in-memory appearance sketch only prioritizes OCR. It is never an identity key.
      var hash: UInt64 = 0
      var means = [0, 0, 0]
      for y in 0..<8 {
        let py = min(height - 1, max(0, Int((1 - box.rect.maxY + box.rect.height * CGFloat(y + 1) / 9) * CGFloat(height))))
        var previous = 0
        for x in 0..<9 {
          let px = min(width - 1, max(0, Int((box.rect.minX + box.rect.width * CGFloat(x + 1) / 10) * CGFloat(width))))
          let offset = py * stride + px * 4
          let b = Int(base[offset]), g = Int(base[offset + 1]), r = Int(base[offset + 2])
          let gray = (r * 77 + g * 150 + b * 29) >> 8
          means[0] += r; means[1] += g; means[2] += b
          if x > 0 && gray > previous { hash |= UInt64(1) << (y * 8 + x - 1) }
          previous = gray
        }
      }
      return ShelfReadCandidate(rect: box.rect, confidence: box.confidence, visualHash: hash, meanColor: means.map { $0 / 72 })
    }
  }
}
