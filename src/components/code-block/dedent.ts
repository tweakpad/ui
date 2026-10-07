/** Removes a leading and trailing blank line and the indentation every line shares. */
export function dedentCode(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[0]!.trim()) lines.shift();
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length),
  );
  return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n');
}
