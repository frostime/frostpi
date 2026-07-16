import { describe, expect, it } from "vitest";

import { JsonlDecoder } from "../src/protocol/JsonlDecoder.js";

describe("JsonlDecoder", () => {
  it("decodes fragmented UTF-8 records and preserves Unicode line separators", () => {
    const records: string[] = [];
    const decoder = new JsonlDecoder((record) => records.push(record));
    const payload = Buffer.from('{"name":"雪\u2028line"}\n{"ok":true}\r\n', "utf8");

    decoder.push(payload.subarray(0, 8));
    decoder.push(payload.subarray(8, 17));
    decoder.push(payload.subarray(17));
    decoder.end();

    expect(records).toEqual(['{"name":"雪\u2028line"}', '{"ok":true}']);
  });

  it("flushes a final record without a trailing LF", () => {
    const records: string[] = [];
    const decoder = new JsonlDecoder((record) => records.push(record));
    decoder.push(Buffer.from('{"type":"agent_end"}'));
    decoder.end();
    expect(records).toEqual(['{"type":"agent_end"}']);
  });
});
