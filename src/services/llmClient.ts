export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCallResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

export type LLMFunction = (
  systemPrompt: string,
  userPrompt: string,
  options?: LLMOptions
) => Promise<string>;

let callLLM: LLMFunction | null = null;
let lastCallTime = 0;
const MIN_CALL_GAP_MS = 7000; // ~8.5 RPM, safe under Gemini free tier 10 RPM limit

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6': { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    'claude-opus-4-7': { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 },
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  };
  const rate = rates[model] || rates['claude-sonnet-4-6'];
  return promptTokens * rate.input + completionTokens * rate.output;
}

export function configureLLMClient(llmFn: LLMFunction): void {
  console.log('[LLMClient] Configured with custom LLM function');
  callLLM = llmFn;
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: LLMOptions
): Promise<LLMCallResult> {
  const model = options?.model || DEFAULT_MODEL;
  console.log('[LLMClient] Call to', model);

  if (!callLLM) {
    throw new Error(
      '[LLMClient] No LLM function configured. Call configureLLMClient() before generating completions.'
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[LLMClient] Attempt', attempt, 'of', MAX_RETRIES);

      // Rate limit: ensure minimum gap between API calls (Gemini free tier: 10 RPM)
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      if (timeSinceLastCall < MIN_CALL_GAP_MS) {
        const waitMs = MIN_CALL_GAP_MS - timeSinceLastCall;
        console.log('[LLMClient] Rate limiting: waiting', waitMs, 'ms');
        await new Promise((r) => setTimeout(r, waitMs));
      }
      lastCallTime = Date.now();

      const text = await callLLM(systemPrompt, userPrompt, {
        model,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const promptTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
      const completionTokens = estimateTokens(text);
      const estimatedCost = estimateCost(model, promptTokens, completionTokens);

      console.log(
        '[LLMClient] Call to',
        model,
        ':',
        promptTokens,
        'prompt +',
        completionTokens,
        'completion = $' + estimatedCost.toFixed(4)
      );

      return { text, promptTokens, completionTokens, estimatedCost };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn('[LLMClient] Attempt', attempt, 'failed:', lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log('[LLMClient] Retrying in', delay, 'ms');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `[LLMClient] All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`
  );
}
