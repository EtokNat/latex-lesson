import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn(
      () => '<span class="katex-mock">rendered math</span>',
    ),
  },
}));

function mockLocalStorage(getItemImpl: (key: string) => string | null) {
  const store: Record<string, string> = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn((key: string) =>
        getItemImpl ? getItemImpl(key) : store[key] ?? null,
      ),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
    },
    writable: true,
  });
}

describe("App", () => {
  describe("Conditional Routing", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockLocalStorage(() => null);
    });

    it("renders LessonPlanner by default", () => {
      render(<App />);
      expect(screen.getByText("Save and Present")).toBeTruthy();
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
    });

    it("transitions to PresentationStage after save", () => {
      render(<App />);
      fireEvent.click(screen.getByText("Save and Present"));
      // Seed lesson has 38 blocks, first is a heading
      expect(screen.getByText("1. What Is a Quadratic Equation?")).toBeTruthy();
    });

    it("returns to LessonPlanner on exit", () => {
      render(<App />);
      fireEvent.click(screen.getByText("Save and Present"));
      // Now in presentation mode showing seed lesson heading
      expect(screen.getByText("1. What Is a Quadratic Equation?")).toBeTruthy();
      // Exit via Escape
      fireEvent.keyDown(window, { key: "Escape" });
      // Back to planner
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
      expect(screen.getByText("Save and Present")).toBeTruthy();
    });

    it("toggles between views correctly on full cycle", () => {
      render(<App />);
      // Planner -> Presentation (seed lesson has content)
      fireEvent.click(screen.getByText("Save and Present"));
      expect(screen.getByText("1. What Is a Quadratic Equation?")).toBeTruthy();
      // Presentation -> Planner
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
      // Planner -> Presentation again
      fireEvent.click(screen.getByText("Save and Present"));
      expect(screen.getByText("1. What Is a Quadratic Equation?")).toBeTruthy();
    });
  });

  describe("localStorage Handling", () => {
    it("survives corrupted localStorage JSON on mount", () => {
      mockLocalStorage(() => "{not valid json[[[");
      expect(() => {
        render(<App />);
      }).not.toThrow();
      // Should still render planner despite corrupted data
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
    });

    it("handles missing localStorage key gracefully", () => {
      mockLocalStorage(() => null);
      expect(() => {
        render(<App />);
      }).not.toThrow();
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
    });

    it("reads valid saved lesson from localStorage on mount", () => {
      const savedLesson = JSON.stringify({
        id: "saved-1",
        title: "My Saved Lesson",
        blocks: [],
      });
      mockLocalStorage(() => savedLesson);
      render(<App />);
      // Should still render planner (user can then present)
      expect(screen.getByText("Lesson Planner")).toBeTruthy();
    });
  });
});
