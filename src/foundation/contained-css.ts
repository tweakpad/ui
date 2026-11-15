/**
 * Whether CSS text keeps to one block: its braces balance outside comments and strings, never
 * closing more than they opened, and every comment and string ends. Text that fails could close
 * the rule it is nested in and reach outside it.
 */
export function isContainedCss(css: string): boolean {
  let depth = 0;
  let index = 0;
  while (index < css.length) {
    const char = css[index]!;
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2);
      if (end < 0) return false;
      index = end + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      index += 1;
      while (index < css.length && css[index] !== char) {
        if (css[index] === '\n') return false;
        index += css[index] === '\\' ? 2 : 1;
      }
      if (index >= css.length) return false;
    } else if (char === '\\') index += 1;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth < 0) return false;
    index += 1;
  }
  return depth === 0;
}
