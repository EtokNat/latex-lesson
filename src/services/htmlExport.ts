import katex from "katex";
import type { Lesson } from "../data/types";
import {
  parseEquation,
  renderNodeFull,
  smartSplitLines,
} from "../components/ProgressiveAlignedEquation";

const KATEX_CSS_CDN =
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";

export function generateStaticHTML(lesson: Lesson): string {
  console.log("[HTMLExport] Generating static HTML for lesson:", lesson.title);

  const blocksHTML = lesson.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h1>${escapeHTML(block.content)}</h1>`;

        case "text":
          return `<p>${escapeHTML(block.content)}</p>`;

        case "image": {
          const imgTag = block.imageUrl
            ? `<img src="${escapeAttr(block.imageUrl)}" alt="${escapeAttr(block.content)}">`
            : "";
          const caption = block.content
            ? `<p class="caption">${escapeHTML(block.content)}</p>`
            : "";
          return `<div class="image-block">${imgTag}${caption}</div>`;
        }

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
            console.error("[HTMLExport] KaTeX render error:", err);
            renderedMath = `<pre>${escapeHTML(block.content)}</pre>`;
          }
          return `<div class="math-block">${renderedMath}</div>`;
        }

        default:
          return "";
      }
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(lesson.title)}</title>
<link rel="stylesheet" href="${KATEX_CSS_CDN}">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.75in 0.5in;
    background: #fff;
  }
  h1 {
    font-size: 20pt;
    font-weight: bold;
    margin-top: 0.4in;
    margin-bottom: 0.15in;
    page-break-before: always;
  }
  h1:first-child { page-break-before: avoid; }
  p {
    margin-bottom: 0.15in;
    text-align: justify;
  }
  .math-block {
    margin: 0.2in 0;
    padding: 0.1in;
    border-left: 3px solid #4a90d9;
    overflow-x: auto;
  }
  .image-block {
    margin: 0.2in 0;
    text-align: center;
  }
  .image-block img {
    max-width: 80%;
    max-height: 4in;
  }
  .caption {
    text-align: center;
    font-style: italic;
    font-size: 10pt;
    margin-top: 0.05in;
    color: #555;
  }
  pre {
    white-space: pre-wrap;
    font-family: monospace;
    background: #f5f5f5;
    padding: 0.5em;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 0.75in; size: letter; }
  }
</style>
</head>
<body>
<h1>${escapeHTML(lesson.title)}</h1>
${blocksHTML}
</body>
</html>`;

  console.log("[HTMLExport] Generated HTML, length:", html.length);
  return html;
}

export function downloadHTML(lesson: Lesson, filename?: string): void {
  console.log("[HTMLExport] downloadHTML called for:", lesson.title);

  try {
    const html = generateStaticHTML(lesson);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${sanitizeFilename(lesson.title)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("[HTMLExport] Download triggered:", a.download);
  } catch (err) {
    console.error("[HTMLExport] Download failed:", err);
  }
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .slice(0, 100);
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
