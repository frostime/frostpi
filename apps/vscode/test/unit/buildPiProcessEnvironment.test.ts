import { describe, expect, it } from "vitest";

import { buildPiProcessEnvironment, proxyFingerprint } from "../../src/extension/network/buildPiProcessEnvironment.js";

describe("Pi process proxy environment", () => {
  it("clears both uppercase and lowercase proxy variables in direct mode", () => {
    const result = buildPiProcessEnvironment({ mode: "direct" });
    expect(result.env).toMatchObject({ HTTP_PROXY: undefined, http_proxy: undefined, HTTPS_PROXY: undefined, https_proxy: undefined, ALL_PROXY: undefined, all_proxy: undefined });
  });

  it("injects credentials without storing them in the proxy fingerprint", () => {
    const result = buildPiProcessEnvironment({ mode: "custom", https: "http://proxy.example:8080" }, { username: "alice", password: "secret" });
    expect(result.env.HTTPS_PROXY).toContain("alice:secret@");
    expect(proxyFingerprint({ mode: "custom", https: "http://proxy.example:8080" })).not.toContain("secret");
  });

  it("uses the VS Code proxy only in vscode mode", () => {
    expect(buildPiProcessEnvironment({ mode: "vscode" }, undefined, "http://localhost:9000").env.HTTP_PROXY).toBe("http://localhost:9000");
    expect(buildPiProcessEnvironment({ mode: "inherit" }, undefined, "http://localhost:9000").env.HTTP_PROXY).toBeUndefined();
  });
});
