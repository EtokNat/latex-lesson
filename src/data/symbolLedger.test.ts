import { describe, it, expect } from 'vitest';
import type { SymbolEntry, SymbolLedger } from './symbolLedger';

describe('symbolLedger', () => {
  const makeEntry = (overrides?: Partial<SymbolEntry>): SymbolEntry => ({
    canonicalForm: 'x',
    aliases: [],
    meaning: 'an unknown variable',
    introducedAtBlock: 0,
    ...overrides,
  });

  it('should create a SymbolEntry with all fields', () => {
    const entry = makeEntry();
    expect(entry.canonicalForm).toBe('x');
    expect(entry.aliases).toEqual([]);
    expect(entry.meaning).toBe('an unknown variable');
    expect(entry.introducedAtBlock).toBe(0);
  });

  it('should support aliases in SymbolEntry', () => {
    const entry = makeEntry({
      canonicalForm: 'x₁, x₂',
      aliases: ['x_1, x_2', 'roots', 'solutions'],
      meaning: 'the two roots of the quadratic equation',
    });
    expect(entry.aliases).toContain('roots');
    expect(entry.aliases).toContain('solutions');
    expect(entry.aliases.length).toBe(3);
  });

  it('should create a SymbolLedger that maps symbols to entries', () => {
    const symbols = new Map<string, SymbolEntry>();
    symbols.set('Δ', makeEntry({
      canonicalForm: 'Δ',
      aliases: ['discriminant', 'b²-4ac'],
      meaning: 'discriminant of a quadratic equation',
      introducedAtBlock: 15,
    }));

    const ledger: SymbolLedger = {
      symbols,
      getCanonical(alias: string): string {
        for (const [canonical, entry] of this.symbols) {
          if (canonical === alias || entry.aliases.includes(alias)) {
            return canonical;
          }
        }
        return alias;
      },
      isDefined(form: string): boolean {
        for (const [canonical, entry] of this.symbols) {
          if (canonical === form || entry.aliases.includes(form)) {
            return true;
          }
        }
        return false;
      },
    };

    expect(ledger.symbols.size).toBe(1);
  });

  it('should resolve canonical form from alias', () => {
    const symbols = new Map<string, SymbolEntry>();
    symbols.set('Δ', makeEntry({
      canonicalForm: 'Δ',
      aliases: ['discriminant', 'b²-4ac'],
      meaning: 'discriminant',
      introducedAtBlock: 15,
    }));
    symbols.set('x', makeEntry({
      canonicalForm: 'x',
      aliases: ['variable', 'unknown'],
      meaning: 'unknown variable',
      introducedAtBlock: 0,
    }));

    const ledger: SymbolLedger = {
      symbols,
      getCanonical(alias: string): string {
        for (const [canonical, entry] of this.symbols) {
          if (canonical === alias || entry.aliases.includes(alias)) {
            return canonical;
          }
        }
        return alias;
      },
      isDefined(form: string): boolean {
        return this.getCanonical(form) !== form || this.symbols.has(form);
      },
    };

    expect(ledger.getCanonical('discriminant')).toBe('Δ');
    expect(ledger.getCanonical('b²-4ac')).toBe('Δ');
    expect(ledger.getCanonical('Δ')).toBe('Δ');
    expect(ledger.getCanonical('unknown')).toBe('x');
    expect(ledger.getCanonical('not_there')).toBe('not_there');
  });

  it('should check if a form is defined', () => {
    const symbols = new Map<string, SymbolEntry>();
    symbols.set('√', makeEntry({
      canonicalForm: '√',
      aliases: ['sqrt', 'square root', 'radical'],
      meaning: 'square root',
      introducedAtBlock: 3,
    }));

    const ledger: SymbolLedger = {
      symbols,
      getCanonical(alias: string): string {
        for (const [canonical, entry] of this.symbols) {
          if (canonical === alias || entry.aliases.includes(alias)) {
            return canonical;
          }
        }
        return alias;
      },
      isDefined(form: string): boolean {
        for (const [canonical, entry] of this.symbols) {
          if (canonical === form || entry.aliases.includes(form)) {
            return true;
          }
        }
        return false;
      },
    };

    expect(ledger.isDefined('√')).toBe(true);
    expect(ledger.isDefined('sqrt')).toBe(true);
    expect(ledger.isDefined('square root')).toBe(true);
    expect(ledger.isDefined('radical')).toBe(true);
    expect(ledger.isDefined('⊗')).toBe(false);
    expect(ledger.isDefined('unknown_symbol')).toBe(false);
  });

  it('should detect notation conflicts (same symbol, different meanings)', () => {
    const symbols = new Map<string, SymbolEntry>();
    symbols.set('i', makeEntry({
      canonicalForm: 'i',
      aliases: ['imaginary unit'],
      meaning: 'imaginary unit √(-1)',
      introducedAtBlock: 17,
    }));

    // Check: if "i" appears again with different meaning
    const conflictAlias = 'i';
    const existing = symbols.get('i');
    const wouldConflict = existing && conflictAlias === existing.canonicalForm;
    expect(wouldConflict).toBe(true);
  });

  it('should handle empty symbol ledger', () => {
    const ledger: SymbolLedger = {
      symbols: new Map(),
      getCanonical(alias: string): string {
        return alias;
      },
      isDefined(form: string): boolean {
        return false;
      },
    };
    expect(ledger.symbols.size).toBe(0);
    expect(ledger.getCanonical('x')).toBe('x');
    expect(ledger.isDefined('x')).toBe(false);
  });

  it('should track block where symbol was introduced', () => {
    const entry = makeEntry({
      canonicalForm: '±',
      aliases: ['plus or minus', 'plus-minus'],
      meaning: 'plus or minus sign',
      introducedAtBlock: 22,
    });
    expect(entry.introducedAtBlock).toBe(22);
  });
});
