import type { LLMFunction, LLMOptions } from '../src/services/llmClient';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemma-4-31b';

const MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-6': 'gemma-4-31b',
  'claude-opus-4-7': 'gemma-4-31b',
  'gpt-4o': 'gemini-2.5-flash',
};

export function createGeminiProvider(): LLMFunction {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[GeminiProvider] GEMINI_API_KEY environment variable is not set');
  }

  console.log('[GeminiProvider] Initialized with Gemini API');

  return async function geminiCall(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions,
  ): Promise<string> {
    const modelName = MODEL_MAP[options?.model || 'claude-sonnet-4-6'] || DEFAULT_MODEL;
    const url = `${API_BASE}/${modelName}:generateContent?key=${apiKey}`;

    const contents: Record<string, unknown>[] = [];
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.5,
      },
    };

    console.log(`[GeminiProvider] Calling ${modelName} (maxTokens: ${options?.maxTokens || 4096})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[GeminiProvider] API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('[GeminiProvider] No candidates in response');
    }

    let text = candidate.content?.parts?.[0]?.text || '';
    // Strip markdown code fences that Gemini often wraps around JSON
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    console.log(`[GeminiProvider] Response: ${text.length} chars, finish: ${candidate.finishReason}`);

    return text;
  };
}
