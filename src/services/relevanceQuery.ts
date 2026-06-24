import type { ConceptNode, KnowledgeGraph, GraphEdge } from '../data/knowledgeGraph';

export type QueryMode = 'prerequisites' | 'bridges' | 'contrasts' | 'analogies' | 'spiral';

export interface RelevanceResult {
  concept: ConceptNode;
  score: number;
  explanation: string;
  edgeTypes: string[];
}

export interface RelevanceReport {
  queryConceptId: string;
  queryConceptName: string;
  mode: QueryMode;
  results: RelevanceResult[];
}

function collectAncestors(
  conceptId: string,
  edges: GraphEdge[],
  visited: Set<string> = new Set()
): { ancestorId: string; edge: GraphEdge }[] {
  if (visited.has(conceptId)) return [];
  visited.add(conceptId);
  const results: { ancestorId: string; edge: GraphEdge }[] = [];
  const incoming = edges.filter(e => e.to === conceptId && e.type === 'PREREQUISITE');
  for (const edge of incoming) {
    results.push({ ancestorId: edge.from, edge });
    results.push(...collectAncestors(edge.from, edges, visited));
  }
  return results;
}

export function queryRelevance(
  conceptId: string,
  atBlockIndex: number,
  kg: KnowledgeGraph,
  mode: QueryMode = 'prerequisites'
): RelevanceReport {
  console.log('[RelevanceQuery] Query for concept:', conceptId, 'mode:', mode, 'at block:', atBlockIndex);

  const queryConcept = kg.concepts.get(conceptId);
  if (!queryConcept) {
    console.warn('[RelevanceQuery] Concept not found:', conceptId);
    return {
      queryConceptId: conceptId,
      queryConceptName: 'Unknown',
      mode,
      results: [],
    };
  }

  const results: RelevanceResult[] = [];

  switch (mode) {
    case 'prerequisites': {
      const ancestors = collectAncestors(conceptId, kg.edges);
      const ancestorMap = new Map<string, { score: number; explanation: string; edgeTypes: string[] }>();
      for (const { ancestorId, edge } of ancestors) {
        const existing = ancestorMap.get(ancestorId);
        if (existing) {
          existing.score += edge.weight;
          if (!existing.edgeTypes.includes(edge.type)) existing.edgeTypes.push(edge.type);
        } else {
          ancestorMap.set(ancestorId, { score: edge.weight, explanation: edge.explanation, edgeTypes: [edge.type] });
        }
      }
      for (const [id, info] of ancestorMap) {
        const concept = kg.concepts.get(id);
        if (concept) {
          results.push({ concept, score: Math.min(info.score, 1), explanation: info.explanation, edgeTypes: info.edgeTypes });
        }
      }
      break;
    }

    case 'bridges': {
      for (const edge of kg.edges) {
        if (edge.from === conceptId && (edge.type === 'DERIVES_FROM' || edge.type === 'EXAMPLE_OF')) {
          const concept = kg.concepts.get(edge.to);
          if (concept && concept.introducedAt < atBlockIndex) {
            results.push({
              concept,
              score: edge.weight,
              explanation: edge.explanation,
              edgeTypes: [edge.type],
            });
          }
        }
        if (edge.to === conceptId && edge.type === 'EXAMPLE_OF') {
          const concept = kg.concepts.get(edge.from);
          if (concept && concept.introducedAt < atBlockIndex) {
            results.push({
              concept,
              score: edge.weight,
              explanation: edge.explanation,
              edgeTypes: [edge.type],
            });
          }
        }
      }
      break;
    }

    case 'contrasts': {
      for (const edge of kg.edges) {
        if (edge.type === 'CONTRASTS_WITH') {
          if (edge.from === conceptId) {
            const concept = kg.concepts.get(edge.to);
            if (concept) {
              results.push({ concept, score: edge.weight, explanation: edge.explanation, edgeTypes: [edge.type] });
            }
          }
          if (edge.to === conceptId) {
            const concept = kg.concepts.get(edge.from);
            if (concept) {
              results.push({ concept, score: edge.weight, explanation: edge.explanation, edgeTypes: [edge.type] });
            }
          }
        }
      }
      break;
    }

    case 'analogies': {
      for (const edge of kg.edges) {
        if (edge.type === 'ANALOGOUS_TO') {
          if (edge.from === conceptId) {
            const concept = kg.concepts.get(edge.to);
            if (concept) {
              results.push({ concept, score: edge.weight, explanation: edge.explanation, edgeTypes: [edge.type] });
            }
          }
          if (edge.to === conceptId) {
            const concept = kg.concepts.get(edge.from);
            if (concept) {
              results.push({ concept, score: edge.weight, explanation: edge.explanation, edgeTypes: [edge.type] });
            }
          }
        }
      }
      break;
    }

    case 'spiral': {
      for (const edge of kg.edges) {
        const relatedId = edge.from === conceptId ? edge.to : edge.to === conceptId ? edge.from : null;
        if (relatedId) {
          const concept = kg.concepts.get(relatedId);
          if (concept && concept.introducedAt <= atBlockIndex && concept.lastReferencedAt >= atBlockIndex - 5) {
            results.push({
              concept,
              score: edge.weight * 0.8,
              explanation: `"${queryConcept.name}" and "${concept.name}" are connected via ${edge.type}`,
              edgeTypes: [edge.type],
            });
          }
        }
      }
      break;
    }
  }

  results.sort((a, b) => b.score - a.score);
  console.log('[RelevanceQuery] Query for concept', conceptId, 'returned', results.length, 'results');
  return {
    queryConceptId: conceptId,
    queryConceptName: queryConcept.name,
    mode,
    results,
  };
}
