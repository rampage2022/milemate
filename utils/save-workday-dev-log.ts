export function logSaveWorkdayDev(
  message: string,
  details?: Record<string, string | number | boolean>,
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  if (details && Object.keys(details).length > 0) {
    console.log(`[SaveWorkday] ${message}`, details);
    return;
  }

  console.log(`[SaveWorkday] ${message}`);
}
