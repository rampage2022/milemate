import type { BriefingRouteMapModel } from '@/utils/briefing-route-map-model';

export type ProjectedMapPoint = {
  x: number;
  y: number;
};

const DEFAULT_PADDING = 32;

export function projectBriefingRouteMap(input: {
  model: BriefingRouteMapModel;
  width: number;
  height: number;
  padding?: number;
}): {
  polyline: ProjectedMapPoint[];
  markers: Array<
    ProjectedMapPoint & {
      kind: BriefingRouteMapModel['markers'][number]['kind'];
      stopNumber?: number;
    }
  >;
} {
  const padding = input.padding ?? DEFAULT_PADDING;
  const points = input.model.polyline;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const midLat = (minLat + maxLat) / 2;
  const longitudeScale = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));

  const projectedMetric = points.map((point) => ({
    x: (point.longitude - minLng) * longitudeScale,
    y: maxLat - point.latitude,
  }));

  const minX = Math.min(...projectedMetric.map((point) => point.x));
  const maxX = Math.max(...projectedMetric.map((point) => point.x));
  const minY = Math.min(...projectedMetric.map((point) => point.y));
  const maxY = Math.max(...projectedMetric.map((point) => point.y));

  const spanX = maxX - minX || 0.001;
  const spanY = maxY - minY || 0.001;

  const innerWidth = Math.max(1, input.width - padding * 2);
  const innerHeight = Math.max(1, input.height - padding * 2);
  const scale = Math.min(innerWidth / spanX, innerHeight / spanY);

  const contentWidth = spanX * scale;
  const contentHeight = spanY * scale;
  const offsetX = padding + (innerWidth - contentWidth) / 2;
  const offsetY = padding + (innerHeight - contentHeight) / 2;

  const project = (latitude: number, longitude: number): ProjectedMapPoint => {
    const metricX = (longitude - minLng) * longitudeScale;
    const metricY = maxLat - latitude;

    return {
      x: offsetX + (metricX - minX) * scale,
      y: offsetY + (metricY - minY) * scale,
    };
  };

  return {
    polyline: points.map((point) => project(point.latitude, point.longitude)),
    markers: input.model.markers.map((marker) => ({
      ...project(marker.latitude, marker.longitude),
      kind: marker.kind,
      stopNumber: marker.stopNumber,
    })),
  };
}
