import { describe, it, expect } from 'vitest';
import { generateNarrationAudio } from './narrationAudioGenerator';
import type { LessonNarration } from '../data/narrationTypes';

function createNarration(): LessonNarration {
  return {
    lessonId: 'test-lesson',
    blockNarrations: [
      {
        blockId: 'block-1',
        segments: [
          {
            text: '[measured] Let us begin by looking at this equation. {REVEAL}',
            audioTag: 'measured',
            revealTrigger: false,
          },
          {
            text: '[encouraging] Notice how the terms are arranged. {PAUSE:1.5}',
            audioTag: 'encouraging',
          },
        ],
        totalDurationMs: 5000,
      },
      {
        blockId: 'block-2',
        segments: [
          {
            text: '[curious] What do you think happens next? {SOCRATIC: "think"}',
            audioTag: 'curious',
            socraticPause: 3,
          },
          {
            text: '[bright] The answer is elegant. {REVEAL}',
            audioTag: 'bright',
            revealTrigger: true,
          },
        ],
        totalDurationMs: 8000,
      },
    ],
    interBlockPausesMs: [2000],
  };
}

describe('narrationAudioGenerator', () => {
  it('generates audio segments from narration', () => {
    const result = generateNarrationAudio(createNarration());

    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });

  it('produces reveal positions', () => {
    const result = generateNarrationAudio(createNarration());

    expect(result.revealPositions.length).toBeGreaterThan(0);
  });

  it('inserts inter-block pauses', () => {
    const result = generateNarrationAudio(createNarration());

    const silenceSegments = result.segments.filter(s => s.isSilence);
    expect(silenceSegments.length).toBeGreaterThan(0);
  });

  it('marks SOCRATIC pauses', () => {
    const narration: LessonNarration = {
      lessonId: 'test',
      blockNarrations: [
        {
          blockId: 'b1',
          segments: [
            {
              text: '[curious] Think about this. {SOCRATIC: "what"}',
              audioTag: 'curious',
              socraticPause: 3,
            },
          ],
          totalDurationMs: 3000,
        },
      ],
      interBlockPausesMs: [],
    };

    const result = generateNarrationAudio(narration);
    const socraticSegs = result.segments.filter(s => s.hasSocraticPause);
    expect(socraticSegs.length).toBeGreaterThan(0);
  });

  it('handles PAUSE markers', () => {
    const narration: LessonNarration = {
      lessonId: 'test',
      blockNarrations: [
        {
          blockId: 'b1',
          segments: [
            {
              text: '[measured] Important point. {PAUSE:2.0}',
              audioTag: 'measured',
            },
          ],
          totalDurationMs: 3000,
        },
      ],
      interBlockPausesMs: [],
    };

    const result = generateNarrationAudio(narration);
    const pauseSegs = result.segments.filter(s => s.isSilence && s.pauseAfterMs === 0 && !s.hasSocraticPause);
    expect(pauseSegs.length).toBeGreaterThan(0);
  });

  it('handles empty narration', () => {
    const narration: LessonNarration = {
      lessonId: 'test',
      blockNarrations: [],
      interBlockPausesMs: [],
    };

    const result = generateNarrationAudio(narration);
    expect(result.segments).toHaveLength(0);
    expect(result.totalDurationMs).toBe(0);
  });
});
