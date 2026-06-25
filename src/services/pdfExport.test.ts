import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderLessonToHTML, printLesson } from "./pdfExport";
import type { Lesson } from "../data/types";

vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn(
      (input: string) =>
        `<span class="katex-mock">${input.slice(0, 20)}...</span>`,
    ),
  },
}));

const lesson: Lesson = {
  id: "test-1",
  title: "Introduction to Quadratics",
  blocks: [
    { id: "b1", type: "heading", content: "What Is a Quadratic?" },
    {
      id: "b2",
      type: "text",
      content: "A quadratic equation has the form ax² + bx + c = 0.",
    },
    {
      id: "b3",
      type: "math",
      content: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    },
    {
      id: "b4",
      type: "image",
      content: "A parabola showing the vertex and roots",
      imageUrl: "https://example.com/parabola.png",
    },
  ],
};

const emptyLesson: Lesson = {
  id: "empty",
  title: "Empty Lesson",
  blocks: [],
};

describe("pdfExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("renderLessonToHTML", () => {
    it("returns HTML containing lesson title", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("Introduction to Quadratics");
    });

    it("contains CSS class print-lesson", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("print-lesson");
    });

    it("renders heading block content", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("What Is a Quadratic?");
    });

    it("renders text block content", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("ax² + bx + c = 0");
    });

    it("renders math block with katex mock output", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("katex-mock");
      expect(html).toContain("print-block-math");
    });

    it("renders image block with src attribute", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("https://example.com/parabola.png");
      expect(html).toContain("print-block-image");
    });

    it("renders image caption text", () => {
      const html = renderLessonToHTML(lesson);
      expect(html).toContain("A parabola showing the vertex and roots");
    });

    it("handles empty lesson gracefully", () => {
      const html = renderLessonToHTML(emptyLesson);
      expect(html).toContain("print-lesson");
      expect(html).toContain("Empty Lesson");
    });

    it("escapes HTML in text content", () => {
      const xssLesson: Lesson = {
        id: "xss",
        title: 'Test <script>alert("xss")</script>',
        blocks: [
          {
            id: "b1",
            type: "text",
            content: '<img src=x onerror="alert(1)">',
          },
        ],
      };
      const html = renderLessonToHTML(xssLesson);
      expect(html).not.toContain("<script>alert");
      expect(html).not.toContain('onerror="alert');
      expect(html).toContain("&lt;script&gt;");
    });

    it("handles malformed math as pre block", () => {
      const badMath: Lesson = {
        id: "bad",
        title: "Bad Math",
        blocks: [
          {
            id: "b1",
            type: "math",
            content: "\\invalid{command",
          },
        ],
      };
      const html = renderLessonToHTML(badMath);
      expect(html).toContain("print-block-math");
      expect(html.length).toBeGreaterThan(0);
    });

    it("renders aligned environment math", () => {
      const alignedLesson: Lesson = {
        id: "aligned",
        title: "Aligned",
        blocks: [
          {
            id: "b1",
            type: "math",
            content:
              "\\begin{aligned}x + y &= 5\\\\2x - y &= 1\\end{aligned}",
          },
        ],
      };
      const html = renderLessonToHTML(alignedLesson);
      expect(html).toContain("katex-mock");
    });
  });

  describe("printLesson", () => {
    it("creates print container in DOM", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      printLesson(lesson);
      const container = document.getElementById("print-container");
      expect(container).toBeTruthy();
      expect(container!.innerHTML).toContain("Introduction to Quadratics");
      printSpy.mockRestore();
    });

    it("calls window.print()", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      printLesson(lesson);
      expect(printSpy).toHaveBeenCalledOnce();
      printSpy.mockRestore();
    });

    it("removes existing print container before creating new one", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      const existing = document.createElement("div");
      existing.id = "print-container";
      document.body.appendChild(existing);

      printLesson(lesson);
      const containers = document.querySelectorAll("#print-container");
      expect(containers.length).toBe(1);
      printSpy.mockRestore();
    });
  });
});
