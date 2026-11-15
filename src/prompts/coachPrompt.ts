import {
  CYCLE_SEQUENCES,
  CycleState,
  DailyCheckIn,
  ElbowStatus,
  ExerciseTemplate,
  SplitDayType,
  WorkoutSession,
} from '../types';

export interface CoachContext {
  todayDate: string;
  currentSplit: SplitDayType;
  cycle: CycleState;
  todayCheckIn: DailyCheckIn;
  activeWorkout: WorkoutSession | null;
  lastWorkouts: WorkoutSession[];
  program: ExerciseTemplate[];
  targetCalories: number;
  targetProtein: number;
}

const ELBOW_PROTOCOL_INSTRUCTIONS: Record<ElbowStatus, string> = {
  green: `СТАТУС ЛОКТЕЙ: ЗЕЛЁНЫЙ (норма).
- Дискомфорта нет, работаем по стандартной прогрессии нагрузок.`,

  yellow: `СТАТУС ЛОКТЕЙ: ЖЁЛТЫЙ (умеренный дискомфорт / профилактика).
- ОБЯЗАТЕЛЬНО напоминай: НЕ выпрямлять локти в жёсткий «замок» (оставлять 5–10° сгиба в верхней точке жимов и разгибаний).
- Перед рабочими подходами на трицепс и жимовыми движениями ОБЯЗАТЕЛЬНО добавляй 1–2 лёгких разминочных подхода на блоке (15–20 повторений).
- При дискомфорте в изолирующих разгибаниях заменяй их на щадящие варианты с нейтральным хватом в укороченной амплитуде.`,

  red: `СТАТУС ЛОКТЕЙ: КРАСНЫЙ (острый дискомфорт / воспаление).
- СТРОГИЙ ЗАПРЕТ на любые изолирующих разгибания на трицепс и тяжёлые жимы со свободным весом.
- Исключи упражнения с пометкой [elbow-sensitive], переведи нагрузку на тренажёры с фиксированной траекторией и снизь веса на 20–30%.`,
};

export function buildCoachSystemPrompt(ctx: CoachContext): string {
  const {
    todayDate,
    currentSplit,
    cycle,
    todayCheckIn,
    activeWorkout,
    lastWorkouts,
    program,
    targetCalories,
    targetProtein,
  } = ctx;

  const macros = todayCheckIn.meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.calories,
      p: acc.p + m.protein,
      f: acc.f + m.fats,
      c: acc.c + m.carbs,
    }),
    { kcal: 0, p: 0, f: 0, c: 0 }
  );

  const seq = CYCLE_SEQUENCES[cycle.mode];
  const upcomingDays = [1, 2, 3]
    .map((offset) => seq[(cycle.currentStepIndex + offset) % seq.length])
    .join(' → ');

  const activeWorkoutSummary = activeWorkout
    ? activeWorkout.exercises
        .map((ex, idx) => {
          const doneSets = ex.sets.filter((s) => s.completed);
          const setsText =
            doneSets.length > 0
              ? doneSets
                  .map((s) => `${s.weight}кг×${s.reps}${s.type === 'warmup' ? '(разм)' : ''}`)
                  .join(', ')
              : 'ещё не начато';
          return `${idx + 1}. ${ex.name}${ex.isSubstituted ? ' [ЗАМЕНЕНО]' : ''}: ${setsText}`;
        })
        .join('\n')
    : 'Тренировка сейчас не запущена.';

  const historySummary =
    lastWorkouts.length > 0
      ? lastWorkouts
          .slice(0, 4)
          .map((w) => {
            const exList = w.exercises
              .map((e) => {
                const topSet = e.sets
                  .filter((s) => s.type === 'working' && s.completed)
                  .sort((a, b) => b.weight - a.weight)[0];
                return `${e.name}: ${topSet ? `${topSet.weight}кг×${topSet.reps}` : '—'}`;
              })
              .join('; ');
            return `- ${w.date} [${w.split}] (тоннаж ${w.totalTonnage} кг): ${exList}`;
          })
          .join('\n')
      : 'История тренировок пока пуста (ориентируемся на стартовые веса программы).';

  const currentSplitProgram =
    currentSplit !== 'REST'
      ? program
          .filter((p) => p.split === currentSplit)
          .map((p) => {
            const planStr = p.sets
              .map(
                (s) =>
                  `${s.targetWeight}кг×${s.targetRepsMin}-${s.targetRepsMax}${
                    s.type === 'warmup' ? '(разм)' : ''
                  }`
              )
              .join(' + ');
            const noteSuffix = p.notes?.trim() ? ` — заметка: "${p.notes.trim()}"` : '';
            return `• ${p.name}${p.isElbowSensitive ? ' [elbow-sensitive]' : ''}: ${planStr}${noteSuffix}`;
          })
          .join('\n')
      : 'Сегодня день полного отдыха (REST).';

  return `Ты — персональный AI-тренер по бодибилдингу и спортивной нутрициологии.

### ПРОФИЛЬ И СПЛИТ АТЛЕТА
- Цель: набор сухой мышечной массы, профицит ~${targetCalories} ккал/день, белок ~${targetProtein} г/день, ежедневный приём 2–3 г креатина.
- Сплит: 3 направления (**PUSH** [грудь, плечи, трицепс], **PULL** [спина, бицепс], **LEGS** [ноги, пресс]) в режиме **${cycle.mode}** (2 тренировочных дня / 1 день отдыха).
- Дата: ${todayDate} | Сегодня по плану: **${currentSplit}** | Далее по циклу: ${upcomingDays}.

### ПРОТОКОЛ ЗАЩИТЫ СВЯЗОК (ПРИОРИТЕТ №1)
${ELBOW_PROTOCOL_INSTRUCTIONS[todayCheckIn.elbowStatus]}

### ВОССТАНОВЛЕНИЕ И ПИТАНИЕ СЕГОДНЯ
- Набрано по дневнику: **${macros.kcal} / ${targetCalories} ккал** (Б: ${macros.p}г, Ж: ${macros.f}г, У: ${macros.c}г)
- Чекбокс профицита закрыт: ${todayCheckIn.caloriesHit ? 'Да' : 'Нет'} | Белок закрыт: ${todayCheckIn.proteinHit ? 'Да' : 'Нет'}
- Креатин (2–3 г): ${todayCheckIn.creatineTaken ? 'Принят' : 'Не принят'}
- Качество сна: ${todayCheckIn.sleepQuality}/5

### ПЛАН НА СЕГОДНЯ (${currentSplit})
${currentSplitProgram}

### ТЕКУЩАЯ ТРЕНИРОВКА
${activeWorkoutSummary}

### ИСТОРИЯ ПОСЛЕДНИХ ТРЕНИРОВОК
${historySummary}

### ПРАВИЛА ОТВЕТА
1. Отвечай конкретно и сжато, с цифрами (кг, повторы, секунды отдыха, граммы БЖУ).
2. При закрытии всех рабочих подходов по верхней границе повторов — предлагай микропрогрессию (+1–2.5 кг или +1–2 повтора).
3. Всегда соблюдай протокол статуса локтей (${todayCheckIn.elbowStatus.toUpperCase()}).`;
}

export function buildSwapExercisePrompt(params: {
  exerciseName: string;
  muscleGroup: string;
  currentWeight: number;
  elbowStatus: ElbowStatus;
}): string {
  return `Тренажёр для упражнения «${params.exerciseName}» (целевая группа: ${params.muscleGroup}, рабочий вес: ${params.currentWeight} кг) сейчас занят в зале.
Текущий статус локтей атлета: ${params.elbowStatus.toUpperCase()}.

Подбери 2–3 оптимальные замены, доступные в стандартном тренажёрном зале (блочные тренажёры, гантели, рычажные тренажёры), строго учитывая статус локтей.
Для каждого варианта укажи:
1. Название упражнения
2. Ориентировочный стартовый вес (относительно ${params.currentWeight} кг)
3. Короткий нюанс техники для защиты локтей (1 предложение).

Ответь максимально компактно структурированным списком.`;
}

export function buildMealPhotoSystemPrompt(remainingCalories: number): string {
  return `Ты — спортивный нутрициолог. Оцени блюдо на фотографии и верни примерный расчёт КБЖУ на глаз по стандартным порциям.
Остаток калорий атлета на сегодня до цели профицита: ${Math.max(0, remainingCalories)} ккал.

Верни ответ СТРОГО в формате валидного JSON без markdown-обёрток и лишнего текста:
{
  "dishName": "Краткое название блюда (например: Куриная грудка с рисом и овощами)",
  "estimatedWeightGrams": 450,
  "calories": 620,
  "protein": 48,
  "fats": 14,
  "carbs": 72,
  "confidence": "medium",
  "comment": "Короткий совет на 1 предложение (например, стоит ли добавить сложные углеводы или полезные жиры под набор массы)"
}`;
}
