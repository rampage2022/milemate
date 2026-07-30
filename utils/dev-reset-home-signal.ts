type DevResetHomeListener = () => void;

const listeners = new Set<DevResetHomeListener>();

export function subscribeDevResetHome(listener: DevResetHomeListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyDevResetHome(): void {
  for (const listener of listeners) {
    listener();
  }
}
