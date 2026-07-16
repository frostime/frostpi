import { StringDecoder } from "node:string_decoder";

export type JsonlRecordHandler = (record: string) => void;

/**
 * Strict LF-delimited JSONL decoder. Unicode U+2028/U+2029 remain content and
 * CRLF is accepted by stripping only the trailing carriage return.
 */
export class JsonlDecoder {
  readonly #onRecord: JsonlRecordHandler;
  #decoder = new StringDecoder("utf8");
  #buffer = "";
  #ended = false;

  constructor(onRecord: JsonlRecordHandler) {
    this.#onRecord = onRecord;
  }

  push(chunk: Buffer): void {
    if (this.#ended) throw new Error("Cannot push to an ended JSONL decoder");
    this.#buffer += this.#decoder.write(chunk);
    this.#consume(false);
  }

  end(): void {
    if (this.#ended) return;
    this.#ended = true;
    this.#buffer += this.#decoder.end();
    this.#consume(true);
  }

  #consume(flush: boolean): void {
    while (true) {
      const newline = this.#buffer.indexOf("\n");
      if (newline === -1) break;
      const record = stripTrailingCarriageReturn(this.#buffer.slice(0, newline));
      this.#buffer = this.#buffer.slice(newline + 1);
      if (record.trim()) this.#onRecord(record);
    }

    if (flush && this.#buffer.length > 0) {
      const record = stripTrailingCarriageReturn(this.#buffer);
      this.#buffer = "";
      if (record.trim()) this.#onRecord(record);
    }
  }
}

function stripTrailingCarriageReturn(value: string): string {
  return value.endsWith("\r") ? value.slice(0, -1) : value;
}
