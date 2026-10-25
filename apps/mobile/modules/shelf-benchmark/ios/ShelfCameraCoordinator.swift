import AVFoundation
import Foundation

// AVFoundation camera ownership is process-wide. A new view must finish stopping the old
// session before starting its own; delayed stops from an old run cannot stop the new owner.
final class ShelfCameraCoordinator {
  static let shared = ShelfCameraCoordinator()
  private let queue = DispatchQueue(label: "shelf.camera.ownership", qos: .userInitiated)
  private var owner: String?
  private var currentSession: AVCaptureSession?
  private var currentPreview: AVCaptureVideoPreviewLayer?

  func start(owner newOwner: String, session: AVCaptureSession, preview: AVCaptureVideoPreviewLayer,
    isCurrent: @escaping () -> Bool, configure: @escaping () throws -> Void,
    willStart: @escaping () -> Void, onError: @escaping () -> Void) {
    queue.async {
      guard isCurrent() else { return }
      if self.owner != newOwner { self.stopCurrent() }
      guard isCurrent() else { return }
      do {
        try configure()
        guard isCurrent() else { return }
        self.owner = newOwner
        self.currentSession = session
        self.currentPreview = preview
        if let connection = preview.connection, connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
        willStart()
        // Recheck immediately before the blocking call; an inactive run must not start capture.
        guard isCurrent() else { self.stopIfOwned(by: newOwner); return }
        if !session.isRunning { session.startRunning() }
        // Stop/unmount can arrive while startRunning blocks. Handle it before another owner.
        guard isCurrent() else { self.stopIfOwned(by: newOwner); return }
        if !session.isRunning {
          self.stopIfOwned(by: newOwner)
          onError()
        }
      } catch {
        self.stopIfOwned(by: newOwner)
        if isCurrent() { onError() }
      }
    }
  }
  func stop(owner oldOwner: String) {
    queue.async { self.stopIfOwned(by: oldOwner) }
  }
  private func stopIfOwned(by candidate: String) {
    guard owner == candidate else { return }
    stopCurrent()
  }
  private func stopCurrent() {
    if let session = currentSession, session.isRunning { session.stopRunning() }
    // Release the preview only after the blocking stop has completed.
    currentPreview = nil
    currentSession = nil
    owner = nil
  }
}
