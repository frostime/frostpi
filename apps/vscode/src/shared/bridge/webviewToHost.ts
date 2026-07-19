import { z } from "zod";

import { BRIDGE_VERSION } from "./bridgeVersion.js";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_ENCODED_IMAGE_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8;

const imageSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  data: z.string().min(1).max(MAX_ENCODED_IMAGE_CHARS),
  size: z.number().int().nonnegative().max(MAX_IMAGE_BYTES),
});

const payloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("openFolder") }),
  z.object({ type: z.literal("createSession") }),
  z.object({ type: z.literal("resumeSession") }),
  z.object({ type: z.literal("activateSession"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("closeSession"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("renameSession"), sessionId: z.string().min(1).max(128), name: z.string().max(160) }),
  z.object({ type: z.literal("copyText"), text: z.string().min(1).max(2_000_000) }),
  z.object({
    type: z.literal("sendPrompt"),
    requestId: z.string().min(1).max(128),
    sessionId: z.string().min(1).max(128),
    text: z.string().max(2_000_000),
    images: z.array(imageSchema).max(12),
  }),
  z.object({ type: z.literal("abort"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("cancelFork"), sessionId: z.string().min(1).max(128) }),
  z.object({
    type: z.literal("forkMessage"),
    requestId: z.string().min(1).max(128),
    sessionId: z.string().min(1).max(128),
    entryId: z.string().min(1).max(128),
  }),
  z.object({
    type: z.literal("setModel"),
    sessionId: z.string().min(1).max(128),
    provider: z.string().min(1).max(256),
    modelId: z.string().min(1).max(512),
  }),
  z.object({
    type: z.literal("setThinkingLevel"),
    sessionId: z.string().min(1).max(128),
    level: z.enum(["off", "minimal", "low", "medium", "high", "xhigh", "max"]),
  }),
  z.object({
    type: z.literal("respondExtensionUi"),
    sessionId: z.string().min(1).max(128),
    requestId: z.string().min(1).max(256),
    response: z.union([
      z.object({ value: z.string().max(2_000_000) }),
      z.object({ confirmed: z.boolean() }),
      z.object({ cancelled: z.literal(true) }),
    ]),
  }),
  z.object({ type: z.literal("addSelection") }),
  z.object({ type: z.literal("addCurrentFile") }),
  z.object({ type: z.literal("openFile"), path: z.string().min(1).max(32_768), line: z.number().int().positive().optional() }),
  z.object({ type: z.literal("openDiff"), path: z.string().min(1).max(32_768) }),
  z.object({ type: z.literal("openExternal"), url: z.string().url().max(2_048) }),
  z.object({ type: z.literal("refreshCommands"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("refreshModels"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("loadHistory"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("searchWorkspaceFiles"), requestId: z.string().min(1).max(128), sessionId: z.string().min(1).max(128), query: z.string().max(1_024), limit: z.number().int().min(1).max(50) }),
  z.object({ type: z.literal("openSettings") }),
  z.object({ type: z.literal("openProxySettings") }),
  z.object({ type: z.literal("restartSession"), sessionId: z.string().min(1).max(128) }),
  z.object({ type: z.literal("configureExecutable") }),
  z.object({ type: z.literal("exportDiagnostics") }),
  z.object({ type: z.literal("retryStart"), sessionId: z.string().min(1).max(128).optional() }),
]);

export const webviewToHostSchema = z.intersection(
  z.object({ bridgeVersion: z.literal(BRIDGE_VERSION) }),
  payloadSchema,
);

export type WebviewToHostMessage = z.infer<typeof webviewToHostSchema>;
export type WebviewToHostPayload = z.infer<typeof payloadSchema>;
export type WebviewImageInput = z.infer<typeof imageSchema>;
