import React, { useEffect, useState } from 'react';
import { Timer, RotateCcw, Plus, X } from 'lucide-react';
import { triggerHaptic } from '../../services/telegram';

interface RestTimerProps {
  endTimeMs: number | null;
  defaultDurationSec: 60 | 90 | 120;
  onStartTimer: (durationSec: number) => void;
  onStopTimer: () => void;
}

function playSoftChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore audio autoplay policies
  }
}

export const RestTimer: React.FC<RestTimerProps> = ({
  endTimeMs,
  defaultDurationSec,
  onStartTimer,
  onStopTimer,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!endTimeMs) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const diff = Math.ceil((endTimeMs - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        triggerHaptic('success');
        playSoftChime();
        onStopTimer();
      } else {
        setSecondsLeft(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endTimeMs, onStopTimer]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;

  if (endTimeMs && secondsLeft > 0) {
    return (
      <div className="sticky bottom-20 z-30 mx-auto max-w-lg rounded-2xl bg-emerald-950/95 border border-emerald-500/50 px-4 py-3 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Timer className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold">
              Отдых между подходами
            </div>
            <div className="text-xl font-mono font-bold text-white leading-none mt-0.5">
              {formatted}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartTimer(secondsLeft + 30)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            30с
          </button>
          <button
            onClick={() => onStartTimer(defaultDurationSec)}
            className="p-2 rounded-xl bg-white/10 text-white"
            title="Перезапустить"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onStopTimer}
            className="p-2 rounded-xl bg-white/10 text-[var(--tg-hint)] hover:text-white"
            title="Сбросить таймер"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--tg-secondary-bg)] border border-white/10">
      <span className="text-xs text-[var(--tg-hint)] flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 text-emerald-400" />
        Таймер отдыха:
      </span>
      <div className="flex items-center gap-1.5">
        {([60, 90, 120] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => {
              triggerHaptic('light');
              onStartTimer(sec);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
              sec === defaultDurationSec
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.03] border-white/10 text-[var(--tg-hint)]'
            }`}
          >
            {sec}с
          </button>
        ))}
      </div>
    </div>
  );
};
