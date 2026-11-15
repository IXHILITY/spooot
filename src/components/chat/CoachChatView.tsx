import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { CoachContext } from '../../prompts/coachPrompt';
import { ChatMessage, llmClient } from '../../services/llmClient';
import { triggerHaptic } from '../../services/telegram';
import { AppSettings } from '../../types';

interface CoachChatViewProps {
  settings: AppSettings;
  context: CoachContext;
}

const CHAT_SESSION_KEY = 'tma_coach_chat_history';

const QUICK_PROMPTS = [
  'Разбери мой план на сегодня и подскажи целевые веса',
  'Как сегодня беречь локти с учётом моего статуса?',
  'Что добрать по еде до конца дня до 3000 ккал?',
  'Оцени мою прогрессию по последним тренировкам',
];

export const CoachChatView: React.FC<CoachChatViewProps> = ({ settings, context }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages.slice(-20)));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextHistory: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);
    triggerHaptic('light');

    try {
      const reply = await llmClient.sendCoachMessage(settings, context, nextHistory);
      setMessages([...nextHistory, { role: 'assistant', content: reply }]);
      triggerHaptic('success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Ошибка связи с hydrogen-4';
      setMessages([
        ...nextHistory,
        { role: 'assistant', content: `⚠️ ${errMsg}` },
      ]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalKcal = context.todayCheckIn.meals.reduce((s, m) => s + m.calories, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] pb-2">
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--tg-secondary-bg)] border border-white/10 mb-3 text-[11px]">
        <div className="flex items-center gap-2 truncate">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate text-[var(--tg-hint)]">
            Контекст: <strong className="text-white">{context.currentSplit}</strong> • Локти:{' '}
            <strong className="text-amber-300 uppercase">
              {context.todayCheckIn.elbowStatus}
            </strong>{' '}
            • {totalKcal}/{context.targetCalories} ккал
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[var(--tg-hint)] hover:text-red-400 p-1 shrink-0"
            title="Очистить историю чата"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base">AI-Тренер ({settings.model || 'hydrogen-4'})</h3>
              <p className="text-xs text-[var(--tg-hint)] max-w-xs mx-auto">
                Я вижу твой текущий сплит, выполненные подходы, статус локтей и дневник калорий.
                Задай любой вопрос.
              </p>
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto pt-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-[var(--tg-secondary-bg)] hover:bg-white/10 border border-white/10 text-xs text-gray-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-black font-medium rounded-br-sm'
                  : 'bg-[var(--tg-secondary-bg)] border border-white/10 text-gray-100 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-[var(--tg-secondary-bg)] border border-white/10 flex items-center gap-2 text-xs text-[var(--tg-hint)]">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Тренер анализирует данные...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="pt-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Спросить тренера..."
          className="flex-1 px-4 py-3 rounded-2xl bg-[var(--tg-secondary-bg)] border border-white/10 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-2xl bg-emerald-500 disabled:opacity-40 text-black font-bold shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
