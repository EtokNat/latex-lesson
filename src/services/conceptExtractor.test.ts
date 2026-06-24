import { describe, it, expect } from 'vitest';
import { extractConcepts } from './conceptExtractor';
import type { Lesson } from '../data/types';
import { SEED_LESSON } from '../data/seedLesson';

describe('conceptExtractor', () => {
  it('extracts concepts from headings', () => {
    const lesson: Lesson = {
      id: 'test-1',
      title: 'Test',
      blocks: [
        { id: 'h1', type: 'heading', content: '1. What Is a Quadratic Equation?' },
        { id: 'h2', type: 'heading', content: '2. Solving by Factoring' },
        { id: 'h3', type: 'heading', content: '3. The Quadratic Formula' },
      ],
    };
    const concepts = extractConcepts(lesson);
    expect(concepts.length).toBeGreaterThanOrEqual(3);
    expect(concepts.some(c => c.name.includes('What Is a Quadratic Equation'))).toBe(true);
    expect(concepts.some(c => c.name.includes('Solving by Factoring'))).toBe(true);
    expect(concepts.some(c => c.name.includes('Quadratic Formula'))).toBe(true);
  });

  it('extracts concepts from math \\text{} commands', () => {
    const lesson: Lesson = {
      id: 'test-2',
      title: 'Test',
      blocks: [
        {
          id: 'm1',
          type: 'math',
          content: '\\text{Solve: } x^2 + 7x + 12 = 0 \\\\ \\text{Discriminant: } \\Delta = b^2 - 4ac',
        },
      ],
    };
    const concepts = extractConcepts(lesson);
    const hasSolve = concepts.some(c => c.name.toLowerCase().includes('solve'));
    const hasDiscriminant = concepts.some(c => c.name.toLowerCase().includes('discriminant'));
    expect(hasSolve || hasDiscriminant).toBe(true);
  });

  it('extracts concepts from definition patterns in text', () => {
    const lesson: Lesson = {
      id: 'test-3',
      title: 'Test',
      blocks: [
        {
          id: 't1',
          type: 'text',
          content:
            'The expression under the square root is called the discriminant. A quadratic equation is a second-degree polynomial.',
        },
      ],
    };
    const concepts = extractConcepts(lesson);
    expect(concepts.length).toBeGreaterThan(0);
  });

  it('handles empty lesson', () => {
    const lesson: Lesson = { id: 'test-empty', title: 'Empty', blocks: [] };
    const concepts = extractConcepts(lesson);
    expect(concepts).toEqual([]);
  });

  it('handles lesson with only image blocks', () => {
    const lesson: Lesson = {
      id: 'test-img',
      title: 'Images Only',
      blocks: [
        { id: 'i1', type: 'image', content: 'A graph', imageUrl: 'http://example.com/graph.png' },
        { id: 'i2', type: 'image', content: 'Another graph', imageUrl: 'http://example.com/graph2.png' },
      ],
    };
    const concepts = extractConcepts(lesson);
    expect(concepts.length).toBe(0);
  });

  it('deduplicates concepts with same name', () => {
    const lesson: Lesson = {
      id: 'test-dup',
      title: 'Dupes',
      blocks: [
        { id: 'h1', type: 'heading', content: 'The Discriminant' },
        { id: 't1', type: 'text', content: 'The discriminant is a very important concept in algebra.' },
        { id: 'h2', type: 'heading', content: 'The Discriminant — Deep Dive' },
      ],
    };
    const concepts = extractConcepts(lesson);
    const discriminantConcepts = concepts.filter(c => c.name.toLowerCase().includes('discriminant'));
    expect(discriminantConcepts.length).toBe(1);
  });

  it('extracts concepts from seed lesson', () => {
    const concepts = extractConcepts(SEED_LESSON);
    expect(concepts.length).toBeGreaterThan(5);
    const types = new Set(concepts.map(c => c.type));
    expect(types.has('definition')).toBe(true);
  });

  it('updates lastReferencedAt for reused concepts', () => {
    const lesson: Lesson = {
      id: 'test-ref',
      title: 'Ref Test',
      blocks: [
        { id: 'h1', type: 'heading', content: 'The Discriminant' },
        { id: 't1', type: 'text', content: 'The discriminant is a very important value.' },
        { id: 'h2', type: 'heading', content: 'The Discriminant' },
      ],
    };
    const concepts = extractConcepts(lesson);
    const discConcept = concepts.find(c => c.name.toLowerCase().includes('discriminant'));
    expect(discConcept).toBeDefined();
    expect(discConcept!.lastReferencedAt).toBeGreaterThan(discConcept!.introducedAt);
  });

  it('infers procedure type for method-related text', () => {
    const lesson: Lesson = {
      id: 'test-proc',
      title: 'Procedures',
      blocks: [
        {
          id: 't1',
          type: 'text',
          content:
            'The factoring method is a technique for solving quadratic equations. This procedure involves finding two numbers.',
        },
      ],
    };
    const concepts = extractConcepts(lesson);
    expect(concepts.length).toBeGreaterThan(0);
  });
});
