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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VisitLogLayout } from '@/components/store/visit-log-layout';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildVisitLogPresentation,
  buildVisitLogSheetActions,
  type VisitLogSheetActionId,
} from '@/utils/visit-log-presentation';
import type { VisitLogRecentVisitRow } from '@/utils/visit-log-recent-visits';
import { VisitLogStoreActionsSheet } from '@/components/store/visit-log-store-actions-sheet';
import { VisitLogStoreSnapshotSection } from '@/components/store/visit-log-store-snapshot-section';
import { openStoreLocationPreviewInMaps } from '@/utils/store-navigation';
import { buildVisitLogStoreSnapshot } from '@/utils/visit-log-store-snapshot';
import { buildVisitLogManagerContactPresentation } from '@/utils/visit-log-manager-contact';
import {
  canOpenVisitLogStoreLocation,
  visitLogStoreLocationAccessibilityLabel,
} from '@/utils/visit-log-store-location-action';
import { useLiveMinuteOfDay } from '@/hooks/use-live-minute-of-day';
import { getStoreReceivingRestrictionForDisplay } from '@/utils/store-receiving-restriction';
import { buildVisitLogReceivingCallout } from '@/utils/visit-log-receiving-callout';
import {
  canUndoVisitLogCheckIn,
  resolveVisitLogPrimaryActionMode,
  shouldShowVisitLogCheckedInStatus,
} from '@/utils/visit-log-primary-actions';
import {
  phoneDigitsForDialLink,
} from '@/utils/format-phone-display';

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
  onCheckIn: () => void;
  onOpenSkipStop: () => void;
  onUndoCheckIn: () => void;
  onOpenDelivery: () => void;
  onOpenOrders: () => void;
  onOpenStoreInfo: () => void;
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  recentVisits: VisitLogRecentVisitRow[];
  recentVisitsTotalCount: number;
  store: Store;
  visit: StoreVisit;
};

function HeaderIconButton({
  accessibilityHint,
  accessibilityLabel,
  icon,
  onPress,
}: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
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
  onCheckIn,
  onOpenSkipStop,
  onUndoCheckIn,
  onOpenDelivery,
  onOpenOrders,
  onOpenStoreInfo,
  orderHistory,
  pendingOrders,
  recentVisits,
  recentVisitsTotalCount,
  store,
  visit,
}: VisitLogScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nowMinuteOfDay = useLiveMinuteOfDay();
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);

  const presentation = buildVisitLogPresentation({
    visit,
    store,
    pendingOrders,
    orderHistory,
    lastCompletedVisit,
    latestNotReceivedChecksByOrderId,
    nowMinuteOfDay,
  });
  const storeSnapshot = buildVisitLogStoreSnapshot({
    canonicalStoreId: store.id,
    lastCompletedVisit,
    latestNotReceivedChecksByOrderId,
    orderHistory,
    pendingOrders,
    visit,
  });
  const receivingCallout = buildVisitLogReceivingCallout({
    restriction: getStoreReceivingRestrictionForDisplay(store),
    nowMinuteOfDay,
  });
  const primaryActionMode = resolveVisitLogPrimaryActionMode(visit.status);
  const showCheckedIn = shouldShowVisitLogCheckedInStatus(visit.status);
  const showUndoCheckIn = canUndoVisitLogCheckIn(visit);
  const storeStatusValueColor =
    presentation.storeOpenStatus.valueColor === 'open'
      ? AppColors.green
      : presentation.storeOpenStatus.valueColor === 'closed'
        ? AppColors.orange
        : AppColors.textMuted;
  const storeStatusDotStyle =
    presentation.storeOpenStatus.kind === 'open'
      ? styles.statusDotOpen
      : presentation.storeOpenStatus.kind === 'closed'
        ? styles.statusDotClosed
        : styles.statusDotUnknown;
  const storeStatusBadgeStyle =
    presentation.storeOpenStatus.kind === 'open'
      ? styles.statusBadgeOpen
      : presentation.storeOpenStatus.kind === 'closed'
        ? styles.statusBadgeClosed
        : styles.statusBadgeUnknown;
  const receivingCalloutTextStyle = receivingCallout.visible
    ? receivingCallout.emphasis === 'available'
      ? styles.receivingCalloutTextAvailable
      : receivingCallout.emphasis === 'passed'
        ? styles.receivingCalloutTextPassed
        : styles.receivingCalloutTextNeutral
    : null;
  const managerContact = buildVisitLogManagerContactPresentation(store);
  const showManagerContactRow = managerContact.showRow;
  const managerPhone = store.managerPhone?.trim() || undefined;

  async function handleOpenStoreLocation() {
    const opened = await openStoreLocationPreviewInMaps(store);

    if (!opened) {
      Alert.alert('Unable to open Maps', 'No maps app could open this store location.');
    }
  }

  function handleCallManager() {
    if (!managerPhone) {
      return;
    }

    void Linking.openURL(`tel:${phoneDigitsForDialLink(managerPhone)}`);
  }

  function handleMessageManager() {
    if (!managerPhone) {
      return;
    }

    void Linking.openURL(`sms:${phoneDigitsForDialLink(managerPhone)}`);
  }

  const storeAddressLine = presentation.storeIdentity.addressLine;
  const storeLocationActionable = canOpenVisitLogStoreLocation(store);

  const sheetActions = buildVisitLogSheetActions(presentation);

  function handleSheetAction(actionId: VisitLogSheetActionId) {
    setActionsSheetVisible(false);

    if (actionId === 'delivery') {
      onOpenDelivery();
      return;
    }

    if (actionId === 'notes') {
      setNotesExpanded(true);
      return;
    }

    if (actionId === 'orders') {
      onOpenOrders();
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
          accessibilityHint="Opens delivery, notes, photos, and orders"
          accessibilityLabel="Store actions"
          icon="ellipsis-horizontal"
          onPress={() => {
            setActionsSheetVisible(true);
          }}
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
            <View style={styles.storeIdentityColumn}>
              <Text maxFontSizeMultiplier={2} numberOfLines={2} style={styles.storeName}>
                {presentation.storeIdentity.title}
              </Text>
              {storeLocationActionable ? (
                <Pressable
                  accessibilityLabel={visitLogStoreLocationAccessibilityLabel(storeAddressLine)}
                  accessibilityRole="button"
                  hitSlop={4}
                  onPress={() => {
                    void handleOpenStoreLocation();
                  }}
                  style={({ pressed }) => [styles.storeAddressRow, pressed && styles.pressed]}
                >
                  <Text
                    maxFontSizeMultiplier={2}
                    numberOfLines={2}
                    style={[styles.storeAddress, styles.storeAddressActionable]}
                  >
                    {storeAddressLine}
                  </Text>
                  <Ionicons color={AppColors.blue} name="location-outline" size={16} />
                </Pressable>
              ) : (
                <Text maxFontSizeMultiplier={2} numberOfLines={2} style={styles.storeAddress}>
                  {storeAddressLine}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityLabel="Edit store information"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenStoreInfo}
              style={({ pressed }) => [styles.storeEditButton, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.textSecondary} name="create-outline" size={20} />
            </Pressable>
          </View>

          {presentation.hasDeliveryAlert && presentation.deliveryActionSecondary ? (
            <Pressable
              accessibilityLabel={presentation.deliveryActionSecondary}
              accessibilityRole="button"
              onPress={onOpenDelivery}
              style={({ pressed }) => [styles.storeAlertRow, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.orange} name="warning" size={18} />
              <Text maxFontSizeMultiplier={2} numberOfLines={2} style={styles.storeAlertText}>
                {presentation.deliveryActionSecondary}
              </Text>
            </Pressable>
          ) : null}

          {receivingCallout.visible ? (
            <View
              accessibilityLabel={receivingCallout.accessibilityLabel}
              accessibilityRole="text"
              style={styles.storeAlertRow}
            >
              <Ionicons
                color={
                  receivingCallout.emphasis === 'passed'
                    ? AppColors.orange
                    : receivingCallout.emphasis === 'available'
                      ? AppColors.green
                      : AppColors.blue
                }
                name={
                  receivingCallout.emphasis === 'available'
                    ? 'time-outline'
                    : 'warning-outline'
                }
                size={18}
              />
              <Text
                maxFontSizeMultiplier={2}
                numberOfLines={2}
                style={[
                  styles.storeAlertText,
                  receivingCalloutTextStyle,
                ]}
              >
                {receivingCallout.label}
              </Text>
            </View>
          ) : null}

          {showCheckedIn && presentation.checkedInLabel ? (
            <View style={styles.checkedInBlock}>
              <View style={styles.checkedInStatusWrap}>
                <Ionicons color={AppColors.green} name="checkmark-circle" size={16} />
                <Text maxFontSizeMultiplier={2} numberOfLines={1} style={styles.checkedInText}>
                  {presentation.checkedInLabel}
                </Text>
              </View>
              {showUndoCheckIn ? (
                <Pressable
                  accessibilityLabel="Undo Check-In"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onUndoCheckIn}
                  style={({ pressed }) => [styles.undoCheckInButton, pressed && styles.pressed]}
                >
                  <Text style={styles.undoCheckInText}>Undo</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {presentation.showOperationalDivider ? <View style={styles.divider} /> : null}

          {presentation.showStoreStatusRow ? (
            <DetailRow
              icon={
                <View style={styles.statusDotWrap}>
                  <View
                    style={[
                      styles.statusDot,
                      storeStatusDotStyle,
                    ]}
                  />
                </View>
              }
              label="Store Status"
              trailing={
                presentation.storeStatusBadge ? (
                  <View style={[styles.statusBadge, storeStatusBadgeStyle]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        presentation.storeOpenStatus.kind === 'open' && styles.statusBadgeTextOpen,
                        presentation.storeOpenStatus.kind === 'closed' && styles.statusBadgeTextClosed,
                      ]}
                    >
                      {presentation.storeStatusBadge}
                    </Text>
                  </View>
                ) : null
              }
              value={presentation.storeStatusLabel}
              valueColor={storeStatusValueColor}
            />
          ) : null}

          {showManagerContactRow ? (
            <View style={styles.managerRow}>
              <DetailIcon color={AppColors.blue} name="person" />
              <View style={styles.managerCopy}>
                <Text style={styles.detailLabel}>Manager</Text>
                <Text maxFontSizeMultiplier={2} numberOfLines={2} style={styles.managerNameText}>
                  {managerContact.displayName}
                </Text>
              </View>
              <View style={styles.managerActions}>
                {managerContact.showMessage ? (
                  <Pressable
                    accessibilityLabel={`Message manager ${managerContact.a11yContactName}`}
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={handleMessageManager}
                    style={({ pressed }) => [styles.managerIconButton, pressed && styles.pressed]}
                  >
                    <Ionicons color={AppColors.blue} name="chatbubble-outline" size={20} />
                  </Pressable>
                ) : null}
                {managerContact.showCall ? (
                  <Pressable
                    accessibilityLabel={`Call manager ${managerContact.a11yContactName}`}
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={handleCallManager}
                    style={({ pressed }) => [styles.managerIconButton, pressed && styles.pressed]}
                  >
                    <Ionicons color={AppColors.blue} name="call-outline" size={20} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </SurfaceCard>

        <VisitLogStoreSnapshotSection
          onOpenDeliveries={onOpenDelivery}
          onViewAllNotes={() => {
            setNotesExpanded(true);
          }}
          snapshot={storeSnapshot}
        />

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

        <View style={styles.actionStack}>
          {primaryActionMode === 'check_in_and_skip' ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onCheckIn}
              style={({ pressed }) => [
                styles.checkInButton,
                styles.stackButton,
                isSaving && styles.checkInButtonDisabled,
                pressed && !isSaving && styles.pressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.checkInIconCircle}>
                    <Ionicons color={AppColors.green} name="log-in-outline" size={20} />
                  </View>
                  <Text style={styles.checkInLabel}>Check In</Text>
                </>
              )}
            </Pressable>
          ) : null}

          {primaryActionMode === 'finish_and_skip' ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving || isCompletionActive}
              onPress={onCompleteVisit}
              style={({ pressed }) => [
                styles.finishButton,
                styles.stackButton,
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
          ) : null}

          {primaryActionMode === 'check_in_and_skip' ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onOpenSkipStop}
              style={({ pressed }) => [styles.skipStopButton, styles.stackButton, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.orange} name="play-skip-forward-outline" size={20} />
              <Text style={styles.skipStopButtonLabel}>Skip Stop</Text>
            </Pressable>
          ) : null}

          {primaryActionMode === 'finish_and_skip' ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving || isCompletionActive}
              onPress={onOpenSkipStop}
              style={({ pressed }) => [
                styles.skipStopButton,
                styles.stackButton,
                (isSaving || isCompletionActive) && styles.finishButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={AppColors.orange} name="play-skip-forward-outline" size={20} />
              <Text style={styles.skipStopButtonLabel}>Skip Stop</Text>
            </Pressable>
          ) : null}
        </View>

        <VisitLogStoreActionsSheet
          actions={sheetActions}
          onClose={() => {
            setActionsSheetVisible(false);
          }}
          onSelectAction={handleSheetAction}
          visible={actionsSheetVisible}
        />

        <View style={styles.footerCaptionRow}>
          <Ionicons color={AppColors.textMuted} name="lock-closed-outline" size={14} />
          <Text style={styles.footerCaption}>All changes are saved automatically</Text>
        </View>

        <View style={styles.recentVisitsSection}>
          <Text style={styles.recentVisitsTitle}>Recent Visits</Text>
          {recentVisits.length === 0 ? (
            <View style={styles.recentVisitsEmptyState}>
              <Ionicons color={AppColors.textMuted} name="time-outline" size={20} />
              <Text maxFontSizeMultiplier={2} style={styles.recentVisitsEmptyTitle}>
                No previous visits
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.recentVisitsEmptySubtitle}>
                Completed visits will appear here.
              </Text>
            </View>
          ) : (
            <>
              {recentVisits.map((row) => (
                <View key={row.id} style={styles.recentVisitRow}>
                  <Text
                    style={[
                      styles.recentVisitPrimary,
                      row.status === 'completed'
                        ? styles.recentVisitPrimaryCompleted
                        : styles.recentVisitPrimarySkipped,
                    ]}
                  >
                    {row.dateStatusLine}
                  </Text>
                  {row.detailLine ? (
                    <Text style={styles.recentVisitDetail}>{row.detailLine}</Text>
                  ) : null}
                </View>
              ))}
              {recentVisitsTotalCount > recentVisits.length ? (
                <Pressable
                  accessibilityLabel="View all visits"
                  accessibilityRole="button"
                  onPress={() => {
                    router.push('/visit-history' as const);
                  }}
                  style={({ pressed }) => [styles.viewAllVisitsButton, pressed && styles.pressed]}
                >
                  <Text style={styles.viewAllVisitsText}>View All Visits</Text>
                </Pressable>
              ) : null}
            </>
          )}
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
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    width: 44,
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
  storeIdentityColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  storeEditButton: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  storeAlertRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    minHeight: 28,
    width: '100%',
  },
  storeAlertText: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    minWidth: 0,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.storeNameSize,
    fontWeight: '800',
    minWidth: 0,
  },
  storeAddress: {
    color: AppColors.textSecondary,
    flex: 1,
    fontSize: VisitLogLayout.storeAddressSize,
    lineHeight: 20,
    minWidth: 0,
  },
  storeAddressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingVertical: 4,
  },
  storeAddressActionable: {
    color: AppColors.textSecondary,
  },
  summaryMetadata: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  receivingCalloutTextNeutral: {
    color: AppColors.blue,
  },
  receivingCalloutTextAvailable: {
    color: AppColors.green,
  },
  receivingCalloutTextPassed: {
    color: AppColors.orange,
  },
  checkedInBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  checkedInStatusWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  checkedInText: {
    color: AppColors.green,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  undoCheckInButton: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
  },
  undoCheckInText: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  statusDotOpen: {
    backgroundColor: AppColors.green,
  },
  statusDotClosed: {
    backgroundColor: AppColors.orange,
  },
  statusDotUnknown: {
    backgroundColor: AppColors.textMuted,
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
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.detailValueSize,
    fontWeight: '700',
  },
  managerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: VisitLogLayout.detailRowMinHeight,
    paddingVertical: 6,
  },
  managerCopy: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  managerNameText: {
    color: AppColors.textPrimary,
    fontSize: VisitLogLayout.detailValueSize,
    fontWeight: '700',
    minWidth: 0,
  },
  managerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
  },
  managerIconButton: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.blueSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    width: 44,
  },
  detailSubValue: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeOpen: {
    backgroundColor: MileMateTokens.greenSoft,
  },
  statusBadgeClosed: {
    backgroundColor: MileMateTokens.orangeSoft,
  },
  statusBadgeUnknown: {
    backgroundColor: MileMateTokens.backgroundElevated,
  },
  statusBadgeText: {
    color: AppColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeTextOpen: {
    color: AppColors.green,
  },
  statusBadgeTextClosed: {
    color: AppColors.orange,
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
  actionStack: {
    gap: 12,
    width: '100%',
  },
  stackButton: {
    alignSelf: 'stretch',
    width: '100%',
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
  checkInButton: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: MileMateTokens.radiusButton,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: VisitLogLayout.finishButtonHeight,
  },
  checkInButtonDisabled: {
    opacity: 0.65,
  },
  checkInIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkInLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: MileMateTokens.radiusButton,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
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
  skipStopButton: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: 'rgba(255,149,0,0.35)',
    borderRadius: MileMateTokens.radiusButton,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: VisitLogLayout.finishButtonHeight,
  },
  skipStopButtonLabel: {
    color: AppColors.orange,
    fontSize: 16,
    fontWeight: '700',
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
  recentVisitsSection: {
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  recentVisitsTitle: {
    alignSelf: 'stretch',
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'left',
  },
  recentVisitsEmptyState: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    width: '100%',
  },
  recentVisitsEmptyTitle: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentVisitsEmptySubtitle: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  recentVisitRow: {
    gap: 2,
  },
  recentVisitPrimary: {
    fontSize: 15,
    fontWeight: '700',
  },
  recentVisitPrimaryCompleted: {
    color: AppColors.green,
  },
  recentVisitPrimarySkipped: {
    color: AppColors.orange,
  },
  recentVisitDetail: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  viewAllVisitsButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  viewAllVisitsText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
