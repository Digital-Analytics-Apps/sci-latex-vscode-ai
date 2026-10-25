export const API_BASE =
  import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:3333');

const resolveWsBase = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    try {
      const parsed = new URL(import.meta.env.VITE_API_URL);
      const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${parsed.host}`;
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return 'ws://localhost:3333';
    }
    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
  }
  return 'ws://localhost:3333';
};

export const WS_BASE = resolveWsBase();
