/** @vitest-environment jsdom */
import { beforeAll, describe, expect, it } from "vitest";

import {
  ensureKatex,
  renderMarkdownHtml,
  sanitizeMermaidSvg,
} from "../../src/webview/features/conversation/markdown/renderMarkdown.js";

describe("renderMarkdownHtml", () => {
  beforeAll(async () => {
    await ensureKatex();
  });

  it("renders dollar and slash math delimiters", () => {
    const inline = renderMarkdownHtml("area $a^2$ and \\(b^2\\)");
    expect(inline).toContain("katex");
    expect(inline).not.toContain("$a^2$");

    const block = renderMarkdownHtml("$$\\frac{1}{2}$$\n\n\\[x+y\\]");
    expect(block).toContain("math-block");
    expect(block).toContain("katex");
  });

  it("still highlights fenced code and ignores raw html", () => {
    const html = renderMarkdownHtml("```js\nconst x = 1\n```\n\n<script>alert(1)</script>");
    expect(html).toContain("hljs");
    expect(html).not.toContain("<script>");
  });

  it("does not treat currency-like dollars as math", () => {
    const html = renderMarkdownHtml("price $20.00 today");
    expect(html).toContain("$20.00");
    expect(html).not.toContain("katex");
  });
});

describe("sanitizeMermaidSvg", () => {
  it("keeps a simple svg root", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`;
    const cleaned = sanitizeMermaidSvg(svg);
    expect(cleaned).toContain("<svg");
    expect(cleaned).toContain("circle");
  });

  it("fails closed on non-svg payload", () => {
    expect(sanitizeMermaidSvg("<div onclick=\"alert(1)\">x</div>")).toBeNull();
    expect(sanitizeMermaidSvg("")).toBeNull();
  });
});
