import type { Lesson } from '../data/types';
import type { LessonNarration } from '../data/narrationTypes';
import type { KnowledgeGraph } from '../data/knowledgeGraph';
import type { SymbolLedger } from '../data/symbolLedger';
import type { TeachingPlan } from './agents/teachingPlanAgent';
import type { VisionDescription } from './agents/visionAgent';
import type { RelevanceReport } from './relevanceQuery';
import type { ValidationReport } from './agents/validationAgent';
import { buildKnowledgeGraph } from './knowledgeGraphBuilder';
import { buildSymbolLedger } from './symbolLedgerBuilder';
import { generateTeachingPlan } from './agents/teachingPlanAgent';
import { analyzeImage } from './agents/visionAgent';
import { queryRelevance } from './relevanceQuery';
import { generateNarrationScript } from './agents/narrationScriptAgent';
import { validateNarration } from './agents/validationAgent';

export interface PipelineProgress {
  step: string;
  detail: string;
}

export interface PipelineResult {
  narration: LessonNarration;
  validationReport: ValidationReport;
  kg: KnowledgeGraph;
  ledger: SymbolLedger;
  totalRetries: number;
  progress: PipelineProgress[];
}

function getSurroundingContext(lesson: Lesson, blockIndex: number): string {
  const blocks: string[] = [];
  const start = Math.max(0, blockIndex - 1);
  const end = Math.min(lesson.blocks.length, blockIndex + 2);
  for (let i = start; i < end; i++) {
    if (i === blockIndex) continue;
    const b = lesson.blocks[i];
    blocks.push(`[Block ${i}, ${b.type}]: ${b.content.slice(0, 150)}`);
  }
  return blocks.join('\n');
}

function collectCriticalBlockIds(report: ValidationReport): string[] {
  return report.violations
    .filter(v => v.severity === 'CRITICAL')
    .map(v => v.blockId)
    .filter((id, i, arr) => arr.indexOf(id) === i);
}

const MAX_RETRIES = 3;

export async function runNarrationPipeline(lesson: Lesson): Promise<PipelineResult> {
  console.log('[NarrationPipeline] Starting pipeline for lesson:', lesson.title);

  const progress: PipelineProgress[] = [];

  // Step 1: Build knowledge graph
  progress.push({ step: 'kg', detail: 'Building knowledge graph' });
  const kg = buildKnowledgeGraph(lesson);

  // Step 2: Build symbol ledger
  progress.push({ step: 'ledger', detail: 'Building symbol ledger' });
  const ledger = buildSymbolLedger(lesson);

  // Step 3: Generate teaching plan
  progress.push({ step: 'teaching_plan', detail: 'Generating teaching plan' });
  const teachingPlan = await generateTeachingPlan(lesson, kg);

  // Step 4: Vision analysis for image blocks
  progress.push({ step: 'vision', detail: 'Analyzing image blocks' });
  const visionDescriptions = new Map<string, VisionDescription>();
  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i];
    if (block.type === 'image') {
      const context = getSurroundingContext(lesson, i);
      const desc = await analyzeImage(block, context);
      visionDescriptions.set(block.id, desc);
    }
  }

  // Step 5: Relevance queries per block
  progress.push({ step: 'relevance', detail: 'Running relevance queries' });
  const relevanceReports = new Map<string, RelevanceReport>();
  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i];
    const conceptIds = [...kg.concepts.keys()].filter(cid => {
      const c = kg.concepts.get(cid);
      return c && c.introducedAt <= i && c.lastReferencedAt >= i - 3;
    });
    if (conceptIds.length > 0) {
      const report = queryRelevance(conceptIds[0], i, kg, 'bridges');
      relevanceReports.set(block.id, report);
    }
  }

  // Step 6: Generate narration + validate (with retry loop)
  progress.push({ step: 'narration', detail: 'Generating narration script' });
  let narration: LessonNarration;
  let validationReport: ValidationReport;
  let totalRetries = 0;

  narration = await generateNarrationScript({
    lesson,
    teachingPlan,
    visionDescriptions,
    relevanceReports,
  });

  validationReport = validateNarration(narration, lesson, kg, ledger);

  while (!validationReport.pass && totalRetries < MAX_RETRIES) {
    const criticalBlocks = collectCriticalBlockIds(validationReport);
    console.log(
      '[NarrationPipeline] Retry',
      totalRetries + 1,
      '— regenerating narration for blocks:',
      criticalBlocks
    );

    totalRetries++;
    narration = await generateNarrationScript({
      lesson,
      teachingPlan,
      visionDescriptions,
      relevanceReports,
    });
    validationReport = validateNarration(narration, lesson, kg, ledger);
  }

  if (!validationReport.pass) {
    console.warn(
      '[NarrationPipeline] Still has',
      validationReport.criticalCount,
      'critical violations after',
      MAX_RETRIES,
      'retries'
    );
  }

  console.log(
    '[NarrationPipeline] Pipeline complete:',
    lesson.blocks.length,
    'blocks narrated,',
    totalRetries,
    'retries needed'
  );

  return { narration, validationReport, kg, ledger, totalRetries, progress };
}
