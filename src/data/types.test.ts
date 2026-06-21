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
