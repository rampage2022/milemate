import { StyleSheet, Text, View } from 'react-native';

import { AlertTriangle, type AlertPriority } from '@/components/redesign/primitives/alert-triangle';
import { MileMateTokens } from '@/components/redesign/tokens';

type StoreIdentityHeaderProps = {
  address: string;
  alertAccessibilityLabel?: string;
  alertPriority?: AlertPriority;
  name?: string;
  onAlertPress?: () => void;
  statusLine?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function StoreIdentityHeader({
  address,
  alertAccessibilityLabel = 'View store alert',
  alertPriority,
  name,
  onAlertPress,
  statusLine,
  trailing,
}: StoreIdentityHeaderProps) {
  const showAlert = Boolean(onAlertPress && alertPriority);

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {name?.trim() ? (
          <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>
            {name.trim()}
          </Text>
        ) : null}
        <Text numberOfLines={3} style={styles.address}>
          {address}
        </Text>
        {statusLine}
      </View>
      <View style={styles.trailing}>
        {showAlert ? (
          <AlertTriangle
            accessibilityLabel={alertAccessibilityLabel}
            onPress={onAlertPress!}
            priority={alertPriority}
          />
        ) : null}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: MileMateTokens.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  address: {
    color: MileMateTokens.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
