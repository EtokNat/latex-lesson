import type { LessonBlock } from '../data/types';
import type { LessonNarration } from '../data/narrationTypes';
import { smartSplitLines, parseEquation, totalReveal } from './equationParser';

export function computeMaxReveal(block: LessonBlock): number {
  if (block.type !== 'math') return 1;
  try {
    let eq = block.content.trim();
    if (eq.startsWith('\\begin{aligned}') && eq.endsWith('\\end{aligned}')) {
      eq = eq.slice('\\begin{aligned}'.length, -'\\end{aligned}'.length).trim();
    }
    const lines = smartSplitLines(eq);
    return lines.reduce((sum, line) => {
      const nodes = parseEquation(line);
      return sum + nodes.reduce((s, n) => s + totalReveal(n), 0);
    }, 0);
  } catch {
    return 1;
  }
}

export function injectRevealTriggers(narration: LessonNarration, lesson: { blocks: LessonBlock[] }): void {
  for (const bn of narration.blockNarrations) {
    const block = lesson.blocks.find(b => b.id === bn.blockId);
    if (!block || block.type !== 'math') continue;

    const maxReveal = computeMaxReveal(block);
    const segments = bn.segments;

    for (const seg of segments) seg.revealTrigger = false;

    const revealCount = Math.min(maxReveal, segments.length - 1);
    if (revealCount > 0 && segments.length > 1) {
      const step = segments.length / revealCount;
      for (let i = 0; i < revealCount; i++) {
        const idx = Math.floor(i * step);
        if (idx < segments.length - 1) {
          segments[idx].revealTrigger = true;
        }
      }
    }
  }
}
