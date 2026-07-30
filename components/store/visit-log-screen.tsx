import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VisitLogLayout } from '@/components/store/visit-log-layout';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { formatStoreAddress } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import {
  applyVisitLogManagerName,
  buildVisitLogActionTiles,
  buildVisitLogPresentation,
  type VisitLogActionTile,
} from '@/utils/visit-log-presentation';

type VisitLogScreenProps = {
  isCompletionActive: boolean;
  isSaving: boolean;
  lastCompletedVisit: StoreVisit | null;
  latestNotReceivedChecksByOrderId: Record<string, StoreOrderDeliveryCheck | null>;
  noteText: string;
  onAddNote: () => void;
  onBack: () => void;
  onChangeNoteText: (value: string) => void;
  onCompleteVisit: () => void;
  onOpenDelivery: () => void;
  onOpenLastVisitSummary: () => void;
  onOpenMenu?: () => void;
  onOpenStoreInfo: () => void;
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  store: Store;
  visit: StoreVisit;
};

function HeaderIconButton({
  accessibilityLabel,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
    >
      <Ionicons color={AppColors.textPrimary} name={icon} size={22} />
    </Pressable>
  );
}

function DetailIcon({ color, name }: { color: string; name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.detailIconCircle, { backgroundColor: `${color}22` }]}>
      <Ionicons color={color} name={name} size={18} />
    </View>
  );
}

function ActionTile({
  onPress,
  tile,
}: {
  onPress: () => void;
  tile: VisitLogActionTile;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: `${tile.accentColor}22` }]}>
        <Ionicons color={tile.accentColor} name={tile.icon} size={20} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{tile.title}</Text>
        <Text style={[styles.actionStatus, { color: tile.accentColor }]}>
          {tile.statusLine}
        </Text>
        <Text style={styles.actionMeta}>{tile.metaLine}</Text>
      </View>
      <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function VisitLogScreen({
  isCompletionActive,
  isSaving,
  lastCompletedVisit,
  latestNotReceivedChecksByOrderId,
  noteText,
  onAddNote,
  onBack,
  onChangeNoteText,
  onCompleteVisit,
  onOpenDelivery,
  onOpenLastVisitSummary,
  onOpenMenu,
  onOpenStoreInfo,
  orderHistory,
  pendingOrders,
  store,
  visit,
}: VisitLogScreenProps) {
  const insets = useSafeAreaInsets();
  const [notesExpanded, setNotesExpanded] = useState(false);

  const presentation = applyVisitLogManagerName(
    buildVisitLogPresentation({
      visit,
      pendingOrders,
      orderHistory,
      lastCompletedVisit,
      latestNotReceivedChecksByOrderId,
    }),
    store.managerName,
  );
  const actionTiles = buildVisitLogActionTiles(presentation);
  const phone = store.managerPhone?.trim();

  function handleCallManager() {
    if (!phone) {
      return;
    }

    void Linking.openURL(`tel:${phone}`);
  }

  function handleActionPress(tileId: VisitLogActionTile['id']) {
    if (tileId === 'delivery') {
      onOpenDelivery();
      return;
    }

    if (tileId === 'notes') {
      setNotesExpanded(true);
      return;
    }

    if (tileId === 'store-info') {
      onOpenStoreInfo();
      return;
    }

    Alert.alert('Photos', 'Photo capture for visits is coming soon.');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <HeaderIconButton accessibilityLabel="Go back" icon="arrow-back" onPress={onBack} />
        <Text style={styles.navTitle}>Visit Log</Text>
        <HeaderIconButton
          accessibilityLabel="More options"
          icon="ellipsis-horizontal"
          onPress={onOpenMenu ?? onBack}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SurfaceCard style={styles.storeCard}>
          <View style={styles.storeHeaderRow}>
            <View style={styles.storeIconCircle}>
              <Ionicons color="#FFFFFF" name="storefront" size={22} />
            </View>
            <View style={styles.storeHeaderCopy}>
              <Text style={styles.storeName}>{getStoreDisplayName(store)}</Text>
              <Text style={styles.storeAddress}>{formatStoreAddress(store)}</Text>
              <View style={styles.checkedInRow}>
                <Ionicons color={AppColors.purple} name="checkmark-circle" size={16} />
                <Text style={styles.checkedInText}>{presentation.checkedInLabel}</Text>
              </View>
            </View>
            {presentation.hasDeliveryAlert ? (
              <Pressable
                accessibilityLabel="Delivery issue"
                accessibilityRole="button"
                onPress={onOpenDelivery}
                style={({ pressed }) => [styles.alertButton, pressed && styles.pressed]}
              >
                <Ionicons color={AppColors.orange} name="warning" size={22} />
                <Ionicons color={AppColors.textMuted} name="chevron-forward" size={16} />
              </Pressable>
            ) : (
              <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
            )}
          </View>

          <View style={styles.divider} />

          <DetailRow
            icon={
              <View style={styles.statusDotWrap}>
                <View style={styles.statusDot} />
              </View>
            }
            label="Store Status"
            trailing={
              presentation.storeStatusBadge ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {presentation.storeStatusBadge}
                  </Text>
                </View>
              ) : null
            }
            value={presentation.storeStatusLabel}
            valueColor={AppColors.green}
          />

          <DetailRow
            icon={<DetailIcon color={AppColors.blue} name="person" />}
            label="Manager"
            trailing={
              phone ? (
                <Pressable
                  accessibilityLabel="Call manager"
                  accessibilityRole="button"
                  onPress={handleCallManager}
                  style={({ pressed }) => [
                    styles.callButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons color="#FFFFFF" name="call" size={16} />
                </Pressable>
              ) : null
            }
            value={presentation.managerName}
          />

          <DetailRow
            icon={<DetailIcon color={AppColors.purple} name="time" />}
            label="Receiving Hours"
            value={presentation.receivingHoursLabel}
          />

          <Pressable
            accessibilityRole="button"
            onPress={onOpenDelivery}
            style={({ pressed }) => [styles.detailPressable, pressed && styles.pressed]}
          >
            <DetailRow
              icon={<DetailIcon color={AppColors.orange} name="bus" />}
              label="Delivery"
              showChevron
              value={presentation.deliveryDetail.label}
              valueColor={
                presentation.deliveryDetail.tone === 'orange'
                  ? AppColors.orange
                  : AppColors.textPrimary
              }
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onOpenLastVisitSummary}
            style={({ pressed }) => [styles.detailPressable, pressed && styles.pressed]}
          >
            <DetailRow
              icon={<DetailIcon color={AppColors.blue} name="calendar-outline" />}
              label="Last Visit"
              trailing={
                lastCompletedVisit ? (
                  <View style={styles.viewSummaryRow}>
                    <Text style={styles.viewSummaryText}>View Summary</Text>
                    <Ionicons color={AppColors.blue} name="chevron-forward" size={16} />
                  </View>
                ) : null
              }
              value={presentation.lastVisitDateLabel ?? 'No previous visits'}
              subValue={presentation.lastVisitRelativeLabel ?? undefined}
            />
          </Pressable>
        </SurfaceCard>

        <Text style={styles.sectionPrompt}>What would you like to do?</Text>

        <View style={styles.actionGrid}>
          {actionTiles.map((tile) => (
            <ActionTile
              key={tile.id}
              onPress={() => {
                handleActionPress(tile.id);
              }}
              tile={tile}
            />
          ))}
        </View>

        {notesExpanded ? (
          <SurfaceCard style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>Notes</Text>
              <Pressable
                accessibilityLabel="Close notes"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  setNotesExpanded(false);
                }}
              >
                <Ionicons color={AppColors.textMuted} name="close" size={22} />
              </Pressable>
            </View>
            {visit.notes.length === 0 ? (
              <Text style={styles.notesEmpty}>No notes yet.</Text>
            ) : (
              visit.notes.map((note) => (
                <Text key={note.id} style={styles.noteLine}>
                  {note.text}
                </Text>
              ))
            )}
            <View style={styles.noteInputRow}>
              <TextInput
                onChangeText={onChangeNoteText}
                placeholder="Add note..."
                placeholderTextColor={AppColors.textMuted}
                style={styles.noteInput}
                value={noteText}
              />
              <Pressable
                disabled={isSaving || !noteText.trim()}
                onPress={onAddNote}
                style={[
                  styles.addNoteButton,
                  (isSaving || !noteText.trim()) && styles.addNoteButtonDisabled,
                ]}
              >
                <Text style={styles.addNoteText}>Add</Text>
              </Pressable>
            </View>
          </SurfaceCard>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSaving || isCompletionActive}
          onPress={onCompleteVisit}
          style={({ pressed }) => [
            styles.finishButton,
            (isSaving || isCompletionActive) && styles.finishButtonDisabled,
            pressed && !isSaving && styles.pressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.finishIconCircle}>
                <Ionicons color={AppColors.blue} name="checkmark" size={20} />
              </View>
              <Text style={styles.finishLabel}>Finish Visit</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footerCaptionRow}>
          <Ionicons color={AppColors.textMuted} name="lock-closed-outline" size={14} />
          <Text style={styles.footerCaption}>All changes are saved automatically</Text>
        </View>
        <View style={styles.footerCaptionRow}>
          <Ionicons color={AppColors.blue} name="arrow-undo-outline" size={14} />
          <Text style={styles.footerUndo}>Undo available after finishing</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  showChevron,
  subValue,
  trailing,
  value,
  valueColor = AppColors.textPrimary,
}: {
  icon: React.ReactNode;
  label: string;
  showChevron?: boolean;
  subValue?: string;
  trailing?: React.ReactNode;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
        {subValue ? <Text style={styles.detailSubValue}>{subValue}</Text> : null}
      </View>
      {trailing}
      {showChevron ? (
        <Ionicons color={AppColors.textMuted} name="chevron-forward" size={16} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: MileMateTokens.background,
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: VisitLogLayout.contentPaddingH,
  },
  navTitle: {
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.headerTitleSize,
    fontWeight: '700',
  },
  headerIconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContent: {
    gap: VisitLogLayout.contentGap,
    paddingHorizontal: VisitLogLayout.contentPaddingH,
    paddingTop: 8,
  },
  storeCard: {
    gap: 4,
    padding: 16,
  },
  storeHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  storeIconCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  storeHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.storeNameSize,
    fontWeight: '800',
  },
  storeAddress: {
    color: AppColors.textSecondary,
    fontSize: VisitLogLayout.storeAddressSize,
    lineHeight: 20,
  },
  checkedInRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  checkedInText: {
    color: AppColors.purple,
    fontSize: 13,
    fontWeight: '600',
  },
  alertButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingTop: 4,
  },
  divider: {
    backgroundColor: MileMateTokens.cardBorder,
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  detailPressable: {
    borderRadius: 8,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: VisitLogLayout.detailRowMinHeight,
    paddingVertical: 6,
  },
  detailIconCircle: {
    alignItems: 'center',
    borderRadius: 18,
    height: VisitLogLayout.iconCircleSize,
    justifyContent: 'center',
    width: VisitLogLayout.iconCircleSize,
  },
  statusDotWrap: {
    alignItems: 'center',
    height: VisitLogLayout.iconCircleSize,
    justifyContent: 'center',
    width: VisitLogLayout.iconCircleSize,
  },
  statusDot: {
    backgroundColor: AppColors.green,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  detailLabel: {
    color: AppColors.textMuted,
    fontSize: VisitLogLayout.detailLabelSize,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: VisitLogLayout.detailValueSize,
    fontWeight: '700',
  },
  detailSubValue: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: MileMateTokens.backgroundElevated,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: AppColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  callButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 18,
    height: VisitLogLayout.iconCircleSizeSm,
    justifyContent: 'center',
    width: VisitLogLayout.iconCircleSizeSm,
  },
  viewSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  viewSummaryText: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionPrompt: {
    color: AppColors.textSecondary,
    fontSize: VisitLogLayout.sectionPromptSize,
    fontWeight: '600',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: VisitLogLayout.actionGridGap,
  },
  actionTile: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: MileMateTokens.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    minHeight: VisitLogLayout.actionTileMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionIconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  actionTitle: {
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.actionTitleSize,
    fontWeight: '700',
  },
  actionStatus: {
    fontSize: VisitLogLayout.actionMetaSize,
    fontWeight: '700',
  },
  actionMeta: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  notesCard: {
    gap: 10,
  },
  notesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notesTitle: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  notesEmpty: {
    color: AppColors.textMuted,
    fontSize: 14,
  },
  noteLine: {
    color: AppColors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: MileMateTokens.backgroundElevated,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addNoteButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  addNoteButtonDisabled: {
    opacity: 0.5,
  },
  addNoteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: MileMateTokens.radiusButton,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: VisitLogLayout.finishButtonHeight,
  },
  finishButtonDisabled: {
    opacity: 0.65,
  },
  finishIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  finishLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  footerCaptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  footerCaption: {
    color: AppColors.textMuted,
    fontSize: VisitLogLayout.footerCaptionSize,
    fontWeight: '500',
  },
  footerUndo: {
    color: AppColors.blue,
    fontSize: VisitLogLayout.footerCaptionSize,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
