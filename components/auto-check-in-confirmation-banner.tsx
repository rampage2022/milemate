import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/components/shared/app-theme';
import { formatCheckInTimeLabel } from '@/utils/store-visit-presentation';
import {
  AUTO_CHECK_IN_BANNER_VISIBLE_MS,
  logAutoCheckInConfirmationDev,
} from '@/utils/auto-check-in-confirmation';

export type AutoCheckInConfirmationToast = {
  visitId: string;
  storeName: string;
  stopNumber: number;
  checkedInAt: number;
};

type AutoCheckInConfirmationBannerProps = {
  toast: AutoCheckInConfirmationToast | null;
  visible: boolean;
  onDismissed: () => void;
};

export function AutoCheckInConfirmationBanner({
  onDismissed,
  toast,
  visible,
}: AutoCheckInConfirmationBannerProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !toast) {
      translateY.setValue(-120);
      opacity.setValue(0);
      return;
    }

    logAutoCheckInConfirmationDev('banner shown', {
      visitId: toast.visitId,
      checkedInAt: toast.checkedInAt,
    });

    Animated.parallel([
      Animated.timing(translateY, {
        duration: 280,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        duration: 280,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    dismissTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          duration: 220,
          toValue: -120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          logAutoCheckInConfirmationDev('banner dismissed', toast.visitId);
          onDismissed();
        }
      });
    }, AUTO_CHECK_IN_BANNER_VISIBLE_MS);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [onDismissed, opacity, toast, translateY, visible]);

  if (!toast || !visible) {
    return null;
  }

  const checkInTime =
    formatCheckInTimeLabel(toast.checkedInAt) ?? '';

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        style={[
          styles.banner,
          isDark ? styles.bannerDark : styles.bannerLight,
          {
            marginTop: insets.top + 8,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text
          style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}
        >
          ✓ Checked In
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.storeName,
            isDark ? styles.storeNameDark : styles.storeNameLight,
          ]}
        >
          Stop {toast.stopNumber} · {toast.storeName}
        </Text>
        <Text
          style={[
            styles.time,
            isDark ? styles.timeDark : styles.timeLight,
          ]}
        >
          Visit timer started.
        </Text>
        {checkInTime.length > 0 ? (
          <Text
            style={[
              styles.time,
              isDark ? styles.timeDark : styles.timeLight,
            ]}
          >
            {checkInTime}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 200,
  },
  banner: {
    borderRadius: 14,
    gap: 2,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  bannerLight: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  titleLight: {
    color: AppColors.green,
  },
  titleDark: {
    color: '#6EE7B7',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  storeNameLight: {
    color: AppColors.textPrimary,
  },
  storeNameDark: {
    color: '#F9FAFB',
  },
  time: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  timeLight: {
    color: AppColors.textSecondary,
  },
  timeDark: {
    color: '#D1D5DB',
  },
});
