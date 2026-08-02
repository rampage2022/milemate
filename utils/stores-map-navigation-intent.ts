import type { StoresMapFilterState } from '@/utils/stores-map-filter-state';
import { createDefaultStoresMapFilterState } from '@/utils/stores-map-filter-state';
import type { StoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';

export type StoresMapNavigationIntentScope = 'today' | 'all';

export type StoresMapNavigationIntentSmartFilter = 'missed-delivery';

export type StoresMapNavigationIntent = {
  scope?: StoresMapNavigationIntentScope;
  smartFilter?: StoresMapNavigationIntentSmartFilter;
  selectedStoreId?: string;
  source?: 'workday-preview';
};

export type StoresMapEntryReturnDestination = 'workday-preview';

export type StoresMapEntryReturnContext = {
  returnTo: StoresMapEntryReturnDestination;
};

let pendingIntent: StoresMapNavigationIntent | null = null;
let activeReturnContext: StoresMapEntryReturnContext | null = null;

export function stageStoresMapNavigationIntent(intent: StoresMapNavigationIntent): void {
  pendingIntent = { ...intent };

  if (intent.source === 'workday-preview') {
    activeReturnContext = { returnTo: 'workday-preview' };
  }
}

export function consumeStoresMapNavigationIntent(): StoresMapNavigationIntent | null {
  const current = pendingIntent;
  pendingIntent = null;

  return current ? { ...current } : null;
}

export function getStoresMapEntryReturnContext(): StoresMapEntryReturnContext | null {
  return activeReturnContext ? { ...activeReturnContext } : null;
}

export function shouldShowStoresMapPreviewBackButton(): boolean {
  return activeReturnContext?.returnTo === 'workday-preview';
}

export function clearStoresMapEntryReturnContext(): void {
  activeReturnContext = null;
}

/** Tab focus without a newly staged alert intent — normal Stores entry. */
export function noteNormalStoresTabEntry(): void {
  if (pendingIntent) {
    return;
  }

  clearStoresMapEntryReturnContext();
}

/** @internal Test helper */
export function peekStoresMapNavigationIntent(): StoresMapNavigationIntent | null {
  return pendingIntent ? { ...pendingIntent } : null;
}

/** @internal Test helper */
export function clearStoresMapNavigationIntentForTests(): void {
  pendingIntent = null;
  activeReturnContext = null;
}

export function isStoresTabPathname(pathname: string): boolean {
  return pathname === '/stores' || pathname.endsWith('/stores');
}

export function shouldShowTabBarOnStoresDuringPreWorkday(input: {
  pathname: string;
  preWorkdayTabBarHidden: boolean;
}): boolean {
  if (!input.preWorkdayTabBarHidden) {
    return true;
  }

  return isStoresTabPathname(input.pathname);
}

export function mapNavigationIntentSmartFilterToId(
  smartFilter: StoresMapNavigationIntentSmartFilter,
): 'missed_delivery' {
  if (smartFilter === 'missed-delivery') {
    return 'missed_delivery';
  }

  return 'missed_delivery';
}

export function applyStoresMapNavigationIntentToFilterState(
  intent: StoresMapNavigationIntent,
): StoresMapFilterState {
  const state = createDefaultStoresMapFilterState();

  if (intent.smartFilter === 'missed-delivery') {
    return {
      ...state,
      enabledSmartFilters: [mapNavigationIntentSmartFilterToId(intent.smartFilter)],
    };
  }

  return state;
}

export function resolveStoresMapNavigationScope(
  intent: StoresMapNavigationIntent,
): StoresMapNavigationIntentScope {
  return intent.scope ?? 'today';
}

export function buildMissedDeliveryStoresMapNavigationIntent(input: {
  canonicalStoreIds: ReadonlySet<string>;
  routeStoreIds: readonly string[];
  smartFilterIndex: StoresMapSmartFilterIndex;
  source?: StoresMapNavigationIntent['source'];
}): StoresMapNavigationIntent {
  const missedStoreIds = input.routeStoreIds.filter(
    (storeId) =>
      input.canonicalStoreIds.has(storeId) &&
      input.smartFilterIndex.missedDeliveryStoreIds.has(storeId),
  );
  const scope: StoresMapNavigationIntentScope = 'today';
  const source = input.source ?? 'workday-preview';

  if (missedStoreIds.length === 1) {
    return {
      scope,
      selectedStoreId: missedStoreIds[0],
      source,
    };
  }

  if (missedStoreIds.length > 1) {
    return {
      scope,
      smartFilter: 'missed-delivery',
      source,
    };
  }

  return {
    scope,
    smartFilter: 'missed-delivery',
    source,
  };
}

export type StoresMapInitialSelectionRequest = {
  storeId: string;
  token: string;
};

export function createStoresMapInitialSelectionRequest(
  storeId: string,
): StoresMapInitialSelectionRequest {
  return {
    storeId,
    token: `select-${storeId}-${Date.now().toString(36)}`,
  };
}

export function shouldFitStoresMapToVisibleMarkers(markerCount: number): boolean {
  return markerCount > 0;
}
