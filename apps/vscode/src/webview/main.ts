import "@vscode/codicons/dist/codicon.css";
import "./styles/reset.css";
import "./styles/vscode-theme.css";
import "./styles/tokens.css";
import "./styles/sessions.css";
import "./styles/composer.css";
import "./styles/pickers.css";
import "./styles/typography.css";
import "./styles/markdown.css";
import "./styles/motion.css";

import { mount } from "svelte";

import App from "./App.svelte";
import { applyHostMessage } from "./bridge/applyHostMessage";
import { onHostMessage, postToHost } from "./bridge/vscodeBridge";

const app = mount(App, { target: document.getElementById("app")! });
const unsubscribe = onHostMessage(applyHostMessage);
postToHost({ type: "ready" });

if (import.meta.hot) {
  import.meta.hot.dispose(() => unsubscribe());
}

export default app;
