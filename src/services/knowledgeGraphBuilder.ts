import type { Lesson } from '../data/types';
import type { KnowledgeGraph, ConceptNode, GraphEdge } from '../data/knowledgeGraph';
import { extractConcepts } from './conceptExtractor';
import { inferEdges } from './edgeInference';

function hasCycle(concepts: Map<string, ConceptNode>, edges: GraphEdge[]): boolean {
  const prereqEdges = edges.filter(e => e.type === 'PREREQUISITE');
  if (prereqEdges.length === 0) return false;

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const [id] of concepts) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of prereqEdges) {
    const list = adj.get(edge.from) || [];
    list.push(edge.to);
    adj.set(edge.from, list);
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

  return visited < concepts.size;
}

function computeConnectionStrength(edges: GraphEdge[]): GraphEdge[] {
  return edges.map(edge => {
    if (edge.weight > 0) return edge;
    const baseWeights: Record<string, number> = {
      PREREQUISITE: 0.6,
      DERIVES_FROM: 0.7,
      ANALOGOUS_TO: 0.4,
      CONTRASTS_WITH: 0.5,
      GENERALIZES: 0.5,
      EXAMPLE_OF: 0.8,
    };
    return { ...edge, weight: baseWeights[edge.type] || 0.5 };
  });
}

export function buildKnowledgeGraph(lesson: Lesson): KnowledgeGraph {
  console.log('[KGBuilder] Building knowledge graph for lesson:', lesson.title);

  const extractedConcepts = extractConcepts(lesson);
  const conceptsMap = new Map<string, ConceptNode>();
  for (const c of extractedConcepts) {
    conceptsMap.set(c.id, c);
  }

  const edges = inferEdges(extractedConcepts, lesson);
  const weightedEdges = computeConnectionStrength(edges);

  if (hasCycle(conceptsMap, weightedEdges)) {
    console.warn('[KGBuilder] Cycle detected in PREREQUISITE edges — removing weakest prerequisite edges until acyclic');
    const prereqEdges = weightedEdges.filter(e => e.type === 'PREREQUISITE').sort((a, b) => a.weight - b.weight);
    const remaining = weightedEdges.filter(e => e.type !== 'PREREQUISITE');
    for (const edge of prereqEdges) {
      const testEdges = [...remaining, edge];
      if (hasCycle(conceptsMap, testEdges)) {
        continue;
      }
      remaining.push(edge);
    }
    console.log('[KGBuilder] Cycles resolved —', remaining.filter(e => e.type === 'PREREQUISITE').length, 'prerequisite edges retained');
    const graph: KnowledgeGraph = { concepts: conceptsMap, edges: remaining };
    console.log('[KGBuilder] Built graph with', conceptsMap.size, 'concepts,', remaining.length, 'edges');
    return graph;
  }

  const graph: KnowledgeGraph = { concepts: conceptsMap, edges: weightedEdges };
  console.log('[KGBuilder] Built graph with', conceptsMap.size, 'concepts,', weightedEdges.length, 'edges');
  return graph;
}
