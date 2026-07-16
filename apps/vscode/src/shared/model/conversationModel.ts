export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "streaming" | "complete" | "error" | "aborted";

export interface ImageAttachmentView {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

export type MessageBlockView =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "images"; images: ImageAttachmentView[] }
  | { type: "error"; text: string };

export interface ConversationMessageView {
  id: string;
  role: MessageRole;
  blocks: MessageBlockView[];
  status: MessageStatus;
  timestamp: number;
}
