import { Platform } from 'react-native';

/** Total height reserved above the home indicator for the Workday Dock (excluding safe area). */
export const WORKDAY_DOCK_CONTENT_HEIGHT = Platform.select({ ios: 52, default: 56 }) ?? 52;

export const STANDARD_TAB_BAR_ESTIMATED_HEIGHT = Platform.select({ ios: 49, default: 56 }) ?? 49;

export type WorkdayDockDestination = 'current-stop' | 'route' | 'visit-history';

export type LiveRouteViewMode = 'current-stop' | 'route';
