import Foundation
import CoreGraphics

struct ShelfReadCandidate {
  let rect: CGRect // Vision/source coordinates, bottom-left origin.
  let confidence: Float
  let visualHash: UInt64
  let meanColor: [Int]
}
struct ShelfReadPlan {
  let trackIdHint: String
  let candidate: ShelfReadCandidate
}

// Spatial/visual hints choose useful work only. They never establish a product's identity.
final class ShelfScanReadPlanner {
  private struct Entry {
    let id: Int
    var candidate: ShelfReadCandidate
    var seenAt: Double
    var readAt: Double
    var attempts: Int
  }
  private var entries: [Entry] = []
  private var serial = 0
  private var lastAdmission = -Double.infinity
  var retainedCandidateCount: Int { entries.count }
  func reset() { entries = []; serial = 0; lastAdmission = -Double.infinity }

  func next(candidates: [ShelfReadCandidate], now: Double, canRead: Bool) -> ShelfReadPlan? {
    entries.removeAll { now - $0.seenAt > 6 }
    var used = Set<Int>()
    for candidate in candidates.prefix(96) {
      let match = entries.indices.filter { !used.contains(entries[$0].id) && similar(entries[$0].candidate, candidate) }
        .max { overlap(entries[$0].candidate.rect, candidate.rect) < overlap(entries[$1].candidate.rect, candidate.rect) }
      if let index = match {
        entries[index].candidate = candidate; entries[index].seenAt = now
        used.insert(entries[index].id)
      } else {
        serial += 1
        entries.append(Entry(id: serial, candidate: candidate, seenAt: now, readAt: -Double.infinity, attempts: 0))
        used.insert(serial)
      }
    }
    entries.sort { $0.seenAt == $1.seenAt ? $0.candidate.rect.width * $0.candidate.rect.height > $1.candidate.rect.width * $1.candidate.rect.height : $0.seenAt > $1.seenAt }
    if entries.count > 96 { entries.removeLast(entries.count - 96) }
    guard canRead, now - lastAdmission >= 1 else { return nil }
    let eligible = entries.indices.filter {
      used.contains(entries[$0].id) && now - entries[$0].readAt >= (entries[$0].attempts < 3 ? 2 : 10)
    }
    guard let index = eligible.min(by: {
      let a = entries[$0], b = entries[$1]
      if a.attempts == 0 && b.attempts != 0 { return true }
      if b.attempts == 0 && a.attempts != 0 { return false }
      if a.readAt != b.readAt { return a.readAt < b.readAt }
      return a.candidate.rect.width * a.candidate.rect.height > b.candidate.rect.width * b.candidate.rect.height
    }) else { return nil }
    entries[index].readAt = now; entries[index].attempts += 1; lastAdmission = now
    return ShelfReadPlan(trackIdHint: "region-\(entries[index].id)", candidate: entries[index].candidate)
  }
  private func similar(_ a: ShelfReadCandidate, _ b: ShelfReadCandidate) -> Bool {
    guard overlap(a.rect, b.rect) >= 0.35, (a.visualHash ^ b.visualHash).nonzeroBitCount <= 10,
      a.meanColor.count == 3, b.meanColor.count == 3 else { return false }
    return zip(a.meanColor, b.meanColor).map { abs($0.0 - $0.1) }.reduce(0, +) <= 60
  }
  private func overlap(_ a: CGRect, _ b: CGRect) -> CGFloat {
    let intersection = a.intersection(b)
    guard !intersection.isNull, !intersection.isEmpty else { return 0 }
    let area = intersection.width * intersection.height
    let union = a.width * a.height + b.width * b.height - area
    return union > 0 ? area / union : 0
  }
}

struct ShelfTextLimits {
  static func compact(_ value: String, remaining: Int) -> String {
    guard remaining > 0 else { return "" }
    let boundedBytes = String(decoding: value.utf8.prefix(960), as: UTF8.self)
    let clean = boundedBytes.components(separatedBy: .controlCharacters).joined(separator: " ")
      .split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    return String(clean.prefix(min(remaining, 240)))
  }
  static func asciiDigits(_ value: String) -> Bool {
    !value.isEmpty && value.utf8.allSatisfy { $0 >= 48 && $0 <= 57 }
  }
}
