import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { RouteCalculationStep } from '@/services/route-calculation';

const STEP_LABELS: Record<RouteCalculationStep, string> = {
  loading_stops: 'Loading stops',
  optimizing_route: 'Optimizing route',
  calculating_mileage: 'Calculating mileage',
  estimating_drive_time: 'Estimating drive time',
};

type RouteCalculationTransitionProps = {
  activeStep: RouteCalculationStep | null;
  completedSteps: RouteCalculationStep[];
  errorMessage?: string | null;
  onRetry?: () => void;
  visible: boolean;
};

export function RouteCalculationTransition({
  activeStep,
  completedSteps,
  errorMessage = null,
  onRetry,
  visible,
}: RouteCalculationTransitionProps) {
  const steps = Object.keys(STEP_LABELS) as RouteCalculationStep[];

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Preparing your workday…</Text>

          <View style={styles.steps}>
            {steps.map((step) => {
              const completed = completedSteps.includes(step);
              const active = activeStep === step;

              return (
                <View key={step} style={styles.stepRow}>
                  <Text style={styles.stepIcon}>
                    {completed ? '✓' : active ? '•' : ' '}
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      completed && styles.stepLabelCompleted,
                      active && styles.stepLabelActive,
                    ]}
                  >
                    {STEP_LABELS[step]}
                  </Text>
                  {active && !completed ? (
                    <ActivityIndicator color={AppColors.blue} size="small" />
                  ) : null}
                </View>
              );
            })}
          </View>

          {errorMessage ? (
            <>
              <Text style={styles.error}>{errorMessage}</Text>
              {onRetry ? (
                <Text accessibilityRole="button" onPress={onRetry} style={styles.retry}>
                  Try again
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: AppColors.background,
    borderRadius: 20,
    gap: 16,
    maxWidth: 360,
    padding: 24,
    width: '100%',
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  steps: {
    gap: 10,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stepIcon: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
    width: 16,
  },
  stepLabel: {
    color: AppColors.textMuted,
    flex: 1,
    fontSize: 16,
  },
  stepLabelCompleted: {
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: AppColors.blue,
    fontWeight: '700',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retry: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
