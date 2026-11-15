import {
  CoachContext,
  buildCoachSystemPrompt,
  buildMealPhotoSystemPrompt,
  buildSwapExercisePrompt,
} from '../prompts/coachPrompt';
import { AppSettings, ElbowStatus } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MealAnalysisResult {
  dishName: string;
  estimatedWeightGrams: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  confidence: 'low' | 'medium' | 'high';
  comment: string;
}

function buildCompletionsUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
}

async function callHydrogenCompletions(
  settings: AppSettings,
  messages: unknown[],
  temperature = 0.4
): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new Error('Не указан API Key. Перейди в «Настройки» и вставь ключ для hydrogen-4.');
  }

  const endpoint = buildCompletionsUrl(settings.apiBaseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim() || 'hydrogen-4',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Ошибка API (${response.status}): ${errText.slice(0, 180) || response.statusText}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Модель вернула пустой ответ.');
  }
  return content.trim();
}

export const llmClient = {
  async sendCoachMessage(
    settings: AppSettings,
    context: CoachContext,
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = buildCoachSystemPrompt(context);
    const payloadMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    ];
    return callHydrogenCompletions(settings, payloadMessages, 0.45);
  },

  async requestExerciseSwap(
    settings: AppSettings,
    params: {
      exerciseName: string;
      muscleGroup: string;
      currentWeight: number;
      elbowStatus: ElbowStatus;
    }
  ): Promise<string> {
    const prompt = buildSwapExercisePrompt(params);
    return callHydrogenCompletions(
      settings,
      [
        {
          role: 'system',
          content: 'Ты — опытный тренер в тренажёрном зале. Отвечай кратко и практично.',
        },
        { role: 'user', content: prompt },
      ],
      0.3
    );
  },

  async analyzeMealPhoto(
    settings: AppSettings,
    compressedBase64DataUrl: string,
    remainingCalories: number
  ): Promise<MealAnalysisResult> {
    const systemPrompt = buildMealPhotoSystemPrompt(remainingCalories);

    const rawResponse = await callHydrogenCompletions(
      settings,
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Оцени состав, примерный вес порции и КБЖУ этого приёма пищи.',
            },
            {
              type: 'image_url',
              image_url: { url: compressedBase64DataUrl },
            },
          ],
        },
      ],
      0.2
    );

    const cleanedJson = rawResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson) as Partial<MealAnalysisResult>;
    return {
      dishName: String(parsed.dishName || 'Приём пищи'),
      estimatedWeightGrams: Math.max(0, Math.round(Number(parsed.estimatedWeightGrams) || 300)),
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
      fats: Math.max(0, Math.round(Number(parsed.fats) || 0)),
      carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
      confidence:
        parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium',
      comment: String(parsed.comment || 'Порция учтена в дневнике.'),
    };
  },
};
