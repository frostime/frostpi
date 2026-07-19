<script lang="ts" module>
  import type mermaidAPI from "mermaid";

  type Mermaid = typeof mermaidAPI;

  let mermaidPromise: Promise<Mermaid> | null = null;
  let diagramSeq = 0;

  function detectTheme(): "dark" | "default" {
    const kind = document.body?.getAttribute("data-vscode-theme-kind") ?? "";
    if (kind.includes("high-contrast") || kind.includes("dark")) return "dark";
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--vscode-editor-background").trim();
    if (bg.startsWith("#") && bg.length >= 7) {
      const r = Number.parseInt(bg.slice(1, 3), 16);
      const g = Number.parseInt(bg.slice(3, 5), 16);
      const b = Number.parseInt(bg.slice(5, 7), 16);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return luminance < 0.45 ? "dark" : "default";
    }
    return "dark";
  }

  function loadMermaid(): Promise<Mermaid> {
    mermaidPromise ??= import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: detectTheme(),
        fontFamily: "var(--font-ui, sans-serif)",
      });
      return mermaid;
    });
    return mermaidPromise;
  }

  function nextDiagramId(): string {
    diagramSeq += 1;
    return `frost-mermaid-${diagramSeq}-${Math.random().toString(36).slice(2, 9)}`;
  }
</script>

<script lang="ts">
  import { sanitizeSvg } from "./renderMarkdown";

  let { source }: { source: string } = $props();

  let host: HTMLElement | undefined = $state();
  let status = $state<"loading" | "ready" | "error">("loading");
  let errorText = $state<string | null>(null);

  $effect(() => {
    const text = source;
    const el = host;
    if (!el) return;

    let cancelled = false;
    status = "loading";
    errorText = null;
    el.replaceChildren();

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;
        const { svg } = await mermaid.render(nextDiagramId(), text);
        if (cancelled) return;
        el.innerHTML = sanitizeSvg(svg);
        status = "ready";
      } catch (error) {
        if (cancelled) return;
        status = "error";
        errorText = error instanceof Error ? error.message : "Failed to render diagram";
        el.replaceChildren();
      }
    })();

    return () => {
      cancelled = true;
    };
  });
</script>

<div class="mermaid-block" class:mermaid-error={status === "error"} aria-busy={status === "loading"}>
  {#if status === "loading"}
    <div class="mermaid-status">Rendering diagram…</div>
  {/if}
  <div class="mermaid-host" class:mermaid-host-hidden={status !== "ready"} bind:this={host}></div>
  {#if status === "error"}
    <div class="mermaid-fallback">
      <div class="mermaid-status">{errorText}</div>
      <pre class="hljs"><code>{source}</code></pre>
    </div>
  {/if}
</div>
