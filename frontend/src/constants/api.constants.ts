interface RuntimeEnv {
  VITE_API_URL?: string;
  VITE_WS_URL?: string;
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

export const getRuntimeEnv = (key: keyof RuntimeEnv): string | undefined => {
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  return import.meta.env[key];
};

export const API_BASE =
  getRuntimeEnv('VITE_API_URL') ?? (typeof window !== 'undefined');

const resolveWsBase = (): string => {
  const wsEnv = getRuntimeEnv('VITE_WS_URL');
  if (wsEnv) {
    return wsEnv;
  }
  const apiEnv = getRuntimeEnv('VITE_API_URL');
  if (apiEnv) {
    try {
      const parsed = new URL(apiEnv);
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
