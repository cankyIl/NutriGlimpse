import CoreVideo
import Foundation

struct ShelfPreparedFrame {
  let pixels: CVPixelBuffer
  let geometry: ShelfLetterboxGeometry
}

// Used only by the serial inference queue. One reusable output is safe because a new camera frame
// cannot enter until the preceding synchronous Vision request returns. Nothing is encoded or saved.
final class ShelfLetterbox {
  private var output: CVPixelBuffer?
  private var outputSide = 0
  private var geometry: ShelfLetterboxGeometry?
  private var xSamples: [ShelfLinearSample] = []
  private var ySamples: [ShelfLinearSample] = []

  func erase() {
    guard let buffer = output, CVPixelBufferLockBaseAddress(buffer, []) == kCVReturnSuccess else { return }
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    if let base = CVPixelBufferGetBaseAddress(buffer) {
      base.initializeMemory(as: UInt8.self, repeating: 0, count: CVPixelBufferGetBytesPerRow(buffer) * CVPixelBufferGetHeight(buffer))
    }
  }

  func prepare(_ input: CVPixelBuffer, side: Int) throws -> ShelfPreparedFrame {
    let sourceWidth = CVPixelBufferGetWidth(input)
    let sourceHeight = CVPixelBufferGetHeight(input)
    guard sourceWidth > 0, sourceHeight > 0, side == 640,
          CVPixelBufferGetPixelFormatType(input) == kCVPixelFormatType_32BGRA else { throw ShelfModel.failure("LETTERBOX_INPUT_UNSUPPORTED") }
    if output == nil || outputSide != side {
      let attributes: [String: Any] = [kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any](),
        kCVPixelBufferMetalCompatibilityKey as String: true]
      var created: CVPixelBuffer?
      guard CVPixelBufferCreate(kCFAllocatorDefault, side, side, kCVPixelFormatType_32BGRA,
        attributes as CFDictionary, &created) == kCVReturnSuccess, let created = created else { throw ShelfModel.failure("LETTERBOX_ALLOCATION_FAILED") }
      output = created; outputSide = side
    }
    if geometry?.sourceWidth != sourceWidth || geometry?.sourceHeight != sourceHeight || geometry?.side != side {
      let next = ShelfLetterboxGeometry(sourceWidth: sourceWidth, sourceHeight: sourceHeight, side: side)
      geometry = next
      xSamples = ShelfLinearSample.axis(source: sourceWidth, destination: next.resizedWidth)
      ySamples = ShelfLinearSample.axis(source: sourceHeight, destination: next.resizedHeight)
    }
    guard let destination = output, let plan = geometry else { throw ShelfModel.failure("LETTERBOX_ALLOCATION_FAILED") }
    guard CVPixelBufferLockBaseAddress(input, .readOnly) == kCVReturnSuccess else { throw ShelfModel.failure("LETTERBOX_SOURCE_LOCK_FAILED") }
    defer { CVPixelBufferUnlockBaseAddress(input, .readOnly) }
    guard CVPixelBufferLockBaseAddress(destination, []) == kCVReturnSuccess else { throw ShelfModel.failure("LETTERBOX_OUTPUT_LOCK_FAILED") }
    defer { CVPixelBufferUnlockBaseAddress(destination, []) }
    guard let source = CVPixelBufferGetBaseAddress(input)?.assumingMemoryBound(to: UInt8.self),
          let target = CVPixelBufferGetBaseAddress(destination)?.assumingMemoryBound(to: UInt8.self) else { throw ShelfModel.failure("LETTERBOX_BUFFER_UNAVAILABLE") }
    let inputStride = CVPixelBufferGetBytesPerRow(input)
    let outputStride = CVPixelBufferGetBytesPerRow(destination)
    // BGRA gray114; Core ML's RGB image input handles channel ordering. No color-space/gamma transform.
    for y in 0..<side {
      let row = target.advanced(by: y * outputStride)
      for x in 0..<side {
        let offset = x * 4
        row[offset] = 114; row[offset + 1] = 114; row[offset + 2] = 114; row[offset + 3] = 255
      }
    }
    for y in 0..<plan.resizedHeight {
      let ys = ySamples[y]
      let upperRow = source.advanced(by: ys.lower * inputStride)
      let lowerRow = source.advanced(by: ys.upper * inputStride)
      let row = target.advanced(by: (y + plan.top) * outputStride + plan.left * 4)
      for x in 0..<plan.resizedWidth {
        let xs = xSamples[x]
        let left = xs.lower * 4
        let right = xs.upper * 4
        let offset = x * 4
        for channel in 0..<3 {
          row[offset + channel] = ShelfLinearSample.interpolate(upperRow[left + channel], upperRow[right + channel],
            lowerRow[left + channel], lowerRow[right + channel], x: xs.fraction, y: ys.fraction)
        }
      }
    }
    return ShelfPreparedFrame(pixels: destination, geometry: plan)
  }
}
