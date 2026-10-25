import ExpoModulesCore
import AVFoundation
import UIKit
import Vision
import ImageIO

// Dedicated still-photo path: image data and OCR exist only in memory. There is
// no file/picker, Photos-library, URLSession or logging operation in this view.
final class MemoryPhotoView: ExpoView {
  let onStatus = EventDispatcher()
  let onPhoto = EventDispatcher()
  var active = false
  var captureId = 0
  var imageForAI = false
  var timingEnabled = false // TEMPORARY Beta 0 instrumentation
  private var lastCapture = 0
  private var wanted = false
  private var asking = false
  private var preview: AVCaptureVideoPreviewLayer { engine.preview }
  private let engine = MemoryPhotoEngine()
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black; clipsToBounds = true
    preview.videoGravity = .resizeAspect; layer.addSublayer(preview)
    engine.event = { [weak self] name, body in
      guard let self, self.active, self.window != nil, UIApplication.shared.applicationState == .active else { return }
      if name == "photo" { self.onPhoto(body) } else { self.onStatus(body) }
    }
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.stop() })
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.applyConfiguration() })
    observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: .main) { [weak self] _ in
      self?.stop(); self?.onStatus(["state":"error", "message":"Camera paused. Please retry."])
    })
  }
  deinit { observers.forEach(NotificationCenter.default.removeObserver); engine.stop() }
  override func layoutSubviews() {
    super.layoutSubviews(); preview.frame = bounds
  }
  override func didMoveToWindow() {
    super.didMoveToWindow(); if window == nil { stop() } else { applyConfiguration() }
  }
  private func stop() { wanted = false; engine.stop() }
  func applyConfiguration() {
    guard active, window != nil, UIApplication.shared.applicationState == .active else { stop(); return }
    let authorization = AVCaptureDevice.authorizationStatus(for: .video)
    if authorization == .notDetermined {
      guard !asking else { return }; asking = true
      onStatus(["state":"permission", "message":"Allow camera access to photograph your product."])
      AVCaptureDevice.requestAccess(for: .video) { [weak self] _ in
        DispatchQueue.main.async { self?.asking = false; self?.applyConfiguration() }
      }; return
    }
    guard authorization == .authorized else { onStatus(["state":"denied", "message":"Allow camera access in Settings, or search by name."]); return }
    if !wanted { wanted = true; engine.start() }
    if captureId > lastCapture { lastCapture = captureId; engine.capture(captureId, imageForAI: imageForAI, timingEnabled: timingEnabled) }
  }
}

private final class MemoryPhotoEngine: NSObject, AVCapturePhotoCaptureDelegate {
  let session = AVCaptureSession()
  // Keep the preview alive through queued stop. Bind once before any session work;
  // setSession also configures AVFoundation and must never race stopRunning.
  let preview = AVCaptureVideoPreviewLayer()
  var event: ((String, [String: Any]) -> Void)?
  private let queue = DispatchQueue(label: "grocery.photo.session")
  private let reading = DispatchQueue(label: "grocery.photo.read", qos: .userInitiated)
  private let output = AVCapturePhotoOutput()
  private var configured = false
  private var generation = 0
  private let deliveryLock = NSLock()
  private var deliveryGeneration = 0
  private var desired = false
  private var shot: (Int64, Int, Int, Bool, TimeInterval?)?
  private var request: VNRecognizeTextRequest?
  private var timeout: DispatchWorkItem?
  private var interruptions: [NSObjectProtocol] = []

  override init() {
    super.init()
    preview.session = session
    for name in [AVCaptureSession.wasInterruptedNotification, AVCaptureSession.runtimeErrorNotification] {
      interruptions.append(NotificationCenter.default.addObserver(forName:name, object:session, queue:nil) { [weak self] _ in
        self?.queue.async { [weak self] in guard let self else { return }; self.invalidate(); self.emit("status", ["state":"error", "message":"Camera interrupted. Please retry."]) }
      })
    }
  }
  deinit { interruptions.forEach(NotificationCenter.default.removeObserver) }
  // Called only on the session queue. The main-thread delivery rechecks the generation.
  private func emit(_ name: String, _ body: [String:Any]) {
    let token = generation
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.deliveryLock.lock()
      let current = self.deliveryGeneration == token
      self.deliveryLock.unlock()
      if current { self.event?(name, body) }
    }
  }

  private func invalidate() {
    generation += 1; deliveryLock.lock(); deliveryGeneration = generation; deliveryLock.unlock(); desired = false; timeout?.cancel(); timeout = nil
    request?.cancel(); request = nil; shot = nil
    if session.isRunning { session.stopRunning() }
  }
  func stop() { queue.async { self.invalidate() } }
  func start() {
    queue.async { [weak self] in
      guard let self else { return }
      self.desired = true
      do {
        if !self.configured {
          self.session.beginConfiguration(); defer { self.session.commitConfiguration() }
          self.session.sessionPreset = .photo
          guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for:.video, position:.back) else { throw NSError(domain:"Photo",code:1) }
          let input = try AVCaptureDeviceInput(device:camera)
          guard self.session.canAddInput(input), self.session.canAddOutput(self.output) else { throw NSError(domain:"Photo",code:2) }
          self.session.addInput(input); self.session.addOutput(self.output)
          self.output.maxPhotoQualityPrioritization = .balanced
          self.configured = true
        }
        if let connection = self.preview.connection, connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
        if !self.session.isRunning { self.session.startRunning() }
        self.emit("status", ["state":"ready", "message":"Fill the frame with one package."])
      } catch { self.emit("status", ["state":"error", "message":"Camera could not start. Please retry."]) }
    }
  }
  func capture(_ id:Int, imageForAI:Bool, timingEnabled:Bool) {
    queue.async { [weak self] in
      guard let self, self.desired, self.session.isRunning, self.shot == nil else { return }
      let settings = AVCapturePhotoSettings(format:[AVVideoCodecKey:AVVideoCodecType.jpeg])
      settings.photoQualityPrioritization = .balanced
      // Silence capture only where iOS supports it; unsupported settings throw.
      if #available(iOS 18.0, *), self.output.isShutterSoundSuppressionSupported {
        settings.isShutterSoundSuppressionEnabled = true
      }
      if let connection = self.output.connection(with:.video), connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
      self.shot = (settings.uniqueID,id,self.generation,imageForAI,timingEnabled ? ProcessInfo.processInfo.systemUptime : nil)
      self.emit("status", ["state":"reading", "captureId":id, "message":"Reading your photo on this phone…"])
      let token = self.generation
      let timer = DispatchWorkItem { [weak self] in
        guard let self, self.generation == token, self.shot != nil else { return }
        self.invalidate(); self.emit("status", ["state":"error", "message":"Reading took too long. Try a closer, well-lit photo."])
      }
      self.timeout = timer; self.queue.asyncAfter(deadline:.now()+20,execute:timer)
      self.output.capturePhoto(with:settings,delegate:self)
    }
  }
  func photoOutput(_ output:AVCapturePhotoOutput,didFinishProcessingPhoto photo:AVCapturePhoto,error:Error?) {
    // The encoded data is an in-memory buffer, never a filesystem representation.
    let data = error == nil ? photo.fileDataRepresentation() : nil
    let capturedAt = ProcessInfo.processInfo.systemUptime
    let uniqueID = photo.resolvedSettings.uniqueID
    queue.async { [weak self] in
      guard let self, let shot = self.shot, shot.0 == uniqueID, shot.2 == self.generation else { return }
      guard let data, data.count <= 24*1024*1024 else { self.finishError(); return }
      let request = VNRecognizeTextRequest(); request.recognitionLevel = .accurate
      request.recognitionLanguages = ["en-US"]; request.usesLanguageCorrection = false
      self.request = request
      self.reading.async { [weak self] in
        let prepared = MemoryPhotoReader.prepare(data, request:request, imageForAI:shot.3, timingEnabled:shot.4 != nil)
        let result = prepared.page, barcodes = prepared.barcodes, encoded = prepared.jpeg
        self?.queue.async { [weak self] in
          guard let self, self.generation == shot.2, self.shot?.0 == uniqueID else { return }
          self.timeout?.cancel(); self.timeout = nil; self.request = nil; self.shot = nil
          if let encoded {
            var payload:[String:Any] = ["captureId":shot.1,"imageBase64":encoded,"barcodes":barcodes]
            if let start = shot.4, var timings = prepared.timings {
              timings["captureMs"] = max(0,Int((capturedAt-start)*1000))
              payload["timings"] = timings
            }
            if let result { payload["page"] = result }
            self.emit("photo",payload)
          }
          else if let result { self.emit("photo",["captureId":shot.1,"page":result]) }
          else { self.emit("status",["state":"error","message":"Could not read that photo. Try more light and hold still."]) }
        }
      }
    }
  }
  private func finishError() {
    timeout?.cancel();timeout=nil;shot=nil;request=nil
    emit("status",["state":"error","message":"Could not capture that photo. Please retry."])
  }
}
