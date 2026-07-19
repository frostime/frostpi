---
title: Conversation Markdown Rendering
description: How message text becomes Markdown, math, and Mermaid in the Webview.
scope:
  - /apps/vscode/src/webview/features/conversation/markdown/**
  - /apps/vscode/src/webview/features/conversation/MarkdownContent.svelte
updated: 2026-07-20
---

# Conversation Markdown Rendering

- Message text enters through `MarkdownContent`. Callers still pass a single `content: string`; block splitting is internal.
- Ordinary Markdown uses `markdown-it` with `html: false`, linkify on, and DOMPurify on the HTML output. Code fences use `highlight.js` common languages.
- Complete ` ```mermaid ` / `~~~mermaid` fences become `MermaidBlock` instances. Incomplete fences remain ordinary Markdown so streaming does not mount a diagram until the fence closes.
- A mounted Mermaid block re-renders only when its source string changes. Mermaid is loaded with a dynamic `import()` on first use (`securityLevel: "strict"`). Render failures show the error and the original source.
- Math delimiters `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` render through KaTeX inside Markdown HTML. Invalid math does not fail the surrounding message. KaTeX results are cached by source.
- Copy actions continue to use the original protocol text blocks, not rendered HTML, SVG, or math markup.
