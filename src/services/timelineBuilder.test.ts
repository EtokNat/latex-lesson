import { describe, it, expect } from 'vitest';
import { buildAbsoluteTimeline } from './timelineBuilder';
import type { AudioSegment, NarrationAudioResult } from './narrationAudioGenerator';
import type { RevealTiming } from './timingEngine';

function createAudioResult(segments: AudioSegment[]): NarrationAudioResult {
  let totalDurationMs = 0;
  const revealPositions: number[] = [];
  let cumulative = 0;
  for (const seg of segments) {
    cumulative += seg.durationMs;
    if (seg.revealTrigger) revealPositions.push(cumulative);
  }
  totalDurationMs = cumulative;
  return { segments, totalDurationMs, revealPositions };
}

function makeSegment(overrides: Partial<AudioSegment>): AudioSegment {
  return {
    segmentIndex: 0,
    blockId: 'b1',
    text: 'Hello',
    durationMs: 1000,
    revealTrigger: false,
    hasSocraticPause: false,
    socraticPauseSeconds: 0,
    pauseAfterMs: 0,
    isSilence: false,
    ...overrides,
  };
}

describe('timelineBuilder', () => {
  it('builds timeline from audio segments', () => {
    const segments: AudioSegment[] = [
      makeSegment({ segmentIndex: 0, text: 'First' }),
      makeSegment({ segmentIndex: 1, text: 'Second', revealTrigger: true }),
    ];
    const audioResult = createAudioResult(segments);

    const result = buildAbsoluteTimeline({
      audioResult,
      revealTimings: [],
      blockIds: ['b1'],
    });

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some(e => e.type === 'reveal')).toBe(true);
    expect(result.events.some(e => e.type === 'lesson_start')).toBe(true);
    expect(result.events.some(e => e.type === 'lesson_end')).toBe(true);
  });

  it('absolute timestamps increase monotonically', () => {
    const segments: AudioSegment[] = [
      makeSegment({ segmentIndex: 0, durationMs: 500 }),
      makeSegment({ segmentIndex: 1, durationMs: 700, revealTrigger: true }),
      makeSegment({ segmentIndex: 2, durationMs: 300 }),
    ];
    const audioResult = createAudioResult(segments);

    const result = buildAbsoluteTimeline({
      audioResult,
      revealTimings: [],
      blockIds: ['b1'],
    });

    const nonZero = result.events.filter(e => e.timeMs > 0);
    for (let i = 1; i < nonZero.length; i++) {
      expect(nonZero[i].timeMs).toBeGreaterThanOrEqual(nonZero[i - 1].timeMs);
    }
  });

  it('emits block_advance events between blocks', () => {
    const segments: AudioSegment[] = [
      makeSegment({ segmentIndex: 0, blockId: 'b1', durationMs: 1000 }),
      makeSegment({ segmentIndex: 1, blockId: 'b2', durationMs: 800 }),
    ];
    const audioResult = createAudioResult(segments);

    const result = buildAbsoluteTimeline({
      audioResult,
      revealTimings: [],
      blockIds: ['b1', 'b2'],
    });

    expect(result.events.some(e => e.type === 'block_advance')).toBe(true);
  });

  it('validates with no errors for clean timeline', () => {
    const segments: AudioSegment[] = [
      makeSegment({ segmentIndex: 0, durationMs: 1000 }),
      makeSegment({ segmentIndex: 1, durationMs: 500 }),
    ];
    const audioResult = createAudioResult(segments);

    const result = buildAbsoluteTimeline({
      audioResult,
      revealTimings: [],
      blockIds: ['b1'],
    });

    expect(result.validationErrors).toHaveLength(0);
  });

  it('handles socratic pauses as events', () => {
    const segments: AudioSegment[] = [
      makeSegment({
        segmentIndex: 0,
        text: 'Question?',
        durationMs: 1500,
        hasSocraticPause: true,
        isSilence: true,
      }),
    ];
    const audioResult = createAudioResult(segments);

    const result = buildAbsoluteTimeline({
      audioResult,
      revealTimings: [],
      blockIds: ['b1'],
    });

    expect(result.events.some(e => e.type === 'socratic_question')).toBe(true);
  });
});
