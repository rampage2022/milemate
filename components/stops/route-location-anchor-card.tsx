import type { RouteLocation } from '@/types/route-location';

import { RouteEndpointCard, type RouteEndpointKind } from '@/components/coordinator/route-endpoint-card';

type RouteLocationAnchorCardProps = {
  kind: RouteEndpointKind;
  location: RouteLocation | null;
};

/** Read-only Start/Finish anchors for the active live route (not visit stops). */
export function RouteLocationAnchorCard({ kind, location }: RouteLocationAnchorCardProps) {
  return <RouteEndpointCard kind={kind} location={location} locked />;
}
