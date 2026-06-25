import { describe, it, expect, beforeEach } from 'vitest';
import {
  preprocessAudioTags,
  calibrateTagSubstitutions,
  clearTagSubstitutions,
} from './audioTagPreprocessor';
import type { NarrationSegment } from '../data/narrationTypes';

describe('audioTagPreprocessor', () => {
  beforeEach(() => {
    clearTagSubstitutions();
  });

  it('passes valid tags through unchanged', () => {
    const segments: NarrationSegment[] = [
      { text: 'Hello', audioTag: 'measured' },
      { text: 'World', audioTag: 'encouraging' },
    ];

    const result = preprocessAudioTags(segments);

    expect(result.segments[0].audioTag).toBe('measured');
    expect(result.segments[1].audioTag).toBe('encouraging');
    expect(result.substitutions).toHaveLength(0);
  });

  it('substitutes known-bad tags via calibration', () => {
    calibrateTagSubstitutions('voice-1', [
      { tag: 'excited', substitute: 'bright' },
    ]);

    const segments: NarrationSegment[] = [
      { text: 'Hello', audioTag: 'excited' },
    ];

    const result = preprocessAudioTags(segments);

    expect(result.segments[0].audioTag).toBe('bright');
    expect(result.substitutions).toHaveLength(1);
    expect(result.substitutions[0].original).toBe('excited');
  });

  it('handles unknown tags by defaulting to measured', () => {
    const segments: NarrationSegment[] = [
      { text: 'Hello', audioTag: 'nonexistent_tag' as any },
    ];

    const result = preprocessAudioTags(segments);

    expect(result.segments[0].audioTag).toBe('measured');
    expect(result.substitutions).toHaveLength(1);
  });

  it('handles segments with no audio tag', () => {
    const segments: NarrationSegment[] = [
      { text: 'Hello', revealTrigger: true },
    ];

    const result = preprocessAudioTags(segments);

    expect(result.segments[0].audioTag).toBeUndefined();
    expect(result.substitutions).toHaveLength(0);
  });

  it('preserves all other segment properties', () => {
    const segments: NarrationSegment[] = [
      {
        text: 'Hello',
        audioTag: 'calm',
        revealTrigger: true,
        pauseAfterMs: 1000,
        socraticPause: 3,
      },
    ];

    const result = preprocessAudioTags(segments);

    expect(result.segments[0].text).toBe('Hello');
    expect(result.segments[0].revealTrigger).toBe(true);
    expect(result.segments[0].pauseAfterMs).toBe(1000);
    expect(result.segments[0].socraticPause).toBe(3);
  });

  it('handles empty segment array', () => {
    const result = preprocessAudioTags([]);
    expect(result.segments).toHaveLength(0);
    expect(result.substitutions).toHaveLength(0);
  });

  it('reports multiple substitutions', () => {
    calibrateTagSubstitutions('voice-2', [
      { tag: 'excited', substitute: 'bright' },
      { tag: 'firmly', substitute: 'seriously' },
    ]);

    const segments: NarrationSegment[] = [
      { text: 'A', audioTag: 'excited' },
      { text: 'B', audioTag: 'firmly' },
    ];

    const result = preprocessAudioTags(segments);
    expect(result.substitutions).toHaveLength(2);
  });

  it('trims and lowercases tags', () => {
    const segments: NarrationSegment[] = [
      { text: 'A', audioTag: '  MEASURED  ' as any },
    ];

    const result = preprocessAudioTags(segments);
    expect(result.segments[0].audioTag).toBe('measured');
  });
});
