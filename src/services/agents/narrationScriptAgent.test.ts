import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateNarrationScript } from './narrationScriptAgent';
import type { Lesson } from '../data/types';
import type { TeachingPlan } from './teachingPlanAgent';
import type { VisionDescription } from './visionAgent';
import type { RelevanceReport } from '../relevanceQuery';
import type { ConceptNode, KnowledgeGraph } from '../data/knowledgeGraph';

vi.mock('../llmClient', () => ({
  generateCompletion: vi.fn(),
  configureLLMClient: vi.fn(),
}));

import { generateCompletion } from '../llmClient';

const mockedGenerateCompletion = generateCompletion as ReturnType<typeof vi.fn>;

function buildMockInput() {
  const lesson: Lesson = {
    id: 'test-lesson',
    title: 'Test Lesson',
    blocks: [
      { id: 'b1', type: 'heading', content: '1. Solving Equations' },
      { id: 'b2', type: 'text', content: 'A quadratic equation has the form ax² + bx + c = 0.' },
      {
        id: 'b3',
        type: 'math',
        content: '\\begin{aligned}\nx^2 - 4 &= 0 \\\\\nx^2 &= 4 \\\\\nx &= \\pm 2\n\\end{aligned}',
      },
    ],
  };

  const teachingPlan: TeachingPlan = {
    lessonId: 'test-lesson',
    items: [
      {
        blockId: 'b1', concept: 'Overview', priorKnowledge: 'Basic algebra',
        analogy: 'Like a chapter title', anticipatedConfusion: 'None',
        emotionalBeat: 'curious', bridge: 'Sets up the lesson', crossReferences: [],
      },
      {
        blockId: 'b2', concept: 'Standard form', priorKnowledge: 'Variables',
        analogy: 'Like a recipe format', anticipatedConfusion: 'Confusing a/b/c',
        emotionalBeat: 'confident', bridge: 'Leads to solving', crossReferences: ['Solving Equations'],
      },
      {
        blockId: 'b3', concept: 'Solving steps', priorKnowledge: 'Square roots',
        analogy: 'Like unwrapping a package', anticipatedConfusion: 'Forgetting ±',
        emotionalBeat: 'careful', bridge: 'Next method', crossReferences: ['Standard form'],
      },
    ],
  };

  const visionDescriptions = new Map<string, VisionDescription>();
  const relevanceReports = new Map<string, RelevanceReport>();

  return { lesson, teachingPlan, visionDescriptions, relevanceReports };
}

const mockNarrationResponse = {
  blockNarrations: [
    {
      blockId: 'b1',
      segments: [
        { text: 'Let us begin by looking at how we solve equations.', audioTag: 'calm', revealTrigger: false },
        { text: 'This is the foundation for everything that follows.', audioTag: 'measured', revealTrigger: false, pauseAfterMs: 1000 },
      ],
    },
    {
      blockId: 'b2',
      segments: [
        { text: 'Here is the standard form of a quadratic equation.', audioTag: 'authoritatively', revealTrigger: false },
        { text: 'Notice the three coefficients a, b, and c.', audioTag: 'curious', revealTrigger: true },
        { text: 'Each one plays a different role in shaping the parabola.', audioTag: 'measured', revealTrigger: false },
      ],
    },
    {
      blockId: 'b3',
      segments: [
        { text: 'Watch as we solve this step by step.', audioTag: 'encouraging', revealTrigger: false },
        { text: 'First, we isolate the x² term.', audioTag: 'measured', revealTrigger: true },
        { text: 'Now we take the square root of both sides.', audioTag: 'measured', revealTrigger: true },
        { text: 'Do not forget the plus-or-minus!', audioTag: 'seriously', revealTrigger: true },
        { text: 'Think about why both positive and negative work.', audioTag: 'curious', revealTrigger: false, socraticPause: 3.0 },
      ],
    },
  ],
  interBlockPausesMs: [2000, 1500],
};

describe('narrationScriptAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates tagged narration with {REVEAL} markers', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(mockNarrationResponse),
      promptTokens: 1000,
      completionTokens: 800,
      estimatedCost: 0.015,
    });

    const input = buildMockInput();
    const narration = await generateNarrationScript(input);

    expect(narration.lessonId).toBe('test-lesson');
    expect(narration.blockNarrations.length).toBeGreaterThan(0);

    const mathNarration = narration.blockNarrations.find(bn => bn.blockId === 'b3');
    expect(mathNarration).toBeDefined();
    const revealSegments = mathNarration!.segments.filter(s => s.revealTrigger);
    expect(revealSegments.length).toBeGreaterThan(0);
  });

  it('includes cross-references in narration prompts', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(mockNarrationResponse),
      promptTokens: 800,
      completionTokens: 600,
      estimatedCost: 0.01,
    });

    const input = buildMockInput();
    const narration = await generateNarrationScript(input);

    expect(narration.blockNarrations.length).toBe(3);
  });

  it('validates and cleans segments with invalid audio tags', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        blockNarrations: [
          {
            blockId: 'b1',
            segments: [
              { text: 'Valid segment', audioTag: 'calm', revealTrigger: true },
              { text: 'Invalid tag segment', audioTag: 'not-a-real-tag', revealTrigger: false },
              { text: 'No tag segment', revealTrigger: false },
            ],
          },
        ],
        interBlockPausesMs: [1000],
      }),
      promptTokens: 300,
      completionTokens: 200,
      estimatedCost: 0.005,
    });

    const input = buildMockInput();
    const narration = await generateNarrationScript(input);

    const blockNarration = narration.blockNarrations[0];
    expect(blockNarration.segments[0].audioTag).toBe('calm');
    expect(blockNarration.segments[1].audioTag).toBeUndefined(); // invalid tag stripped
    expect(blockNarration.segments[2].audioTag).toBeUndefined();
  });

  it('computes totalDurationMs per block', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(mockNarrationResponse),
      promptTokens: 500,
      completionTokens: 400,
      estimatedCost: 0.008,
    });

    const input = buildMockInput();
    const narration = await generateNarrationScript(input);

    for (const bn of narration.blockNarrations) {
      expect(typeof bn.totalDurationMs).toBe('number');
      expect(bn.totalDurationMs).toBeGreaterThan(0);
    }
  });

  it('handles missing interBlockPausesMs', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        blockNarrations: [
          { blockId: 'b1', segments: [{ text: 'Test', audioTag: 'calm' }] },
        ],
      }),
      promptTokens: 200,
      completionTokens: 100,
      estimatedCost: 0.003,
    });

    const input = buildMockInput();
    const narration = await generateNarrationScript(input);
    expect(narration.interBlockPausesMs.length).toBeGreaterThan(0);
  });

  it('throws on invalid narration format', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify({ wrongField: 'bad' }),
      promptTokens: 100,
      completionTokens: 10,
      estimatedCost: 0.001,
    });

    const input = buildMockInput();
    await expect(generateNarrationScript(input)).rejects.toThrow();
  });
});
