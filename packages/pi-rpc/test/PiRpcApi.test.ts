import { describe, expect, it, vi } from "vitest";

import { PiRpcApi } from "../src/PiRpcApi.js";

describe("PiRpcApi", () => {
  it("preserves streaming behavior and image content in prompt commands", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const api = new PiRpcApi({ request } as never);

    await api.prompt("inspect", {
      streamingBehavior: "followUp",
      images: [{ type: "image", data: "abc", mimeType: "image/png" }],
    });

    expect(request).toHaveBeenCalledWith({
      type: "prompt",
      message: "inspect",
      streamingBehavior: "followUp",
      images: [{ type: "image", data: "abc", mimeType: "image/png" }],
    });
  });
});
