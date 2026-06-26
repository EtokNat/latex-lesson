import type { Browser, Page } from 'playwright-core';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Lesson } from '../src/data/types';
import type { AbsoluteTimeline } from '../src/services/timelineBuilder';
import { waitForDOMStable } from './domStabilizer';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from './checkpointManager';
import { framesToVideo, type FrameRecord } from './composite';

let _chromium: typeof import('playwright-core').chromium | null = null;

async function getChromium(): Promise<typeof import('playwright-core').chromium> {
  if (_chromium) return _chromium;
  const original = process.platform;
  try {
    if (original === 'android') {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    }
    const pw = await import('playwright-core');
    _chromium = pw.chromium;
  } finally {
    if (original === 'android') {
      Object.defineProperty(process, 'platform', { value: original, configurable: true });
    }
  }
  return _chromium;
}

export interface RecordingConfig {
  lesson: Lesson;
  timeline: AbsoluteTimeline;
  devServerUrl: string;
  outputDir: string;
  resolution: { width: number; height: number };
  fps: number;
  noSandbox?: boolean;
}

export interface RecordingResult {
  videoPath: string;
  durationMs: number;
  checkpoints: number;
}

const PRE_ROLL_MS = 1500;
const POST_ROLL_MS = 2000;
const CHECKPOINT_BLOCK_INTERVAL = 5;

function isTermux(): boolean {
  return !!process.env.TERMUX_VERSION;
}

function getChromiumPath(): string {
  return process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function injectLesson(page: Page, lesson: Lesson): Promise<void> {
  const lessonJson = JSON.stringify(lesson);
  await page.addInitScript((json: string) => {
    const lesson = JSON.parse(json);
    const lib = {
      lessons: [lesson],
      activeLessonId: lesson.id,
    };
    localStorage.setItem('lesson_library', JSON.stringify(lib));
  }, lessonJson);
  console.log(`[Recorder] Injected lesson into localStorage: ${lesson.title}`);
}

async function startPresentation(page: Page): Promise<void> {
  console.log('[Recorder] Starting presentation...');
  const button = page.getByText('Save and Present');
  await button.click();
  await page.waitForSelector('#active-reveal-target', { timeout: 10_000 }).catch(() => {
    console.log('[Recorder] No reveal target found, continuing');
  });
  console.log('[Recorder] Presentation started');
}

async function walkTimeline(
  page: Page,
  timeline: AbsoluteTimeline,
  outputDir: string,
  onFrame?: (frameNum: number, timeMs: number) => Promise<void>,
): Promise<{ blockIndex: number; revealCount: number }> {
  console.log(`[Recorder] Walking timeline: ${timeline.events.length} events, ${timeline.totalDurationMs}ms`);
  const startTime = Date.now();
  let revealCount = 0;
  let blockIndex = 0;
  let lastCheckpointBlock = -1;

  for (const event of timeline.events) {
    const targetTime = startTime + PRE_ROLL_MS + event.timeMs;
    const waitMs = targetTime - Date.now();
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    switch (event.type) {
      case 'lesson_start':
        console.log('[Recorder] Lesson started');
        break;
      case 'block_advance':
        blockIndex = (event.data?.blockIndex as number) ?? blockIndex + 1;
        console.log(`[Recorder] Block ${blockIndex}`);
        break;
      case 'reveal':
        console.log(`[Recorder] Reveal ${revealCount} at ${event.timeMs}ms`);
        await page.keyboard.press('Space');
        revealCount++;
        await waitForDOMStable(page);
        if (onFrame) {
          await onFrame(revealCount, event.timeMs);
        }
        break;
      case 'socratic_question':
        console.log(`[Recorder] Socratic question at ${event.timeMs}ms`);
        break;
      case 'pause_start':
        console.log(`[Recorder] Pause at ${event.timeMs}ms (${event.data?.durationMs}ms)`);
        break;
      case 'pause_end':
        break;
      case 'lesson_end':
        console.log(`[Recorder] Lesson ended at ${event.timeMs}ms`);
        break;
    }

    if (blockIndex > lastCheckpointBlock && blockIndex % CHECKPOINT_BLOCK_INTERVAL === 0) {
      lastCheckpointBlock = blockIndex;
      await saveCheckpoint(
        { blockIndex, revealCount, elapsedMs: event.timeMs },
        path.join(outputDir, 'checkpoint.json'),
      );
    }
  }

  return { blockIndex, revealCount };
}

export async function recordLesson(config: RecordingConfig): Promise<RecordingResult> {
  console.log(`[Recorder] Starting recording: ${config.lesson.title}`);
  console.log(`[Recorder] Resolution: ${config.resolution.width}x${config.resolution.height}, FPS: ${config.fps}`);

  await fs.mkdir(config.outputDir, { recursive: true });

  let checkpointCount = 0;
  const termux = isTermux();

  const existingCheckpoint = await loadCheckpoint(path.join(config.outputDir, 'checkpoint.json'));
  if (existingCheckpoint) {
    console.log(`[Recorder] Resuming from block ${existingCheckpoint.blockIndex}`);
  }

  console.log(`[Recorder] Environment: ${termux ? 'Termux (Android)' : 'Desktop'}`);

  const chromium = await getChromium();
  const browser = termux
    ? await chromium.launch({
        executablePath: getChromiumPath(),
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
      })
    : await chromium.launch({
        headless: true,
        ...(config.noSandbox ? { args: ['--no-sandbox', '--disable-gpu'] } : {}),
      });

  let videoPath: string;
  let framesDir: string | undefined;
  const frameRecords: FrameRecord[] = [];

  if (termux) {
    framesDir = path.join(config.outputDir, 'frames');
    await fs.mkdir(framesDir, { recursive: true });
    videoPath = path.join(config.outputDir, 'raw_video.mp4');
    console.log('[Recorder] Termux detected — using screenshot-based recording');
  } else {
    videoPath = path.join(config.outputDir, 'raw_video.webm');
  }

  const context = termux
    ? await browser.newContext({
        viewport: { width: config.resolution.width, height: config.resolution.height },
        deviceScaleFactor: 2,
      })
    : await browser.newContext({
        viewport: { width: config.resolution.width, height: config.resolution.height },
        deviceScaleFactor: 2,
        recordVideo: {
          dir: config.outputDir,
          size: { width: config.resolution.width, height: config.resolution.height },
        },
      });

  const page = await context.newPage();

  try {
    await injectLesson(page, config.lesson);
    await page.goto(config.devServerUrl, { waitUntil: 'networkidle' });
    console.log(`[Recorder] Page loaded: ${config.devServerUrl}`);

    await startPresentation(page);

    if (framesDir) {
      const initialFile = 'frame_000000.png';
      await page.screenshot({ path: path.join(framesDir, initialFile), type: 'png' });
      frameRecords.push({ file: initialFile, timeMs: 0 });
      console.log('[Recorder] Captured initial frame');
    }

    const startTime = Date.now();
    const onFrame = framesDir
      ? async (frameNum: number, timeMs: number) => {
          const filename = `frame_${String(frameNum).padStart(6, '0')}.png`;
          await page.screenshot({ path: path.join(framesDir, filename), type: 'png' });
          frameRecords.push({ file: filename, timeMs });
        }
      : undefined;

    const { blockIndex, revealCount } = await walkTimeline(
      page,
      config.timeline,
      config.outputDir,
      onFrame,
    );

    const elapsed = Date.now() - startTime;
    if (POST_ROLL_MS > 0) {
      await sleep(POST_ROLL_MS);
      if (onFrame) {
        const finalTimeMs = config.timeline.totalDurationMs + POST_ROLL_MS;
        await onFrame(revealCount + 1, finalTimeMs);
      }
    }

    console.log(`[Recorder] Recording complete: ${elapsed}ms, ${revealCount} reveals, ${blockIndex} blocks`);

    if (framesDir && frameRecords.length > 0) {
      console.log(`[Recorder] Converting ${frameRecords.length} frames to video...`);
      await framesToVideo(framesDir, frameRecords, config.fps, videoPath);
      console.log(`[Recorder] Frame video created: ${videoPath}`);
    }
  } finally {
    if (!termux) {
      const pageVideo = page.video();
      if (pageVideo) {
        const actualPath = await pageVideo.path();
        console.log(`[Recorder] Playwright video path: ${actualPath}`);
        videoPath = actualPath;
      }
    }
    await context.close();
    await browser.close();
  }

  await clearCheckpoint(path.join(config.outputDir, 'checkpoint.json'));

  return {
    videoPath,
    durationMs: config.timeline.totalDurationMs + PRE_ROLL_MS + POST_ROLL_MS,
    checkpoints: checkpointCount,
  };
}
