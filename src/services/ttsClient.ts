export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
}

export interface TTSOptions {
  stability?: number;
  similarity?: number;
  style?: number;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  durationMs: number;
  wordTimestamps: WordTimestamp[];
}

export type TTSFunction = (
  text: string,
  voiceId: string,
  options?: TTSOptions
) => Promise<TTSResult>;

let callTTS: TTSFunction | null = null;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_CHARS_PER_CALL = 5000;
const COST_PER_CHAR = 0.0003;

function estimateCost(charCount: number): number {
  return charCount * COST_PER_CHAR;
}

export function splitAtSentenceBoundary(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    let splitAt = maxChars;
    const searchEnd = Math.max(0, maxChars - 200);
    const candidates = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '; '];
    let bestIdx = -1;

    for (const delim of candidates) {
      const idx = remaining.lastIndexOf(delim, maxChars);
      if (idx > searchEnd && idx > bestIdx) {
        bestIdx = idx + delim.length;
      }
    }

    if (bestIdx > 0) {
      splitAt = bestIdx;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter(c => c.length > 0);
}

export function configureTTSClient(ttsFn: TTSFunction): void {
  console.log('[TTSClient] Configured with custom TTS function');
  callTTS = ttsFn;
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  options?: TTSOptions
): Promise<TTSResult> {
  console.log('[TTSClient] Generating speech:', text.length, 'chars, voice:', voiceId);

  if (!callTTS) {
    throw new Error(
      '[TTSClient] No TTS function configured. Call configureTTSClient() before generating speech.'
    );
  }

  if (text.length > MAX_CHARS_PER_CALL) {
    console.log('[TTSClient] Text exceeds', MAX_CHARS_PER_CALL, 'chars, segmenting at sentence boundaries');
    const chunks = splitAtSentenceBoundary(text, MAX_CHARS_PER_CALL);
    const results = await Promise.all(
      chunks.map((chunk, i) => generateSpeechChunk(chunk, voiceId, options, i))
    );
    return mergeTTSResults(results);
  }

  return generateSpeechChunk(text, voiceId, options, 0);
}

async function generateSpeechChunk(
  text: string,
  voiceId: string,
  options?: TTSOptions,
  chunkIndex?: number
): Promise<TTSResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log('[TTSClient] Attempt', attempt, 'of', MAX_RETRIES,
        chunkIndex !== undefined ? '(chunk ' + chunkIndex + ')' : '');

      const result = await callTTS!(text, voiceId, options);
      const cost = estimateCost(text.length);

      console.log(
        '[TTSClient] Generated',
        result.durationMs,
        'ms audio for',
        text.length,
        'chars — $' + cost.toFixed(4)
      );

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn('[TTSClient] Attempt', attempt, 'failed:', lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log('[TTSClient] Retrying in', delay, 'ms');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `[TTSClient] All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`
  );
}

function mergeTTSResults(results: TTSResult[]): TTSResult {
  let totalDurationMs = 0;
  const allTimestamps: WordTimestamp[] = [];

  const buffers: Uint8Array[] = [];
  for (const result of results) {
    buffers.push(new Uint8Array(result.audioBuffer));
    for (const ts of result.wordTimestamps) {
      allTimestamps.push({
        word: ts.word,
        startMs: ts.startMs + totalDurationMs,
        endMs: ts.endMs + totalDurationMs,
      });
    }
    totalDurationMs += result.durationMs;
  }

  const totalBytes = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(buf, offset);
    offset += buf.length;
  }

  console.log('[TTSClient] Merged', results.length, 'chunks:', totalDurationMs, 'ms total');

  return {
    audioBuffer: merged.buffer as ArrayBuffer,
    durationMs: totalDurationMs,
    wordTimestamps: allTimestamps,
  };
}
