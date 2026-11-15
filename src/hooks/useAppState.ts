import { useCallback, useEffect, useState } from 'react';
import { SEED_PROGRAM } from '../data/seedProgram';
import { CoachContext } from '../prompts/coachPrompt';
import { getTodayDateStr, storageService } from '../services/storage';
import { triggerHaptic } from '../services/telegram';
import {
  AppSettings,
  CycleState,
  DailyCheckIn,
  ExerciseTemplate,
  LoggedExercise,
  LoggedSet,
  MealEntry,
  SplitDayType,
  SplitMode,
  WorkoutSession,
} from '../types';

export function useAppState() {
  const [isSyncingCloud, setIsSyncingCloud] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [program, setProgram] = useState<ExerciseTemplate[]>(() => storageService.getProgram());
  const [cycle, setCycle] = useState<CycleState>(() => storageService.getCycleState());
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn>(() =>
    storageService.getDailyCheckIn()
  );
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>(() =>
    storageService.getRecentWorkouts(30)
  );

  const reloadAllFromLocal = useCallback(() => {
    setSettings(storageService.getSettings());
    setProgram(storageService.getProgram());
    setCycle(storageService.getCycleState());
    setTodayCheckIn(storageService.getDailyCheckIn());
    setRecentWorkouts(storageService.getRecentWorkouts(30));
  }, []);

  useEffect(() => {
    let mounted = true;
    storageService
      .hydrateFromCloud()
      .then((updated) => {
        if (mounted && updated) {
          reloadAllFromLocal();
        }
      })
      .finally(() => {
        if (mounted) setIsSyncingCloud(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadAllFromLocal]);

  const currentSplit: SplitDayType = storageService.getCurrentSplitDay(cycle);

  const updateSettings = useCallback((next: AppSettings) => {
    storageService.saveSettings(next);
    setSettings(next);
    triggerHaptic('success');
  }, []);

  const updateProgram = useCallback((nextProgram: ExerciseTemplate[]) => {
    storageService.saveProgram(nextProgram);
    setProgram(nextProgram);
    triggerHaptic('success');
  }, []);

  const resetProgram = useCallback(() => {
    storageService.saveProgram(SEED_PROGRAM);
    setProgram(SEED_PROGRAM);
    triggerHaptic('warning');
  }, []);

  const shiftCycle = useCallback((delta: number) => {
    const next = storageService.shiftCycleStep(delta);
    setCycle(next);
    triggerHaptic('light');
  }, []);

  const changeSplitMode = useCallback((mode: SplitMode) => {
    const next = storageService.setSplitMode(mode);
    setCycle(next);
    triggerHaptic('medium');
  }, []);

  const updateCheckIn = useCallback((patch: Partial<DailyCheckIn>) => {
    setTodayCheckIn((prev) => {
      const merged: DailyCheckIn = { ...prev, ...patch };
      storageService.saveDailyCheckIn(merged);
      return storageService.getDailyCheckIn(merged.date);
    });
    triggerHaptic('light');
  }, []);

  const addMealEntry = useCallback((meal: Omit<MealEntry, 'id' | 'time'>) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;
    const entry: MealEntry = {
      ...meal,
      id: `meal_${Date.now()}`,
      time,
    };

    setTodayCheckIn((prev) => {
      const updated: DailyCheckIn = {
        ...prev,
        meals: [...prev.meals, entry],
      };
      storageService.saveDailyCheckIn(updated);
      return storageService.getDailyCheckIn(updated.date);
    });
    triggerHaptic('success');
  }, []);

  const removeMealEntry = useCallback((mealId: string) => {
    setTodayCheckIn((prev) => {
      const updated: DailyCheckIn = {
        ...prev,
        meals: prev.meals.filter((m) => m.id !== mealId),
      };
      storageService.saveDailyCheckIn(updated);
      return storageService.getDailyCheckIn(updated.date);
    });
    triggerHaptic('light');
  }, []);

  const startWorkout = useCallback(
    (overrideSplit?: Exclude<SplitDayType, 'REST'>) => {
      const targetSplit = overrideSplit || (currentSplit !== 'REST' ? currentSplit : 'PUSH');
      const templates = program.filter((p) => p.split === targetSplit);
      const isYellowElbow = todayCheckIn.elbowStatus === 'yellow';

      const exercises: LoggedExercise[] = templates.map((tpl) => {
        const lastPerf = storageService.getLastExercisePerformance(tpl.id);
        const mappedSets: LoggedSet[] = tpl.sets.map((planSet, idx) => {
          const prevSet = lastPerf?.sets[idx];
          return {
            setIndex: idx,
            type: planSet.type,
            weight: prevSet ? prevSet.weight : planSet.targetWeight,
            reps: prevSet ? prevSet.reps : planSet.targetRepsMax,
            completed: false,
          };
        });

        const hasWarmup = mappedSets.some((s) => s.type === 'warmup');
        if (isYellowElbow && tpl.isElbowSensitive && !hasWarmup && mappedSets.length > 0) {
          const firstWorkingWeight = mappedSets[0].weight;
          const warmupWeight = Math.max(2.5, Math.round((firstWorkingWeight * 0.5) / 2.5) * 2.5);
          mappedSets.unshift({
            setIndex: -1,
            type: 'warmup',
            weight: warmupWeight,
            reps: 15,
            completed: false,
          });
        }

        return {
          templateId: tpl.id,
          name: tpl.name,
          sets: mappedSets.map((s, idx) => ({ ...s, setIndex: idx })),
        };
      });

      const draft: WorkoutSession = {
        id: `${getTodayDateStr()}_${Date.now()}`,
        date: getTodayDateStr(),
        split: targetSplit,
        startedAt: new Date().toISOString(),
        elbowStatusAtStart: todayCheckIn.elbowStatus,
        exercises,
        totalTonnage: 0,
      };

      const nextCycle = storageService.saveActiveDraft(draft);
      setCycle(nextCycle);
      triggerHaptic('medium');
    },
    [currentSplit, program, todayCheckIn.elbowStatus]
  );

  const updateActiveDraft = useCallback((updater: (draft: WorkoutSession) => WorkoutSession) => {
    setCycle((prev) => {
      if (!prev.activeDraft) return prev;
      const nextDraft = updater(prev.activeDraft);
      return storageService.saveActiveDraft(nextDraft);
    });
  }, []);

  const toggleSetCompleted = useCallback(
    (exerciseIdx: number, setIdx: number): boolean => {
      let becameCompleted = false;
      updateActiveDraft((draft) => {
        const exercises = draft.exercises.map((ex, eIdx) => {
          if (eIdx !== exerciseIdx) return ex;
          const sets = ex.sets.map((s, sIdx) => {
            if (sIdx !== setIdx) return s;
            becameCompleted = !s.completed;
            return {
              ...s,
              completed: becameCompleted,
              completedAt: becameCompleted ? new Date().toISOString() : undefined,
            };
          });
          return { ...ex, sets };
        });
        return { ...draft, exercises };
      });
      triggerHaptic(becameCompleted ? 'success' : 'light');
      return becameCompleted;
    },
    [updateActiveDraft]
  );

  const updateSetField = useCallback(
    (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', value: number) => {
      updateActiveDraft((draft) => {
        const exercises = draft.exercises.map((ex, eIdx) => {
          if (eIdx !== exerciseIdx) return ex;
          const sets = ex.sets.map((s, sIdx) =>
            sIdx === setIdx ? { ...s, [field]: Math.max(0, value) } : s
          );
          return { ...ex, sets };
        });
        return { ...draft, exercises };
      });
    },
    [updateActiveDraft]
  );

  const addSetToExercise = useCallback(
    (exerciseIdx: number) => {
      updateActiveDraft((draft) => {
        const exercises = draft.exercises.map((ex, eIdx) => {
          if (eIdx !== exerciseIdx) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: LoggedSet = {
            setIndex: ex.sets.length,
            type: 'working',
            weight: lastSet ? lastSet.weight : 10,
            reps: lastSet ? lastSet.reps : 10,
            completed: false,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        });
        return { ...draft, exercises };
      });
      triggerHaptic('light');
    },
    [updateActiveDraft]
  );

  const substituteExercise = useCallback(
    (exerciseIdx: number, newExerciseName: string) => {
      updateActiveDraft((draft) => {
        const exercises = draft.exercises.map((ex, eIdx) =>
          eIdx === exerciseIdx
            ? { ...ex, name: newExerciseName.trim(), isSubstituted: true }
            : ex
        );
        return { ...draft, exercises };
      });
      triggerHaptic('medium');
    },
    [updateActiveDraft]
  );

  const finishWorkout = useCallback(() => {
    if (!cycle.activeDraft) return;
    storageService.completeWorkout(cycle.activeDraft);
    const nextCycle = storageService.shiftCycleStep(1);
    setCycle(nextCycle);
    setProgram(storageService.getProgram());
    setRecentWorkouts(storageService.getRecentWorkouts(30));
    triggerHaptic('success');
  }, [cycle.activeDraft]);

  const cancelWorkout = useCallback(() => {
    const nextCycle = storageService.saveActiveDraft(null);
    setCycle(nextCycle);
    triggerHaptic('warning');
  }, []);

  const buildCoachContext = useCallback((): CoachContext => {
    return {
      todayDate: getTodayDateStr(),
      currentSplit,
      cycle,
      todayCheckIn,
      activeWorkout: cycle.activeDraft,
      lastWorkouts: recentWorkouts,
      program,
      targetCalories: settings.targetCalories,
      targetProtein: settings.targetProtein,
    };
  }, [currentSplit, cycle, todayCheckIn, recentWorkouts, program, settings]);

  return {
    isSyncingCloud,
    settings,
    updateSettings,
    program,
    updateProgram,
    resetProgram,
    cycle,
    currentSplit,
    shiftCycle,
    changeSplitMode,
    todayCheckIn,
    updateCheckIn,
    addMealEntry,
    removeMealEntry,
    activeWorkout: cycle.activeDraft,
    startWorkout,
    toggleSetCompleted,
    updateSetField,
    addSetToExercise,
    substituteExercise,
    finishWorkout,
    cancelWorkout,
    recentWorkouts,
    reloadAllFromLocal,
    buildCoachContext,
  };
}
