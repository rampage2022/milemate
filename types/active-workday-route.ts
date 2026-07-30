export type ActiveWorkdayRouteEndpointSnapshot = {
  type: 'current_location' | 'address';
  label: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type ActiveWorkdayRouteContext = {
  startEndpointSnapshot: ActiveWorkdayRouteEndpointSnapshot | null;
  endEndpointSnapshot: ActiveWorkdayRouteEndpointSnapshot | null;
  returnToStart: boolean;
};
