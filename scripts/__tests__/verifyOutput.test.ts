/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyOutput } from '../verifyOutput';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs', () => ({
  promises: {
    stat: vi.fn().mockResolvedValue({ size: 5242880 }),
  },
}));

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';

function makeFfprobeOutput(overrides: {
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: string;
  duration?: number;
  sampleRate?: number;
  noAudio?: boolean;
} = {}): string {
  const {
    videoCodec = 'h264',
    audioCodec = 'aac',
    resolution = '1920x1080',
    fps = '30/1',
    duration = 120.5,
    sampleRate = 44100,
    noAudio = false,
  } = overrides;

  const [width, height] = resolution.split('x');
  const streams: Array<Record<string, unknown>> = [
    {
      codec_type: 'video',
      codec_name: videoCodec,
      width: Number(width),
      height: Number(height),
      r_frame_rate: fps,
    },
  ];

  if (!noAudio) {
    streams.push({
      codec_type: 'audio',
      codec_name: audioCodec,
      sample_rate: String(sampleRate),
    });
  }

  return JSON.stringify({
    streams,
    format: { duration: String(duration) },
  });
}

describe('verifyOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (error: null, stdout: string) => void) => {
        setImmediate(() => cb(null, makeFfprobeOutput()));
      },
    );
  });

  it('verifies a valid MP4 file', async () => {
    const result = await verifyOutput('/tmp/valid.mp4');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.metadata.codec).toBe('h264');
    expect(result.metadata.resolution).toBe('1920x1080');
    expect(result.metadata.fps).toBe(30);
    expect(result.metadata.durationSec).toBe(120.5);
    expect(result.metadata.audioCodec).toBe('aac');
    expect(result.metadata.fileSizeBytes).toBe(5242880);
  });

  it('reports file not found', async () => {
    const mockFsStat = fs.stat as ReturnType<typeof vi.fn>;
    mockFsStat.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await verifyOutput('/tmp/missing.mp4');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('File not found'))).toBe(true);
  });

  it('reports zero-byte file', async () => {
    const mockFsStat = fs.stat as ReturnType<typeof vi.fn>;
    mockFsStat.mockResolvedValueOnce({ size: 0 });

    const result = await verifyOutput('/tmp/empty.mp4');
    expect(result.issues.some((i) => i.includes('0 bytes'))).toBe(true);
  });

  it('reports wrong video codec', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce(
      (_cmd: string, _args: string[], cb: (error: null, stdout: string) => void) => {
        setImmediate(() => cb(null, makeFfprobeOutput({ videoCodec: 'vp9' })));
      },
    );

    const result = await verifyOutput('/tmp/vp9.mp4');
    expect(result.issues.some((i) => i.includes('h264'))).toBe(true);
  });

  it('reports missing audio stream', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce(
      (_cmd: string, _args: string[], cb: (error: null, stdout: string) => void) => {
        setImmediate(() => cb(null, makeFfprobeOutput({ noAudio: true })));
      },
    );

    const result = await verifyOutput('/tmp/noaudio.mp4');
    expect(result.issues.some((i) => i.includes('No audio'))).toBe(true);
  });

  it('handles ffprobe failure gracefully', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce(
      (_cmd: string, _args: string[], cb: (error: Error) => void) => {
        setImmediate(() => cb(new Error('ffprobe not installed')));
      },
    );

    const result = await verifyOutput('/tmp/bad.mp4');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('ffprobe failed'))).toBe(true);
  });

  it('handles invalid JSON from ffprobe', async () => {
    const mockExecFile = execFile as ReturnType<typeof vi.fn>;
    mockExecFile.mockImplementationOnce(
      (_cmd: string, _args: string[], cb: (error: null, stdout: string) => void) => {
        setImmediate(() => cb(null, 'not json'));
      },
    );

    const result = await verifyOutput('/tmp/corrupt.mp4');
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('no stream data'))).toBe(true);
  });
});
