import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTeachingPlan, buildTeachingPlanUserPrompt } from './teachingPlanAgent';
import type { Lesson } from '../data/types';
import type { KnowledgeGraph, ConceptNode, GraphEdge } from '../data/knowledgeGraph';
import { SEED_LESSON } from '../../data/seedLesson';
import { buildKnowledgeGraph } from '../knowledgeGraphBuilder';

vi.mock('../llmClient', () => ({
  generateCompletion: vi.fn(),
  configureLLMClient: vi.fn(),
}));

import { generateCompletion } from '../llmClient';

const mockedGenerateCompletion = generateCompletion as ReturnType<typeof vi.fn>;

function buildSimpleKG(): KnowledgeGraph {
  const concepts = new Map<string, ConceptNode>();
  concepts.set('c1', {
    id: 'c1', name: 'Factoring', type: 'procedure', introducedAt: 1, lastReferencedAt: 5,
    representations: {}, commonMisconceptions: [],
  });
  concepts.set('c2', {
    id: 'c2', name: 'Quadratic Formula', type: 'procedure', introducedAt: 3, lastReferencedAt: 8,
    representations: {}, commonMisconceptions: [],
  });
  return { concepts, edges: [] };
}

const mockTeachingPlanResponse = {
  items: [
    {
      blockId: 'seed-1',
      concept: 'A quadratic equation is a second-degree polynomial',
      priorKnowledge: 'Linear equations and basic algebra',
      analogy: 'Like climbing stairs — each step requires the previous one',
      anticipatedConfusion: 'Students often forget that a ≠ 0',
      emotionalBeat: 'curious',
      bridge: 'This sets up the factoring method',
      crossReferences: [],
    },
    {
      blockId: 'seed-2',
      concept: 'Standard form ax² + bx + c = 0',
      priorKnowledge: 'Variable notation and polynomial terms',
      analogy: 'Like a recipe — a, b, c are the ingredients',
      anticipatedConfusion: 'Mixing up b and c values',
      emotionalBeat: 'confident',
      bridge: 'Leads to solving methods',
      crossReferences: ['Quadratic Formula'],
    },
  ],
};

describe('teachingPlanAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates plan for a lesson with mocked LLM (batched)', { timeout: 30000 }, async () => {
    // SEED_LESSON has 38 blocks / 5 = 8 batches — use mockResolvedValue for all calls
    mockedGenerateCompletion.mockResolvedValue({
      text: JSON.stringify(mockTeachingPlanResponse),
      promptTokens: 500,
      completionTokens: 300,
      estimatedCost: 0.006,
    });

    const plan = await generateTeachingPlan(SEED_LESSON, buildKnowledgeGraph(SEED_LESSON));
    expect(plan.lessonId).toBe(SEED_LESSON.id);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items[0]).toHaveProperty('concept');
    expect(plan.items[0]).toHaveProperty('emotionalBeat');
  });

  it('handles empty lesson', async () => {
    const plan = await generateTeachingPlan(
      { id: 'empty', title: 'Empty', blocks: [] },
      { concepts: new Map(), edges: [] }
    );
    expect(plan.items).toEqual([]);
  });

  it('handles lesson with only headings', async () => {
    mockedGenerateCompletion.mockResolvedValue({
      text: JSON.stringify({
        items: [
          { blockId: 'h1', concept: 'Topic overview', priorKnowledge: 'None', analogy: 'Like a map', anticipatedConfusion: 'Scope might be unclear', emotionalBeat: 'curious', bridge: 'Next section', crossReferences: [] },
        ],
      }),
      promptTokens: 200,
      completionTokens: 150,
      estimatedCost: 0.003,
    });

    const lesson: Lesson = {
      id: 'headings-only',
      title: 'Headings',
      blocks: [{ id: 'h1', type: 'heading', content: '1. Introduction' }],
    };
    const plan = await generateTeachingPlan(lesson, { concepts: new Map(), edges: [] });
    expect(plan.items.length).toBe(1);
    expect(plan.items[0].blockId).toBe('h1');
  });

  it('throws on invalid LLM response format', async () => {
    mockedGenerateCompletion.mockResolvedValue({
      text: JSON.stringify({ wrongField: [] }),
      promptTokens: 100,
      completionTokens: 10,
      estimatedCost: 0.001,
    });

    await expect(
      generateTeachingPlan(SEED_LESSON, buildKnowledgeGraph(SEED_LESSON))
    ).rejects.toThrow();
  });

  it('builds user prompt with concepts and blocks', () => {
    const kg = buildSimpleKG();
    const lesson: Lesson = {
      id: 'test',
      title: 'Test Lesson',
      blocks: [{ id: 'b1', type: 'heading', content: 'Factoring' }],
    };
    const prompt = buildTeachingPlanUserPrompt(lesson, kg);
    expect(prompt).toContain('Test Lesson');
    expect(prompt).toContain('Factoring');
  });
});
