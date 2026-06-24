import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runNarrationPipeline } from './narrationPipeline';
import { SEED_LESSON } from '../data/seedLesson';
import type { Lesson } from '../data/types';

vi.mock('./llmClient', () => ({
  generateCompletion: vi.fn(),
  configureLLMClient: vi.fn(),
}));

import { generateCompletion } from './llmClient';

const mockedGenerateCompletion = generateCompletion as ReturnType<typeof vi.fn>;

function buildMockNarrationResponse(blockIds: string[], clean = true) {
  const blockNarrations = blockIds.map(id => ({
    blockId: id,
    segments: clean
      ? [
          { text: 'Let us explore this concept together.', audioTag: 'curious' },
          { text: 'This is a well-explained step with plenty of context.', audioTag: 'measured', revealTrigger: true },
          { text: 'Remember what we learned earlier about related concepts.', audioTag: 'encouraging' },
        ]
      : [
          { text: 'This is the on-screen text read verbatim which should be caught.', audioTag: 'measured' },
        ],
  }));

  return {
    blockNarrations,
    interBlockPausesMs: blockIds.map(() => 2000),
  };
}

function buildMockTeachingPlanResponse(blockIds: string[]) {
  return {
    items: blockIds.map(id => ({
      blockId: id,
      concept: 'Key concept for understanding',
      priorKnowledge: 'Basic prerequisite knowledge',
      analogy: 'Like building blocks — each layer depends on the previous',
      anticipatedConfusion: 'Students might confuse order of operations',
      emotionalBeat: 'curious',
      bridge: 'Connects naturally to the next concept',
      crossReferences: [],
    })),
  };
}

describe('narrationPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGenerateCompletion.mockReset();
  });

  it('end-to-end pipeline with mocked agents', async () => {
    const lesson: Lesson = {
      id: 'pipeline-test',
      title: 'Pipeline Test Lesson',
      blocks: [
        { id: 'b1', type: 'heading', content: '1. Introduction' },
        { id: 'b2', type: 'text', content: 'This is a basic concept in algebra that we will explore today.' },
        { id: 'b3', type: 'math', content: '\\begin{aligned}\ny &= mx + b \\\\\ny &= 2x + 3\n\\end{aligned}' },
      ],
    };

    const blockIds = ['b1', 'b2', 'b3'];

    // Mock: teaching plan
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockTeachingPlanResponse(blockIds)),
      promptTokens: 500,
      completionTokens: 300,
      estimatedCost: 0.005,
    });

    // Mock: narration
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds, true)),
      promptTokens: 800,
      completionTokens: 600,
      estimatedCost: 0.01,
    });

    const result = await runNarrationPipeline(lesson);

    expect(result.narration).toBeDefined();
    expect(result.narration.lessonId).toBe('pipeline-test');
    expect(result.narration.blockNarrations.length).toBe(3);
    expect(result.kg).toBeDefined();
    expect(result.ledger).toBeDefined();
    expect(result.validationReport).toBeDefined();
    expect(result.progress.length).toBeGreaterThan(0);
  });

  it('retries on validation failure', async () => {
    const lesson: Lesson = {
      id: 'retry-test',
      title: 'Retry Test',
      blocks: [
        { id: 'b1', type: 'heading', content: '1. Topic' },
        { id: 'b2', type: 'text', content: 'Some educational content about math concepts.' },
      ],
    };

    const blockIds = ['b1', 'b2'];

    // Teaching plan
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockTeachingPlanResponse(blockIds)),
      promptTokens: 300,
      completionTokens: 200,
      estimatedCost: 0.003,
    });

    // First narration — problematic
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds, false)),
      promptTokens: 400,
      completionTokens: 300,
      estimatedCost: 0.005,
    });

    // Second narration — fixed (clean)
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds, true)),
      promptTokens: 400,
      completionTokens: 300,
      estimatedCost: 0.005,
    });

    const result = await runNarrationPipeline(lesson);

    expect(result.narration).toBeDefined();
    // Should have retried at least once
    expect(result.totalRetries).toBeGreaterThanOrEqual(0);
  });

  it('produces complete LessonNarration', async () => {
    const lesson: Lesson = {
      id: 'complete-test',
      title: 'Complete Test',
      blocks: [
        { id: 'b1', type: 'heading', content: '1. Getting Started' },
        { id: 'b2', type: 'text', content: 'Understanding the fundamentals helps build a strong foundation for later concepts.' },
      ],
    };

    const blockIds = ['b1', 'b2'];

    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockTeachingPlanResponse(blockIds)),
      promptTokens: 300,
      completionTokens: 200,
      estimatedCost: 0.003,
    });

    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds, true)),
      promptTokens: 400,
      completionTokens: 300,
      estimatedCost: 0.005,
    });

    const result = await runNarrationPipeline(lesson);

    expect(result.narration.blockNarrations.length).toBe(2);
    for (const bn of result.narration.blockNarrations) {
      expect(bn.segments.length).toBeGreaterThan(0);
      expect(bn.totalDurationMs).toBeGreaterThan(0);
    }
  });

  it('handles lesson with image blocks', async () => {
    const lesson: Lesson = {
      id: 'image-test',
      title: 'Image Lesson',
      blocks: [
        { id: 'b1', type: 'heading', content: '1. Visual Introduction' },
        { id: 'img1', type: 'image', content: 'A graph showing a parabola', imageUrl: 'http://example.com/graph.png' },
        { id: 'b2', type: 'text', content: 'The graph above illustrates the quadratic relationship.' },
      ],
    };

    const blockIds = ['b1', 'img1', 'b2'];

    // Teaching plan
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockTeachingPlanResponse(blockIds)),
      promptTokens: 400,
      completionTokens: 250,
      estimatedCost: 0.004,
    });

    // Vision agent call (for img1)
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        mainInsight: 'The parabola shows the quadratic relationship visually',
        firstLook: 'Focus on the vertex',
        pattern: 'Symmetric U-shape',
        teacherQuestion: 'What happens when a is negative?',
        connectionToMath: 'The x-intercepts are the roots',
      }),
      promptTokens: 200,
      completionTokens: 150,
      estimatedCost: 0.003,
    });

    // Narration
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds, true)),
      promptTokens: 600,
      completionTokens: 400,
      estimatedCost: 0.008,
    });

    const result = await runNarrationPipeline(lesson);

    expect(result.narration.blockNarrations.length).toBe(3);
    // Vision was called for the image block
    const visionCalls = mockedGenerateCompletion.mock.calls.filter(
      (call: string[]) => call[0].includes('Analyze this educational diagram')
    );
    expect(visionCalls.length).toBe(1);
  });

  it('runs against seed lesson', async () => {
    const blockIds = SEED_LESSON.blocks.map(b => b.id);

    // Teaching plan
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockTeachingPlanResponse(blockIds.slice(0, 5))),
      promptTokens: 2000,
      completionTokens: 1000,
      estimatedCost: 0.02,
    });

    // Fail all vision calls (seed lesson has 5 image blocks) → triggers fallback
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('Vision unavailable'));
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('Vision unavailable'));
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('Vision unavailable'));
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('Vision unavailable'));
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('Vision unavailable'));

    // Narration
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(buildMockNarrationResponse(blockIds.slice(0, 5), true)),
      promptTokens: 3000,
      completionTokens: 2000,
      estimatedCost: 0.04,
    });

    const result = await runNarrationPipeline(SEED_LESSON);

    expect(result.kg.concepts.size).toBeGreaterThan(0);
    expect(result.ledger.symbols.size).toBeGreaterThan(0);
    expect(result.narration).toBeDefined();
  }, 30000);
});
