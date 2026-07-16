import type { ConversationMessageView, ImageAttachmentView, MessageBlockView, MessageStatus } from "../../shared/model/conversationModel.js";
import type { ToolCallView } from "../../shared/model/toolCallModel.js";

export interface HydratedConversation {
  messages: ConversationMessageView[];
  toolCalls: ToolCallView[];
}

export function hydrateConversation(rawMessages: unknown[]): HydratedConversation {
  const messages: ConversationMessageView[] = [];
  const tools = new Map<string, ToolCallView>();
  let sequence = 0;

  for (const raw of rawMessages) {
    if (!isRecord(raw) || typeof raw.role !== "string") continue;
    const timestamp = typeof raw.timestamp === "number" ? raw.timestamp : Date.now() + sequence++;
    if (raw.role === "user") {
      messages.push({
        id: messageId(raw, `user-${sequence++}`),
        role: "user",
        blocks: contentToBlocks(raw.content, raw.attachments),
        status: "complete",
        timestamp,
      });
      continue;
    }
    if (raw.role === "assistant") {
      const blocks = contentToBlocks(raw.content);
      messages.push({
        id: messageId(raw, `assistant-${sequence++}`),
        role: "assistant",
        blocks,
        status: assistantStatus(raw.stopReason),
        timestamp,
      });
      for (const content of asArray(raw.content)) {
        if (!isRecord(content) || content.type !== "toolCall" || typeof content.id !== "string") continue;
        tools.set(content.id, createToolView(content.id, stringValue(content.name, "tool"), recordValue(content.arguments), timestamp));
      }
      continue;
    }
    if (raw.role === "toolResult" && typeof raw.toolCallId === "string") {
      const existing = tools.get(raw.toolCallId) ?? createToolView(raw.toolCallId, stringValue(raw.toolName, "tool"), {}, timestamp);
      existing.status = raw.isError === true ? "error" : "complete";
      existing.isError = raw.isError === true;
      existing.output = extractText(raw.content);
      existing.endedAt = timestamp;
      tools.set(raw.toolCallId, existing);
      continue;
    }
    if (raw.role === "bashExecution") {
      messages.push({
        id: messageId(raw, `bash-${sequence++}`),
        role: "system",
        blocks: [{ type: "text", text: `Ran \`${stringValue(raw.command, "command")}\`\n\n${stringValue(raw.output, "")}` }],
        status: raw.cancelled === true ? "aborted" : Number(raw.exitCode ?? 0) === 0 ? "complete" : "error",
        timestamp,
      });
    }
  }

  return { messages, toolCalls: [...tools.values()] };
}

export function contentToBlocks(content: unknown, attachments?: unknown): MessageBlockView[] {
  const blocks: MessageBlockView[] = [];
  if (typeof content === "string") {
    if (content) blocks.push({ type: "text", text: content });
  } else {
    const images: ImageAttachmentView[] = [];
    for (const part of asArray(content)) {
      if (!isRecord(part) || typeof part.type !== "string") continue;
      if (part.type === "text" && typeof part.text === "string") blocks.push({ type: "text", text: part.text });
      else if (part.type === "thinking" && typeof part.thinking === "string") blocks.push({ type: "thinking", text: part.thinking });
      else if (part.type === "image" && typeof part.data === "string" && typeof part.mimeType === "string") {
        images.push({
          id: stringValue(part.id, cryptoRandomId()),
          name: stringValue(part.fileName, "image"),
          mimeType: part.mimeType,
          dataUrl: `data:${part.mimeType};base64,${part.data}`,
          size: typeof part.size === "number" ? part.size : Math.floor((part.data.length * 3) / 4),
        });
      }
    }
    if (images.length) blocks.push({ type: "images", images });
  }

  const attachmentImages: ImageAttachmentView[] = [];
  for (const attachment of asArray(attachments)) {
    if (!isRecord(attachment) || attachment.type !== "image" || typeof attachment.content !== "string" || typeof attachment.mimeType !== "string") continue;
    attachmentImages.push({
      id: stringValue(attachment.id, cryptoRandomId()),
      name: stringValue(attachment.fileName, "image"),
      mimeType: attachment.mimeType,
      dataUrl: `data:${attachment.mimeType};base64,${attachment.content}`,
      size: typeof attachment.size === "number" ? attachment.size : Math.floor((attachment.content.length * 3) / 4),
    });
  }
  if (attachmentImages.length) blocks.push({ type: "images", images: attachmentImages });
  return blocks.length ? blocks : [{ type: "text", text: "" }];
}

export function createToolView(id: string, name: string, args: Record<string, unknown>, startedAt = Date.now()): ToolCallView {
  const filePath = toolFilePath(args);
  const line = numericValue(args.line) ?? numericValue(args.start_line) ?? numericValue(args.startLine);
  return {
    id,
    name,
    label: toolLabel(name, args),
    status: "running",
    args,
    isError: false,
    startedAt,
    ...(filePath ? { filePath } : {}),
    ...(line ? { line } : {}),
  };
}

export function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (isRecord(value) && Array.isArray(value.content)) return extractText(value.content);
  if (Array.isArray(value)) {
    return value
      .map((part) => isRecord(part) && part.type === "text" && typeof part.text === "string" ? part.text : "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function messageId(raw: Record<string, unknown>, fallback: string): string {
  return typeof raw.id === "string" ? raw.id : `${fallback}-${typeof raw.timestamp === "number" ? raw.timestamp : Date.now()}`;
}

function assistantStatus(stopReason: unknown): MessageStatus {
  if (stopReason === "aborted") return "aborted";
  if (stopReason === "error") return "error";
  return "complete";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numericValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toolFilePath(args: Record<string, unknown>): string | undefined {
  for (const key of ["path", "file_path", "filePath", "filename"]) {
    const value = args[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function toolLabel(name: string, args: Record<string, unknown>): string {
  if (name === "bash" && typeof args.command === "string") return args.command;
  const path = toolFilePath(args);
  if (path) return path;
  if (name === "grep" && typeof args.pattern === "string") return args.pattern;
  return name;
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
