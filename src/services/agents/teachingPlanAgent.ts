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

export async function generateTeachingPlan(
  lesson: Lesson,
  kg: KnowledgeGraph
): Promise<TeachingPlan> {
  console.log('[TeachingPlanAgent] Generating plan for', lesson.blocks.length, 'blocks');

  const userPrompt = buildTeachingPlanUserPrompt(lesson, kg);

  try {
    const result = await generateCompletion(TEACHING_PLAN_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 8192,
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.text) as { items: TeachingPlanItem[] };

    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid teaching plan format — missing items array');
    }

    console.log('[TeachingPlanAgent] Generated plan for', parsed.items.length, 'blocks');
    return { lessonId: lesson.id, items: parsed.items };
  } catch (err) {
    console.error('[TeachingPlanAgent] Failed:', err);
    throw err;
  }
}
