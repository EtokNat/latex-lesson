import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';

export interface VideoMetadata {
  codec: string;
  resolution: string;
  fps: number;
  durationSec: number;
  audioCodec: string;
  sampleRate: number;
  fileSizeBytes: number;
}

export interface VerificationResult {
  valid: boolean;
  issues: string[];
  metadata: VideoMetadata;
}

function parseFfprobeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function runFfprobe(mp4Path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      mp4Path,
    ];
    execFile('ffprobe', args, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

export async function verifyOutput(mp4Path: string): Promise<VerificationResult> {
  console.log(`[Verify] Checking output: ${mp4Path}`);
  const issues: string[] = [];
  const metadata: VideoMetadata = {
    codec: 'unknown',
    resolution: 'unknown',
    fps: 0,
    durationSec: 0,
    audioCodec: 'unknown',
    sampleRate: 0,
    fileSizeBytes: 0,
  };

  try {
    const stat = await fs.stat(mp4Path);
    metadata.fileSizeBytes = stat.size;
    if (stat.size === 0) {
      issues.push('File size is 0 bytes');
    }
  } catch {
    issues.push(`File not found: ${mp4Path}`);
    console.log(`[Verify] Output invalid: file missing`);
    return { valid: false, issues, metadata };
  }

  try {
    const raw = await runFfprobe(mp4Path);
    const data = parseFfprobeJson(raw);
    if (!data || !data.streams) {
      issues.push('ffprobe returned no stream data');
      return { valid: false, issues, metadata };
    }

    const streams = data.streams as Array<Record<string, unknown>>;
    for (const stream of streams) {
      if (stream.codec_type === 'video') {
        metadata.codec = (stream.codec_name as string) || 'unknown';
        metadata.resolution = `${stream.width}x${stream.height}`;
        const fpsParts = (stream.r_frame_rate as string) || '0/1';
        const [num, den] = fpsParts.split('/').map(Number);
        metadata.fps = den ? num / den : 0;
      }
      if (stream.codec_type === 'audio') {
        metadata.audioCodec = (stream.codec_name as string) || 'unknown';
        metadata.sampleRate = Number(stream.sample_rate) || 0;
      }
    }

    const format = data.format as Record<string, unknown> | undefined;
    if (format && format.duration) {
      metadata.durationSec = Number(format.duration);
    }

    if (metadata.codec !== 'h264') {
      issues.push(`Expected video codec h264, got ${metadata.codec}`);
    }
    if (!metadata.audioCodec || metadata.audioCodec === 'unknown') {
      issues.push('No audio stream found');
    }

    const valid = issues.length === 0;
    if (valid) {
      console.log(`[Verify] Output valid: ${metadata.resolution} ${metadata.fps}fps ${metadata.durationSec}s`);
    } else {
      console.log(`[Verify] Output invalid: ${issues.join('; ')}`);
    }
    return { valid, issues, metadata };
  } catch (err) {
    issues.push(`ffprobe failed: ${err}`);
    console.log(`[Verify] Output invalid: ffprobe error`);
    return { valid: false, issues, metadata };
  }
}
