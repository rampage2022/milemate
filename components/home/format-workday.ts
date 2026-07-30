export function formatDurationDisplay(elapsedMs: number): {
  unit: string;
  value: string;
} {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return {
      value: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      unit: 'hh:mm:ss',
    };
  }

  return {
    value: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    unit: 'mm:ss',
  };
}

export function formatWorkdayStartedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
