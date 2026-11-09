type DiffOp = "equal" | "insert" | "delete";

interface DiffPart {
  op: DiffOp;
  text: string;
}

/** Splits into words and the whitespace between them, so joins are lossless. */
function diffTokens(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

/**
 * Word-level diff using a longest common subsequence table.
 * Paragraphs are short, so the O(n*m) table is fine.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = diffTokens(before);
  const b = diffTokens(after);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * cols + j] =
        a[i] === b[j]
          ? (table[(i + 1) * cols + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * cols + j] ?? 0, table[i * cols + j + 1] ?? 0);
    }
  }

  const parts: DiffPart[] = [];
  const push = (op: DiffOp, text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.op === op) last.text += text;
    else parts.push({ op, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const tokenA = a[i] ?? "";
    const tokenB = b[j] ?? "";
    if (tokenA === tokenB) {
      push("equal", tokenA);
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * cols + j] ?? 0) >= (table[i * cols + j + 1] ?? 0)) {
      push("delete", tokenA);
      i += 1;
    } else {
      push("insert", tokenB);
      j += 1;
    }
  }
  while (i < a.length) push("delete", a[i++] ?? "");
  while (j < b.length) push("insert", b[j++] ?? "");
  return parts;
}
