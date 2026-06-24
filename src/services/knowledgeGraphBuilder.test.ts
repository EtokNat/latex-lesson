import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph } from './knowledgeGraphBuilder';
import { SEED_LESSON } from '../data/seedLesson';
import type { Lesson } from '../data/types';

describe('knowledgeGraphBuilder', () => {
  it('builds complete graph from seed lesson', () => {
    const kg = buildKnowledgeGraph(SEED_LESSON);
    expect(kg.concepts.size).toBeGreaterThan(0);
    expect(kg.edges.length).toBeGreaterThan(0);
  });

  it('produces acyclic prerequisite subgraph from seed lesson', () => {
    const kg = buildKnowledgeGraph(SEED_LESSON);
    const prereqEdges = kg.edges.filter(e => e.type === 'PREREQUISITE');

    // Topological sort to verify no cycles
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const [id] of kg.concepts) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }
    for (const edge of prereqEdges) {
      adj.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    let visited = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited++;
      for (const neighbor of adj.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    expect(visited).toBe(kg.concepts.size);
  });

  it('detects and rejects cycles in prerequisite edges', () => {
    const cyclicLesson: Lesson = {
      id: 'cyclic',
      title: 'Cyclic Lesson',
      blocks: [
        { id: 'b0', type: 'text', content: 'Factoring requires quadratic formula and quadratic formula requires factoring.' },
      ],
    };
    const kg = buildKnowledgeGraph(cyclicLesson);
    const prereqEdges = kg.edges.filter(e => e.type === 'PREREQUISITE');

    // Verify no cycles
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const [id] of kg.concepts) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }
    for (const edge of prereqEdges) {
      adj.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    let visited = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited++;
      for (const neighbor of adj.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    expect(visited).toBe(kg.concepts.size);
  });

  it('handles empty lesson', () => {
    const kg = buildKnowledgeGraph({ id: 'empty', title: 'Empty', blocks: [] });
    expect(kg.concepts.size).toBe(0);
    expect(kg.edges.length).toBe(0);
  });

  it('all concepts have valid types', () => {
    const kg = buildKnowledgeGraph(SEED_LESSON);
    const validTypes = ['definition', 'procedure', 'principle', 'example', 'analogy'];
    for (const concept of kg.concepts.values()) {
      expect(validTypes).toContain(concept.type);
    }
  });

  it('all edges reference existing concepts', () => {
    const kg = buildKnowledgeGraph(SEED_LESSON);
    for (const edge of kg.edges) {
      expect(kg.concepts.has(edge.from)).toBe(true);
      expect(kg.concepts.has(edge.to)).toBe(true);
    }
  });
});
