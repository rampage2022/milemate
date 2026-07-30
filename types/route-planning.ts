import type { RouteLocation } from '@/types/route-location';

export type RoutePlanningPhase = 'planning' | 'calculating' | 'briefing';

export type PlannedRouteEstimate = {
  distanceMiles: number;
  driveTimeMinutes: number;
  estimatedFinishAt: string;
  method: 'direct-segment-sum' | 'apple-mapkit-driving';
};

export type RouteMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type RoutePlanningDraft = {
  dateKey: string;
  phase: RoutePlanningPhase;
  startLocation: RouteLocation | null;
  endLocation: RouteLocation | null;
  returnToStart: boolean;
  estimate: PlannedRouteEstimate | null;
  /** Road-following polyline from Apple MapKit (iOS); omitted when unavailable. */
  drivingPolyline: RouteMapCoordinate[] | null;
  calculatedAt: string | null;
  updatedAt: string;
};
