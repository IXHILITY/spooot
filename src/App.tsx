import React, { useEffect, useState } from 'react';
import { initTelegramApp } from './services/telegram';
import { useAppState } from './hooks/useAppState';
import { AccessGuard } from './components/layout/AccessGuard';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { WorkoutView } from './components/workout/WorkoutView';
import { CoachChatView } from './components/chat/CoachChatView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const state = useAppState();

  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <AccessGuard allowedTelegramId={state.settings.allowedTelegramId}>
      <div className="min-h-screen bg-[var(--tg-bg)] text-[var(--tg-text)]">
        <main className="max-w-lg mx-auto px-3.5 pt-3">
          {activeTab === 'workout' && (
            <WorkoutView
              settings={state.settings}
              program={state.program}
              cycle={state.cycle}
              currentSplit={state.currentSplit}
              todayCheckIn={state.todayCheckIn}
              activeWorkout={state.activeWorkout}
              onShiftCycle={state.shiftCycle}
              onChangeSplitMode={state.changeSplitMode}
              onUpdateCheckIn={state.updateCheckIn}
              onAddMeal={state.addMealEntry}
              onRemoveMeal={state.removeMealEntry}
              onStartWorkout={state.startWorkout}
              onToggleSet={state.toggleSetCompleted}
              onUpdateSetField={state.updateSetField}
              onAddSet={state.addSetToExercise}
              onSubstitute={state.substituteExercise}
              onFinishWorkout={state.finishWorkout}
              onCancelWorkout={state.cancelWorkout}
            />
          )}

          {activeTab === 'chat' && (
            <CoachChatView settings={state.settings} context={state.buildCoachContext()} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView workouts={state.recentWorkouts} program={state.program} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={state.settings}
              program={state.program}
              onSaveSettings={state.updateSettings}
              onSaveProgram={state.updateProgram}
              onResetProgram={state.resetProgram}
              onDataImported={state.reloadAllFromLocal}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          onSelect={setActiveTab}
          hasActiveWorkout={Boolean(state.activeWorkout)}
          hasApiKey={Boolean(state.settings.apiKey.trim())}
        />
      </div>
    </AccessGuard>
  );
};

export default App;
