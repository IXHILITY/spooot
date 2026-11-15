import { AppSettings, CycleState, ExerciseTemplate } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  model: 'hydrogen-4',
  allowedTelegramId: '',
  defaultRestSec: 90,
  targetCalories: 3000,
  targetProtein: 170,
};

export const INITIAL_CYCLE_STATE = (todayDate: string): CycleState => ({
  mode: '2/1',
  currentStepIndex: 0,
  lastAdvancedDate: todayDate,
  activeDraft: null,
});

export const SEED_PROGRAM: ExerciseTemplate[] = [
  // ==================== PUSH (твои рабочие веса) ====================
  {
    id: 'push-incline-db-press',
    split: 'PUSH',
    name: 'Жим гантелей на наклонной скамье 30°',
    muscleGroup: 'Верх груди',
    isElbowSensitive: true,
    notes: 'В верхней точке оставлять 5–10° сгиба, не сталкивать гантели в замок.',
    sets: [
      { type: 'warmup', targetWeight: 7.5, targetRepsMin: 10, targetRepsMax: 10 },
      { type: 'working', targetWeight: 12.5, targetRepsMin: 8, targetRepsMax: 12 },
      { type: 'working', targetWeight: 12.5, targetRepsMin: 8, targetRepsMax: 12 },
      { type: 'working', targetWeight: 12.5, targetRepsMin: 8, targetRepsMax: 12 },
    ],
  },
  {
    id: 'push-pec-deck',
    split: 'PUSH',
    name: 'Сведение рук в тренажёре «Бабочка» (Pec Deck)',
    muscleGroup: 'Грудь (изоляция)',
    isElbowSensitive: false,
    notes: 'Локти слегка подсогнуты и зафиксированы на протяжении всей амплитуды.',
    sets: [
      { type: 'working', targetWeight: 15, targetRepsMin: 9, targetRepsMax: 12 },
      { type: 'working', targetWeight: 15, targetRepsMin: 9, targetRepsMax: 12 },
      { type: 'working', targetWeight: 15, targetRepsMin: 9, targetRepsMax: 12 },
    ],
  },
  {
    id: 'push-machine-lateral-raise',
    split: 'PUSH',
    name: 'Махи в стороны в тренажёре (средняя дельта)',
    muscleGroup: 'Средняя дельта',
    isElbowSensitive: false,
    notes: 'Подъём до параллели с полом, плавный возврат без броска.',
    sets: [
      { type: 'working', targetWeight: 10, targetRepsMin: 12, targetRepsMax: 12 },
      { type: 'working', targetWeight: 10, targetRepsMin: 12, targetRepsMax: 12 },
      { type: 'working', targetWeight: 10, targetRepsMin: 12, targetRepsMax: 12 },
      { type: 'working', targetWeight: 10, targetRepsMin: 12, targetRepsMax: 12 },
    ],
  },
  {
    id: 'push-machine-shoulder-press',
    split: 'PUSH',
    name: 'Жим на плечи сидя в тренажёре (Shoulder Press)',
    muscleGroup: 'Передняя / средняя дельта',
    isElbowSensitive: true,
    notes: 'Не выключать локти в верхней точке.',
    sets: [
      { type: 'working', targetWeight: 10, targetRepsMin: 8, targetRepsMax: 12 },
      { type: 'working', targetWeight: 10, targetRepsMin: 8, targetRepsMax: 12 },
      { type: 'working', targetWeight: 10, targetRepsMin: 8, targetRepsMax: 12 },
    ],
  },
  {
    id: 'push-rope-pushdown',
    split: 'PUSH',
    name: 'Разгибания на верхнем блоке с канатом (трицепс)',
    muscleGroup: 'Трицепс',
    isElbowSensitive: true,
    notes: 'При жёлтом статусе локтей — мягкая амплитуда без жёсткого переразгибания.',
    sets: [
      { type: 'warmup', targetWeight: 15, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 20, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 20, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 20, targetRepsMin: 15, targetRepsMax: 15 },
    ],
  },
  {
    id: 'push-abdominal-machine',
    split: 'PUSH',
    name: 'Тренажёр на пресс (Abdominal)',
    muscleGroup: 'Пресс',
    isElbowSensitive: false,
    notes: 'Ступенчатая прогрессия веса в последних подходах.',
    sets: [
      { type: 'working', targetWeight: 35, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 35, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 35, targetRepsMin: 20, targetRepsMax: 20 },
      { type: 'working', targetWeight: 40, targetRepsMin: 20, targetRepsMax: 20 },
    ],
  },

  // ==================== PULL (спина, бицепс) ====================
  {
    id: 'pull-lat-pulldown',
    split: 'PULL',
    name: 'Тяга верхнего блока широким хватом к груди',
    muscleGroup: 'Широчайшие',
    isElbowSensitive: false,
    notes: 'Тяни локти вниз и чуть вперёд, без раскачки корпуса.',
    sets: [
      { type: 'warmup', targetWeight: 25, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 40, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 40, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 40, targetRepsMin: 10, targetRepsMax: 12 },
    ],
  },
  {
    id: 'pull-seated-cable-row',
    split: 'PULL',
    name: 'Тяга горизонтального блока к поясу (узкий хват)',
    muscleGroup: 'Середина спины',
    isElbowSensitive: false,
    notes: 'Пауза 1 сек на сведении лопаток.',
    sets: [
      { type: 'working', targetWeight: 35, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 35, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 35, targetRepsMin: 10, targetRepsMax: 12 },
    ],
  },
  {
    id: 'pull-rear-delt-fly',
    split: 'PULL',
    name: 'Обратные разведения в тренажёре (задняя дельта)',
    muscleGroup: 'Задняя дельта',
    isElbowSensitive: false,
    sets: [
      { type: 'working', targetWeight: 15, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 15, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 15, targetRepsMin: 12, targetRepsMax: 15 },
    ],
  },
  {
    id: 'pull-cable-bicep-curl',
    split: 'PULL',
    name: 'Сгибания рук на бицепс на нижнем блоке',
    muscleGroup: 'Бицепс',
    isElbowSensitive: true,
    notes: 'Не бросать вес в нижней точке, чтобы не дёргать сухожилие бицепса.',
    sets: [
      { type: 'warmup', targetWeight: 10, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 15, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 15, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 15, targetRepsMin: 10, targetRepsMax: 12 },
    ],
  },
  {
    id: 'pull-hammer-curl',
    split: 'PULL',
    name: 'Молотки с гантелями сидя',
    muscleGroup: 'Брахиалис / предплечья',
    isElbowSensitive: true,
    notes: 'Нейтральный хват снижает нагрузку на локтевые связки.',
    sets: [
      { type: 'working', targetWeight: 8, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 8, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 8, targetRepsMin: 10, targetRepsMax: 12 },
    ],
  },

  // ==================== LEGS (ноги, пресс) ====================
  {
    id: 'legs-leg-press',
    split: 'LEGS',
    name: 'Жим ногами в тренажёре',
    muscleGroup: 'Квадрицепс / ягодичные',
    isElbowSensitive: false,
    notes: 'Колени в верхней точке не выключать в замок.',
    sets: [
      { type: 'warmup', targetWeight: 40, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 80, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 80, targetRepsMin: 10, targetRepsMax: 12 },
      { type: 'working', targetWeight: 80, targetRepsMin: 10, targetRepsMax: 12 },
    ],
  },
  {
    id: 'legs-leg-extension',
    split: 'LEGS',
    name: 'Разгибания ног сидя в тренажёре',
    muscleGroup: 'Квадрицепс (изоляция)',
    isElbowSensitive: false,
    sets: [
      { type: 'working', targetWeight: 30, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 30, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 30, targetRepsMin: 12, targetRepsMax: 15 },
    ],
  },
  {
    id: 'legs-leg-curl',
    split: 'LEGS',
    name: 'Сгибания ног лёжа в тренажёре',
    muscleGroup: 'Бицепс бедра',
    isElbowSensitive: false,
    sets: [
      { type: 'working', targetWeight: 25, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 25, targetRepsMin: 12, targetRepsMax: 15 },
      { type: 'working', targetWeight: 25, targetRepsMin: 12, targetRepsMax: 15 },
    ],
  },
  {
    id: 'legs-calf-raise',
    split: 'LEGS',
    name: 'Подъёмы на носки в тренажёре',
    muscleGroup: 'Икроножные',
    isElbowSensitive: false,
    sets: [
      { type: 'working', targetWeight: 40, targetRepsMin: 15, targetRepsMax: 20 },
      { type: 'working', targetWeight: 40, targetRepsMin: 15, targetRepsMax: 20 },
      { type: 'working', targetWeight: 40, targetRepsMin: 15, targetRepsMax: 20 },
    ],
  },
  {
    id: 'legs-abdominal-machine',
    split: 'LEGS',
    name: 'Тренажёр на пресс (Abdominal)',
    muscleGroup: 'Пресс',
    isElbowSensitive: false,
    sets: [
      { type: 'working', targetWeight: 35, targetRepsMin: 15, targetRepsMax: 15 },
      { type: 'working', targetWeight: 35, targetRepsMin: 20, targetRepsMax: 20 },
      { type: 'working', targetWeight: 40, targetRepsMin: 20, targetRepsMax: 20 },
    ],
  },
];
