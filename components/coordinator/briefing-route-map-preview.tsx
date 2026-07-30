import type { BriefingRouteMapModel } from '@/utils/briefing-route-map-model';
import {
  RouteExperienceMap,
  type RouteExperienceMapProps,
} from '@/components/coordinator/route-experience-map';
import type { RouteExperienceMapModel } from '@/utils/route-experience-map-model';

/** @deprecated Use RouteExperienceMap with mode="planning" */
export type RouteMapExpansionPhase = 'embedded';

type BriefingRouteMapPreviewProps = {
  model: BriefingRouteMapModel | RouteExperienceMapModel;
  mapHeight?: number;
  onOpenStore: (storeId: string) => void;
  onSelectStop?: (storeId: string | null) => void;
  selectedStoreId?: string | null;
};

export function BriefingRouteMapPreview({
  mapHeight = 220,
  model,
  ...rest
}: BriefingRouteMapPreviewProps) {
  return (
    <RouteExperienceMap
      mapHeight={mapHeight}
      mode="planning"
      model={model}
      {...rest}
    />
  );
}

export type { RouteExperienceMapProps };
