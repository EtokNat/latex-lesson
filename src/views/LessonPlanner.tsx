import { useState, useCallback, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { LessonBlock, Lesson, BlockType } from '../data/types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface LessonPlannerProps {
  onSaveAndPresent: (lesson: Lesson) => void;
}

const blockTypeLabels: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  math: 'Math',
};

const SEED_LESSON: Lesson = {
  id: 'seed-lesson-001',
  title: 'Quadratic Equations — From Factoring to the Quadratic Formula',
  blocks: [
    // ========== SECTION 1: INTRODUCTION ==========
    {
      id: 'seed-1',
      type: 'heading',
      content: '1. What Is a Quadratic Equation?',
    },
    {
      id: 'seed-2',
      type: 'text',
      content:
        'A quadratic equation is a second-degree polynomial equation in one variable. Its standard form is ax^2 + bx + c = 0, where a, b, and c are real numbers and a ≠ 0. The name "quadratic" comes from the Latin word quadratus, meaning "square." The term ax^2 is the quadratic term, bx is the linear term, and c is the constant term.',
    },
    {
      id: 'seed-3',
      type: 'math',
      content:
        '\\begin{aligned}\nax^2 + bx + c &= 0 \\quad (a \\neq 0) \\\\\n\\text{Examples:} \\quad x^2 - 5x + 6 &= 0 \\\\\n2x^2 + 3x - 2 &= 0 \\\\\n-x^2 + 4x - 4 &= 0\n\\end{aligned}',
    },
    {
      id: 'seed-4',
      type: 'image',
      content:
        'A parabola opening upward (a > 0) and downward (a < 0), showing how the sign of a affects the shape',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Polynomialdeg2.svg/640px-Polynomialdeg2.svg.png',
    },
    {
      id: 'seed-5',
      type: 'text',
      content:
        'The graph of a quadratic function y = ax^2 + bx + c is a parabola. If a > 0, the parabola opens upward (like a U). If a < 0, it opens downward (like an inverted U). The solutions (or roots) of the quadratic equation are the x-intercepts of this parabola — the points where it crosses the x-axis.',
    },

    // ========== SECTION 2: FACTORING ==========
    {
      id: 'seed-6',
      type: 'heading',
      content: '2. Method 1 — Solving by Factoring',
    },
    {
      id: 'seed-7',
      type: 'text',
      content:
        'When a quadratic trinomial can be expressed as a product of two binomials, we can use the Zero Product Property: if p × q = 0, then either p = 0 or q = 0 (or both). This method works well when the roots are rational numbers. Let us work through a detailed example.',
    },
    {
      id: 'seed-8',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Solve: } x^2 + 7x + 12 &= 0 \\\\\n\\text{Find two numbers that multiply to } 12 \\text{ and add to } 7 &: \\quad 3 \\text{ and } 4 \\\\\nx^2 + 3x + 4x + 12 &= 0 \\\\\nx(x + 3) + 4(x + 3) &= 0 \\\\\n(x + 3)(x + 4) &= 0 \\\\\nx + 3 = 0 \\quad &\\text{or} \\quad x + 4 = 0 \\\\\nx = -3 \\quad &\\text{or} \\quad x = -4\n\\end{aligned}',
    },
    {
      id: 'seed-9',
      type: 'text',
      content:
        'Check: Substitute x = -3 into the original equation. (-3)^2 + 7(-3) + 12 = 9 - 21 + 12 = 0. Correct! Likewise for x = -4: (-4)^2 + 7(-4) + 12 = 16 - 28 + 12 = 0.',
    },
    {
      id: 'seed-10',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Solve: } 2x^2 - x - 6 &= 0 \\\\\n\\text{Find factors of } 2 \\times (-6) = -12 \\text{ that add to } -1 &: \\quad -4 \\text{ and } 3 \\\\\n2x^2 - 4x + 3x - 6 &= 0 \\\\\n2x(x - 2) + 3(x - 2) &= 0 \\\\\n(x - 2)(2x + 3) &= 0 \\\\\nx = 2 \\quad &\\text{or} \\quad x = -\\frac{3}{2}\n\\end{aligned}',
    },
    {
      id: 'seed-11',
      type: 'image',
      content:
        'Visual representation of factoring x^2 + 7x + 12 as (x+3)(x+4) using an area model',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Binomial_theorem_visualisation.svg/640px-Binomial_theorem_visualisation.svg.png',
    },

    // ========== SECTION 3: COMPLETING THE SQUARE ==========
    {
      id: 'seed-12',
      type: 'heading',
      content: '3. Method 2 — Completing the Square',
    },
    {
      id: 'seed-13',
      type: 'text',
      content:
        'Completing the square transforms any quadratic into a perfect square trinomial plus a constant. This method works for every quadratic and leads directly to the quadratic formula. The key insight: for any expression x^2 + bx, adding (b/2)^2 yields a perfect square, since (x + b/2)^2 = x^2 + bx + (b/2)^2.',
    },
    {
      id: 'seed-14',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Solve: } x^2 + 6x + 5 &= 0 \\\\\nx^2 + 6x &= -5 \\\\\n\\text{Add } \\left(\\frac{6}{2}\\right)^2 = 9 \\text{ to both sides:} \\\\\nx^2 + 6x + 9 &= -5 + 9 \\\\\n(x + 3)^2 &= 4 \\\\\n\\sqrt{(x + 3)^2} &= \\pm \\sqrt{4} \\\\\nx + 3 &= \\pm 2 \\\\\nx &= -3 \\pm 2 \\\\\nx = -1 \\quad &\\text{or} \\quad x = -5\n\\end{aligned}',
    },
    {
      id: 'seed-15',
      type: 'text',
      content:
        'Notice that the expression x^2 + 6x becomes a perfect square trinomial when we add 9. Geometrically, completing the square corresponds to rearranging the area of a rectangle into a square plus a small leftover piece.',
    },

    // ========== SECTION 4: THE QUADRATIC FORMULA ==========
    {
      id: 'seed-16',
      type: 'heading',
      content: '4. Method 3 — The Quadratic Formula',
    },
    {
      id: 'seed-17',
      type: 'text',
      content:
        'The quadratic formula is the most powerful method because it works for every quadratic equation — even those that cannot be factored. It is derived by completing the square on the general form ax^2 + bx + c = 0. Follow each step of the derivation below carefully.',
    },
    {
      id: 'seed-18',
      type: 'math',
      content:
        '\\begin{aligned}\nax^2 + bx + c &= 0 \\\\\n\\text{Divide through by } a: \\\\\nx^2 + \\frac{b}{a}x + \\frac{c}{a} &= 0 \\\\\nx^2 + \\frac{b}{a}x &= -\\frac{c}{a} \\\\\n\\text{Complete the square — add } \\left(\\frac{b}{2a}\\right)^2 \\text{ to both sides:} \\\\\nx^2 + \\frac{b}{a}x + \\left(\\frac{b}{2a}\\right)^2 &= \\left(\\frac{b}{2a}\\right)^2 - \\frac{c}{a} \\\\\n\\left(x + \\frac{b}{2a}\\right)^2 &= \\frac{b^2}{4a^2} - \\frac{4ac}{4a^2} \\\\\n\\left(x + \\frac{b}{2a}\\right)^2 &= \\frac{b^2 - 4ac}{4a^2} \\\\\nx + \\frac{b}{2a} &= \\pm \\sqrt{\\frac{b^2 - 4ac}{4a^2}} \\\\\nx + \\frac{b}{2a} &= \\pm \\frac{\\sqrt{b^2 - 4ac}}{2a} \\\\\nx &= -\\frac{b}{2a} \\pm \\frac{\\sqrt{b^2 - 4ac}}{2a} \\\\\nx &= \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n\\end{aligned}',
    },
    {
      id: 'seed-19',
      type: 'text',
      content:
        'This is the quadratic formula. Memorise it: x equals negative b plus or minus the square root of b squared minus 4ac, all over 2a. Now let us apply it to a worked example.',
    },
    {
      id: 'seed-20',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Solve: } 2x^2 - 4x - 6 &= 0 \\\\\n\\text{Identify } a = 2,\\; b &= -4,\\; c = -6 \\\\\n\\text{Substitute into } x &= \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\\\\nx &= \\frac{-(-4) \\pm \\sqrt{(-4)^2 - 4(2)(-6)}}{2(2)} \\\\\nx &= \\frac{4 \\pm \\sqrt{16 + 48}}{4} \\\\\nx &= \\frac{4 \\pm \\sqrt{64}}{4} \\\\\nx &= \\frac{4 \\pm 8}{4} \\\\\nx &= \\frac{4 + 8}{4} = \\frac{12}{4} = 3 \\quad \\text{or} \\quad x = \\frac{4 - 8}{4} = \\frac{-4}{4} = -1\n\\end{aligned}',
    },
    {
      id: 'seed-21',
      type: 'image',
      content:
        'Graph of y = 2x^2 - 4x - 6 showing roots at x = 3 and x = -1 with the vertex at (1, -8)',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Quadratic_function_graph_key_values.svg/640px-Quadratic_function_graph_key_values.svg.png',
    },

    // ========== SECTION 5: THE DISCRIMINANT ==========
    {
      id: 'seed-22',
      type: 'heading',
      content: '5. The Discriminant — b^2 - 4ac',
    },
    {
      id: 'seed-23',
      type: 'text',
      content:
        'The expression under the square root, b^2 - 4ac, is called the discriminant (often denoted by the Greek letter Delta, Δ). Without solving the equation, the discriminant tells us how many real solutions exist and what kind of numbers the roots will be.',
    },
    {
      id: 'seed-24',
      type: 'math',
      content:
        '\\begin{aligned}\n\\Delta &= b^2 - 4ac \\\\\n\\text{If } \\Delta > 0 &: \\text{ two distinct real roots} \\\\\n\\text{If } \\Delta = 0 &: \\text{ one repeated real root (a double root)} \\\\\n\\text{If } \\Delta < 0 &: \\text{ no real roots (two complex conjugates)}\n\\end{aligned}',
    },
    {
      id: 'seed-25',
      type: 'text',
      content:
        'Let us examine three cases with concrete examples. Pay attention to how the discriminant value correlates with the number of x-intercepts on the parabola.',
    },
    {
      id: 'seed-26',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Case 1 — Two real roots } (\\Delta > 0): \\\\\nx^2 - 5x + 6 &= 0 \\\\\n\\Delta &= (-5)^2 - 4(1)(6) = 25 - 24 = 1 > 0 \\\\\nx &= \\frac{5 \\pm 1}{2} \\implies x = 3 \\text{ or } x = 2 \\\\\n\\\\\n\\text{Case 2 — One double root } (\\Delta = 0): \\\\\nx^2 - 6x + 9 &= 0 \\\\\n\\Delta &= (-6)^2 - 4(1)(9) = 36 - 36 = 0 \\\\\nx &= \\frac{6 \\pm 0}{2} = 3 \\quad (\\text{repeated})\n\\end{aligned}',
    },
    {
      id: 'seed-27',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{Case 3 — No real roots } (\\Delta < 0): \\\\\nx^2 + x + 1 &= 0 \\\\\n\\Delta &= (1)^2 - 4(1)(1) = 1 - 4 = -3 < 0 \\\\\nx &= \\frac{-1 \\pm \\sqrt{-3}}{2} = \\frac{-1 \\pm i\\sqrt{3}}{2} \\\\\n\\text{The roots are complex: } &-\\frac{1}{2} \\pm \\frac{\\sqrt{3}}{2}i\n\\end{aligned}',
    },
    {
      id: 'seed-28',
      type: 'image',
      content:
        'Three parabolas comparing discriminant cases: two roots, one double root, and no real roots',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Quadratic_roots.svg/640px-Quadratic_roots.svg.png',
    },

    // ========== SECTION 6: WORKED EXAMPLE ==========
    {
      id: 'seed-29',
      type: 'heading',
      content: '6. Full Worked Example — Choosing the Best Method',
    },
    {
      id: 'seed-30',
      type: 'text',
      content:
        'Consider the equation 3x^2 - 12x + 9 = 0. We can solve this by factoring (since coefficients are small), by completing the square, or by the quadratic formula. Let us try all three to verify they yield the same result. Then we will check our answer graphically.',
    },
    {
      id: 'seed-31',
      type: 'math',
      content:
        '\\begin{aligned}\n&\\text{Method A — Factoring:} \\\\\n3x^2 - 12x + 9 &= 0 \\\\\n3(x^2 - 4x + 3) &= 0 \\\\\n3(x - 1)(x - 3) &= 0 \\\\\nx - 1 = 0 \\quad &\\text{or} \\quad x - 3 = 0 \\\\\nx = 1 \\quad &\\text{or} \\quad x = 3 \\\\\n\\\\\n&\\text{Method B — Quadratic Formula:} \\\\\na = 3,\\; b = -12,\\; c &= 9 \\\\\nx &= \\frac{-(-12) \\pm \\sqrt{(-12)^2 - 4(3)(9)}}{2(3)} \\\\\nx &= \\frac{12 \\pm \\sqrt{144 - 108}}{6} \\\\\nx &= \\frac{12 \\pm \\sqrt{36}}{6} = \\frac{12 \\pm 6}{6} \\\\\nx = 3 \\quad &\\text{or} \\quad x = 1\n\\end{aligned}',
    },

    // ========== SECTION 7: EXERCISES ==========
    {
      id: 'seed-32',
      type: 'heading',
      content: '7. Practice Exercises',
    },
    {
      id: 'seed-33',
      type: 'text',
      content:
        'Test your understanding by solving the following quadratic equations. For each one, decide whether to factor, complete the square, or use the quadratic formula. Then state the discriminant and the number of real roots.',
    },
    {
      id: 'seed-34',
      type: 'math',
      content:
        '\\begin{aligned}\n\\text{1. } x^2 - 9x + 20 &= 0 \\\\\n\\text{2. } 4x^2 + 4x + 1 &= 0 \\\\\n\\text{3. } 2x^2 - 3x + 5 &= 0 \\\\\n\\text{4. } x^2 + 2x - 15 &= 0 \\\\\n\\text{5. } -x^2 + 6x - 8 &= 0\n\\end{aligned}',
    },
    {
      id: 'seed-35',
      type: 'text',
      content:
        'Answers: (1) x = 4 or x = 5, Δ = 1 — two real roots. (2) x = -0.5 (repeated), Δ = 0 — one double root. (3) No real roots, Δ = -31 — two complex conjugates. (4) x = 3 or x = -5, Δ = 64 — two real roots. (5) x = 2 or x = 4, Δ = 4 — two real roots.',
    },

    // ========== SECTION 8: SUMMARY ==========
    {
      id: 'seed-36',
      type: 'heading',
      content: '8. Key Takeaways',
    },
    {
      id: 'seed-37',
      type: 'text',
      content:
        '1. A quadratic equation ax^2 + bx + c = 0 can be solved by factoring (when the trinomial factorises nicely), completing the square (always works, reveals the vertex), or the quadratic formula (the universal method).\n\n2. The quadratic formula x = [-b ± √(b^2 - 4ac)] / (2a) is derived by completing the square on the general quadratic.\n\n3. The discriminant Δ = b^2 - 4ac determines the nature of the roots: two real (Δ > 0), one real double root (Δ = 0), or two complex conjugates (Δ < 0).\n\n4. Graphically, the roots correspond to the x-intercepts of the parabola y = ax^2 + bx + c. A positive discriminant means the parabola crosses the x-axis twice; zero means it touches the axis at one point; negative means it never crosses.',
    },
    {
      id: 'seed-38',
      type: 'image',
      content:
        'Summary mind map: the three solution methods branching from the quadratic equation',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Quadratic_equation_on_blackboard.jpg/640px-Quadratic_equation_on_blackboard.jpg',
    },
  ],
};

function LessonPlanner({ onSaveAndPresent }: LessonPlannerProps) {
  console.log('[LessonPlanner] Mount');

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [expandedNarrations, setExpandedNarrations] = useState<Set<string>>(new Set());
  const [imageStatuses, setImageStatuses] = useState<Record<string, 'checking' | 'valid' | 'invalid' | null>>({});
  const [mathPreviews, setMathPreviews] = useState<Record<string, string>>({});

  const mathTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const imageTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    console.log('[LessonPlanner] Initializing from localStorage or seed');
    try {
      const raw = localStorage.getItem('saved_lesson');
      if (raw) {
        const parsed: Lesson = JSON.parse(raw);
        console.log('[LessonPlanner] Loaded saved lesson:', parsed.title, 'with', parsed.blocks.length, 'blocks');
        setTitle(parsed.title);
        setBlocks(parsed.blocks);
      } else {
        console.log('[LessonPlanner] No saved lesson, loading seed lesson');
        setTitle(SEED_LESSON.title);
        setBlocks(SEED_LESSON.blocks);
      }
    } catch (err) {
      console.error('[LessonPlanner] Failed to load lesson, using seed:', err);
      setTitle(SEED_LESSON.title);
      setBlocks(SEED_LESSON.blocks);
    }
  }, []);

  // -- Math preview debounce --
  useEffect(() => {
    blocks.forEach(block => {
      if (block.type === 'math' && block.content) {
        if (mathTimers.current[block.id]) {
          clearTimeout(mathTimers.current[block.id]);
        }
        mathTimers.current[block.id] = setTimeout(() => {
          try {
            const html = katex.renderToString(block.content, {
              throwOnError: false,
              displayMode: false,
            });
            setMathPreviews(prev => ({ ...prev, [block.id]: html }));
          } catch {
            setMathPreviews(prev => ({ ...prev, [block.id]: '<span class="text-red-500">Invalid LaTeX</span>' }));
          }
        }, 300);
      }
    });

    return () => {
      Object.values(mathTimers.current).forEach(clearTimeout);
    };
  }, [blocks]);

  // -- Image URL validation debounce --
  useEffect(() => {
    blocks.forEach(block => {
      if (block.type === 'image' && block.imageUrl) {
        if (imageTimers.current[block.id]) {
          clearTimeout(imageTimers.current[block.id]);
        }
        imageTimers.current[block.id] = setTimeout(async () => {
          setImageStatuses(prev => ({ ...prev, [block.id]: 'checking' }));
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(block.imageUrl!, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            const status: 'valid' | 'invalid' = res.ok ? 'valid' : 'invalid';
            setImageStatuses(prev => ({ ...prev, [block.id]: status }));
            console.log('[LessonPlanner] Image URL check:', block.imageUrl, '->', status);
          } catch {
            setImageStatuses(prev => ({ ...prev, [block.id]: 'invalid' }));
            console.log('[LessonPlanner] Image URL check:', block.imageUrl, '-> error');
          }
        }, 500);
      }
    });

    return () => {
      Object.values(imageTimers.current).forEach(clearTimeout);
    };
  }, [blocks]);

  // -- Block CRUD callbacks --
  const addBlock = useCallback((type: BlockType) => {
    console.log('[LessonPlanner] Adding block:', type);
    setBlocks(prev => {
      const next = [...prev, { id: generateId(), type, content: '' }];
      console.log('[LessonPlanner] Blocks updated:', next.length);
      return next;
    });
  }, []);

  const updateBlockContent = useCallback((id: string, content: string) => {
    console.log('[LessonPlanner] Updating block content:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const updateBlockImageUrl = useCallback((id: string, imageUrl: string) => {
    console.log('[LessonPlanner] Updating block imageUrl:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, imageUrl } : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    console.log('[LessonPlanner] Delete block requested:', id);
    if (window.confirm('Delete this block?')) {
      console.log('[LessonPlanner] Deleted block:', id);
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    console.log('[LessonPlanner] Moved block:', id, 'direction:', direction);
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newId = generateId();
      const copy: LessonBlock = { ...prev[idx], id: newId };
      console.log('[LessonPlanner] Duplicated block:', id, '->', newId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  // -- Narration callbacks --
  const toggleNarration = useCallback((id: string) => {
    setExpandedNarrations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const updateNarration = useCallback((id: string, narration: string) => {
    console.log('[LessonPlanner] Updated narration for block:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, narration } : b));
  }, []);

  const addNarrationStep = useCallback((id: string) => {
    console.log('[LessonPlanner] Added narration step for block:', id);
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const steps = b.narrationSteps ? [...b.narrationSteps, ''] : [''];
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  const updateNarrationStep = useCallback((id: string, index: number, text: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id || !b.narrationSteps) return b;
        const steps = [...b.narrationSteps];
        steps[index] = text;
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  const removeNarrationStep = useCallback((id: string, index: number) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id || !b.narrationSteps) return b;
        const steps = b.narrationSteps.filter((_, i) => i !== index);
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  // -- Save --
  const handleSave = useCallback(() => {
    console.log('[LessonPlanner] Save triggered');
    const lesson: Lesson = {
      id: generateId(),
      title,
      blocks,
    };

    try {
      const json = JSON.stringify(lesson);
      try {
        localStorage.setItem('saved_lesson', json);
        console.log('[LessonPlanner] Lesson saved to localStorage');
      } catch (storageErr) {
        console.error('[LessonPlanner] localStorage.setItem failed:', storageErr);
      }
    } catch (stringifyErr) {
      console.error('[LessonPlanner] JSON.stringify failed:', stringifyErr);
    }

    onSaveAndPresent(lesson);
  }, [title, blocks, onSaveAndPresent]);

  // -- Render --
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Lesson Planner</h1>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Lesson Title</span>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter lesson title"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Add Block</span>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(blockTypeLabels) as BlockType[]).map(type => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
            >
              + {blockTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="space-y-4">
          <span className="text-sm font-medium">Blocks ({blocks.length})</span>
          {blocks.map((block, idx) => (
            <div key={block.id} className="border rounded p-4 space-y-2">
              {/* Block header with type label and action buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">
                  [{blockTypeLabels[block.type]}]
                </span>

                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  disabled={idx === 0}
                  aria-label="Move block up"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  disabled={idx === blocks.length - 1}
                  aria-label="Move block down"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▼
                </button>
                <button
                  onClick={() => duplicateBlock(block.id)}
                  aria-label="Duplicate block"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  ⧉
                </button>
                <button
                  onClick={() => deleteBlock(block.id)}
                  aria-label="Delete block"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-red-200 text-red-600 ml-auto"
                >
                  ✕
                </button>
              </div>

              {/* Content input */}
              <input
                type="text"
                value={block.content}
                onChange={e => updateBlockContent(block.id, e.target.value)}
                placeholder={`Enter ${blockTypeLabels[block.type].toLowerCase()} content`}
                className="w-full border rounded px-3 py-2 text-sm"
              />

              {/* Image URL input + validation status */}
              {block.type === 'image' && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={block.imageUrl ?? ''}
                    onChange={e => updateBlockImageUrl(block.id, e.target.value)}
                    placeholder="Image URL"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  {imageStatuses[block.id] && (
                    <span className="text-xs inline-flex items-center gap-1">
                      {imageStatuses[block.id] === 'checking' && <span className="text-gray-400">⏳ Checking URL…</span>}
                      {imageStatuses[block.id] === 'valid' && <span className="text-green-600">✓ URL reachable</span>}
                      {imageStatuses[block.id] === 'invalid' && <span className="text-red-600">✗ URL unreachable</span>}
                    </span>
                  )}
                </div>
              )}

              {/* Math LaTeX preview */}
              {block.type === 'math' && block.content && mathPreviews[block.id] && (
                <div
                  className="bg-gray-100 rounded p-3 text-sm overflow-x-auto"
                  data-testid={`math-preview-${block.id}`}
                  dangerouslySetInnerHTML={{ __html: mathPreviews[block.id] }}
                />
              )}

              {/* Narration section toggle */}
              <button
                onClick={() => toggleNarration(block.id)}
                aria-label="Toggle narration"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {expandedNarrations.has(block.id) ? '▼ Narration' : '▶ Narration'}
              </button>

              {/* Narration editing (expanded) */}
              {expandedNarrations.has(block.id) && (
                <div className="space-y-2 pl-2 border-l-2 border-blue-200">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-gray-600">Spoken narration</span>
                    <textarea
                      value={block.narration ?? ''}
                      onChange={e => updateNarration(block.id, e.target.value)}
                      placeholder="Spoken narration for this block…"
                      className="w-full border rounded px-3 py-2 text-sm resize-y min-h-[60px]"
                      rows={2}
                    />
                  </label>

                  {block.type === 'math' && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-600">Per-reveal narration steps</span>
                      {(block.narrationSteps ?? []).map((step, stepIdx) => (
                        <div key={stepIdx} className="flex gap-1 items-start">
                          <textarea
                            value={step}
                            onChange={e => updateNarrationStep(block.id, stepIdx, e.target.value)}
                            placeholder={`Step ${stepIdx + 1} narration…`}
                            className="flex-1 border rounded px-3 py-2 text-sm resize-y min-h-[40px]"
                            rows={1}
                          />
                          <button
                            onClick={() => removeNarrationStep(block.id, stepIdx)}
                            aria-label={`Remove narration step ${stepIdx + 1}`}
                            className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addNarrationStep(block.id)}
                        aria-label="Add narration step"
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        + Add Step
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
      >
        Save and Present
      </button>
    </div>
  );
}

export default LessonPlanner;
