export class BoundedTextBuffer {
  #value = "";

  constructor(readonly limit: number) {
    if (!Number.isInteger(limit) || limit <= 0) throw new Error("Buffer limit must be a positive integer");
  }

  append(text: string): void {
    this.#value = `${this.#value}${text}`.slice(-this.limit);
  }

  clear(): void {
    this.#value = "";
  }

  toString(): string {
    return this.#value;
  }
}
