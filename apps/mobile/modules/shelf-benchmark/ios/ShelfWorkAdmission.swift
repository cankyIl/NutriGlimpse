import Foundation

// Process-wide admission contains only timing and an opaque lease token, never images or OCR.
// A cancelled request keeps its lease until the worker actually returns.
final class ShelfWorkAdmission {
  private let lock = NSLock()
  private let minimumInterval: Double
  private var owner: String?
  private var nextAllowedAt = -Double.infinity
  private var previousAllowedAt = -Double.infinity

  init(minimumInterval: Double) { self.minimumInterval = minimumInterval }
  func acquire(now: Double) -> String? {
    lock.lock(); defer { lock.unlock() }
    guard owner == nil, now >= nextAllowedAt else { return nil }
    let token = UUID().uuidString
    owner = token
    previousAllowedAt = nextAllowedAt
    nextAllowedAt = now + minimumInterval
    return token
  }
  func abandon(token: String) {
    lock.lock(); defer { lock.unlock() }
    guard owner == token else { return }
    owner = nil
    nextAllowedAt = previousAllowedAt
  }
  func release(token: String, completedAt: Double, cooldown: Double = 0) {
    lock.lock(); defer { lock.unlock() }
    guard owner == token else { return }
    owner = nil
    nextAllowedAt = max(nextAllowedAt, completedAt + cooldown)
  }
}

enum ShelfWorkGates {
  static let detector = ShelfWorkAdmission(minimumInterval: 0) // Each run already has fixed 500 ms slots.
  static let reader = ShelfWorkAdmission(minimumInterval: 1)
}
