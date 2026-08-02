import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import { AppColors } from '@/components/shared/app-theme';
import type { StoresMapPreviewModel } from '@/utils/stores-map-model';
import { getStoreDisplayName } from '@/utils/get-store-display-name';

type StoresMapPreviewCardProps = {
  embedded?: boolean;
  onOpenStore: () => void;
  preview: StoresMapPreviewModel;
};

export function StoresMapPreviewCard({
  embedded = false,
  onOpenStore,
  preview,
}: StoresMapPreviewCardProps) {
  const storeName = getStoreDisplayName(preview.store);

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text allowFontScaling numberOfLines={2} style={styles.title}>
            {storeName}
          </Text>
          {preview.visit ? <VisitStatusBadge status={preview.visit.status} /> : null}
        </View>
        {preview.storeNumberLabel ? (
          <Text allowFontScaling style={styles.storeNumber}>
            Store {preview.storeNumberLabel}
          </Text>
        ) : null}
        <Text allowFontScaling numberOfLines={2} style={styles.address}>
          {preview.address}
        </Text>
        {preview.contextLabels.length > 0 ? (
          <View style={styles.contextRow}>
            {preview.contextLabels.map((label) => (
              <Text allowFontScaling key={`${label.kind}-${label.text}`} style={styles.contextChip}>
                {label.text}
              </Text>
            ))}
          </View>
        ) : null}
        <Text allowFontScaling style={styles.primaryWorkday}>
          {preview.membershipRows.length > 0
            ? `Primary workday: ${preview.primaryWorkdayLabel}`
            : 'Unassigned'}
        </Text>
        {preview.membershipRows.length > 1 ? (
          <View style={styles.memberships}>
            <Text allowFontScaling style={styles.membershipsHeading}>
              Saved workdays
            </Text>
            {preview.membershipRows.map((row) => (
              <Text allowFontScaling key={row.templateId} style={styles.membershipLine}>
                {row.isPrimary ? '• ' : '  '}
                {row.name}
                {row.isPrimary ? ' (primary)' : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={`Open ${storeName}`}
        accessibilityRole="button"
        onPress={onOpenStore}
        style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
      >
        <Text style={styles.openButtonText}>Open Store</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 8,
    gap: 10,
    left: 8,
    padding: 12,
    position: 'absolute',
    right: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardEmbedded: {
    bottom: undefined,
    left: undefined,
    position: 'relative',
    right: undefined,
    shadowOpacity: 0,
  },
  copy: {
    gap: 4,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  title: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  storeNumber: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  contextChip: {
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryWorkday: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  memberships: {
    gap: 2,
    marginTop: 4,
  },
  membershipsHeading: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  membershipLine: {
    color: AppColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  openButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: AppColors.blue,
    borderRadius: 10,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
