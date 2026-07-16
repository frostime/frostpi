import { describe, expect, it } from "vitest";

import { mergeEnvironment } from "../src/PiRpcConnection.js";

describe("Pi child process environment", () => {
  it("removes inherited variables when an override is undefined", () => {
    expect(mergeEnvironment({ HTTP_PROXY: "http://old", KEEP: "yes" }, { HTTP_PROXY: undefined, HTTPS_PROXY: "http://new" }))
      .toEqual({ KEEP: "yes", HTTPS_PROXY: "http://new" });
  });
});
