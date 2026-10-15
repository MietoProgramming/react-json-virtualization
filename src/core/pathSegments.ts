import { parseDocumentPath, parentDocumentPath } from "./documents/paths";

export const parentPath = (path: string): string | null => parentDocumentPath(path);

export const getPathSegments = (path: string): string[] => parseDocumentPath(path).map(String);

export const getNormalizedPathSegments = (path: string, caseSensitive: boolean): string[] => {
  const segments = getPathSegments(path);
  return caseSensitive ? segments : segments.map((segment) => segment.toLowerCase());
};
