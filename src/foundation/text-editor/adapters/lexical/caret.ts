/**
 * The marks a caret takes on Lexical (Widgets `uwg-te-lis-up-i2`, `uwg-te-tab-actions` r1,
 * `uwg-te-req-engine-12`).
 *
 * A caret takes the format and the colors of the text before it in its textblock: marks and colors
 * are inclusive at their end and exclusive at their start. At the start of a textblock, after a
 * hard break or after an inline node it takes none, even before a marked run, so text typed there
 * is plain. Links are elements here and never carry over at either edge. Format bits are the
 * engine's selection format; colors travel in the selection's style as custom properties, which a
 * text
 * transform moves into NodeState before anything renders (`marks.ts`), so text typed at the caret
 * takes them even where it starts a new text node: after a format change at the caret, beside a
 * link and after an inline node. A color set to `none` at the caret clears it for typed text.
 */
import { isTextEditorColor, type TextEditorColor } from '../../palette.js';
import type { LexicalPointLike, LexicalRangeSelectionLike, LexicalTextLike } from './modules.js';
import { $inlineUnits, $offsetIn, $textblockAt, type LexicalInlineUnit } from './points.js';
import type { LexicalRuntime } from './runtime.js';

/** The custom properties that carry colors at a caret in the selection's style. */
const CARET_PROPERTIES = Object.freeze({
  color: '--tp-te-text-color',
  highlight: '--tp-te-highlight',
});

/** A color at a caret: a hue, `none` to clear it, or absent to keep the text's. */
export interface LexicalCaretColors {
  readonly color?: TextEditorColor | 'none' | undefined;
  readonly highlight?: TextEditorColor | 'none' | undefined;
}

/** The caret colors that a style holds. */
export function readCaretColors(style: string): LexicalCaretColors {
  const colors: { color?: TextEditorColor | 'none'; highlight?: TextEditorColor | 'none' } = {};
  for (const declaration of style.split(';')) {
    const [name, value] = declaration.split(':').map((part) => part.trim());
    const hue = value === 'none' || isTextEditorColor(value) ? value : undefined;
    if (hue === undefined) continue;
    if (name === CARET_PROPERTIES.color) colors.color = hue;
    if (name === CARET_PROPERTIES.highlight) colors.highlight = hue;
  }
  return colors;
}

/** The style that carries caret colors. */
export function writeCaretColors(colors: LexicalCaretColors): string {
  return [
    colors.color ? `${CARET_PROPERTIES.color}: ${colors.color}` : '',
    colors.highlight ? `${CARET_PROPERTIES.highlight}: ${colors.highlight}` : '',
  ]
    .filter((part) => part !== '')
    .join('; ');
}

/** The colors a text node holds in NodeState, as caret colors that typed text would take. */
export function $nodeColors(rt: LexicalRuntime, node: LexicalTextLike): LexicalCaretColors {
  const color = rt.lexical.$getState(node, rt.states.color);
  const highlight = rt.lexical.$getState(node, rt.states.highlight);
  return {
    ...(isTextEditorColor(color) ? { color } : {}),
    ...(isTextEditorColor(highlight) ? { highlight } : {}),
  };
}

/** The format and colors of the text a caret continues. */
export interface LexicalCaretMarks {
  readonly format: number;
  readonly colors: LexicalCaretColors;
}

const PLAIN: LexicalCaretMarks = Object.freeze({ format: 0, colors: Object.freeze({}) });

/**
 * The marks a caret at a point takes: those of the text unit before it in its textblock; none at
 * the textblock's start or after a hard break or an inline node.
 */
export function $caretMarksAt(rt: LexicalRuntime, point: LexicalPointLike): LexicalCaretMarks {
  const found = $textblockAt(rt, point);
  if (!found) {
    const node = point.getNode();
    return rt.lexical.$isTextNode(node)
      ? { format: node.getFormat(), colors: $nodeColors(rt, node) }
      : PLAIN;
  }
  const offset = $offsetIn(rt, found.block, point);
  if (offset === null || offset === 0) return PLAIN;
  let taken: LexicalInlineUnit | undefined;
  let position = 0;
  for (const unit of $inlineUnits(rt, found.block)) {
    if (offset > position && offset <= position + unit.size) {
      taken = unit;
      break;
    }
    position += unit.size;
  }
  if (!taken || !taken.text || !rt.lexical.$isTextNode(taken.node)) return PLAIN;
  return { format: taken.node.getFormat(), colors: $nodeColors(rt, taken.node) };
}

/**
 * The colors text typed at a collapsed selection takes: those in its style, else those of the
 * text the caret continues; `none` leaves a channel out.
 */
export function $caretColors(
  rt: LexicalRuntime,
  selection: LexicalRangeSelectionLike,
): LexicalCaretColors {
  return { ...$caretMarksAt(rt, selection.anchor).colors, ...readCaretColors(selection.style) };
}

/** A caret color as a hue, or `undefined` for none. */
const hue = (value: TextEditorColor | 'none' | undefined): TextEditorColor | undefined =>
  value === 'none' ? undefined : value;

/**
 * The colors of the text node that text typed at a text point joins; none for an element point
 * and at the edge of a link, where the engine puts typed text in a new text node outside it.
 */
function $heldColors(rt: LexicalRuntime, point: LexicalPointLike): LexicalCaretColors {
  const node = point.getNode();
  if (point.type !== 'text' || !rt.lexical.$isTextNode(node)) return {};
  const parent = node.getParent();
  if (parent?.isInline()) {
    if (point.offset === 0 && node.getPreviousSibling() === null) return {};
    if (point.offset === node.getTextContentSize() && node.getNextSibling() === null) return {};
  }
  return $nodeColors(rt, node);
}

/**
 * The style that gives typed text `colors` where it lands at `point`: each hue, and `none` for a
 * channel the text node at the point holds that `colors` leave out.
 */
function caretStyle(held: LexicalCaretColors, colors: LexicalCaretColors): string {
  const color = hue(colors.color);
  const highlight = hue(colors.highlight);
  return writeCaretColors({
    color: color ?? (held.color ? 'none' : undefined),
    highlight: highlight ?? (held.highlight ? 'none' : undefined),
  });
}

/** Whether a text node's colors are those a caret style gives. */
const sameColors = (held: LexicalCaretColors, colors: LexicalCaretColors): boolean =>
  hue(held.color) === hue(colors.color) && hue(held.highlight) === hue(colors.highlight);

/**
 * Gives a collapsed selection the format and colors of the text it continues, as a caret placed
 * there takes them. The style stays empty where text typed into the text node at the caret keeps
 * those colors already, so typing there stays the engine's own.
 */
export function $seedCaret(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): void {
  const marks = $caretMarksAt(rt, selection.anchor);
  const held = $heldColors(rt, selection.anchor);
  selection.format = marks.format;
  selection.style = sameColors(held, marks.colors) ? '' : caretStyle(held, marks.colors);
}

/**
 * Before text is inserted at a collapsed selection: the style names the caret colors, so that
 * text the engine puts in a new text node (after a format change, beside a link, after an inline
 * node) takes them too.
 */
export function $colorTypedText(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): void {
  if (!selection.isCollapsed()) return;
  const style = caretStyle($heldColors(rt, selection.anchor), $caretColors(rt, selection));
  if (selection.style !== style) selection.style = style;
}

/**
 * After the text transform moved a style into a text node's colors: a caret in that node whose
 * style names the same colors drops it, so text typed next joins the node as the engine's own.
 */
export function $settleCaretStyle(rt: LexicalRuntime, node: LexicalTextLike): void {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return;
  if (selection.style === '' || selection.anchor.key !== node.getKey()) return;
  if (sameColors($nodeColors(rt, node), readCaretColors(selection.style))) selection.style = '';
}

/**
 * The engine's selection change from the DOM takes the format and style of the anchor's text node
 * (an element point keeps the format and drops the style); a caret that took them so takes the
 * adapter's caret marks instead. A stored caret format the engine kept (a format chosen at the
 * caret just before) differs from the node's and stays.
 */
export function $settleDomCaret(rt: LexicalRuntime): void {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return;
  const anchor = selection.anchor;
  const node = anchor.getNode();
  const fromNode = lexical.$isTextNode(node)
    ? anchor.type === 'text' &&
      selection.format === node.getFormat() &&
      selection.style === node.getStyle()
    : selection.style === '';
  if (!fromNode) return;
  const marks = $caretMarksAt(rt, anchor);
  const held = $heldColors(rt, anchor);
  const style = sameColors(held, marks.colors) ? '' : caretStyle(held, marks.colors);
  if (selection.format !== marks.format) selection.format = marks.format;
  if (selection.style !== style) selection.style = style;
}

/**
 * Registers the caret rule on the engine's selection changes from the DOM, and the caret colors
 * of text the engine inserts as controlled input.
 */
export function registerCaretMarks(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const CRITICAL = lexical.COMMAND_PRIORITY_CRITICAL;
  return lexical.mergeRegister(
    rt.engine.registerCommand(
      lexical.SELECTION_CHANGE_COMMAND,
      () => {
        $settleDomCaret(rt);
        return false;
      },
      CRITICAL,
    ),
    rt.engine.registerCommand(
      lexical.CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) $colorTypedText(rt, selection);
        return false;
      },
      CRITICAL,
    ),
  );
}

/**
 * Whether a collapsed selection carries a format or colors chosen at the caret, which differ from
 * those of the text it continues.
 */
export function $caretChosen(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): boolean {
  const marks = $caretMarksAt(rt, selection.anchor);
  return (
    selection.format !== marks.format || !sameColors(marks.colors, $caretColors(rt, selection))
  );
}

/**
 * Gives a collapsed selection a format and colors to type with, the colors named in its style so
 * that the text takes them wherever the engine puts it; `none` clears a channel.
 */
export function $typeWith(
  selection: LexicalRangeSelectionLike,
  format: number,
  colors: {
    readonly color?: TextEditorColor | undefined;
    readonly highlight?: TextEditorColor | undefined;
  },
): void {
  selection.format = format;
  selection.style = writeCaretColors({
    color: colors.color ?? 'none',
    highlight: colors.highlight ?? 'none',
  });
}
