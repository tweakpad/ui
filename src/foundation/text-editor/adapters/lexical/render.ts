/**
 * The DOM render overrides of the Lexical adapter (Widgets `uwg-te-tab-vocabulary`,
 * `uwg-te-req-pres-2`, `uwg-te-req-content-2`, `uwg-te-req-engine-9`, `uwg-te-req-tables-1`). The
 * only module that uses the engine's experimental `DOMRenderExtension` and `domOverride`.
 *
 * - A task item holds its native checkbox in a non-editable marker, named by the widget's label;
 *   the engine's `role="checkbox"`, `aria-checked` and `tabindex` on the item are removed and the
 *   native toggle is prevented, since the widget owns the toggle.
 * - The engine nests a list in an item of its own (`tp-te-nested-item`) after its parent item; that
 *   wrapper draws no marker (base CSS), so that it shows no bullet of its own.
 * - Every list item gets `dir="auto"`, which the engine writes only on children of the root; a
 *   task list carries only `tp-te-list-task`, a bullet list `tp-te-list-bullet`.
 * - Text colors paint `tp-te-color` with `data-color`, highlights `tp-te-highlight` with
 *   `data-color` on the highlight element, and cell backgrounds `data-background`: names only,
 *   never a `style` or a literal color.
 * - `tp-te-code`, `tp-te-sub` and `tp-te-sup` sit on the semantic element (`code`, `sub`, `sup`),
 *   where the engine's theme puts them on the inner text element; a highlighted subscript or
 *   superscript gets its `sub` or `sup` element around its text, which the engine renders without
 *   one. Code elements render no `spellcheck`, as the other engine's do not. Struck text, a classed
 *   element here, has the `deletion` role of the other engine's `s` element.
 * - Direction: lists, table wrappers, rows and cells carry no `dir`, which the engine writes on
 *   the children of the root and on rows and cells, so that they are laid out in the widget's
 *   direction; dividers carry `dir="auto"` as every block element does.
 * - A table with committed column widths is as wide as their sum, one without widths sizes its
 *   columns automatically, as the other engine's table view sizes it; a table that does not hold a
 *   cell range is never painted as one, which the engine does for a selected table.
 */
import { DEFAULT_HIGHLIGHT, LEXICAL_FORMAT } from './mapping.js';
import type {
  LexicalDomOverrideConfigLike,
  LexicalDomSlotLike,
  LexicalExtensionArgumentLike,
  LexicalKlassLike,
  LexicalListItemLike,
  LexicalListLike,
  LexicalNodeLike,
  LexicalTextLike,
} from './modules.js';
import { writeContentTabStop, writeTaskCheckboxDisabled } from '../shared/content-stops.js';
import type { LexicalRuntime } from './runtime.js';
import { LEXICAL_CLASSES } from './theme.js';

const toggleClass = (element: Element, name: string, on: boolean): void => {
  if (element.classList.contains(name) !== on) element.classList.toggle(name, on);
};

const writeAttribute = (element: Element, name: string, value: string | null): void => {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};

/** Paints a text node's colors: the highlight on its highlight element, the color inside it. */
export function paintText(rt: LexicalRuntime, node: LexicalTextLike, dom: HTMLElement): void {
  const { lexical, states } = rt;
  const highlighted = (node.getFormat() & LEXICAL_FORMAT.highlight) !== 0;
  const highlight = highlighted
    ? lexical.$getState(node, states.highlight) || DEFAULT_HIGHLIGHT
    : null;
  const color = lexical.$getState(node, states.color) || null;
  // The engine nests an inner element in an outer one (`mark`, `code`, `sub`, `sup`); a highlight
  // always has the outer `mark`, which carries its hue, and the color goes on the inner element.
  const nested = dom.firstElementChild;
  const outer = nested !== null && dom.childNodes.length === 1 ? dom : null;
  const inner = (outer ? nested : dom) as Element;
  if (outer) {
    toggleClass(outer, LEXICAL_CLASSES.highlight, highlight !== null);
    writeAttribute(outer, 'data-color', highlight);
  }
  toggleClass(inner, LEXICAL_CLASSES.color, color !== null);
  writeAttribute(inner, 'data-color', color);
}

// Semantic text elements (`uwg-te-tab-vocabulary`)

/** The outer elements the engine renders around a text node's inner element. */
const OUTER_TAGS: ReadonlySet<string> = new Set(['CODE', 'MARK', 'SUB', 'SUP']);

/** The formats whose class belongs on their own element. */
const SEMANTIC = Object.freeze([
  { bit: LEXICAL_FORMAT.code, tag: 'CODE', name: 'tp-te-code' },
  { bit: LEXICAL_FORMAT.subscript, tag: 'SUB', name: 'tp-te-sub' },
  { bit: LEXICAL_FORMAT.superscript, tag: 'SUP', name: 'tp-te-sup' },
] as const);

/** The `sub` or `sup` element the adapter put around the text of an inner element, or `null`. */
function textWrapper(inner: Element): Element | null {
  const first = inner.firstElementChild;
  return first !== null &&
    (first.tagName === 'SUB' || first.tagName === 'SUP') &&
    inner.childNodes.length === 1
    ? first
    : null;
}

/**
 * Arranges the elements of a text node's DOM for its format: the code, subscript and superscript
 * classes on their `code`, `sub` or `sup` element, a `sub` or `sup` element around the text of a
 * highlighted subscript or superscript (inside the engine's inner element, which stays its first
 * child), no `spellcheck` on inline code, and the `deletion` role on struck text, whose element
 * carries `tp-te-strike`.
 */
export function arrangeText(dom: HTMLElement, format: number): void {
  const outer = OUTER_TAGS.has(dom.tagName) && dom.firstElementChild !== null ? dom : null;
  const inner = outer ? dom.firstElementChild! : dom;
  if (outer?.tagName === 'CODE') writeAttribute(outer, 'spellcheck', null);
  // Struck text is a deletion, as the other engine's `s` element is (`uwg-te-req-a11y-1`).
  writeAttribute(inner, 'role', format & LEXICAL_FORMAT.strike ? 'deletion' : null);
  const wanted =
    outer?.tagName === 'MARK'
      ? format & LEXICAL_FORMAT.subscript
        ? 'SUB'
        : format & LEXICAL_FORMAT.superscript
          ? 'SUP'
          : null
      : null;
  let wrapper = textWrapper(inner);
  if (wrapper && wrapper.tagName !== wanted) {
    inner.append(...Array.from(wrapper.childNodes));
    wrapper.remove();
    wrapper = null;
  }
  if (wanted && !wrapper) {
    wrapper = inner.ownerDocument.createElement(wanted.toLowerCase());
    wrapper.append(...Array.from(inner.childNodes));
    inner.append(wrapper);
  }
  for (const { bit, tag, name } of SEMANTIC) {
    const native = outer?.tagName === tag ? outer : wrapper?.tagName === tag ? wrapper : null;
    if (!native) continue;
    const on = (format & bit) !== 0;
    if (on) toggleClass(inner, name, false);
    toggleClass(native, name, on);
  }
}

/** The DOM slot of a text node's text: the `sub` or `sup` element the adapter put around it. */
function textSlot(dom: HTMLElement, slot: LexicalDomSlotLike): LexicalDomSlotLike {
  const wrapper = textWrapper(dom);
  return wrapper ? slot.withElement(wrapper) : slot;
}

// Blocks

/** A divider is a block element: it carries `dir="auto"`. */
export function paintDivider(dom: HTMLElement): void {
  writeAttribute(dom, 'dir', 'auto');
}

/** A code block renders no `spellcheck` attribute, as the other engine's does not. */
export function paintCodeBlock(dom: HTMLElement): void {
  writeAttribute(dom, 'spellcheck', null);
}

/**
 * The table's scroll wrapper carries no `dir`, and the table is sized as the other engine sizes it
 * (`uwg-te-req-tables-1`): without column widths its columns size automatically, with no minimum
 * width; with committed widths (each at least 48 CSS pixels) the table is as wide as their sum.
 * CSSOM writes only.
 */
export function sizeTable(dom: HTMLElement, widths: readonly number[] | undefined): void {
  writeAttribute(dom, 'dir', null);
  const table = dom.tagName === 'TABLE' ? dom : dom.querySelector('table');
  if (!table) return;
  const { style } = table;
  style.removeProperty('min-width');
  if (widths && widths.length > 0)
    style.setProperty('width', `${widths.reduce((sum, width) => sum + width, 0)}px`);
  else style.removeProperty('width');
}

/**
 * Removes the cell-range paint (`tp-te-cell-selected`, `tp-te-table-selection`) from every table
 * in the root but the one whose element `kept` holds the cell range.
 */
export function clearTablePaint(root: HTMLElement, kept: HTMLElement | null): void {
  const painted = root.querySelectorAll(
    `.${LEXICAL_CLASSES.cellSelected}, .${LEXICAL_CLASSES.tableSelection}`,
  );
  for (const element of Array.from(painted)) {
    if (kept?.contains(element)) continue;
    toggleClass(element, LEXICAL_CLASSES.cellSelected, false);
    toggleClass(element, LEXICAL_CLASSES.tableSelection, false);
  }
}

/**
 * Registers the removal of the engine's cell-range paint from a table that holds no cell range: a
 * block selection of the table or a range over all of it paints like one in the engine.
 */
export function registerTablePaint(rt: LexicalRuntime): () => void {
  const editor = rt.engine;
  const module = rt.modules.table;
  if (!module) return () => undefined;
  const selector = `.${LEXICAL_CLASSES.cellSelected}, .${LEXICAL_CLASSES.tableSelection}`;
  return editor.registerUpdateListener(({ editorState }) => {
    const root = editor.getRootElement();
    if (!root?.querySelector(selector)) return;
    const key = editorState.read(() => {
      const selection = rt.lexical.$getSelection();
      return module.$isTableSelection(selection) ? selection.tableKey : null;
    });
    clearTablePaint(root, key === null ? null : editor.getElementByKey(key));
  });
}

/** Classes of a list: exactly one of the bullet, ordered and task classes; no `dir`. */
export function paintList(list: LexicalListLike, dom: HTMLElement): void {
  writeAttribute(dom, 'dir', null);
  const type = list.getListType();
  toggleClass(dom, LEXICAL_CLASSES.list, true);
  toggleClass(dom, LEXICAL_CLASSES.bulletList, type === 'bullet');
  toggleClass(dom, LEXICAL_CLASSES.taskList, type === 'check');
}

/** Whether a list item is a task item: an item of a check list that holds no nested list. */
function isTaskItem(rt: LexicalRuntime, item: LexicalListItemLike): boolean {
  const parent = item.getParent();
  return (
    rt.isList(parent) &&
    parent.getListType() === 'check' &&
    !item.getChildren().some((child) => rt.isList(child))
  );
}

const markerOf = (dom: HTMLElement): HTMLElement | null =>
  dom.querySelector(`:scope > .${LEXICAL_CLASSES.taskMarker}`);

/**
 * A list item is a block element: it carries `dir="auto"` (`uwg-te-req-pres-2`). The engine's
 * direction step removes `dir` from every element below the top level after creating it and after
 * moving it, so the decorate hook, which runs last, writes it again.
 */
export function paintListItemDirection(dom: HTMLElement): void {
  writeAttribute(dom, 'dir', 'auto');
}

/** The marker of a task item, the item's element and its attributes as the vocabulary has them. */
export function syncListItem(
  rt: LexicalRuntime,
  item: LexicalListItemLike,
  dom: HTMLElement,
  label: string,
): void {
  paintListItemDirection(dom);
  writeAttribute(dom, 'role', null);
  writeAttribute(dom, 'aria-checked', null);
  writeAttribute(dom, 'tabindex', null);
  const task = isTaskItem(rt, item);
  if (!task) {
    toggleClass(dom, LEXICAL_CLASSES.taskItem, false);
    toggleClass(dom, LEXICAL_CLASSES.checked, false);
    markerOf(dom)?.remove();
    return;
  }
  let marker = markerOf(dom);
  if (!marker) {
    const document = dom.ownerDocument;
    marker = document.createElement('span');
    marker.className = LEXICAL_CLASSES.taskMarker;
    marker.setAttribute('contenteditable', 'false');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.draggable = false;
    // The widget toggles task items; the native toggle never changes the checkbox by itself.
    input.addEventListener('click', (event) => event.preventDefault());
    marker.append(input);
    dom.prepend(marker);
  }
  const input = marker.querySelector('input');
  if (input) {
    input.checked = item.getChecked() === true;
    writeAttribute(input, 'aria-label', label);
    writeTaskCheckboxDisabled(input, !rt.contentStopsActive);
  }
}

/** A table's scroll wrapper is a content stop; the table element of an unwrapped table is not. */
function paintTableWrapper(rt: LexicalRuntime, dom: HTMLElement): void {
  if (dom.tagName !== 'TABLE') writeContentTabStop(dom, rt.contentStopsActive);
}

/**
 * Writes the content stops of the editing root for the runtime's answer: links and table
 * wrappers leave the sequential order and task checkboxes are disabled while the stops are not
 * active (`uwg-te-req-prop-3`). The engine's observer ignores attributes, so neither write is a
 * content change.
 */
export function repaintContentStops(rt: LexicalRuntime, root: Element): void {
  const active = rt.contentStopsActive;
  const classes = (element: Element) => (element.getAttribute('class') ?? '').split(/\s+/u);
  const visit = (element: Element, inMarker: boolean): void => {
    for (const child of Array.from(element.children)) {
      const names = classes(child);
      if (names.includes('tp-te-link') || names.includes('tp-te-table-wrapper'))
        writeContentTabStop(child, active);
      else if (inMarker && child.tagName.toUpperCase() === 'INPUT')
        writeTaskCheckboxDisabled(child as HTMLInputElement, !active);
      visit(child, names.includes(LEXICAL_CLASSES.taskMarker));
    }
  };
  visit(root, false);
}

/** The cell background name; a cell carries no `dir`. */
export function paintCell(rt: LexicalRuntime, cell: LexicalNodeLike, dom: HTMLElement): void {
  writeAttribute(dom, 'dir', null);
  writeAttribute(dom, 'data-background', rt.lexical.$getState(cell, rt.states.background) || null);
}

/**
 * A table row carries no `dir`: an `auto` direction resolves to left-to-right on a row whose
 * cells hold their own text, where the row must be laid out in the widget's direction
 * (`uwg-te-req-pres-2`).
 */
export function paintRow(dom: HTMLElement): void {
  writeAttribute(dom, 'dir', null);
}

/** The DOM render overrides of a mount; each acts on the nodes of its class. */
function lexicalRenderOverrides(
  rt: LexicalRuntime,
  labels: { readonly taskCheckbox: string },
): unknown[] {
  const { lexical, modules } = rt;
  const override = (
    klass: LexicalKlassLike,
    config: LexicalDomOverrideConfigLike<LexicalNodeLike>,
  ) => modules.html.domOverride([klass], config);
  const overrides = [
    override(lexical.TextNode, {
      $createDOM: (node, $next) => {
        const dom = $next();
        if (lexical.$isTextNode(node)) arrangeText(dom, node.getFormat());
        return dom;
      },
      $updateDOM: (node, _prev, dom, $next) => {
        if ($next()) return true;
        if (lexical.$isTextNode(node)) arrangeText(dom, node.getFormat());
        return false;
      },
      $getDOMSlot: (_node, dom, $next) => textSlot(dom, $next()),
      $decorateDOM: (node, _prev, dom) => {
        if (lexical.$isTextNode(node)) paintText(rt, node, dom);
      },
    }),
    override(modules.extension.HorizontalRuleNode, {
      $decorateDOM: (_node, _prev, dom) => paintDivider(dom),
    }),
    override(modules.code.CodeNode, {
      $decorateDOM: (_node, _prev, dom) => paintCodeBlock(dom),
    }),
    override(modules.link.LinkNode, {
      $decorateDOM: (_node, _prev, dom) => writeContentTabStop(dom, rt.contentStopsActive),
    }),
    override(modules.list.ListNode, {
      $decorateDOM: (node, _prev, dom) => {
        if (rt.isList(node)) paintList(node, dom);
      },
    }),
    override(modules.list.ListItemNode, {
      $createDOM: (node, $next) => {
        const dom = $next();
        if (rt.isListItem(node)) syncListItem(rt, node, dom, labels.taskCheckbox);
        return dom;
      },
      $updateDOM: (node, _prev, dom, $next) => {
        if ($next()) return true;
        if (rt.isListItem(node)) syncListItem(rt, node, dom, labels.taskCheckbox);
        return false;
      },
      // Children reconcile after the marker.
      $getDOMSlot: (_node, dom, $next) => {
        const slot = $next();
        const marker = markerOf(dom);
        return marker ? slot.withAfter(marker) : slot;
      },
      $decorateDOM: (node, _prev, dom) => {
        if (rt.isListItem(node)) paintListItemDirection(dom);
      },
    }),
  ];
  if (modules.table)
    overrides.push(
      override(modules.table.TableRowNode, {
        $decorateDOM: (_node, _prev, dom) => paintRow(dom),
      }),
      override(modules.table.TableCellNode, {
        $decorateDOM: (node, _prev, dom) => paintCell(rt, node, dom),
      }),
      override(modules.table.TableNode, {
        $decorateDOM: (node, _prev, dom) => {
          if (rt.isTable(node)) sizeTable(dom, node.getColWidths());
          paintTableWrapper(rt, dom);
        },
      }),
    );
  return overrides;
}

/** The engine's DOM render extension configured with the mount's overrides. */
export function lexicalRenderExtension(
  rt: LexicalRuntime,
  labels: { readonly taskCheckbox: string },
): LexicalExtensionArgumentLike {
  return rt.lexical.configExtension(rt.modules.html.DOMRenderExtension, {
    overrides: lexicalRenderOverrides(rt, labels),
  });
}
