import { describe, it, expect } from 'vitest';
import {
  computeRevealTimingsFromWordTimestamps,
  reconcileTimings,
} from './timingEngine';
import type { WordTimestamp, TimingSource } from './ttsClient';

function createWordTimestamps(words: string[], durationMs: number): WordTimestamp[] {
  const perWord = durationMs / words.length;
  return words.map((word, i) => ({
    word,
    startMs: i * perWord,
    endMs: (i + 1) * perWord,
  }));
}

describe('timingEngine', () => {
  describe('computeRevealTimingsFromWordTimestamps', () => {
    it('computes reveal timings from word timestamps', () => {
      const text = 'This is a test sentence for timing.';
      const timestamps = createWordTimestamps(
        ['This', 'is', 'a', 'test', 'sentence', 'for', 'timing.'],
        2000
      );
      const timings = computeRevealTimingsFromWordTimestamps(timestamps, [10], text);

      expect(timings).toHaveLength(1);
      expect(timings[0]).toBeGreaterThanOrEqual(0);
    });

    it('returns empty for empty reveal positions', () => {
      const timestamps = createWordTimestamps(['hello'], 500);
      const timings = computeRevealTimingsFromWordTimestamps(timestamps, [], 'hello');
      expect(timings).toHaveLength(0);
    });

    it('handles empty word timestamps', () => {
      const timings = computeRevealTimingsFromWordTimestamps([], [5], 'hello');
      expect(timings).toHaveLength(1);
    });
  });

  describe('reconcileTimings', () => {
    it('uses single source timing', () => {
      const primary: TimingSource = {
        name: 'tts-api',
        revealTimestampsMs: [500, 1200, 2000],
      };

      const result = reconcileTimings(primary);

      expect(result.reveals).toHaveLength(3);
      expect(result.reveals[0].confidence).toBe('low');
    });

    it('reconciles multiple sources with median', () => {
      const primary: TimingSource = {
        name: 'tts-api',
        revealTimestampsMs: [500, 1200, 2000],
      };
      const secondary: TimingSource = {
        name: 'waveform',
        revealTimestampsMs: [520, 1180, 2050],
      };
      const tertiary: TimingSource = {
        name: 'forced-alignment',
        revealTimestampsMs: [510, 1210, 1980],
      };

      const result = reconcileTimings(primary, secondary, tertiary);

      expect(result.reveals).toHaveLength(3);
      expect(result.reveals[0].confidence).toBe('high');
    });

    it('applies 300ms buffer', () => {
      const primary: TimingSource = {
        name: 'tts-api',
        revealTimestampsMs: [5000],
      };

      const result = reconcileTimings(primary);

      expect(result.bufferMs).toBe(300);
      // The buffer should be subtracted (content appears before narration)
      expect(result.reveals[0].timeMs).toBe(4700);
    });

    it('returns medium confidence for two sources', () => {
      const primary: TimingSource = {
        name: 'tts-api',
        revealTimestampsMs: [1000],
      };
      const secondary: TimingSource = {
        name: 'waveform',
        revealTimestampsMs: [1050],
      };

      const result = reconcileTimings(primary, secondary);

      expect(result.reveals[0].confidence).toBe('medium');
    });

    it('handles missing secondary/tertiary sources gracefully', () => {
      const primary: TimingSource = {
        name: 'tts-api',
        revealTimestampsMs: [1000, 2000],
      };
      const secondary: TimingSource = {
        name: 'waveform',
        revealTimestampsMs: [],
      };

      const result = reconcileTimings(primary, secondary);

      expect(result.reveals).toHaveLength(2);
      expect(result.reveals[0].confidence).toBe('low');
    });
  });
});
