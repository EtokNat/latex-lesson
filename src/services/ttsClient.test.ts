import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configureTTSClient,
  generateSpeech,
  splitAtSentenceBoundary,
} from './ttsClient';
import type { TTSFunction, TTSResult } from './ttsClient';

function createTTSResult(durationMs: number, wordCount: number): TTSResult {
  const timestamps = [];
  const bytesPerSecond = 16000;
  const totalBytes = Math.ceil((durationMs / 1000) * bytesPerSecond);
  for (let i = 0; i < wordCount; i++) {
    timestamps.push({
      word: `word${i}`,
      startMs: (i * durationMs) / wordCount,
      endMs: ((i + 1) * durationMs) / wordCount,
    });
  }
  return {
    audioBuffer: new ArrayBuffer(totalBytes),
    durationMs,
    wordTimestamps: timestamps,
  };
}

describe('ttsClient', () => {
  beforeEach(() => {
    configureTTSClient(vi.fn() as unknown as TTSFunction);
  });

  it('throws if no TTS function configured', async () => {
    configureTTSClient(null as unknown as TTSFunction);
    await expect(generateSpeech('hello', 'voice-1')).rejects.toThrow('[TTSClient]');
  });

  it('generates speech with a configured TTS function', async () => {
    const mockFn = vi.fn().mockResolvedValue(createTTSResult(1000, 5));
    configureTTSClient(mockFn);

    const result = await generateSpeech('hello world', 'voice-1');

    expect(result.durationMs).toBe(1000);
    expect(result.wordTimestamps).toHaveLength(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue(createTTSResult(500, 3));
    configureTTSClient(mockFn);

    const result = await generateSpeech('test', 'voice-1');

    expect(result.durationMs).toBe(500);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('throws after max retries', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
    configureTTSClient(mockFn);

    await expect(generateSpeech('test', 'voice-1')).rejects.toThrow(
      'All 3 attempts failed'
    );
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('splits long text at sentence boundaries', () => {
    const longText =
      'First sentence. Second sentence. Third sentence. Fourth sentence. ' +
      'Fifth sentence. Sixth sentence. Seventh sentence. Eighth sentence.';
    const chunks = splitAtSentenceBoundary(longText, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(60);
    }
  });

  it('passes TTS options through', async () => {
    const mockFn = vi.fn().mockResolvedValue(createTTSResult(800, 4));
    configureTTSClient(mockFn);

    await generateSpeech('hello', 'voice-1', {
      stability: 0.5,
      similarity: 0.7,
      style: 0.3,
    });

    expect(mockFn).toHaveBeenCalledWith('hello', 'voice-1', {
      stability: 0.5,
      similarity: 0.7,
      style: 0.3,
    });
  });

  it('handles empty text', async () => {
    const mockFn = vi.fn().mockResolvedValue(createTTSResult(0, 0));
    configureTTSClient(mockFn);

    const result = await generateSpeech('', 'voice-1');
    expect(result.durationMs).toBe(0);
  });
});
