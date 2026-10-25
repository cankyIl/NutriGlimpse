import AVFoundation
import CoreML
import Foundation
import QuartzCore
import UIKit
import Vision
import Darwin

final class ShelfBenchmarkEngine: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  let session = AVCaptureSession()
  // Stable binding prevents main-thread teardown from reconfiguring a live session.
  let preview = AVCaptureVideoPreviewLayer()
  var event: ((String, [String: Any]) -> Void)?
  var render: ((String, [ShelfBox], CGSize) -> Void)?
  private let stateQueue = DispatchQueue(label: "shelf.benchmark.frames", qos: .userInitiated)
  private static let sharedInferenceQueue = DispatchQueue(label: "shelf.benchmark.inference", qos: .userInitiated)
  private let inferenceQueue = ShelfBenchmarkEngine.sharedInferenceQueue
  private let readQueue = DispatchQueue(label: "shelf.scan.package-reader", qos: .utility)
  private let packageReader = ShelfPackageReader()
  private let readPlanner = ShelfScanReadPlanner()
  private var readInFlight = false // Persists across cancellation until Vision actually returns.
  private var readJobID: String?
  private var readDeadline: DispatchWorkItem?
  private var lastReadAdmission = -Double.infinity
  private var lastEvidenceAt = -Double.infinity
  private var observationSequence = 0
  private var mode = "benchmark"
  private let gridCollector = ShelfGridCollector()
  private var gridFinishing = false
  private var gridCapacity = 16
  private var configured = false // ShelfCameraCoordinator queue only
  private var model: ShelfModel? // inferenceQueue only
  private var loadedModelId = ""
  private let letterbox = ShelfLetterbox()
  private var generation = 0 // stateQueue owns all run state below.
  private var active = false
  private var appIsActive = UIApplication.shared.applicationState == .active
  private var pendingCameraEpoch: Int?
  private var cameraOwner: String? // Unique per run, not per reusable view.
  private var inFlight = false // Persists across cancellation until the actual inference returns.
  private var runID = ""
  private var duration = 30.0
  private var started = 0.0
  private var waitingSince = 0.0
  private var nextDue = 0.0
  private var timer: DispatchSourceTimer?
  private var accepted = 0
  private var completed = 0
  private var busyDrops = 0
  private var missedSlots = 0
  private var cameraDrops = 0
  private var skipped = 0
  private var failed = 0
  private var totalBoxes = 0
  private var latestBoxes = 0
  private var latencies: [Double] = []
  private var observedThermal: Set<String> = []
  private var modelMetadata: [String: Any] = [:]
  private var observers: [NSObjectProtocol] = []
  private let osVersion = UIDevice.current.systemVersion

  override init() {
    super.init()
    preview.session = session
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification,
      object: nil, queue: .main) { [weak self] _ in
      guard let self = self else { return }
      self.stateQueue.async {
        self.appIsActive = false
        // The first permission dialog occurs before camera startup; do not cancel it.
        if self.active && (self.started > 0 || self.waitingSince > 0) { self.finish(reason: "background") }
      }
    })
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification,
      object: nil, queue: .main) { [weak self] _ in
      guard let self = self else { return }
      self.stateQueue.async {
        self.appIsActive = true
        if let epoch = self.pendingCameraEpoch, self.active, self.generation == epoch {
          self.pendingCameraEpoch = nil
          self.beginCamera(epoch: epoch)
        }
      }
    })
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification,
      object: nil, queue: .main) { [weak self] _ in self?.stop(reason: "background") })
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil, queue: .main) { [weak self] _ in self?.stop(reason: "memory_pressure") })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionWasInterrupted,
      object: session, queue: nil) { [weak self] _ in self?.stop(reason: "camera_interrupted") })
    observers.append(NotificationCenter.default.addObserver(forName: .AVCaptureSessionRuntimeError,
      object: session, queue: nil) { [weak self] _ in self?.fail(code: "CAMERA_RUNTIME_ERROR", message: "The camera stopped unexpectedly. Start again when ready.") })
  }
  deinit {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    timer?.cancel()
    if let owner = cameraOwner { ShelfCameraCoordinator.shared.stop(owner: owner) }
  }
  func start(runId: String, seconds: Int, modelId: String, mode: String = "benchmark", gridCapacity: Int = 16) {
    stateQueue.async {
      if self.active { self.finish(reason: "stopped") }
      self.generation += 1
      let epoch = self.generation
      self.runID = runId
      self.cameraOwner = UUID().uuidString
      self.mode = ["scan", "grid"].contains(mode) ? mode : "benchmark"
      self.gridCapacity = max(1, min(16, gridCapacity)); self.gridFinishing = false
      self.duration = self.mode != "benchmark" ? 0 : Double(seconds == 300 ? 300 : 30)
      self.readPlanner.reset()
      self.observationSequence = 0
      self.active = true
      self.started = 0
      self.waitingSince = 0
      self.nextDue = 0
      self.pendingCameraEpoch = nil
      self.accepted = 0; self.completed = 0; self.busyDrops = 0; self.missedSlots = 0
      self.cameraDrops = 0; self.skipped = 0; self.failed = 0; self.totalBoxes = 0; self.latestBoxes = 0
      self.latencies = []; self.observedThermal = []
      self.modelMetadata = ["modelId": modelId, "modelName": ShelfModel.resourceName(for: modelId) ?? "Unknown detector",
        "modelFingerprint": "unavailable", "modelExportFingerprint": "unavailable", "prompts": [String](),
        "inputSize": 640, "predictionMode": "single-full-frame", "confidenceThreshold": 0.25, "iouThreshold": 0.5,
        "preprocessing": "gray114-bilinear-letterbox-v1", "trueClassCount": 1, "scoreColumnCount": 80,
        "diagnosticOnly": true, "licenseStatus": "Research diagnostic; model manifest not loaded", "computeUnits": "all", "modelLoadMilliseconds": 0]
      self.emit("onStatus", ["state": "loading", "message": "Loading the on-device detector."])
      self.inferenceQueue.async {
        guard self.stateQueue.sync(execute: { self.active && self.generation == epoch }) else { return }
        do {
          var modelLoadMs = 0.0
          if self.model == nil || self.loadedModelId != modelId {
            let before = CACurrentMediaTime()
            // Never retain the previous selection as an implicit fallback if the next load fails.
            self.model = nil; self.loadedModelId = ""
            self.model = try ShelfModel.load(modelId: modelId)
            self.loadedModelId = modelId
            modelLoadMs = (CACurrentMediaTime() - before) * 1000
          }
          guard let model = self.model else { throw ShelfModel.failure("MODEL_MISSING") }
          let metadata: [String: Any] = ["modelName": model.name, "modelId": model.modelId,
            "modelFingerprint": model.fingerprint, "modelExportFingerprint": model.exportFingerprint,
            "preprocessing": model.preprocessing, "trueClassCount": model.trueClassCount, "scoreColumnCount": model.scoreColumnCount,
            "diagnosticOnly": true, "licenseStatus": model.licenseStatus,
            "prompts": model.prompts, "inputSize": model.inputSize, "predictionMode": "single-full-frame",
            "confidenceThreshold": model.confidence, "iouThreshold": model.agnosticNmsIou, "computeUnits": "all (Core ML chooses CPU/GPU/Neural Engine)",
            "modelLoadMilliseconds": modelLoadMs]
          self.gridCollector.reset(runId: runId, capacity: self.gridCapacity)
          self.gridCollector.emit = { [weak self] body in
            DispatchQueue.main.async { self?.event?("onGrid", body) }
          }
          self.stateQueue.async {
            guard self.active, self.generation == epoch else { return }
            self.modelMetadata = metadata
            self.requestCamera(epoch: epoch)
          }
        } catch {
          self.stateQueue.async {
            guard self.active, self.generation == epoch else { return }
            self.failOnQueue(code: "MODEL_LOAD_FAILED", message: "The bundled detector could not be loaded: \(error.localizedDescription)")
          }
        }
      }
    }
  }
  private func requestCamera(epoch: Int) {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .authorized { beginCamera(epoch: epoch); return }
    if status == .notDetermined {
      emit("onStatus", ["state": "permission_required", "message": "Allow camera access to scan food packages."])
      AVCaptureDevice.requestAccess(for: .video) { granted in
        self.stateQueue.async {
          guard self.active, self.generation == epoch else { return }
          if granted { self.beginCamera(epoch: epoch) }
          else { self.failOnQueue(code: "CAMERA_PERMISSION_DENIED", message: "Camera access is disabled. Enable it in iPhone Settings to scan.") }
        }
      }
    } else { failOnQueue(code: "CAMERA_PERMISSION_DENIED", message: "Camera access is disabled. Enable it in iPhone Settings to scan.") }
  }
  private func beginCamera(epoch: Int) {
    guard active, generation == epoch, let owner = cameraOwner else { return }
    guard appIsActive else { pendingCameraEpoch = epoch; return }
    waitingSince = CACurrentMediaTime()
    startTimer()
    ShelfCameraCoordinator.shared.start(owner: owner, session: session, preview: preview,
      isCurrent: { self.stateQueue.sync { self.active && self.generation == epoch && self.appIsActive } },
      configure: { if !self.configured { try self.configureCamera() } },
      willStart: {
        self.stateQueue.async {
          guard self.active, self.generation == epoch else { return }
          self.emit("onStatus", ["state": "ready", "message": self.mode == "scan"
            ? "Point at food packages. Detection samples twice per second; package reading is slower."
            : "Point at a shelf. Measuring two detection frames per second."])
        }
      }, onError: {
        self.stateQueue.async {
          guard self.active, self.generation == epoch else { return }
          self.failOnQueue(code: "CAMERA_UNAVAILABLE", message: "The rear camera is unavailable. Close other camera screens and try again.")
        }
      })
  }
  private func configureCamera() throws {
    session.beginConfiguration()
    defer { session.commitConfiguration() }
    if session.canSetSessionPreset(.hd1920x1080) { session.sessionPreset = .hd1920x1080 }
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else { throw ShelfModel.failure("NO_REAR_CAMERA") }
    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw ShelfModel.failure("CAMERA_INPUT_UNAVAILABLE") }
    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.setSampleBufferDelegate(self, queue: stateQueue)
    guard session.canAddOutput(output) else { throw ShelfModel.failure("CAMERA_OUTPUT_UNAVAILABLE") }
    session.addInput(input); session.addOutput(output)
    if let connection = output.connection(with: .video), connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
    configured = true
  }
  func acknowledgeGrid(_ batchId: String) {
    inferenceQueue.async { self.gridCollector.acknowledge(batchId) }
  }
  func finishGrid() {
    stateQueue.async {
      guard self.active, self.mode == "grid", !self.gridFinishing else { return }
      self.gridFinishing = true
      let epoch = self.generation
      self.inferenceQueue.async {
        guard self.stateQueue.sync(execute: { self.active && self.generation == epoch }) else { return }
        self.gridCollector.flush()
        self.stateQueue.async { if self.active && self.generation == epoch { self.finish(reason: "stopped") } }
      }
    }
  }
  func stop(reason: String = "stopped") {
    stateQueue.async { if self.active { self.finish(reason: reason) } }
  }
  private func fail(code: String, message: String) {
    stateQueue.async { if self.active { self.failOnQueue(code: code, message: message) } }
  }
  private func failOnQueue(code: String, message: String) {
    emit("onError", ["code": code, "message": message, "canAskAgain": AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined])
    emit("onStatus", ["state": "error", "message": message])
    finish(reason: "error")
  }
  private func startTimer() {
    timer?.cancel()
    let source = DispatchSource.makeTimerSource(queue: stateQueue)
    source.schedule(deadline: .now(), repeating: .milliseconds(100))
    source.setEventHandler { [weak self] in
      guard let self = self, self.active else { return }
      let now = CACurrentMediaTime()
      self.observedThermal.insert(self.thermal())
      if self.mode == "benchmark" && self.started > 0 && now - self.started >= self.duration { self.finish(reason: "completed") }
      else if self.started == 0 && now - self.waitingSince > 10 { self.failOnQueue(code: "NO_CAMERA_FRAMES", message: "No camera frames arrived. Start again when ready.") }
    }
    timer = source
    source.resume()
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard active, appIsActive, waitingSince > 0, !gridFinishing else { return }
    let now = CACurrentMediaTime()
    if started == 0 {
      started = now; nextDue = now
      emit("onStatus", ["state": "running", "message": mode == "scan"
        ? "Scanning packages on this phone. Pause to review product matches."
        : "Measuring live shelf detection. No images are saved or uploaded."])
      if mode == "scan" { emitScanState(state: "running", reason: "started") }
    }
    if mode == "benchmark" && now - started >= duration { finish(reason: "completed"); return }
    guard now >= nextDue else { skipped += 1; return }
    // Fixed monotonic cadence. Advance missed slots; never queue frames or catch up in bursts.
    let elapsedSlots = Int(floor((now - nextDue) / 0.5)) + 1
    missedSlots += max(0, elapsedSlots - 1)
    nextDue += Double(elapsedSlots) * 0.5
    if inFlight { busyDrops += 1; return }
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { failed += 1; return }
    guard let detectorLease = ShelfWorkGates.detector.acquire(now: now) else { busyDrops += 1; return }
    inFlight = true
    accepted += 1
    let epoch = generation
    let id = runID
    let scanFrame = mode == "scan"
    let gridFrame = mode == "grid"
    let frameSize = CGSize(width: CVPixelBufferGetWidth(pixels), height: CVPixelBufferGetHeight(pixels))
    // Retain only this one CVPixelBuffer for the duration of inference. No frame file or JS image.
    inferenceQueue.async {
      autoreleasepool {
        defer {
          self.letterbox.erase()
          ShelfWorkGates.detector.release(token: detectorLease, completedAt: CACurrentMediaTime())
        }
        guard self.stateQueue.sync(execute: { self.active && self.generation == epoch }) else {
          self.stateQueue.async { self.inFlight = false }
          return
        }
        do {
          guard let model = self.model else { throw ShelfModel.failure("MODEL_MISSING") }
          let prepared = try self.letterbox.prepare(pixels, side: model.inputSize)
          let request = VNCoreMLRequest(model: model.vision)
          request.imageCropAndScaleOption = .scaleFill
          let handler = VNImageRequestHandler(cvPixelBuffer: prepared.pixels, orientation: .up, options: [:])
          try handler.perform([request])
          guard let observations = request.results as? [VNRecognizedObjectObservation] else { throw ShelfModel.failure("VISION_OUTPUT_UNSUPPORTED") }
          let candidates = observations.compactMap { item -> ShelfBox? in
            // Only real model classes can become boxes. The 79 zero-score padding columns
            // work around an upstream Core ML NMS defect and are never product classes.
            guard let label = item.labels.first, model.prompts.contains(label.identifier) else { return nil }
            let confidence = label.confidence * item.confidence
            guard confidence >= model.confidence,
                  item.boundingBox.width > 0, item.boundingBox.height > 0 else { return nil }
            guard let rect = prepared.geometry.sourceRect(fromVision: item.boundingBox) else { return nil }
            return ShelfBox(rect: rect, confidence: confidence)
          }
          let boxes = ShelfBox.suppressDuplicates(candidates, threshold: model.agnosticNmsIou)
          let readCandidates = (scanFrame || gridFrame) ? ShelfScanFingerprint.candidates(pixels: pixels, boxes: boxes) : []
          if gridFrame && self.stateQueue.sync(execute: { self.active && self.generation == epoch }) {
            self.gridCollector.ingest(pixels: pixels, candidates: readCandidates, now: now)
            let info: [String: Any] = ["runId": id, "pending": self.gridCollector.pendingCount, "total": self.gridCollector.total, "skipped": self.gridCollector.skipped, "blocked": self.gridCollector.blocked]
            DispatchQueue.main.async { self.event?("onGridStatus", info) }
          }
          let elapsed = (CACurrentMediaTime() - now) * 1000
          self.stateQueue.async {
            self.inFlight = false
            guard self.active, self.generation == epoch else { return }
            let done = CACurrentMediaTime()
            if self.mode == "benchmark" && done - self.started >= self.duration { self.finish(reason: "completed"); return }
            self.completed += 1
            self.latencies.append(elapsed)
            // Continuous scans keep only the latest five minutes of detector latency samples.
            if self.latencies.count > 600 { self.latencies.removeFirst(self.latencies.count - 600) }
            if scanFrame { self.admitPackageRead(pixels: pixels, candidates: readCandidates, epoch: epoch, now: done) }
            self.totalBoxes += boxes.count; self.latestBoxes = boxes.count
            self.observedThermal.insert(self.thermal())
            let metrics = self.metrics(now: done)
            self.emit("onMetrics", metrics)
            DispatchQueue.main.async { [weak self] in self?.render?(id, boxes, frameSize) }
          }
        } catch {
          self.stateQueue.async {
            self.inFlight = false
            guard self.active, self.generation == epoch else { return }
            self.failed += 1
            self.failOnQueue(code: "INFERENCE_FAILED", message: "The detector output could not be processed: \(error.localizedDescription)")
          }
        }
      }
    }
  }
  func captureOutput(_ output: AVCaptureOutput, didDrop sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    if active { cameraDrops += 1 }
  }
  private func metrics(now: Double) -> [String: Any] {
    let measured = started > 0 ? max(0, now - started) : 0
    let elapsed = mode != "benchmark" ? measured : min(duration, measured)
    let sorted = latencies.sorted()
    func percentile(_ p: Double) -> Double {
      guard !sorted.isEmpty else { return 0 }
      return sorted[min(sorted.count - 1, max(0, Int(ceil(Double(sorted.count) * p)) - 1))]
    }
    return ["runId": runID, "elapsedSeconds": elapsed, "requestedDurationSeconds": duration,
      "completedFrames": completed, "acceptedFrames": accepted,
      "scheduledSlots": accepted + busyDrops + missedSlots,
      "busyDroppedSlots": busyDrops, "missedCaptureSlots": missedSlots,
      "cameraDroppedFrames": cameraDrops, "skippedCameraFrames": skipped, "failedFrames": failed,
      "detectedBoxes": totalBoxes, "latestBoxes": latestBoxes,
      "completedFramesPerSecond": elapsed > 0 ? Double(completed) / elapsed : 0,
      "latencyP50Ms": percentile(0.5), "latencyP95Ms": percentile(0.95), "latencyMaxMs": sorted.last ?? 0,
      "thermalState": thermal()]
  }
  private func finish(reason: String) {
    guard active else { return }
    if mode != "benchmark" {
      invalidateRun()
      let state = reason == "error" ? "error" : ["stopped", "unmounted"].contains(reason) ? "stopped" : "interrupted"
      emit("onStatus", ["state": state, "message": reason == "stopped" ? "Scan paused. Your collected products remain available." : "Scan stopped. Resume when ready."])
      emitScanState(state: state, reason: reason)
      return // Continuous scans never emit a diagnostic benchmark summary.
    }
    let now = CACurrentMediaTime()
    var summary = metrics(now: now)
    let fullyTimed = reason == "completed" && started > 0 && now - started >= duration
    let fps = summary["completedFramesPerSecond"] as? Double ?? 0
    let p95 = summary["latencyP95Ms"] as? Double ?? 0
    let thermalOk = !observedThermal.contains("serious") && !observedThermal.contains("critical")
    summary.merge(modelMetadata) { _, new in new }
    #if DEBUG
    let buildConfiguration = "debug"
    #else
    let buildConfiguration = "release"
    #endif
    summary.merge([
      "appVersion": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
      "appBuildNumber": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown",
      "buildConfiguration": buildConfiguration,
      "schemaVersion": 1, "completedAt": ISO8601DateFormatter().string(from: Date()),
      "termination": reason, "durationComplete": fullyTimed, "targetFramesPerSecond": 2,
      "timingGatePassed": buildConfiguration == "release" && fullyTimed && fps >= 1.9 && p95 < 500 && failed == 0 && thermalOk,
      "accuracyValidated": false, "deviceModel": deviceIdentifier(), "operatingSystemVersion": osVersion,
      "thermalStatesObserved": observedThermal.sorted(), "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
      "latencyScope": "Camera delegate admission through explicit gray114 bilinear letterbox, Core ML inference, inverse box mapping and filtering; excludes model load, camera exposure/startup, buffer erasure and preview/UI rendering.",
      "retainedImages": 0, "networkRequests": 0
    ]) { _, new in new }
    invalidateRun()
    let state = reason == "completed" ? "completed" : reason == "error" ? "error" : reason == "stopped" ? "stopped" : "interrupted"
    emit("onStatus", ["state": state, "message": fullyTimed ? "Test finished. Timing results do not establish detection accuracy." : "Test stopped before the full measurement completed."])
    emit("onComplete", summary)
    // Independent of the view's weak event closure: navigation must not lose this run's facts.
    let completedSummary = summary
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: ShelfBenchmarkModule.completionNotification, object: nil, userInfo: completedSummary)
    }
  }
  private func admitPackageRead(pixels: CVPixelBuffer, candidates: [ShelfReadCandidate], epoch: Int, now: Double) {
    let ready = !readInFlight && now - lastReadAdmission >= 1 && now - lastEvidenceAt >= 1
    let lease = ready ? ShelfWorkGates.reader.acquire(now: now) : nil
    guard let plan = readPlanner.next(candidates: candidates, now: now, canRead: lease != nil), let jobID = lease else {
      if let lease = lease { ShelfWorkGates.reader.abandon(token: lease) }
      return
    }
    readInFlight = true
    lastReadAdmission = now
    readJobID = jobID
    packageReader.prepare(jobID: jobID)
    let deadline = DispatchWorkItem { [weak self] in
      guard let self = self, self.readJobID == jobID else { return }
      self.packageReader.cancel(jobID: jobID)
    }
    readDeadline = deadline
    stateQueue.asyncAfter(deadline: .now() + 2, execute: deadline)
    // At most one original camera buffer is retained for reading alongside one detector frame.
    // There is no ROI/image backlog, and no pixels are encoded, bridged to JS, saved, or uploaded.
    readQueue.async {
      let observation: [String: Any]? = autoreleasepool {
        do { return try self.packageReader.read(pixels: pixels, plan: plan, jobID: jobID) }
        catch { return nil } // Empty/cancelled reads are retried under the same bounded admission policy.
      }
      // Cancellation never releases the shared slot early. Only the completed worker does.
      ShelfWorkGates.reader.release(token: jobID, completedAt: CACurrentMediaTime(), cooldown: observation == nil ? 0 : 1)
      self.stateQueue.async {
        self.readInFlight = false
        if self.readJobID == jobID {
          self.readDeadline?.cancel(); self.readDeadline = nil; self.readJobID = nil
        }
        guard self.active, self.generation == epoch, self.mode == "scan", let observation = observation else { return }
        self.lastEvidenceAt = CACurrentMediaTime()
        self.observationSequence += 1
        let body: [String: Any] = ["runId": self.runID, "sequence": self.observationSequence, "observations": [observation]]
        DispatchQueue.main.async { [weak self] in
          guard let self = self, self.stateQueue.sync(execute: { self.active && self.generation == epoch }) else { return }
          self.event?("onObservations", body)
        }
      }
    }
  }
  private func invalidateRun() {
    active = false
    pendingCameraEpoch = nil
    generation += 1
    timer?.cancel(); timer = nil
    readDeadline?.cancel(); readDeadline = nil
    if let jobID = readJobID { packageReader.cancel(jobID: jobID) }
    readPlanner.reset()
    inferenceQueue.async { self.gridCollector.cancel() }
    if let owner = cameraOwner { ShelfCameraCoordinator.shared.stop(owner: owner) }
    cameraOwner = nil
  }
  private func emitScanState(state: String, reason: String) {
    let body: [String: Any] = ["runId": runID, "state": state, "reason": reason]
    emit("onScanState", body)
    // The module event survives navigation/unmount; it contains state only, never observations.
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: ShelfBenchmarkModule.scanStateNotification, object: nil, userInfo: body)
    }
  }
  private func emit(_ name: String, _ payload: [String: Any]) {
    var body = payload
    body["runId"] = runID
    DispatchQueue.main.async { [weak self] in self?.event?(name, body) }
  }
  private func thermal() -> String {
    switch ProcessInfo.processInfo.thermalState {
    case .nominal: return "nominal"
    case .fair: return "fair"
    case .serious: return "serious"
    case .critical: return "critical"
    @unknown default: return "unknown"
    }
  }
  private func deviceIdentifier() -> String {
    var size = 0
    sysctlbyname("hw.machine", nil, &size, nil, 0)
    var machine = [CChar](repeating: 0, count: size)
    guard sysctlbyname("hw.machine", &machine, &size, nil, 0) == 0 else { return "unknown" }
    return String(cString: machine)
  }
}
