export interface JsonTheme {
  background: string;
  rowHover: string;
  rowSelected: string;
  rowMatch: string;
  plainLineMatch: string;
  key: string;
  punctuation: string;
  string: string;
  number: string;
  boolean: string;
  null: string;
  focusRing: string;
}

export const defaultTheme: JsonTheme = {
  background: "#f7f6f2",
  rowHover: "#ebe7db",
  rowSelected: "#d7e5ff",
  rowMatch: "#fff3bf",
  plainLineMatch: "#fff6cc",
  key: "#6a3f00",
  punctuation: "#5b6470",
  string: "#0a6b4f",
  number: "#114c9c",
  boolean: "#7b2f8f",
  null: "#8b4e2b",
  focusRing: "#205ecf"
};

export type JsonThemeOverride = Partial<JsonTheme>;

export function resolveTheme(theme?: JsonThemeOverride): JsonTheme {
  return {
    ...defaultTheme,
    ...theme
  };
}
