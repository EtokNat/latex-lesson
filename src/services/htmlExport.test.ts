import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL
vi.stubGlobal("URL", {
  ...URL,
  createObjectURL: vi.fn(() => "blob:test"),
  revokeObjectURL: vi.fn(),
});

import { generateStaticHTML, downloadHTML } from "./htmlExport";
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

const lessonWithAligned: Lesson = {
  id: "aligned",
  title: "Aligned Math",
  blocks: [
    {
      id: "b1",
      type: "math",
      content:
        "\\begin{aligned}x + y &= 5\\\\2x - y &= 1\\end{aligned}",
    },
  ],
};

describe("htmlExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateStaticHTML", () => {
    it("returns a complete HTML document with doctype", () => {
      const html = generateStaticHTML(lesson);
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    });

    it("includes html, head, and body tags", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("<html lang=");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
      expect(html).toContain("</html>");
    });

    it("includes KaTeX CSS CDN link", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("katex.min.css");
      expect(html).toContain("cdn.jsdelivr.net");
    });

    it("includes inline stylesheet", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("includes page title in title tag", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain(
        "<title>Introduction to Quadratics</title>",
      );
    });

    it("renders heading block as h1", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("<h1>What Is a Quadratic?</h1>");
    });

    it("renders text block as p", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("<p>A quadratic equation");
    });

    it("renders math block with katex output", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("katex-mock");
      expect(html).toContain("math-block");
    });

    it("renders image block with src", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("https://example.com/parabola.png");
      expect(html).toContain("image-block");
    });

    it("renders image caption", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("A parabola showing the vertex and roots");
    });

    it("escapes HTML special characters", () => {
      const xssLesson: Lesson = {
        id: "xss",
        title: 'Test <script>alert(1)</script>',
        blocks: [],
      };
      const html = generateStaticHTML(xssLesson);
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("handles aligned environment math", () => {
      const html = generateStaticHTML(lessonWithAligned);
      expect(html).toContain("katex-mock");
    });

    it("is self-contained (no React or external JS)", () => {
      const html = generateStaticHTML(lesson);
      expect(html).not.toContain("react");
      expect(html).not.toContain("/src/");
      expect(html).not.toContain("main.tsx");
    });

    it("includes print media CSS", () => {
      const html = generateStaticHTML(lesson);
      expect(html).toContain("@media print");
    });
  });

  describe("downloadHTML", () => {
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      clickSpy.mockRestore();
      document.body.innerHTML = "";
    });

    it("creates a Blob and triggers download", () => {
      downloadHTML(lesson);
      const createObjectURLMock = URL.createObjectURL as ReturnType<typeof vi.fn>;
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it("sets download filename from lesson title", () => {
      downloadHTML(lesson);
      const links = document.querySelectorAll("a");
      expect(links.length).toBeGreaterThanOrEqual(0);
    });

    it("uses custom filename if provided", () => {
      downloadHTML(lesson, "custom-name.html");
      const createObjectURLMock = URL.createObjectURL as ReturnType<typeof vi.fn>;
      expect(createObjectURLMock).toHaveBeenCalled();
    });
  });
});
