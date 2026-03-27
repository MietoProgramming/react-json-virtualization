export interface PrettyToken {
  text: string;
  className?: string;
}

export const normalizeSearchInput = (value: string, caseSensitive: boolean): string => {
  return caseSensitive ? value : value.toLowerCase();
};

const isDelimiter = (char: string | undefined): boolean => {
  return char === undefined || /[\s,\]\}\:]/.test(char);
};

export const tokenizePrettyLine = (line: string): PrettyToken[] => {
  const tokens: PrettyToken[] = [];
  let index = 0;

  while (index < line.length) {
    const char = line[index];

    if (char === '"') {
      let cursor = index + 1;
      let escaped = false;

      while (cursor < line.length) {
        const current = line[cursor];
        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === '"') {
          cursor += 1;
          break;
        }
        cursor += 1;
      }

      const text = line.slice(index, cursor);
      const tail = line.slice(cursor);
      const isKey = /^\s*:/.test(tail);
      tokens.push({ text, className: isKey ? "rjv-token-key" : "rjv-token-string" });
      index = cursor;
      continue;
    }

    if (char === "-" || (char >= "0" && char <= "9")) {
      const match = line.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (match) {
        tokens.push({ text: match[0], className: "rjv-token-number" });
        index += match[0].length;
        continue;
      }
    }

    if (line.startsWith("true", index) && isDelimiter(line[index + 4])) {
      tokens.push({ text: "true", className: "rjv-token-boolean" });
      index += 4;
      continue;
    }

    if (line.startsWith("false", index) && isDelimiter(line[index + 5])) {
      tokens.push({ text: "false", className: "rjv-token-boolean" });
      index += 5;
      continue;
    }

    if (line.startsWith("null", index) && isDelimiter(line[index + 4])) {
      tokens.push({ text: "null", className: "rjv-token-null" });
      index += 4;
      continue;
    }

    if (/[\[\]{}:,]/.test(char)) {
      tokens.push({ text: char, className: "rjv-token-punctuation" });
      index += 1;
      continue;
    }

    let cursor = index + 1;
    while (cursor < line.length) {
      const current = line[cursor];
      if (current === '"' || /[\[\]{}:,]/.test(current)) {
        break;
      }
      if ((current === "-" || (current >= "0" && current <= "9")) && isDelimiter(line[cursor - 1])) {
        break;
      }
      if (line.startsWith("true", cursor) || line.startsWith("false", cursor) || line.startsWith("null", cursor)) {
        break;
      }
      cursor += 1;
    }

    tokens.push({ text: line.slice(index, cursor) });
    index = cursor;
  }

  return tokens;
};
