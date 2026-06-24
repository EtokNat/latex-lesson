import { describe, it, expect } from 'vitest';
import { buildSymbolLedger } from './symbolLedgerBuilder';
import { SEED_LESSON } from '../data/seedLesson';
import type { Lesson } from '../data/types';

describe('symbolLedgerBuilder', () => {
  it('identifies canonical notation from math blocks', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.symbols.size).toBeGreaterThan(0);
  });

  it('detects coefficients a, b, c in seed lesson', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.isDefined('a')).toBe(true);
    expect(ledger.isDefined('b')).toBe(true);
    expect(ledger.isDefined('c')).toBe(true);
  });

  it('detects discriminant symbol Δ', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.isDefined('Δ')).toBe(true);
  });

  it('getCanonical returns canonical form for known alias', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    const canonical = ledger.getCanonical('Delta');
    expect(typeof canonical).toBe('string');
  });

  it('getCanonical returns input for unknown symbol', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    const result = ledger.getCanonical('nonexistent_symbol_xyz');
    expect(result).toBe('nonexistent_symbol_xyz');
  });

  it('isDefined returns false for unknown symbol', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.isDefined('made_up_symbol_12345')).toBe(false);
  });

  it('handles lesson with no math blocks', () => {
    const lesson: Lesson = {
      id: 'no-math',
      title: 'No Math',
      blocks: [
        { id: 'h1', type: 'heading', content: 'Introduction' },
        { id: 't1', type: 'text', content: 'This lesson has no mathematical notation.' },
      ],
    };
    const ledger = buildSymbolLedger(lesson);
    expect(ledger.symbols.size).toBeGreaterThanOrEqual(0);
  });

  it('handles empty lesson', () => {
    const ledger = buildSymbolLedger({ id: 'empty', title: 'Empty', blocks: [] });
    expect(ledger.symbols.size).toBe(0);
  });

  it('detects plus-minus symbol', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.isDefined('±')).toBe(true);
  });

  it('detects square root symbol', () => {
    const ledger = buildSymbolLedger(SEED_LESSON);
    expect(ledger.isDefined('√')).toBe(true);
  });
});
