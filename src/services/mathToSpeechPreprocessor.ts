export interface MathToSpeechResult {
  spoken: string;
  original: string;
}

interface Replacement {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
}

const REPLACEMENTS: Replacement[] = [
  { pattern: /\\(?:quad|qquad|enspace|thinspace|;|\,|\:|medspace|thickspace)\b/g, replacement: ' ' },
  { pattern: /\\\[(\d+(?:\.\d+)?)em\]/g, replacement: '' },
  { pattern: /\\text\{([^}]*)\}/g, replacement: '$1' },
  { pattern: /\\textbf\{([^}]*)\}/g, replacement: '$1' },
  { pattern: /\\mathit\{([^}]*)\}/g, replacement: '$1' },
  { pattern: /\\mathrm\{([^}]*)\}/g, replacement: '$1' },
  { pattern: /\\begin\{aligned\}/g, replacement: '' },
  { pattern: /\\end\{aligned\}/g, replacement: '' },
  { pattern: /\\begin\{array\}(\[[^\]]*\])?\{[^}]*\}/g, replacement: '' },
  { pattern: /\\end\{array\}/g, replacement: '' },
  { pattern: /\\frac\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, replacement: '$1 over $2' },
  { pattern: /\\sqrt\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, replacement: 'the square root of $1' },
  { pattern: /\\sqrt/g, replacement: 'the square root of' },
  { pattern: /\\sum(?:_\{([^}]*)\})?\{([^}]*)\}/g, replacement: 'the sum over $2' },
  { pattern: /\\sum/g, replacement: 'sum' },
  { pattern: /\\prod/g, replacement: 'product' },
  { pattern: /\\int(?:_\{([^}]*)\})?(?:\^\{([^}]*)\})?/g, replacement: 'the integral' },
  { pattern: /\\infty/g, replacement: 'infinity' },
  { pattern: /\\Delta\b/g, replacement: 'delta' },
  { pattern: /\\pm/g, replacement: 'plus or minus' },
  { pattern: /\\mp/g, replacement: 'minus or plus' },
  { pattern: /\\cdot/g, replacement: ' times ' },
  { pattern: /\\times/g, replacement: ' times ' },
  { pattern: /\\div/g, replacement: ' divided by ' },
  { pattern: /\\neq/g, replacement: 'is not equal to' },
  { pattern: /\\geq/g, replacement: 'is greater than or equal to' },
  { pattern: /\\leq/g, replacement: 'is less than or equal to' },
  { pattern: /\\ge/g, replacement: 'is greater than or equal to' },
  { pattern: /\\le/g, replacement: 'is less than or equal to' },
  { pattern: /\\gg/g, replacement: 'is much greater than' },
  { pattern: /\\ll/g, replacement: 'is much less than' },
  { pattern: /\\approx/g, replacement: 'is approximately' },
  { pattern: /\\equiv/g, replacement: 'is equivalent to' },
  { pattern: /\\sim/g, replacement: 'is similar to' },
  { pattern: /\\propto/g, replacement: 'is proportional to' },
  { pattern: /\\to\b/g, replacement: 'approaches' },
  { pattern: /\\rightarrow/g, replacement: ' approaches ' },
  { pattern: /\\Rightarrow/g, replacement: 'implies' },
  { pattern: /\\Leftrightarrow/g, replacement: 'if and only if' },
  { pattern: /\\therefore/g, replacement: 'therefore' },
  { pattern: /\\because/g, replacement: 'because' },
  { pattern: /\\partial/g, replacement: 'partial' },
  { pattern: /\\nabla/g, replacement: 'nabla' },
  { pattern: /\\forall/g, replacement: 'for all' },
  { pattern: /\\exists/g, replacement: 'there exists' },
  { pattern: /\\in\b/g, replacement: 'in' },
  { pattern: /\\notin/g, replacement: 'not in' },
  { pattern: /\\subset/g, replacement: 'is a subset of' },
  { pattern: /\\subseteq/g, replacement: 'is a subset of or equal to' },
  { pattern: /\\emptyset/g, replacement: 'the empty set' },
  { pattern: /\\angle/g, replacement: 'angle' },
  { pattern: /\\parallel/g, replacement: 'is parallel to' },
  { pattern: /\\perp/g, replacement: 'is perpendicular to' },
  { pattern: /\\circ/g, replacement: ' degrees ' },
  { pattern: /\\ldots/g, replacement: 'dot dot dot' },
  { pattern: /\\cdots/g, replacement: 'dot dot dot' },
  { pattern: /\\vdots/g, replacement: 'vertical dots' },
  { pattern: /\\alpha/g, replacement: 'alpha' },
  { pattern: /\\beta/g, replacement: 'beta' },
  { pattern: /\\gamma/g, replacement: 'gamma' },
  { pattern: /\\theta/g, replacement: 'theta' },
  { pattern: /\\lambda/g, replacement: 'lambda' },
  { pattern: /\\mu/g, replacement: 'mu' },
  { pattern: /\\pi/g, replacement: 'pi' },
  { pattern: /\\sigma/g, replacement: 'sigma' },
  { pattern: /\\omega/g, replacement: 'omega' },
  { pattern: /\\phi/g, replacement: 'phi' },
  { pattern: /\\epsilon/g, replacement: 'epsilon' },
  { pattern: /\\varepsilon/g, replacement: 'epsilon' },
  { pattern: /\\rho/g, replacement: 'rho' },
  { pattern: /\\tau/g, replacement: 'tau' },
];

const POST_REPLACEMENTS: Replacement[] = [
  { pattern: /(\w)\^\{?2\}?/g, replacement: '$1 squared' },
  { pattern: /(\w)\^\{?3\}?/g, replacement: '$1 cubed' },
  { pattern: /(\w)\^\{?n\}?/g, replacement: '$1 to the n' },
  { pattern: /(\w)\^\{([^}]*)\}/g, replacement: '$1 to the $2' },
  { pattern: /(\w)_(\d+)\b/g, replacement: '$1 sub $2' },
  { pattern: /(\w)_\{(\d+)\}/g, replacement: '$1 sub $2' },
  { pattern: /(\w)_\{([a-zA-Z][^}]*)\}/g, replacement: '$1 sub $2' },
  { pattern: /\(/g, replacement: ' open parenthesis ' },
  { pattern: /\)/g, replacement: ' close parenthesis ' },
  { pattern: /\{/g, replacement: '' },
  { pattern: /\}/g, replacement: '' },
  { pattern: /\\/g, replacement: '' },
  { pattern: /&/g, replacement: '' },
  { pattern: /~/g, replacement: ' ' },
  { pattern: /\s{3,}/g, replacement: ' ' },
  { pattern: /\s{2,}/g, replacement: ' ' },
];

function applyReplacements(text: string, replacements: Replacement[]): string {
  let result = text;
  for (const { pattern, replacement } of replacements) {
    result = result.replace(pattern, replacement as string);
  }
  return result;
}

export function preprocessMathToSpeech(text: string): MathToSpeechResult {
  console.log('[MathToSpeech] Processing text, length:', text.length);

  try {
    let spoken = text;

    spoken = applyReplacements(spoken, REPLACEMENTS);
    spoken = applyReplacements(spoken, POST_REPLACEMENTS);
    spoken = spoken.trim();

    const n = (spoken.match(/open parenthesis/g) || []).length;
    console.log('[MathToSpeech] Processed', n, 'mathematical expressions');

    return { spoken, original: text };
  } catch (err) {
    console.error('[MathToSpeech] Failed:', err);
    return { spoken: text, original: text };
  }
}
