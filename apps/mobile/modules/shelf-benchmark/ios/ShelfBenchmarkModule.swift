import ExpoModulesCore
import AVFoundation
import CoreML
import Foundation

public final class ShelfBenchmarkModule: Module {
  static let completionNotification = Notification.Name("GroceryShelfBenchmarkCompleted")
  static let scanStateNotification = Notification.Name("GroceryShelfScanState")
  private var completionObserver: NSObjectProtocol?
  private var scanStateObserver: NSObjectProtocol?
  public func definition() -> ModuleDefinition {
    Name("ShelfBenchmark")
    Events("onBenchmarkComplete", "onShelfScanState")
    OnCreate {
      self.scanStateObserver = NotificationCenter.default.addObserver(forName: Self.scanStateNotification,
        object: nil, queue: .main) { [weak self] notification in
        if let state = notification.userInfo as? [String: Any] { self?.sendEvent("onShelfScanState", state) }
      }
      self.completionObserver = NotificationCenter.default.addObserver(forName: Self.completionNotification,
        object: nil, queue: .main) { [weak self] notification in
        if let summary = notification.userInfo as? [String: Any] {
          self?.sendEvent("onBenchmarkComplete", summary)
        }
      }
    }
    OnDestroy {
      if let observer = self.scanStateObserver { NotificationCenter.default.removeObserver(observer) }
      self.scanStateObserver = nil
      if let observer = self.completionObserver { NotificationCenter.default.removeObserver(observer) }
      self.completionObserver = nil
    }
    AsyncFunction("getAvailabilityAsync") { (modelId: String) -> [String: Any] in
      guard let resource = ShelfModel.resourceName(for: modelId) else {
        return ["available": false, "reason": "invalid_model", "modelId": modelId, "modelName": "Unknown detector", "modelBundled": false]
      }
      #if targetEnvironment(simulator)
      return ["available": false, "reason": "simulator_unsupported", "modelId": modelId, "modelName": resource, "modelBundled": ShelfModel.modelURL(for: modelId) != nil]
      #else
      let exists = ShelfModel.modelURL(for: modelId) != nil
      return ["available": exists, "reason": exists ? "ready" : "model_missing", "modelId": modelId, "modelName": resource, "modelBundled": exists]
      #endif
    }
    View(ShelfBenchmarkView.self) {
      Events("onStatus", "onMetrics", "onComplete", "onError", "onObservations", "onScanState", "onGrid", "onGridStatus")
      Prop("gridCapacity") { (view: ShelfBenchmarkView, value: Int) in view.gridCapacity = value }
      Prop("finishRequested") { (view: ShelfBenchmarkView, value: Bool) in view.finishRequested = value }
      Prop("acknowledgedBatchId") { (view: ShelfBenchmarkView, value: String) in view.acknowledgedBatchId = value }
      Prop("mode") { (view: ShelfBenchmarkView, value: String) in view.mode = value }
      Prop("modelId") { (view: ShelfBenchmarkView, value: String) in view.modelId = value }
      Prop("active") { (view: ShelfBenchmarkView, value: Bool) in view.active = value }
      Prop("durationSeconds") { (view: ShelfBenchmarkView, value: Int) in view.durationSeconds = value }
      Prop("runId") { (view: ShelfBenchmarkView, value: String) in view.runId = value }
      OnViewDidUpdateProps { (view: ShelfBenchmarkView) in view.applyConfiguration() }
    }
  }
}
