import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PresentationStage from "./PresentationStage";
import { Lesson } from "../data/types";

vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn(
      () => '<span class="katex-mock">rendered math</span>',
    ),
  },
}));

vi.mock("./SpeakerNotes", () => ({
  default: vi.fn(({ block }: { block: { id: string; content: string } }) => (
    <div data-testid="speaker-notes-mock">
      Speaker Notes: {block.id}
    </div>
  )),
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
    vi.useRealTimers();
    // Mock Date.now for timer tests
    vi.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------ Existing Tests ------

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
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowRight" });
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
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      }
      expect(screen.getByAltText("Test Image")).toBeTruthy();
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
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByText(/Block 2\/2/)).toBeTruthy();
      expect(screen.getByText(/Reveal 1/)).toBeTruthy();
    });

    it("goes to previous block when Backspace pressed at revealCount 0", () => {
      render(<PresentationStage lesson={mathHeavyLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("rendered math")).toBeTruthy();
      fireEvent.keyDown(window, { key: "Backspace" });
      expect(screen.getByText("Math Lesson")).toBeTruthy();
      expect(screen.getByText(/Block 1\/2/)).toBeTruthy();
    });

    it("decrements revealCount on Backspace when revealCount > 0", () => {
      render(<PresentationStage lesson={mathHeavyLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByText(/Reveal 1/)).toBeTruthy();
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

  // ------ Sprint 13: On-Screen Navigation Controls ------

  describe("On-Screen Navigation Buttons", () => {
    it("renders previous and next block buttons", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.getByTitle("Previous block")).toBeTruthy();
      expect(screen.getByTitle("Next block")).toBeTruthy();
    });

    it("previous button is disabled on first block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const prevBtn = screen.getByTitle("Previous block");
      expect(prevBtn).toBeTruthy();
      expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it("next button is disabled on last block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const nextBtn = screen.getByTitle("Next block");
      // Navigate to last block
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      }
      expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it("next button advances to next block on click", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const nextBtn = screen.getByTitle("Next block");
      fireEvent.click(nextBtn);
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
    });

    it("previous button goes to previous block on click", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      const prevBtn = screen.getByTitle("Previous block");
      expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(prevBtn);
      expect(screen.getByText("Welcome")).toBeTruthy();
    });

    it("reset button goes to first block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      for (let i = 0; i < 2; i++) {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      }
      expect(screen.getByText(/Block 3/)).toBeTruthy();
      const resetBtn = screen.getByTitle("Reset (go to first block)");
      fireEvent.click(resetBtn);
      expect(screen.getByText("Welcome")).toBeTruthy();
      expect(screen.getByText(/Block 1\/4/)).toBeTruthy();
    });
  });

  describe("Block Indicator Dots", () => {
    it("renders a dot for each block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const indicators = screen.getAllByTitle(/^Block \d+: (heading|text|math|image)$/);
      expect(indicators).toHaveLength(4);
    });

    it("clicking a dot navigates to that block", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const indicator3 = screen.getByTitle("Block 3: math");
      fireEvent.click(indicator3);
      expect(screen.getByText("rendered math")).toBeTruthy();
    });
  });

  // ------ Sprint 13: Speaker Notes Panel ------

  describe("Speaker Notes", () => {
    it("does not show speaker notes panel by default", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.queryByTestId("speaker-notes-mock")).toBeNull();
    });

    it("toggles speaker notes on N key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "n" });
      expect(screen.getByTestId("speaker-notes-mock")).toBeTruthy();
    });

    it("toggles speaker notes off on second N key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "n" });
      expect(screen.getByTestId("speaker-notes-mock")).toBeTruthy();
      fireEvent.keyDown(window, { key: "n" });
      expect(screen.queryByTestId("speaker-notes-mock")).toBeNull();
    });

    it("toggles speaker notes on uppercase N", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "N" });
      expect(screen.getByTestId("speaker-notes-mock")).toBeTruthy();
    });

    it("toggles speaker notes via nav bar button", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const notesBtn = screen.getByTitle("Toggle speaker notes (N)");
      fireEvent.click(notesBtn);
      expect(screen.getByTestId("speaker-notes-mock")).toBeTruthy();
    });
  });

  // ------ Sprint 13: Presentation Timer ------

  describe("Presentation Timer", () => {
    it("does not show timer by default", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.queryByText(/^\d+:\d\d$/)).toBeNull();
    });

    it("shows timer on T key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "t" });
      expect(screen.getByText("0:00")).toBeTruthy();
    });

    it("hides timer on second T key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "t" });
      expect(screen.getByText("0:00")).toBeTruthy();
      fireEvent.keyDown(window, { key: "t" });
      expect(screen.queryByText("0:00")).toBeNull();
    });

    it("shows PAUSED indicator when P is pressed during timer", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "t" });
      fireEvent.keyDown(window, { key: "p" });
      expect(screen.getByText("PAUSED")).toBeTruthy();
    });

    it("resumes timer on second P press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "t" });
      fireEvent.keyDown(window, { key: "p" });
      expect(screen.getByText("PAUSED")).toBeTruthy();
      fireEvent.keyDown(window, { key: "p" });
      expect(screen.queryByText("PAUSED")).toBeNull();
    });

    it("P key does nothing when timer is hidden", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "p" });
      expect(screen.queryByText("PAUSED")).toBeNull();
    });

    it("toggles timer via nav bar button", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const timerBtn = screen.getByTitle("Toggle timer (T)");
      fireEvent.click(timerBtn);
      expect(screen.getByText("0:00")).toBeTruthy();
    });

    it("timer advances over time", async () => {
      vi.useFakeTimers();
      let now = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => now);

      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "t" });

      // Advance time by 2 seconds
      now = 1002000;
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // After some time, the timer should have advanced
      const timerEl = screen.getByText(/^\d+:\d\d$/);
      expect(timerEl).toBeTruthy();
    });
  });

  // ------ Sprint 13: Auto-Advance Mode ------

  describe("Auto-Advance Mode", () => {
    it("does not show auto-advance indicator by default", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      expect(screen.queryByText("Auto-Advance: ON")).toBeNull();
    });

    it("shows auto-advance indicator on A key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "a" });
      expect(screen.getByText("Auto-Advance: ON")).toBeTruthy();
    });

    it("hides auto-advance indicator on second A key press", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "a" });
      expect(screen.getByText("Auto-Advance: ON")).toBeTruthy();
      fireEvent.keyDown(window, { key: "a" });
      expect(screen.queryByText("Auto-Advance: ON")).toBeNull();
    });

    it("toggles auto-advance via nav bar button", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const autoBtn = screen.getByTitle("Toggle auto-advance (A)");
      fireEvent.click(autoBtn);
      expect(screen.getByText("Auto-Advance: ON")).toBeTruthy();
    });

    it("Space during auto-advance triggers manual override", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "a" });
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByText(/paused 3s/)).toBeTruthy();
    });

    it("manual override clears after timeout", async () => {
      vi.useFakeTimers();
      let now = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => now);

      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "a" });
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByText(/paused 3s/)).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(3100);
      });

      expect(screen.queryByText(/paused 3s/)).toBeNull();
    });

    it("auto-advance advances to next block after delay", async () => {
      vi.useFakeTimers();
      let now = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => now);

      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      fireEvent.keyDown(window, { key: "a" });

      // The heading block has 1 word ("Welcome"), so delay = max(2000, 1*280) = 2000ms
      act(() => {
        vi.advanceTimersByTime(2100);
      });

      // Should have auto-advanced to the text block
      expect(screen.getByText("This is a test lesson")).toBeTruthy();
    });
  });

  // ------ Nav Bar Buttons ------

  describe("Nav Bar Toggle Buttons", () => {
    it("N button toggles speaker notes", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const notesBtn = screen.getByTitle("Toggle speaker notes (N)");
      fireEvent.click(notesBtn);
      expect(screen.getByTestId("speaker-notes-mock")).toBeTruthy();
      fireEvent.click(notesBtn);
      expect(screen.queryByTestId("speaker-notes-mock")).toBeNull();
    });

    it("T button toggles timer", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const timerBtn = screen.getByTitle("Toggle timer (T)");
      fireEvent.click(timerBtn);
      expect(screen.getByText("0:00")).toBeTruthy();
      fireEvent.click(timerBtn);
      expect(screen.queryByText("0:00")).toBeNull();
    });

    it("A button toggles auto-advance", () => {
      render(<PresentationStage lesson={mockLesson} onExit={vi.fn()} />);
      const autoBtn = screen.getByTitle("Toggle auto-advance (A)");
      fireEvent.click(autoBtn);
      expect(screen.getByText("Auto-Advance: ON")).toBeTruthy();
      fireEvent.click(autoBtn);
      expect(screen.queryByText("Auto-Advance: ON")).toBeNull();
    });
  });
});
