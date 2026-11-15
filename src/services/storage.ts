import { DEFAULT_SETTINGS, INITIAL_CYCLE_STATE, SEED_PROGRAM } from '../data/seedProgram';
import {
  AppSettings,
  BackupPayload,
  CYCLE_SEQUENCES,
  CycleState,
  DailyCheckIn,
  ExerciseTemplate,
  SplitDayType,
  SplitMode,
  WorkoutIndexItem,
  WorkoutSession,
} from '../types';
import { cloudGetItem, cloudGetKeys, cloudSetItem } from './telegram';

const KEYS = {
  SETTINGS: 'tma_settings',
  PROGRAM: 'tma_program',
  CYCLE: 'tma_cycle',
  WO_INDEX: 'tma_wo_index',
  WO_PREFIX: 'tma_wo_',
  CI_PREFIX: 'tma_ci_',
} as const;

export function getTodayDateStr(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeHybrid<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data);
  localStorage.setItem(key, serialized);
  void cloudSetItem(key, serialized);
}

export const storageService = {
  async hydrateFromCloud(): Promise<boolean> {
    const keys = await cloudGetKeys();
    if (keys.length === 0) {
      this.ensureSeeded();
      return false;
    }

    let updated = false;
    for (const key of keys) {
      if (!key.startsWith('tma_')) continue;
      const cloudVal = await cloudGetItem(key);
      if (cloudVal && localStorage.getItem(key) !== cloudVal) {
        localStorage.setItem(key, cloudVal);
        updated = true;
      }
    }
    this.ensureSeeded();
    return updated;
  },

  ensureSeeded(): void {
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      writeHybrid(KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(KEYS.PROGRAM)) {
      writeHybrid(KEYS.PROGRAM, SEED_PROGRAM);
    }
    if (!localStorage.getItem(KEYS.CYCLE)) {
      writeHybrid(KEYS.CYCLE, INITIAL_CYCLE_STATE(getTodayDateStr()));
    }
    if (!localStorage.getItem(KEYS.WO_INDEX)) {
      writeHybrid(KEYS.WO_INDEX, [] as WorkoutIndexItem[]);
    }
  },

  getSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...readLocal<Partial<AppSettings>>(KEYS.SETTINGS, {}) };
  },

  saveSettings(settings: AppSettings): void {
    writeHybrid(KEYS.SETTINGS, settings);
  },

  getProgram(): ExerciseTemplate[] {
    return readLocal<ExerciseTemplate[]>(KEYS.PROGRAM, SEED_PROGRAM);
  },

  saveProgram(program: ExerciseTemplate[]): void {
    writeHybrid(KEYS.PROGRAM, program);
  },

  getCycleState(): CycleState {
    const today = getTodayDateStr();
    const state = readLocal<CycleState>(KEYS.CYCLE, INITIAL_CYCLE_STATE(today));
    const seq = CYCLE_SEQUENCES[state.mode];

    if (state.lastAdvancedDate !== today && !state.activeDraft) {
      const daysDiff = Math.max(
        1,
        Math.round(
          (new Date(today).getTime() - new Date(state.lastAdvancedDate).getTime()) / 86_400_000
        )
      );
      const nextState: CycleState = {
        ...state,
        currentStepIndex: (state.currentStepIndex + daysDiff) % seq.length,
        lastAdvancedDate: today,
      };
      writeHybrid(KEYS.CYCLE, nextState);
      return nextState;
    }

    return state;
  },

  getCurrentSplitDay(cycle: CycleState): SplitDayType {
    const seq = CYCLE_SEQUENCES[cycle.mode];
    return seq[cycle.currentStepIndex % seq.length];
  },

  shiftCycleStep(delta: number): CycleState {
    const state = this.getCycleState();
    const seq = CYCLE_SEQUENCES[state.mode];
    const nextIndex = (state.currentStepIndex + delta + seq.length * 10) % seq.length;
    const updated: CycleState = {
      ...state,
      currentStepIndex: nextIndex,
      lastAdvancedDate: getTodayDateStr(),
    };
    writeHybrid(KEYS.CYCLE, updated);
    return updated;
  },

  setSplitMode(mode: SplitMode): CycleState {
    const state = this.getCycleState();
    const updated: CycleState = {
      ...state,
      mode,
      currentStepIndex: 0,
      lastAdvancedDate: getTodayDateStr(),
    };
    writeHybrid(KEYS.CYCLE, updated);
    return updated;
  },

  saveActiveDraft(draft: WorkoutSession | null): CycleState {
    const state = this.getCycleState();
    const updated: CycleState = { ...state, activeDraft: draft };
    writeHybrid(KEYS.CYCLE, updated);
    return updated;
  },

  getWorkoutIndex(): WorkoutIndexItem[] {
    return readLocal<WorkoutIndexItem[]>(KEYS.WO_INDEX, []);
  },

  getWorkoutById(id: string): WorkoutSession | null {
    return readLocal<WorkoutSession | null>(`${KEYS.WO_PREFIX}${id}`, null);
  },

  getRecentWorkouts(limit = 6): WorkoutSession[] {
    const index = this.getWorkoutIndex();
    return index
      .slice(-limit)
      .reverse()
      .map((item) => this.getWorkoutById(item.id))
      .filter((w): w is WorkoutSession => Boolean(w));
  },

  getLastExercisePerformance(templateId: string): WorkoutSession['exercises'][0] | null {
    const recent = this.getRecentWorkouts(15);
    for (const session of recent) {
      const found = session.exercises.find((e) => e.templateId === templateId);
      if (found && found.sets.some((s) => s.completed)) {
        return found;
      }
    }
    return null;
  },

  completeWorkout(session: WorkoutSession): void {
    const totalTonnage = session.exercises.reduce((sum, ex) => {
      const exVolume = ex.sets
        .filter((s) => s.completed && s.type === 'working')
        .reduce((acc, s) => acc + s.weight * s.reps, 0);
      return sum + exVolume;
    }, 0);

    const finalized: WorkoutSession = {
      ...session,
      finishedAt: new Date().toISOString(),
      totalTonnage,
    };

    writeHybrid(`${KEYS.WO_PREFIX}${finalized.id}`, finalized);

    const index = this.getWorkoutIndex().filter((i) => i.id !== finalized.id);
    index.push({
      id: finalized.id,
      date: finalized.date,
      split: finalized.split,
      totalTonnage,
    });
    writeHybrid(KEYS.WO_INDEX, index);

    const program = this.getProgram();
    const updatedProgram = program.map((tpl) => {
      const doneEx = finalized.exercises.find((e) => e.templateId === tpl.id);
      if (!doneEx || doneEx.isSubstituted) return tpl;
      const nextSets = tpl.sets.map((planSet, idx) => {
        const logged = doneEx.sets[idx];
        if (logged && logged.completed && logged.weight > 0) {
          return { ...planSet, targetWeight: logged.weight };
        }
        return planSet;
      });
      return { ...tpl, sets: nextSets };
    });
    this.saveProgram(updatedProgram);

    this.saveActiveDraft(null);
  },

  getDailyCheckIn(date = getTodayDateStr()): DailyCheckIn {
    const fallback: DailyCheckIn = {
      date,
      meals: [],
      caloriesHit: false,
      proteinHit: false,
      creatineTaken: false,
      sleepQuality: 4,
      elbowStatus: 'yellow',
    };
    return { ...fallback, ...readLocal<Partial<DailyCheckIn>>(`${KEYS.CI_PREFIX}${date}`, {}) };
  },

  saveDailyCheckIn(checkIn: DailyCheckIn): void {
    const settings = this.getSettings();
    const totalKcal = checkIn.meals.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein = checkIn.meals.reduce((sum, m) => sum + m.protein, 0);

    const enriched: DailyCheckIn = {
      ...checkIn,
      caloriesHit: checkIn.caloriesHit || totalKcal >= settings.targetCalories * 0.95,
      proteinHit: checkIn.proteinHit || totalProtein >= settings.targetProtein * 0.9,
    };
    writeHybrid(`${KEYS.CI_PREFIX}${enriched.date}`, enriched);
  },

  exportBackupJson(): string {
    const settings = this.getSettings();
    const { apiKey: _omitted, ...safeSettings } = settings;

    const workouts = this.getWorkoutIndex()
      .map((item) => this.getWorkoutById(item.id))
      .filter((w): w is WorkoutSession => Boolean(w));

    const checkIns: Record<string, DailyCheckIn> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.CI_PREFIX)) {
        const date = k.replace(KEYS.CI_PREFIX, '');
        checkIns[date] = this.getDailyCheckIn(date);
      }
    }

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      program: this.getProgram(),
      cycle: this.getCycleState(),
      workouts,
      checkIns,
    };

    return JSON.stringify(payload, null, 2);
  },

  importBackupJson(rawJson: string): void {
    const parsed = JSON.parse(rawJson) as BackupPayload;
    if (parsed.version !== 1 || !Array.isArray(parsed.workouts) || !Array.isArray(parsed.program)) {
      throw new Error('Неверный формат файла резервной копии.');
    }

    const currentSettings = this.getSettings();
    this.saveSettings({
      ...currentSettings,
      ...parsed.settings,
      apiKey: currentSettings.apiKey,
    });
    this.saveProgram(parsed.program);
    writeHybrid(KEYS.CYCLE, parsed.cycle);

    const newIndex: WorkoutIndexItem[] = [];
    for (const wo of parsed.workouts) {
      writeHybrid(`${KEYS.WO_PREFIX}${wo.id}`, wo);
      newIndex.push({
        id: wo.id,
        date: wo.date,
        split: wo.split,
        totalTonnage: wo.totalTonnage,
      });
    }
    writeHybrid(KEYS.WO_INDEX, newIndex);

    for (const [date, ci] of Object.entries(parsed.checkIns || {})) {
      writeHybrid(`${KEYS.CI_PREFIX}${date}`, ci);
    }
  },
};
