<script lang="ts">
  import { postToHost } from "../../../bridge/vscodeBridge";
  import { ensureKatex, isKatexReady, renderMarkdownHtml } from "./renderMarkdown";

  let { content }: { content: string } = $props();

  // Bumps after KaTeX chunk loads so math placeholders re-render.
  let katexGeneration = $state(isKatexReady() ? 1 : 0);

  $effect(() => {
    if (isKatexReady()) return;
    let cancelled = false;
    void ensureKatex().then(() => {
      if (!cancelled) katexGeneration += 1;
    });
    return () => {
      cancelled = true;
    };
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

  const html = $derived.by(() => {
    void katexGeneration;
    return renderMarkdownHtml(content);
  });
</script>

<div class="markdown-body" use:externalLinks>{@html html}</div>
