import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SpeakerNotes from "./SpeakerNotes";
import type { LessonBlock } from "../data/types";

const headingBlock: LessonBlock = {
  id: "b1",
  type: "heading",
  content: "Introduction to Quadratic Equations",
};

const textBlockWithNarration: LessonBlock = {
  id: "b2",
  type: "text",
  content: "A quadratic equation is an equation of the form ax² + bx + c = 0.",
  narration: "Let's talk about what a quadratic equation really means. Think of it as a puzzle where we need to find the missing values.",
};

const mathBlockWithSteps: LessonBlock = {
  id: "b3",
  type: "math",
  content: "\\begin{aligned}x^2 + 6x + 5 &= 0\\\\(x+1)(x+5) &= 0\\end{aligned}",
  narration: "Watch carefully as we solve this step by step.",
  narrationSteps: [
    "First, we set up the equation x squared plus six x plus five equals zero.",
    "Notice we can factor this as x plus one times x plus five.",
    "This gives us our two solutions: x equals negative one and x equals negative five.",
  ],
};

const blockNoNarration: LessonBlock = {
  id: "b4",
  type: "text",
  content: "Some plain text without narration.",
};

describe("SpeakerNotes", () => {
  it("renders block position in header", () => {
    render(
      <SpeakerNotes block={headingBlock} blockIndex={0} totalBlocks={5} />,
    );
    expect(screen.getByText(/Block 1\/5/)).toBeTruthy();
  });

  it("shows truncated block content preview", () => {
    render(
      <SpeakerNotes block={headingBlock} blockIndex={0} totalBlocks={5} />,
    );
    expect(
      screen.getByText("Introduction to Quadratic Equations"),
    ).toBeTruthy();
  });

  it("shows narration text when block has narration", () => {
    render(
      <SpeakerNotes
        block={textBlockWithNarration}
        blockIndex={1}
        totalBlocks={5}
      />,
    );
    expect(screen.getByText("Narration")).toBeTruthy();
    expect(
      screen.getByText(
        "Let's talk about what a quadratic equation really means. Think of it as a puzzle where we need to find the missing values.",
      ),
    ).toBeTruthy();
  });

  it("shows narration steps for math blocks", () => {
    render(
      <SpeakerNotes
        block={mathBlockWithSteps}
        blockIndex={2}
        totalBlocks={5}
      />,
    );
    expect(screen.getByText("Narration Steps")).toBeTruthy();
    expect(
      screen.getByText(
        "First, we set up the equation x squared plus six x plus five equals zero.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Notice we can factor this as x plus one times x plus five.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "This gives us our two solutions: x equals negative one and x equals negative five.",
      ),
    ).toBeTruthy();
  });

  it("shows empty state when no narration data", () => {
    render(
      <SpeakerNotes block={blockNoNarration} blockIndex={3} totalBlocks={5} />,
    );
    expect(
      screen.getByText(/No narration data for this block/),
    ).toBeTruthy();
  });

  it("does not show narration steps for non-math blocks", () => {
    render(
      <SpeakerNotes
        block={textBlockWithNarration}
        blockIndex={1}
        totalBlocks={5}
      />,
    );
    expect(screen.queryByText("Narration Steps")).toBeNull();
  });

  it("shows teaching tips section", () => {
    render(
      <SpeakerNotes block={headingBlock} blockIndex={0} totalBlocks={5} />,
    );
    expect(screen.getByText("Teaching Tips")).toBeTruthy();
    expect(
      screen.getByText(/Pause after key terms/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Make eye contact/),
    ).toBeTruthy();
  });

  it("renders heading narration section when present", () => {
    const headingWithNarration: LessonBlock = {
      id: "b5",
      type: "heading",
      content: "What Is a Quadratic Equation?",
      narration: "Welcome to this lesson on quadratic equations.",
    };
    render(
      <SpeakerNotes
        block={headingWithNarration}
        blockIndex={0}
        totalBlocks={3}
      />,
    );
    expect(screen.getByText("Narration")).toBeTruthy();
    expect(
      screen.getByText("Welcome to this lesson on quadratic equations."),
    ).toBeTruthy();
  });

  it("displays correct block counter for last block", () => {
    render(
      <SpeakerNotes block={headingBlock} blockIndex={4} totalBlocks={5} />,
    );
    expect(screen.getByText(/Block 5\/5/)).toBeTruthy();
  });
});
