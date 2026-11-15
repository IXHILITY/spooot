import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Circle,
  Flame,
  Moon,
  Pill,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppSettings, DailyCheckIn, ElbowStatus, MealEntry } from '../../types';
import { MealPhotoModal } from './MealPhotoModal';

interface DailyCheckInBarProps {
  checkIn: DailyCheckIn;
  settings: AppSettings;
  onUpdateCheckIn: (patch: Partial<DailyCheckIn>) => void;
  onAddMeal: (meal: Omit<MealEntry, 'id' | 'time'>) => void;
  onRemoveMeal: (mealId: string) => void;
}

const ELBOW_CONFIG: Record<
  ElbowStatus,
  { label: string; dot: string; activeBg: string; hint?: string }
> = {
  green: {
    label: 'Зелёный',
    dot: 'bg-emerald-400',
    activeBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  },
  yellow: {
    label: 'Жёлтый',
    dot: 'bg-amber-400',
    activeBg: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    hint: 'Режим защиты локтей: без локаута в верхней точке + добавлен разминочный подход.',
  },
  red: {
    label: 'Красный',
    dot: 'bg-red-400',
    activeBg: 'bg-red-500/20 border-red-500/50 text-red-300',
    hint: 'Острый дискомфорт: избегай изолирующих разгибаний и тяжёлых жимов.',
  },
};

export const DailyCheckInBar: React.FC<DailyCheckInBarProps> = ({
  checkIn,
  settings,
  onUpdateCheckIn,
  onAddMeal,
  onRemoveMeal,
}) => {
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [showMealsList, setShowMealsList] = useState(false);

  const totals = checkIn.meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.calories,
      protein: acc.protein + m.protein,
      fats: acc.fats + m.fats,
      carbs: acc.carbs + m.carbs,
    }),
    { kcal: 0, protein: 0, fats: 0, carbs: 0 }
  );

  const kcalProgress = Math.min(100, Math.round((totals.kcal / settings.targetCalories) * 100));
  const remainingKcal = Math.max(0, settings.targetCalories - totals.kcal);

  return (
    <div className="rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--tg-hint)] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Статус локтей:
        </span>
        <div className="flex items-center gap-1.5">
          {(['green', 'yellow', 'red'] as ElbowStatus[]).map((status) => {
            const cfg = ELBOW_CONFIG[status];
            const isSelected = checkIn.elbowStatus === status;
            return (
              <button
                key={status}
                onClick={() => onUpdateCheckIn({ elbowStatus: status })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  isSelected
                    ? cfg.activeBg
                    : 'bg-white/[0.03] border-white/10 text-[var(--tg-hint)]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {ELBOW_CONFIG[checkIn.elbowStatus].hint && (
        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-snug">
          {ELBOW_CONFIG[checkIn.elbowStatus].hint}
        </div>
      )}

      <div className="pt-1 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-white">{totals.kcal}</span>
              <span className="text-xs text-[var(--tg-hint)]">
                / {settings.targetCalories} ккал
              </span>
            </div>
            <div className="text-[11px] text-[var(--tg-hint)]">
              Б: <span className="text-emerald-400 font-semibold">{totals.protein}г</span> • Ж:{' '}
              {totals.fats}г • У: {totals.carbs}г
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {checkIn.meals.length > 0 && (
              <button
                onClick={() => setShowMealsList((v) => !v)}
                className="px-2 py-1.5 rounded-xl bg-white/5 text-xs text-[var(--tg-hint)] flex items-center gap-1"
              >
                <span>{checkIn.meals.length}</span>
                {showMealsList ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={() => setIsMealModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Фото еды
            </button>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${kcalProgress}%` }}
          />
        </div>

        {showMealsList && checkIn.meals.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {checkIn.meals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--tg-bg)] text-xs"
              >
                <div className="truncate pr-2">
                  <span className="text-[var(--tg-hint)] mr-1.5">{meal.time}</span>
                  <span className="font-medium">{meal.dishName}</span>
                  <span className="text-[var(--tg-hint)] ml-1.5">
                    ({meal.calories} ккал • {meal.protein}г Б)
                  </span>
                </div>
                <button
                  onClick={() => onRemoveMeal(meal.id)}
                  className="text-[var(--tg-hint)] hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onUpdateCheckIn({ caloriesHit: !checkIn.caloriesHit })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium shrink-0 ${
            checkIn.caloriesHit
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-white/[0.02] border-white/10 text-[var(--tg-hint)]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          3000 ккал
        </button>

        <button
          onClick={() => onUpdateCheckIn({ proteinHit: !checkIn.proteinHit })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium shrink-0 ${
            checkIn.proteinHit
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-white/[0.02] border-white/10 text-[var(--tg-hint)]'
          }`}
        >
          {checkIn.proteinHit ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Circle className="w-3.5 h-3.5" />
          )}
          Белок
        </button>

        <button
          onClick={() => onUpdateCheckIn({ creatineTaken: !checkIn.creatineTaken })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium shrink-0 ${
            checkIn.creatineTaken
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-white/[0.02] border-white/10 text-[var(--tg-hint)]'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          Креатин 3г
        </button>

        <button
          onClick={() => {
            const nextSleep = ((checkIn.sleepQuality % 5) + 1) as 1 | 2 | 3 | 4 | 5;
            onUpdateCheckIn({ sleepQuality: nextSleep });
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-medium text-sky-300 shrink-0"
          title="Нажми, чтобы изменить оценку сна"
        >
          <Moon className="w-3.5 h-3.5" />
          Сон {checkIn.sleepQuality}/5
        </button>
      </div>

      <MealPhotoModal
        isOpen={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        settings={settings}
        remainingCalories={remainingKcal}
        onSaveMeal={onAddMeal}
      />
    </div>
  );
};
