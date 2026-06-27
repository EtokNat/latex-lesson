import type { LessonBlock } from '../data/types';
import { generateCompletion } from '../llmClient';

export interface VisionDescription {
  blockId: string;
  mainInsight: string;
  firstLook: string;
  pattern: string;
  teacherQuestion: string;
  connectionToMath: string;
  fallbackUsed: boolean;
}

const VISION_SYSTEM_PROMPT = `Analyze this educational diagram. Output valid JSON in this exact format:

{
  "mainInsight": "What does this image communicate?",
  "firstLook": "Where should the student's eyes go first?",
  "pattern": "What relationship is visible?",
  "teacherQuestion": "What question would a good teacher ask about this image?",
  "connectionToMath": "How does this visual connect to the surrounding mathematical content?"
}

CRITICAL: The author's description is your ground truth. Do not contradict it. Your job is to enrich it pedagogically.`;

function buildVisionUserPrompt(
  block: LessonBlock,
  surroundingContext: string
): string {
  return `Image description (author's ground truth): "${block.content}"

Surrounding lesson context:
${surroundingContext}

Enrich this with pedagogical analysis. Do NOT contradict the author's description.`;
}

function buildFallbackDescription(block: LessonBlock): VisionDescription {
  return {
    blockId: block.id,
    mainInsight: block.content,
    firstLook: 'Refer to the image as shown',
    pattern: 'As described in the accompanying text',
    teacherQuestion: 'What do you notice about this visual?',
    connectionToMath: 'This image connects to the surrounding mathematical content',
    fallbackUsed: true,
  };
}

export async function analyzeImage(
  block: LessonBlock,
  surroundingContext: string
): Promise<VisionDescription> {
  console.log('[VisionAgent] Analyzing image for block:', block.id);

  try {
    const userPrompt = buildVisionUserPrompt(block, surroundingContext);
    const result = await generateCompletion(VISION_SYSTEM_PROMPT, userPrompt, {
      model: 'claude-opus-4-7', // gemini-2.5-flash for reliable JSON
      maxTokens: 1024,
      temperature: 0.4,
    });

    const parsed = JSON.parse(result.text) as Omit<VisionDescription, 'blockId' | 'fallbackUsed'>;

    console.log('[VisionAgent] Analyzed image for block', block.id);
    return {
      blockId: block.id,
      mainInsight: parsed.mainInsight || block.content,
      firstLook: parsed.firstLook || 'Start at the center of the image',
      pattern: parsed.pattern || '',
      teacherQuestion: parsed.teacherQuestion || 'What does this image show?',
      connectionToMath: parsed.connectionToMath || '',
      fallbackUsed: false,
    };
  } catch (err) {
    console.warn('[VisionAgent] Vision API call failed for block', block.id, '— using ground truth fallback');
    return buildFallbackDescription(block);
  }
}
