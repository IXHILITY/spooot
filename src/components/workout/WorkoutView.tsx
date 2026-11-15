import React, { useCallback, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  XCircle,
  Coffee,
  Dumbbell,
} from 'lucide-react';
import {
  AppSettings,
  CYCLE_SEQUENCES,
  CycleState,
  DailyCheckIn,
  ExerciseTemplate,
  MealEntry,
  SplitDayType,
  SplitMode,
  WorkoutSession,
} from '../../types';
import { storageService } from '../../services/storage';
import { DailyCheckInBar } from '../recovery/DailyCheckInBar';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './RestTimer';

interface WorkoutViewProps {
  settings: AppSettings;
  program: ExerciseTemplate[];
  cycle: CycleState;
  currentSplit: SplitDayType;
  todayCheckIn: DailyCheckIn;
  activeWorkout: WorkoutSession | null;
  onShiftCycle: (delta: number) => void;
  onChangeSplitMode: (mode: SplitMode) => void;
  onUpdateCheckIn: (patch: Partial<DailyCheckIn>) => void;
  onAddMeal: (meal: Omit<MealEntry, 'id' | 'time'>) => void;
  onRemoveMeal: (mealId: string) => void;
  onStartWorkout: (overrideSplit?: Exclude<SplitDayType, 'REST'>) => void;
  onToggleSet: (exIdx: number, setIdx: number) => boolean;
  onUpdateSetField: (exIdx: number, setIdx: number, field: 'weight' | 'reps', val: number) => void;
  onAddSet: (exIdx: number) => void;
  onSubstitute: (exIdx: number, newName: string) => void;
  onFinishWorkout: () => void;
  onCancelWorkout: () => void;
}

const SPLIT_META: Record<SplitDayType, { title: string; subtitle: string; badge: string }> = {
  PUSH: {
    title: 'День PUSH',
    subtitle: 'Грудь • Плечи • Трицепс • Пресс',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  PULL: {
    title: 'День PULL',
    subtitle: 'Спина • Задняя дельта • Бицепс',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  LEGS: {
    title: 'День LEGS',
    subtitle: 'Квадрицепс • Бицепс бедра • Икры • Пресс',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  REST: {
    title: 'День отдыха (REST)',
    subtitle: 'Восстановление ЦНС, связок и рост мышц',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
};

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  settings,
  program,
  cycle,
  currentSplit,
  todayCheckIn,
  activeWorkout,
  onShiftCycle,
  onChangeSplitMode,
  onUpdateCheckIn,
  onAddMeal,
  onRemoveMeal,
  onStartWorkout,
  onToggleSet,
  onUpdateSetField,
  onAddSet,
  onSubstitute,
  onFinishWorkout,
  onCancelWorkout,
}) => {
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);

  const handleStartTimer = useCallback((durationSec: number) => {
    setTimerEndMs(Date.now() + durationSec * 1000);
  }, []);

  const handleStopTimer = useCallback(() => {
    setTimerEndMs(null);
  }, []);

  const handleSetCheck = (exIdx: number, setIdx: number) => {
    const completedNow = onToggleSet(exIdx, setIdx);
    if (completedNow) {
      handleStartTimer(settings.defaultRestSec);
    }
  };

  const displaySplit: SplitDayType = activeWorkout ? activeWorkout.split : currentSplit;
  const meta = SPLIT_META[displaySplit];

  const liveTonnage = activeWorkout
    ? activeWorkout.exercises.reduce(
        (sum, ex) =>
          sum +
          ex.sets
            .filter((s) => s.completed && s.type === 'working')
            .reduce((acc, s) => acc + s.weight * s.reps, 0),
        0
      )
    : 0;

  const seq = CYCLE_SEQUENCES[cycle.mode];
  const upcomingTape = [0, 1, 2, 3].map(
    (offset) => seq[(cycle.currentStepIndex + offset) % seq.length]
  );

  return (
    <div className="space-y-4 pb-24">
      <DailyCheckInBar
        checkIn={todayCheckIn}
        settings={settings}
        onUpdateCheckIn={onUpdateCheckIn}
        onAddMeal={onAddMeal}
        onRemoveMeal={onRemoveMeal}
      />

      <div className="rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {(['2/1', '2/2'] as SplitMode[]).map((mode) => (
              <button
                key={mode}
                disabled={Boolean(activeWorkout)}
                onClick={() => onChangeSplitMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  cycle.mode === mode
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-[var(--tg-hint)] border-white/10 disabled:opacity-40'
                }`}
              >
                Сплит {mode}
              </button>
            ))}
          </div>

          {!activeWorkout && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onShiftCycle(-1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--tg-hint)] hover:text-white"
                title="Предыдущий день цикла"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-[var(--tg-hint)] px-1">Сдвиг</span>
              <button
                onClick={() => onShiftCycle(1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--tg-hint)] hover:text-white"
                title="Следующий день цикла"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">{meta.title}</h2>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.badge}`}>
                {displaySplit}
              </span>
            </div>
            <p className="text-xs text-[var(--tg-hint)] mt-0.5">{meta.subtitle}</p>
          </div>

          {activeWorkout && (
            <div className="text-right">
              <div className="text-[11px] text-[var(--tg-hint)]">Тоннаж</div>
              <div className="text-base font-mono font-bold text-emerald-400">
                {liveTonnage.toLocaleString()} кг
              </div>
            </div>
          )}
        </div>

        {!activeWorkout && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {upcomingTape.map((day, idx) => (
              <div
                key={idx}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border shrink-0 ${
                  idx === 0
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-[var(--tg-bg)] border-white/5 text-[var(--tg-hint)]'
                }`}
              >
                {idx === 0 ? `Сегодня: ${day}` : `+${idx}д: ${day}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeWorkout ? (
        <div className="space-y-3">
          <RestTimer
            endTimeMs={timerEndMs}
            defaultDurationSec={settings.defaultRestSec}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
          />

          {activeWorkout.exercises.map((ex, idx) => (
            <ExerciseCard
              key={`${ex.templateId}_${idx}`}
              exercise={ex}
              exerciseIndex={idx}
              template={program.find((p) => p.id === ex.templateId)}
              lastPerformance={storageService.getLastExercisePerformance(ex.templateId)}
              elbowStatus={todayCheckIn.elbowStatus}
              settings={settings}
              onToggleSet={handleSetCheck}
              onUpdateField={onUpdateSetField}
              onAddSet={onAddSet}
              onSubstitute={onSubstitute}
            />
          ))}

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={onCancelWorkout}
              className="col-span-1 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Отмена
            </button>
            <button
              onClick={onFinishWorkout}
              className="col-span-2 py-3.5 rounded-2xl bg-emerald-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-5 h-5" />
              Завершить тренировку
            </button>
          </div>
        </div>
      ) : currentSplit === 'REST' ? (
        <div className="rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base">Сегодня плановый день отдыха</h3>
          <p className="text-xs text-[var(--tg-hint)] max-w-xs mx-auto leading-relaxed">
            Держи профицит ~{settings.targetCalories} ккал, выпей 2–3 г креатина и дай связкам
            локтей восстановиться.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {(['PUSH', 'PULL', 'LEGS'] as const).map((sp) => (
              <button
                key={sp}
                onClick={() => onStartWorkout(sp)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                Внеплановый {sp}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => onStartWorkout()}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            Начать тренировку {currentSplit}
          </button>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--tg-hint)] px-1">
              Упражнения по плану ({program.filter((p) => p.split === currentSplit).length}):
            </div>
            {program
              .filter((p) => p.split === currentSplit)
              .map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="p-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-white/10 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      <span className="text-emerald-400 font-mono mr-1.5">{idx + 1}.</span>
                      {tpl.name}
                    </div>
                    <div className="text-[11px] text-[var(--tg-hint)] mt-0.5">
                      {tpl.sets
                        .map(
                          (s) =>
                            `${s.targetWeight}кг×${s.targetRepsMax}${
                              s.type === 'warmup' ? '(р)' : ''
                            }`
                        )
                        .join(' • ')}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
