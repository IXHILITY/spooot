import React from 'react';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import { getTelegramUserId, isTelegramEnv, triggerHaptic } from '../../services/telegram';

interface AccessGuardProps {
  allowedTelegramId?: string;
  children: React.ReactNode;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({ allowedTelegramId, children }) => {
  const [copied, setCopied] = React.useState(false);
  const cleanAllowedId = (allowedTelegramId || '').trim();

  if (!cleanAllowedId || !isTelegramEnv()) {
    return <>{children}</>;
  }

  const currentUserId = getTelegramUserId();
  if (currentUserId === cleanAllowedId) {
    return <>{children}</>;
  }

  const handleCopy = () => {
    if (!currentUserId) return;
    navigator.clipboard.writeText(currentUserId);
    setCopied(true);
    triggerHaptic('light');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--tg-bg)]">
      <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-xl font-bold mb-2">Доступ ограничен</h1>
      <p className="text-sm text-[var(--tg-hint)] max-w-xs mb-5">
        Это персональный AI-тренер. Ваш Telegram ID не совпадает с разрешённым в настройках.
      </p>
      {currentUserId && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--tg-secondary-bg)] border border-white/10 text-sm font-mono"
        >
          <span>Ваш ID: {currentUserId}</span>
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-[var(--tg-hint)]" />
          )}
        </button>
      )}
    </div>
  );
};
