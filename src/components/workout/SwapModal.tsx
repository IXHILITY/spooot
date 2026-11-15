import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2, X, Check } from 'lucide-react';
import { AppSettings, ElbowStatus } from '../../types';
import { llmClient } from '../../services/llmClient';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  exerciseName: string;
  muscleGroup: string;
  currentWeight: number;
  elbowStatus: ElbowStatus;
  onApplySubstitution: (newExerciseName: string) => void;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  settings,
  exerciseName,
  muscleGroup,
  currentWeight,
  elbowStatus,
  onApplySubstitution,
}) => {
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setAiSuggestions('');

    llmClient
      .requestExerciseSwap(settings, {
        exerciseName,
        muscleGroup,
        currentWeight,
        elbowStatus,
      })
      .then((res) => {
        if (mounted) setAiSuggestions(res);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Ошибка запроса к hydrogen-4');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, settings, exerciseName, muscleGroup, currentWeight, elbowStatus]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!customName.trim()) return;
    onApplySubstitution(customName.trim());
    setCustomName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3">
      <div className="w-full max-w-md rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Замена занятого тренажёра</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 text-[var(--tg-hint)] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-[var(--tg-hint)]">
          Заменяем: <span className="text-white font-semibold">{exerciseName}</span> (
          {currentWeight} кг • Локти: {elbowStatus.toUpperCase()})
        </div>

        <div className="p-3 rounded-xl bg-[var(--tg-bg)] border border-white/10 min-h-[120px] text-xs leading-relaxed whitespace-pre-wrap">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-[var(--tg-hint)]">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <span>hydrogen-4 подбирает аналог под твой вес и связки...</span>
            </div>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            aiSuggestions
          )}
        </div>

        <div className="space-y-2 pt-1">
          <label className="block text-xs text-[var(--tg-hint)]">
            Впиши выбранную замену для фиксации в логе:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Например: Жим в хаммере сидя"
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleConfirm}
              disabled={!customName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Заменить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
