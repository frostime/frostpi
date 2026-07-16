export type ExtensionUiRequestKind = "select" | "confirm" | "input" | "editor";

export interface PendingExtensionUiView {
  id: string;
  method: ExtensionUiRequestKind;
  title: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  receivedAt: number;
}

export interface ExtensionStatusView {
  key: string;
  text: string;
}

export interface ExtensionWidgetView {
  key: string;
  lines: string[];
  placement: "above" | "below";
}
