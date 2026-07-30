import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { MileMateTokens } from '@/components/redesign/tokens';

type SectionCardProps = {
  accentColor: string;
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  onHeaderPress?: () => void;
  subtitle?: string;
  title: string;
};

export function SectionCard({
  accentColor,
  children,
  icon,
  onHeaderPress,
  subtitle,
  title,
}: SectionCardProps) {
  const header = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Ionicons color={accentColor} name={icon} size={20} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onHeaderPress ? (
        <Ionicons color={MileMateTokens.textMuted} name="chevron-forward" size={20} />
      ) : null}
    </>
  );

  return (
    <SurfaceCard padded={false} style={styles.card}>
      {onHeaderPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onHeaderPress}
          style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        >
          {header}
        </Pressable>
      ) : (
        <View style={styles.header}>{header}</View>
      )}
      <View style={styles.body}>{children}</View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: MileMateTokens.cardBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: MileMateTokens.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: MileMateTokens.textSecondary,
    fontSize: 14,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
