import type { PrettyToken } from "./prettyTokens";

const IDENT_START = /^[a-zA-Z_]$/;
const IDENT_CHAR = /^[a-zA-Z0-9_:.\-@]$/;
const isQuote = (char: string | undefined): boolean => char === '"' || char === "'";

/**
 * Tokenize a single HTML source line into syntax-colored tokens.
 *
 * Error-tolerant: it never throws and truncates unbalanced comments/quotes at
 * the end of the line. Only recognized HTML constructs (doctype, comment, tags,
 * attributes, attribute values) receive a className; everything else is emitted
 * as unclassified text (no className) so surrounding styling still applies.
 *
 * This is intentionally format-specific and applied only when
 * `sourceFormat === "html"`. Plain-text lines without any HTML construct are
 * returned as ordinary text tokens.
 */
export const tokenizeHtmlLine = (line: string): PrettyToken[] => {
  const tokens: PrettyToken[] = [];
  let index = 0;
  const n = line.length;

  const push = (text: string, className?: string): void => {
    if (text) {
      tokens.push({ text, className });
    }
  };

  // Read an HTML attribute (name, optional `=`, optional quoted value).
  const readAttribute = (): void => {
    let k = index + 1;
    while (k < n && IDENT_CHAR.test(line[k])) {
      k++;
    }
    push(line.slice(index, k), "rjv-token-html-attribute");
    index = k;

    if (index < n && line[index] === "=") {
      push("=", "rjv-token-punctuation");
      index += 1;
      if (index < n && isQuote(line[index])) {
        const quote = line[index];
        let m = index + 1;
        while (m < n && line[m] !== quote) {
          m++;
        }
        const stop = m < n ? m + 1 : n;
        push(line.slice(index + 1, stop), "rjv-token-html-attr-value");
        index = stop;
      } else {
        while (index < n && !/\s/.test(line[index]) && line[index] !== ">" && line[index] !== "/") {
          index++;
        }
      }
    }
  };

  // Consume attributes until the closing '>' or the end of the line.
  const consumeAttributes = (): void => {
    while (index < n) {
      while (index < n && /\s/.test(line[index])) {
        index++;
      }
      if (index >= n) {
        return;
      }

      const char = line[index];

      if (char === ">") {
        push(">", "rjv-token-punctuation");
        index += 1;
        return;
      }

      if (char === "/" && line[index + 1] === ">") {
        push("/", "rjv-token-punctuation");
        push(">", "rjv-token-punctuation");
        index += 2;
        return;
      }

      if (isQuote(char)) {
        const quote = char;
        let m = index + 1;
        while (m < n && line[m] !== quote) {
          m++;
        }
        const stop = m < n ? m + 1 : n;
        push(line.slice(index + 1, stop), "rjv-token-html-attr-value");
        index = stop;
        continue;
      }

      if (IDENT_START.test(char) || char === "@" || char === ":") {
        readAttribute();
        continue;
      }

      // Stray attribute-ish value (e.g. bare keyword): consume until boundary.
      let m = index;
      while (m < n && !/\s/.test(line[m]) && line[m] !== ">" && line[m] !== "/") {
        m++;
      }
      if (m > index) {
        push(line.slice(index, m));
      }
      if (index < n && line[index] === "=") {
        push("=", "rjv-token-punctuation");
        index += 1;
      } else {
        index = m;
      }
    }
  };

  while (index < n) {
    // Comment: <!-- ... --> (truncate at line end if unclosed).
    if (line.startsWith("<!--", index)) {
      const end = line.indexOf("-->", index + 4);
      const stop = end === -1 ? n : end + 3;
      push(line.slice(index, stop), "rjv-token-html-comment");
      index = stop;
      continue;
    }

    // Declaration: <!DOCTYPE ...> or <![CDATA[ ... ]]> (not a comment).
    if (line.startsWith("<!", index)) {
      const head = line.slice(index, index + 9).toLowerCase();
      if (head.startsWith("<!doctype")) {
        const end = line.indexOf(">", index);
        const stop = end === -1 ? n : end + 1;
        push(line.slice(index, stop), "rjv-token-html-doctype");
        index = stop;
        continue;
      }
      if (line.startsWith("<![CDATA[", index)) {
        const end = line.indexOf("]]>", index);
        const stop = end === -1 ? n : end + 3;
        push(line.slice(index, stop), "rjv-token-html-comment");
        index = stop;
        continue;
      }
      push("<!", "rjv-token-punctuation");
      index += 2;
      continue;
    }

    // Tag: <name …>, </name>, or <name …/>.
    if (line[index] === "<") {
      const closeTag = line[index + 1] === "/";
      if (closeTag) {
        push("<", "rjv-token-punctuation");
        push("/", "rjv-token-punctuation");
      } else {
        push("<", "rjv-token-punctuation");
      }

      const nameStart = closeTag ? index + 2 : index + 1;
      if (IDENT_START.test(line[nameStart])) {
        let j = nameStart + 1;
        while (j < n && IDENT_CHAR.test(line[j])) {
          j++;
        }
        push(line.slice(nameStart, j), "rjv-token-html-tag");

        if (closeTag) {
          if (line[j] === ">") {
            push(">", "rjv-token-punctuation");
            index = j + 1;
          } else {
            index = j;
          }
        } else {
          consumeAttributes();
        }
        continue;
      }

      // No name after '<': consume a lone '<' and keep scanning.
      index = nameStart;
      continue;
    }

    // Normal text, including entities ("&#xx;").
    let j = index;
    while (j < n && line[j] !== "<") {
      if (line[j] === "&" && line[j + 1] === "&") {
        const end = line.indexOf(";", j + 2);
        if (end !== -1) {
          j = end + 1;
          continue;
        }
      }
      j++;
    }
    push(line.slice(index, j));
    index = j;
  }

  return tokens;
};
