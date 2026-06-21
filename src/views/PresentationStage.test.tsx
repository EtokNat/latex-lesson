import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationStage from "./PresentationStage";
import { Lesson } from "../data/types";

vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn(
      () => '<span class="katex-mock">rendered math</span>',
    ),
  },
}));

const blocks = [
  { id: "b1", type: "heading" as const, content: "Welcome" },
  { id: "b2", type: "text" as const, content: "This is a test lesson" },
  { id: "b3", type: "math" as const, content: "x" },
  {
    id: "b4",
    type: "image" as const,
    content: "Test Image",
    imageUrl: "https://example.com/img.png",
  },
];

const mockLesson: Lesson = {
  id: "1",
  title: "Test Lesson",
  blocks,
};

const mathHeavyLesson: Lesson = {
  id: "2",
  title: "Math Heavy",
  blocks: [
    { id: "b1", type: "heading" as const, content: "Math Lesson" },
    {
      id: "b2",
      type: "math" as const,
      content:
        "\\begin{aligned}x + y &= z\\\\a + b &= c\\end{aligned}",
    },
  ],
};

const emptyLesson: Lesson = {
  id: "empty",
  title: "Empty",
  blocks: [],
};

describe("PresentationStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the first block (heading) on mount", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.getByText("Welcome")).toBeTruthy();
    });

    it("renders text block content after advancing from heading", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
    });

    it("renders image block with correct alt text", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      // heading -> text -> math (reveal 0) -> reveal 1 -> image
      fireEvent.keyDown(window, { key: "ArrowRight" }); // to text
      fireEvent.keyDown(window, { key: "ArrowRight" }); // to math
      fireEvent.keyDown(window, { key: "ArrowRight" }); // reveal math
      fireEvent.keyDown(window, { key: "ArrowRight" }); // to image
      const img = screen.getByAltText("Test Image");
      expect(img).toBeTruthy();
      expect(img.getAttribute("src")).toBe("https://example.com/img.png");
    });

    it("renders math block with ProgressiveAlignedEquation", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("rendered math")).toBeTruthy();
    });

    it("handles empty lesson gracefully", () => {
      render(<PresentationStage lesson={emptyLesson} onExit={vi.fn()} />);
      expect(screen.getByText(/No blocks to present/)).toBeTruthy();
    });
  });

  describe("Keyboard Navigation - Forward", () => {
    it("advances from non-math block to next block on Space", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.getByText("Welcome")).toBeTruthy();
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
    });

    it("advances from non-math block to next block on ArrowRight", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
    });

    it("does not advance past last block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      // Advance to last block (image): heading->text, text->math, math reveal, math->image = 4 presses
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      }
      expect(screen.getByAltText("Test Image")).toBeTruthy();
      // Press again - should stay on last block
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByAltText("Test Image")).toBeTruthy();
    });
  });

  describe("Keyboard Navigation - Backward", () => {
    it("goes to previous block on Backspace from non-math block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(screen.getByText("Welcome")).toBeTruthy();
    });

    it("goes to previous block on ArrowLeft", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      expect(screen.getByText("Welcome")).toBeTruthy();
    });

    it("does not go back past first block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.getByText("Welcome")).toBeTruthy();
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(screen.getByText("Welcome")).toBeTruthy();
    });
  });

  describe("Keyboard Navigation - Escape", () => {
    it("calls onExit when Escape is pressed", () => {
      const onExit = vi.fn();
      render(<PresentationStage lesson={mockLesson} onExit={onExit} />);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onExit).toHaveBeenCalledOnce();
    });
  });

  describe("Progressive Reveal for Math Blocks", () => {
    it("stays on math block after first Space press (reveal increment)", () => {
      render(<PresentationStage lesson={mathHeavyLesson} onExit={vi.fn()} />);
      // Advance to math block
      fireEvent.keyDown(window, { key: "ArrowRight" }); // heading -> math
      // First Space should increment reveal, not advance
      fireEvent.keyDown(window, { key: " " });
      // Should still be on math block (block 2)
      expect(screen.getByText(/Block 2\/2/)).toBeTruthy();
      expect(screen.getByText(/Reveal 1/)).toBeTruthy();
    });

    it("goes to previous block when Backspace pressed at revealCount 0", () => {
      render(<PresentationStage lesson={mathHeavyLesson} onExit={vi.fn()} />);
      // Navigate to math block
      fireEvent.keyDown(window, { key: "ArrowRight" }); // heading -> math
      expect(screen.getByText("rendered math")).toBeTruthy();
      // Backspace at revealCount 0 should go back to heading
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(screen.getByText("Math Lesson")).toBeTruthy();
      expect(screen.getByText(/Block 1\/2/)).toBeTruthy();
    });

    it("decrements revealCount on Backspace when revealCount > 0", () => {
      render(<PresentationStage lesson={mathHeavyLesson} onExit={vi.fn()} />);
      // Advance to math and reveal one step
      fireEvent.keyDown(window, { key: "ArrowRight" }); // heading -> math
      fireEvent.keyDown(window, { key: " " }); // reveal first element
      expect(screen.getByText(/Reveal 1/)).toBeTruthy();
      // Backspace should decrement reveal
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(screen.getByText(/Reveal 0/)).toBeTruthy();
    });
  });

  describe("Block Counter", () => {
    it("displays block position", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.getByText(/Block 1\/4/)).toBeTruthy();
    });

    it("updates block counter after navigation", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText(/Block 2\/4/)).toBeTruthy();
    });
  });

  describe("Exit Button", () => {
    it("renders exit button and calls onExit on click", () => {
      const onExit = vi.fn();
      render(<PresentationStage lesson={mockLesson} onExit={onExit} />);
      const exitBtn = screen.getByText("Exit (Esc)");
      expect(exitBtn).toBeTruthy();
      fireEvent.click(exitBtn);
      expect(onExit).toHaveBeenCalledOnce();
    });
  });
});
