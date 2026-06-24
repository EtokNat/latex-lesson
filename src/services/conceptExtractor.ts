import type { Lesson, LessonBlock } from '../data/types';
import type { ConceptNode, ConceptType } from '../data/knowledgeGraph';

const DEFINITION_PATTERNS = [
  /\b(?:is called|we call|known as|referred to as|defined as|means)\s+(?:the\s+)?([\w\s\-+±√^]+?)(?:[,.]|$)/gi,
  /\b([\w\s\-+]+?)\s+is\s+(?:a|an)\s+([\w\s\-+]+?(?:equation|function|expression|number|form|method|property|formula|value|term|graph|parabola|root|solution|discriminant))/gi,
  /\b(?:the term|the name|the word)\s+"?([\w\s\-+]+?)"?\s+(?:comes from|means|refers to)/gi,
];

const HEADING_PATTERNS = [
  /^(?:\d+\.?\s*)?(.+?)(?:\s*[—–-]\s*.+)?$/,
];

const MATH_CONCEPT_PATTERNS = [
  /\\text\{([^}]+)\}/g,
  /\\frac\{([^}]+)\}\{([^}]+)\}/g,
  /\\sqrt\{([^}]+)\}/g,
  /\\sum(?:_\{([^}]+)\})?(?:\^\{([^}]+)\})?/g,
  /\\Delta/g,
  /\\pm/g,
];

function generateId(name: string, blockIndex: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `concept-${slug}-${blockIndex}`;
}

function inferType(name: string, content: string, blockType: string): ConceptType {
  const lower = (name + ' ' + content).toLowerCase();
  if (/\b(?:example|instance|for instance|consider|solve|case)\b/.test(lower)) return 'example';
  if (/\b(?:analog|like|similar to|just as|think of|imagine|picture)\b/.test(lower)) return 'analogy';
  if (/\b(?:method|technique|process|step|procedure|algorithm|approach|solve|factor|complete|derive)\b/.test(lower)) return 'procedure';
  if (/\b(?:rule|law|property|theorem|principle|axiom|always|never|every|all)\b/.test(lower)) return 'principle';
  if (/\b(?:is|are|means|defined|definition|called|refers to|a quadratic|the discriminant|standard form)\b/.test(lower)) return 'definition';
  return 'definition';
}

function extractFromHeading(block: LessonBlock, blockIndex: number): ConceptNode[] {
  const concepts: ConceptNode[] = [];
  const match = HEADING_PATTERNS[0].exec(block.content);
  const name = match ? match[1].trim() : block.content.trim();
  if (name.length > 2) {
    concepts.push({
      id: generateId(name, blockIndex),
      name,
      type: 'definition',
      introducedAt: blockIndex,
      lastReferencedAt: blockIndex,
      representations: { verbal: name },
      commonMisconceptions: [],
    });
  }
  return concepts;
}

function extractFromText(block: LessonBlock, blockIndex: number): ConceptNode[] {
  const concepts: ConceptNode[] = [];
  const content = block.content;

  for (const pattern of DEFINITION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const captured = (match[1] || match[2] || '').trim();
      if (captured.length > 2 && captured.length < 80 && !/^\d+$/.test(captured)) {
        const name = captured.charAt(0).toUpperCase() + captured.slice(1);
        const existing = concepts.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (!existing) {
          concepts.push({
            id: generateId(name, blockIndex),
            name,
            type: inferType(name, content, 'text'),
            introducedAt: blockIndex,
            lastReferencedAt: blockIndex,
            representations: { verbal: captured },
            commonMisconceptions: [],
          });
        }
      }
    }
  }

  return concepts;
}

function extractFromMath(block: LessonBlock, blockIndex: number): ConceptNode[] {
  const concepts: ConceptNode[] = [];
  const content = block.content;

  for (const pattern of MATH_CONCEPT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (pattern === MATH_CONCEPT_PATTERNS[0]) {
        const captured = match[1].trim();
        if (captured.length > 1 && captured.length < 60 && !/^\d+$/.test(captured)) {
          const name = captured.charAt(0).toUpperCase() + captured.slice(1);
          const existing = concepts.find(c => c.name.toLowerCase() === name.toLowerCase());
          if (!existing) {
            concepts.push({
              id: generateId(name, blockIndex),
              name,
              type: inferType(name, content, 'math'),
              introducedAt: blockIndex,
              lastReferencedAt: blockIndex,
              representations: { symbolic: captured },
              commonMisconceptions: [],
            });
          }
        }
      }
      if (pattern === MATH_CONCEPT_PATTERNS[1]) {
        const name = 'Fraction';
        const existing = concepts.find(c => c.name === name && c.introducedAt === blockIndex);
        if (!existing) {
          concepts.push({
            id: generateId(name, blockIndex),
            name,
            type: 'procedure',
            introducedAt: blockIndex,
            lastReferencedAt: blockIndex,
            representations: { symbolic: `\\frac{${match[1]}}{${match[2]}}` },
            commonMisconceptions: [],
          });
        }
      }
      if (pattern === MATH_CONCEPT_PATTERNS[2]) {
        const name = 'Square Root';
        const existing = concepts.find(c => c.name === name && c.introducedAt === blockIndex);
        if (!existing) {
          concepts.push({
            id: generateId(name, blockIndex),
            name,
            type: 'procedure',
            introducedAt: blockIndex,
            lastReferencedAt: blockIndex,
            representations: { symbolic: `\\sqrt{${match[1]}}` },
            commonMisconceptions: [],
          });
        }
      }
      if (pattern === MATH_CONCEPT_PATTERNS[3]) {
        const name = 'Summation';
        const existing = concepts.find(c => c.name === name && c.introducedAt === blockIndex);
        if (!existing) {
          concepts.push({
            id: generateId(name, blockIndex),
            name,
            type: 'procedure',
            introducedAt: blockIndex,
            lastReferencedAt: blockIndex,
            representations: { symbolic: '\\sum' },
            commonMisconceptions: [],
          });
        }
      }
    }
  }

  return concepts;
}

export function extractConcepts(lesson: Lesson): ConceptNode[] {
  console.log('[ConceptExtractor] Extracting concepts from lesson:', lesson.title);
  const allConcepts: ConceptNode[] = [];

  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i];

    switch (block.type) {
      case 'heading':
        allConcepts.push(...extractFromHeading(block, i));
        break;
      case 'text':
        allConcepts.push(...extractFromText(block, i));
        break;
      case 'math':
        allConcepts.push(...extractFromMath(block, i));
        break;
      default:
        break;
    }
  }

  const seen = new Set<string>();
  const unique: ConceptNode[] = [];
  for (const c of allConcepts) {
    const key = c.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    } else {
      const existing = unique.find(e => e.name.toLowerCase() === key);
      if (existing) {
        existing.lastReferencedAt = Math.max(existing.lastReferencedAt, c.introducedAt);
      }
    }
  }

  console.log('[ConceptExtractor] Extracted', unique.length, 'unique concepts');
  return unique;
}
