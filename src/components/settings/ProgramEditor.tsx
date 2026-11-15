import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { ExerciseTemplate, SetPlan, SplitDayType } from '../../types';
import { triggerHaptic } from '../../services/telegram';

interface ProgramEditorProps {
  program: ExerciseTemplate[];
  onSaveProgram: (next: ExerciseTemplate[]) => void;
  onResetProgram: () => void;
}

type TrainingSplit = Exclude<SplitDayType, 'REST'>;

const SPLITS: { id: TrainingSplit; label: string }[] = [
  { id: 'PUSH', label: 'PUSH' },
  { id: 'PULL', label: 'PULL' },
  { id: 'LEGS', label: 'LEGS' },
];

const MAX_NOTE_LENGTH = 180;

export const ProgramEditor: React.FC<ProgramEditorProps> = ({
  program,
  onSaveProgram,
  onResetProgram,
}) => {
  const [selectedSplit, setSelectedSplit] = useState<TrainingSplit>('PUSH');
  const [draftProgram, setDraftProgram] = useState<ExerciseTemplate[]>(program);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    setDraftProgram(program);
    setHasChanges(false);
  }, [program]);

  const splitExercises = useMemo(
    () => draftProgram.filter((ex) => ex.split === selectedSplit),
    [draftProgram, selectedSplit]
  );

  const cloudBytesUsed = useMemo(
    () => new TextEncoder().encode(JSON.stringify(draftProgram)).length,
    [draftProgram]
  );
  const isOverCloudLimit = cloudBytesUsed > 4000;

  const applyDraftUpdate = (updater: (prev: ExerciseTemplate[]) => ExerciseTemplate[]) => {
    setDraftProgram((prev) => updater(prev));
    setHasChanges(true);
    setSavedBanner(false);
  };

  const handleMoveExercise = (exerciseId: string, direction: -1 | 1) => {
    applyDraftUpdate((prev) => {
      const splitItems = prev.filter((e) => e.split === selectedSplit);
      const idx = splitItems.findIndex((e) => e.id === exerciseId);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= splitItems.length) return prev;

      const reordered = [...splitItems];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(targetIdx, 0, moved);

      let cursor = 0;
      return prev.map((item) => (item.split === selectedSplit ? reordered[cursor++] : item));
    });
    triggerHaptic('light');
  };

  const handleUpdateExercise = (id: string, patch: Partial<ExerciseTemplate>) => {
    applyDraftUpdate((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
  };

  const handleDeleteExercise = (id: string) => {
    applyDraftUpdate((prev) => prev.filter((ex) => ex.id !== id));
    if (expandedId === id) setExpandedId(null);
    triggerHaptic('warning');
  };

  const handleAddExercise = () => {
    const newId = `${selectedSplit.toLowerCase()}_${Date.now()}`;
    const newExercise: ExerciseTemplate = {
      id: newId,
      split: selectedSplit,
      name: 'Новое упражнение',
      muscleGroup: 'Целевая группа',
      isElbowSensitive: false,
      notes: '',
      sets: [
        { type: 'working', targetWeight: 10, targetRepsMin: 10, targetRepsMax: 12 },
        { type: 'working', targetWeight: 10, targetRepsMin: 10, targetRepsMax: 12 },
        { type: 'working', targetWeight: 10, targetRepsMin: 10, targetRepsMax: 12 },
      ],
    };

    applyDraftUpdate((prev) => [...prev, newExercise]);
    setExpandedId(newId);
    triggerHaptic('medium');
  };

  const handleUpdateSet = (exId: string, setIdx: number, patch: Partial<SetPlan>) => {
    applyDraftUpdate((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const nextSets = ex.sets.map((s, idx) => (idx === setIdx ? { ...s, ...patch } : s));
        return { ...ex, sets: nextSets };
      })
    );
  };

  const handleAddSet = (exId: string) => {
    applyDraftUpdate((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const nextSet: SetPlan = last
          ? { ...last, type: 'working' }
          : { type: 'working', targetWeight: 10, targetRepsMin: 10, targetRepsMax: 12 };
        return { ...ex, sets: [...ex.sets, nextSet] };
      })
    );
    triggerHaptic('light');
  };

  const handleRemoveSet = (exId: string, setIdx: number) => {
    applyDraftUpdate((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, idx) => idx !== setIdx) };
      })
    );
    triggerHaptic('light');
  };

  const handleSaveAll = () => {
    if (isOverCloudLimit) return;
    const normalized = draftProgram.map((ex) => ({
      ...ex,
      notes: ex.notes?.trim() || undefined,
    }));
    onSaveProgram(normalized);
    setHasChanges(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleReset = () => {
    onResetProgram();
    setExpandedId(null);
    setHasChanges(false);
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--tg-secondary-bg)] border border-white/10">
        {SPLITS.map((sp) => {
          const count = draftProgram.filter((e) => e.split === sp.id).length;
          const isActive = selectedSplit === sp.id;
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => {
                setSelectedSplit(sp.id);
                triggerHaptic('light');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-black'
                  : 'text-[var(--tg-hint)] hover:text-white'
              }`}
            >
              {sp.label} ({count})
            </button>
          );
        })}
      </div>

      {isOverCloudLimit && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
          Превышен лимит Telegram CloudStorage ({cloudBytesUsed} / 4096 байт). Сократи заметки или
          удали лишние упражнения перед сохранением.
        </div>
      )}

      <div className="space-y-2.5">
        {splitExercises.map((ex, index) => {
          const isExpanded = expandedId === ex.id;
          const hasNote = Boolean(ex.notes?.trim());
          const setsPreview = ex.sets
            .map(
              (s) =>
                `${s.targetWeight}кг×${
                  s.targetRepsMin === s.targetRepsMax
                    ? s.targetRepsMax
                    : `${s.targetRepsMin}-${s.targetRepsMax}`
                }${s.type === 'warmup' ? '(р)' : ''}`
            )
            .join(' • ');

          return (
            <div
              key={ex.id}
              className="rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 overflow-hidden"
            >
              <div className="p-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-bold text-white truncate">{ex.name}</span>
                    {ex.isElbowSensitive && (
                      <span title="Учитывается в режиме защиты локтей" className="shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    )}
                    {hasNote && (
                      <span title="Есть заметка по технике" className="shrink-0">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--tg-hint)] truncate mt-0.5">
                    {setsPreview}
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveExercise(ex.id, -1)}
                    className="p-1.5 rounded-lg bg-white/5 disabled:opacity-25 text-[var(--tg-hint)] hover:text-white"
                    title="Поднять выше"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === splitExercises.length - 1}
                    onClick={() => handleMoveExercise(ex.id, 1)}
                    className="p-1.5 rounded-lg bg-white/5 disabled:opacity-25 text-[var(--tg-hint)] hover:text-white"
                    title="Опустить ниже"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                    className="p-1.5 rounded-lg bg-white/5 text-[var(--tg-hint)] hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 pt-2 border-t border-white/10 bg-[var(--tg-bg)]/50 space-y-3">
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--tg-hint)] mb-1">
                        Название упражнения
                      </label>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => handleUpdateExercise(ex.id, { name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-[var(--tg-hint)] mb-1">
                          Группа мышц
                        </label>
                        <input
                          type="text"
                          value={ex.muscleGroup}
                          onChange={(e) =>
                            handleUpdateExercise(ex.id, { muscleGroup: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExercise(ex.id, {
                              isElbowSensitive: !ex.isElbowSensitive,
                            })
                          }
                          className={`w-full py-2 px-2.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            ex.isElbowSensitive
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-[var(--tg-bg)] border-white/10 text-[var(--tg-hint)]'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          Нагрузка на локти
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-[var(--tg-hint)]">
                          Заметка по технике (покажется в тренировке)
                        </label>
                        <span className="text-[10px] font-mono text-[var(--tg-hint)]">
                          {(ex.notes || '').length}/{MAX_NOTE_LENGTH}
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={MAX_NOTE_LENGTH}
                        value={ex.notes || ''}
                        onChange={(e) => handleUpdateExercise(ex.id, { notes: e.target.value })}
                        placeholder="Например: Пауза 1 сек в нижней точке, локти не разводить..."
                        className="w-full px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-xs text-gray-200 placeholder:text-white/25 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-1 px-1 text-[10px] text-[var(--tg-hint)] font-semibold">
                      <div className="col-span-3">Тип</div>
                      <div className="col-span-4 text-center">Вес (кг)</div>
                      <div className="col-span-2 text-center">От</div>
                      <div className="col-span-2 text-center">До</div>
                      <div className="col-span-1" />
                    </div>

                    {ex.sets.map((set, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-12 gap-1 items-center">
                        <div className="col-span-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSet(ex.id, sIdx, {
                                type: set.type === 'warmup' ? 'working' : 'warmup',
                              })
                            }
                            className={`w-full py-1.5 rounded-lg text-[10px] font-bold border ${
                              set.type === 'warmup'
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {set.type === 'warmup' ? 'Разм' : 'Раб'}
                          </button>
                        </div>

                        <div className="col-span-4">
                          <input
                            type="number"
                            step="0.5"
                            inputMode="decimal"
                            value={set.targetWeight}
                            onChange={(e) =>
                              handleUpdateSet(ex.id, sIdx, {
                                targetWeight: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full py-1.5 px-1 rounded-lg bg-[var(--tg-bg)] border border-white/10 text-center text-xs font-mono font-bold text-white"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.targetRepsMin}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 1;
                              handleUpdateSet(ex.id, sIdx, {
                                targetRepsMin: val,
                                targetRepsMax: Math.max(val, set.targetRepsMax),
                              });
                            }}
                            className="w-full py-1.5 px-1 rounded-lg bg-[var(--tg-bg)] border border-white/10 text-center text-xs font-mono text-white"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.targetRepsMax}
                            onChange={(e) =>
                              handleUpdateSet(ex.id, sIdx, {
                                targetRepsMax: Math.max(
                                  set.targetRepsMin,
                                  parseInt(e.target.value, 10) || 1
                                ),
                              })
                            }
                            className="w-full py-1.5 px-1 rounded-lg bg-[var(--tg-bg)] border border-white/10 text-center text-xs font-mono text-white"
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            disabled={ex.sets.length <= 1}
                            onClick={() => handleRemoveSet(ex.id, sIdx)}
                            className="p-1 text-[var(--tg-hint)] hover:text-red-400 disabled:opacity-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-emerald-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Подход
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить упражнение
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAddExercise}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/50 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Добавить упражнение в {selectedSplit}
      </button>

      <div className="pt-2 space-y-2">
        <button
          type="button"
          disabled={!hasChanges || isOverCloudLimit}
          onClick={handleSaveAll}
          className="w-full py-3 rounded-xl bg-emerald-500 disabled:opacity-40 text-black font-bold text-sm flex items-center justify-center gap-2 transition-opacity"
        >
          <Save className="w-4 h-4" />
          {hasChanges ? 'Сохранить изменения программы' : 'Программа актуальна'}
        </button>

        {savedBanner && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Новые веса, заметки и упражнения сохранены
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-[11px] text-[var(--tg-hint)] flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Сбросить к стартовой программе (PUSH 12.5 / 15 / 10 / 20 / 35–40 кг)
        </button>
      </div>
    </div>
  );
};
