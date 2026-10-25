Pod::Spec.new do |s|
  s.name = 'ShelfBenchmark'
  s.version = '1.0.0'
  s.summary = 'On-device shelf detector benchmark without image retention'
  s.description = s.summary
  s.author = 'Grocery App'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'Vision', 'CoreML', 'UIKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_VERSION' => '5.0' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
  s.resource_bundles = { 'ShelfBenchmarkModels' => ['Resources/*.json', 'Resources/*.txt', 'Resources/*.mlpackage', 'Resources/*.mlmodelc'] }
end
