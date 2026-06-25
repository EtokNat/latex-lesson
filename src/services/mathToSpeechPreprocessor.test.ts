import { describe, it, expect } from 'vitest';
import { preprocessMathToSpeech } from './mathToSpeechPreprocessor';

describe('mathToSpeechPreprocessor', () => {
  it('converts superscripts to spoken form', () => {
    const result = preprocessMathToSpeech('x^2 + y^2 = z^2');
    expect(result.spoken.toLowerCase()).toContain('squared');
  });

  it('converts subscripts to spoken form', () => {
    const result = preprocessMathToSpeech('x_1 + x_2');
    expect(result.spoken).toContain('sub');
  });

  it('converts fractions to spoken form', () => {
    const result = preprocessMathToSpeech('\\frac{a}{b}');
    expect(result.spoken).toContain('over');
  });

  it('converts square roots to spoken form', () => {
    const result = preprocessMathToSpeech('\\sqrt{x + 1}');
    expect(result.spoken).toContain('square root');
  });

  it('converts Greek letters to spoken form', () => {
    const result = preprocessMathToSpeech('\\alpha + \\beta = \\gamma');
    expect(result.spoken).toContain('alpha');
    expect(result.spoken).toContain('beta');
    expect(result.spoken).toContain('gamma');
  });

  it('converts plus-or-minus symbol', () => {
    const result = preprocessMathToSpeech('\\pm \\sqrt{b^2 - 4ac}');
    expect(result.spoken).toContain('plus or minus');
  });

  it('converts inequality operators', () => {
    const result = preprocessMathToSpeech('x \\geq 0');
    expect(result.spoken).toContain('greater than or equal');
  });

  it('preserves original form alongside spoken form', () => {
    const original = 'x^2 + y^2 = r^2';
    const result = preprocessMathToSpeech(original);
    expect(result.original).toBe(original);
    expect(result.spoken).not.toBe(original);
  });

  it('converts Delta symbol', () => {
    const result = preprocessMathToSpeech('\\Delta = b^2 - 4ac');
    expect(result.spoken).toContain('delta');
  });

  it('handles empty string', () => {
    const result = preprocessMathToSpeech('');
    expect(result.spoken).toBe('');
    expect(result.original).toBe('');
  });

  it('handles text with no math notation', () => {
    const text = 'This is a simple sentence with no math.';
    const result = preprocessMathToSpeech(text);
    expect(result.spoken).toBe(text);
    expect(result.original).toBe(text);
  });
});
