/** Layout tokens for Build Your Route (approved route planning mockup). */
export const BuildRouteLayout = {
  headerTitleSize: 18,
  headerSubtitleSize: 13,
  /** Upper map band — compact enough to show ~5 stop rows on a normal iPhone. */
  mapHeightRatio: 0.26,
  mapSummaryBarRadius: 12,
  emptyIconRingSize: 88,
  emptyIconSize: 36,
  screenSectionGap: 8,
  cardRadius: 14,
  cardPaddingH: 12,
  addStopButtonMinHeight: 44,
  setRouteMinHeight: 56,
  /** Stop rows in the connected route list. */
  routeListRowHeight: 76,
  /** Start and finish endpoint rows — slightly shorter than stops. */
  routeListEndpointHeight: 70,
  /** Spacing between rows inside the connected route list. */
  routeListConnectedGap: 8,
  stopNameSize: 15,
  stopAddressSize: 14,
  legDistanceSize: 16,
  endpointAddressSize: 14,
  mapSummaryTextSize: 13,
} as const;
