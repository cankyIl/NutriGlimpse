import Foundation
import CoreGraphics

@main
struct ScanPlannerCheck {
  static var checks = 0
  static func expect(_ value: @autoclosure () -> Bool, _ label: String) {
    checks += 1
    if !value() { fatalError("FAILED: " + label) }
  }
  static func candidate(_ x: Double = 0.1, width: Double = 0.2, hash: UInt64 = 0,
    color: [Int] = [100, 100, 100]) -> ShelfReadCandidate {
    ShelfReadCandidate(rect: CGRect(x: x, y: 0.1, width: width, height: 0.3),
      confidence: 0.8, visualHash: hash, meanColor: color)
  }
  static func main() {
    let gate = ShelfWorkAdmission(minimumInterval: 1)
    let oldLease = gate.acquire(now: 0)!
    expect(gate.acquire(now: 10) == nil, "cancelled owner remains exclusive until worker releases")
    gate.release(token: "not-the-owner", completedAt: 10)
    expect(gate.acquire(now: 10) == nil, "wrong owner cannot release live work")
    gate.release(token: oldLease, completedAt: 10, cooldown: 1)
    expect(gate.acquire(now: 10.999) == nil, "completed evidence enforces shared cooldown")
    let newLease = gate.acquire(now: 11)!
    gate.release(token: oldLease, completedAt: 12)
    expect(gate.acquire(now: 12) == nil, "late old completion cannot clear a new owner")
    gate.release(token: newLease, completedAt: 12)
    let unusedLease = gate.acquire(now: 12)!
    gate.abandon(token: unusedLease)
    expect(gate.acquire(now: 12) != nil, "unused reservation does not consume rate allowance")

    let a = candidate()
    let b = candidate(0.6, width: 0.1)
    let planner = ShelfScanReadPlanner()
    let first = planner.next(candidates: [a, b], now: 0, canRead: true)
    expect(first != nil, "first visible package is admitted")
    expect(first?.candidate.rect == a.rect, "larger unread region is first")
    expect(planner.next(candidates: [a, b], now: 0.999, canRead: true) == nil, "no burst within one second")
    let second = planner.next(candidates: [a, b], now: 1, canRead: true)
    expect(second?.candidate.rect == b.rect, "unread region precedes retry")
    expect(second?.trackIdHint != first?.trackIdHint, "distinct region scheduling hints")
    expect(planner.next(candidates: [a, b], now: 1.5, canRead: false) == nil, "busy reader never queues")
    expect(planner.next(candidates: [a], now: 2, canRead: true)?.trackIdHint == first?.trackIdHint, "same appearance gets bounded retry")

    planner.reset()
    let original = planner.next(candidates: [a], now: 0, canRead: true)
    expect(planner.next(candidates: [candidate(0.11)], now: 1, canRead: true) == nil, "small motion alone does not bypass cooldown")
    let replacement = planner.next(candidates: [candidate(hash: UInt64.max)], now: 1, canRead: true)
    expect(replacement != nil && replacement?.trackIdHint != original?.trackIdHint, "different appearance in same location is new work")

    planner.reset()
    _ = planner.next(candidates: [a], now: 0, canRead: true)
    _ = planner.next(candidates: [a], now: 2, canRead: true)
    _ = planner.next(candidates: [a], now: 4, canRead: true)
    expect(planner.next(candidates: [a], now: 6, canRead: true) == nil, "third attempt enters long cooldown")
    expect(planner.next(candidates: [a], now: 10, canRead: true) == nil, "continuously visible region stays cooled down")
    expect(planner.next(candidates: [a], now: 13.999, canRead: true) == nil, "retry deadline does not round early")
    expect(planner.next(candidates: [a], now: 14, canRead: true) != nil, "long retry deadline allows read")

    planner.reset()
    expect(planner.next(candidates: [a], now: 0, canRead: false) == nil, "busy initial update retains hints only")
    expect(planner.next(candidates: [], now: 0.05, canRead: true) == nil, "old ROI cannot be read on a frame without that detection")
    expect(planner.next(candidates: [a], now: 0.1, canRead: true) != nil, "skipped admission did not consume rate allowance")
    _ = planner.next(candidates: [], now: 7, canRead: false)
    expect(planner.retainedCandidateCount == 0, "invisible hints expire")

    let many = (0..<120).map { i in
      ShelfReadCandidate(rect: CGRect(x: Double(i % 12) / 12, y: Double(i / 12) / 12, width: 0.05, height: 0.05),
        confidence: 0.8, visualHash: UInt64(i), meanColor: [0, 0, 0])
    }
    _ = planner.next(candidates: many, now: 20, canRead: false)
    expect(planner.retainedCandidateCount == 96, "candidate memory remains capped")
    planner.reset()
    expect(planner.retainedCandidateCount == 0, "new scan clears native scheduling memory")

    expect(ShelfTextLimits.compact("  cereal\n\tbox  ", remaining: 240) == "cereal box", "control and repeated whitespace sanitized")
    expect(ShelfTextLimits.compact(String(repeating: "x", count: 10000), remaining: 240).count == 240, "large OCR payload capped")
    expect(ShelfTextLimits.compact("abcdef", remaining: 3) == "abc", "total text budget applied")
    expect(ShelfTextLimits.compact("abc", remaining: 0).isEmpty, "no text after budget exhausted")
    expect(ShelfTextLimits.compact(String(repeating: "🥣", count: 10000), remaining: 240).utf8.count <= 960, "multibyte OCR bounded")
    expect(ShelfTextLimits.asciiDigits("0012345678905"), "leading-zero barcode preserved")
    expect(!ShelfTextLimits.asciiDigits("１２３４５６７８"), "unicode digits cannot become a GTIN")
    expect(!ShelfTextLimits.asciiDigits("1234 5678"), "barcode characters are never guessed away")
    expect(!ShelfTextLimits.asciiDigits(""), "empty barcode rejected")
    print("Passed \(checks) bounded scan planner/text checks")
  }
}
