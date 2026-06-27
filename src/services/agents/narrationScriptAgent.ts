import type { Lesson, LessonBlock } from '../data/types';
import type { LessonNarration, BlockNarration, NarrationSegment, AudioTag } from '../data/narrationTypes';
import type { TeachingPlan, TeachingPlanItem } from './teachingPlanAgent';
import type { VisionDescription } from './visionAgent';
import type { RelevanceReport } from '../relevanceQuery';
import { generateCompletion } from '../llmClient';

export interface NarrationAgentInput {
  lesson: Lesson;
  teachingPlan: TeachingPlan;
  visionDescriptions: Map<string, VisionDescription>;
  relevanceReports: Map<string, RelevanceReport>;
  correctionPrompt?: string;
}

const NARRATION_SYSTEM_PROMPT = `You are writing the spoken narration for a math teaching video.
Your audience is a student seeing this material for the first time.

CRITICAL RULES:
1. NEVER read text verbatim. The student can see it. EXPLAIN it.
2. Use natural deictic references: "Look at this term" / "Right here"
3. Every math expression gets a WHY — not just what, but why
4. Use the teaching plan's emotional beats to guide your tone
5. Anticipate confusion — address it directly
6. Vary sentence length. Short for emphasis. Long for explanation.
7. Cross-reference 2-3 earlier concepts per block (from the provided knowledge graph report)
8. Place {REVEAL} markers at natural teaching moments where the next piece of content should appear
9. Use {SOCRATIC} markers for questions the learner should think about
10. Use {PAUSE:N} markers for dramatic or thinking pauses (N in seconds, e.g. {PAUSE:1.5})

OUTPUT FORMAT — valid JSON:
{
  "blockNarrations": [
    {
      "blockId": "<block id>",
      "segments": [
        { "text": "...", "audioTag": "measured", "revealTrigger": false },
        { "text": "...", "audioTag": "curious", "revealTrigger": true },
        { "text": "...", "audioTag": null, "socraticPause": 3.0 },
        { "text": "...", "audioTag": "encouraging", "revealTrigger": false, "pauseAfterMs": 1000 }
      ]
    }
  ],
  "interBlockPausesMs": [2000, 1500, ...]
}

AUDIO_TAGS — use ONLY these values: excited, warmly, measured, encouraging, authoritatively, calm, curious, bright, patiently, reassuring, seriously, firmly.

Every segment must have a "text" field. audioTag is optional. revealTrigger (boolean) marks where Space should be pressed. socraticPause (number, seconds) is for thinking pauses. pauseAfterMs (number, milliseconds) is for dramatic pauses after speaking.

Mix audio tags to create emotional variety — don't use the same tag for more than 3 consecutive segments.`;

function formatTeachingPlanForPrompt(items: TeachingPlanItem[], block: LessonBlock): string {
  const item = items.find(i => i.blockId === block.id);
  if (!item) return `Block: ${block.id} (no teaching plan available)`;
  return `Teaching Plan for this block:
- Core Concept: ${item.concept}
- Prior Knowledge: ${item.priorKnowledge}
- Analogy: ${item.analogy}
- Anticipated Confusion: ${item.anticipatedConfusion}
- Emotional Beat: ${item.emotionalBeat}
- Bridge to Next: ${item.bridge}
- Cross-References: ${item.crossReferences.join(', ') || 'none'}`;
}

function formatRelevanceReport(report: RelevanceReport | undefined): string {
  if (!report || report.results.length === 0) return '(no cross-references available)';
  return report.results
    .slice(0, 5)
    .map(r => `- ${r.concept.name} (${r.edgeTypes.join(', ')}, score: ${r.score.toFixed(2)}): ${r.explanation}`)
    .join('\n');
}

function formatVisionDescription(vision: VisionDescription | undefined): string {
  if (!vision || vision.fallbackUsed) return '';
  return `Image Analysis:
- Main Insight: ${vision.mainInsight}
- First Look: ${vision.firstLook}
- Pattern: ${vision.pattern}
- Question: ${vision.teacherQuestion}`;
}

function buildBlockContext(block: LessonBlock, index: number, input: NarrationAgentInput): string {
  const plan = formatTeachingPlanForPrompt(input.teachingPlan.items, block);
  const relevance = formatRelevanceReport(input.relevanceReports.get(block.id));
  const vision = block.type === 'image' ? formatVisionDescription(input.visionDescriptions.get(block.id)) : '';

  const parts = [
    `--- BLOCK ${index} (${block.type}) ---`,
    `Block ID: ${block.id}`,
    `On-screen content: "${block.content.slice(0, 300)}"`,
  ];

  if (vision) parts.push(vision);
  parts.push(plan);
  parts.push(`Cross-reference these concepts:\n${relevance}`);

  if (block.type === 'math') {
    parts.push(
      'NOTE: This is a math block with progressive reveal steps. Place {REVEAL} markers between key steps so the student sees each step appear as you explain it.'
    );
  }

  return parts.join('\n\n');
}

function estimateBlockDuration(segments: NarrationSegment[]): number {
  let total = 0;
  for (const seg of segments) {
    const wordCount = seg.text.split(/\s+/).filter(Boolean).length;
    total += wordCount * 300; // ~300ms per word (average speaking rate)
    if (seg.pauseAfterMs) total += seg.pauseAfterMs;
    if (seg.socraticPause) total += seg.socraticPause * 1000;
  }
  return total;
}

function validateAndCleanSegments(segments: unknown[]): NarrationSegment[] {
  const validAudioTags: Set<string> = new Set([
    'excited', 'warmly', 'measured', 'encouraging', 'authoritatively',
    'calm', 'curious', 'bright', 'patiently', 'reassuring', 'seriously', 'firmly',
  ]);

  return segments.map((seg: any) => {
    const cleaned: NarrationSegment = {
      text: String(seg.text || ''),
    };
    if (seg.audioTag && validAudioTags.has(seg.audioTag)) {
      cleaned.audioTag = seg.audioTag as AudioTag;
    }
    if (typeof seg.revealTrigger === 'boolean') {
      cleaned.revealTrigger = seg.revealTrigger;
    }
    if (typeof seg.pauseAfterMs === 'number' && seg.pauseAfterMs > 0) {
      cleaned.pauseAfterMs = seg.pauseAfterMs;
    }
    if (typeof seg.socraticPause === 'number' && seg.socraticPause > 0) {
      cleaned.socraticPause = seg.socraticPause;
    }
    return cleaned;
  });
}

export async function generateNarrationScript(input: NarrationAgentInput): Promise<LessonNarration> {
  console.log('[NarrationScriptAgent] Generating narration for', input.lesson.blocks.length, 'blocks');

  const blocksContext = input.lesson.blocks
    .map((block, i) => buildBlockContext(block, i, input))
    .join('\n\n');

  let userPrompt = `Lesson: "${input.lesson.title}"
Lesson ID: ${input.lesson.id}

${blocksContext}

Generate the complete narration script for this lesson. Follow the output format exactly.`;

  if (input.correctionPrompt) {
    userPrompt = `${input.correctionPrompt}

---
${userPrompt}`;
  }

const NARRATION_SCHEMA = {
  type: 'object',
  properties: {
    blockNarrations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockId: { type: 'string' },
          segments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                audioTag: { type: 'string', enum: ['excited', 'warmly', 'measured', 'encouraging', 'authoritatively', 'calm', 'curious', 'bright', 'patiently', 'reassuring', 'seriously', 'firmly'] },
                revealTrigger: { type: 'boolean' },
                pauseAfterMs: { type: 'number' },
                socraticPause: { type: 'number' },
              },
              required: ['text'],
            },
          },
        },
        required: ['blockId', 'segments'],
      },
    },
    interBlockPausesMs: {
      type: 'array',
      items: { type: 'number' },
    },
  },
  required: ['blockNarrations'],
};

  try {
    const result = await generateCompletion(NARRATION_SYSTEM_PROMPT, userPrompt, {
      model: 'claude-opus-4-7', // gemini-2.5-flash — schema enforcement for 38-block output
      maxTokens: 65536,
      temperature: 0.7,
      responseSchema: NARRATION_SCHEMA,
    });

    const parsed = JSON.parse(result.text) as {
      blockNarrations: Array<{
        blockId: string;
        segments: unknown[];
      }>;
      interBlockPausesMs?: number[];
    };

    if (!parsed.blockNarrations || !Array.isArray(parsed.blockNarrations)) {
      throw new Error('Invalid narration format — missing blockNarrations array');
    }

    const blockNarrations: BlockNarration[] = parsed.blockNarrations.map(bn => {
      const segments = validateAndCleanSegments(bn.segments || []);
      return {
        blockId: bn.blockId,
        segments,
        totalDurationMs: estimateBlockDuration(segments),
      };
    });

    const interBlockPausesMs = parsed.interBlockPausesMs || blockNarrations.map(() => 2000);

    console.log('[NarrationScriptAgent] Generated narration for', blockNarrations.length, 'blocks');
    return {
      lessonId: input.lesson.id,
      blockNarrations,
      interBlockPausesMs,
    };
  } catch (err) {
    console.error('[NarrationScriptAgent] Failed:', err);
    throw err;
  }
}
