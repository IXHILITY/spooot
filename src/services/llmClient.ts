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

function isGoogleApiKey(key: string): boolean {
  return key.trim().startsWith('AIza');
}

function getGoogleRootUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  return clean
    .replace(/\/v1beta\/openai(?:\/chat\/completions)?$/i, '')
    .replace(/\/chat\/completions$/i, '');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 22000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Прямой нативный вызов Gemini API через твой Cloudflare Worker (быстрый Vision без 524)
async function callNativeGemini(
  settings: AppSettings,
  systemPrompt: string,
  userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  temperature = 0.3
): Promise<string> {
  const rootUrl = getGoogleRootUrl(settings.apiBaseUrl);
  const apiKey = settings.apiKey.trim();
  const preferred = settings.model.trim() || 'gemini-3.8-flash';

  // Цепочка моделей на случай перегрузки (503/524) или недоступности (404)
  const candidates = Array.from(
    new Set([
      preferred,
      'gemini-3.8-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
    ])
  );

  let lastError = 'Сервер Google временно перегружен';

  for (const modelName of candidates) {
    const cleanModel = modelName.replace(/^models\//, '');
    const url = `${rootUrl}/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: userParts }],
            generationConfig: {
              temperature,
              maxOutputTokens: 900,
            },
          }),
        },
        22000
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || '')
          .join('')
          .trim();
        if (text) return text;
      }

      const errBody = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}: ${errBody.slice(0, 140)}`;

      // При 503, 524, 429 или 404 сразу пробуем следующую модель из списка
      if ([404, 429, 500, 502, 503, 524].includes(res.status)) {
        continue;
      }
      break;
    } catch (err) {
      lastError = err instanceof Error && err.name === 'AbortError'
        ? 'Превышено время ожидания (22 сек)'
        : String(err);
      continue;
    }
  }

  throw new Error(lastError);
}

// Стандартный OpenAI-совместимый вызов (для сторонних провайдеров)
async function callOpenAiCompatible(
  settings: AppSettings,
  messages: unknown[],
  temperature = 0.4
): Promise<string> {
  const clean = settings.apiBaseUrl.trim().replace(/\/+$/, '');
  const endpoint = clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;

  const res = await fetchWithTimeout(
    endpoint,
    {
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
    },
    25000
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ошибка API (${res.status}): ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Пустой ответ от модели.');
  return content.trim();
}

export const llmClient = {
  async sendCoachMessage(
    settings: AppSettings,
    context: CoachContext,
    history: ChatMessage[]
  ): Promise<string> {
    if (!settings.apiKey.trim()) {
      throw new Error('Не указан API Key в «Настройках».');
    }

    const systemPrompt = buildCoachSystemPrompt(context);

    if (isGoogleApiKey(settings.apiKey)) {
      const dialogText = history
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'Атлет' : 'Тренер'}: ${m.content}`)
        .join('\n\n');
      return callNativeGemini(settings, systemPrompt, [{ text: dialogText }], 0.45);
    }

    return callOpenAiCompatible(
      settings,
      [
        { role: 'system', content: systemPrompt },
        ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      ],
      0.45
    );
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
    if (!settings.apiKey.trim()) {
      throw new Error('Не указан API Key в «Настройках».');
    }

    const sys = 'Ты — опытный тренер в тренажёрном зале. Отвечай кратко и практично.';
    const prompt = buildSwapExercisePrompt(params);

    if (isGoogleApiKey(settings.apiKey)) {
      return callNativeGemini(settings, sys, [{ text: prompt }], 0.3);
    }

    return callOpenAiCompatible(
      settings,
      [
        { role: 'system', content: sys },
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
    if (!settings.apiKey.trim()) {
      throw new Error('Не указан API Key в «Настройках».');
    }

    const systemPrompt = buildMealPhotoSystemPrompt(remainingCalories);
    let rawResponse = '';

    if (isGoogleApiKey(settings.apiKey)) {
      const base64Clean = compressedBase64DataUrl.replace(/^data:image\/\w+;base64,/, '');
      rawResponse = await callNativeGemini(
        settings,
        systemPrompt,
        [
          { text: 'Оцени состав, вес порции и КБЖУ этого блюда. Верни только валидный JSON.' },
          { inlineData: { mimeType: 'image/jpeg', data: base64Clean } },
        ],
        0.2
      );
    } else {
      rawResponse = await callOpenAiCompatible(
        settings,
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Оцени состав, вес порции и КБЖУ этого блюда.' },
              { type: 'image_url', image_url: { url: compressedBase64DataUrl } },
            ],
          },
        ],
        0.2
      );
    }

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawResponse;

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
