/**
 * The one scan for planning identifiers that the source guards of the companion, the shared
 * adapter core and every engine adapter run: comments and test titles cite spec node ids
 * (`uwg-te-…`) only and state each rule in words, and a test title may start with the ids of the
 * checks it evidences. The scan reads each source through the TypeScript parser, so that every
 * comment counts, at any position and over any number of lines, and every title of `describe`,
 * `it` and `test`, whatever line it starts on.
 */
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Identifiers of the planning records, which ship nowhere: requirement, check, decision, review,
 * package and milestone identifiers, review notes and section signs.
 */
export const PLANNING_ID = new RegExp(
  [
    String.raw`\b(?:A|B|C|CR|DD|G2|NR|P|R|S|SP|V)-\d+`,
    String.raw`\bCR-[A-Z]+\d*-\d+`,
    String.raw`\b(?i:decisions? \d+)`,
    String.raw`\bFIX-M\d`,
    String.raw`\b(?i:resolution \d+)`,
    String.raw`\b[BDEPQ]\d{1,2}[ab]?\b`,
    String.raw`\bR\d{2}\b`,
    String.raw`\bM\d{1,2}\b`,
    String.raw`\bsmoke issue\b`,
    String.raw`\bforkA\b`,
    String.raw`§`,
  ].join('|'),
  'u',
);

/**
 * The start of a test title that names the checks it evidences: check ids, each optionally with a
 * part letter or `unit part`, joined by commas or `and`, then a colon.
 */
export const CHECK_PREFIX =
  /^V-\d+(?: [a-z]| unit part)?(?:(?:, | and )V-\d+(?: [a-z]| unit part)?)*: /u;

/** The test functions whose first argument is a title. */
const TEST_FUNCTIONS: ReadonlySet<string> = new Set(['describe', 'it', 'test']);

/** The function a call starts from: `it` for `it(…)`, `it.each(…)(…)` and `describe.skip(…)`. */
function calleeName(expression: ts.Expression): string | null {
  let current: ts.Expression = expression;
  for (;;) {
    if (ts.isIdentifier(current)) return current.text;
    if (ts.isPropertyAccessExpression(current) || ts.isCallExpression(current))
      current = current.expression;
    else if (ts.isTaggedTemplateExpression(current)) current = current.tag;
    else return null;
  }
}

/** A source parsed as TypeScript. */
function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Every comment of a source, once each, in source order, with the line it starts on. */
function commentsOf(source: ts.SourceFile): { readonly line: number; readonly text: string }[] {
  const { text } = source;
  const found = new Map<number, string>();
  const add = (ranges: readonly ts.CommentRange[] | undefined) => {
    for (const range of ranges ?? []) found.set(range.pos, text.slice(range.pos, range.end));
  };
  // Every token's leading and trailing trivia, so that no comment between tokens is missed.
  const visit = (node: ts.Node) => {
    add(ts.getLeadingCommentRanges(text, node.pos));
    add(ts.getTrailingCommentRanges(text, node.end));
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  return [...found]
    .sort(([a], [b]) => a - b)
    .map(([pos, comment]) => ({
      line: source.getLineAndCharacterOfPosition(pos).line + 1,
      text: comment,
    }));
}

/** The titles of the `describe`, `it` and `test` calls of a source, with their kind and line. */
function titlesOf(
  source: ts.SourceFile,
): { readonly kind: string; readonly line: number; readonly text: string }[] {
  const titles: { kind: string; line: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const kind = calleeName(node.expression);
      const [title] = node.arguments;
      if (kind !== null && TEST_FUNCTIONS.has(kind) && title) {
        const text =
          ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)
            ? title.text
            : ts.isTemplateExpression(title)
              ? title.getText(source).slice(1, -1)
              : null;
        if (text !== null)
          titles.push({
            kind,
            line: source.getLineAndCharacterOfPosition(title.getStart(source)).line + 1,
            text,
          });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return titles;
}

/**
 * The comments and test titles of a source that cite a planning identifier, as `<label>:<line>:
 * <text>`; a title of `it` or `test` may start with the check ids it evidences (`CHECK_PREFIX`).
 * `label` names the file in the result, its path by default.
 */
export function planningCitations(file: string, label: string = file): string[] {
  const source = parse(file, readFileSync(file, 'utf8'));
  const cited = [
    ...commentsOf(source).filter(({ text }) => PLANNING_ID.test(text)),
    ...titlesOf(source).filter(({ kind, text }) =>
      PLANNING_ID.test(kind === 'describe' ? text : text.replace(CHECK_PREFIX, '')),
    ),
  ];
  return cited
    .sort((a, b) => a.line - b.line)
    .map(
      ({ line, text }) => `${label}:${String(line)}: ${text.replace(/\s+/gu, ' ').slice(0, 160)}`,
    );
}

/** The code of a source without its comments, for guards that look for a pattern in code. */
export function codeOf(file: string): string {
  const text = readFileSync(file, 'utf8');
  let code = '';
  let from = 0;
  for (const { start, end } of commentSpans(parse(file, text))) {
    code += text.slice(from, start);
    from = end;
  }
  return code + text.slice(from);
}

/** The spans of every comment of a source, in source order. */
function commentSpans(source: ts.SourceFile): { readonly start: number; readonly end: number }[] {
  const { text } = source;
  const spans = new Map<number, number>();
  const visit = (node: ts.Node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
    ])
      spans.set(range.pos, range.end);
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  return [...spans].sort(([a], [b]) => a - b).map(([start, end]) => ({ start, end }));
}

describe('the planning identifier scan', () => {
  const sample = new URL('./planning-ids.test.ts', import.meta.url).pathname;

  it('finds planning identifiers and leaves spec node ids alone', () => {
    for (const cited of [
      '// the rule of decision 12',
      '// Decision 24: the cells are cleared',
      'as Resolution 6 says',
      ' * C-030–C-033, CR-P3-1 and FIX-M4',
      '(D10)',
      '(Q2)',
      'the E6 guard',
      'R22',
      'P5a smoke issue 3',
      'Foundation §18.16',
      'S-10/11/12',
      'SC-D2',
      'G2-D21',
    ])
      expect(PLANNING_ID.test(cited), cited).toBe(true);
    for (const clean of [
      '`uwg-te-req-content-7`, `uwg-te-tab-actions` r3',
      '<p data-id="p1">',
      'Mod+Shift+z',
      'heading level 2',
    ])
      expect(PLANNING_ID.test(clean), clean).toBe(false);
  });

  it('admits the check ids a test title starts with, and only there', () => {
    for (const title of [
      'V-590: one text insert',
      'V-014 b: a part',
      'V-018 unit part: the stub half',
      'V-039, V-040 and V-041: three checks',
    ])
      expect(PLANNING_ID.test(title.replace(CHECK_PREFIX, '')), title).toBe(false);
    for (const title of ['V-039…V-044: a range', 'refuses it (V-12)', 'C-526: a requirement'])
      expect(PLANNING_ID.test(title.replace(CHECK_PREFIX, '')), title).toBe(true);
  });

  it('reads every comment and every title through the parser', () => {
    expect(planningCitations(sample)).toEqual([]);
    const code = codeOf(sample);
    expect(code).toContain('export function planningCitations');
    expect(code).not.toContain('/' + '**');
    expect(code).not.toContain('/' + '/ Every token');
  });
});
