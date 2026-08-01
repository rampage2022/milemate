/** Named palette keys for saved Workday map/filter styling (not arbitrary hex in persistence). */
export const WORKDAY_MAP_COLOR_KEYS = [
  'blue',
  'green',
  'orange',
  'purple',
  'teal',
  'pink',
  'amber',
  'indigo',
] as const;

export type WorkdayMapColorKey = (typeof WORKDAY_MAP_COLOR_KEYS)[number];

export type WorkdayMapColorStyle = {
  chipBackground: string;
  chipBorder: string;
  chipText: string;
  markerBackground: string;
  markerForeground: string;
};

/** Reserved for stores with no saved Workday membership (not a WorkdayMapColorKey). */
export const UNASSIGNED_STORE_MAP_STYLE: WorkdayMapColorStyle = {
  markerBackground: '#636366',
  markerForeground: '#FFFFFF',
  chipBackground: 'rgba(99, 99, 102, 0.2)',
  chipBorder: 'rgba(99, 99, 102, 0.45)',
  chipText: '#E5E7EB',
};

const WORKDAY_MAP_COLOR_STYLES: Record<WorkdayMapColorKey, WorkdayMapColorStyle> = {
  blue: {
    markerBackground: '#007AFF',
    markerForeground: '#FFFFFF',
    chipBackground: 'rgba(0, 122, 255, 0.18)',
    chipBorder: 'rgba(0, 122, 255, 0.45)',
    chipText: '#FFFFFF',
  },
  green: {
    markerBackground: '#34C759',
    markerForeground: '#0B0E14',
    chipBackground: 'rgba(52, 199, 89, 0.18)',
    chipBorder: 'rgba(52, 199, 89, 0.45)',
    chipText: '#FFFFFF',
  },
  orange: {
    markerBackground: '#FF9500',
    markerForeground: '#0B0E14',
    chipBackground: 'rgba(255, 149, 0, 0.2)',
    chipBorder: 'rgba(255, 149, 0, 0.5)',
    chipText: '#FFFFFF',
  },
  purple: {
    markerBackground: '#AF52DE',
    markerForeground: '#FFFFFF',
    chipBackground: 'rgba(175, 82, 222, 0.2)',
    chipBorder: 'rgba(175, 82, 222, 0.45)',
    chipText: '#FFFFFF',
  },
  teal: {
    markerBackground: '#30B0C7',
    markerForeground: '#0B0E14',
    chipBackground: 'rgba(48, 176, 199, 0.2)',
    chipBorder: 'rgba(48, 176, 199, 0.45)',
    chipText: '#FFFFFF',
  },
  pink: {
    markerBackground: '#FF2D55',
    markerForeground: '#FFFFFF',
    chipBackground: 'rgba(255, 45, 85, 0.2)',
    chipBorder: 'rgba(255, 45, 85, 0.45)',
    chipText: '#FFFFFF',
  },
  amber: {
    markerBackground: '#FFCC00',
    markerForeground: '#0B0E14',
    chipBackground: 'rgba(255, 204, 0, 0.22)',
    chipBorder: 'rgba(255, 204, 0, 0.5)',
    chipText: '#0B0E14',
  },
  indigo: {
    markerBackground: '#5856D6',
    markerForeground: '#FFFFFF',
    chipBackground: 'rgba(88, 86, 214, 0.2)',
    chipBorder: 'rgba(88, 86, 214, 0.45)',
    chipText: '#FFFFFF',
  },
};

export function isWorkdayMapColorKey(value: string): value is WorkdayMapColorKey {
  return (WORKDAY_MAP_COLOR_KEYS as readonly string[]).includes(value);
}

export function getWorkdayMapColorStyle(key: WorkdayMapColorKey): WorkdayMapColorStyle {
  return WORKDAY_MAP_COLOR_STYLES[key];
}

export function getWorkdayMapColorKeyAtPaletteIndex(index: number): WorkdayMapColorKey {
  const paletteIndex =
    ((index % WORKDAY_MAP_COLOR_KEYS.length) + WORKDAY_MAP_COLOR_KEYS.length) %
    WORKDAY_MAP_COLOR_KEYS.length;

  return WORKDAY_MAP_COLOR_KEYS[paletteIndex]!;
}
