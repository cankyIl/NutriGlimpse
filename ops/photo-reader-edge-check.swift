import AppKit
import Vision
import ImageIO
import UniformTypeIdentifiers
@main struct Edges {
 static func main() throws {
 var bad=0,total=0,pages:[[String:Any]]=[]
 for angle in [-25.0,-10.0,0.0,10.0,25.0] { for offset in [-80.0,10.0,650.0] {
 let c=CGContext(data:nil,width:1200,height:800,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 c.setFillColor(NSColor.white.cgColor);c.fill(CGRect(x:0,y:0,width:1200,height:800));c.translateBy(x:600,y:400);c.rotate(by:angle * .pi/180);c.translateBy(x:-600,y:-400)
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:c,flipped:false)
 for (i,t) in ["TESTBRAND SUNRISE", "ORIGINAL CEREAL", "WHOLE GRAINS"].enumerated(){(t as NSString).draw(at:CGPoint(x:offset,y:Double(i*180)),withAttributes:[.font:NSFont.boldSystemFont(ofSize:95),.foregroundColor:NSColor.black])}
 NSGraphicsContext.restoreGraphicsState();let data=NSMutableData();let dest=CGImageDestinationCreateWithData(data,UTType.png.identifier as CFString,1,nil)!;CGImageDestinationAddImage(dest,c.makeImage()!,nil);CGImageDestinationFinalize(dest)
 let request=VNRecognizeTextRequest();request.recognitionLevel = .accurate;request.recognitionLanguages=["en-US"];request.usesLanguageCorrection=false
 guard let p=MemoryPhotoReader.read(data as Data,request:request) else{fatalError("reader failed")};pages.append(p)
 for l in p["lines"] as! [[String:Any]] {
 total+=1;let x=(l["x"] as! NSNumber).doubleValue,y=(l["y"] as! NSNumber).doubleValue,w=(l["width"] as! NSNumber).doubleValue,h=(l["height"] as! NSNumber).doubleValue
 if x<0||y<0||x+w>Double(p["width"] as! Int)+1||y+h>Double(p["height"] as! Int)+1 {bad+=1}
 }
 }}
 precondition(bad == 0,"Out-of-bounds native OCR")
 print(String(data:try JSONSerialization.data(withJSONObject:["fixtures":15,"lines":total,"invalidGeometry":bad,"pages":pages],options:[.sortedKeys]),encoding:.utf8)!)
 }
}
