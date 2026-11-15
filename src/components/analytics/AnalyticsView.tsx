import React, { useMemo, useState } from 'react';
import { TrendingUp, Calendar, Dumbbell, Award } from 'lucide-react';
import { ExerciseTemplate, WorkoutSession } from '../../types';

interface AnalyticsViewProps {
  workouts: WorkoutSession[];
  program: ExerciseTemplate[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ workouts, program }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    program[0]?.id || 'push-incline-db-press'
  );

  const chartPoints = useMemo(() => {
    const chronological = [...workouts].reverse();
    const points: { date: string; maxWeight: number; volume: number }[] = [];

    for (const w of chronological) {
      const ex = w.exercises.find((e) => e.templateId === selectedTemplateId);
      if (!ex) continue;
      const workingSets = ex.sets.filter((s) => s.completed && s.type === 'working');
      if (workingSets.length === 0) continue;

      const maxWeight = Math.max(...workingSets.map((s) => s.weight));
      const volume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      points.push({ date: w.date.slice(5), maxWeight, volume });
    }
    return points;
  }, [workouts, selectedTemplateId]);

  const totalTonnageAllTime = workouts.reduce((sum, w) => sum + w.totalTonnage, 0);

  const renderChart = () => {
    if (chartPoints.length === 0) {
      return (
        <div className="h-36 flex items-center justify-center text-xs text-[var(--tg-hint)] text-center px-4">
          Заверши хотя бы одну тренировку с этим упражнением, чтобы увидеть график роста весов.
        </div>
      );
    }

    const width = 320;
    const height = 130;
    const padX = 24;
    const padY = 22;

    const weights = chartPoints.map((p) => p.maxWeight);
    const minW = Math.min(...weights) * 0.9;
    const maxW = Math.max(...weights) * 1.05 || 10;
    const rangeW = Math.max(1, maxW - minW);

    const coords = chartPoints.map((pt, i) => {
      const x =
        chartPoints.length === 1
          ? width / 2
          : padX + (i / (chartPoints.length - 1)) * (width - padX * 2);
      const y = height - padY - ((pt.maxWeight - minW) / rangeW) * (height - padY * 2);
      return { ...pt, x, y };
    });

    const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
        )}
        {coords.map((c, idx) => (
          <g key={idx}>
            <circle cx={c.x} cy={c.y} r="4.5" fill="#10b981" stroke="#0b0e14" strokeWidth="2" />
            <text
              x={c.x}
              y={c.y - 9}
              textAnchor="middle"
              fill="#f3f4f6"
              fontSize="10"
              fontWeight="bold"
            >
              {c.maxWeight}кг
            </text>
            <text x={c.x} y={height - 4} textAnchor="middle" fill="#9ca3af" fontSize="9">
              {c.date}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-lg font-extrabold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        Аналитика и прогресс
      </h2>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-[var(--tg-hint)]">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            Тренировок закрыто
          </div>
          <div className="text-2xl font-mono font-extrabold mt-1">{workouts.length}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-[var(--tg-hint)]">
            <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
            Суммарный тоннаж
          </div>
          <div className="text-2xl font-mono font-extrabold mt-1">
            {(totalTonnageAllTime / 1000).toFixed(1)} т
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 space-y-3">
        <div>
          <label className="block text-xs text-[var(--tg-hint)] mb-1.5">
            Динамика рабочего веса по упражнению:
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
          >
            {program.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.split}] {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-1">{renderChart()}</div>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-hint)] px-1">
          История сессий
        </h3>

        {workouts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 text-center text-xs text-[var(--tg-hint)]">
            Пока нет завершённых тренировок. Начни первую сессию на главном экране!
          </div>
        ) : (
          workouts.map((w) => (
            <div
              key={w.id}
              className="p-3.5 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                    {w.split}
                  </span>
                  <span className="text-xs text-[var(--tg-hint)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {w.date}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white">
                  {w.totalTonnage.toLocaleString()} кг
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-white/5">
                {w.exercises.map((ex, i) => {
                  const done = ex.sets.filter((s) => s.completed && s.type === 'working');
                  if (done.length === 0) return null;
                  return (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-gray-300 truncate pr-2">{ex.name}</span>
                      <span className="font-mono text-[var(--tg-hint)] shrink-0">
                        {done.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
