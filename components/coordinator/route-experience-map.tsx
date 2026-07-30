import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { RouteMapStopPreview } from '@/components/coordinator/route-map-stop-preview';
import { AppColors } from '@/components/shared/app-theme';
import type { BriefingMapMarker } from '@/utils/briefing-route-map-model';
import {
  collectActiveSegmentCoordinates,
  type ActiveRouteMapFocus,
  type RouteExperienceMapMode,
  type RouteExperienceMapModel,
  type RouteMapStopPhase,
} from '@/utils/route-experience-map-model';
import {
  computeRouteGeometryKey,
  computeRouteMapInitialRegion,
  isCoordinateInsideMapBounds,
  nudgeRegionToIncludeCoordinate,
  regionFromMapBoundaries,
  ROUTE_MAP_ACTIVE_SEGMENT_PADDING,
  ROUTE_MAP_FIT_EDGE_PADDING,
} from '@/utils/route-map-utils';

export type RouteExperienceMapProps = {
  activeFocus?: ActiveRouteMapFocus;
  /** Current + next store ids; camera advances when this changes if user is not exploring. */
  activeFocusKey?: string | null;
  mapHeight: number;
  mode: RouteExperienceMapMode;
  model: RouteExperienceMapModel;
  onOpenStore: (storeId: string) => void;
  onSelectStop?: (storeId: string | null) => void;
  selectedStoreId?: string | null;
  showsUserLocation?: boolean;
};

const STOP_MARKER_FRAME_SIZE = 36;

function StopMarkerFrame({ children }: { children: ReactNode }) {
  return (
    <View collapsable={false} pointerEvents="none" style={styles.stopMarkerFrame}>
      {children}
    </View>
  );
}

function StartHomeMarker({ title }: { title?: string }) {
  return (
    <View collapsable={false} pointerEvents="none" style={styles.planningStartWrap}>
      <View style={styles.planningStartCircle}>
        <Ionicons color="#FFFFFF" name="home" size={18} />
      </View>
      {title ? (
        <View style={styles.planningStartLabel}>
          <Text numberOfLines={1} style={styles.planningStartLabelText}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FinishFlagMarker() {
  return (
    <View collapsable={false} pointerEvents="none" style={styles.planningFinishCircle}>
      <Ionicons color="#FFFFFF" name="flag" size={16} />
    </View>
  );
}

function StartFinishPin({ color }: { color: string }) {
  return (
    <View collapsable={false} pointerEvents="none" style={styles.startFinishFrame}>
      <View style={[styles.pinOuter, { borderColor: color }]}>
        <View style={[styles.pinInner, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StopPin({
  mapMode,
  phase,
  selected,
  stopNumber,
}: {
  mapMode: RouteExperienceMapMode;
  phase?: RouteMapStopPhase;
  selected: boolean;
  stopNumber: number;
}) {
  if (mapMode === 'planning' && !phase) {
    return (
      <StopMarkerFrame>
        <View style={styles.planningStopPin}>
          <Text style={styles.planningStopPinLabel}>{stopNumber}</Text>
        </View>
      </StopMarkerFrame>
    );
  }

  if (phase === 'completed') {
    return (
      <StopMarkerFrame>
        <View style={[styles.stopPin, styles.stopPinCompleted]}>
          <Ionicons color="#FFFFFF" name="checkmark" size={14} />
        </View>
      </StopMarkerFrame>
    );
  }

  if (phase === 'skipped') {
    return (
      <StopMarkerFrame>
        <View style={[styles.stopPin, styles.stopPinSkipped]}>
          <Ionicons color="#FFFFFF" name="remove" size={14} />
        </View>
      </StopMarkerFrame>
    );
  }

  const isCurrent = phase === 'current';
  const isNext = phase === 'next';

  return (
    <StopMarkerFrame>
      <View
        style={[
          styles.stopPin,
          isNext && styles.stopPinNext,
          isCurrent && styles.stopPinCurrent,
          selected && styles.stopPinSelected,
        ]}
      >
        <Text
          style={[
            styles.stopPinLabel,
            (isCurrent || selected) && styles.stopPinLabelSelected,
            isNext && !selected && styles.stopPinLabelNext,
          ]}
        >
          {stopNumber}
        </Text>
      </View>
    </StopMarkerFrame>
  );
}

export function RouteExperienceMap({
  activeFocus,
  activeFocusKey = null,
  mapHeight,
  mode,
  model,
  onOpenStore,
  onSelectStop,
  selectedStoreId = null,
  showsUserLocation = false,
}: RouteExperienceMapProps) {
  const mapRef = useRef<MapView>(null);
  const isProgrammaticCameraRef = useRef(false);
  const suppressMapClearRef = useRef(false);
  const pendingCameraFitRef = useRef(true);
  const routeGeometryKeyRef = useRef<string>('');
  const activeFocusKeyRef = useRef<string | null>(null);
  const fitOverviewRef = useRef<(animated: boolean) => void>(() => {});
  const fitActiveSegmentRef = useRef<(animated: boolean) => void>(() => {});
  const onSelectStopRef = useRef(onSelectStop);
  const markersRef = useRef(model.markers);
  const activeFocusRef = useRef(activeFocus);

  markersRef.current = model.markers;
  onSelectStopRef.current = onSelectStop;
  activeFocusRef.current = activeFocus;

  const [hasUserInteractedWithMap, setHasUserInteractedWithMap] = useState(false);
  const [previewMarker, setPreviewMarker] = useState<BriefingMapMarker | null>(null);

  const routeGeometryKey = useMemo(
    () => computeRouteGeometryKey(model.polyline),
    [model.polyline],
  );

  const fitCoordinates = useMemo(
    () =>
      model.polyline.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    [routeGeometryKey],
  );

  const polylineCoordinates = fitCoordinates;

  const initialRegion = useMemo(
    () =>
      computeRouteMapInitialRegion(polylineCoordinates, {
        planningOverview: mode === 'planning',
      }),
    [mode, routeGeometryKey],
  );

  const activeSegmentCoordinates = useMemo(() => {
    if (mode !== 'active' || !activeFocus) {
      return fitCoordinates;
    }

    return collectActiveSegmentCoordinates({ model, focus: activeFocus });
  }, [
    activeFocus,
    fitCoordinates,
    mode,
    model,
    routeGeometryKey,
  ]);

  const fitRouteOverview = useCallback(
    (animated: boolean) => {
      if (fitCoordinates.length === 0) {
        return;
      }

      if (mode === 'planning') {
        const region = computeRouteMapInitialRegion(fitCoordinates, {
          planningOverview: true,
        });
        isProgrammaticCameraRef.current = true;
        mapRef.current?.animateToRegion(region, animated ? 280 : 0);
        return;
      }

      if (fitCoordinates.length < 2) {
        return;
      }

      isProgrammaticCameraRef.current = true;
      mapRef.current?.fitToCoordinates(fitCoordinates, {
        animated,
        edgePadding: ROUTE_MAP_FIT_EDGE_PADDING,
      });
    },
    [fitCoordinates, mode],
  );

  const fitActiveSegment = useCallback(
    (animated: boolean) => {
      if (activeSegmentCoordinates.length < 2) {
        fitRouteOverview(animated);
        return;
      }

      isProgrammaticCameraRef.current = true;
      mapRef.current?.fitToCoordinates(activeSegmentCoordinates, {
        animated,
        edgePadding: ROUTE_MAP_ACTIVE_SEGMENT_PADDING,
      });
    },
    [activeSegmentCoordinates, fitRouteOverview],
  );

  fitOverviewRef.current = fitRouteOverview;
  fitActiveSegmentRef.current = fitActiveSegment;

  const applyDefaultCamera = useCallback(
    (animated: boolean) => {
      if (mode === 'active') {
        fitActiveSegment(animated);
        return;
      }

      fitRouteOverview(animated);
    },
    [fitActiveSegment, fitRouteOverview, mode],
  );

  const applyDefaultCameraRef = useRef(applyDefaultCamera);
  applyDefaultCameraRef.current = applyDefaultCamera;

  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (prevModeRef.current === mode) {
      return;
    }

    prevModeRef.current = mode;

    if (!hasUserInteractedWithMap && mapRef.current) {
      applyDefaultCamera(true);
    }
  }, [applyDefaultCamera, hasUserInteractedWithMap, mode]);

  useFocusEffect(
    useCallback(() => {
      pendingCameraFitRef.current = true;
      setHasUserInteractedWithMap(false);
      setPreviewMarker(null);
      onSelectStopRef.current?.(null);
      activeFocusKeyRef.current = activeFocusKey;

      if (mapRef.current) {
        applyDefaultCameraRef.current(false);
        pendingCameraFitRef.current = false;
      }
    }, []),
  );

  useEffect(() => {
    if (routeGeometryKeyRef.current === routeGeometryKey) {
      return;
    }

    routeGeometryKeyRef.current = routeGeometryKey;

    if (!hasUserInteractedWithMap) {
      pendingCameraFitRef.current = true;
      if (mapRef.current) {
        applyDefaultCamera(false);
        pendingCameraFitRef.current = false;
      }
    }
  }, [applyDefaultCamera, hasUserInteractedWithMap, routeGeometryKey]);

  useEffect(() => {
    if (mode !== 'active' || !activeFocusKey) {
      return;
    }

    if (activeFocusKeyRef.current === activeFocusKey) {
      return;
    }

    activeFocusKeyRef.current = activeFocusKey;

    if (hasUserInteractedWithMap) {
      return;
    }

    pendingCameraFitRef.current = true;
    if (mapRef.current) {
      fitActiveSegment(true);
      pendingCameraFitRef.current = false;
    }
  }, [activeFocusKey, fitActiveSegment, hasUserInteractedWithMap, mode]);

  useEffect(() => {
    if (!selectedStoreId) {
      setPreviewMarker(null);
      return;
    }

    const marker = markersRef.current.find(
      (entry) => entry.kind === 'stop' && entry.storeId === selectedStoreId,
    );

    if (!marker) {
      setPreviewMarker(null);
      return;
    }

    setPreviewMarker(marker);

    void (async () => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      try {
        const bounds = await map.getMapBoundaries();

        if (isCoordinateInsideMapBounds(marker, bounds)) {
          return;
        }

        const region = regionFromMapBoundaries(bounds);
        const nudged = nudgeRegionToIncludeCoordinate(region, marker);
        isProgrammaticCameraRef.current = true;
        map.animateToRegion(nudged satisfies Region, 260);
      } catch {
        // Keep the user's camera when boundaries are unavailable.
      }
    })();
  }, [selectedStoreId, routeGeometryKey]);

  const markUserExploring = useCallback(() => {
    setHasUserInteractedWithMap(true);
  }, []);

  const handleRegionChangeComplete = useCallback(() => {
    if (isProgrammaticCameraRef.current) {
      isProgrammaticCameraRef.current = false;
      return;
    }

    markUserExploring();
  }, [markUserExploring]);

  const handleMarkerPress = useCallback(
    (marker: BriefingMapMarker) => {
      if (marker.kind !== 'stop' || !marker.storeId) {
        return;
      }

      suppressMapClearRef.current = true;

      if (selectedStoreId === marker.storeId) {
        setPreviewMarker(null);
        onSelectStop?.(null);
        return;
      }

      setPreviewMarker(marker);
      onSelectStop?.(marker.storeId);
    },
    [onSelectStop, selectedStoreId],
  );

  const handleRecenter = useCallback(() => {
    setHasUserInteractedWithMap(false);
    setPreviewMarker(null);
    onSelectStop?.(null);
    applyDefaultCamera(true);
  }, [applyDefaultCamera, onSelectStop]);

  const polylineColor =
    mode === 'complete' ? AppColors.textMuted : AppColors.blue;
  const polylineWidth = mode === 'complete' ? 3 : 4;

  if (Platform.OS === 'web') {
    return (
      <View
        accessibilityLabel="Route map"
        style={[styles.card, { height: mapHeight }]}
      >
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Route map on iOS or Android</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Interactive route map"
      style={[styles.card, { height: mapHeight }]}
    >
      <MapView
        ref={mapRef}
        initialRegion={initialRegion}
        moveOnMarkerPress={false}
        onMapReady={() => {
          if (pendingCameraFitRef.current) {
            applyDefaultCamera(false);
            pendingCameraFitRef.current = false;
          }
        }}
        onPanDrag={markUserExploring}
        onPress={() => {
          if (suppressMapClearRef.current) {
            suppressMapClearRef.current = false;
            return;
          }

          setPreviewMarker(null);
          onSelectStop?.(null);
        }}
        onRegionChange={(_region, details) => {
          if (details?.isGesture) {
            markUserExploring();
          }
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        pitchEnabled={false}
        rotateEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsScale={false}
        showsTraffic={false}
        showsUserLocation={showsUserLocation}
        style={styles.map}
        toolbarEnabled={false}
      >
        <Polyline
          coordinates={polylineCoordinates}
          geodesic
          lineCap="round"
          lineJoin="round"
          strokeColor={polylineColor}
          strokeWidth={polylineWidth}
        />
        {model.markers.map((marker) => {
          const coordinate = {
            latitude: marker.latitude,
            longitude: marker.longitude,
          };
          const markerKey =
            marker.kind === 'stop' && marker.storeId
              ? `stop-${marker.storeId}`
              : `${marker.kind}-${marker.latitude}-${marker.longitude}`;
          const isSelected =
            marker.kind === 'stop' && marker.storeId === selectedStoreId;
          const phase = marker.routePhase;

          if (marker.kind === 'start') {
            return (
              <Marker
                anchor={{ x: 0.5, y: mode === 'planning' && marker.title ? 0.72 : 0.5 }}
                coordinate={coordinate}
                key={markerKey}
                tracksViewChanges={false}
              >
                {mode === 'planning' ? (
                  <StartHomeMarker title={marker.title} />
                ) : (
                  <StartFinishPin color={AppColors.green} />
                )}
              </Marker>
            );
          }

          if (marker.kind === 'finish') {
            return (
              <Marker
                anchor={{ x: 0.5, y: 0.5 }}
                coordinate={coordinate}
                key={markerKey}
                tracksViewChanges={false}
              >
                {mode === 'planning' ? (
                  <FinishFlagMarker />
                ) : (
                  <StartFinishPin color={AppColors.red} />
                )}
              </Marker>
            );
          }

          return (
            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={coordinate}
              key={markerKey}
              onPress={() => {
                handleMarkerPress(marker);
              }}
              tracksViewChanges={false}
            >
              <StopPin
                mapMode={mode}
                phase={phase}
                selected={isSelected}
                stopNumber={marker.stopNumber ?? 0}
              />
            </Marker>
          );
        })}
      </MapView>

      {hasUserInteractedWithMap ? (
        <Pressable
          accessibilityLabel="Re-center route"
          accessibilityRole="button"
          onPress={handleRecenter}
          style={({ pressed }) => [styles.recenterButton, pressed && styles.recenterPressed]}
        >
          <Ionicons color={AppColors.blue} name="map-outline" size={16} />
          <Text style={styles.recenterLabel}>Re-center Route</Text>
        </Pressable>
      ) : null}

      {previewMarker ? (
        <RouteMapStopPreview marker={previewMarker} onOpenStore={onOpenStore} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  stopMarkerFrame: {
    alignItems: 'center',
    height: STOP_MARKER_FRAME_SIZE,
    justifyContent: 'center',
    width: STOP_MARKER_FRAME_SIZE,
  },
  startFinishFrame: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  pinOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  pinInner: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  stopPin: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.blue,
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stopPinNext: {
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  stopPinCurrent: {
    backgroundColor: AppColors.blue,
    borderWidth: 3,
    height: 32,
    width: 32,
  },
  stopPinCompleted: {
    backgroundColor: AppColors.green,
    borderColor: AppColors.green,
    height: 26,
    opacity: 0.95,
    width: 26,
  },
  stopPinSkipped: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    height: 26,
    width: 26,
  },
  stopPinSelected: {
    backgroundColor: AppColors.blue,
    borderWidth: 3,
    height: 32,
    width: 32,
  },
  stopPinLabel: {
    color: AppColors.blue,
    fontSize: 12,
    fontWeight: '800',
  },
  stopPinLabelNext: {
    color: AppColors.blue,
  },
  stopPinLabelSelected: {
    color: '#FFFFFF',
  },
  planningStartWrap: {
    alignItems: 'center',
    gap: 4,
  },
  planningStartCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  planningStartLabel: {
    backgroundColor: 'rgba(12, 14, 20, 0.82)',
    borderRadius: 8,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planningStartLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  planningFinishCircle: {
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  planningStopPin: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  planningStopPinLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  recenterButton: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    top: 12,
  },
  recenterPressed: {
    opacity: 0.88,
  },
  recenterLabel: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: AppColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
