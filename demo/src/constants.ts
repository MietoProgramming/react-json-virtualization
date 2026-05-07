import {
    monokaiTheme,
    nordTheme,
    oneDarkTheme,
    solarizedDarkTheme,
    solarizedLightTheme,
    vscodeDarkTheme,
    type JsonThemeOverride,
    type PathFilterMode,
    type SourceFormat
} from "react-json-virtualization";

export const sampleSources = [
  {
    label: "Users + stats",
    path: `${import.meta.env.BASE_URL}samples/users-and-stats.json`
  },
  {
    label: "Nested catalog",
    path: `${import.meta.env.BASE_URL}samples/nested-catalog.json`
  },
  {
    label: "Edge cases",
    path: `${import.meta.env.BASE_URL}samples/edge-cases.json`
  },
  {
    label: "Large 2M rows (text with spaces)",
    path: `${import.meta.env.BASE_URL}samples/large-2m-rows-with-spaces.json`
  },
  {
    label: "Large Markdown notes (~1k lines)",
    path: `${import.meta.env.BASE_URL}samples/markdown-ops-notes-1000.md`
  },
  {
    label: "Large XML catalog (~1k lines)",
    path: `${import.meta.env.BASE_URL}samples/xml-catalog-1000.xml`
  },
  {
    label: "Large YAML config (~1k lines)",
    path: `${import.meta.env.BASE_URL}samples/yaml-config-1000.yaml`
  }
] as const;

export const themePresets: Array<{ name: string; value: JsonThemeOverride }> = [
  { name: "Default", value: {} },
  {
    name: "Warm Sand",
    value: {
      background: "#f8f2e6",
      rowHover: "#efe3cf",
      rowSelected: "#ddeaf9",
      key: "#7a3e0d",
      punctuation: "#5f5f57",
      string: "#00664b",
      number: "#1548a8",
      boolean: "#8d3100",
      null: "#69550a",
      focusRing: "#0046b8"
    }
  },
  {
    name: "Ocean Notebook",
    value: {
      background: "#edf5f7",
      rowHover: "#dcebef",
      rowSelected: "#c7def6",
      key: "#0f4668",
      punctuation: "#3f5c67",
      string: "#0a6a3d",
      number: "#1f3cae",
      boolean: "#8b3a1f",
      null: "#4e5f11",
      focusRing: "#2558d8"
    }
  },
  { name: "Monokai", value: monokaiTheme },
  { name: "VS Code Dark+", value: vscodeDarkTheme },
  { name: "Solarized Light", value: solarizedLightTheme },
  { name: "Solarized Dark", value: solarizedDarkTheme },
  { name: "Dracula", value: draculaTheme },
  { name: "Nord", value: nordTheme },
  { name: "One Dark", value: oneDarkTheme }
];

export type SearchHighlightMode = "default" | "left-rail" | "outline" | "underline" | "none";

export const searchHighlightOptions: Array<{ label: string; value: SearchHighlightMode }> = [
  { label: "Default fill", value: "default" },
  { label: "Left rail", value: "left-rail" },
  { label: "Dashed outline", value: "outline" },
  { label: "Underline", value: "underline" },
  { label: "None", value: "none" }
];

export type DemoScenario = {
  id: string;
  label: string;
  description: string;
  json: string;
  pathFilterQuery: string;
  searchQuery: string;
  metadata: boolean;
  showLineNumbers: boolean;
  sourceFormat: SourceFormat;
};

const filterSearchScenarioJson = `{
  "alpha": "one",
  "beta": "two",
  "gamma": "one"
}`;

export const demoScenarios: DemoScenario[] = [
  {
    id: "plain-filter-search-miss",
    label: "Plain: filter beta + search one",
    description: "Expect 0 matches in Live State.",
    json: filterSearchScenarioJson,
    pathFilterQuery: "beta",
    searchQuery: "one",
    metadata: false,
    showLineNumbers: true,
    sourceFormat: "json"
  },
  {
    id: "plain-filter-search-hit",
    label: "Plain: filter alpha gamma + search one",
    description: "Expect 2 matches in Live State.",
    json: filterSearchScenarioJson,
    pathFilterQuery: "alpha gamma",
    searchQuery: "one",
    metadata: false,
    showLineNumbers: true,
    sourceFormat: "json"
  }
];

export const DEBOUNCE_MS = 500;

export type FilterMode = "auto" | "prefix" | "includes" | "exact";

export const filterModeOptions: Array<{ label: string; value: PathFilterMode }> = [
  { label: "auto", value: "auto" },
  { label: "prefix", value: "prefix" },
  { label: "includes", value: "includes" },
  { label: "exact", value: "exact" }
];

export const sourceFormatOptions: Array<{ label: string; value: SourceFormat }> = [
  { label: "auto", value: "auto" },
  { label: "json", value: "json" },
  { label: "yaml", value: "yaml" },
  { label: "xml", value: "xml" },
  { label: "markdown", value: "markdown" },
  { label: "text", value: "text" }
];
