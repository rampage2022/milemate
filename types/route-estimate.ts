export type RouteEstimateStatus =
  | { status: 'incomplete' }
  | { status: 'ready' }
  | { status: 'loading' }
  | { status: 'success'; miles: number }
  | { status: 'error'; message: string };
