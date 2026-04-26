export const toPrettyLines = (json: string): string[] => {
  if (json.includes("\n") || json.includes("\r")) {
    return json.split(/\r?\n/);
  }

  try {
    return JSON.stringify(JSON.parse(json), null, 2).split(/\r?\n/);
  } catch {
    return json.split(/\r?\n/);
  }
};
