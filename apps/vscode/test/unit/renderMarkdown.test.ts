/** @vitest-environment jsdom */
import { beforeAll, describe, expect, it } from "vitest";

import { parseFileReference } from "../../src/webview/features/conversation/markdown/fileReferences.js";
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

  it("marks Markdown file links with their source location", () => {
    const html = renderMarkdownHtml("[source](src/file.ts:42:5)");
    const root = document.createElement("div");
    root.innerHTML = html;
    const link = root.querySelector("a");

    expect(link?.getAttribute("href")).toBe("#");
    expect(link?.getAttribute("data-file-path")).toBe("src/file.ts");
    expect(link?.getAttribute("data-file-line")).toBe("42");
    expect(link?.getAttribute("data-file-column")).toBe("5");
  });

  it("leaves plain file references as text", () => {
    const html = renderMarkdownHtml("See AGENTS.md and src/file.ts:42.");
    const root = document.createElement("div");
    root.innerHTML = html;

    expect(root.textContent?.trim()).toBe("See AGENTS.md and src/file.ts:42.");
    expect(root.querySelector("a")).toBeNull();
  });

  it("marks colon and GitHub-style line ranges", () => {
    const html = renderMarkdownHtml("`src/file.ts:5-10` [source](src/file.ts#L12-L14)");
    const root = document.createElement("div");
    root.innerHTML = html;
    const links = root.querySelectorAll("a.file-link");

    expect(links[0]?.getAttribute("data-file-line")).toBe("5");
    expect(links[0]?.getAttribute("data-file-end-line")).toBe("10");
    expect(links[1]?.getAttribute("data-file-line")).toBe("12");
    expect(links[1]?.getAttribute("data-file-end-line")).toBe("14");
  });

  it("makes an exact inline-code file reference clickable without changing other code", () => {
    const html = renderMarkdownHtml("`src/file.ts:42` and `const value = 42`");
    const root = document.createElement("div");
    root.innerHTML = html;

    expect(root.querySelector("a.file-link")?.textContent).toBe("src/file.ts:42");
    expect(root.querySelector("a.file-link")?.getAttribute("data-file-line")).toBe("42");
    expect([...root.querySelectorAll("code")].map((code) => code.textContent)).toEqual([
      "src/file.ts:42",
      "const value = 42",
    ]);
    expect(root.querySelectorAll("a.file-link")).toHaveLength(1);
  });

  it("keeps HTTP links external rather than classifying them as files", () => {
    const html = renderMarkdownHtml("[docs](https://example.com/file.ts:42)");
    const root = document.createElement("div");
    root.innerHTML = html;
    const link = root.querySelector("a");

    expect(link?.getAttribute("href")).toBe("https://example.com/file.ts:42");
    expect(link?.hasAttribute("data-file-path")).toBe(false);
  });
});

describe("parseFileReference", () => {
  it.each([
    ["src/file.ts", { path: "src/file.ts" }],
    ["src/file.ts:42", { path: "src/file.ts", line: 42 }],
    ["src/file.ts:42:5", { path: "src/file.ts", line: 42, column: 5 }],
    ["src/file.ts:5-10", { path: "src/file.ts", line: 5, endLine: 10 }],
    ["src/file.ts#L12", { path: "src/file.ts", line: 12 }],
    ["src/file.ts#L12-L14", { path: "src/file.ts", line: 12, endLine: 14 }],
    ["/etc/hosts", { path: "/etc/hosts" }],
    ["C:\\work\\file.ts:7:2", { path: "C:\\work\\file.ts", line: 7, column: 2 }],
    ["README.md", { path: "README.md" }],
  ])("parses %s", (source, expected) => {
    expect(parseFileReference(source)).toEqual(expected);
  });

  it.each([
    "plain text",
    "const value = 42",
    "a / b",
    "package/name",
    "1.2.3",
    "https://example.com/file.ts",
    "file.ts:0",
    "file.ts:10-5",
    "file.ts#L10-L5",
  ])(
    "does not classify %s as a file reference",
    (source) => {
      expect(parseFileReference(source)).toBeNull();
    },
  );
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
