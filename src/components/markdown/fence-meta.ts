/** Code block options from a fence's meta string: `title="a.ts"`, `{1,3-5}`, `showLineNumbers`. */
export interface FenceOptions {
  readonly title: string;
  readonly highlightLines: string;
  readonly lineNumbers: boolean;
}

export function fenceOptions(meta: string | null): FenceOptions {
  const source = meta ?? '';
  const title = /\btitle=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(source);
  const ranges = /\{([\d\s,-]+)\}/.exec(source);
  return {
    title: title?.[1] ?? title?.[2] ?? title?.[3] ?? '',
    highlightLines: ranges?.[1]?.replace(/\s+/g, '') ?? '',
    lineNumbers: /(?:^|\s)showLineNumbers(?:\s|$)/.test(source),
  };
}
