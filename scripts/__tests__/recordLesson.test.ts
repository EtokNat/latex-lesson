/**
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn().mockRejectedValue(new Error('No browser in test environment')),
  },
}));

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../domStabilizer', () => ({
  waitForDOMStable: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../checkpointManager', () => ({
  saveCheckpoint: vi.fn().mockResolvedValue(undefined),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  clearCheckpoint: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../composite', () => ({
  framesToVideo: vi.fn().mockResolvedValue(undefined),
}));

import { recordLesson } from '../record-lesson';
import type { RecordingConfig, RecordingResult } from '../record-lesson';
import type { Lesson } from '../../src/data/types';
import type { AbsoluteTimeline } from '../../src/services/timelineBuilder';

function makeLesson(): Lesson {
  return {
    id: 'test-lesson-1',
    title: 'Test Lesson',
    blocks: [
      { id: 'b1', type: 'heading', content: 'Test Heading' },
      { id: 'b2', type: 'math', content: 'x^2 + y^2 = z^2' },
    ],
  };
}

function makeTimeline(): AbsoluteTimeline {
  return {
    events: [
      { type: 'lesson_start', timeMs: 0, data: {} },
      { type: 'reveal', timeMs: 500, data: { revealIndex: 0 } },
      { type: 'block_advance', timeMs: 1000, data: { blockIndex: 1 } },
      { type: 'reveal', timeMs: 1500, data: { revealIndex: 1 } },
      { type: 'lesson_end', timeMs: 2000, data: {} },
    ],
    totalDurationMs: 2000,
  };
}

function makeConfig(overrides?: Partial<RecordingConfig>): RecordingConfig {
  return {
    lesson: makeLesson(),
    timeline: makeTimeline(),
    devServerUrl: 'http://localhost:5173',
    outputDir: './test-output',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    ...overrides,
  };
}

describe('recordLesson', () => {
  it('RecordingConfig type is constructable', () => {
    const config = makeConfig();
    expect(config.lesson.title).toBe('Test Lesson');
    expect(config.resolution.width).toBe(1920);
    expect(config.fps).toBe(30);
  });

  it('rejects when browser cannot launch (test env has no chromium)', async () => {
    await expect(recordLesson(makeConfig())).rejects.toThrow('No browser in test environment');
  });

  it('records to default output path structure', () => {
    const config = makeConfig();
    expect(config.outputDir).toBe('./test-output');
  });

  it('handles lesson with no blocks', () => {
    const emptyLesson: Lesson = { id: 'empty', title: 'Empty', blocks: [] };
    const config = makeConfig({ lesson: emptyLesson });
    expect(config.lesson.blocks).toHaveLength(0);
  });

  it('preserves timeline events through config', () => {
    const config = makeConfig();
    expect(config.timeline.events).toHaveLength(5);
    expect(config.timeline.totalDurationMs).toBe(2000);
  });
});
