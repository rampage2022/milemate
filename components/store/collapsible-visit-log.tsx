import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { StoreOverviewLayout } from '@/components/store/store-overview-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitDurationLabel } from '@/utils/visit-duration';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CollapsibleVisitLogProps = {
  isSaving: boolean;
  noteText: string;
  onAddNote: () => void;
  onChangeNoteText: (value: string) => void;
  visit: StoreVisit | null;
};

function visitLogSummary(visit: StoreVisit | null): string {
  const noteCount = visit?.notes.length ?? 0;
  const duration = visit ? formatVisitDurationLabel(visit) : null;
  const parts: string[] = [];

  if (duration) {
    parts.push(`${duration} visit`);
  }

  if (noteCount === 0) {
    parts.push('No notes yet');
  } else {
    parts.push(noteCount === 1 ? '1 note' : `${noteCount} notes`);
  }

  return parts.join(' · ');
}

export function CollapsibleVisitLog({
  isSaving,
  noteText,
  onAddNote,
  onChangeNoteText,
  visit,
}: CollapsibleVisitLogProps) {
  const noteCount = visit?.notes.length ?? 0;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (noteText.trim().length > 0) {
      setIsExpanded(true);
    }
  }, [noteText]);

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((current) => !current);
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={
          isExpanded
            ? 'Collapse visit log'
            : `Expand visit log, ${visitLogSummary(visit)}`
        }
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Visit Log</Text>
          {!isExpanded ? (
            <Text style={styles.summary}>{visitLogSummary(visit)}</Text>
          ) : null}
        </View>
        <Ionicons
          color={AppColors.textMuted}
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
        />
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          {visit?.notes.length ? (
            visit.notes.map((note) => (
              <Text key={note.id} style={styles.noteLine}>
                · {note.text}
              </Text>
            ))
          ) : (
            <Text style={styles.noteEmpty}>No notes yet.</Text>
          )}

          {visit ? (
            <View style={styles.noteInputRow}>
              <TextInput
                onChangeText={onChangeNoteText}
                placeholder="Add note..."
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
          ) : (
            <Text style={styles.noteEmpty}>Notes are available when a visit is scheduled.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: StoreOverviewLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: StoreOverviewLayout.cardPaddingH,
    paddingVertical: 12,
  },
  headerPressed: {
    opacity: 0.88,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  summary: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingBottom: StoreOverviewLayout.cardPaddingV,
    paddingHorizontal: StoreOverviewLayout.cardPaddingH,
    paddingTop: 12,
  },
  noteLine: {
    color: AppColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  noteEmpty: {
    color: AppColors.textMuted,
    fontSize: 14,
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
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
});
