const hasUnescapedInnerQuote = (value: string): boolean => {
  for (let index = 1; index < value.length - 1; index += 1) {
    if (value[index] === '"' && value[index - 1] !== "\\") {
      return true;
    }
  }
  return false;
};

const trimOuterQuotes = (value: string): string => {
  if (
    value.length >= 2 &&
    value.startsWith('"') &&
    value.endsWith('"') &&
    !hasUnescapedInnerQuote(value)
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const tokenizeByWhitespace = (query: string): string[] => {
  const tokens: string[] = [];
  let token = "";
  let inQuotes = false;

  for (let index = 0; index < query.length; index += 1) {
    const char = query[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      token += char;
      continue;
    }

    if (/\s/.test(char) && !inQuotes) {
      const nextToken = token.trim();
      if (nextToken.length > 0) {
        tokens.push(nextToken);
      }
      token = "";
      continue;
    }

    token += char;
  }

  const nextToken = token.trim();
  if (nextToken.length > 0) {
    tokens.push(nextToken);
  }

  return tokens;
};

export const splitFilterQueryTerms = (query: string): string[] => {
  return tokenizeByWhitespace(query)
    .map((token) => trimOuterQuotes(token.trim()))
    .filter((token) => token.length > 0);
};