const trimOuterQuotes = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
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
  const tokens = tokenizeByWhitespace(query);

  if (tokens.length <= 1) {
    return tokens
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map((token) => {
        const unquoted = trimOuterQuotes(token);
        return unquoted.includes(" ") ? unquoted : token;
      });
  }

  return tokens
    .map((token) => trimOuterQuotes(token.trim()))
    .filter((token) => token.length > 0);
};