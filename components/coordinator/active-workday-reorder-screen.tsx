import { StyleSheet, Text, View } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';

import {
  ACTIVE_WORKDAY_REORDER_FOOTER_HEIGHT,
  ActiveWorkdayReorderLayout,
} from '@/components/coordinator/active-workday-reorder-layout';
import { StopsRouteEditPanel } from '@/components/stops/stops-route-edit-panel';
import { PrimaryButton } from '@/components/redesign/primitives/primary-button';
import { AppColors } from '@/components/shared/app-theme';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

export { ACTIVE_WORKDAY_REORDER_FOOTER_HEIGHT };

type ActiveWorkdayReorderScreenProps = {
  bottomInset: number;
  currentVisitId: string | null;
  draft: RoutePlanningDraft;
  onDone: () => void;
  onPressStop: (storeId: string) => void;
  onRemoveStop: (visitId: string, stopName: string) => void;
  onReorderStops: (orderedVisitIds: string[]) => void;
  scrollPaddingBottom: number;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

export function ActiveWorkdayReorderScreen({
  bottomInset,
  currentVisitId,
  draft,
  onDone,
  onPressStop,
  onRemoveStop,
  onReorderStops,
  scrollPaddingBottom,
  storesById,
  visits,
}: ActiveWorkdayReorderScreenProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Reorder Stops
        </Text>
        <Text style={styles.headerSubtitle}>
          Arrange the remaining stops for this workday
        </Text>
      </View>

      <NestableScrollContainer
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <StopsRouteEditPanel
          currentVisitId={currentVisitId}
          draft={draft}
          onPressStop={onPressStop}
          onRemove={onRemoveStop}
          onReorder={onReorderStops}
          presentation="activeWorkday"
          storesById={storesById}
          visits={visits}
        />
      </NestableScrollContainer>

      <View pointerEvents="box-none" style={[styles.footer, { paddingBottom: bottomInset }]}>
        <PrimaryButton
          label="Done"
          minHeight={ActiveWorkdayReorderLayout.doneButtonMinHeight}
          onPress={onDone}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: AppColors.background,
    flex: 1,
    width: '100%',
  },
  header: {
    gap: 2,
    paddingBottom: 4,
    paddingTop: 0,
  },
  headerTitle: {
    color: AppColors.textPrimary,
    fontSize: ActiveWorkdayReorderLayout.headerTitleSize,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: AppColors.textSecondary,
    fontSize: ActiveWorkdayReorderLayout.headerSubtitleSize,
    fontWeight: '500',
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 0,
    gap: ActiveWorkdayReorderLayout.sectionGap,
    paddingTop: 2,
  },
  footer: {
    backgroundColor: AppColors.background,
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    left: 0,
    paddingHorizontal: 0,
    paddingTop: ActiveWorkdayReorderLayout.footerPaddingTop,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
