import Foundation
import CoreGraphics
import CoreVideo
import Vision

// One selected package, one synchronous Vision job. The engine owns the admission limit.
// Source pixels stay in native memory and are released when the job returns.
final class ShelfPackageReader {
  private let lock = NSLock()
  private var currentJobID: String?
  private var currentRequest: VNRequest?
  private var cancelled = false

  func prepare(jobID: String) {
    lock.lock(); defer { lock.unlock() }
    currentJobID = jobID; currentRequest = nil; cancelled = false
  }
  func cancel(jobID: String) {
    lock.lock()
    guard currentJobID == jobID else { lock.unlock(); return }
    cancelled = true
    let request = currentRequest
    lock.unlock()
    request?.cancel()
  }
  private func valid(jobID: String) -> Bool {
    lock.lock(); defer { lock.unlock() }
    return currentJobID == jobID && !cancelled
  }
  private func perform(_ request: VNRequest, handler: VNImageRequestHandler, jobID: String) throws -> Bool {
    lock.lock()
    guard currentJobID == jobID, !cancelled else { lock.unlock(); return false }
    currentRequest = request
    lock.unlock()
    defer {
      lock.lock()
      if currentJobID == jobID { currentRequest = nil }
      lock.unlock()
    }
    try handler.perform([request])
    return valid(jobID: jobID)
  }
  func read(pixels: CVPixelBuffer, plan: ShelfReadPlan, jobID: String) throws -> [String: Any]? {
    defer {
      lock.lock()
      if currentJobID == jobID { currentJobID = nil; currentRequest = nil }
      lock.unlock()
    }
    guard valid(jobID: jobID) else { return nil }
    let roi = plan.candidate.rect.intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
    guard !roi.isNull, !roi.isEmpty else { return nil }
    let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: .up, options: [:])
    let barcodeRequest = VNDetectBarcodesRequest()
    barcodeRequest.regionOfInterest = roi
    barcodeRequest.symbologies = [.ean13, .ean8, .upce, .itf14]
    guard try perform(barcodeRequest, handler: handler, jobID: jobID) else { return nil }
    var barcodes: [[String: Any]] = []
    var barcodeKeys = Set<String>()
    for item in (barcodeRequest.results ?? []).prefix(32) {
      guard let raw = item.payloadStringValue, raw.utf8.count <= 64, ShelfTextLimits.asciiDigits(raw) else { continue }
      let symbology: String
      let expectedLength: Int
      switch item.symbology {
      case .ean13: symbology = "ean13"; expectedLength = 13
      case .ean8: symbology = "ean8"; expectedLength = 8
      case .upce: symbology = "upc_e"; expectedLength = 8
      case .itf14: symbology = "itf14"; expectedLength = 14
      default: continue
      }
      // Do not reinterpret unknown formats, guess a missing digit, or assert catalog identity.
      guard raw.utf8.count == expectedLength, barcodeKeys.insert(symbology + ":" + raw).inserted else { continue }
      barcodes.append(["value": raw, "symbology": symbology])
      if barcodes.count == 2 { break }
    }
    var text: [[String: Any]] = []
    if barcodes.isEmpty {
      let textRequest = VNRecognizeTextRequest()
      textRequest.regionOfInterest = roi
      textRequest.recognitionLevel = .accurate
      textRequest.recognitionLanguages = ["en-US"]
      textRequest.usesLanguageCorrection = false
      textRequest.minimumTextHeight = 0.005
      guard try perform(textRequest, handler: handler, jobID: jobID) else { return nil }
      var remaining = 240
      let lines = (textRequest.results ?? []).prefix(96).sorted {
        $0.boundingBox.midY == $1.boundingBox.midY
          ? $0.boundingBox.minX < $1.boundingBox.minX : $0.boundingBox.midY > $1.boundingBox.midY
      }
      for line in lines {
        guard let candidate = line.topCandidates(1).first, candidate.confidence >= 0.3 else { continue }
        let value = ShelfTextLimits.compact(candidate.string, remaining: remaining)
        guard !value.isEmpty else { continue }
        text.append(["value": value, "confidence": Double(candidate.confidence)])
        remaining -= value.count
        if text.count == 12 || remaining == 0 { break }
      }
    }
    guard valid(jobID: jobID), !barcodes.isEmpty || !text.isEmpty else { return nil }
    return ["observationId": UUID().uuidString, "trackIdHint": plan.trackIdHint,
      "rect": ["x": Double(roi.minX), "y": Double(1 - roi.maxY), "width": Double(roi.width), "height": Double(roi.height)],
      "detectorConfidence": Double(plan.candidate.confidence), "barcodes": barcodes, "text": text,
      "needsConfirmation": true]
  }
}
