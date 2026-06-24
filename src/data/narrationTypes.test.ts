import { describe, it, expect } from 'vitest';
import type { AudioTag, NarrationSegment, BlockNarration, LessonNarration } from './narrationTypes';

describe('narrationTypes', () => {
  it('should allow all AudioTag values', () => {
    const tags: AudioTag[] = [
      'excited', 'warmly', 'measured', 'encouraging',
      'authoritatively', 'calm', 'curious', 'bright',
      'patiently', 'reassuring', 'seriously', 'firmly',
    ];
    expect(tags).toHaveLength(12);
    tags.forEach(t => expect(typeof t).toBe('string'));
  });

  it('should create a NarrationSegment with all fields', () => {
    const seg: NarrationSegment = {
      text: 'Now, look at the quadratic formula carefully.',
      audioTag: 'authoritatively',
      revealTrigger: true,
      pauseAfterMs: 500,
      socraticPause: 2000,
    };
    expect(seg.text).toBeDefined();
    expect(seg.audioTag).toBe('authoritatively');
    expect(seg.revealTrigger).toBe(true);
    expect(seg.pauseAfterMs).toBe(500);
    expect(seg.socraticPause).toBe(2000);
  });

  it('should allow NarrationSegment with only required field', () => {
    const seg: NarrationSegment = { text: 'Minimal segment' };
    expect(seg.text).toBe('Minimal segment');
    expect(seg.audioTag).toBeUndefined();
    expect(seg.revealTrigger).toBeUndefined();
  });

  it('should create a BlockNarration with segments', () => {
    const bn: BlockNarration = {
      blockId: 'block-1',
      segments: [
        { text: 'Welcome to this lesson.', audioTag: 'warmly', revealTrigger: true },
        { text: 'Let us begin with the basics.', audioTag: 'measured' },
      ],
      totalDurationMs: 4500,
    };
    expect(bn.blockId).toBe('block-1');
    expect(bn.segments).toHaveLength(2);
    expect(bn.totalDurationMs).toBe(4500);
  });

  it('should estimate totalDurationMs from word count', () => {
    const text = 'This is a test narration segment with some words';
    const wordCount = text.split(/\s+/).length;
    const avgMsPerWord = 350;
    const estimated = wordCount * avgMsPerWord;
    expect(estimated).toBeGreaterThan(0);
  });

  it('should create a LessonNarration', () => {
    const ln: LessonNarration = {
      lessonId: 'lesson-1',
      blockNarrations: [
        {
          blockId: 'b1',
          segments: [{ text: 'Start of lesson.' }],
          totalDurationMs: 1000,
        },
        {
          blockId: 'b2',
          segments: [
            { text: 'Here is the quadratic formula.', audioTag: 'excited', revealTrigger: true },
            { text: 'Notice the discriminant.', audioTag: 'measured', pauseAfterMs: 300 },
          ],
          totalDurationMs: 3000,
        },
      ],
      interBlockPausesMs: [1500, 2000],
    };
    expect(ln.lessonId).toBe('lesson-1');
    expect(ln.blockNarrations).toHaveLength(2);
    expect(ln.interBlockPausesMs).toEqual([1500, 2000]);
  });

  it('should validate segment reveal triggers are boolean', () => {
    const seg: NarrationSegment = {
      text: 'x equals negative b plus or minus the square root of b squared minus four a c, all over two a.',
      revealTrigger: true,
    };
    expect(typeof seg.revealTrigger).toBe('boolean');
  });

  it('should handle pause values as positive numbers', () => {
    const seg: NarrationSegment = {
      text: 'Take a moment to think about this.',
      pauseAfterMs: 1000,
      socraticPause: 3000,
    };
    expect(seg.pauseAfterMs!).toBeGreaterThan(0);
    expect(seg.socraticPause!).toBeGreaterThan(0);
  });

  it('should handle empty segment array', () => {
    const bn: BlockNarration = {
      blockId: 'b-empty',
      segments: [],
      totalDurationMs: 0,
    };
    expect(bn.segments).toHaveLength(0);
    expect(bn.totalDurationMs).toBe(0);
  });

  it('should support chained narration with reveals and pauses', () => {
    const segments: NarrationSegment[] = [
      { text: 'First, we factor the equation.', audioTag: 'measured', revealTrigger: true, pauseAfterMs: 200 },
      { text: 'We get x plus three times x plus four equals zero.', audioTag: 'bright', revealTrigger: true },
      { text: 'Think: what values of x make this true?', audioTag: 'curious', socraticPause: 5000 },
      { text: 'x equals negative three or x equals negative four.', audioTag: 'reassuring', revealTrigger: true },
    ];
    const revealCount = segments.filter(s => s.revealTrigger).length;
    expect(revealCount).toBe(3);
    expect(segments.some(s => s.socraticPause)).toBe(true);
  });
});
