<script lang="ts">
  import {
    autocompletion,
    completionKeymap,
    startCompletion,
    type Completion,
    type CompletionContext,
    type CompletionResult,
  } from "@codemirror/autocomplete";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { Compartment, EditorState } from "@codemirror/state";
  import { EditorView, keymap, placeholder as editorPlaceholder } from "@codemirror/view";
  import type { RpcCommandDescriptor } from "@frostime/pi-rpc";
  import { onMount } from "svelte";

  import { shouldStartPromptCompletion } from "./completionPolicy";
  import { withFrostPiCommands } from "./frostPiCommands";
  import { requestWorkspaceFileSuggestions } from "./fileSuggestionClient";
  import { promptSyntax } from "./promptSyntax";

  let {
    sessionId,
    value,
    commands,
    placeholder,
    onchange,
    onsubmit,
    onpasteimages,
  }: {
    sessionId: string;
    value: string;
    commands: RpcCommandDescriptor[];
    placeholder: string;
    onchange: (value: string) => void;
    onsubmit: () => void;
    onpasteimages: (files: File[]) => void | Promise<void>;
  } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;
  let applyingExternal = false;
  const syntaxCompartment = new Compartment();
  const completionCompartment = new Compartment();

  export function focus(): void {
    view?.focus();
  }

  onMount(() => {
    view = createEditor();
    return () => view?.destroy();
  });

  $effect(() => {
    const editor = view;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === value) return;
    applyingExternal = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    applyingExternal = false;
  });

  $effect(() => {
    const allCommands = withFrostPiCommands(commands);
    const activeSessionId = sessionId;
    const editor = view;
    if (!editor) return;
    editor.dispatch({
      effects: [
        syntaxCompartment.reconfigure(promptSyntax(allCommands)),
        completionCompartment.reconfigure(completionExtension(allCommands, activeSessionId)),
      ],
    });
  });

  function createEditor(): EditorView {
    return new EditorView({ state: createState(value), parent: host });
  }

  function createState(doc: string): EditorState {
    const allCommands = withFrostPiCommands(commands);
    return EditorState.create({
      doc,
      extensions: [
        history(),
        keymap.of([
          ...completionKeymap,
          ...historyKeymap,
          { key: "Mod-Enter", run: () => { onsubmit(); return true; } },
          ...defaultKeymap,
        ]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": "Message Pi" }),
        editorPlaceholder(placeholder),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || applyingExternal) return;
          onchange(update.state.doc.toString());
          const cursor = update.state.selection.main.head;
          if (shouldStartPromptCompletion(update.state.doc.toString(), cursor)) {
            queueMicrotask(() => {
              const editor = update.view;
              const currentCursor = editor.state.selection.main.head;
              if (shouldStartPromptCompletion(editor.state.doc.toString(), currentCursor)) startCompletion(editor);
            });
          }
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
            if (!files.length) return false;
            event.preventDefault();
            void onpasteimages(files);
            return true;
          },
        }),
        syntaxCompartment.of(promptSyntax(allCommands)),
        completionCompartment.of(completionExtension(allCommands, sessionId)),
        EditorView.theme({
          "&": { backgroundColor: "transparent", color: "var(--frost-text)" },
          ".cm-scroller": {
            fontFamily: "var(--font-ui)",
            fontSize: "var(--font-size)",
            lineHeight: "1.48",
            overflowX: "hidden",
            overflowY: "auto",
          },
          ".cm-content": {
            minHeight: "72px",
            padding: "13px 14px 11px",
            caretColor: "var(--frost-text)",
          },
          ".cm-line": { padding: "0" },
          ".cm-gutters": { display: "none" },
          ".cm-activeLine": { backgroundColor: "transparent" },
          ".cm-selectionBackground, ::selection": { backgroundColor: "var(--vscode-editor-selectionBackground) !important" },
          ".cm-tooltip": { zIndex: "80" },
        }),
      ],
    });
  }
</script>

<div class="prompt-editor" bind:this={host}></div>

<script lang="ts" module>
  function completionExtension(commands: RpcCommandDescriptor[], sessionId: string) {
    return autocompletion({
      activateOnTyping: true,
      activateOnTypingDelay: 40,
      maxRenderedOptions: 18,
      optionClass: (completion) => completion.type === "frostpi-status" ? "frostpi-completion-status" : "",
      override: [commandCompletion(commands), fileCompletion(sessionId)],
    });
  }

  function commandCompletion(commands: RpcCommandDescriptor[]) {
    return (context: CompletionContext): CompletionResult | null => {
      const match = context.matchBefore(/\/[\w:#.-]*/);
      if (!match) return null;
      const line = context.state.doc.lineAt(match.from);
      if (line.text.slice(0, match.from - line.from).trim().length > 0) return null;
      const options: Completion[] = commands.map((command) => ({
        label: `/${command.name}`,
        detail: command.source,
        apply: `/${command.name} `,
      }));
      return { from: match.from, options, validFor: /^\/[\w:#.-]*$/ };
    };
  }

  function fileCompletion(sessionId: string) {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
      const match = context.matchBefore(/@(?:"[^"\n]*|[^\s@]*)/);
      if (!match) return null;
      const raw = match.text.slice(1);
      const query = raw.startsWith('"') ? raw.slice(1) : raw;
      const request = requestWorkspaceFileSuggestions(sessionId, query, 20);
      context.addEventListener("abort", request.cancel, { onDocChange: true });
      const result = await request.promise;
      if (context.aborted) return null;

      const options: Completion[] = result.items.map((item) => ({
        label: item.name,
        detail: item.directory || "workspace root",
        apply: mentionText(item.path),
      }));
      if (!options.length) {
        options.push({
          label: result.error ?? "No workspace files found",
          detail: result.error ? "file search error" : "try another path fragment",
          type: "frostpi-status",
          boost: -10_000,
          apply: () => {},
        });
      }
      return {
        from: match.from,
        options,
        validFor: /^@(?:"[^"\n]*|[^\s@]*)$/,
        filter: false,
      };
    };
  }


  function mentionText(path: string): string {
    return /\s/.test(path) ? `@"${path.replaceAll('"', '\\"')}" ` : `@${path} `;
  }

</script>
