/** Density tokens for Active Workday reorder mode only. */
export const ActiveWorkdayReorderLayout = {
  sectionGap: 6,
  rowGap: 8,
  anchorMinHeight: 80,
  stopRowMinHeight: 90,
  completedRowMinHeight: 90,
  doneButtonMinHeight: 56,
  footerPaddingTop: 8,
  storeNameSize: 15,
  storeAddressSize: 14,
  anchorStreetSize: 14,
  anchorCitySize: 13,
  headerTitleSize: 20,
  headerSubtitleSize: 13,
} as const;

export const ACTIVE_WORKDAY_REORDER_FOOTER_HEIGHT =
  ActiveWorkdayReorderLayout.footerPaddingTop +
  ActiveWorkdayReorderLayout.doneButtonMinHeight;
