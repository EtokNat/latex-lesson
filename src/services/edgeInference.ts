import type { Lesson, LessonBlock } from '../data/types';
import type { ConceptNode, GraphEdge, EdgeType } from '../data/knowledgeGraph';

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

function getBlockWords(block: LessonBlock): Set<string> {
  const text = block.content.replace(/\\[a-zA-Z]+(\{[^}]*\})+/g, ' ').replace(/[{}\\]/g, ' ');
  return new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
}

function conceptNameInBlock(concept: ConceptNode, block: LessonBlock): boolean {
  const lowerContent = block.content.toLowerCase();
  const nameWords = concept.name.toLowerCase().split(/\s+/);
  const namePattern = concept.name.toLowerCase();
  if (lowerContent.includes(namePattern)) return true;
  const partial = nameWords.filter(w => w.length > 3);
  if (partial.length > 0) {
    return partial.every(w => lowerContent.includes(w));
  }
  return false;
}

export function inferEdges(concepts: ConceptNode[], lesson: Lesson): GraphEdge[] {
  console.log('[EdgeInference] Inferring edges for', concepts.length, 'concepts');
  const edges: GraphEdge[] = [];
  const edgeKey = new Set<string>();

  const addEdge = (from: string, to: string, type: EdgeType, weight: number, explanation: string) => {
    const key = `${from}->${to}:${type}`;
    if (!edgeKey.has(key) && from !== to) {
      edgeKey.add(key);
      edges.push({ from, to, type, weight, explanation });
    }
  };

  // PREREQUISITE: concept A appears in blocks before concept B uses it
  for (let i = 0; i < concepts.length; i++) {
    for (let j = 0; j < concepts.length; j++) {
      if (i === j) continue;
      const a = concepts[i];
      const b = concepts[j];
      if (a.introducedAt < b.introducedAt) {
        const blocksBetweenB = lesson.blocks.slice(a.introducedAt, b.introducedAt);
        const bMentionedInBetween = blocksBetweenB.some(blk => conceptNameInBlock(b, blk));
        if (bMentionedInBetween) {
          addEdge(a.id, b.id, 'PREREQUISITE', 0.6, `"${a.name}" appears before "${b.name}" is used`);
        }
      }
    }
  }

  // DERIVES_FROM: math block where concept A appears in earlier steps than concept B
  for (let i = 0; i < concepts.length; i++) {
    for (let j = 0; j < concepts.length; j++) {
      if (i === j) continue;
      const a = concepts[i];
      const b = concepts[j];
      const mathBlocks = lesson.blocks.filter(blk => blk.type === 'math');
      for (const mb of mathBlocks) {
        const aPos = mb.content.indexOf(a.name);
        const bPos = mb.content.indexOf(b.name);
        if (aPos >= 0 && bPos >= 0 && aPos < bPos) {
          addEdge(a.id, b.id, 'DERIVES_FROM', 0.7, `"${a.name}" appears before "${b.name}" in the same derivation`);
        }
      }
    }
  }

  // ANALOGOUS_TO: same operation applied in different contexts
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const a = concepts[i];
      const b = concepts[j];
      const blockA = lesson.blocks[a.introducedAt];
      const blockB = lesson.blocks[b.introducedAt];
      if (blockA && blockB) {
        const wordsA = getBlockWords(blockA);
        const wordsB = getBlockWords(blockB);
        const sim = jaccardSimilarity(wordsA, wordsB);
        if (sim > 0.3 && a.type === b.type && a.type === 'example') {
          addEdge(a.id, b.id, 'ANALOGOUS_TO', Math.round(sim * 100) / 100, `Both are examples sharing ${Math.round(sim * 100)}% context similarity`);
        }
      }
    }
  }

  // CONTRASTS_WITH: explicitly contrasted concepts
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const a = concepts[i];
      const b = concepts[j];
      const blockA = lesson.blocks[a.introducedAt];
      const blockB = lesson.blocks[b.introducedAt];
      const textA = blockA?.content.toLowerCase() || '';
      const textB = blockB?.content.toLowerCase() || '';
      const nameLowerA = a.name.toLowerCase();
      const nameLowerB = b.name.toLowerCase();
      const contrastPatterns = ['unlike', 'however', 'on the other hand', 'in contrast', 'whereas', 'differently'];
      const aContrastsB = contrastPatterns.some(p => textA.includes(p) && textA.includes(nameLowerB));
      const bContrastsA = contrastPatterns.some(p => textB.includes(p) && textB.includes(nameLowerA));
      if (aContrastsB || bContrastsA) {
        addEdge(a.id, b.id, 'CONTRASTS_WITH', 0.8, `"${a.name}" and "${b.name}" are explicitly contrasted`);
      }
    }
  }

  // GENERALIZES: specific example → general formula
  for (let i = 0; i < concepts.length; i++) {
    for (let j = 0; j < concepts.length; j++) {
      if (i === j) continue;
      const a = concepts[i];
      const b = concepts[j];
      if (a.type === 'example' && (b.type === 'principle' || b.type === 'definition')) {
        const blockA = lesson.blocks[a.introducedAt];
        if (blockA && conceptNameInBlock(b, blockA)) {
          addEdge(a.id, b.id, 'GENERALIZES', 0.5, `"${a.name}" is an example of general concept "${b.name}"`);
        }
      }
    }
  }

  // EXAMPLE_OF: general concept → specific instance
  for (let i = 0; i < concepts.length; i++) {
    for (let j = 0; j < concepts.length; j++) {
      if (i === j) continue;
      const a = concepts[i];
      const b = concepts[j];
      if (a.type === 'example' && b.type === 'definition') {
        addEdge(b.id, a.id, 'EXAMPLE_OF', 0.8, `"${b.name}" is demonstrated by example "${a.name}"`);
      }
    }
  }

  console.log('[EdgeInference] Inferred', edges.length, 'edges');
  return edges;
}
