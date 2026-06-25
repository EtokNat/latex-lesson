import type { Lesson, LessonBlock } from '../src/data/types';
import katex from 'katex';

export interface PreflightCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
}

function validateLesson(lesson: Lesson): PreflightCheck {
  console.log('[Preflight] Validating lesson structure...');
  if (!lesson.id || !lesson.title || !Array.isArray(lesson.blocks)) {
    return { name: 'Lesson Structure', passed: false, message: 'Missing required fields: id, title, or blocks' };
  }
  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i];
    if (!block.id || !block.type || block.content === undefined) {
      return { name: 'Lesson Structure', passed: false, message: `Block ${i} missing required fields: id, type, or content` };
    }
  }
  console.log('[Preflight] Lesson structure valid');
  return { name: 'Lesson Structure', passed: true, message: `${lesson.blocks.length} blocks validated` };
}

async function checkImageUrls(blocks: LessonBlock[]): Promise<PreflightCheck> {
  console.log('[Preflight] Checking image URLs...');
  const imageBlocks = blocks.filter((b) => b.type === 'image' && b.imageUrl);
  if (imageBlocks.length === 0) {
    console.log('[Preflight] No image blocks to check');
    return { name: 'Image URLs', passed: true, message: 'No image blocks' };
  }

  const failed: string[] = [];
  for (const block of imageBlocks) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(block.imageUrl!, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        failed.push(`${block.imageUrl} (HTTP ${response.status})`);
      } else {
        console.log(`[Preflight] Image OK: ${block.imageUrl}`);
      }
    } catch {
      failed.push(`${block.imageUrl} (unreachable)`);
    }
  }

  if (failed.length > 0) {
    return { name: 'Image URLs', passed: false, message: `${failed.length} unreachable: ${failed.join(', ')}` };
  }
  console.log('[Preflight] All image URLs reachable');
  return { name: 'Image URLs', passed: true, message: `${imageBlocks.length} reachable` };
}

function checkLatexParseability(blocks: LessonBlock[]): PreflightCheck {
  console.log('[Preflight] Checking LaTeX parseability...');
  const mathBlocks = blocks.filter((b) => b.type === 'math');
  if (mathBlocks.length === 0) {
    return { name: 'LaTeX', passed: true, message: 'No math blocks' };
  }

  const failed: number[] = [];
  for (let i = 0; i < mathBlocks.length; i++) {
    try {
      katex.renderToString(mathBlocks[i].content, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (err) {
      failed.push(i);
      console.log(`[Preflight] LaTeX block ${i} parse error: ${err}`);
    }
  }

  if (failed.length > 0) {
    return { name: 'LaTeX', passed: false, message: `${failed.length} blocks failed to parse (indices: ${failed.join(', ')})` };
  }
  console.log('[Preflight] All LaTeX blocks parseable');
  return { name: 'LaTeX', passed: true, message: `${mathBlocks.length} parseable` };
}

async function checkDevServer(url: string): Promise<PreflightCheck> {
  console.log(`[Preflight] Checking dev server at ${url}...`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      console.log('[Preflight] Dev server responding');
      return { name: 'Dev Server', passed: true, message: `Responding at ${url}` };
    }
    return { name: 'Dev Server', passed: false, message: `HTTP ${response.status} at ${url}` };
  } catch {
    return { name: 'Dev Server', passed: false, message: `Unreachable at ${url}` };
  }
}

export async function runPreflight(
  lesson: Lesson,
  devServerUrl: string,
): Promise<PreflightResult> {
  console.log('[Preflight] Running pre-flight checks...');

  const checks: PreflightCheck[] = [];

  checks.push(validateLesson(lesson));
  checks.push(await checkImageUrls(lesson.blocks));
  checks.push(checkLatexParseability(lesson.blocks));
  checks.push(await checkDevServer(devServerUrl));

  const passed = checks.every((c) => c.passed);
  if (passed) {
    console.log('[Preflight] All checks passed');
  } else {
    const failed = checks.filter((c) => !c.passed);
    console.log(`[Preflight] BLOCKED: ${failed.map((f) => f.name).join(', ')}`);
  }

  return { passed, checks };
}
