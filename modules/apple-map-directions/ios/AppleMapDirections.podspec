Pod::Spec.new do |s|
  s.name           = 'AppleMapDirections'
  s.version        = '1.0.0'
  s.summary        = 'MapKit driving directions polyline for MileMate'
  s.description    = 'Fetches automobile route geometry via MKDirections on iOS.'
  s.license        = 'MIT'
  s.author         = 'MileMate'
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
