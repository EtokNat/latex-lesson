import { describe, it, expect } from 'vitest';
import type { BlockType, LessonBlock, Lesson } from './types';

describe('types', () => {
  it('should compile BlockType values', () => {
    const heading: BlockType = "heading";
    const text: BlockType = "text";
    const image: BlockType = "image";
    const math: BlockType = "math";
    expect(heading).toBe("heading");
    expect(text).toBe("text");
    expect(image).toBe("image");
    expect(math).toBe("math");
  });

  it('should allow creating a LessonBlock', () => {
    const block: LessonBlock = {
      id: "b1",
      type: "math",
      content: "x^2 + y^2 = 1",
    };
    expect(block.id).toBe("b1");
    expect(block.type).toBe("math");
    expect(block.content).toBe("x^2 + y^2 = 1");
  });

  it('should allow optional imageUrl', () => {
    const block: LessonBlock = {
      id: "b2",
      type: "image",
      content: "diagram",
      imageUrl: "https://example.com/img.png",
    };
    expect(block.imageUrl).toBe("https://example.com/img.png");
  });

  it('should allow optional narration field on LessonBlock', () => {
    const block: LessonBlock = {
      id: "b3",
      type: "heading",
      content: "Introduction",
      narration: "Welcome to this lesson on quadratic equations.",
    };
    expect(block.narration).toBe("Welcome to this lesson on quadratic equations.");
  });

  it('should allow optional narrationSteps on math LessonBlock', () => {
    const block: LessonBlock = {
      id: "b4",
      type: "math",
      content: "x^2 + bx + c = 0",
      narrationSteps: [
        "Start with the standard form of a quadratic equation.",
        "Notice the coefficient of x is b.",
        "The constant term is c.",
      ],
    };
    expect(block.narrationSteps).toHaveLength(3);
    expect(block.narrationSteps![0]).toBe("Start with the standard form of a quadratic equation.");
  });

  it('should allow narration and narrationSteps together', () => {
    const block: LessonBlock = {
      id: "b5",
      type: "math",
      content: "x = (-b ± √(b²-4ac)) / 2a",
      narration: "Here is the quadratic formula.",
      narrationSteps: [
        "The numerator has negative b plus or minus the square root.",
        "The denominator is two a.",
      ],
    };
    expect(block.narration).toBeDefined();
    expect(block.narrationSteps).toBeDefined();
    expect(block.narrationSteps).toHaveLength(2);
  });

  it('should allow LessonBlock without narration fields (backward compatible)', () => {
    const block: LessonBlock = {
      id: "b6",
      type: "text",
      content: "Some content without narration.",
    };
    expect(block.narration).toBeUndefined();
    expect(block.narrationSteps).toBeUndefined();
  });

  it('should allow creating a Lesson', () => {
    const lesson: Lesson = {
      id: "l1",
      title: "Intro to Algebra",
      blocks: [],
    };
    expect(lesson.title).toBe("Intro to Algebra");
    expect(lesson.blocks).toHaveLength(0);
  });
});
