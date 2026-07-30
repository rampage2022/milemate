import { StyleSheet, View } from 'react-native';

import { LiveRouteFinishCard } from '@/components/coordinator/live-route-finish-card';
import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { LiveRouteNextStopCard } from '@/components/coordinator/live-route-next-stop-card';
import { LiveRouteProgressCard } from '@/components/coordinator/live-route-progress-card';
import type { LiveRouteSummaryData } from '@/utils/live-route-summary';

type LiveRouteSummaryProps = {
  summary: LiveRouteSummaryData;
};

export function LiveRouteSummary({ summary }: LiveRouteSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <LiveRouteProgressCard progress={summary.progress} />
        <LiveRouteNextStopCard nextStop={summary.nextStop} />
      </View>
      <LiveRouteFinishCard finish={summary.finishEta} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: LiveRouteLayout.headerRowGap,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    gap: LiveRouteLayout.headerCardGap,
  },
});
