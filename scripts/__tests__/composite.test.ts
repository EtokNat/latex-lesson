/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCompositeConfig, executeComposite } from '../composite';
import type { AudioSegment } from '../../src/services/narrationAudioGenerator';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: {
    stat: vi.fn().mockResolvedValue({ size: 10485760 }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
  createWriteStream: vi.fn(),
}));

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

import { execFile } from 'node:child_process';

function makeSegment(overrides: Partial<AudioSegment> = {}): AudioSegment {
  return {
    segmentIndex: 0,
    blockId: 'b1',
    text: 'Hello world',
    durationMs: 1000,
    revealTrigger: false,
    hasSocraticPause: false,
    socraticPauseSeconds: 0,
    pauseAfterMs: 0,
    isSilence: false,
    ...overrides,
  };
}

function makeSegments(count: number): AudioSegment[] {
  return Array.from({ length: count }, (_, i) =>
    makeSegment({ segmentIndex: i, blockId: `b${i + 1}` }),
  );
}

describe('buildCompositeConfig', () => {
  it('builds correct ffmpeg arguments', async () => {
    const segments = makeSegments(2);
    const config = await buildCompositeConfig(segments, '/tmp/video.webm', '/tmp/output.mp4');

    expect(config.videoPath).toBe('/tmp/video.webm');
    expect(config.outputPath).toBe('/tmp/output.mp4');
    expect(config.ffmpegArgs).toContain('-y');
    expect(config.ffmpegArgs).toContain('-c:v');
    expect(config.ffmpegArgs).toContain('libx264');
    expect(config.ffmpegArgs).toContain('-crf');
    expect(config.ffmpegArgs).toContain('18');
    expect(config.ffmpegArgs).toContain('-c:a');
    expect(config.ffmpegArgs).toContain('aac');
    expect(config.ffmpegArgs).toContain('-b:a');
    expect(config.ffmpegArgs).toContain('192k');
    expect(config.ffmpegArgs).toContain('-shortest');
    expect(config.ffmpegArgs).toContain('/tmp/output.mp4');
  });

  it('builds config with correct output path', async () => {
    const segments = makeSegments(1);
    const config = await buildCompositeConfig(segments, '/tmp/video.webm', '/tmp/final.mp4');
    expect(config.outputPath).toBe('/tmp/final.mp4');
  });

  it('includes video input in config', async () => {
    const segments: AudioSegment[] = [];
    const config = await buildCompositeConfig(segments, '/tmp/video.webm', '/tmp/out.mp4');
    expect(config.videoPath).toBe('/tmp/video.webm');
  });
});

describe('executeComposite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: (error: null, stdout: string, stderr: string) => void) => {
      const child = {
        on: vi.fn().mockImplementation((event: string, handler: (code: number) => void) => {
          if (event === 'close') {
            setImmediate(() => handler(0));
          }
          return child;
        }),
      };
      setImmediate(() => cb(null, '', ''));
      return child;
    });
  });

  it('executes ffmpeg and returns CompositeResult', async () => {
    const config = await buildCompositeConfig(makeSegments(1), '/tmp/video.webm', '/tmp/output.mp4');
    const result = await executeComposite(config);

    expect(result.outputPath).toBe('/tmp/output.mp4');
    expect(result.fileSizeBytes).toBe(10485760);
    expect(execFile).toHaveBeenCalled();
  });

  it('rejects when ffmpeg exits with non-zero code', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce((_cmd: string, _args: string[], cb: (error: Error | null, stdout: string, stderr: string) => void) => {
      const child = {
        on: vi.fn().mockImplementation((event: string, handler: (code: number) => void) => {
          if (event === 'close') {
            setImmediate(() => handler(1));
          }
          return child;
        }),
      };
      setImmediate(() => cb(null, '', ''));
      return child;
    });

    const config = await buildCompositeConfig(makeSegments(1), '/tmp/video.webm', '/tmp/output.mp4');
    await expect(executeComposite(config)).rejects.toThrow('ffmpeg exited with code 1');
  });

  it('rejects when ffmpeg binary errors', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce((_cmd: string, _args: string[], cb: (error: Error, stdout: string, stderr: string) => void) => {
      setImmediate(() => cb(new Error('ENOENT: ffmpeg not found'), '', ''));
      return { on: vi.fn() };
    });

    const config = await buildCompositeConfig(makeSegments(1), '/tmp/video.webm', '/tmp/output.mp4');
    await expect(executeComposite(config)).rejects.toThrow('ffmpeg not found');
  });
});
