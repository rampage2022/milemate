import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type {
  VisitLogStoreSnapshotCollapsedItem,
  VisitLogStoreSnapshotPresentation,
} from '@/utils/visit-log-store-snapshot';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type VisitLogStoreSnapshotSectionProps = {
  onOpenDeliveries: () => void;
  onViewAllNotes: () => void;
  snapshot: VisitLogStoreSnapshotPresentation;
};

const HEADER_SIDE_WIDTH = 44;

function collapsedSummaryForAccessibility(snapshot: VisitLogStoreSnapshotPresentation): string {
  if (!snapshot.hasAnyActivity) {
    return snapshot.emptyMessage ?? 'No store activity yet';
  }

  return snapshot.collapsedItems.map((item) => item.text).join(', ');
}

function CollapsedSnapshotItem({ item }: { item: VisitLogStoreSnapshotCollapsedItem }) {
  const textColor = item.tone === 'orange' ? AppColors.orange : AppColors.textSecondary;

  return (
    <View style={styles.collapsedItem}>
      <Ionicons color={textColor} name={item.icon} size={16} />
      <Text maxFontSizeMultiplier={2} numberOfLines={1} style={[styles.collapsedItemText, { color: textColor }]}>
        {item.text}
      </Text>
    </View>
  );
}

export function VisitLogStoreSnapshotSection({
  onOpenDeliveries,
  onViewAllNotes,
  snapshot,
}: VisitLogStoreSnapshotSectionProps) {
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);
  }

  const accessibilitySummary = collapsedSummaryForAccessibility(snapshot);

  return (
    <SurfaceCard style={styles.card}>
      <Pressable
        accessibilityLabel={
          expanded
            ? 'Collapse Store Snapshot'
            : `Expand Store Snapshot, ${accessibilitySummary}`
        }
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.headerPressable, pressed && styles.pressed]}
      >
        <View style={styles.titleBar}>
          <Text maxFontSizeMultiplier={2} numberOfLines={1} pointerEvents="none" style={styles.title}>
            Store Snapshot
          </Text>
          <View style={styles.chevronSlot}>
            <Ionicons
              color={AppColors.textMuted}
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </View>
        </View>

        {!expanded ? (
          snapshot.hasAnyActivity ? (
            <View style={styles.collapsedRow}>
              {snapshot.collapsedItems.map((item) => (
                <CollapsedSnapshotItem key={`${item.icon}-${item.text}`} item={item} />
              ))}
            </View>
          ) : (
            <Text maxFontSizeMultiplier={2} numberOfLines={2} style={styles.emptyCollapsed}>
              {snapshot.emptyMessage}
            </Text>
          )
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {!snapshot.hasAnyActivity ? (
            <Text style={styles.emptyExpanded}>{snapshot.emptyMessage}</Text>
          ) : (
            <>
              {snapshot.lastVisitRow ? (
                <View style={styles.expandedRow}>
                  <Ionicons color={AppColors.textSecondary} name={snapshot.lastVisitRow.icon} size={20} />
                  <View style={styles.expandedCopy}>
                    <Text style={styles.rowLabel}>{snapshot.lastVisitRow.label}</Text>
                    <Text maxFontSizeMultiplier={2} style={styles.rowDetail}>
                      {snapshot.lastVisitRow.detail}
                    </Text>
                    {snapshot.lastVisitRow.subDetail ? (
                      <Text style={styles.rowSubDetail}>{snapshot.lastVisitRow.subDetail}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {snapshot.lastVisitRow && snapshot.deliveryRow ? (
                <View style={styles.rowDivider} />
              ) : null}

              {snapshot.deliveryRow ? (
                <Pressable
                  accessibilityLabel={`${snapshot.deliveryRow.label}, ${snapshot.deliveryRow.detail}`}
                  accessibilityRole="button"
                  onPress={onOpenDeliveries}
                  style={({ pressed }) => [styles.expandedRow, styles.rowPressable, pressed && styles.pressed]}
                >
                  <Ionicons
                    color={
                      snapshot.deliveryRow.detailTone === 'orange'
                        ? AppColors.orange
                        : AppColors.textSecondary
                    }
                    name={snapshot.deliveryRow.icon}
                    size={20}
                  />
                  <View style={styles.expandedCopy}>
                    <Text style={styles.rowLabel}>{snapshot.deliveryRow.label}</Text>
                    <Text
                      maxFontSizeMultiplier={2}
                      style={[
                        styles.rowDetail,
                        snapshot.deliveryRow.detailTone === 'orange' && styles.rowDetailOrange,
                      ]}
                    >
                      {snapshot.deliveryRow.detail}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {(snapshot.lastVisitRow || snapshot.deliveryRow) && snapshot.notesRow ? (
                <View style={styles.rowDivider} />
              ) : null}

              {snapshot.notesRow ? (
                <View style={styles.expandedRow}>
                  <Ionicons color={AppColors.textSecondary} name={snapshot.notesRow.icon} size={20} />
                  <View style={styles.expandedCopy}>
                    <Text style={styles.rowLabel}>{snapshot.notesRow.label}</Text>
                    <Text maxFontSizeMultiplier={2} style={styles.rowDetail}>
                      {snapshot.notesRow.detail}
                    </Text>
                  </View>
                  {snapshot.notesRow.hasMore ? (
                    <Pressable
                      accessibilityLabel={`View all notes, ${snapshot.notesRow.noteCount} notes`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={onViewAllNotes}
                      style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.viewAllText}>
                        View all ({snapshot.notesRow.noteCount})
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    padding: 0,
  },
  headerPressable: {
    paddingBottom: 12,
    paddingTop: 12,
  },
  titleBar: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: HEADER_SIDE_WIDTH,
    paddingHorizontal: 8,
    position: 'relative',
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    left: HEADER_SIDE_WIDTH,
    position: 'absolute',
    right: HEADER_SIDE_WIDTH,
    textAlign: 'center',
  },
  chevronSlot: {
    alignItems: 'center',
    height: HEADER_SIDE_WIDTH,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 0,
    width: HEADER_SIDE_WIDTH,
  },
  collapsedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    rowGap: 8,
  },
  collapsedItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    minWidth: 0,
  },
  collapsedItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCollapsed: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 4,
    textAlign: 'center',
  },
  body: {
    borderTopColor: MileMateTokens.cardBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 0,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyExpanded: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 8,
    textAlign: 'center',
  },
  expandedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
  expandedCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowDivider: {
    backgroundColor: MileMateTokens.cardBorder,
    height: StyleSheet.hairlineWidth,
    marginLeft: 32,
  },
  rowPressable: {
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  rowLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  rowDetail: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowDetailOrange: {
    color: AppColors.orange,
  },
  rowSubDetail: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  viewAllButton: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
  },
  viewAllText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
