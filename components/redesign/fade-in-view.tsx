import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type FadeInViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FadeInView({ children, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) {
        return;
      }

      if (reduceMotion) {
        opacity.setValue(1);
        return;
      }

      Animated.timing(opacity, {
        duration: 320,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      mounted = false;
    };
  }, [opacity]);

  return (
    <Animated.View style={[styles.flex, style, { opacity }]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
