/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCompositeConfig, executeComposite, framesToVideo } from '../composite';
import type { FrameRecord } from '../composite';
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

describe('framesToVideo', () => {
  function makeFrames(count: number): FrameRecord[] {
    return Array.from({ length: count }, (_, i) => ({
      file: `frame_${String(i).padStart(6, '0')}.png`,
      timeMs: i * 1000,
    }));
  }

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

  it('writes concat file with correct duration entries', async () => {
    const frames = makeFrames(3);
    const fsMod = await import('node:fs');
    const writeFileMock = fsMod.promises.writeFile as ReturnType<typeof vi.fn>;

    await framesToVideo('/tmp/frames', frames, 30, '/tmp/output.mp4');

    expect(writeFileMock).toHaveBeenCalled();
    const concatCall = writeFileMock.mock.calls.find(
      (call: string[]) => String(call[0]).endsWith('concat.txt'),
    );
    expect(concatCall).toBeDefined();
    const concatBody = concatCall![1] as string;
    expect(concatBody).toContain('frame_000000.png');
    expect(concatBody).toContain('duration 1.000');
    expect(concatBody).toContain('frame_000001.png');
    expect(concatBody).toContain('frame_000002.png');
  });

  it('runs ffmpeg with image concat arguments', async () => {
    const frames = makeFrames(2);
    await framesToVideo('/tmp/frames', frames, 30, '/tmp/out.mp4');

    expect(execFile).toHaveBeenCalled();
    const callArgs = (execFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe('ffmpeg');
    expect(callArgs[1]).toContain('-f');
    expect(callArgs[1]).toContain('concat');
    expect(callArgs[1]).toContain('-safe');
    expect(callArgs[1]).toContain('0');
    expect(callArgs[1]).toContain('-c:v');
    expect(callArgs[1]).toContain('libx264');
    expect(callArgs[1]).toContain('-pix_fmt');
    expect(callArgs[1]).toContain('yuv420p');
  });

  it('handles single frame gracefully', async () => {
    const frames = makeFrames(1);
    const fsMod = await import('node:fs');
    const writeFileMock = fsMod.promises.writeFile as ReturnType<typeof vi.fn>;

    await framesToVideo('/tmp/frames', frames, 30, '/tmp/single.mp4');

    const concatCall = writeFileMock.mock.calls.find(
      (call: string[]) => String(call[0]).endsWith('concat.txt'),
    );
    expect(concatCall).toBeDefined();
    expect(concatCall![1]).toContain('duration 2.000');
  });

  it('handles zero frames gracefully', async () => {
    const fsMod = await import('node:fs');
    const writeFileMock = fsMod.promises.writeFile as ReturnType<typeof vi.fn>;

    await framesToVideo('/tmp/frames', [], 30, '/tmp/empty.mp4');

    const concatCall = writeFileMock.mock.calls.find(
      (call: string[]) => String(call[0]).endsWith('concat.txt'),
    );
    expect(concatCall).toBeDefined();
    expect(concatCall![1]).toBe('');
  });

  it('rejects when ffmpeg fails', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce((_cmd: string, _args: string[], cb: (error: Error, stdout: string, stderr: string) => void) => {
      setImmediate(() => cb(new Error('ENOENT: ffmpeg not found'), '', ''));
      return { on: vi.fn() };
    });

    await expect(framesToVideo('/tmp/frames', makeFrames(1), 30, '/tmp/fail.mp4')).rejects.toThrow(
      'ffmpeg not found',
    );
  });

  it('rejects when ffmpeg exits with non-zero code', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce((_cmd: string, _args: string[], cb: (error: null, stdout: string, stderr: string) => void) => {
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

    await expect(framesToVideo('/tmp/frames', makeFrames(1), 30, '/tmp/fail.mp4')).rejects.toThrow(
      'framesToVideo exited with code 1',
    );
  });
});
