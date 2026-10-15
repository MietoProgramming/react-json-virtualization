import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parseDocument as parseYamlDocument } from "yaml";
import { parseJsonIncremental } from "../parser";
import type { JSONValue } from "../types";
import { throwIfAborted } from "./yield";
import { DocumentError, type DocumentInput, type DocumentOperationOptions, type ParsedDocument } from "./types";

const now = (): number => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

const validateJsonValue = async (
  input: unknown,
  format: "json" | "yaml" | "xml",
  options: DocumentOperationOptions = {},
  reportProgress = false
): Promise<void> => {
  const active = new WeakSet<object>();
  const stack: Array<{ value: unknown; exit?: boolean }> = [{ value: input }];
  const interval = options.yieldIntervalMs ?? 8;
  let lastYield = now();
  let lastProgress = 0;
  let processed = 0;
  const checkpoint = async (force = false): Promise<void> => {
    throwIfAborted(options.signal);
    const current = now();
    if (reportProgress && current - lastProgress >= 50) {
      options.onProgress?.({ phase: "parse", processed, total: 0 });
      lastProgress = current;
    }
    if (force || current - lastYield >= interval) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      lastYield = now();
      throwIfAborted(options.signal);
    }
  };
  throwIfAborted(options.signal);
  while (stack.length > 0) {
    await checkpoint();
    processed += 1;
    const frame = stack.pop()!;
    const value = frame.value;
    if (frame.exit) {
      active.delete(value as object);
      continue;
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw unsupportedValue(format, "JSON numbers must be finite");
      continue;
    }
    if (typeof value !== "object") throw unsupportedValue(format, `Unsupported ${typeof value} value`);
    if (active.has(value)) throw unsupportedValue(format, "Cyclic references are not supported");
    active.add(value);
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw unsupportedValue(format, "Only plain arrays are supported");
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw unsupportedValue(format, "Symbol-keyed array properties are not supported");
      }
      const keys = Object.keys(value);
      if (keys.some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
        throw unsupportedValue(format, "Arrays may contain only indexed JSON values");
      }
      stack.push({ value, exit: true });
      for (let index = value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: value[index] });
        if (now() - lastYield >= interval) await checkpoint(true);
      }
      continue;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw unsupportedValue(format, "Only plain objects and arrays are supported");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw unsupportedValue(format, "Symbol-keyed object properties are not supported");
    }
    stack.push({ value, exit: true });
    const keys = Object.keys(value as Record<string, unknown>);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      stack.push({ value: (value as Record<string, unknown>)[keys[index]] });
      if (now() - lastYield >= interval) await checkpoint(true);
    }
  }
  if (reportProgress) options.onProgress?.({ phase: "parse", processed, total: processed });
};

const unsupportedValue = (format: "json" | "yaml" | "xml", message: string): DocumentError =>
  new DocumentError("UNSUPPORTED_VALUE", message, { format });

const normalizeXmlName = (qualifiedName: string, namespaces: Record<string, string>, isAttribute = false): string => {
  const separator = qualifiedName.indexOf(":");
  const prefix = separator < 0 ? "" : qualifiedName.slice(0, separator);
  const localName = separator < 0 ? qualifiedName : qualifiedName.slice(separator + 1);
  const namespace = isAttribute && prefix === "" ? undefined : namespaces[prefix];
  if (prefix && !namespace) throw new DocumentError("INVALID_XML", `Undeclared XML namespace prefix '${prefix}'`, { format: "xml" });
  return namespace ? `{${namespace}}${localName}` : localName;
};

const defineValue = (target: Record<string, unknown>, key: string, value: unknown): void => {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true });
};

const normalizeXml = (xml: unknown[]): JSONValue => {
  const normalizeElements = (
    elements: unknown[],
    inheritedNamespaces: Record<string, string>,
    inheritedSpace: boolean,
    stripFormattingWhitespace = false
  ): unknown[] => {
    const output: unknown[] = [];
    for (const raw of elements) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const entry = raw as Record<string, unknown>;
      const attributes = (entry[":@"] && typeof entry[":@"] === "object" ? entry[":@"] : {}) as Record<string, unknown>;
      const elementName = Object.keys(entry).find((name) => name !== ":@");
      if (!elementName) continue;
      if (elementName === "#text" || elementName === "#cdata") {
        const rawText = entry[elementName];
        const text = elementName === "#cdata" && Array.isArray(rawText)
          ? rawText.map((part) => part && typeof part === "object" && "#text" in part
            ? String((part as Record<string, unknown>)["#text"] ?? "")
            : String(part ?? "")).join("")
          : String(rawText ?? "");
        if (elementName === "#text" && text.trim() === "" && stripFormattingWhitespace) continue;
        const previous = output[output.length - 1] as { type?: string; value?: unknown } | undefined;
        if (previous?.type === "text" && typeof previous.value === "string") previous.value += text;
        else output.push({ type: "text", value: text });
        continue;
      }
      if (elementName === "#comment" || elementName.startsWith("?")) continue;
      const childNamespaces = { ...inheritedNamespaces };
      for (const [key, value] of Object.entries(attributes)) {
        const attributeName = key.startsWith("@_") ? key.slice(2) : key;
        if (attributeName === "xmlns") childNamespaces[""] = String(value);
        else if (attributeName.startsWith("xmlns:")) childNamespaces[attributeName.slice(6)] = String(value);
      }
      const declaredSpace = Object.entries(attributes).reduce<string | undefined>((declared, [key, value]) => {
        const name = key.startsWith("@_") ? key.slice(2) : key;
        if (name === "xmlns" || name.startsWith("xmlns:")) return declared;
        return normalizeXmlName(name, childNamespaces, true) === "{http://www.w3.org/XML/1998/namespace}space" ? String(value) : declared;
      }, undefined);
      const elementSpace = declaredSpace === "preserve" || (declaredSpace !== "default" && inheritedSpace);
      const normalizedAttributes: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(attributes)) {
        const name = key.startsWith("@_") ? key.slice(2) : key;
        if (name === "xmlns" || name.startsWith("xmlns:")) continue;
        defineValue(normalizedAttributes, normalizeXmlName(name, childNamespaces, true), String(value));
      }
      const rawChildren = Array.isArray(entry[elementName]) ? entry[elementName] as unknown[] : [];
      const hasElementChildren = rawChildren.some((child) => {
        if (!child || typeof child !== "object" || Array.isArray(child)) return false;
        return Object.keys(child as Record<string, unknown>).some((name) => !name.startsWith("#") && name !== ":@");
      });
      const hasSignificantText = rawChildren.some((child) => {
        if (!child || typeof child !== "object" || Array.isArray(child)) return false;
        const record = child as Record<string, unknown>;
        const cdata = record["#cdata"];
        return (typeof record["#text"] === "string" && record["#text"].trim().length > 0) ||
          (typeof cdata === "string" && cdata.length > 0) || (Array.isArray(cdata) && cdata.length > 0);
      });
      const shouldStripWhitespace = hasElementChildren && !hasSignificantText && !elementSpace;
      const children = normalizeElements(rawChildren, childNamespaces, elementSpace, shouldStripWhitespace);
      const node: Record<string, unknown> = {
        type: "element",
        name: normalizeXmlName(elementName, childNamespaces),
        attributes: normalizedAttributes,
        children
      };
      output.push(node);
    }
    return output;
  };
  return { type: "document", children: normalizeElements(xml, { xml: "http://www.w3.org/XML/1998/namespace" }, false, true) } as JSONValue;
};

const parseXml = (text: string): JSONValue => {
  const withoutCommentsOrCdata = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  if (/<!\s*DOCTYPE\b/i.test(withoutCommentsOrCdata)) throw new DocumentError("INVALID_XML", "DTD declarations are not supported", { format: "xml" });
  const validation = XMLValidator.validate(text, { allowBooleanAttributes: false });
  if (validation !== true) {
    const location = validation.err;
    throw new DocumentError("INVALID_XML", location.msg, { format: "xml", line: location.line, column: location.col });
  }
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    cdataPropName: "#cdata",
    commentPropName: "#comment",
    ignorePiTags: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false
  });
  return normalizeXml(parser.parse(text) as unknown[]);
};

export const parseDocument = async (
  input: DocumentInput,
  options: DocumentOperationOptions = {}
): Promise<ParsedDocument> => {
  throwIfAborted(options.signal);
  if (!input || typeof input !== "object" || !("format" in input)) {
    throw new DocumentError("INVALID_INPUT", "Document input must include a supported format");
  }
  const format = input.format;
  if (format !== "json" && format !== "yaml" && format !== "xml") {
    throw new DocumentError("INVALID_INPUT", "Unsupported document format");
  }
  try {
    let root: JSONValue;
    if ("value" in input) {
      if (format !== "json") throw new DocumentError("INVALID_INPUT", "Direct values are supported only for JSON", { format });
      await validateJsonValue(input.value, "json", options, true);
      root = input.value;
    } else if (typeof input.text !== "string") {
      throw new DocumentError("INVALID_INPUT", "Document text must be a string", { format });
    } else if (format === "json") {
      try {
        root = await parseJsonIncremental(input.text, {
          signal: options.signal,
          yieldIntervalMs: options.yieldIntervalMs,
          onProgress: (processed, total) => options.onProgress?.({ phase: "parse", processed, total })
        });
      } catch (error) {
        if (options.signal?.aborted) throw new DocumentError("OPERATION_ABORTED", "Document operation was aborted", { format });
        const message = error instanceof Error ? error.message : "Invalid JSON document";
        const index = /at index (\d+)/.exec(message)?.[1];
        const prefix = index === undefined ? "" : input.text.slice(0, Number(index));
        const lines = prefix.split("\n");
        throw new DocumentError("INVALID_JSON", message, {
          format,
          index: index === undefined ? undefined : Number(index),
          line: index === undefined ? undefined : lines.length,
          column: index === undefined ? undefined : lines[lines.length - 1].length + 1
        });
      }
      await validateJsonValue(root, "json", options);
    } else if (format === "yaml") {
      options.onProgress?.({ phase: "parse", processed: 0, total: input.text.length });
      try {
        const parsed = parseYamlDocument(input.text, { version: "1.2", schema: "core", prettyErrors: true });
        if (parsed.errors.length > 0) {
          const issue = parsed.errors[0];
          const position = issue.linePos?.[0];
          throw new DocumentError("INVALID_YAML", issue.message, {
            format,
            line: position?.line,
            column: position?.col
          });
        }
        root = parsed.toJS({ maxAliasCount: 1000 }) as JSONValue;
        await validateJsonValue(root, "yaml", options);
      } catch (error) {
        if (error instanceof DocumentError) throw error;
        const issue = error as { message?: string; linePos?: Array<{ line: number; col: number }> };
        throw new DocumentError("INVALID_YAML", issue.message ?? "Invalid YAML document", {
          format,
          line: issue.linePos?.[0]?.line,
          column: issue.linePos?.[0]?.col
        });
      }
      options.onProgress?.({ phase: "parse", processed: input.text.length, total: input.text.length });
    } else {
      options.onProgress?.({ phase: "parse", processed: 0, total: input.text.length });
      root = parseXml(input.text);
      await validateJsonValue(root, "xml", options);
      options.onProgress?.({ phase: "parse", processed: input.text.length, total: input.text.length });
    }
    throwIfAborted(options.signal);
    return { format, root };
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError("INVALID_INPUT", error instanceof Error ? error.message : "Unable to parse document", { format });
  }
};

export const validateParsedDocument = async (document: ParsedDocument, options: DocumentOperationOptions = {}): Promise<ParsedDocument> => {
  if (!document || (document.format !== "json" && document.format !== "yaml" && document.format !== "xml")) {
    throw new DocumentError("INVALID_INPUT", "Parsed document has an unsupported format");
  }
  await validateJsonValue(document.root, document.format, options);
  return document;
};
