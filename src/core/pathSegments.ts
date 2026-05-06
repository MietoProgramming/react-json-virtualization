const unescapePathSegment = (value: string): string => {
    return value.replace(/\\(["\\])/g, "$1");
};

export const parentPath = (path: string): string | null => {
    if (path === "$") {
        return null;
    }

    if (path.endsWith("]")) {
        const index = path.lastIndexOf("[");
        if (index <= 0) {
            return "$";
        }
        return path.slice(0, index);
    }

    const dotIndex = path.lastIndexOf(".");
    if (dotIndex <= 0) {
        return "$";
    }
    return path.slice(0, dotIndex);
};

export const getPathSegments = (path: string): string[] => {
    if (path === "$") {
        return [];
    }

    const segments: string[] = [];
    let index = path.startsWith("$") ? 1 : 0;

    while (index < path.length) {
        const char = path[index];

        if (char === ".") {
            index += 1;
            const start = index;
            while (index < path.length && path[index] !== "." && path[index] !== "[") {
                index += 1;
            }
            const segment = path.slice(start, index);
            if (segment.length > 0) {
                segments.push(segment);
            }
            continue;
        }

        if (char === "[") {
            index += 1;
            if (path[index] === "\"") {
                index += 1;
                let segment = "";
                while (index < path.length) {
                    const token = path[index];
                    if (token === "\\" && index + 1 < path.length) {
                        segment += path[index + 1];
                        index += 2;
                        continue;
                    }
                    if (token === "\"") {
                        index += 1;
                        break;
                    }
                    segment += token;
                    index += 1;
                }
                segment = unescapePathSegment(segment);
                while (index < path.length && path[index] !== "]") {
                    index += 1;
                }
                if (index < path.length && path[index] === "]") {
                    index += 1;
                }
                if (segment.length > 0) {
                    segments.push(segment);
                }
            } else {
                const start = index;
                while (index < path.length && path[index] !== "]") {
                    index += 1;
                }
                const segment = path.slice(start, index);
                if (segment.length > 0) {
                    segments.push(segment);
                }
                if (index < path.length && path[index] === "]") {
                    index += 1;
                }
            }
            continue;
        }

        index += 1;
    }

    return segments;
};

export const getNormalizedPathSegments = (path: string, caseSensitive: boolean): string[] => {
    const segments = getPathSegments(path);
    if (caseSensitive) {
        return segments;
    }
    return segments.map((segment) => segment.toLowerCase());
};
