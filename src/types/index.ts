export type SplitDayType = 'PUSH' | 'PULL' | 'LEGS' | 'REST';
export type SplitMode = '2/1' | '2/2';
export type ElbowStatus = 'green' | 'yellow' | 'red';
export type SetType = 'warmup' | 'working';

export const CYCLE_SEQUENCES: Record<SplitMode, SplitDayType[]> = {
  '2/1': ['PUSH', 'PULL', 'REST', 'LEGS', 'PUSH', 'REST', 'PULL', 'LEGS', 'REST'],
  '2/2': ['PUSH', 'PULL', 'REST', 'REST', 'LEGS', 'PUSH', 'REST', 'REST', 'PULL', 'LEGS', 'REST', 'REST'],
};

export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  allowedTelegramId?: string;
  defaultRestSec: 60 | 90 | 120;
  targetCalories: number;
  targetProtein: number;
}

export interface SetPlan {
  type: SetType;
  targetWeight: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface ExerciseTemplate {
  id: string;
  split: Exclude<SplitDayType, 'REST'>;
  name: string;
  muscleGroup: string;
  isElbowSensitive: boolean;
  notes?: string;
  sets: SetPlan[];
}

export interface LoggedSet {
  setIndex: number;
  type: SetType;
  weight: number;
  reps: number;
  completed: boolean;
  completedAt?: string;
}

export interface LoggedExercise {
  templateId: string;
  name: string;
  isSubstituted?: boolean;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  split: Exclude<SplitDayType, 'REST'>;
  startedAt: string;
  finishedAt?: string;
  elbowStatusAtStart: ElbowStatus;
  exercises: LoggedExercise[];
  totalTonnage: number;
  notes?: string;
}

export interface WorkoutIndexItem {
  id: string;
  date: string;
  split: Exclude<SplitDayType, 'REST'>;
  totalTonnage: number;
}

export interface MealEntry {
  id: string;
  time: string;
  dishName: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  source: 'photo_ai' | 'manual';
}

export interface DailyCheckIn {
  date: string;
  meals: MealEntry[];
  caloriesHit: boolean;
  proteinHit: boolean;
  creatineTaken: boolean;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  elbowStatus: ElbowStatus;
  bodyWeight?: number;
}

export interface CycleState {
  mode: SplitMode;
  currentStepIndex: number;
  lastAdvancedDate: string;
  activeDraft: WorkoutSession | null;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  settings: Omit<AppSettings, 'apiKey'>;
  program: ExerciseTemplate[];
  cycle: CycleState;
  workouts: WorkoutSession[];
  checkIns: Record<string, DailyCheckIn>;
}
