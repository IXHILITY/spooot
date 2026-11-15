import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { AppSettings, MealEntry } from '../../types';
import { compressMealPhotoToBase64 } from '../../utils/imageUtils';
import { llmClient, MealAnalysisResult } from '../../services/llmClient';
import { triggerHaptic } from '../../services/telegram';

interface MealPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  remainingCalories: number;
  onSaveMeal: (meal: Omit<MealEntry, 'id' | 'time'>) => void;
}

export const MealPhotoModal: React.FC<MealPhotoModalProps> = ({
  isOpen,
  onClose,
  settings,
  remainingCalories,
  onSaveMeal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiComment, setAiComment] = useState<string | null>(null);

  const [dishName, setDishName] = useState('');
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [fats, setFats] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [source, setSource] = useState<'photo_ai' | 'manual'>('photo_ai');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAiComment(null);
    setIsAnalyzing(true);
    triggerHaptic('light');

    try {
      const compressed = await compressMealPhotoToBase64(file, 800, 0.75);
      setPreviewUrl(compressed);

      const result: MealAnalysisResult = await llmClient.analyzeMealPhoto(
        settings,
        compressed,
        remainingCalories
      );

      setDishName(result.dishName);
      setCalories(result.calories);
      setProtein(result.protein);
      setFats(result.fats);
      setCarbs(result.carbs);
      setAiComment(result.comment);
      setSource('photo_ai');
      triggerHaptic('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка анализа изображения');
      setSource('manual');
      triggerHaptic('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!dishName.trim() && calories <= 0) return;
    onSaveMeal({
      dishName: dishName.trim() || 'Приём пищи',
      calories: Math.max(0, Number(calories) || 0),
      protein: Math.max(0, Number(protein) || 0),
      fats: Math.max(0, Number(fats) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      source,
    });
    setPreviewUrl(null);
    setDishName('');
    setCalories(0);
    setProtein(0);
    setFats(0);
    setCarbs(0);
    setAiComment(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3">
      <div className="w-full max-w-md rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Оценка КБЖУ по фото</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-[var(--tg-hint)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {!previewUrl ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 rounded-xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Сфотографировать или выбрать блюдо</span>
            <span className="text-xs text-[var(--tg-hint)]">
              hydrogen-4 оценит вес порции и распишет БЖУ
            </span>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-white/10">
            <img src={previewUrl} alt="Блюдо" className="w-full h-44 object-cover" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 text-xs font-medium text-white backdrop-blur-sm"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Другое фото
            </button>
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                <span className="text-xs font-medium text-emerald-300">
                  hydrogen-4 считает калории и белок...
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Не удалось распознать автоматически</p>
              <p className="opacity-80 mt-0.5">{error}. Можешь ввести цифры вручную ниже.</p>
            </div>
          </div>
        )}

        {aiComment && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200">
            {aiComment}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--tg-hint)] mb-1">Название блюда</label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="Например: Гречка с говядиной"
              className="w-full px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] text-[var(--tg-hint)] mb-1">Ккал</label>
              <input
                type="number"
                inputMode="numeric"
                value={calories || ''}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-emerald-400 mb-1">Белки (г)</label>
              <input
                type="number"
                inputMode="numeric"
                value={protein || ''}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-amber-400 mb-1">Жиры (г)</label>
              <input
                type="number"
                inputMode="numeric"
                value={fats || ''}
                onChange={(e) => setFats(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-sky-400 mb-1">Углев (г)</label>
              <input
                type="number"
                inputMode="numeric"
                value={carbs || ''}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-bold text-center"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isAnalyzing || (!dishName.trim() && calories <= 0)}
          className="w-full py-3 rounded-xl bg-emerald-500 disabled:opacity-40 text-black font-bold text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Добавить в дневник дня
        </button>
      </div>
    </div>
  );
};
