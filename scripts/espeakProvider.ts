import { execFile } from 'node:child_process';
import type { TTSFunction, TTSResult, WordTimestamp } from '../src/services/ttsClient';

export function createEspeakProvider(): TTSFunction {
  console.log('[EspeakProvider] Initialized with espeak-ng');

  return function espeakCall(
    text: string,
    _voiceId: string,
    _options?: { stability?: number; similarity?: number; style?: number },
  ): Promise<TTSResult> {
    return new Promise((resolve, reject) => {
      const cleanText = text.replace(/[^a-zA-Z0-9\s.,!?;:\-–—'"()αβγδεζηθικλμνξπρστυφχψωΔ±√∑∫∞]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        const emptyBuffer = new ArrayBuffer(0);
        resolve({
          audioBuffer: emptyBuffer,
          durationMs: 0,
          wordTimestamps: [],
        });
        return;
      }

      console.log(`[EspeakProvider] Generating speech: ${cleanText.length} chars`);

      const child = execFile(
        'espeak-ng',
        ['--stdout', '-v', 'en-us', '-s', '150', '-p', '50', '--', cleanText],
        { maxBuffer: 10 * 1024 * 1024, encoding: 'buffer' },
        (error, stdout) => {
          if (error) {
            console.error(`[EspeakProvider] espeak-ng error: ${error.message}`);
            reject(error);
            return;
          }

          const wavBuffer = stdout.buffer.slice(
            stdout.byteOffset,
            stdout.byteOffset + stdout.byteLength,
          ) as ArrayBuffer;

          const durationMs = estimateWavDuration(wavBuffer, stdout.length);

          const wordTimestamps = estimateWordTimestamps(cleanText, durationMs);

          console.log(
            `[EspeakProvider] Generated: ${stdout.length} bytes, ${durationMs}ms, ${wordTimestamps.length} words`,
          );

          resolve({
            audioBuffer: wavBuffer,
            durationMs,
            wordTimestamps,
          });
        },
      );
    });
  };
}

function estimateWavDuration(buffer: ArrayBuffer, fileSize: number): number {
  if (fileSize < 44) return 500;

  const view = new DataView(buffer);
  const sampleRate = view.getUint32(24, true);
  const numChannels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);

  if (sampleRate === 0 || numChannels === 0 || bitsPerSample === 0) return 500;

  const dataSize = fileSize - 44;
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataSize / (numChannels * bytesPerSample);
  const durationMs = (totalSamples / sampleRate) * 1000;

  return Math.max(Math.round(durationMs), 100);
}

function estimateWordTimestamps(text: string, totalDurationMs: number): WordTimestamp[] {
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0 || totalDurationMs <= 0) return [];

  const msPerChar = totalDurationMs / text.length;
  const timestamps: WordTimestamp[] = [];
  let charOffset = 0;

  for (const word of words) {
    const wordLen = word.length;
    const startMs = Math.round(charOffset * msPerChar);
    const endMs = Math.round((charOffset + wordLen) * msPerChar);
    timestamps.push({ word, startMs, endMs });
    charOffset += wordLen + 1;
  }

  return timestamps;
}
