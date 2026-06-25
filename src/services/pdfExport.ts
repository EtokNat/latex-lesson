import katex from "katex";
import type { Lesson } from "../data/types";
import {
  parseEquation,
  renderNodeFull,
  smartSplitLines,
} from "../components/ProgressiveAlignedEquation";

export function renderLessonToHTML(lesson: Lesson): string {
  console.log("[PDFExport] Rendering lesson to HTML:", lesson.title);

  const blocksHTML = lesson.blocks
    .map((block, i) => {
      switch (block.type) {
        case "heading":
          return `<div class="print-block-heading">${escapeHTML(block.content)}</div>`;

        case "text":
          return `<p class="print-block-text">${escapeHTML(block.content)}</p>`;

        case "image":
          const imgTag = block.imageUrl
            ? `<img src="${escapeAttr(block.imageUrl)}" alt="${escapeAttr(block.content)}" />`
            : "";
          const caption = block.content
            ? `<div class="print-block-image-caption">${escapeHTML(block.content)}</div>`
            : "";
          return `<div class="print-block-image">${imgTag}${caption}</div>`;

        case "math": {
          let renderedMath = "";
          try {
            let eq = block.content.trim();
            if (
              eq.startsWith("\\begin{aligned}") &&
              eq.endsWith("\\end{aligned}")
            ) {
              eq = eq
                .slice("\\begin{aligned}".length, -"\\end{aligned}".length)
                .trim();
              const lines = smartSplitLines(eq);
              const fullLines = lines.map((line) => {
                const nodes = parseEquation(line);
                return nodes.map((n) => renderNodeFull(n)).join("");
              });
              renderedMath = katex.renderToString(
                `\\begin{aligned}${fullLines.join("\\\\")}\\end{aligned}`,
                { throwOnError: false, displayMode: true },
              );
            } else {
              const nodes = parseEquation(eq);
              const fullEq = nodes.map((n) => renderNodeFull(n)).join("");
              renderedMath = katex.renderToString(fullEq, {
                throwOnError: false,
                displayMode: true,
              });
            }
          } catch (err) {
            console.error("[PDFExport] KaTeX render error:", err);
            renderedMath = `<pre>${escapeHTML(block.content)}</pre>`;
          }
          return `<div class="print-block-math">${renderedMath}</div>`;
        }

        default:
          return "";
      }
    })
    .join("\n");

  const html = `
<div class="print-lesson">
  <div class="print-header">${escapeHTML(lesson.title)}</div>
  <h1>${escapeHTML(lesson.title)}</h1>
  ${blocksHTML}
</div>`;

  console.log("[PDFExport] HTML generated, length:", html.length);
  return html;
}

export function printLesson(lesson: Lesson): void {
  console.log("[PDFExport] printLesson called for:", lesson.title);

  try {
    const existing = document.getElementById("print-container");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "print-container";
    container.innerHTML = renderLessonToHTML(lesson);
    document.body.appendChild(container);

    const katexCss = document.querySelector('link[href*="katex"]');
    if (!katexCss) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
      link.id = "print-katex-css";
      document.head.appendChild(link);
    }

    console.log("[PDFExport] Print container ready, calling window.print()");
    window.print();

    setTimeout(() => {
      container.remove();
      const tempLink = document.getElementById("print-katex-css");
      if (tempLink) tempLink.remove();
      console.log("[PDFExport] Print container cleaned up");
    }, 1000);
  } catch (err) {
    console.error("[PDFExport] Print failed:", err);
  }
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}
