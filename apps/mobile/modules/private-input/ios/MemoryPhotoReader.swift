import Foundation
import Vision
import ImageIO
import CoreGraphics

enum MemoryPhotoReader {
  // Keep the same OCR quality, full-resolution barcode input and JPEG settings.
  // Independent barcode/JPEG work overlaps accurate OCR; at most two workers per shot.
  private final class Supplement: @unchecked Sendable {
    private let lock = NSLock()
    private var value: ([[String:String]], String?, Int?) = ([], nil, nil)
    func set(_ barcodes:[[String:String]], _ jpeg:String?, _ elapsed:Int?) { lock.lock(); value = (barcodes,jpeg,elapsed); lock.unlock() }
    func get() -> ([[String:String]], String?, Int?) { lock.lock(); defer { lock.unlock() }; return value }
  }
  static func prepare(_ data:Data, request:VNRecognizeTextRequest, imageForAI:Bool, timingEnabled:Bool = false) -> (page:[String:Any]?, barcodes:[[String:String]], jpeg:String?, timings:[String:Int]?) {
    if !imageForAI { return (read(data,request:request),[],nil,nil) }
    let started = timingEnabled ? ProcessInfo.processInfo.systemUptime : 0
    let group = DispatchGroup(), supplement = Supplement()
    group.enter()
    DispatchQueue.global(qos:.userInitiated).async {
      let extraStart = timingEnabled ? ProcessInfo.processInfo.systemUptime : 0
      autoreleasepool {
        let codes = barcodes(data), jpeg = productJPEG(data)?.base64EncodedString()
        supplement.set(codes,jpeg,timingEnabled ? Int((ProcessInfo.processInfo.systemUptime-extraStart)*1000) : nil)
      }
      group.leave()
    }
    let ocrStart = timingEnabled ? ProcessInfo.processInfo.systemUptime : 0
    let page = read(data,request:request)
    let ocrMs = timingEnabled ? Int((ProcessInfo.processInfo.systemUptime-ocrStart)*1000) : 0
    group.wait()
    let extra = supplement.get()
    let timings:[String:Int]? = timingEnabled ? ["preparationMs":Int((ProcessInfo.processInfo.systemUptime-started)*1000),"ocrMs":ocrMs,"barcodeJpegMs":extra.2 ?? 0] : nil
    return (page,extra.0,extra.1,timings)
  }
  // Decode orientation, reduce pixels, then encode a fresh JPEG without source properties.
  // EXIF, GPS, camera IDs and thumbnails are not copied into the new image.
  static func productJPEG(_ data:Data) -> Data? {
    guard data.count > 0, data.count <= 24*1024*1024 else { return nil }
    return autoreleasepool {
      guard let source = CGImageSourceCreateWithData(data as CFData,nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source,0,nil) as? [CFString:Any],
        let width = properties[kCGImagePropertyPixelWidth] as? Int,
        let height = properties[kCGImagePropertyPixelHeight] as? Int,
        width >= 16, height >= 16, Double(width)*Double(height) <= 50000000 else { return nil }
      for edge in [1600,1200,960] {
        guard let image = CGImageSourceCreateThumbnailAtIndex(source,0,[
          kCGImageSourceCreateThumbnailFromImageAlways:true,
          kCGImageSourceCreateThumbnailWithTransform:true,
          kCGImageSourceThumbnailMaxPixelSize:edge] as CFDictionary) else { return nil }
        let result = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(result,"public.jpeg" as CFString,1,nil) else { return nil }
        CGImageDestinationAddImage(destination,image,[kCGImageDestinationLossyCompressionQuality:0.8] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { return nil }
        if result.length <= 1024*1024 { return result as Data }
      }
      return nil
    }
  }

  // Vision may report edge text with a box fractionally beyond the image.
  // Clip geometry before crossing the bridge; never pass NaN/negative sizes.
  static func textFrame(_ box:CGRect, width:Int, height:Int) -> [String:Double]? {
    guard width > 0, height > 0, box.origin.x.isFinite, box.origin.y.isFinite,
      box.size.width.isFinite, box.size.height.isFinite, box.width > 0, box.height > 0 else { return nil }
    let clipped = box.intersection(CGRect(x:0,y:0,width:1,height:1))
    guard !clipped.isNull, !clipped.isEmpty else { return nil }
    return ["x":max(0,Double(clipped.minX)*Double(width)),
      "y":max(0,(1-Double(clipped.maxY))*Double(height)),
      "width":Double(clipped.width)*Double(width),"height":Double(clipped.height)*Double(height)]
  }
  static func barcodes(_ data:Data) -> [[String:String]] {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.ean8, .ean13, .upce, .itf14]
    do { try VNImageRequestHandler(data:data,options:[:]).perform([request]) }
    catch { return [] }
    return (request.results ?? []).prefix(8).compactMap { item in
      guard let value = item.payloadStringValue else { return nil }
      return ["value":value,"format":item.symbology == .upce ? "upc_e" : "gtin"]
    }
  }
  static func read(_ data:Data, request:VNRecognizeTextRequest) -> [String:Any]? {
    guard data.count <= 24*1024*1024 else { return nil }
    return autoreleasepool {
          guard let source = CGImageSourceCreateWithData(data as CFData,nil),
            let image = CGImageSourceCreateThumbnailAtIndex(source,0,[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceCreateThumbnailWithTransform:true,kCGImageSourceThumbnailMaxPixelSize:2048] as CFDictionary) else { return nil }
          do { try VNImageRequestHandler(cgImage:image,options:[:]).perform([request]) } catch { return nil }
          var chars = 0
          let lines:[[String:Any]] = (request.results ?? []).prefix(300).enumerated().compactMap { index, observation in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            let text = String(candidate.string.prefix(300)); chars += text.count
            guard chars <= 16000 else { return nil }
            guard candidate.confidence.isFinite, candidate.confidence >= 0, candidate.confidence <= 1,
              let frame = textFrame(observation.boundingBox,width:image.width,height:image.height) else { return nil }
            return ["id":"photo-\(index)","text":text,"confidence":Double(candidate.confidence),
              "x":frame["x"]!,"y":frame["y"]!,"width":frame["width"]!,"height":frame["height"]!]
          }
          return ["page":1,"width":image.width,"height":image.height,"lines":lines]
        }
  }
}
