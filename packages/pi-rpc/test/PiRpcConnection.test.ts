import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PiRpcConnection } from "../src/PiRpcConnection.js";

let fixtureDir = "";
let fixturePath = "";

beforeAll(async () => {
  fixtureDir = await mkdtemp(join(tmpdir(), "frostpi-rpc-test-"));
  fixturePath = join(fixtureDir, "fake-pi.mjs");
  await writeFile(
    fixturePath,
    `
let buffer = "";
function send(value, split = false) {
  const line = JSON.stringify(value) + "\\n";
  if (!split) return void process.stdout.write(line);
  process.stdout.write(line.slice(0, 7));
  setTimeout(() => process.stdout.write(line.slice(7)), 1);
}
function handle(command) {
  if (command.type === "get_state") {
    send({ type: "response", id: command.id, success: true, data: {
      model: null, thinkingLevel: "off", isStreaming: false, isCompacting: false,
      steeringMode: "one-at-a-time", followUpMode: "one-at-a-time",
      autoCompactionEnabled: true, messageCount: 0, pendingMessageCount: 0,
      sessionName: "a\\u2028b"
    }}, true);
    return;
  }
  if (command.type === "prompt") {
    send({ type: "response", id: command.id, success: true });
    send({ type: "agent_start" });
    send({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "hello" }});
    send({ type: "agent_settled" });
    return;
  }
  if (command.type === "never") return;
  if (command.type === "crash") process.exit(7);
}
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  while (true) {
    const newline = buffer.indexOf("\\n");
    if (newline === -1) return;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (line.trim()) handle(JSON.parse(line));
  }
});
`,
  );
});

afterAll(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

function createConnection(): PiRpcConnection {
  return new PiRpcConnection({
    cwd: fixtureDir,
    command: process.execPath,
    commandArgs: [fixturePath],
    requestTimeoutMs: 250,
    startupTimeoutMs: 2_000,
    stopTimeoutMs: 100,
  });
}

describe("PiRpcConnection", () => {
  it("performs a real get_state handshake and delivers events", async () => {
    const connection = createConnection();
    const events: string[] = [];
    connection.onEvent((event) => events.push(event.type));

    try {
      const state = await connection.start();
      expect(state.sessionName).toBe("a\u2028b");
      await connection.request({ type: "prompt", message: "hello" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(events).toEqual(["agent_start", "message_update", "agent_settled"]);
    } finally {
      await connection.stop();
    }
  });

  it("passes the resolved invocation to an injected launcher", async () => {
    let launchArgs: readonly string[] = [];
    const connection = new PiRpcConnection({
      cwd: fixtureDir,
      command: process.execPath,
      commandArgs: [fixturePath],
      args: ["--no-session"],
      launcher(spec) {
        launchArgs = spec.args;
        return spawn(spec.command, [...spec.args], { cwd: spec.cwd, env: spec.env, stdio: ["pipe", "pipe", "pipe"] });
      },
      startupTimeoutMs: 2_000,
      stopTimeoutMs: 100,
    });

    try {
      await connection.start();
      expect(launchArgs.slice(-3)).toEqual(["--mode", "rpc", "--no-session"]);
    } finally {
      await connection.stop();
    }
  });

  it("rejects timed-out requests without corrupting later correlation", async () => {
    const connection = createConnection();
    try {
      await connection.start();
      await expect(connection.request({ type: "never" }, 20)).rejects.toThrow(/Timed out/);
      const state = await connection.request<{ sessionName: string }>({ type: "get_state" });
      expect(state.sessionName).toBe("a\u2028b");
    } finally {
      await connection.stop();
    }
  });

  it("waits without a deadline when the caller explicitly disables the timeout", async () => {
    const connection = createConnection();
    await connection.start();
    const request = connection.request({ type: "never" }, null);
    let settled = false;
    void request.finally(() => { settled = true; }).catch(() => undefined);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(settled).toBe(false);

    await connection.stop();
    await expect(request).rejects.toThrow(/stopped/);
  });

  it("rejects pending commands when the child exits", async () => {
    const connection = createConnection();
    try {
      await connection.start();
      await expect(connection.request({ type: "crash" }, 2_000)).rejects.toThrow(/exited/);
    } finally {
      await connection.stop();
    }
  });

  it("does not emit a failure for caller-requested shutdown", async () => {
    const connection = createConnection();
    const failures: Error[] = [];
    connection.onFailure((error) => failures.push(error));
    await connection.start();
    await connection.stop();
    expect(failures).toEqual([]);
  });
});
