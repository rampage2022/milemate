import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { workdayDockTotalHeight } from '@/components/navigation/workday-dock';
import { AppColors } from '@/components/shared/app-theme';
import { VisitHistoryCalendarSheet } from '@/components/visit-history/visit-history-calendar-sheet';
import {
  VisitHistoryCalendarButton,
  VisitHistoryFilterBar,
} from '@/components/visit-history/visit-history-filter-bar';
import { VisitHistoryRow } from '@/components/visit-history/visit-history-row';
import { useVisitHistory } from '@/hooks/use-visit-history';
import {
  buildDefaultSectionExpansion,
  buildVisitHistorySections,
  dateKeyFromDate,
  formatVisitHistoryDateKey,
  parseDateKeyForDisplay,
  type VisitHistoryFilter,
  type VisitHistoryItem,
} from '@/utils/visit-history';
import { getTodayDateString } from '@/utils/today-date';

export default function VisitHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoading, items } = useVisitHistory();
  const todayKey = getTodayDateString();

  const [filter, setFilter] = useState<VisitHistoryFilter>('all');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedByDate, setExpandedByDate] = useState<Record<string, boolean>>({});

  const sections = useMemo(
    () =>
      buildVisitHistorySections({
        filter,
        items,
        selectedDateKey,
        todayKey,
      }),
    [filter, items, selectedDateKey, todayKey],
  );

  const sectionExpansion = useMemo(() => {
    const defaults = buildDefaultSectionExpansion(sections, todayKey);
    return { ...defaults, ...expandedByDate };
  }, [expandedByDate, sections, todayKey]);

  const toggleSection = useCallback((dateKey: string) => {
    setExpandedByDate((current) => ({
      ...current,
      [dateKey]: !(current[dateKey] ?? dateKey === todayKey),
    }));
  }, [todayKey]);

  const handleOpenStore = useCallback(
    (item: VisitHistoryItem) => {
      router.push(`/store/${item.storeId}`);
    },
    [router],
  );

  const bottomPadding = workdayDockTotalHeight(insets.bottom) + 16;

  const selectedDateLabel = selectedDateKey
    ? formatVisitHistoryDateKey(selectedDateKey, todayKey)
    : null;

  const emptyMessage = useMemo(() => {
    if (items.length === 0) {
      return {
        title: 'No visit history yet',
        body: 'Completed and skipped stops will appear here as you work through your routes.',
      };
    }

    if (selectedDateKey) {
      return {
        title: 'No visits found for this date.',
        body: null,
      };
    }

    if (filter !== 'all') {
      return {
        title: 'No visits match this filter.',
        body: null,
      };
    }

    const hasTodayResolved = items.some((item) => item.scheduledDate === todayKey);

    if (!hasTodayResolved) {
      return {
        title: 'No completed or skipped visits today.',
        body: null,
      };
    }

    return null;
  }, [filter, items, selectedDateKey, todayKey]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Visit History
          </Text>
          <Text style={styles.subtitle}>Resolved stops only — route looks forward.</Text>
        </View>
        <VisitHistoryCalendarButton
          onPress={() => {
            setShowCalendar(true);
          }}
          selectedDateLabel={selectedDateLabel}
        />
      </View>

      <View style={styles.filterWrap}>
        <VisitHistoryFilterBar filter={filter} onChange={setFilter} />
        {selectedDateKey ? (
          <Pressable
            accessibilityLabel="Clear selected date and show recent history"
            accessibilityRole="button"
            onPress={() => {
              setSelectedDateKey(null);
            }}
            style={styles.clearDateButton}
          >
            <Text style={styles.clearDateLabel}>Show recent</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={AppColors.blue} size="large" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{emptyMessage?.title ?? 'No visits to show'}</Text>
          {emptyMessage?.body ? <Text style={styles.emptyBody}>{emptyMessage.body}</Text> : null}
        </View>
      ) : (
        <SectionList
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) =>
            sectionExpansion[section.dateKey] ? (
              <VisitHistoryRow item={item} onPress={handleOpenStore} />
            ) : null
          }
          renderSectionHeader={({ section }) => {
            const expanded = sectionExpansion[section.dateKey] ?? false;

            return (
              <Pressable
                accessibilityLabel={`${section.title}, ${section.visitCount} visits, ${expanded ? 'expanded' : 'collapsed'}`}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => {
                  toggleSection(section.dateKey);
                }}
                style={styles.sectionHeader}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionMeta}>
                  <Text style={styles.sectionCount}>
                    {section.visitCount} visit{section.visitCount === 1 ? '' : 's'}
                  </Text>
                  <Ionicons
                    color={AppColors.textMuted}
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                  />
                </View>
              </Pressable>
            );
          }}
          sections={sections.map((section) => ({
            ...section,
            data: sectionExpansion[section.dateKey] ? section.items : [],
          }))}
          stickySectionHeadersEnabled={false}
        />
      )}

      <VisitHistoryCalendarSheet
        initialDate={
          selectedDateKey ? parseDateKeyForDisplay(selectedDateKey) : new Date()
        }
        onClose={() => {
          setShowCalendar(false);
        }}
        onSelectDate={(dateKey) => {
          setSelectedDateKey(dateKey);
        }}
        visible={showCalendar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  filterWrap: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  clearDateLabel: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  listContent: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
  },
  sectionTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sectionCount: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
