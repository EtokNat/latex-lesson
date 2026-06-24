import type { Lesson, LessonBlock } from '../data/types';
import type { SymbolLedger, SymbolEntry } from '../data/symbolLedger';

const SYMBOL_DEFINITION_PATTERNS = [
  /(?:let|set|denote|define|write)\s+(?:the\s+)?(?:variable\s+)?([a-zA-Z\\]+(?:\s*,\s*[a-zA-Z\\]+)*)\s+(?:to\s+)?(?:be|as|mean(?:s)?|represent(?:s)?|denote(?:s)?)\s+(.+?)(?:[.,;]|$)/gi,
  /([a-zA-Z\\]+)\s+(?:is|are)\s+(?:the|a|an)\s+(.+?)(?:[.,;]|$)/gi,
  /(?:called|known as|denoted)\s+(?:the\s+)?([a-zA-Z\\]+)/gi,
  /([a-zA-Z\\]+)\s*=\s*(.+?)(?:[,.]|\\\\)/gi,
  /\\([a-zA-Z]+)\s+(?:is|denotes?|represents?)\s+(?:the|a|an)\s+(.+?)(?:[.,;]|$)/gi,
];

const COMMON_SYMBOLS: Record<string, { canonical: string; meaning: string }> = {
  'a': { canonical: 'a', meaning: 'Quadratic coefficient (coefficient of x²)' },
  'b': { canonical: 'b', meaning: 'Linear coefficient (coefficient of x)' },
  'c': { canonical: 'c', meaning: 'Constant term' },
  'x': { canonical: 'x', meaning: 'Variable / unknown' },
  'Δ': { canonical: 'Δ', meaning: 'Discriminant (b² - 4ac)' },
  '\\pm': { canonical: '±', meaning: 'Plus or minus' },
  '\\sqrt': { canonical: '√', meaning: 'Square root' },
  'x₁': { canonical: 'x₁', meaning: 'First root' },
  'x₂': { canonical: 'x₂', meaning: 'Second root' },
  'x_i': { canonical: 'x_i', meaning: 'i-th root' },
  'x_n': { canonical: 'x_n', meaning: 'n-th root' },
};

function extractSymbolBlock(block: LessonBlock, blockIndex: number): SymbolEntry[] {
  const entries: SymbolEntry[] = [];
  const content = block.content;

  if (block.type === 'math') {
    for (const [symbol, info] of Object.entries(COMMON_SYMBOLS)) {
      if (content.includes(symbol)) {
        const existing = entries.find(e => e.canonicalForm === info.canonical);
        if (!existing) {
          const aliases: string[] = [];
          if (symbol === 'Δ' && content.includes('Delta')) aliases.push('Delta');
          if (symbol === 'a' && content.includes('a \\neq 0')) aliases.push('a ≠ 0');
          entries.push({
            canonicalForm: info.canonical,
            aliases,
            meaning: info.meaning,
            introducedAtBlock: blockIndex,
          });
        }
      }
    }

    if (/\bDelta\b/.test(content) && !/\bΔ\b/.test(content)) {
      const existing = entries.find(e => e.canonicalForm === 'Δ');
      if (!existing) {
        entries.push({
          canonicalForm: 'Δ',
          aliases: ['Delta'],
          meaning: 'Discriminant (b² - 4ac)',
          introducedAtBlock: blockIndex,
        });
      }
    }
  }

  if (block.type === 'text') {
    for (const pattern of SYMBOL_DEFINITION_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const symbol = match[1].trim();
        const meaning = (match[2] || '').trim();
        if (symbol.length > 0 && symbol.length < 20 && meaning.length > 1) {
          const existing = entries.find(e => e.canonicalForm === symbol);
          if (!existing) {
            entries.push({
              canonicalForm: symbol,
              aliases: [],
              meaning,
              introducedAtBlock: blockIndex,
            });
          }
        }
      }
    }
  }

  return entries;
}

function detectConflicts(entries: SymbolEntry[]): { symbol: string; message: string }[] {
  const conflicts: { symbol: string; message: string }[] = [];
  const canonicalMap = new Map<string, SymbolEntry[]>();

  for (const entry of entries) {
    const existing = canonicalMap.get(entry.canonicalForm);
    if (existing) {
      existing.push(entry);
    } else {
      canonicalMap.set(entry.canonicalForm, [entry]);
    }
  }

  for (const [canonical, group] of canonicalMap) {
    if (group.length > 1) {
      const meanings = new Set(group.map(e => e.meaning));
      if (meanings.size > 1) {
        conflicts.push({
          symbol: canonical,
          message: `Symbol "${canonical}" has conflicting meanings: ${[...meanings].join('; ')}`,
        });
      }
    }
  }

  return conflicts;
}

export function buildSymbolLedger(lesson: Lesson): SymbolLedger {
  console.log('[SymbolLedger] Building symbol ledger for lesson:', lesson.title);

  const allEntries: SymbolEntry[] = [];
  const symbolMap = new Map<string, SymbolEntry>();

  for (let i = 0; i < lesson.blocks.length; i++) {
    const block = lesson.blocks[i];
    const entries = extractSymbolBlock(block, i);
    for (const entry of entries) {
      const key = entry.canonicalForm;
      const existing = symbolMap.get(key);
      if (existing) {
        for (const alias of entry.aliases) {
          if (!existing.aliases.includes(alias)) {
            existing.aliases.push(alias);
          }
        }
      } else {
        symbolMap.set(key, { ...entry });
        allEntries.push(entry);
      }
    }
  }

  const conflicts = detectConflicts(allEntries);
  if (conflicts.length > 0) {
    console.warn('[SymbolLedger] Notation conflicts detected:');
    for (const conflict of conflicts) {
      console.warn(`  - ${conflict.message}`);
    }
  }

  const ledger: SymbolLedger = {
    symbols: symbolMap,
    getCanonical(alias: string): string {
      for (const [canonical, entry] of this.symbols) {
        if (canonical === alias) return canonical;
        if (entry.aliases.includes(alias)) return canonical;
      }
      return alias;
    },
    isDefined(form: string): boolean {
      for (const [canonical, entry] of this.symbols) {
        if (canonical === form) return true;
        if (entry.aliases.includes(form)) return true;
      }
      return false;
    },
  };

  console.log('[SymbolLedger] Built ledger with', symbolMap.size, 'symbols');
  return ledger;
}
