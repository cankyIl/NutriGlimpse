import Foundation
import CoreGraphics

// Geometry math shared by the camera preprocessor and executable Mac fixture checks.
struct ShelfLetterboxGeometry {
  let sourceWidth: Int
  let sourceHeight: Int
  let side: Int
  let gain: Double
  let resizedWidth: Int
  let resizedHeight: Int
  let left: Int
  let top: Int
  var right: Int { side - resizedWidth - left }
  var bottom: Int { side - resizedHeight - top }

  init(sourceWidth: Int, sourceHeight: Int, side: Int) {
    precondition(sourceWidth > 0 && sourceHeight > 0 && side > 0)
    self.sourceWidth = sourceWidth; self.sourceHeight = sourceHeight; self.side = side
    let scale = min(Double(side) / Double(sourceWidth), Double(side) / Double(sourceHeight))
    gain = scale
    resizedWidth = max(1, Int((Double(sourceWidth) * scale).rounded(.toNearestOrEven)))
    resizedHeight = max(1, Int((Double(sourceHeight) * scale).rounded(.toNearestOrEven)))
    left = Int((Double(side - resizedWidth) / 2 - 0.1).rounded(.toNearestOrEven))
    top = Int((Double(side - resizedHeight) / 2 - 0.1).rounded(.toNearestOrEven))
  }

  func sourceRect(fromVision rect: CGRect) -> CGRect? {
    guard rect.minX.isFinite, rect.minY.isFinite, rect.width.isFinite, rect.height.isFinite,
          rect.width > 0, rect.height > 0 else { return nil }
    // Vision is bottom-left normalized on the square input. Ultralytics scale_boxes removes
    // integer left/top padding then divides both axes by the same pre-rounding gain.
    let x = (Double(rect.minX) * Double(side) - Double(left)) / gain / Double(sourceWidth)
    let topY = ((1 - Double(rect.maxY)) * Double(side) - Double(top)) / gain / Double(sourceHeight)
    let width = Double(rect.width) * Double(side) / gain / Double(sourceWidth)
    let height = Double(rect.height) * Double(side) / gain / Double(sourceHeight)
    let source = CGRect(x: x, y: 1 - topY - height, width: width, height: height)
      .intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
    return source.isNull || source.isEmpty ? nil : source
  }
}

struct ShelfLinearSample {
  let lower: Int
  let upper: Int
  let fraction: Double
  static func axis(source: Int, destination: Int) -> [ShelfLinearSample] {
    (0..<destination).map { position in
      let coordinate = (Double(position) + 0.5) * Double(source) / Double(destination) - 0.5
      if coordinate <= 0 { return ShelfLinearSample(lower: 0, upper: 0, fraction: 0) }
      if coordinate >= Double(source - 1) { return ShelfLinearSample(lower: source - 1, upper: source - 1, fraction: 0) }
      let lower = Int(floor(coordinate))
      return ShelfLinearSample(lower: lower, upper: lower + 1, fraction: coordinate - Double(lower))
    }
  }
  @inline(__always) static func interpolate(_ a: UInt8, _ b: UInt8, _ c: UInt8, _ d: UInt8, x: Double, y: Double) -> UInt8 {
    let upper = Double(a) + (Double(b) - Double(a)) * x
    let lower = Double(c) + (Double(d) - Double(c)) * x
    return UInt8(clamping: Int(upper + (lower - upper) * y + 0.5))
  }
}
