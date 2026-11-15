import React from 'react';
import { Dumbbell, Bot, TrendingUp, Settings } from 'lucide-react';
import { triggerHaptic } from '../../services/telegram';

export type NavTab = 'workout' | 'chat' | 'analytics' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
  hasActiveWorkout: boolean;
  hasApiKey: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelect,
  hasActiveWorkout,
  hasApiKey,
}) => {
  const items: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'workout',
      label: 'Тренировка',
      icon: <Dumbbell className="w-5 h-5" />,
      badge: hasActiveWorkout ? 'LIVE' : undefined,
    },
    {
      id: 'chat',
      label: 'Тренер AI',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Прогресс',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <Settings className="w-5 h-5" />,
      badge: !hasApiKey ? '!' : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[var(--tg-secondary-bg)]/95 backdrop-blur-md border-t border-white/10 pb-safe">
      <div className="max-w-lg mx-auto grid grid-cols-4 h-16">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isActive) {
                  triggerHaptic('light');
                  onSelect(item.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-[var(--tg-hint)] hover:text-white'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 px-1 rounded text-[9px] font-bold ${
                      item.badge === 'LIVE'
                        ? 'bg-emerald-500 text-black animate-pulse'
                        : 'bg-amber-500 text-black'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
