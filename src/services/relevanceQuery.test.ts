import { describe, it, expect } from 'vitest';
import { queryRelevance } from './relevanceQuery';
import { buildKnowledgeGraph } from './knowledgeGraphBuilder';
import { SEED_LESSON } from '../data/seedLesson';
import type { KnowledgeGraph, ConceptNode, GraphEdge } from '../data/knowledgeGraph';

describe('relevanceQuery', () => {
  function buildSimpleKG(): KnowledgeGraph {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', {
      id: 'c1', name: 'Factoring', type: 'procedure', introducedAt: 1, lastReferencedAt: 5,
      representations: {}, commonMisconceptions: [],
    });
    concepts.set('c2', {
      id: 'c2', name: 'Quadratic Formula', type: 'procedure', introducedAt: 10, lastReferencedAt: 15,
      representations: {}, commonMisconceptions: [],
    });
    concepts.set('c3', {
      id: 'c3', name: 'Discriminant', type: 'definition', introducedAt: 12, lastReferencedAt: 18,
      representations: {}, commonMisconceptions: [],
    });
    const edges: GraphEdge[] = [
      { from: 'c1', to: 'c2', type: 'PREREQUISITE', weight: 0.8, explanation: 'Factoring is a prerequisite for the quadratic formula' },
      { from: 'c2', to: 'c3', type: 'PREREQUISITE', weight: 0.9, explanation: 'Quadratic formula is a prerequisite for discriminant' },
      { from: 'c2', to: 'c3', type: 'DERIVES_FROM', weight: 0.9, explanation: 'Discriminant comes from the quadratic formula' },
      { from: 'c3', to: 'c2', type: 'EXAMPLE_OF', weight: 0.7, explanation: 'Discriminant is an example of a quadratic formula component' },
    ];
    return { concepts, edges };
  }

  it('returns correct prerequisites for a concept', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('c3', 15, kg, 'prerequisites');
    expect(report.queryConceptName).toBe('Discriminant');
    expect(report.results.length).toBeGreaterThan(0);
    const prereqNames = report.results.map(r => r.concept.name);
    expect(prereqNames).toContain('Factoring');
  });

  it('returns empty for concept with no prerequisites', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('c1', 5, kg, 'prerequisites');
    expect(report.results.length).toBe(0);
  });

  it('returns bridges for a concept', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('c2', 15, kg, 'bridges');
    expect(report.mode).toBe('bridges');
    expect(report.results.length).toBeGreaterThan(0);
  });

  it('returns contrasts for a concept', () => {
    const kg = buildSimpleKG();
    // Add a contrast edge
    kg.edges.push({
      from: 'c2', to: 'c1', type: 'CONTRASTS_WITH', weight: 0.6,
      explanation: 'Quadratic formula works when factoring does not',
    });
    const report = queryRelevance('c2', 12, kg, 'contrasts');
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.some(r => r.concept.name === 'Factoring')).toBe(true);
  });

  it('returns analogies for a concept', () => {
    const kg = buildSimpleKG();
    kg.edges.push({
      from: 'c1', to: 'c3', type: 'ANALOGOUS_TO', weight: 0.5,
      explanation: 'Both factoring and discriminant analysis decompose polynomials',
    });
    const report = queryRelevance('c1', 5, kg, 'analogies');
    expect(report.results.length).toBeGreaterThan(0);
  });

  it('handles unknown concept gracefully', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('nonexistent', 0, kg, 'prerequisites');
    expect(report.queryConceptName).toBe('Unknown');
    expect(report.results).toEqual([]);
  });

  it('ranks results by score descending', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('c3', 15, kg, 'prerequisites');
    for (let i = 1; i < report.results.length; i++) {
      expect(report.results[i - 1].score).toBeGreaterThanOrEqual(report.results[i].score);
    }
  });

  it('returns results for spiral mode', () => {
    const kg = buildSimpleKG();
    const report = queryRelevance('c2', 14, kg, 'spiral');
    expect(report.mode).toBe('spiral');
  });

  it('works with seed lesson knowledge graph', () => {
    const kg = buildKnowledgeGraph(SEED_LESSON);
    const conceptIds = [...kg.concepts.keys()];
    if (conceptIds.length > 0) {
      const report = queryRelevance(conceptIds[0], 10, kg, 'prerequisites');
      expect(report.queryConceptName.length).toBeGreaterThan(0);
      expect(Array.isArray(report.results)).toBe(true);
    }
  });
});
