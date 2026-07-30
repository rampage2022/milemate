import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteEndpointPickerSheet } from '@/components/today/route-endpoint-picker-sheet';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { RouteEndpoint } from '@/types/route-endpoint';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { indexSavedLocationsById } from '@/utils/my-locations';
import { resolveEndpointPickerLabel } from '@/utils/route-endpoints';

type TodayRouteSelectionSectionProps = {
  myLocations: SavedLocation[];
  onReturnToStartChange: (enabled: boolean) => void;
  onSaveToMyLocations: (input: {
    label: string;
    address: string;
  }) => Promise<SavedLocation>;
  onUpdateEnd: (endpoint: RouteEndpoint | null) => void;
  onUpdateStart: (endpoint: RouteEndpoint | null) => void;
  selection: TodayRouteSelection;
};

type PickerRole = 'start' | 'end' | null;

export function TodayRouteSelectionSection({
  myLocations,
  onReturnToStartChange,
  onSaveToMyLocations,
  onUpdateEnd,
  onUpdateStart,
  selection,
}: TodayRouteSelectionSectionProps) {
  const [pickerRole, setPickerRole] = useState<PickerRole>(null);
  const locationsById = indexSavedLocationsById(myLocations);

  const startLabel = resolveEndpointPickerLabel(
    selection.startEndpoint,
    locationsById,
    'Choose start location',
  );
  const endLabel = resolveEndpointPickerLabel(
    selection.endEndpoint,
    locationsById,
    'Choose end location',
  );

  function closePicker() {
    setPickerRole(null);
  }

  function handleSelect(endpoint: RouteEndpoint) {
    if (pickerRole === 'start') {
      onUpdateStart(endpoint);
    } else if (pickerRole === 'end') {
      onUpdateEnd(endpoint);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`Start location. ${startLabel}`}
        accessibilityRole="button"
        onPress={() => {
          setPickerRole('start');
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={styles.rowLabel}>Start</Text>
        <Text
          style={[
            styles.rowValue,
            startLabel === 'Choose start location' && styles.rowValuePlaceholder,
          ]}
        >
          {startLabel}
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel={`Return to start location. ${selection.returnToStart ? 'On' : 'Off'}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: selection.returnToStart }}
        onPress={() => {
          onReturnToStartChange(!selection.returnToStart);
        }}
        style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
      >
        <Text style={styles.toggleLabel}>Return to start location</Text>
        <Text style={styles.toggleValue}>{selection.returnToStart ? 'On' : 'Off'}</Text>
      </Pressable>

      {!selection.returnToStart ? (
        <Pressable
          accessibilityLabel={`End location. ${endLabel}`}
          accessibilityRole="button"
          onPress={() => {
            setPickerRole('end');
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.rowLabel}>End</Text>
          <Text
            style={[
              styles.rowValue,
              endLabel === 'Choose end location' && styles.rowValuePlaceholder,
            ]}
          >
            {endLabel}
          </Text>
        </Pressable>
      ) : null}

      <RouteEndpointPickerSheet
        currentEndpoint={
          pickerRole === 'start' ? selection.startEndpoint : selection.endEndpoint
        }
        myLocations={myLocations}
        onClose={closePicker}
        onSaveToMyLocations={onSaveToMyLocations}
        onSelect={handleSelect}
        title={pickerRole === 'end' ? 'Choose End Location' : 'Choose Start Location'}
        visible={pickerRole !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  rowLabel: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    textAlign: 'right',
  },
  rowValuePlaceholder: {
    color: AppColors.blue,
    fontWeight: '600',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 2,
  },
  toggleLabel: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingRight: 12,
  },
  toggleValue: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
