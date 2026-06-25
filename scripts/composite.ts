import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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
): Promise<CompositeConfig> {
  const workDir = path.dirname(outputPath);
  const concatListPath = path.join(workDir, 'concat_list.txt');

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
