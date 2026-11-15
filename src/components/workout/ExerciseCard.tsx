import React, { useState } from 'react';
import { Check, History, Info, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  AppSettings,
  ElbowStatus,
  ExerciseTemplate,
  LoggedExercise,
} from '../../types';
import { SwapModal } from './SwapModal';

interface ExerciseCardProps {
  exercise: LoggedExercise;
  exerciseIndex: number;
  template?: ExerciseTemplate;
  lastPerformance: LoggedExercise | null;
  elbowStatus: ElbowStatus;
  settings: AppSettings;
  onToggleSet: (exerciseIdx: number, setIdx: number) => void;
  onUpdateField: (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', val: number) => void;
  onAddSet: (exerciseIdx: number) => void;
  onSubstitute: (exerciseIdx: number, newName: string) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  template,
  lastPerformance,
  elbowStatus,
  settings,
  onToggleSet,
  onUpdateField,
  onAddSet,
  onSubstitute,
}) => {
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const isAllDone = completedCount === exercise.sets.length && exercise.sets.length > 0;

  const prevSummary = lastPerformance
    ? lastPerformance.sets
        .filter((s) => s.completed)
        .map((s) => `${s.weight}кг×${s.reps}${s.type === 'warmup' ? '(р)' : ''}`)
        .join(' • ')
    : template
    ? template.sets
        .map(
          (s) =>
            `${s.targetWeight}кг×${
              s.targetRepsMin === s.targetRepsMax
                ? s.targetRepsMax
                : `${s.targetRepsMin}-${s.targetRepsMax}`
            }${s.type === 'warmup' ? '(р)' : ''}`
        )
        .join(' • ')
    : null;

  const workingWeight =
    exercise.sets.find((s) => s.type === 'working')?.weight || exercise.sets[0]?.weight || 10;

  const techniqueNote = !exercise.isSubstituted ? template?.notes?.trim() : undefined;

  return (
    <div
      className={`rounded-2xl bg-[var(--tg-secondary-bg)] border transition-colors p-3.5 space-y-3 ${
        isAllDone ? 'border-emerald-500/40' : 'border-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              #{exerciseIndex + 1}
            </span>
            <h3 className="font-bold text-sm text-white leading-snug">{exercise.name}</h3>
            {exercise.isSubstituted && (
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold">
                Замена
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--tg-hint)]">
            <span>{template?.muscleGroup || 'Рабочая группа'}</span>
            <span>•</span>
            <span>
              {completedCount}/{exercise.sets.length} подх.
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsSwapOpen(true)}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-[var(--tg-hint)] hover:text-white"
        >
          <RefreshCw className="w-3 h-3" />
          Заменить
        </button>
      </div>

      {techniqueNote && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 leading-snug">
          <Info className="w-3.5 h-3.5 shrink-0 text-sky-400 mt-0.5" />
          <span>{techniqueNote}</span>
        </div>
      )}

      {template?.isElbowSensitive && elbowStatus !== 'green' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Не выпрямляй локти в замок в верхней точке амплитуды.</span>
        </div>
      )}

      {prevSummary && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--tg-bg)] text-[11px] text-[var(--tg-hint)]">
          <History className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">
            {lastPerformance ? 'Прошлый раз: ' : 'План: '}
            <strong className="text-gray-200 font-medium">{prevSummary}</strong>
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="grid grid-cols-12 gap-1.5 px-1 text-[10px] uppercase tracking-wider text-[var(--tg-hint)] font-semibold">
          <div className="col-span-2">Сет</div>
          <div className="col-span-4 text-center">Вес (кг)</div>
          <div className="col-span-4 text-center">Повторы</div>
          <div className="col-span-2 text-right">Готово</div>
        </div>

        {exercise.sets.map((set, sIdx) => {
          const workingIndex =
            exercise.sets.slice(0, sIdx + 1).filter((s) => s.type === 'working').length;

          return (
            <div
              key={sIdx}
              className={`grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-xl transition-colors ${
                set.completed ? 'bg-emerald-500/10' : 'bg-[var(--tg-bg)]'
              }`}
            >
              <div className="col-span-2 flex items-center">
                {set.type === 'warmup' ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Разм
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-gray-300 pl-1.5">
                    {workingIndex}
                  </span>
                )}
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(e) =>
                    onUpdateField(exerciseIndex, sIdx, 'weight', parseFloat(e.target.value) || 0)
                  }
                  className="w-full py-1.5 px-1 rounded-lg bg-white/[0.04] border border-white/10 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(e) =>
                    onUpdateField(exerciseIndex, sIdx, 'reps', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full py-1.5 px-1 rounded-lg bg-white/[0.04] border border-white/10 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  onClick={() => onToggleSet(exerciseIndex, sIdx)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    set.completed
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                      : 'bg-white/[0.06] border border-white/10 text-[var(--tg-hint)] hover:text-white'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onAddSet(exerciseIndex)}
        className="w-full py-1.5 rounded-xl border border-dashed border-white/15 hover:border-white/30 text-xs text-[var(--tg-hint)] hover:text-white flex items-center justify-center gap-1 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Добавить подход
      </button>

      <SwapModal
        isOpen={isSwapOpen}
        onClose={() => setIsSwapOpen(false)}
        settings={settings}
        exerciseName={exercise.name}
        muscleGroup={template?.muscleGroup || 'Мышечная группа'}
        currentWeight={workingWeight}
        elbowStatus={elbowStatus}
        onApplySubstitution={(newName) => onSubstitute(exerciseIndex, newName)}
      />
    </div>
  );
};
