import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AudioSegment } from '../src/services/narrationAudioGenerator';

export interface CompositeConfig {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  ffmpegArgs: string[];
}

export interface CompositeResult {
  outputPath: string;
  durationMs: number;
  fileSizeBytes: number;
}

export interface FrameRecord {
  file: string;
  timeMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSilenceWav(filePath: string, durationMs: number): Promise<void> {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // data section is already zero-filled (silence)

  await fs.writeFile(filePath, buffer);
}

export async function buildCompositeConfig(
  segments: readonly AudioSegment[],
  videoPath: string,
  outputPath: string,
  voiceId?: string,
): Promise<CompositeConfig> {
  const workDir = path.dirname(outputPath);
  await fs.mkdir(workDir, { recursive: true });

  const safeSegments =
    segments.length > 0 ? segments : [{ segmentIndex: 0, blockId: 'fallback', text: '', durationMs: 500, revealTrigger: false, hasSocraticPause: false, socraticPauseSeconds: 0, pauseAfterMs: 0, isSilence: true } as AudioSegment];

  const concatLines: string[] = [];
  for (let i = 0; i < safeSegments.length; i++) {
    const seg = safeSegments[i];
    const durationMs = Math.max(seg.durationMs, 100);
    const wavName = `audio_${String(i).padStart(4, '0')}.wav`;
    const wavPath = path.join(workDir, wavName);

    if (seg.isSilence || seg.text.trim().length === 0) {
      await generateSilenceWav(wavPath, durationMs);
    } else {
      let ttsSuccess = false;
      try {
        const { generateSpeech } = await import('../src/services/ttsClient');
        const ttsResult = await generateSpeech(seg.text, voiceId || 'default');
        await fs.writeFile(wavPath, Buffer.from(ttsResult.audioBuffer));
        ttsSuccess = true;
        console.log(`[Composite] TTS audio generated: ${wavName} (${durationMs}ms)`);
      } catch (err) {
        console.warn(`[Composite] TTS unavailable for segment ${i}, falling back to silence: ${err}`);
      }
      if (!ttsSuccess) {
        await generateSilenceWav(wavPath, durationMs);
      }
    }

    concatLines.push(`file '${wavName}'`);
  }

  const concatListPath = path.join(workDir, 'concat_list.txt');
  await fs.writeFile(concatListPath, concatLines.join('\n'));

  const ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-i', videoPath,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath,
  ];

  return {
    videoPath,
    audioPath: concatListPath,
    outputPath,
    ffmpegArgs,
  };
}

export function executeComposite(config: CompositeConfig): Promise<CompositeResult> {
  return new Promise((resolve, reject) => {
    console.log(`[Composite] Running ffmpeg: ${config.ffmpegArgs.join(' ')}`);
    const child = execFile('ffmpeg', config.ffmpegArgs, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Composite] ffmpeg error: ${stderr}`);
        reject(error);
        return;
      }
      console.log(`[Composite] ffmpeg complete`);
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      try {
        const stat = await fs.stat(config.outputPath);
        const result: CompositeResult = {
          outputPath: config.outputPath,
          durationMs: 0,
          fileSizeBytes: stat.size,
        };
        console.log(
          `[Composite] Final video: ${config.outputPath} (${(stat.size / (1024 * 1024)).toFixed(1)}MB)`,
        );
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function framesToVideo(
  framesDir: string,
  frameRecords: FrameRecord[],
  fps: number,
  outputPath: string,
): Promise<void> {
  const concatLines: string[] = [];
  for (let i = 0; i < frameRecords.length; i++) {
    const durationMs =
      i < frameRecords.length - 1
        ? frameRecords[i + 1].timeMs - frameRecords[i].timeMs
        : 2000;
    const durationSec = Math.max(durationMs / 1000, 1 / fps);
    concatLines.push(`file '${frameRecords[i].file}'`);
    concatLines.push(`duration ${durationSec.toFixed(3)}`);
  }
  if (frameRecords.length > 0) {
    concatLines.push(`file '${frameRecords[frameRecords.length - 1].file}'`);
  }

  const concatPath = path.join(framesDir, 'concat.txt');
  await fs.writeFile(concatPath, concatLines.join('\n'));

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      outputPath,
    ];

    console.log(`[FramesToVideo] Running ffmpeg: ${args.join(' ')}`);
    const child = execFile('ffmpeg', args, (error, _stdout, stderr) => {
      if (error) {
        console.error(`[FramesToVideo] ffmpeg error: ${stderr}`);
        reject(error);
        return;
      }
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg framesToVideo exited with code ${code}`));
        return;
      }
      const stat = await fs.stat(outputPath);
      console.log(
        `[FramesToVideo] Created: ${outputPath} (${(stat.size / (1024 * 1024)).toFixed(1)}MB)`,
      );
      resolve();
    });
  });
}
