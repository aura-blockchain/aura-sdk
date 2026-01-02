#
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html.
# Run `pod lib lint aura_verifier.podspec` to validate before publishing.
#
Pod::Spec.new do |s|
  s.name             = 'aura_verifier'
  s.version          = '1.0.0'
  s.summary          = 'Flutter SDK for verifying Aura blockchain credentials'
  s.description      = <<-DESC
Flutter SDK for verifying Aura blockchain credentials. Verify age, identity, and other credentials with a simple API.
                       DESC
  s.homepage         = 'https://github.com/aura-blockchain/aura-verifier-sdk'
  s.license          = { :file => '../LICENSE' }
  s.author           = { 'Aura Network' => 'info@aurablockchain.org' }
  s.source           = { :path => '.' }
  s.source_files = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform = :ios, '12.0'

  # Flutter.framework does not contain a i386 slice.
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386' }
  s.swift_version = '5.0'
end
