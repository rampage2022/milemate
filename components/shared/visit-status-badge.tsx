import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import {
  buildStatusPresentation,
  getStatusLabel,
} from '@/utils/milemate-status';
import type { StoreVisitStatus } from '@/types/store-visit';
import { VisitStatusLabels } from '@/components/shared/app-theme';

type VisitStatusBadgeProps = {
  status: StoreVisitStatus;
};

function presentationForVisitStatus(status: StoreVisitStatus) {
  if (status === 'completed') {
    return buildStatusPresentation({ tone: 'completed', label: VisitStatusLabels.completed });
  }

  if (status === 'skipped') {
    return buildStatusPresentation({ tone: 'skipped', label: VisitStatusLabels.skipped });
  }

  if (status === 'pending') {
    return buildStatusPresentation({ tone: 'pending', label: VisitStatusLabels.pending });
  }

  if (status === 'checked_in') {
    return buildStatusPresentation({ tone: 'active', label: VisitStatusLabels.checked_in });
  }

  return buildStatusPresentation({ tone: 'active', label: VisitStatusLabels.current });
}

export function VisitStatusBadge({ status }: VisitStatusBadgeProps) {
  const presentation = presentationForVisitStatus(status);

  return (
    <View
      accessibilityLabel={`${presentation.label}, ${getStatusLabel(presentation.tone)} status`}
      style={[styles.badge, { backgroundColor: presentation.backgroundColor }]}
    >
      <Ionicons
        accessibilityElementsHidden
        color={presentation.color}
        name={presentation.icon}
        size={12}
      />
      <Text style={[styles.label, { color: presentation.color }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
