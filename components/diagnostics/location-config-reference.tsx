import { StyleSheet, Text, View } from 'react-native';

import type { LocationWatchSetting } from '@/types/location-diagnostic';

type LocationConfigReferenceProps = {
  settings: LocationWatchSetting[];
};

export function LocationConfigReference({
  settings,
}: LocationConfigReferenceProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Watch configuration reference</Text>
      {settings.map((setting) => (
        <View key={setting.key} style={styles.settingBlock}>
          <Text style={styles.settingTitle}>
            {setting.label}: {setting.value}
          </Text>
          <Text style={styles.settingExplanation}>{setting.explanation}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  settingExplanation: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
  },
});
