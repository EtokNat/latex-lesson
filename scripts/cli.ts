import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Lesson } from '../src/data/types';
import type { LessonNarration } from '../src/data/narrationTypes';
import type { AbsoluteTimeline } from '../src/services/timelineBuilder';
import type { RecordingConfig } from './record-lesson';
import { runPreflight } from './preflight';
import { recordLesson } from './record-lesson';
import { buildCompositeConfig, executeComposite } from './composite';
import { verifyOutput } from './verifyOutput';

export interface CLIConfig {
  lesson: 'seed' | string;
  output: string;
  resolution: string;
  fps: number;
  voice: string;
  dryRun: boolean;
  noSandbox: boolean;
  ttsEnabled: boolean;
}

function parseArgs(args: string[]): CLIConfig {
  const config: CLIConfig = {
    lesson: 'seed',
    output: './output/final.mp4',
    resolution: '1920x1080',
    fps: 30,
    voice: 'default',
    dryRun: false,
    noSandbox: false,
    ttsEnabled: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--lesson':
        config.lesson = args[++i];
        break;
      case '--output':
        config.output = args[++i];
        break;
      case '--resolution':
        config.resolution = args[++i];
        break;
      case '--fps':
        config.fps = Number(args[++i]);
        break;
      case '--voice':
        config.voice = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--no-sandbox':
        config.noSandbox = true;
        break;
    }
  }

  return config;
}

function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = res.split('x').map(Number);
  return { width: w || 1920, height: h || 1080 };
}

async function loadLesson(lessonArg: string): Promise<Lesson> {
  if (lessonArg === 'seed') {
    const { SEED_LESSON } = await import('../src/data/seedLesson');
    return SEED_LESSON;
  }
  const raw = await fs.readFile(lessonArg, 'utf-8');
  return JSON.parse(raw) as Lesson;
}

async function generateTimeline(lesson: Lesson, narration: LessonNarration): Promise<AbsoluteTimeline> {
  const { generateNarrationAudio } = await import('../src/services/narrationAudioGenerator');
  const audioResult = generateNarrationAudio(narration);

  const { buildAbsoluteTimeline } = await import('../src/services/timelineBuilder');
  const revealTimings = audioResult.revealPositions.map((timeMs, i) => ({
    revealIndex: i,
    timeMs,
    confidence: 'medium' as const,
    sourceBreakdown: [{ source: 'estimated', valueMs: timeMs }],
  }));

  const blockIds = lesson.blocks.map((b) => b.id);
  const timeline = buildAbsoluteTimeline({ audioResult, revealTimings, blockIds });
  return timeline;
}

export async function runPipeline(cliConfig: CLIConfig): Promise<void> {
  const resolution = parseResolution(cliConfig.resolution);
  const outputDir = path.dirname(cliConfig.output);

  console.log('[CLI] Starting recording:', {
    lesson: cliConfig.lesson,
    output: cliConfig.output,
    resolution: `${resolution.width}x${resolution.height}`,
    fps: cliConfig.fps,
    voice: cliConfig.voice,
    dryRun: cliConfig.dryRun,
    noSandbox: cliConfig.noSandbox,
  });

  console.log('[CLI] Loading lesson...');
  const lesson = await loadLesson(cliConfig.lesson);
  console.log(`[CLI] Loaded lesson: ${lesson.title} (${lesson.blocks.length} blocks)`);

  const devServerUrl = 'http://localhost:5173';
  const preflightResult = await runPreflight(lesson, devServerUrl);

  if (!preflightResult.passed) {
    console.error('[CLI] Pre-flight checks failed:');
    for (const check of preflightResult.checks.filter((c) => !c.passed)) {
      console.error(`  - ${check.name}: ${check.message}`);
    }
    process.exit(1);
  }

  if (cliConfig.dryRun) {
    console.log('[CLI] Dry run complete — all pre-flight checks passed');
    return;
  }

  console.log('[CLI] Generating narration...');
  let narration: LessonNarration;
  try {
    const { runNarrationPipeline } = await import('../src/services/narrationPipeline');
    const pipelineResult = await runNarrationPipeline(lesson);
    narration = pipelineResult.narration;
    console.log(`[CLI] Narration generated: ${narration.blockNarrations.length} blocks (${pipelineResult.totalRetries} retries)`);
  } catch (err) {
    console.error(`[CLI] Narration pipeline failed: ${err}`);
    console.log('[CLI] Falling back to empty narration');
    narration = {
      lessonId: lesson.id,
      blockNarrations: [],
      interBlockPausesMs: [],
    };
  }

  console.log('[CLI] Building timeline...');
  const timeline = await generateTimeline(lesson, narration);
  console.log(`[CLI] Timeline built: ${timeline.events.length} events, ${timeline.totalDurationMs}ms`);

  await fs.mkdir(outputDir, { recursive: true });

  console.log('[CLI] Recording presentation...');
  const recordingConfig: RecordingConfig = {
    lesson,
    timeline,
    devServerUrl,
    outputDir,
    resolution,
    fps: cliConfig.fps,
    noSandbox: cliConfig.noSandbox,
  };
  const recordingResult = await recordLesson(recordingConfig);
  console.log(`[CLI] Recording saved: ${recordingResult.videoPath}`);

  console.log('[CLI] Compositing video...');
  const { generateNarrationAudio } = await import('../src/services/narrationAudioGenerator');
  const audioResult = generateNarrationAudio(narration);
  const compositeConfig = await buildCompositeConfig(
    audioResult.segments,
    recordingResult.videoPath,
    cliConfig.output,
    cliConfig.voice,
  );
  await executeComposite(compositeConfig);

  console.log('[CLI] Verifying output...');
  const verification = await verifyOutput(cliConfig.output);
  if (verification.valid) {
    console.log(`[CLI] Pipeline complete: ${cliConfig.output}`);
  } else {
    console.error(`[CLI] Verification failed: ${verification.issues.join('; ')}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const cliConfig = parseArgs(process.argv.slice(2));
  await runPipeline(cliConfig);
}

import { fileURLToPath } from 'node:url';

const isMainModule =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith('/cli.ts') ||
  process.argv[1]?.endsWith('/cli.js');

if (isMainModule) {
  main().catch((err) => {
    console.error('[CLI] Fatal error:', err);
    process.exit(1);
  });
}
