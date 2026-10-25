import CoreML
import Foundation
import Vision

struct ShelfModel {
  let vision: VNCoreMLModel
  let name: String
  let fingerprint: String
  let exportFingerprint: String
  let modelId: String
  let preprocessing: String
  let licenseStatus: String
  let trueClassCount: Int
  let scoreColumnCount: Int
  let inputSize: Int
  let prompts: [String]
  let confidence: Float
  let agnosticNmsIou: Double

  static func resourceBundle() -> Bundle? {
    let owner = Bundle(for: ShelfBenchmarkModule.self)
    for base in [owner, Bundle.main] {
      if let url = base.url(forResource: "ShelfBenchmarkModels", withExtension: "bundle"), let bundle = Bundle(url: url) { return bundle }
    }
    return nil
  }
  static func resourceName(for modelId: String) -> String? {
    switch modelId {
    case "shelfset": return "ShelfSetDiagnostic"
    case "sku110k": return "ShelfSKU11Diagnostic"
    default: return nil
    }
  }
  static func modelURL(for modelId: String) -> URL? {
    guard let bundle = resourceBundle(), let resource = resourceName(for: modelId) else { return nil }
    return bundle.url(forResource: resource, withExtension: "mlmodelc")
  }
  static func failure(_ code: String) -> NSError {
    NSError(domain: "ShelfBenchmark", code: 1, userInfo: [NSLocalizedDescriptionKey: code])
  }
  static func load(modelId: String) throws -> ShelfModel {
    guard let resource = resourceName(for: modelId) else { throw failure("MODEL_ID_UNSUPPORTED") }
    guard let url = modelURL(for: modelId), let bundle = resourceBundle() else { throw failure("MODEL_MISSING") }
    guard let manifestURL = bundle.url(forResource: resource, withExtension: "json"),
          let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: manifestURL)) as? [String: Any],
          let prompts = manifest["prompts"] as? [String], !prompts.isEmpty,
          let fingerprint = manifest["modelFingerprint"] as? String, !fingerprint.isEmpty,
          let size = manifest["inputSize"] as? Int, size == 640,
          manifest["modelName"] as? String == resource,
          let preprocessing = manifest["preprocessing"] as? String, preprocessing == "gray114-bilinear-letterbox-v1",
          let licenseStatus = manifest["licenseStatus"] as? String,
          let trueClassCount = manifest["trueClassCount"] as? Int, trueClassCount == 1, prompts == ["product"],
          let scoreColumnCount = manifest["scoreColumnCount"] as? Int, scoreColumnCount == 80,
          let padding = manifest["zeroPaddingClassLabels"] as? [String], padding == (1..<80).map({ "__padding_\($0)" }),
          let files = manifest["files"] as? [[String: Any]],
          let exportFingerprint = files.first(where: { $0["path"] as? String == "Data/com.apple.CoreML/model.mlmodel" })?["sha256"] as? String
    else { throw failure("MODEL_MANIFEST_INVALID") }
    let configuration = MLModelConfiguration()
    configuration.computeUnits = .all
    let model = try MLModel(contentsOf: url, configuration: configuration)
    let inputs = model.modelDescription.inputDescriptionsByName
    let images = inputs.values.filter { $0.type == .image }
    let extraInputsAllowed = inputs.filter { $0.value.type != .image }.allSatisfy {
      ["iouThreshold", "confidenceThreshold"].contains($0.key) && $0.value.type == .double
    }
    guard images.count == 1, extraInputsAllowed, let input = images.first,
          let constraint = input.imageConstraint,
          constraint.pixelsWide == size, constraint.pixelsHigh == size else { throw failure("MODEL_INPUT_UNSUPPORTED") }
    // A Core ML NMS pipeline is required. Raw YOLO tensors/masks are never interpreted as boxes.
    let outputs = model.modelDescription.outputDescriptionsByName
    guard outputs["confidence"]?.type == .multiArray,
          outputs["coordinates"]?.type == .multiArray else { throw failure("MODEL_OUTPUT_UNSUPPORTED") }
    let confidence = (manifest["confidenceThreshold"] as? NSNumber)?.floatValue ?? 0.25
    let iou = (manifest["iouThreshold"] as? NSNumber)?.doubleValue ?? 0.5
    let agnosticIou = (manifest["agnosticNmsIouThreshold"] as? NSNumber)?.doubleValue ?? iou
    guard confidence > 0, confidence <= 1, iou > 0, iou <= 1, agnosticIou > 0, agnosticIou <= 1 else { throw failure("MODEL_THRESHOLDS_INVALID") }
    let vision = try VNCoreMLModel(for: model)
    // The exporter describes these threshold inputs as optional, but marks them required in protobuf.
    // Supply both explicitly so Vision can satisfy the exact exported pipeline contract.
    var extraFeatures: [String: Any] = [:]
    if inputs["iouThreshold"] != nil { extraFeatures["iouThreshold"] = iou }
    if inputs["confidenceThreshold"] != nil { extraFeatures["confidenceThreshold"] = Double(confidence) }
    if !extraFeatures.isEmpty { vision.featureProvider = try MLDictionaryFeatureProvider(dictionary: extraFeatures) }
    return ShelfModel(vision: vision, name: resource, fingerprint: fingerprint, exportFingerprint: exportFingerprint,
      modelId: modelId, preprocessing: preprocessing, licenseStatus: licenseStatus,
      trueClassCount: trueClassCount, scoreColumnCount: scoreColumnCount,
      inputSize: size, prompts: prompts, confidence: confidence, agnosticNmsIou: agnosticIou)
  }
}

struct ShelfBox {
  let rect: CGRect // Vision coordinates: normalized, lower-left origin.
  let confidence: Float

  static func suppressDuplicates(_ candidates: [ShelfBox], threshold: Double) -> [ShelfBox] {
    var selected: [ShelfBox] = []
    for candidate in candidates.sorted(by: { $0.confidence > $1.confidence }) {
      let overlaps = selected.contains { existing in
        let intersection = candidate.rect.intersection(existing.rect)
        if intersection.isNull || intersection.isEmpty { return false }
        let overlap = intersection.width * intersection.height
        let union = candidate.rect.width * candidate.rect.height + existing.rect.width * existing.rect.height - overlap
        return union > 0 && Double(overlap / union) > threshold
      }
      if !overlaps { selected.append(candidate) }
    }
    return selected
  }
}
