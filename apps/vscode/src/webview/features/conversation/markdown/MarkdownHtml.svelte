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
    const path = target?.getAttribute("data-file-path");
    if (path) {
      event.preventDefault();
      const line = positiveInteger(target?.getAttribute("data-file-line"));
      const column = positiveInteger(target?.getAttribute("data-file-column"));
      const endLine = positiveInteger(target?.getAttribute("data-file-end-line"));
      postToHost({
        type: "openFile",
        path,
        ...(line === undefined ? {} : { line }),
        ...(column === undefined ? {} : { column }),
        ...(endLine === undefined ? {} : { endLine }),
      });
      return;
    }

    const href = target?.getAttribute("href");
    if (!href || !/^https?:\/\//i.test(href)) return;
    event.preventDefault();
    postToHost({ type: "openExternal", url: href });
  }

  function positiveInteger(value: string | null | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  function linkActions(node: HTMLElement): { destroy(): void } {
    node.addEventListener("click", handleClick);
    return { destroy: () => node.removeEventListener("click", handleClick) };
  }

  const html = $derived.by(() => {
    void katexGeneration;
    return renderMarkdownHtml(content);
  });
</script>

<div class="markdown-body" use:linkActions>{@html html}</div>
