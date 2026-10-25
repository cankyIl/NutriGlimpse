#!/usr/bin/env python3
"""Run on macOS: execute production photo-view lifecycle and shelf coordinator with deterministic AVFoundation doubles."""
from pathlib import Path
import argparse,subprocess,json,tempfile
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path.cwd());parser.add_argument('--before',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
root=args.root.resolve();args.output.mkdir(parents=True,exist_ok=True)
photo=(root/'apps/mobile/modules/private-input/ios/MemoryPhotoView.swift').read_text().split('private final class MemoryPhotoEngine')[0]
coordinator=(root/'apps/mobile/modules/shelf-benchmark/ios/ShelfCameraCoordinator.swift').read_text()
def without_imports(text):return '\n'.join(line for line in text.splitlines() if not line.startswith('import '))
stubs=r"""
import Foundation
import CoreGraphics
var overlapViolations = 0
class AppContext {}
struct TestColor { static let black = TestColor() }
class TestLayer { func addSublayer(_ layer: AVCaptureVideoPreviewLayer) {} }
class ExpoView {
 var backgroundColor = TestColor.black, clipsToBounds = false
 var layer = TestLayer(), bounds = CGRect(x:0,y:0,width:390,height:360)
 var window: Int? = nil
 required init(appContext: AppContext? = nil) {}
 func layoutSubviews() {}; func didMoveToWindow() {}
}
struct EventDispatcher { func callAsFunction(_ body:[String:Any]) {} }
class UIApplication {
 enum State { case active, background }
 static let shared = UIApplication(); var applicationState = State.active
 static let willResignActiveNotification = Notification.Name("fixture.background")
 static let didBecomeActiveNotification = Notification.Name("fixture.foreground")
 static let didReceiveMemoryWarningNotification = Notification.Name("fixture.memory")
}
enum TestMedia { case video }; enum TestAuthorization { case authorized, notDetermined, denied }
class AVCaptureDevice {
 static func authorizationStatus(for media:TestMedia)->TestAuthorization { .authorized }
 static func requestAccess(for media:TestMedia,completionHandler:@escaping(Bool)->Void) { completionHandler(true) }
}
class AVCaptureSession {
 var isRunning=false, stopping=false
 func startRunning() { isRunning=true;stopping=false }
 func stopRunning() { stopping=true;Thread.sleep(forTimeInterval:0.001);isRunning=false;stopping=false }
}
class TestConnection { enum Orientation {case portrait}; var isVideoOrientationSupported=true, videoOrientation=Orientation.portrait }
class AVCaptureVideoPreviewLayer {
 enum Gravity {case resizeAspect};var videoGravity=Gravity.resizeAspect,frame=CGRect.zero
 var connection:TestConnection?=TestConnection()
 var session:AVCaptureSession? { willSet { if session?.stopping == true { overlapViolations += 1 } } }
}
class MemoryPhotoEngine {
 let session=AVCaptureSession(),preview=AVCaptureVideoPreviewLayer()
 var event:((String,[String:Any])->Void)?
 init(){ preview.session=session }
 func start(){ session.startRunning() }
 // Deterministically hold the stop in-flight while UIKit unmount proceeds.
 func stop(){ session.stopping=true }
 func capture(_ id:Int,imageForAI:Bool,timingEnabled:Bool){}
}
"""
photo_test=r"""
@main struct Check {
 static func main() {
  for n in 1...200 {
   var view:MemoryPhotoView?=MemoryPhotoView()
   view!.active=true;view!.window=1;view!.didMoveToWindow();view!.layoutSubviews()
   view!.captureId=n;view!.applyConfiguration()
   if n%2 == 0 { NotificationCenter.default.post(name:UIApplication.willResignActiveNotification,object:nil) }
   view!.window=nil;view!.didMoveToWindow();view=nil
  }
  print("{\"cycles\":200,\"overlappingPreviewMutations\":\(overlapViolations)}")
 }
}
"""
def run(name,source):
 swift=args.output/(name+'.swift');exe=args.output/name;swift.write_text(source)
 subprocess.run(['xcrun','swiftc','-parse-as-library','-swift-version','5',str(swift),'-o',str(exe)],check=True)
 return json.loads(subprocess.check_output([str(exe)],text=True))
fixed=run('photo-view-fixed',stubs+without_imports(photo)+photo_test)
assert fixed['overlappingPreviewMutations']==0,fixed
report={'scope':'Production photo view callbacks; AVFoundation and UIKit are deterministic test doubles, not physical camera acceptance','fixed':fixed}
if args.before:
 old=args.before.read_text().split('private final class MemoryPhotoEngine')[0]
 before=run('photo-view-before',stubs+without_imports(old)+photo_test)
 assert before['overlappingPreviewMutations']>0,before
 report['before']=before
shelf_test=r"""
@main struct Check {
 static func wait(_ condition:()->Bool){for _ in 0..<2000 {if condition(){return};Thread.sleep(forTimeInterval:0.001)};fatalError("lifecycle timeout")}
 static func main(){
  let coordinator=ShelfCameraCoordinator(), first=AVCaptureSession(),second=AVCaptureSession()
  var preview:AVCaptureVideoPreviewLayer?=AVCaptureVideoPreviewLayer();preview!.session=first
  weak var held=preview
  coordinator.start(owner:"first",session:first,preview:preview!,isCurrent:{true},configure:{},willStart:{},onError:{fatalError("start failed")})
  wait{first.isRunning};preview=nil;Thread.sleep(forTimeInterval:0.01)
  precondition(held != nil,"Preview must outlive the view while its session is running")
  let next=AVCaptureVideoPreviewLayer();next.session=second
  coordinator.start(owner:"second",session:second,preview:next,isCurrent:{true},configure:{},willStart:{},onError:{fatalError("second start failed")})
  wait{second.isRunning};precondition(!first.isRunning);wait{held == nil}
  coordinator.stop(owner:"first");Thread.sleep(forTimeInterval:0.02);precondition(second.isRunning,"stale stop stopped new session")
  coordinator.stop(owner:"second");wait{!second.isRunning}
  print("{\"previewRetainedUntilStop\":true,\"oldSessionStoppedBeforeNewStart\":true,\"staleStopIgnored\":true}")
 }
}
"""
report['shelfCoordinator']=run('shelf-coordinator',stubs+without_imports(coordinator)+shelf_test)
(args.output/'result.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
