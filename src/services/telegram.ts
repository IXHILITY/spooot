import WebApp from '@twa-dev/sdk';

const MAX_CLOUD_VALUE_BYTES = 4096;
const twa = WebApp as any;

export function isTelegramEnv(): boolean {
  return Boolean(typeof window !== 'undefined' && twa?.initData);
}

export function initTelegramApp(): void {
  applyTelegramTheme();
  if (!isTelegramEnv()) return;
  try {
    twa.ready();
    twa.expand();
    if (typeof twa.disableVerticalSwipes === 'function') {
      twa.disableVerticalSwipes();
    }
    if (typeof twa.setHeaderColor === 'function') {
      twa.setHeaderColor('#0B0E14');
    }
    if (typeof twa.setBackgroundColor === 'function') {
      twa.setBackgroundColor('#0B0E14');
    }
  } catch (e) {
    console.warn('Telegram WebApp init skipped:', e);
  }
}

export function applyTelegramTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--tg-bg', '#0B0E14');
  root.style.setProperty('--tg-secondary-bg', '#151A23');
  root.style.setProperty('--tg-text', '#F3F4F6');
  root.style.setProperty('--tg-hint', '#9CA3AF');
  root.style.setProperty('--tg-accent', '#10B981');
  root.style.setProperty('--tg-accent-text', '#FFFFFF');
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
  } catch {}
}

export function cloudGetItem(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isTelegramEnv() || !twa.CloudStorage) {
      resolve(null);
      return;
    }
    twa.CloudStorage.getItem(key, (err: unknown, value?: string) => {
      resolve(err ? null : value || null);
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
      resolve(false);
      return;
    }
    twa.CloudStorage.setItem(key, value, (err: unknown, stored?: boolean) => {
      resolve(err ? false : Boolean(stored));
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
      resolve(err || !keys ? [] : keys);
    });
  });
}
