<script lang="ts">
  import DOMPurify from "dompurify";
  import hljs from "highlight.js/lib/common";
  import MarkdownIt from "markdown-it";

  import { postToHost } from "../../bridge/vscodeBridge";

  let { content }: { content: string } = $props();

  function escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const markdown: MarkdownIt = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
    highlight(code: string, language: string): string {
      if (language && hljs.getLanguage(language)) {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`;
      }
      return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
    },
  });

  function handleClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    const href = target?.getAttribute("href");
    if (!href || (!href.startsWith("https://") && !href.startsWith("http://"))) return;
    event.preventDefault();
    postToHost({ type: "openExternal", url: href });
  }

  function externalLinks(node: HTMLElement): { destroy(): void } {
    node.addEventListener("click", handleClick);
    return { destroy: () => node.removeEventListener("click", handleClick) };
  }

  const html = $derived(DOMPurify.sanitize(markdown.render(content), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  }));
</script>

<div class="markdown-body" use:externalLinks>{@html html}</div>
