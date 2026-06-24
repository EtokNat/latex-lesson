import { describe, it, expect } from 'vitest';
import { inferEdges } from './edgeInference';
import type { Lesson } from '../data/types';
import type { ConceptNode } from '../data/knowledgeGraph';

describe('edgeInference', () => {
  const makeConcept = (overrides: Partial<ConceptNode> & { id: string; name: string }): ConceptNode => ({
    type: 'definition',
    introducedAt: 0,
    lastReferencedAt: 0,
    representations: {},
    commonMisconceptions: [],
    ...overrides,
  });

  it('infers PREREQUISITE edges from block order', () => {
    const concepts: ConceptNode[] = [
      makeConcept({ id: 'c1', name: 'Factoring', introducedAt: 1, type: 'procedure' }),
      makeConcept({ id: 'c2', name: 'Quadratic Formula', introducedAt: 10, type: 'procedure' }),
    ];
    const lesson: Lesson = {
      id: 'test',
      title: 'Test',
      blocks: [
        { id: 'b0', type: 'heading', content: 'Intro' },
        { id: 'b1', type: 'text', content: 'Factoring is a method quadratic formula we use factoring.' },
        { id: 'b2', type: 'heading', content: 'Middle' },
        { id: 'b3', type: 'heading', content: 'Middle' },
        { id: 'b4', type: 'heading', content: 'Middle' },
        { id: 'b5', type: 'heading', content: 'Middle' },
        { id: 'b6', type: 'heading', content: 'Middle' },
        { id: 'b7', type: 'heading', content: 'Middle' },
        { id: 'b8', type: 'heading', content: 'Middle' },
        { id: 'b9', type: 'heading', content: 'Middle' },
        { id: 'b10', type: 'text', content: 'Now we use the quadratic formula.' },
      ],
    };
    const edges = inferEdges(concepts, lesson);
    const prereqEdges = edges.filter(e => e.type === 'PREREQUISITE');
    expect(prereqEdges.length).toBeGreaterThan(0);
    expect(prereqEdges.some(e => e.from === 'c1' && e.to === 'c2')).toBe(true);
  });

  it('infers DERIVES_FROM from math step order', () => {
    const concepts: ConceptNode[] = [
      makeConcept({ id: 'c1', name: 'Completing Square', introducedAt: 0, type: 'procedure' }),
      makeConcept({ id: 'c2', name: 'Quadratic Formula', introducedAt: 1, type: 'procedure' }),
    ];
    const lesson: Lesson = {
      id: 'test',
      title: 'Test',
      blocks: [
        {
          id: 'm1',
          type: 'math',
          content:
            'Completing Square: x^2 + bx + (b/2)^2 \\\\ \\text{Then we get the Quadratic Formula: } x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
        },
      ],
    };
    const edges = inferEdges(concepts, lesson);
    const derivesEdges = edges.filter(e => e.type === 'DERIVES_FROM');
    expect(derivesEdges.length).toBeGreaterThan(0);
  });

  it('no edges for unrelated concepts', () => {
    const concepts: ConceptNode[] = [
      makeConcept({ id: 'c1', name: 'Addition', introducedAt: 0, type: 'procedure' }),
      makeConcept({ id: 'c2', name: 'Photosynthesis', introducedAt: 0, type: 'definition' }),
    ];
    const lesson: Lesson = {
      id: 'test',
      title: 'Test',
      blocks: [
        { id: 'b0', type: 'text', content: 'Addition is a basic operation.' },
        { id: 'b1', type: 'text', content: 'Photosynthesis is a plant process.' },
      ],
    };
    const edges = inferEdges(concepts, lesson);
    expect(edges.length).toBe(0);
  });

  it('infers EXAMPLE_OF from specific→general patterns', () => {
    const concepts: ConceptNode[] = [
      makeConcept({ id: 'c1', name: 'Case 1', introducedAt: 0, type: 'example' }),
      makeConcept({ id: 'c2', name: 'Discriminant', introducedAt: 1, type: 'definition' }),
    ];
    const lesson: Lesson = {
      id: 'test',
      title: 'Test',
      blocks: [
        { id: 'b0', type: 'text', content: 'Case 1 discriminant analysis' },
        { id: 'b1', type: 'text', content: 'The discriminant determines root type.' },
      ],
    };
    const edges = inferEdges(concepts, lesson);
    const exampleEdges = edges.filter(e => e.type === 'EXAMPLE_OF');
    expect(exampleEdges.length).toBeGreaterThan(0);
  });

  it('handles empty concepts array', () => {
    const edges = inferEdges([], { id: 'test', title: 'Empty', blocks: [] });
    expect(edges).toEqual([]);
  });

  it('does not create self-referencing edges', () => {
    const concepts: ConceptNode[] = [
      makeConcept({ id: 'c1', name: 'Self', introducedAt: 0, type: 'definition' }),
    ];
    const lesson: Lesson = {
      id: 'test',
      title: 'Test',
      blocks: [{ id: 'b0', type: 'text', content: 'Self-referencing concept.' }],
    };
    const edges = inferEdges(concepts, lesson);
    const selfEdges = edges.filter(e => e.from === e.to);
    expect(selfEdges.length).toBe(0);
  });
});
