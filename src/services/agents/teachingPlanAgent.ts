import type { Lesson, LessonBlock } from '../data/types';
import type { KnowledgeGraph, ConceptNode } from '../data/knowledgeGraph';
import { generateCompletion } from '../llmClient';

export interface TeachingPlanItem {
  blockId: string;
  concept: string;
  priorKnowledge: string;
  analogy: string;
  anticipatedConfusion: string;
  emotionalBeat: string;
  bridge: string;
  crossReferences: string[];
}

export interface TeachingPlan {
  lessonId: string;
  items: TeachingPlanItem[];
}

function formatConceptList(concepts: Map<string, ConceptNode>): string {
  const lines: string[] = [];
  for (const c of concepts.values()) {
    lines.push(`- ${c.name} (${c.type}, introduced at block ${c.introducedAt})`);
  }
  return lines.join('\n');
}

function formatBlocks(blocks: LessonBlock[]): string {
  return blocks
    .map((b, i) => `BLOCK ${i} [${b.type}]: ${b.content.slice(0, 200)}`)
    .join('\n---\n');
}

const TEACHING_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockId: { type: 'string' },
          concept: { type: 'string' },
          priorKnowledge: { type: 'string' },
          analogy: { type: 'string' },
          anticipatedConfusion: { type: 'string' },
          emotionalBeat: { type: 'string' },
          bridge: { type: 'string' },
          crossReferences: { type: 'array', items: { type: 'string' } },
        },
        required: ['blockId', 'concept', 'priorKnowledge', 'analogy', 'anticipatedConfusion', 'emotionalBeat', 'bridge', 'crossReferences'],
      },
    },
  },
  required: ['items'],
};

const TEACHING_PLAN_SYSTEM_PROMPT = `You are an expert math teacher with 20 years of classroom experience.
For each block in this lesson, produce a structured analysis. Output valid JSON in this exact format:

{
  "items": [
    {
      "blockId": "<block id>",
      "concept": "The ONE thing the learner must understand from this block",
      "priorKnowledge": "What they must already know before this block",
      "analogy": "An everyday analogy that makes this concrete",
      "anticipatedConfusion": "What learners will most likely get wrong here",
      "emotionalBeat": "What the learner should FEEL (curious, confident, challenged, relieved, excited, careful)",
      "bridge": "How this connects to the NEXT block",
      "crossReferences": ["2-3 specific concepts from earlier in the lesson to reference here"]
    }
  ]
}

Use these emotion words for emotionalBeat: curious, confident, challenged, relieved, excited, careful.`;

export function buildTeachingPlanUserPrompt(lesson: Lesson, kg: KnowledgeGraph): string {
  const conceptList = formatConceptList(kg.concepts);
  const blockList = formatBlocks(lesson.blocks);

  return `Lesson: "${lesson.title}"
Lesson ID: ${lesson.id}

KNOWLEDGE GRAPH CONCEPTS:
${conceptList || '(none)'}

LESSON BLOCKS:
${blockList}

For each block above, fill out the structured analysis. Focus especially on cross-references: use concept names from the knowledge graph that were introduced in EARLIER blocks.`;
}

const BATCH_SIZE = 10;

function buildBatchPrompt(
  lesson: Lesson,
  kg: KnowledgeGraph,
  batchIndex: number,
  batchBlocks: LessonBlock[],
  startIdx: number,
): string {
  const conceptList = formatConceptList(kg.concepts);
  const blockList = formatBlocks(batchBlocks);

  return `Lesson: "${lesson.title}"
Lesson ID: ${lesson.id}

KNOWLEDGE GRAPH CONCEPTS:
${conceptList || '(none)'}

LESSON BLOCKS (batch ${batchIndex + 1}, blocks ${startIdx}–${startIdx + batchBlocks.length - 1}):
${blockList}

For each block above, fill out the structured analysis. Focus especially on cross-references: use concept names from the knowledge graph that were introduced in EARLIER blocks.`;
}

async function generateBatchPlan(
  lesson: Lesson,
  kg: KnowledgeGraph,
  batchIndex: number,
  batchBlocks: LessonBlock[],
  startIdx: number,
  retryCount = 0,
): Promise<TeachingPlanItem[]> {
  const userPrompt = buildBatchPrompt(lesson, kg, batchIndex, batchBlocks, startIdx);

  const result = await generateCompletion(TEACHING_PLAN_SYSTEM_PROMPT, userPrompt, {
    model: 'claude-opus-4-7', // gemini-2.5-flash for responseJsonSchema
    maxTokens: 4096,
    temperature: 0.3,
    responseSchema: TEACHING_PLAN_SCHEMA,
  });

  try {
    const parsed = JSON.parse(result.text) as { items: TeachingPlanItem[] };

    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error(`Invalid teaching plan format in batch ${batchIndex} — missing items array`);
    }

    return parsed.items;
  } catch (parseErr) {
    if (retryCount < 2) {
      console.warn(
        `[TeachingPlanAgent] Batch ${batchIndex} JSON parse failed (attempt ${retryCount + 1}), retrying...`,
      );
      return generateBatchPlan(lesson, kg, batchIndex, batchBlocks, startIdx, retryCount + 1);
    }
    throw parseErr;
  }
}

export async function generateTeachingPlan(
  lesson: Lesson,
  kg: KnowledgeGraph
): Promise<TeachingPlan> {
  const totalBlocks = lesson.blocks.length;
  console.log('[TeachingPlanAgent] Generating plan for', totalBlocks, 'blocks in batches of', BATCH_SIZE);

  const allItems: TeachingPlanItem[] = [];

  for (let i = 0; i < totalBlocks; i += BATCH_SIZE) {
    const batch = lesson.blocks.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);
    console.log(`[TeachingPlanAgent] Batch ${batchIndex + 1}: blocks ${i}–${i + batch.length - 1}`);

    try {
      const items = await generateBatchPlan(lesson, kg, batchIndex, batch, i);
      allItems.push(...items);
      console.log(`[TeachingPlanAgent] Batch ${batchIndex + 1}: generated ${items.length} items`);
    } catch (err) {
      console.error(`[TeachingPlanAgent] Batch ${batchIndex + 1} failed:`, err);
      throw err;
    }
  }

  console.log('[TeachingPlanAgent] Generated plan for', allItems.length, 'blocks total');
  return { lessonId: lesson.id, items: allItems };
}
