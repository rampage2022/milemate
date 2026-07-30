import ExpoModulesCore
import MapKit

internal struct MapCoordinate: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
}

private func coordinates(from polyline: MKPolyline) -> [MapCoordinate] {
  var coords = [CLLocationCoordinate2D](
    repeating: kCLLocationCoordinate2DInvalid,
    count: polyline.pointCount,
  )
  polyline.getCoordinates(&coords, range: NSRange(location: 0, length: polyline.pointCount))

  return coords.map { coordinate in
    var point = MapCoordinate()
    point.latitude = coordinate.latitude
    point.longitude = coordinate.longitude
    return point
  }
}

private func fetchRoute(
  from source: CLLocationCoordinate2D,
  to destination: CLLocationCoordinate2D,
) async throws -> MKRoute {
  let request = MKDirections.Request()
  request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
  request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
  request.transportType = .automobile

  let directions = MKDirections(request: request)

  return try await withCheckedThrowingContinuation { continuation in
    directions.calculate { response, error in
      if let error {
        continuation.resume(throwing: error)
        return
      }

      guard let route = response?.routes.first else {
        continuation.resume(
          throwing: NSError(
            domain: "AppleMapDirections",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "No driving route returned."],
          ),
        )
        return
      }

      continuation.resume(returning: route)
    }
  }
}

public class AppleMapDirectionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleMapDirections")

    AsyncFunction("fetchDrivingPolyline") { (rawPoints: [MapCoordinate]) async throws -> [MapCoordinate] in
      guard rawPoints.count >= 2 else {
        return rawPoints
      }

      var merged: [MapCoordinate] = []

      for index in 0..<(rawPoints.count - 1) {
        let left = rawPoints[index]
        let right = rawPoints[index + 1]

        let source = CLLocationCoordinate2D(latitude: left.latitude, longitude: left.longitude)
        let destination = CLLocationCoordinate2D(latitude: right.latitude, longitude: right.longitude)

        do {
          let route = try await fetchRoute(from: source, to: destination)
          var leg = coordinates(from: route.polyline)

          if !merged.isEmpty, !leg.isEmpty {
            leg.removeFirst()
          }

          merged.append(contentsOf: leg)
        } catch {
          // Keep other legs; use a straight segment for this leg only.
          if merged.isEmpty {
            merged.append(left)
          }
          merged.append(right)
        }
      }

      if merged.count >= 2 {
        return merged
      }

      return rawPoints
    }
  }
}
