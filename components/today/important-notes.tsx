import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { truncateBriefingNote, type BriefingNote } from '@/utils/pre-day-briefing';

type ImportantNotesProps = {
  notes: BriefingNote[];
};

export function ImportantNotes({ notes }: ImportantNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Important Notes</Text>
      <View accessibilityRole="list" style={styles.list}>
        {notes.map((note) => {
          const displayText = truncateBriefingNote(note.text);

          return (
            <View
              accessibilityLabel={`${note.storeName}. ${displayText}`}
              accessibilityRole="text"
              key={`${note.storeId}-${note.routeOrder}-${note.text}`}
              style={styles.item}
            >
              <Text style={styles.storeName}>{note.storeName}</Text>
              <Text style={styles.noteText}>{displayText}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  list: {
    gap: 14,
  },
  item: {
    gap: 2,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  noteText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
});
