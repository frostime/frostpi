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
- Ordinary Markdown uses `markdown-it` with `html: false`, scheme-based linkify on, fuzzy domain linkification off, and DOMPurify on the HTML output. Code fences use `highlight.js` common languages.
- Markdown file links and exact inline-code references open through the validated `openFile` bridge command. Supported locations are `path`, `path:line`, `path:line:column`, `path:start-end`, and GitHub-style `path#Lstart-Lend`; line ranges select the complete referenced lines. Plain-text paths are not linked. HTTP(S) links retain `openExternal` behavior; non-file inline code is unchanged.
- Complete ` ```mermaid ` / `~~~mermaid` fences become `MermaidBlock` instances. Incomplete fences remain ordinary Markdown so streaming does not mount a diagram until the fence closes.
- A mounted Mermaid block re-renders only when its source string changes. Mermaid loads once via the packaged IIFE at `dist/webview/vendor/mermaid.min.js` (script tag, not Vite `import()`), using `securityLevel: "strict"`. SVG is sanitized and fail-closed (never inject raw SVG). Successful SVG results are cached by source. Render failures show the error and the original source.
- Math delimiters `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` render through KaTeX inside Markdown HTML. KaTeX loads on first math-bearing message (dynamic chunk + CSS). Invalid math does not fail the surrounding message. Successful KaTeX results are cached by `(displayMode, source)`.
- Copy actions continue to use the original protocol text blocks, not rendered HTML, SVG, or math markup.
