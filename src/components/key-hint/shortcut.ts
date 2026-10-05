/** Split conventional shortcut prefixes while preserving opaque/localized key names. */
export function shortcutKeys(shortcut: string): string[] {
  const keys: string[] = [];
  let rest = shortcut.trim();
  while (rest) {
    const modifier =
      /^(?:[⌘⌃⌥⇧]|(?:Ctrl|Control|Command|Cmd|Alt|Option|Shift|Meta|Mod|Win|Super)(?=[+\s]))\s*(?:\+\s*)?/i.exec(
        rest,
      );
    if (!modifier) break;
    keys.push(modifier[0].replace(/[+\s]+$/g, ''));
    rest = rest.slice(modifier[0].length);
  }
  if (rest) keys.push(rest);
  return keys;
}
