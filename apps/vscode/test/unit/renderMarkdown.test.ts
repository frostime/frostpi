/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import { renderMarkdownHtml } from "../../src/webview/features/conversation/markdown/renderMarkdown.js";

describe("renderMarkdownHtml", () => {
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
