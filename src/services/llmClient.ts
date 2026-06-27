export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
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
const MIN_CALL_GAP_MS = 30000; // 2 RPM — deep safety margin under all Gemini free tier limits

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 4000;

// Model-specific rate limits
const PAID_MODELS = new Set(['claude-opus-4-7']); // maps to gemini-2.5-flash
const FREE_GAP_MS = 2000; // Gemma 4 — no RPM limit, 2s avoids 500 errors at scale
const PAID_GAP_MS = 30000; // gemini-2.5-flash — 20 RPM free tier

function getMinGapMs(model: string): number {
  return PAID_MODELS.has(model) ? PAID_GAP_MS : FREE_GAP_MS;
}

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

function parseRetryAfterSeconds(errorMessage: string): number | null {
  const match = errorMessage.match(/retry in ([\d.]+)s/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

function isRateLimitError(errorMessage: string): boolean {
  return errorMessage.includes('429') || errorMessage.includes('Quota exceeded');
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

      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      const minGap = getMinGapMs(model);
      if (timeSinceLastCall < minGap) {
        const waitMs = minGap - timeSinceLastCall;
        console.log('[LLMClient] Rate limiting:', model, '— waiting', waitMs, 'ms');
        await new Promise((r) => setTimeout(r, waitMs));
      }
      lastCallTime = Date.now();

      const text = await callLLM(systemPrompt, userPrompt, {
        model,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        responseSchema: options?.responseSchema,
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
      const errMsg = lastError.message;
      console.warn('[LLMClient] Attempt', attempt, 'failed:', errMsg);

      if (attempt < MAX_RETRIES) {
        let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

        if (isRateLimitError(errMsg)) {
          const retryAfter = parseRetryAfterSeconds(errMsg);
          if (retryAfter !== null) {
            // Wait the API-specified duration + 2s buffer
            const apiDelay = (retryAfter + 2) * 1000;
            delay = Math.max(delay, apiDelay);
            console.log('[LLMClient] Rate limited — API says retry in', retryAfter, 's, waiting', Math.round(delay / 1000), 's');
          } else {
            // No explicit retry-after, use aggressive backoff for 429
            delay = Math.max(delay, 15_000);
            console.log('[LLMClient] Rate limited — waiting', Math.round(delay / 1000), 's');
          }
        }

        console.log('[LLMClient] Retrying in', Math.round(delay / 1000), 's');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `[LLMClient] All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`
  );
}
