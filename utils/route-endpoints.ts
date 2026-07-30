import type { RouteEndpoint } from '@/types/route-endpoint';
import {
  createCurrentLocationEndpoint,
  createCustomAddressEndpoint,
  createSavedLocationEndpoint,
  CURRENT_LOCATION_LABEL,
} from '@/types/route-endpoint';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { indexSavedLocationsById } from '@/utils/my-locations';

export type ResolvedRouteEndpointDisplay = {
  isResolved: boolean;
  label: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type BriefingRouteSummary = {
  startLabel: string;
  endLabel: string;
};

export function getEffectiveEndEndpoint(
  selection: TodayRouteSelection,
): RouteEndpoint | null {
  if (selection.returnToStart) {
    return selection.startEndpoint;
  }

  return selection.endEndpoint;
}

export function isCurrentLocationEndpoint(endpoint: RouteEndpoint): boolean {
  return endpoint.type === 'current_location';
}

export function isEndpointSelected(endpoint: RouteEndpoint | null): boolean {
  if (!endpoint) {
    return false;
  }

  if (endpoint.type === 'current_location') {
    return true;
  }

  if (endpoint.type === 'saved_location') {
    return endpoint.savedLocationId.trim().length > 0;
  }

  return (
    endpoint.label.trim().length > 0 ||
    endpoint.address.trim().length > 0
  );
}

export function resolveEndpointForDisplay(
  endpoint: RouteEndpoint | null,
  locationsById: Record<string, SavedLocation>,
): ResolvedRouteEndpointDisplay | null {
  if (!endpoint) {
    return null;
  }

  if (endpoint.type === 'current_location') {
    return {
      isResolved: true,
      label: CURRENT_LOCATION_LABEL,
      address: null,
      latitude: null,
      longitude: null,
    };
  }

  if (endpoint.type === 'saved_location') {
    const saved = locationsById[endpoint.savedLocationId];

    if (!saved) {
      return {
        isResolved: false,
        label: 'Choose location',
        address: null,
        latitude: null,
        longitude: null,
      };
    }

    return {
      isResolved: true,
      label: saved.label,
      address: saved.address,
      latitude: saved.latitude,
      longitude: saved.longitude,
    };
  }

  const label = endpoint.label.trim();
  const address = endpoint.address.trim();

  if (label.length === 0 && address.length === 0) {
    return {
      isResolved: false,
      label: 'Choose location',
      address: null,
      latitude: null,
      longitude: null,
    };
  }

  return {
    isResolved: true,
    label: label.length > 0 ? label : 'Address',
    address: address.length > 0 ? address : null,
    latitude: endpoint.latitude,
    longitude: endpoint.longitude,
  };
}

export function getEndpointDisplayLabel(
  endpoint: RouteEndpoint,
  locationsById: Record<string, SavedLocation> = {},
): string {
  const resolved = resolveEndpointForDisplay(endpoint, locationsById);

  return resolved?.label ?? 'Choose location';
}

export function isRouteSelectionComplete(
  selection: TodayRouteSelection,
  locations: SavedLocation[],
): boolean {
  const locationsById = indexSavedLocationsById(locations);
  const start = resolveEndpointForDisplay(selection.startEndpoint, locationsById);
  const end = resolveEndpointForDisplay(
    getEffectiveEndEndpoint(selection),
    locationsById,
  );

  return Boolean(start?.isResolved && end?.isResolved);
}

export function buildBriefingRouteSummaryFromSelection(
  selection: TodayRouteSelection,
  locations: SavedLocation[],
): BriefingRouteSummary | null {
  if (!isRouteSelectionComplete(selection, locations)) {
    return null;
  }

  const locationsById = indexSavedLocationsById(locations);
  const start = resolveEndpointForDisplay(selection.startEndpoint, locationsById)!;
  const end = resolveEndpointForDisplay(getEffectiveEndEndpoint(selection), locationsById)!;

  return {
    startLabel: start.label,
    endLabel: end.label,
  };
}

export function formatBriefingRouteLine(
  summary: BriefingRouteSummary,
  stopCount: number,
): string {
  const stopLabel = stopCount === 1 ? '1 stop' : `${stopCount} stops`;

  return `${summary.startLabel} → ${stopLabel} → ${summary.endLabel}`;
}

export function sanitizeRouteEndpoint(endpoint: unknown): RouteEndpoint | null {
  if (typeof endpoint !== 'object' || endpoint === null) {
    return null;
  }

  const record = endpoint as Record<string, unknown>;

  if (record.type === 'current_location') {
    return createCurrentLocationEndpoint();
  }

  if (record.type === 'saved_location') {
    if (typeof record.savedLocationId !== 'string') {
      return null;
    }

    const savedLocationId = record.savedLocationId.trim();

    if (savedLocationId.length === 0) {
      return null;
    }

    return createSavedLocationEndpoint(savedLocationId);
  }

  if (record.type === 'custom_address' || record.type === 'address') {
    if (typeof record.label !== 'string' || typeof record.address !== 'string') {
      return null;
    }

    const latitude =
      record.latitude === null || record.latitude === undefined
        ? null
        : typeof record.latitude === 'number' && Number.isFinite(record.latitude)
          ? record.latitude
          : null;
    const longitude =
      record.longitude === null || record.longitude === undefined
        ? null
        : typeof record.longitude === 'number' && Number.isFinite(record.longitude)
          ? record.longitude
          : null;

    return createCustomAddressEndpoint({
      label: record.label,
      address: record.address,
      latitude,
      longitude,
    });
  }

  return null;
}

export function serializeRouteEndpointForStorage(
  endpoint: RouteEndpoint,
): RouteEndpoint {
  if (endpoint.type === 'current_location') {
    return createCurrentLocationEndpoint();
  }

  if (endpoint.type === 'saved_location') {
    return createSavedLocationEndpoint(endpoint.savedLocationId.trim());
  }

  return createCustomAddressEndpoint({
    label: endpoint.label,
    address: endpoint.address,
    latitude: endpoint.latitude,
    longitude: endpoint.longitude,
  });
}

export function resolveEndpointPickerLabel(
  endpoint: RouteEndpoint | null,
  locationsById: Record<string, SavedLocation>,
  placeholder: string,
): string {
  if (!endpoint) {
    return placeholder;
  }

  const resolved = resolveEndpointForDisplay(endpoint, locationsById);

  if (!resolved?.isResolved) {
    return placeholder;
  }

  if (resolved.address && resolved.label !== resolved.address) {
    return `${resolved.label} · ${resolved.address}`;
  }

  return resolved.label;
}

export function endpointsMatch(a: RouteEndpoint, b: RouteEndpoint): boolean {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === 'current_location' && b.type === 'current_location') {
    return true;
  }

  if (a.type === 'saved_location' && b.type === 'saved_location') {
    return a.savedLocationId === b.savedLocationId;
  }

  if (a.type === 'custom_address' && b.type === 'custom_address') {
    return (
      a.label.trim() === b.label.trim() &&
      a.address.trim() === b.address.trim() &&
      a.latitude === b.latitude &&
      a.longitude === b.longitude
    );
  }

  return false;
}
