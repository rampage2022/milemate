/** Encouraging copy for the route-complete celebration (rotate in future versions). */
export const ROUTE_COMPLETE_MESSAGES = [
  "Nice work. You completed today's route.",
  'Great work today.',
  'Safe travels home.',
  'Another productive day completed.',
  'Every mile counts.',
  'Excellent work today.',
] as const;

export function pickRouteCompleteMessage(): string {
  return ROUTE_COMPLETE_MESSAGES[0];
}
