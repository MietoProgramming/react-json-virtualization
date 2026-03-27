import type { JSONArray, JSONObject, JSONValue, ParseOptions } from "./types";

const DEFAULT_YIELD_INTERVAL_MS = 8;

const now = (): number => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const isWhitespace = (char: string): boolean => {
  return char === " " || char === "\n" || char === "\r" || char === "\t";
};

const isDigit = (char: string): boolean => {
  return char >= "0" && char <= "9";
};

const isHexDigit = (char: string): boolean => {
  return (
    (char >= "0" && char <= "9") ||
    (char >= "a" && char <= "f") ||
    (char >= "A" && char <= "F")
  );
};

const escapedCharacterMap: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t"
};

class IncrementalParser {
  private readonly source: string;
  private readonly options: Required<Omit<ParseOptions, "signal" | "onProgress">> &
    Pick<ParseOptions, "signal" | "onProgress">;
  private index = 0;
  private lastYieldAt = now();

  constructor(source: string, options: ParseOptions) {
    this.source = source;
    this.options = {
      yieldIntervalMs: options.yieldIntervalMs ?? DEFAULT_YIELD_INTERVAL_MS,
      signal: options.signal,
      onProgress: options.onProgress
    };
  }

  async parse(): Promise<JSONValue> {
    await this.skipWhitespace();
    const value = await this.parseValue();
    await this.skipWhitespace();

    if (this.index < this.source.length) {
      this.throwUnexpected("Unexpected trailing characters");
    }

    return value;
  }

  private async parseValue(): Promise<JSONValue> {
    await this.checkpoint();

    const char = this.source[this.index];
    if (char === "{") {
      return this.parseObject();
    }
    if (char === "[") {
      return this.parseArray();
    }
    if (char === '"') {
      return this.parseString();
    }
    if (char === "-" || isDigit(char)) {
      return this.parseNumber();
    }
    if (char === "t") {
      return this.parseLiteral("true", true);
    }
    if (char === "f") {
      return this.parseLiteral("false", false);
    }
    if (char === "n") {
      return this.parseLiteral("null", null);
    }

    this.throwUnexpected("Invalid JSON value");
  }

  private async parseObject(): Promise<JSONObject> {
    const objectValue: JSONObject = {};
    this.expect("{");
    await this.skipWhitespace();

    if (this.tryConsume("}")) {
      return objectValue;
    }

    while (true) {
      await this.checkpoint();

      if (this.source[this.index] !== '"') {
        this.throwUnexpected("Object keys must be strings");
      }

      const key = await this.parseString();
      await this.skipWhitespace();
      this.expect(":");
      await this.skipWhitespace();
      objectValue[key] = await this.parseValue();
      await this.skipWhitespace();

      if (this.tryConsume("}")) {
        return objectValue;
      }

      this.expect(",");
      await this.skipWhitespace();
    }
  }

  private async parseArray(): Promise<JSONArray> {
    const arrayValue: JSONArray = [];
    this.expect("[");
    await this.skipWhitespace();

    if (this.tryConsume("]")) {
      return arrayValue;
    }

    while (true) {
      await this.checkpoint();
      arrayValue.push(await this.parseValue());
      await this.skipWhitespace();

      if (this.tryConsume("]")) {
        return arrayValue;
      }

      this.expect(",");
      await this.skipWhitespace();
    }
  }

  private async parseString(): Promise<string> {
    this.expect('"');
    let result = "";

    while (this.index < this.source.length) {
      await this.checkpoint();

      const char = this.source[this.index++];
      if (char === '"') {
        return result;
      }

      if (char === "\\") {
        const escaped = this.source[this.index++];

        if (escaped === "u") {
          const hex = this.source.slice(this.index, this.index + 4);
          if (hex.length !== 4 || [...hex].some((token) => !isHexDigit(token))) {
            this.throwUnexpected("Invalid unicode escape");
          }
          result += String.fromCharCode(parseInt(hex, 16));
          this.index += 4;
          continue;
        }

        const mapped = escapedCharacterMap[escaped];
        if (mapped === undefined) {
          this.throwUnexpected("Invalid escape sequence");
        }
        result += mapped;
        continue;
      }

      result += char;
    }

    this.throwUnexpected("Unterminated string");
  }

  private parseNumber(): number {
    const start = this.index;

    if (this.source[this.index] === "-") {
      this.index += 1;
    }

    if (this.source[this.index] === "0") {
      this.index += 1;
    } else {
      if (!isDigit(this.source[this.index])) {
        this.throwUnexpected("Invalid number");
      }

      while (isDigit(this.source[this.index])) {
        this.index += 1;
      }
    }

    if (this.source[this.index] === ".") {
      this.index += 1;
      if (!isDigit(this.source[this.index])) {
        this.throwUnexpected("Invalid number fraction");
      }
      while (isDigit(this.source[this.index])) {
        this.index += 1;
      }
    }

    const exponent = this.source[this.index];
    if (exponent === "e" || exponent === "E") {
      this.index += 1;
      const sign = this.source[this.index];
      if (sign === "+" || sign === "-") {
        this.index += 1;
      }
      if (!isDigit(this.source[this.index])) {
        this.throwUnexpected("Invalid exponent");
      }
      while (isDigit(this.source[this.index])) {
        this.index += 1;
      }
    }

    const token = this.source.slice(start, this.index);
    return Number(token);
  }

  private parseLiteral<T>(literal: string, value: T): T {
    if (this.source.slice(this.index, this.index + literal.length) !== literal) {
      this.throwUnexpected(`Expected ${literal}`);
    }
    this.index += literal.length;
    return value;
  }

  private async skipWhitespace(): Promise<void> {
    while (this.index < this.source.length && isWhitespace(this.source[this.index])) {
      this.index += 1;
      await this.checkpoint(false);
    }
  }

  private expect(token: string): void {
    if (!this.tryConsume(token)) {
      this.throwUnexpected(`Expected '${token}'`);
    }
  }

  private tryConsume(token: string): boolean {
    if (this.source[this.index] !== token) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private async checkpoint(reportProgress = true): Promise<void> {
    if (this.options.signal?.aborted) {
      throw new Error("JSON parsing aborted");
    }

    if (reportProgress && this.options.onProgress) {
      this.options.onProgress(this.index, this.source.length);
    }

    if (now() - this.lastYieldAt >= this.options.yieldIntervalMs) {
      this.lastYieldAt = now();
      await Promise.resolve();
    }
  }

  private throwUnexpected(message: string): never {
    const location = `at index ${this.index}`;
    throw new Error(`${message} ${location}`);
  }
}

export async function parseJsonIncremental(
  source: string,
  options: ParseOptions = {}
): Promise<JSONValue> {
  const parser = new IncrementalParser(source, options);
  return parser.parse();
}
