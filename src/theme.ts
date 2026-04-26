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

// VS Code Themes
export const monokaiTheme: JsonTheme = {
  background: "#272822",
  rowHover: "#383830",
  rowSelected: "#49483e",
  rowMatch: "#657b53",
  plainLineMatch: "#5a7e50",
  key: "#f4bf75",
  punctuation: "#9d8671",
  string: "#a5c261",
  number: "#ae81ff",
  boolean: "#ffc66d",
  null: "#8b4e2b",
  focusRing: "#dcb676"
};

export const monokaiDimmedTheme: JsonTheme = {
  background: "#311917",
  rowHover: "#402523",
  rowSelected: "#583635",
  rowMatch: "#b27d71",
  plainLineMatch: "#bbaa9f",
  key: "var(--vscode-constants-namedColors-orange)",
  punctuation: "var(--vscode-constants-namedColors-yellow)",
  string: "var(--vscode-constants-namedColors-lightgreen)",
  number: "var(--vscode-constants-namedColors-purple)",
  boolean: "var(--vscode-constants-namedColors-orange)",
  null: "var(--vscode-constants-namedColors-brown)",
  focusRing: "var(--vscode-focusBorder)"
};

export const solarizedLightTheme: JsonTheme = {
  background: "#fdf6e3",
  rowHover: "#eee8d5",
  rowSelected: "#d33682",
  rowMatch: "#b58900",
  plainLineMatch: "#cb4b16",
  key: "#268bd2",
  punctuation: "#93a1a1",
  string: "#859900",
  number: "#d33682",
  boolean: "#2aa198",
  null: "#073642",
  focusRing: "#2aa198"
};

export const solarizedDarkTheme: JsonTheme = {
  background: "#002b36",
  rowHover: "#073642",
  rowSelected: "#dc322f",
  rowMatch: "#b58900",
  plainLineMatch: "#cb4b16",
  key: "#268bd2",
  punctuation: "#586e75",
  string: "#859900",
  number: "#d33682",
  boolean: "#2aa198",
  null: "#268bd2",
  focusRing: "#268bd2"
};

export const draculaTheme: JsonTheme = {
  background: "#282a36",
  rowHover: "#303446",
  rowSelected: "#44475a",
  rowMatch: "#f1fa8c",
  plainLineMatch: "#f1f8e8",
  key: "#bd93f9",
  punctuation: "#6272a4",
  string: "#f1fa8c",
  number: "#bd93f9",
  boolean: "#ff79c6",
  null: "#f1fa8c",
  focusRing: "#ffb86c"
};

export const nordTheme: JsonTheme = {
  background: "#2e3440",
  rowHover: "#3b4252",
  rowSelected: "#434c5e",
  rowMatch: "#a3be8c",
  plainLineMatch: "#b48ead",
  key: "#88c0d0",
  punctuation: "#5e6c84",
  string: "#a3be8c",
  number: "#b48ead",
  boolean: "#ebcb8b",
  null: "#81a1c1",
  focusRing: "#88c0d0"
};

export const oneDarkTheme: JsonTheme = {
  background: "#282c34",
  rowHover: "#3e4351",
  rowSelected: "##2b3a49", "rowMatch": "#61afef", "plainLineMatch": "#5c6370", key: "#61afef", "punctuation": "#abb2bf", string: "#98c379", number: "#d19a66", boolean: "#e06c75", null: "#5c6370", focusRing: "#3e4351"
};

export const vscodeDarkTheme: JsonTheme = {
  background: "#050505",
  rowHover: "#2a2d2e",
  rowSelected: "#094771",
  rowMatch: "#083762",
  plainLineMatch: "#313435",
  key: "#9cdcfe",
  punctuation: "#ffd700",
  string: "#ce9178",
  number: "#b5cea8",
  boolean: "#569cd6",
  null: "#ff0000",
  focusRing: "#0e639c"
};

export type VsCodeTheme = typeof vscodeDarkTheme | // Default VS Code Dark+
typeof monokaiTheme // Monokai (built-in)
;

export type JsonThemeOverride = Partial<JsonTheme>;

export function resolveTheme(theme?: JsonThemeOverride): JsonTheme {
  return {
    ...defaultTheme,
    ...theme
  };
}
