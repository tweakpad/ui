/**
 * Parity assertions of the engines page (Widgets `uwg-te-req-engine-12`, `uwg-te-lis-conf-i5`):
 * the same input on paired instances of different engines yields equal canonical HTML, Markdown
 * equal as mdast, equal text, the normalized state equal by path with block identifiers replaced
 * by their paths, equal block trees and geometry within 1 CSS pixel at equal width.
 * `assertParity` compares a pair as it is; `parity(scenario)` brings both instances to identical
 * states, runs a named or given scenario on both and compares after each step.
 */
import { parseMarkdown } from '../../../../src/foundation/markdown/block.js';
import type { TextEditorAction } from '../../../../src/foundation/text-editor/actions.js';
import {
  check,
  corpusOf,
  editorOf,
  fixture,
  report,
  resetEditor,
  settle,
  type Check,
  type FixtureEditorLike,
  type Report,
  type RunOptions,
} from './harness.js';

/** Geometry tolerance in CSS pixels. */
const TOLERANCE = 1;
/** State members that differ between engines without a difference in behavior. */
const DEFAULT_IGNORE = ['version', 'contentVersion', 'focused'];

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface BlockRecord {
  readonly id: string;
  readonly kind: string;
  readonly attrs: unknown;
  readonly parentId: string | null;
  readonly depth: number;
  readonly index: number;
  readonly children: readonly string[];
  readonly empty: boolean;
  readonly textblock: boolean;
}

/** What one instance holds, as plain data. */
export interface ParitySnapshot {
  readonly id: string;
  readonly status: string;
  readonly html: string;
  readonly markdown: string;
  readonly text: string;
  readonly state: unknown;
  readonly blocks: readonly BlockRecord[];
  /** The path of every block: its index, and its parent's path for a nested item (`2.0`). */
  readonly paths: Readonly<Record<string, string>>;
  /** Client rectangles relative to the editing root. */
  readonly geometry: {
    readonly width: number;
    readonly blocks: Readonly<Record<string, { box: Rect; content: Rect; firstLine: Rect } | null>>;
    readonly caret: Rect | null;
    readonly selection: readonly Rect[];
  };
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value ?? null)) as unknown;

function relative(rect: DOMRectReadOnly | null | undefined, origin: DOMRectReadOnly): Rect | null {
  if (!rect) return null;
  return {
    x: rect.x - origin.x,
    y: rect.y - origin.y,
    width: rect.width,
    height: rect.height,
  };
}

/** The current content, state, block tree and geometry of one instance. */
export function snapshot(id: string): ParitySnapshot {
  const editor = editorOf(id);
  const instance = editor.instance;
  const root = editor.root;
  if (!instance || !root || editor.status !== 'ready')
    throw new Error(`"${id}" is not ready (status ${editor.status}).`);
  const ordered = instance.getBlocks().ordered();
  const paths: Record<string, string> = {};
  for (const block of ordered)
    paths[block.id] =
      block.parentId === null ? String(block.index) : `${paths[block.parentId]}.${block.index}`;
  const origin = root.getBoundingClientRect();
  const blocks: Record<string, { box: Rect; content: Rect; firstLine: Rect } | null> = {};
  for (const block of ordered) {
    const rects = instance.blockRects(block.id);
    blocks[block.id] = rects
      ? {
          box: relative(rects.box, origin)!,
          content: relative(rects.content, origin)!,
          firstLine: relative(rects.firstLine, origin)!,
        }
      : null;
  }
  return {
    id,
    status: editor.status,
    html: String(editor.getContent('html')),
    markdown: String(editor.getContent('markdown')),
    text: String(editor.getContent('text')),
    state: plain(instance.getState()),
    blocks: ordered.map((block) => ({
      id: block.id,
      kind: block.kind,
      attrs: plain(block.attrs),
      parentId: block.parentId,
      depth: block.depth,
      index: block.index,
      children: [...block.children],
      empty: block.empty,
      textblock: block.textblock,
    })),
    paths,
    geometry: {
      width: origin.width,
      blocks,
      caret: relative(instance.caretRect(), origin),
      selection: instance.selectionRects().map((rect) => relative(rect, origin)!),
    },
  };
}

// Normalization -----------------------------------------------------------------------------

/**
 * Identifier names per instance: an identifier that both instances hold at the same path keeps
 * its value (kept identifiers compare by value), any other becomes `@<path>` (generated ones
 * compare by position).
 */
function identifierNames(a: ParitySnapshot, b: ParitySnapshot) {
  const names = (own: ParitySnapshot, other: ParitySnapshot) => {
    const map = new Map<string, string>();
    for (const [id, path] of Object.entries(own.paths))
      map.set(id, other.paths[id] === path ? id : `@${path}`);
    return map;
  };
  return { a: names(a, b), b: names(b, a) };
}

function renameIds(value: unknown, names: ReadonlyMap<string, string>): unknown {
  if (typeof value === 'string') return names.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => renameIds(item, names));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renameIds(item, names)]),
    );
  return value;
}

function renameHtml(html: string, names: ReadonlyMap<string, string>): string {
  return html.replace(/data-id="([^"]*)"/g, (_, id: string) => `data-id="${names.get(id) ?? id}"`);
}

/** Markdown as mdast without source positions. */
function mdast(markdown: string): unknown {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'position')
          .map(([key, item]) => [key, strip(item)]),
      );
    return value;
  };
  return strip(parseMarkdown(markdown));
}

/** Paths at which two plain values differ, at most `limit` of them. */
export function differences(a: unknown, b: unknown, path = '', limit = 12): string[] {
  const found: string[] = [];
  const walk = (left: unknown, right: unknown, at: string) => {
    if (found.length >= limit) return;
    if (Object.is(left, right)) return;
    const leftObject = left !== null && typeof left === 'object';
    const rightObject = right !== null && typeof right === 'object';
    if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
      found.push(`${at || '(root)'}: ${JSON.stringify(left)} ≠ ${JSON.stringify(right)}`);
      return;
    }
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys)
      walk(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
        at ? `${at}.${key}` : key,
      );
  };
  walk(a, b, path);
  return found;
}

function omit(value: unknown, keys: readonly string[]): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function rectDifferences(a: Rect | null, b: Rect | null, at: string): string[] {
  if (!a || !b) return a === b ? [] : [`${at}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`];
  const out: string[] = [];
  for (const key of ['x', 'y', 'width', 'height'] as const)
    if (Math.abs(a[key] - b[key]) > TOLERANCE)
      out.push(`${at}.${key}: ${a[key].toFixed(2)} ≠ ${b[key].toFixed(2)}`);
  return out;
}

export interface ParityOptions {
  /** The pair `tiptap-<pair>` and `lexical-<pair>`; default `default`. */
  readonly pair?: string | undefined;
  /** Two instance ids instead of a pair. */
  readonly ids?: readonly [string, string] | undefined;
  /** Compare geometry; default true. */
  readonly geometry?: boolean | undefined;
  /** State members left out of the comparison; default `version`, `contentVersion`, `focused`. */
  readonly ignore?: readonly string[] | undefined;
  /** A label echoed in the records, such as the V id of the rule the comparison checks. */
  readonly label?: string | undefined;
}

export function pairIds(options: ParityOptions = {}): readonly [string, string] {
  if (options.ids) return options.ids;
  const pair = options.pair ?? 'default';
  return [`tiptap-${pair}`, `lexical-${pair}`];
}

/** Compares two snapshots as `assertParity` does. */
export function compareSnapshots(
  a: ParitySnapshot,
  b: ParitySnapshot,
  options: ParityOptions = {},
): Check[] {
  const names = identifierNames(a, b);
  const ignore = options.ignore ?? DEFAULT_IGNORE;
  const prefix = options.label ? `${options.label}: ` : '';
  const htmlA = renameHtml(a.html, names.a);
  const htmlB = renameHtml(b.html, names.b);
  const state = differences(
    omit(renameIds(a.state, names.a), ignore),
    omit(renameIds(b.state, names.b), ignore),
  );
  const tree = differences(renameIds(a.blocks, names.a), renameIds(b.blocks, names.b));
  const markdown = differences(mdast(a.markdown), mdast(b.markdown));
  const checks: Check[] = [
    check(
      `${prefix}canonical HTML equal`,
      htmlA === htmlB,
      htmlA === htmlB ? null : { a: htmlA, b: htmlB },
    ),
    check(`${prefix}Markdown equal as mdast`, markdown.length === 0, markdown),
    check(
      `${prefix}text equal`,
      a.text === b.text,
      a.text === b.text ? null : { a: a.text, b: b.text },
    ),
    check(`${prefix}normalized state equal by path`, state.length === 0, state),
    check(`${prefix}block trees equal`, tree.length === 0, tree),
  ];
  if (options.geometry !== false) {
    const widths = Math.abs(a.geometry.width - b.geometry.width) <= TOLERANCE;
    const geometry: string[] = [];
    if (widths) {
      const byName = (side: ParitySnapshot, own: ReadonlyMap<string, string>) =>
        new Map(
          Object.entries(side.geometry.blocks).map(([id, rects]) => [own.get(id) ?? id, rects]),
        );
      const blocksA = byName(a, names.a);
      const blocksB = byName(b, names.b);
      for (const [name, rects] of blocksA) {
        if (!blocksB.has(name)) continue;
        const against = blocksB.get(name)!;
        const at = `block ${name}`;
        if (!rects || !against) {
          if (rects !== against) geometry.push(`${at}: measurable on one engine only`);
          continue;
        }
        geometry.push(
          ...rectDifferences(rects.box, against.box, `${at}.box`),
          ...rectDifferences(rects.content, against.content, `${at}.content`),
          ...rectDifferences(rects.firstLine, against.firstLine, `${at}.firstLine`),
        );
      }
      geometry.push(...rectDifferences(a.geometry.caret, b.geometry.caret, 'caret'));
      if (a.geometry.selection.length !== b.geometry.selection.length)
        geometry.push(
          `selection rects: ${a.geometry.selection.length} ≠ ${b.geometry.selection.length}`,
        );
      else
        a.geometry.selection.forEach((rect, index) =>
          geometry.push(
            ...rectDifferences(rect, b.geometry.selection[index]!, `selection.${index}`),
          ),
        );
    }
    checks.push(
      check(`${prefix}equal width`, widths, { a: a.geometry.width, b: b.geometry.width }),
      check(
        `${prefix}geometry within ${TOLERANCE} px`,
        widths && geometry.length === 0,
        geometry.slice(0, 12),
      ),
    );
  }
  return checks;
}

/** Compares a ready pair as it is, after the next publication. */
export async function assertParity(options: ParityOptions = {}): Promise<Report> {
  const [first, second] = pairIds(options);
  await settle();
  const a = snapshot(first);
  const b = snapshot(second);
  return report(compareSnapshots(a, b, options), {
    label: options.label ?? null,
    ids: [first, second],
    html: a.html === b.html ? a.html : { a: a.html, b: b.html },
  });
}

// Scenarios -----------------------------------------------------------------------------------

/** A step of a scenario, run on each instance of the pair in turn. */
export type ParityStep =
  | {
      readonly run: string | TextEditorAction | readonly TextEditorAction[];
      readonly value?: unknown;
      readonly focus?: boolean;
    }
  | { readonly setContent: string; readonly format?: 'html' | 'markdown' | 'text' }
  | { readonly reset: string }
  | ((editor: FixtureEditorLike) => unknown);

export interface ParityScenario extends ParityOptions {
  readonly name?: string | undefined;
  /** A corpus document both instances start from. */
  readonly corpus?: string | undefined;
  /** HTML both instances start from, through `restoreContent`. */
  readonly html?: string | undefined;
  readonly steps?: readonly ParityStep[] | undefined;
}

/** Named scenarios that other modules add (`api.ts` adds `actions`, `can` and `tools`). */
export const parityScenarios = new Map<string, (options: ParityOptions) => Promise<Report>>();

async function runStep(editor: FixtureEditorLike, step: ParityStep): Promise<unknown> {
  if (typeof step === 'function') return await step(editor);
  if ('run' in step) {
    const options: RunOptions = { value: step.value, focus: step.focus };
    return editor.run(step.run, options).catch((error: unknown) => ({
      rejected:
        error instanceof Error || error instanceof DOMException ? error.name : String(error),
    }));
  }
  if ('setContent' in step)
    return editor.setContent(step.setContent, step.format ?? 'html').catch((error: unknown) => ({
      rejected:
        error instanceof Error || error instanceof DOMException ? error.name : String(error),
    }));
  await resetEditor(editor.id, step.reset);
  return 'reset';
}

/** The pair used for a corpus document: `custom` when the document needs the corpus nodes. */
function pairFor(name: string, options: ParityOptions): ParityOptions {
  if (options.ids || options.pair) return options;
  return corpusOf(name).custom ? { ...options, pair: 'custom' } : options;
}

/**
 * Runs a scenario on both instances of a pair from identical states and compares them after
 * each step: a corpus document name (both reset from it), `corpus` (every document), a scenario
 * that `parityScenarios` names, or a scenario object with `corpus` or `html` and `steps`.
 */
export async function parity(
  scenario: string | ParityScenario,
  options: ParityOptions = {},
): Promise<Report> {
  if (typeof scenario === 'string') {
    const named = parityScenarios.get(scenario);
    if (named) return named(options);
    if (scenario === 'corpus') {
      const checks: Check[] = [];
      const records: Record<string, unknown> = {};
      for (const name of fixture.corpus.keys()) {
        const result = await parity({ corpus: name, ...pairFor(name, options), label: name });
        checks.push(...result.checks);
        records[name] = result.passed;
      }
      return report(checks, records);
    }
    if (fixture.corpus.has(scenario))
      return parity({ corpus: scenario, ...pairFor(scenario, options), label: scenario });
    throw new Error(`No parity scenario "${scenario}".`);
  }
  const merged: ParityScenario = { ...scenario, ...options };
  const [first, second] = pairIds(merged);
  const editors = [editorOf(first), editorOf(second)];
  const outcomes: unknown[][] = [[], []];
  for (const editor of editors) {
    await editor.settled();
    if (merged.corpus) await resetEditor(editor.id, merged.corpus);
    else if (merged.html !== undefined) {
      await editor.restoreContent(merged.html, 'html');
      await settle();
    }
  }
  const checks: Check[] = [];
  const label = merged.label ?? merged.name ?? merged.corpus ?? 'scenario';
  const start = await assertParity({ ...merged, label: `${label} start` });
  checks.push(...start.checks);
  const steps = merged.steps ?? [];
  for (const [index, step] of steps.entries()) {
    for (const [side, editor] of editors.entries()) {
      outcomes[side]!.push(await runStep(editor, step));
      await settle();
    }
    checks.push(
      check(
        `${label} step ${index + 1}: equal outcomes`,
        JSON.stringify(outcomes[0]![index]) === JSON.stringify(outcomes[1]![index]),
        { a: outcomes[0]![index], b: outcomes[1]![index] },
      ),
    );
    const compared = await assertParity({ ...merged, label: `${label} step ${index + 1}` });
    checks.push(...compared.checks);
  }
  return report(checks, { ids: [first, second], outcomes });
}
