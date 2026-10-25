import Foundation
import CoreGraphics

private struct GeometryFixture: Decodable {
  let sourceWidth: Int, sourceHeight: Int, side: Int
  let gain: Double
  let resizedWidth: Int, resizedHeight: Int, left: Int, top: Int, right: Int, bottom: Int
  let visionRect: [Double]
  let expectedSourceRect: [Double]?
}
private struct PixelFixture: Decodable {
  let sourceWidth: Int, sourceHeight: Int, side: Int
  let sourceBgr: [UInt8], opencvBgr: [UInt8]
  let maximumAllowedDifference: Int
}
private struct Fixtures: Decodable {
  let geometry: [GeometryFixture]
  let pixels: [PixelFixture]
}
@main
struct LetterboxFixtureCheck {
  static func main() throws {
    guard CommandLine.arguments.count == 2 else { throw problem("Usage: letterbox-check path/to/letterbox-reference.json") }
    let fixtures = try JSONDecoder().decode(Fixtures.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    for (index, test) in fixtures.geometry.enumerated() {
      let plan = ShelfLetterboxGeometry(sourceWidth: test.sourceWidth, sourceHeight: test.sourceHeight, side: test.side)
      guard abs(plan.gain - test.gain) < 1e-12,
        plan.resizedWidth == test.resizedWidth, plan.resizedHeight == test.resizedHeight,
        plan.left == test.left, plan.top == test.top, plan.right == test.right, plan.bottom == test.bottom else {
        throw problem("Geometry dimensions/padding failed at case \(index)")
      }
      let v = test.visionRect
      let result = plan.sourceRect(fromVision: CGRect(x: v[0], y: v[1], width: v[2], height: v[3]))
      if let expected = test.expectedSourceRect {
        guard let result = result else { throw problem("Unexpected clipped box at case \(index)") }
        let actual = [Double(result.minX), Double(result.minY), Double(result.width), Double(result.height)]
        guard zip(actual, expected).allSatisfy({ abs($0.0 - $0.1) < 1e-8 }) else { throw problem("Inverse box mapping failed at case \(index)") }
      } else if result != nil { throw problem("Padding-only box was retained at case \(index)") }
    }
    var maximumDifference = 0
    for (index, test) in fixtures.pixels.enumerated() {
      let plan = ShelfLetterboxGeometry(sourceWidth: test.sourceWidth, sourceHeight: test.sourceHeight, side: test.side)
      let xs = ShelfLinearSample.axis(source: test.sourceWidth, destination: plan.resizedWidth)
      let ys = ShelfLinearSample.axis(source: test.sourceHeight, destination: plan.resizedHeight)
      var output = [UInt8](repeating: 114, count: test.side * test.side * 3)
      for y in 0..<plan.resizedHeight {
        for x in 0..<plan.resizedWidth {
          for channel in 0..<3 {
            func pixel(_ px: Int, _ py: Int) -> UInt8 { test.sourceBgr[(py * test.sourceWidth + px) * 3 + channel] }
            output[((y + plan.top) * test.side + x + plan.left) * 3 + channel] = ShelfLinearSample.interpolate(
              pixel(xs[x].lower, ys[y].lower), pixel(xs[x].upper, ys[y].lower),
              pixel(xs[x].lower, ys[y].upper), pixel(xs[x].upper, ys[y].upper), x: xs[x].fraction, y: ys[y].fraction)
          }
        }
      }
      guard output.count == test.opencvBgr.count else { throw problem("Pixel shape failed at case \(index)") }
      let difference = zip(output, test.opencvBgr).map { abs(Int($0.0) - Int($0.1)) }.max() ?? 0
      maximumDifference = max(maximumDifference, difference)
      guard difference <= test.maximumAllowedDifference else { throw problem("OpenCV pixel comparison failed at case \(index): \(difference)") }
    }
    print("PASS: \(fixtures.geometry.count) Swift geometry cases, \(fixtures.pixels.count) OpenCV pixel fixtures; maximum channel difference \(maximumDifference)/255. Apple camera/CoreML execution remains separate.")
  }
  private static func problem(_ message: String) -> NSError {
    NSError(domain: "ShelfLetterboxFixture", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
}
