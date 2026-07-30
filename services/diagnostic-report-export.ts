import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { resolveStartEndLocations } from '@/services/geocoding';
import { getTrips } from '@/services/trips';
import {
  getLatestCompletedWorkdayDiagnostic,
  getWorkdayDiagnosticByTripId,
} from '@/services/workday-diagnostics-store';
import type { LocationDiagnosticEntry } from '@/types/location-diagnostic';
import type { Trip } from '@/types/trip';
import type { WorkdayDiagnostic } from '@/types/workday-diagnostic';

type DiagnosticReportData = {
  trip: Trip;
  diagnostic: WorkdayDiagnostic;
  entries: LocationDiagnosticEntry[];
  summary: {
    acceptedCount: number;
    averageAccuracyMeters: number | null;
    ignoredCount: number;
    segmentRunningTotalMiles: number;
    totalFixes: number;
  };
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startedAt: number, endedAt: number): string {
  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatCoordinate(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function formatSpeed(speedMps: number | null): string {
  if (speedMps === null) {
    return '—';
  }

  const mph = speedMps * 2.23694;
  return `${speedMps.toFixed(2)} m/s (${mph.toFixed(1)} mph)`;
}

function diagnosticFixToEntry(
  fix: WorkdayDiagnostic['fixes'][number],
): LocationDiagnosticEntry {
  const authoritativeDistanceAfterMiles =
    fix.authoritativeDistanceAfterMiles ?? fix.segmentRunningTotalMiles;

  return {
    id: fix.id,
    sequence: fix.sequence,
    timestamp: fix.timestamp,
    latitude: fix.latitude,
    longitude: fix.longitude,
    horizontalAccuracyMeters: fix.horizontalAccuracyMeters,
    speedMps: fix.speedMps,
    distanceFromPreviousMiles: fix.distanceFromPreviousMiles,
    segmentRunningTotalMiles: authoritativeDistanceAfterMiles,
    authoritativeDistanceBeforeMiles:
      fix.authoritativeDistanceBeforeMiles ?? authoritativeDistanceAfterMiles,
    authoritativeDistanceAfterMiles,
    displayedUiDistanceMiles: fix.displayedUiDistanceMiles ?? null,
    distanceSavedAtEndWorkdayMiles: fix.distanceSavedAtEndWorkdayMiles ?? null,
    ignored: fix.ignored,
    ignoredReason: fix.ignoredReason,
  };
}

function buildReportSummary(diagnostic: WorkdayDiagnostic) {
  const accuracyReadings = diagnostic.fixes
    .map((fix) => fix.horizontalAccuracyMeters)
    .filter((value): value is number => value !== null);

  const averageAccuracyMeters =
    accuracyReadings.length === 0
      ? null
      : accuracyReadings.reduce((sum, value) => sum + value, 0) /
        accuracyReadings.length;

  return {
    acceptedCount: diagnostic.acceptedFixes,
    averageAccuracyMeters,
    ignoredCount: diagnostic.ignoredFixes,
    segmentRunningTotalMiles:
      diagnostic.distanceSavedAtEndWorkdayMiles ?? diagnostic.diagnosticDistanceMiles,
    totalFixes: diagnostic.totalFixes,
  };
}

async function loadDiagnosticReportData(
  tripId?: string,
): Promise<DiagnosticReportData | null> {
  const diagnostic = tripId
    ? await getWorkdayDiagnosticByTripId(tripId)
    : await getLatestCompletedWorkdayDiagnostic();

  if (!diagnostic || !diagnostic.endedAt) {
    return null;
  }

  const trips = await getTrips();
  const trip = trips.find((candidate) => candidate.id === diagnostic.tripId);

  if (!trip || trip.endedAt === undefined) {
    return null;
  }

  const entries = [...diagnostic.fixes]
    .sort((a, b) => a.sequence - b.sequence)
    .map(diagnosticFixToEntry);

  return {
    trip,
    diagnostic,
    entries,
    summary: buildReportSummary(diagnostic),
  };
}

function buildTraceRows(entries: LocationDiagnosticEntry[]): string {
  return entries
    .map((entry) => {
      const cells = [
        entry.sequence,
        formatTime(entry.timestamp),
        entry.latitude.toFixed(6),
        entry.longitude.toFixed(6),
        entry.horizontalAccuracyMeters !== null
          ? entry.horizontalAccuracyMeters.toFixed(1)
          : '—',
        formatSpeed(entry.speedMps),
        entry.authoritativeDistanceBeforeMiles.toFixed(4),
        entry.distanceFromPreviousMiles !== null
          ? entry.distanceFromPreviousMiles.toFixed(4)
          : '—',
        entry.authoritativeDistanceAfterMiles.toFixed(4),
        entry.displayedUiDistanceMiles !== null
          ? entry.displayedUiDistanceMiles.toFixed(4)
          : '—',
        entry.distanceSavedAtEndWorkdayMiles !== null
          ? entry.distanceSavedAtEndWorkdayMiles.toFixed(4)
          : '—',
        entry.ignored ? 'Ignored' : 'Accepted',
        entry.ignoredReason ?? '—',
      ];

      return `<tr>${cells.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`;
    })
    .join('');
}

function buildReportHtml(
  report: DiagnosticReportData,
  startEnd: Awaited<ReturnType<typeof resolveStartEndLocations>>,
): string {
  const { trip, summary, entries } = report;
  const endedAt = trip.endedAt ?? trip.startedAt;
  const distanceDelta =
    trip.distanceMiles - summary.segmentRunningTotalMiles;

  const startCoords = startEnd.start
    ? formatCoordinate(startEnd.start.latitude, startEnd.start.longitude)
    : '—';
  const endCoords = startEnd.end
    ? formatCoordinate(startEnd.end.latitude, startEnd.end.longitude)
    : '—';
  const startAddress = startEnd.start?.address ?? 'Address unavailable';
  const endAddress = startEnd.end?.address ?? 'Address unavailable';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MileMate Development Diagnostic Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; margin: 24px; }
    h1, h2 { margin-bottom: 8px; }
    .banner { background: #FEF3C7; border: 1px solid #F59E0B; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-weight: 700; }
    .section { margin-bottom: 28px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #D1D5DB; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #F3F4F6; }
    .meta { color: #4B5563; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="banner">Development Diagnostic — Not for tax filing.</div>
  <h1>MileMate Workday Diagnostic Report</h1>
  <p class="meta">Generated ${escapeHtml(formatDate(Date.now()))} at ${escapeHtml(formatTime(Date.now()))}</p>
  <p class="meta">Trip ID: ${escapeHtml(trip.id)}</p>

  <div class="section">
    <h2>1. User-facing summary</h2>
    <p><strong>Workday date:</strong> ${escapeHtml(formatDate(trip.startedAt))}</p>
    <p><strong>Start time:</strong> ${escapeHtml(formatTime(trip.startedAt))}</p>
    <p><strong>End time:</strong> ${escapeHtml(formatTime(endedAt))}</p>
    <p><strong>Duration:</strong> ${escapeHtml(formatDuration(trip.startedAt, endedAt))}</p>
    <p><strong>Total distance shown in MileMate:</strong> ${trip.distanceMiles.toFixed(4)} miles</p>
    <p><strong>Start coordinates:</strong> ${escapeHtml(startCoords)}</p>
    <p><strong>Start address:</strong> ${escapeHtml(startAddress)}</p>
    <p><strong>End coordinates:</strong> ${escapeHtml(endCoords)}</p>
    <p><strong>End address:</strong> ${escapeHtml(endAddress)}</p>
  </div>

  <div class="section">
    <h2>2. Diagnostic summary</h2>
    <p><strong>Total location fixes:</strong> ${summary.totalFixes}</p>
    <p><strong>Accepted segments:</strong> ${summary.acceptedCount}</p>
    <p><strong>Ignored fixes:</strong> ${summary.ignoredCount}</p>
    <p><strong>Average horizontal accuracy:</strong> ${
      summary.averageAccuracyMeters !== null
        ? `${summary.averageAccuracyMeters.toFixed(1)} m`
        : '—'
    }</p>
    <p><strong>Diagnostic running-distance total:</strong> ${summary.segmentRunningTotalMiles.toFixed(4)} miles</p>
    <p><strong>Distance saved at End Workday:</strong> ${
      report.diagnostic.distanceSavedAtEndWorkdayMiles !== null
        ? `${report.diagnostic.distanceSavedAtEndWorkdayMiles.toFixed(4)} miles`
        : '—'
    }</p>
    <p><strong>Difference (Trip minus diagnostic total):</strong> ${distanceDelta.toFixed(4)} miles</p>
  </div>

  <div class="section">
    <h2>3. Location trace</h2>
    <table>
      <thead>
        <tr>
          <th>Seq</th>
          <th>Timestamp</th>
          <th>Latitude</th>
          <th>Longitude</th>
          <th>Accuracy (m)</th>
          <th>Speed</th>
          <th>Auth. before (mi)</th>
          <th>Segment distance (mi)</th>
          <th>Auth. after (mi)</th>
          <th>UI distance (mi)</th>
          <th>Saved at end (mi)</th>
          <th>Status</th>
          <th>Ignored reason</th>
        </tr>
      </thead>
      <tbody>
        ${buildTraceRows(entries)}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function buildExportFilename(report: DiagnosticReportData): string {
  const date = new Date(report.trip.startedAt).toISOString().slice(0, 10);
  const shortId = report.trip.id.slice(0, 8);

  return `milemate-diagnostic-${date}-${shortId}.html`;
}

export async function exportDiagnosticReport(tripId?: string): Promise<void> {
  const report = await loadDiagnosticReportData(tripId);

  if (!report) {
    throw new Error(
      tripId
        ? 'No saved diagnostic record found for this workday.'
        : 'No completed diagnostic report is available. End a workday after collecting GPS fixes.',
    );
  }

  if (report.entries.length === 0) {
    throw new Error(
      'The selected workday has no recorded location fixes to export.',
    );
  }

  const startEnd = await resolveStartEndLocations(report.entries);
  const html = buildReportHtml(report, startEnd);
  const filename = buildExportFilename(report);
  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }

  file.create();
  file.write(html);

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/html',
    dialogTitle: 'Export Diagnostic Report',
    UTI: 'public.html',
  });
}

export async function exportLatestDiagnosticReport(): Promise<void> {
  await exportDiagnosticReport();
}
