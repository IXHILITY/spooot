import React, { useRef, useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Download,
  Upload,
  UserCheck,
  CheckCircle2,
  Dumbbell,
  Sliders,
} from 'lucide-react';
import { AppSettings, ExerciseTemplate } from '../../types';
import { storageService } from '../../services/storage';
import { getTelegramUserId, triggerHaptic } from '../../services/telegram';
import { ProgramEditor } from './ProgramEditor';

interface SettingsViewProps {
  settings: AppSettings;
  program: ExerciseTemplate[];
  onSaveSettings: (next: AppSettings) => void;
  onSaveProgram: (next: ExerciseTemplate[]) => void;
  onResetProgram: () => void;
  onDataImported: () => void;
}

type SettingsSection = 'api' | 'program';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  program,
  onSaveSettings,
  onSaveProgram,
  onResetProgram,
  onDataImported,
}) => {
  const [section, setSection] = useState<SettingsSection>('api');
  const [form, setForm] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const currentTgId = getTelegramUserId();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleExport = () => {
    try {
      const jsonStr = storageService.exportBackupJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('Резервная копия JSON скачана.');
      triggerHaptic('success');
    } catch {
      setBackupStatus('Ошибка экспорта данных.');
      triggerHaptic('error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      storageService.importBackupJson(text);
      onDataImported();
      setBackupStatus('Данные успешно восстановлены из JSON!');
      triggerHaptic('success');
    } catch (err) {
      setBackupStatus(err instanceof Error ? err.message : 'Ошибка импорта файла.');
      triggerHaptic('error');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Настройки</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10">
        <button
          type="button"
          onClick={() => {
            setSection('api');
            triggerHaptic('light');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            section === 'api'
              ? 'bg-white text-black'
              : 'text-[var(--tg-hint)] hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          API и Бэкап
        </button>

        <button
          type="button"
          onClick={() => {
            setSection('program');
            triggerHaptic('light');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            section === 'program'
              ? 'bg-white text-black'
              : 'text-[var(--tg-hint)] hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          Программа и веса
        </button>
      </div>

      {section === 'program' ? (
        <ProgramEditor
          program={program}
          onSaveProgram={onSaveProgram}
          onResetProgram={onResetProgram}
        />
      ) : (
        <>
          <form
            onSubmit={handleSave}
            className="p-4 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 space-y-3.5"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <KeyRound className="w-4 h-4" />
              Подключение к Hydrogen 4
            </div>

            <div>
              <label className="block text-xs text-[var(--tg-hint)] mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-[var(--tg-hint)] hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--tg-hint)] mb-1">
                API Base URL (OpenAI-compatible)
              </label>
              <input
                type="url"
                value={form.apiBaseUrl}
                onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--tg-hint)] mb-1">
                Идентификатор модели
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="hydrogen-4"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-[var(--tg-hint)] mb-1">Цель ккал/день</label>
                <input
                  type="number"
                  value={form.targetCalories}
                  onChange={(e) =>
                    setForm({ ...form, targetCalories: parseInt(e.target.value, 10) || 3000 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tg-hint)] mb-1">Отдых по умолч.</label>
                <select
                  value={form.defaultRestSec}
                  onChange={(e) =>
                    setForm({ ...form, defaultRestSec: Number(e.target.value) as 60 | 90 | 120 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono"
                >
                  <option value={60}>60 сек</option>
                  <option value={90}>90 сек</option>
                  <option value={120}>120 сек</option>
                </select>
              </div>
            </div>

            <div className="pt-1 border-t border-white/5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--tg-hint)] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  Твой Telegram ID (опционально)
                </label>
                {currentTgId && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, allowedTelegramId: currentTgId })}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Подставить мой ({currentTgId})
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.allowedTelegramId || ''}
                onChange={(e) => setForm({ ...form, allowedTelegramId: e.target.value })}
                placeholder="Например: 123456789"
                className="w-full px-3 py-2 rounded-xl bg-[var(--tg-bg)] border border-white/10 text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить настройки
            </button>

            {savedBanner && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Сохранено в localStorage и Telegram CloudStorage
              </div>
            )}
          </form>

          <div className="p-4 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--tg-hint)]">
              Резервное копирование базы
            </div>
            <p className="text-xs text-[var(--tg-hint)]">
              Данные синхронизируются с Telegram CloudStorage, но ты всегда можешь скачать полный
              JSON-слепок тренировок, программы и дневника питания (без API-ключа).
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Экспорт JSON
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                Импорт JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {backupStatus && (
              <p className="text-xs text-emerald-300 text-center font-medium">{backupStatus}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
