import { describe, it, expect } from 'vitest';
import type { ConceptNode, GraphEdge, KnowledgeGraph, ConceptType, EdgeType } from './knowledgeGraph';

describe('knowledgeGraph', () => {
  const makeConcept = (overrides?: Partial<ConceptNode>): ConceptNode => ({
    id: 'c1',
    name: 'Quadratic Formula',
    type: 'procedure',
    introducedAt: 5,
    lastReferencedAt: 20,
    representations: { symbolic: 'x = (-b ± √(b²-4ac)) / 2a' },
    commonMisconceptions: ['The ± only applies to the numerator'],
    ...overrides,
  });

  const makeEdge = (overrides?: Partial<GraphEdge>): GraphEdge => ({
    from: 'c1',
    to: 'c2',
    type: 'PREREQUISITE',
    weight: 1.0,
    explanation: 'Factoring is required before understanding the quadratic formula',
    ...overrides,
  });

  it('should create a ConceptNode with all fields', () => {
    const c = makeConcept();
    expect(c.id).toBe('c1');
    expect(c.name).toBe('Quadratic Formula');
    expect(c.type).toBe('procedure');
    expect(c.introducedAt).toBe(5);
    expect(c.lastReferencedAt).toBe(20);
    expect(c.representations.symbolic).toBeDefined();
    expect(c.commonMisconceptions).toHaveLength(1);
  });

  it('should allow all ConceptType values', () => {
    const types: ConceptType[] = ['definition', 'procedure', 'principle', 'example', 'analogy'];
    types.forEach(t => {
      const c = makeConcept({ type: t });
      expect(c.type).toBe(t);
    });
  });

  it('should handle multiple representation modalities', () => {
    const c = makeConcept({
      representations: {
        symbolic: 'ax² + bx + c = 0',
        visual: 'parabola graph',
        verbal: 'a quadratic equation in standard form',
        numerical: '1x² + 5x + 6 = 0',
      },
    });
    expect(c.representations.symbolic).toBe('ax² + bx + c = 0');
    expect(c.representations.visual).toBe('parabola graph');
    expect(c.representations.verbal).toBe('a quadratic equation in standard form');
    expect(c.representations.numerical).toBe('1x² + 5x + 6 = 0');
  });

  it('should allow all EdgeType values', () => {
    const edgeTypes: EdgeType[] = [
      'PREREQUISITE', 'DERIVES_FROM', 'ANALOGOUS_TO',
      'CONTRASTS_WITH', 'GENERALIZES', 'EXAMPLE_OF',
    ];
    edgeTypes.forEach(t => {
      const e = makeEdge({ type: t });
      expect(e.type).toBe(t);
    });
  });

  it('should create a KnowledgeGraph with concepts and edges', () => {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', makeConcept({ id: 'c1', name: 'Factoring' }));
    concepts.set('c2', makeConcept({ id: 'c2', name: 'Quadratic Formula', introducedAt: 10 }));

    const edges: GraphEdge[] = [
      makeEdge({ from: 'c1', to: 'c2' }),
    ];

    const kg: KnowledgeGraph = { concepts, edges };
    expect(kg.concepts.size).toBe(2);
    expect(kg.edges).toHaveLength(1);
    expect(kg.concepts.get('c1')?.name).toBe('Factoring');
    expect(kg.edges[0].type).toBe('PREREQUISITE');
  });

  it('should validate edge references existing concepts', () => {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', makeConcept({ id: 'c1' }));
    concepts.set('c2', makeConcept({ id: 'c2' }));

    const edges: GraphEdge[] = [{ from: 'c1', to: 'c2', type: 'DERIVES_FROM', weight: 0.8, explanation: '' }];
    const kg: KnowledgeGraph = { concepts, edges };

    for (const edge of kg.edges) {
      expect(kg.concepts.has(edge.from)).toBe(true);
      expect(kg.concepts.has(edge.to)).toBe(true);
    }
  });

  it('should detect cycles in prerequisite edges', () => {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', makeConcept({ id: 'c1' }));
    concepts.set('c2', makeConcept({ id: 'c2' }));
    concepts.set('c3', makeConcept({ id: 'c3' }));

    // c1 -> c2 -> c3 -> c1 creates a cycle
    const edges: GraphEdge[] = [
      { from: 'c1', to: 'c2', type: 'PREREQUISITE', weight: 1, explanation: '' },
      { from: 'c2', to: 'c3', type: 'PREREQUISITE', weight: 1, explanation: '' },
      { from: 'c3', to: 'c1', type: 'PREREQUISITE', weight: 1, explanation: '' },
    ];

    const hasCycle = (concepts: Map<string, ConceptNode>, edges: GraphEdge[]): boolean => {
      const adj = new Map<string, string[]>();
      for (const c of concepts.keys()) adj.set(c, []);
      for (const e of edges) adj.get(e.from)?.push(e.to);

      const visiting = new Set<string>();
      const visited = new Set<string>();

      const dfs = (node: string): boolean => {
        visiting.add(node);
        for (const neighbor of adj.get(node) || []) {
          if (visiting.has(neighbor)) return true;
          if (!visited.has(neighbor) && dfs(neighbor)) return true;
        }
        visiting.delete(node);
        visited.add(node);
        return false;
      };

      for (const node of concepts.keys()) {
        if (!visited.has(node) && dfs(node)) return true;
      }
      return false;
    };

    expect(hasCycle(concepts, edges)).toBe(true);
  });

  it('should detect no cycles in acyclic prerequisite edges', () => {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', makeConcept({ id: 'c1' }));
    concepts.set('c2', makeConcept({ id: 'c2' }));
    concepts.set('c3', makeConcept({ id: 'c3' }));

    // c1 -> c2 -> c3 (no cycle)
    const edges: GraphEdge[] = [
      { from: 'c1', to: 'c2', type: 'PREREQUISITE', weight: 1, explanation: '' },
      { from: 'c2', to: 'c3', type: 'PREREQUISITE', weight: 1, explanation: '' },
    ];

    const hasCycle = (concepts: Map<string, ConceptNode>, edges: GraphEdge[]): boolean => {
      const adj = new Map<string, string[]>();
      for (const c of concepts.keys()) adj.set(c, []);
      for (const e of edges) adj.get(e.from)?.push(e.to);

      const visiting = new Set<string>();
      const visited = new Set<string>();

      const dfs = (node: string): boolean => {
        visiting.add(node);
        for (const neighbor of adj.get(node) || []) {
          if (visiting.has(neighbor)) return true;
          if (!visited.has(neighbor) && dfs(neighbor)) return true;
        }
        visiting.delete(node);
        visited.add(node);
        return false;
      };

      for (const node of concepts.keys()) {
        if (!visited.has(node) && dfs(node)) return true;
      }
      return false;
    };

    expect(hasCycle(concepts, edges)).toBe(false);
  });

  it('should handle empty KnowledgeGraph', () => {
    const kg: KnowledgeGraph = { concepts: new Map(), edges: [] };
    expect(kg.concepts.size).toBe(0);
    expect(kg.edges).toHaveLength(0);
  });

  it('should handle concepts with no edges', () => {
    const concepts = new Map<string, ConceptNode>();
    concepts.set('c1', makeConcept({ id: 'c1' }));
    const kg: KnowledgeGraph = { concepts, edges: [] };
    expect(kg.concepts.size).toBe(1);
    expect(kg.edges).toHaveLength(0);
  });
});
