import WebApp from '@twa-dev/sdk';

const MAX_CLOUD_VALUE_BYTES = 4096;
const twa = WebApp as any;

export function isTelegramEnv(): boolean {
  return Boolean(typeof window !== 'undefined' && twa?.initData);
}

export function initTelegramApp(): void {
  if (!isTelegramEnv()) return;
  try {
    twa.ready();
    twa.expand();
    if (typeof twa.disableVerticalSwipes === 'function') {
      twa.disableVerticalSwipes();
    }
    applyTelegramTheme();
  } catch (e) {
    console.warn('Telegram WebApp init skipped:', e);
  }
}

export function applyTelegramTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tp = isTelegramEnv() ? twa.themeParams || {} : {};

  root.style.setProperty('--tg-bg', tp.bg_color || '#0B0E14');
  root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color || '#151A23');
  root.style.setProperty('--tg-text', tp.text_color || '#F3F4F6');
  root.style.setProperty('--tg-hint', tp.hint_color || '#9CA3AF');
  root.style.setProperty('--tg-accent', tp.button_color || '#10B981');
  root.style.setProperty('--tg-accent-text', tp.button_text_color || '#FFFFFF');
}

export function getTelegramUserId(): string | null {
  if (!isTelegramEnv()) return null;
  const id = twa.initDataUnsafe?.user?.id;
  return id ? String(id) : null;
}

export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
): void {
  if (!isTelegramEnv() || !twa.HapticFeedback) return;
  try {
    if (type === 'success' || type === 'warning' || type === 'error') {
      twa.HapticFeedback.notificationOccurred(type);
    } else {
      twa.HapticFeedback.impactOccurred(type);
    }
  } catch {
    // ignore on older desktop clients
  }
}

export function cloudGetItem(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isTelegramEnv() || !twa.CloudStorage) {
      resolve(null);
      return;
    }
    twa.CloudStorage.getItem(key, (err: unknown, value?: string) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(value || null);
    });
  });
}

export function cloudSetItem(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isTelegramEnv() || !twa.CloudStorage) {
      resolve(false);
      return;
    }
    const byteSize = new TextEncoder().encode(value).length;
    if (byteSize > MAX_CLOUD_VALUE_BYTES) {
      console.error(`CloudStorage limit exceeded for [${key}]: ${byteSize} bytes`);
      resolve(false);
      return;
    }
    twa.CloudStorage.setItem(key, value, (err: unknown, stored?: boolean) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(Boolean(stored));
    });
  });
}

export function cloudGetKeys(): Promise<string[]> {
  return new Promise((resolve) => {
    if (!isTelegramEnv() || !twa.CloudStorage) {
      resolve([]);
      return;
    }
    twa.CloudStorage.getKeys((err: unknown, keys?: string[]) => {
      if (err || !keys) {
        resolve([]);
        return;
      }
      resolve(keys);
    });
  });
}
