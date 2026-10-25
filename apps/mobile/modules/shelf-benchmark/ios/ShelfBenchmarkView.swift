import ExpoModulesCore
import AVFoundation
import UIKit

final class ShelfBenchmarkView: ExpoView {
  let onStatus = EventDispatcher()
  let onMetrics = EventDispatcher()
  let onComplete = EventDispatcher()
  let onError = EventDispatcher()
  let onObservations = EventDispatcher()
  let onScanState = EventDispatcher()
  let onGrid = EventDispatcher()
  let onGridStatus = EventDispatcher()
  var gridCapacity = 16
  var finishRequested = false
  var acknowledgedBatchId = ""
  private var lastAcknowledgedBatchId = ""
  var mode = "benchmark"
  var modelId = "shelfset"
  var active = false
  var durationSeconds = 30
  var runId = ""
  private var startedRunID = ""
  private let engine = ShelfBenchmarkEngine()
  private var preview: AVCaptureVideoPreviewLayer { engine.preview }
  private let boxesLayer = CAShapeLayer()
  private var lastBoxes: [ShelfBox] = []
  private var sourceSize = CGSize(width: 1080, height: 1920)

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    clipsToBounds = true
    preview.videoGravity = .resizeAspectFill
    layer.addSublayer(preview)
    boxesLayer.fillColor = UIColor.clear.cgColor
    boxesLayer.strokeColor = UIColor.systemGreen.cgColor
    boxesLayer.lineWidth = 2
    layer.addSublayer(boxesLayer)
    engine.event = { [weak self] name, body in
      guard let self = self else { return }
      let current = body["runId"] as? String == self.startedRunID
      if name == "onComplete" {
        // Preserve a stopped run's summary even if the user already started another run.
        if current {
          self.lastBoxes = []; self.boxesLayer.path = nil
        }
        self.onComplete(body)
        return
      }
      if name == "onScanState" {
        if current && body["state"] as? String != "running" {
          self.lastBoxes = []; self.boxesLayer.path = nil
        }
        self.onScanState(body)
        return
      }
      guard current else { return }
      switch name {
      case "onGrid": self.onGrid(body)
      case "onGridStatus": self.onGridStatus(body)
      case "onStatus": self.onStatus(body)
      case "onMetrics": if self.active { self.onMetrics(body) }
      case "onError": self.onError(body)
      case "onObservations": if self.active && self.window != nil { self.onObservations(body) }
      default: break
      }
    }
    engine.render = { [weak self] id, boxes, sourceSize in
      guard let self = self, self.active, self.window != nil, self.startedRunID == id else { return }
      self.lastBoxes = boxes
      self.sourceSize = sourceSize
      self.drawBoxes()
    }
  }
  deinit { engine.stop(reason: "unmounted") }
  override func layoutSubviews() {
    super.layoutSubviews()
    preview.frame = bounds
    boxesLayer.frame = bounds
    drawBoxes()
  }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      engine.stop(reason: "unmounted")
      lastBoxes = []; boxesLayer.path = nil
    } else { applyConfiguration() }
  }
  func applyConfiguration() {
    if acknowledgedBatchId != lastAcknowledgedBatchId {
      lastAcknowledgedBatchId = acknowledgedBatchId
      engine.acknowledgeGrid(acknowledgedBatchId)
    }
    if finishRequested && mode == "grid" { engine.finishGrid(); return }
    guard active else {
      engine.stop(reason: "stopped")
      lastBoxes = []; boxesLayer.path = nil
      return
    }
    guard window != nil, !runId.isEmpty, runId != startedRunID else { return }
    startedRunID = runId
    lastBoxes = []; boxesLayer.path = nil
    engine.start(runId: runId, seconds: durationSeconds, modelId: modelId, mode: mode, gridCapacity: gridCapacity)
  }
  private func drawBoxes() {
    let path = UIBezierPath()
    guard sourceSize.width > 0, sourceSize.height > 0 else { return }
    // Buffers and preview are both portrait. Map Vision's source-image coordinates using the
    // same aspect-fill transform; metadataOutputRect uses sensor coordinates and would rotate twice.
    let scale = max(bounds.width / sourceSize.width, bounds.height / sourceSize.height)
    let width = sourceSize.width * scale
    let height = sourceSize.height * scale
    let offsetX = (bounds.width - width) / 2
    let offsetY = (bounds.height - height) / 2
    for box in lastBoxes {
      let rect = CGRect(x: offsetX + box.rect.minX * width, y: offsetY + (1 - box.rect.maxY) * height,
        width: box.rect.width * width, height: box.rect.height * height)
      path.append(UIBezierPath(rect: rect))
    }
    boxesLayer.path = path.cgPath
  }
}
