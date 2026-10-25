import AppKit
import Vision
import ImageIO
import UniformTypeIdentifiers

// Fictional, in-memory fixtures. Compiled with the production MemoryPhotoReader.
func fixture(_ text:String,width:Int=1200,height:Int=800,upsideDown:Bool=false)->Data {
 let context=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 context.setFillColor(NSColor.white.cgColor);context.fill(CGRect(x:0,y:0,width:width,height:height))
 if upsideDown {context.translateBy(x:CGFloat(width),y:CGFloat(height));context.rotate(by:.pi)}
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:context,flipped:false)
 (text as NSString).draw(in:CGRect(x:50,y:150,width:width-100,height:height-200),withAttributes:[.font:NSFont.boldSystemFont(ofSize:CGFloat(width)/18),.foregroundColor:NSColor.black])
 NSGraphicsContext.restoreGraphicsState()
 let data=NSMutableData();let dest=CGImageDestinationCreateWithData(data,UTType.png.identifier as CFString,1,nil)!
 CGImageDestinationAddImage(dest,context.makeImage()!,[kCGImagePropertyOrientation:upsideDown ? 3:1] as CFDictionary)
 precondition(CGImageDestinationFinalize(dest));return data as Data
}
func read(_ data:Data)->[String:Any]? {
 let request=VNRecognizeTextRequest();request.recognitionLevel = .accurate;request.recognitionLanguages=["en-US"];request.usesLanguageCorrection=false
 return MemoryPhotoReader.read(data,request:request)
}
@main struct PhotoReaderCheck {
 static func main() throws {
  var evidence:[[String:Any]]=[]
  for (name,data,expected) in [
   ("front",fixture("TESTBRAND SUNRISE\nORIGINAL CEREAL"),"TESTBRAND"),
   ("variant",fixture("TESTBRAND SUNRISE\nHONEY CEREAL"),"HONEY"),
   ("orientation",fixture("TESTBRAND SUNRISE\nORIGINAL CEREAL",upsideDown:true),"TESTBRAND"),
   ("downsample",fixture("TESTBRAND SUNRISE\nORIGINAL CEREAL",width:4096,height:3000),"TESTBRAND"),
   ("nutrition",fixture("Nutrition Facts\nSodium 140mg\nTotal Sugars 4g"),"Sodium")
  ] {
   guard let page=read(data),let lines=page["lines"] as? [[String:Any]] else {fatalError("Unreadable fixture: \(name)")}
   let text=lines.compactMap{$0["text"] as? String}.joined(separator:" ")
   precondition(text.localizedCaseInsensitiveContains(expected),"Expected text missing: \(name)")
   precondition((page["width"] as! Int)<=2048 && (page["height"] as! Int)<=2048)
   evidence.append(["fixture":name,"page":page,"passed":true])
  }
  precondition((read(fixture(""))?["lines"] as? [[String:Any]])?.isEmpty == true)
  precondition(read(Data()) == nil);precondition(read(Data("not an image".utf8)) == nil)
  precondition(read(Data(count:25*1024*1024)) == nil)
  for _ in 0..<10 {precondition(read(fixture("TESTBRAND SUNRISE")) != nil)}
  let result:[String:Any]=["passed":true,"checks":19,"scope":"production Apple Vision reader; synthetic in-memory images only, not physical camera accuracy","fixtures":evidence]
  print(String(data:try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys,.prettyPrinted]),encoding:.utf8)!)
 }
}
