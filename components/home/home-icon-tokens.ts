import type { SymbolViewProps } from 'expo-symbols';
import type Ionicons from '@expo/vector-icons/Ionicons';

/** Approved home mockup icons — SF Symbols on iOS, Ionicons outline elsewhere. */
export type HomeIconToken =
  | 'statusStart'
  | 'statusWeather'
  | 'statusNavigation'
  | 'actionNewWorkday'
  | 'actionLoadWorkday'
  | 'actionWorkdayHistory'
  | 'actionChevron'
  | 'readyCheck'
  | 'readyIncomplete';

export const HOME_ICON_SF: Record<HomeIconToken, SymbolViewProps['name']> = {
  statusStart: 'mappin.circle',
  statusWeather: 'sun.max',
  statusNavigation: 'location.north.circle',
  actionNewWorkday: 'point.topleft.down.curvedto.point.bottomright.up',
  actionLoadWorkday: 'folder',
  actionWorkdayHistory: 'clock.arrow.circlepath',
  actionChevron: 'chevron.right',
  readyCheck: 'checkmark.circle',
  readyIncomplete: 'circle',
};

export const HOME_ICON_ION: Record<HomeIconToken, keyof typeof Ionicons.glyphMap> = {
  statusStart: 'location-outline',
  statusWeather: 'sunny-outline',
  statusNavigation: 'navigate-outline',
  actionNewWorkday: 'map-outline',
  actionLoadWorkday: 'folder-open-outline',
  actionWorkdayHistory: 'time-outline',
  actionChevron: 'chevron-forward-outline',
  readyCheck: 'checkmark-circle-outline',
  readyIncomplete: 'ellipse-outline',
};
