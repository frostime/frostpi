<script lang="ts">
  import { postToHost } from "../../../bridge/vscodeBridge";
  import { renderMarkdownHtml } from "./renderMarkdown";

  let { content }: { content: string } = $props();

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

  const html = $derived(renderMarkdownHtml(content));
</script>

<div class="markdown-body" use:externalLinks>{@html html}</div>
