/**
 * Engine configuration of the Tiptap adapter (Widgets `uwg-te-tab-engine` r1, r11,
 * `uwg-te-req-pres-2`, `uwg-te-tab-vocabulary`, `uwg-te-req-content-7`, `uwg-te-req-blocks-1`).
 *
 * The schema of every mount: the StarterKit nodes and marks the adapter keeps, each without its
 * keyboard shortcuts; the adapter's own quote, image, code, superscript, subscript, highlight and
 * text color; the list nodes, items holding a paragraph and nested lists; the block identifier and
 * the logical alignment as global attributes that are never rendered; the engine-neutral
 * vocabulary classes and `dir="auto"` on every block element. Alignment is written through the
 * CSSOM by node views, so no render spec carries a `style` attribute. No engine UI is installed:
 * no drop cursor, gap cursor, menus, drag handle, suggestion, placeholder or column resizing.
 */
import { storedAlign } from '../../actions.js';
import type { TextEditorAlign } from '../../model.js';
import type { TextEditorEngineLabels, TextEditorUrlPolicy } from '../../engine.js';
import type {
  TextEditorTiptapModules,
  TiptapExtensionLike,
  TiptapNodeLike,
  TiptapPluginLike,
  TiptapTableViewLike,
} from './modules.js';
import { linkAllowed } from '../shared/actions.js';
import { writeContentTabStop, writeTaskCheckboxDisabled } from '../shared/content-stops.js';
import { MODIFIED_ENTER_CHORDS } from '../shared/reserved-keys.js';
import { hasTiptapTables } from './modules.js';

// Native names

/** The node and mark names of the native JSON. */
export const NATIVE = Object.freeze({
  doc: 'doc',
  text: 'text',
  paragraph: 'paragraph',
  heading: 'heading',
  quote: 'blockquote',
  code: 'codeBlock',
  divider: 'horizontalRule',
  image: 'image',
  hardBreak: 'hardBreak',
  bulletList: 'bulletList',
  orderedList: 'orderedList',
  taskList: 'taskList',
  listItem: 'listItem',
  taskItem: 'taskItem',
  table: 'table',
  row: 'tableRow',
  cell: 'tableCell',
  header: 'tableHeader',
} as const);

/** The mark names of the native JSON, by portable mark. */
export const NATIVE_MARKS = Object.freeze({
  link: 'link',
  textColor: 'textColor',
  highlight: 'highlight',
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  superscript: 'superscript',
  subscript: 'subscript',
  code: 'code',
} as const);

/** The block holders that carry an identifier, custom blocks aside. */
export const ID_NODE_TYPES: readonly string[] = Object.freeze([
  NATIVE.paragraph,
  NATIVE.heading,
  NATIVE.quote,
  NATIVE.code,
  NATIVE.divider,
  NATIVE.image,
  NATIVE.listItem,
  NATIVE.taskItem,
  NATIVE.table,
]);

/** The textblocks that carry an alignment. */
export const ALIGN_NODE_TYPES: readonly string[] = Object.freeze([
  NATIVE.paragraph,
  NATIVE.heading,
  NATIVE.quote,
]);

/** The list nodes by item kind, and the item node of each. */
export const LIST_TYPES: ReadonlySet<string> = new Set([
  NATIVE.bulletList,
  NATIVE.orderedList,
  NATIVE.taskList,
]);
export const ITEM_TYPES: ReadonlySet<string> = new Set([NATIVE.listItem, NATIVE.taskItem]);

/**
 * The prefix of the engine's node name of a custom definition (`uwg-te-tab-engine` r9). Engine names
 * are camel-case words, so a hyphenated name never collides with a node, a mark, an extension or
 * a property name of the engine, and every valid definition name has its node.
 */
const CUSTOM_PREFIX = 'tp-';

/** The engine's node name of a custom definition. */
export const nativeNodeName = (name: string): string => `${CUSTOM_PREFIX}${name}`;

/** The definition name of a custom node's engine name, or `null` for another node. */
export const customNodeName = (type: string): string | null =>
  type.startsWith(CUSTOM_PREFIX) ? type.slice(CUSTOM_PREFIX.length) : null;

/**
 * The chords that the configured engine still prevents or acts on. The rule of
 * `uwg-te-req-engine-11` and `uwg-te-tab-engine` r11: an adapter turns off every engine shortcut
 * it can and declares the chords its engine still prevents or acts on, never Mod+A or Escape, so
 * that the widget consumes each of them in its capture owner and an engine never acts on a chord
 * the widget does not bind.
 *
 * Every extension's shortcuts are off and the engine's own keymap is left out, so the adapter's
 * editing keymap binds only editing keys (Enter, Shift+Enter, Backspace, Delete, Mod+A, Tab,
 * Shift+Tab, the arrows and the platform's text editing keys), which are never reserved. Three
 * engine behaviours remain, which no prop turns off: the engine's view prevents the default action
 * of the bare Mod chords of B, I, Y and Z after every key handler declined them, on every platform;
 * Mod+Shift+Z, which the view lets pass, fires the browser's native redo, which the history plugin
 * runs; and the view prevents every Enter that no binding takes, whatever its modifiers, so Enter
 * with Ctrl, Meta or Alt, with or without Shift, is prevented without effect, or on a platform
 * whose view lets Enter pass, replayed as a plain Enter: the modified Enter chords that every
 * adapter reserves. Escape shares that branch of the view, but the adapter's neutralizer claims it
 * first, so it is never reserved.
 */
export const TIPTAP_RESERVED_KEYS: readonly string[] = Object.freeze([
  'Mod+b',
  'Mod+i',
  'Mod+y',
  'Mod+z',
  'Mod+Shift+z',
  ...MODIFIED_ENTER_CHORDS,
]);

// Extension contexts

/** What an extension's functions receive as `this`. */
interface ExtensionThis {
  readonly name: string;
  readonly options: Readonly<Record<string, unknown>>;
  readonly parent?: ((...args: unknown[]) => unknown) | null | undefined;
}

/** The arguments of a node view factory. */
export interface NodeViewProps {
  readonly node: TiptapNodeLike;
  readonly view: {
    readonly dom: HTMLElement;
    readonly state?: { readonly doc: TiptapNodeLike } | undefined;
  };
  /** The position before the node, while the view is built. */
  readonly getPos?: (() => number | undefined) | undefined;
  readonly HTMLAttributes: Readonly<Record<string, unknown>>;
}

/**
 * Whether a node view's node is the paragraph of a list item: the item's `li` carries the
 * direction, so that it resolves from the item's text (`uwg-te-lis-up-i2`); the paragraph carries none, since an
 * element with `dir` hides its text from an ancestor's automatic direction.
 */
function inListItem(props: NodeViewProps): boolean {
  const pos = props.getPos?.();
  const doc = props.view.state?.doc;
  if (typeof pos !== 'number' || !doc || pos < 0 || pos > doc.content.size) return false;
  return ITEM_TYPES.has(doc.resolve(pos).parent.type.name);
}

/** A node view: the element of a node and its content element. */
export interface TiptapNodeView {
  readonly dom: HTMLElement;
  readonly contentDOM?: HTMLElement | undefined;
  update?(node: TiptapNodeLike): boolean;
  ignoreMutation?(mutation: { readonly type: string; readonly target: Node }): boolean;
  stopEvent?(event: Event): boolean;
  destroy?(): void;
}

/** A Tiptap attribute definition that is stored in the JSON and never rendered or parsed. */
export const hiddenAttribute = (fallback: unknown) => ({
  default: fallback,
  rendered: false,
  keepOnSplit: false,
  parseHTML: () => fallback,
});

/** The stored alignment of a node (`storedAlign`), or `null` for the start. */
export const nodeAlign = (node: TiptapNodeLike): TextEditorAlign | null =>
  storedAlign(node.attrs.align) ?? null;

/** Writes a logical alignment through the CSSOM, `null` restoring the start alignment. */
function writeAlign(element: HTMLElement, align: TextEditorAlign | null): void {
  if (align) element.style.textAlign = align;
  else element.style.removeProperty('text-align');
}

/**
 * The node view of an aligned block: its element with the vocabulary class and `dir="auto"`, but
 * for the paragraph of a list item, whose `li` carries it, holding the content, the alignment
 * written through the CSSOM, which a strict content security policy allows (`uwg-te-req-pres-2`).
 * Its own attribute writes are not content changes.
 */
export function alignedBlockView(
  tag: (node: TiptapNodeLike) => string,
  className: (node: TiptapNodeLike) => string,
) {
  return (props: NodeViewProps): TiptapNodeView => {
    let current = props.node;
    const document = props.view.dom.ownerDocument;
    const dom = document.createElement(tag(current));
    // The class is set once: decorations add their classes, and a new type recreates the view.
    dom.className = className(current);
    const apply = (node: TiptapNodeLike) => writeAlign(dom, nodeAlign(node));
    // A view lives in one parent: the engine builds a new one for a node moved elsewhere.
    if (!inListItem(props)) dom.dir = 'auto';
    apply(current);
    return {
      dom,
      contentDOM: dom,
      update(node) {
        if (node.type !== current.type || tag(node) !== tag(current)) return false;
        current = node;
        apply(node);
        return true;
      },
      ignoreMutation: (mutation) => mutation.type === 'attributes' && mutation.target === dom,
    };
  };
}

const headingTag = (node: TiptapNodeLike): string => {
  const level = node.attrs.level;
  return typeof level === 'number' && level >= 1 && level <= 6 ? `h${level}` : 'h1';
};

// Content stops (`uwg-te-req-prop-3`)

/**
 * The content stops of a mount: its links, task checkboxes and table scroll wrappers, which views
 * register while they live, and whether the stops are active (the editing root is a tab stop).
 */
export interface TiptapContentStops {
  active: boolean;
  readonly links: Set<HTMLElement>;
  readonly checkboxes: Set<HTMLInputElement>;
  readonly scrollers: Set<HTMLElement>;
}

/** An empty registry of content stops, active as before the first root attribute record. */
export function createContentStops(): TiptapContentStops {
  return { active: true, links: new Set(), checkboxes: new Set(), scrollers: new Set() };
}

/** Writes every registered stop for the registry's current answer. */
export function writeContentStops(stops: TiptapContentStops): void {
  for (const link of stops.links) writeContentTabStop(link, stops.active);
  for (const scroller of stops.scrollers) writeContentTabStop(scroller, stops.active);
  for (const checkbox of stops.checkboxes) writeTaskCheckboxDisabled(checkbox, !stops.active);
}

/** A mark view: the element of a mark, which holds its content. */
export interface TiptapMarkView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement;
  ignoreMutation(mutation: { readonly type: string; readonly target: Node }): boolean;
  destroy(): void;
}

/** The arguments of a mark view factory. */
export interface MarkViewProps {
  readonly view: { readonly dom: HTMLElement };
  readonly HTMLAttributes: Readonly<Record<string, unknown>>;
}

/**
 * The view of a link: `a.tp-te-link` with its `href`, as the link renders, registered as a content
 * stop of the mount while it lives. Its own attribute writes are no content changes.
 */
export function linkMarkView(stops: TiptapContentStops) {
  return (props: MarkViewProps): TiptapMarkView => {
    const dom = props.view.dom.ownerDocument.createElement('a');
    dom.className = 'tp-te-link';
    const { href } = props.HTMLAttributes;
    if (typeof href === 'string') dom.setAttribute('href', href);
    if (!stops.active) writeContentTabStop(dom, false);
    stops.links.add(dom);
    return {
      dom,
      contentDOM: dom,
      ignoreMutation: (mutation) => mutation.type === 'attributes' && mutation.target === dom,
      destroy: () => void stops.links.delete(dom),
    };
  };
}

// Extension builders

/**
 * The StarterKit child extensions with their shortcuts off: the adapter's editing keymap binds
 * Shift+Enter, which inserts the hard break.
 */
function withoutShortcuts(
  extension: TiptapExtensionLike,
  stops: TiptapContentStops,
): TiptapExtensionLike {
  const config: Record<string, unknown> = { addKeyboardShortcuts: () => ({}) };
  switch (extension.name) {
    case NATIVE.paragraph:
      config.addNodeView = () =>
        alignedBlockView(
          () => 'p',
          () => 'tp-te-paragraph',
        );
      break;
    case NATIVE.heading:
      config.addNodeView = () => alignedBlockView(headingTag, () => 'tp-te-heading');
      break;
    case NATIVE_MARKS.link:
      // The model keeps a link's `href` only (`uwg-te-req-content-2`).
      config.addAttributes = function (this: ExtensionThis) {
        const parent = (this.parent?.() ?? {}) as Readonly<Record<string, unknown>>;
        return { href: parent.href };
      };
      config.addMarkView = () => linkMarkView(stops);
      break;
  }
  return extension.extend(config);
}

/** The StarterKit configuration: the kept nodes and marks with their vocabulary. */
function starterKit(
  modules: TextEditorTiptapModules,
  urls: TextEditorUrlPolicy,
  stops: TiptapContentStops,
) {
  const kit = modules.starterKit.StarterKit.configure({
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    dropcursor: false,
    gapcursor: false,
    trailingNode: false,
    undoRedo: false,
    paragraph: { HTMLAttributes: { class: 'tp-te-paragraph', dir: 'auto' } },
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: { class: 'tp-te-heading', dir: 'auto' },
    },
    codeBlock: {
      languageClassPrefix: 'language-',
      HTMLAttributes: { class: 'tp-te-code-block', dir: 'auto' },
    },
    horizontalRule: { HTMLAttributes: { class: 'tp-te-divider', dir: 'auto' } },
    bold: { HTMLAttributes: { class: 'tp-te-bold' } },
    italic: { HTMLAttributes: { class: 'tp-te-italic' } },
    underline: { HTMLAttributes: { class: 'tp-te-underline' } },
    strike: { HTMLAttributes: { class: 'tp-te-strike' } },
    link: {
      openOnClick: false,
      enableClickSelection: false,
      autolink: false,
      linkOnPaste: false,
      isAllowedUri: (url: string) => linkAllowed(url, urls),
      HTMLAttributes: { class: 'tp-te-link', target: null, rel: null },
    },
  });
  return kit.extend({
    addExtensions(this: ExtensionThis) {
      const children = (this.parent?.() ?? []) as readonly TiptapExtensionLike[];
      return children.map((child) => withoutShortcuts(child, stops));
    },
  });
}

/** The block identifier and the alignment, on every holder and every aligned textblock. */
function globalAttributes(modules: TextEditorTiptapModules, custom: CustomNodeNames) {
  return modules.core.Extension.create({
    name: 'tpTextEditor',
    addGlobalAttributes() {
      return [
        { types: [...ID_NODE_TYPES, ...custom.blocks], attributes: { id: hiddenAttribute(null) } },
        // A block split from an aligned block takes its alignment, at its start, middle or end,
        // and so does the paragraph after a heading or quote (`uwg-te-req-content-7`).
        {
          types: [...ALIGN_NODE_TYPES],
          attributes: { align: { ...hiddenAttribute(null), keepOnSplit: true } },
        },
      ];
    },
  });
}

/** A quote: a textblock (`uwg-te-lis-up-i2`), rendered as one `blockquote`. */
function quoteNode(modules: TextEditorTiptapModules) {
  return modules.core.Node.create({
    name: NATIVE.quote,
    group: 'block',
    content: 'inline*',
    defining: true,
    parseHTML: () => [{ tag: 'blockquote' }],
    renderHTML: () => ['blockquote', { class: 'tp-te-quote', dir: 'auto' }, 0],
    addNodeView: () =>
      alignedBlockView(
        () => 'blockquote',
        () => 'tp-te-quote',
      ),
  });
}

/** The classes of an image host: `tp-te-image-pending` added while the source is empty. */
const imageHostClass = (src: string): string =>
  src === '' ? 'tp-te-image-host tp-te-image-pending' : 'tp-te-image-host';

/** The positive width of an image in CSS pixels, or `null`. */
const imageWidth = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/**
 * An image: an atom block rendered as `tp-te-image-host` > `img.tp-te-image`, never draggable. A
 * pending image (an empty source, filled in by an upload) marks its host `tp-te-image-pending`
 * and hides its `img`; the widget overlays its upload card on the host.
 */
function imageNode(modules: TextEditorTiptapModules) {
  return modules.core.Node.create({
    name: NATIVE.image,
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes: () => ({
      src: hiddenAttribute(''),
      alt: hiddenAttribute(''),
      width: hiddenAttribute(null),
    }),
    parseHTML: () => [{ tag: 'img[src]' }],
    renderHTML: ({ node }: { node: TiptapNodeLike }) => [
      'div',
      { class: imageHostClass(String(node.attrs.src ?? '')), dir: 'auto' },
      [
        'img',
        {
          class: 'tp-te-image',
          src: String(node.attrs.src ?? ''),
          alt: String(node.attrs.alt ?? ''),
          width: imageWidth(node.attrs.width),
          draggable: 'false',
          hidden: node.attrs.src ? null : '',
        },
      ],
    ],
    addNodeView:
      () =>
      (props: NodeViewProps): TiptapNodeView => {
        let current = props.node;
        const document = props.view.dom.ownerDocument;
        const dom = document.createElement('div');
        dom.className = 'tp-te-image-host';
        dom.dir = 'auto';
        dom.contentEditable = 'false';
        dom.draggable = false;
        const image = dom.appendChild(document.createElement('img'));
        image.className = 'tp-te-image';
        image.draggable = false;
        const apply = (node: TiptapNodeLike) => {
          const src = String(node.attrs.src ?? '');
          dom.className = imageHostClass(src);
          image.hidden = src === '';
          if (src === '') image.removeAttribute('src');
          else image.src = src;
          image.alt = String(node.attrs.alt ?? '');
          const width = imageWidth(node.attrs.width);
          if (width === null) image.removeAttribute('width');
          else image.width = width;
        };
        apply(current);
        return {
          dom,
          update(node) {
            if (node.type !== current.type) return false;
            current = node;
            apply(node);
            return true;
          },
          ignoreMutation: () => true,
        };
      },
  });
}

/** A mark rendered as one element with a vocabulary class. */
function plainMark(
  modules: TextEditorTiptapModules,
  name: string,
  tag: string,
  className: string,
  excludes: string,
  extra: Record<string, unknown> = {},
) {
  return modules.core.Mark.create({
    name,
    excludes,
    parseHTML: () => [{ tag }],
    renderHTML: () => [tag, { class: className }, 0],
    ...extra,
  });
}

/** A color mark: a palette name in `color`, written as `data-color` and a class, never a style. */
function colorMark(modules: TextEditorTiptapModules, name: string, tag: string, className: string) {
  return modules.core.Mark.create({
    name,
    addAttributes: () => ({ color: hiddenAttribute(null) }),
    parseHTML: () => [
      {
        tag: `${tag}[data-color]`,
        getAttrs: (element: HTMLElement) => ({ color: element.getAttribute('data-color') }),
      },
    ],
    renderHTML: ({ mark }: { mark: { readonly attrs: Readonly<Record<string, unknown>> } }) => [
      tag,
      { class: className, 'data-color': String(mark.attrs.color ?? '') },
      0,
    ],
  });
}

/** Every mark but a link, which inline code excludes (`uwg-te-req-blocks-1`). */
const CODE_EXCLUDES = [
  NATIVE_MARKS.bold,
  NATIVE_MARKS.italic,
  NATIVE_MARKS.underline,
  NATIVE_MARKS.strike,
  NATIVE_MARKS.superscript,
  NATIVE_MARKS.subscript,
  NATIVE_MARKS.highlight,
  NATIVE_MARKS.textColor,
].join(' ');

function ownMarks(modules: TextEditorTiptapModules) {
  return [
    plainMark(modules, NATIVE_MARKS.code, 'code', 'tp-te-code', CODE_EXCLUDES, { code: true }),
    plainMark(modules, NATIVE_MARKS.superscript, 'sup', 'tp-te-sup', NATIVE_MARKS.subscript),
    plainMark(modules, NATIVE_MARKS.subscript, 'sub', 'tp-te-sub', NATIVE_MARKS.superscript),
    colorMark(modules, NATIVE_MARKS.highlight, 'mark', 'tp-te-highlight'),
    colorMark(modules, NATIVE_MARKS.textColor, 'span', 'tp-te-color'),
  ];
}

/** Item content: one paragraph, then nested lists. */
const ITEM_CONTENT = 'paragraph list*';

/** The classes of a task item; `tp-te-checked` follows its state. */
const TASK_ITEM_CLASS = 'tp-te-item tp-te-task-item';

/** Cancels the native toggle of a task checkbox: the widget toggles the item in the document. */
const preventToggle = (event: Event): void => event.preventDefault();

/**
 * The view of a task item (`uwg-te-req-blocks-7`): `li.tp-te-task-item` holding a non-editable
 * `span.tp-te-task-marker` with a native checkbox out of the focus order, named from the widget's
 * strings, then the item's content. No hidden label copy and no style; the checkbox's own toggle
 * is cancelled, and it is disabled while the mount's content stops are not active. Its own
 * attribute changes and everything in the marker are no content changes.
 */
export function taskItemView(labels: TextEditorEngineLabels, stops?: TiptapContentStops) {
  return (props: NodeViewProps): TiptapNodeView => {
    let current = props.node;
    const document = props.view.dom.ownerDocument;
    const dom = document.createElement('li');
    // The class is set once: decorations add their classes, `tp-te-checked` follows the state.
    dom.className = TASK_ITEM_CLASS;
    dom.dir = 'auto';
    const marker = dom.appendChild(document.createElement('span'));
    marker.className = 'tp-te-task-marker';
    marker.setAttribute('contenteditable', 'false');
    const checkbox = marker.appendChild(document.createElement('input'));
    checkbox.type = 'checkbox';
    checkbox.tabIndex = -1;
    checkbox.setAttribute('aria-label', labels.taskCheckbox);
    checkbox.addEventListener('click', preventToggle);
    if (stops) {
      writeTaskCheckboxDisabled(checkbox, !stops.active);
      stops.checkboxes.add(checkbox);
    }
    const content = dom.appendChild(document.createElement('div'));
    const apply = (node: TiptapNodeLike) => {
      const checked = node.attrs.checked === true;
      dom.classList.toggle('tp-te-checked', checked);
      dom.setAttribute('data-checked', String(checked));
      checkbox.checked = checked;
    };
    apply(current);
    return {
      dom,
      contentDOM: content,
      update(node) {
        if (node.type !== current.type) return false;
        current = node;
        apply(node);
        return true;
      },
      ignoreMutation: (mutation) =>
        marker.contains(mutation.target) ||
        (mutation.type === 'attributes' && mutation.target === dom),
      destroy: () => {
        checkbox.removeEventListener('click', preventToggle);
        stops?.checkboxes.delete(checkbox);
      },
    };
  };
}

/**
 * The list nodes from `modules.list`, without their shortcuts: the adapter's editing keymap binds
 * the keys of list items. A task item renders through the adapter's view.
 */
function listNodes(
  modules: TextEditorTiptapModules,
  labels: TextEditorEngineLabels,
  stops: TiptapContentStops,
) {
  const { BulletList, OrderedList, ListItem, TaskList, TaskItem } = modules.list;
  const noShortcuts = { addKeyboardShortcuts: () => ({}) };
  return [
    BulletList.extend(noShortcuts).configure({
      HTMLAttributes: { class: 'tp-te-list tp-te-list-bullet' },
    }),
    OrderedList.extend(noShortcuts).configure({
      HTMLAttributes: { class: 'tp-te-list tp-te-list-ordered' },
    }),
    TaskList.extend(noShortcuts).configure({
      HTMLAttributes: { class: 'tp-te-list tp-te-list-task' },
    }),
    ListItem.extend({ ...noShortcuts, content: ITEM_CONTENT }).configure({
      HTMLAttributes: { class: 'tp-te-item', dir: 'auto' },
    }),
    TaskItem.extend({
      ...noShortcuts,
      content: ITEM_CONTENT,
      // The engine's own task view is not used (`uwg-te-lis-up-i2`).
      addNodeView: () => taskItemView(labels, stops),
      // The element the engine's serializer writes, as the view renders it.
      renderHTML: ({ node }: { node: TiptapNodeLike }) => {
        const checked = node.attrs.checked === true;
        return [
          'li',
          {
            class: checked ? `${TASK_ITEM_CLASS} tp-te-checked` : TASK_ITEM_CLASS,
            dir: 'auto',
            'data-checked': String(checked),
          },
          [
            'span',
            { class: 'tp-te-task-marker', contenteditable: 'false' },
            [
              'input',
              {
                type: 'checkbox',
                tabindex: '-1',
                checked: checked ? '' : null,
                'aria-label': labels.taskCheckbox,
              },
            ],
          ],
          ['div', 0],
        ];
      },
    }),
  ];
}

// Tables

/** The table view class of each table module, by the table helpers it reads the selection with. */
const tableViews = new WeakMap<object, WeakMap<object, unknown>>();

/** The spec flag of the decoration that marks a table holding a cell range. */
export const TABLE_SELECTION_FLAG = 'tpTableSelection';

/** The node decorations a view receives, of which the table selection is flagged in its spec. */
interface ViewDecorationLike {
  readonly spec?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * The table view class of the table modules: the engine's view inside the vocabulary's scroll
 * wrapper, with `tp-te-table-selection` on the table while a cell range is in it. A view built
 * while its table holds the cell range reads it from the view's selection, since the engine passes
 * no decorations to the table view's constructor (`uwg-te-req-tables-5`); later updates read the flagged
 * decoration.
 */
export function tableViewClass(
  modules: Pick<TextEditorTiptapModules, 'table' | 'tables'>,
): new (...args: unknown[]) => TiptapTableViewLike {
  const { table, tables } = modules;
  if (!table || !tables) throw new TypeError('A table view needs both table modules.');
  let byTables = tableViews.get(table);
  if (!byTables) {
    byTables = new WeakMap();
    tableViews.set(table, byTables);
  }
  let View = byTables.get(tables) as (new (...args: unknown[]) => TiptapTableViewLike) | undefined;
  if (!View) {
    const Base = table.TableView as unknown as new (...args: unknown[]) => TiptapTableViewLike & {
      update(node: TiptapNodeLike): boolean;
    };
    const { CellSelection } = tables;
    View = class extends Base {
      constructor(...args: unknown[]) {
        super(...args);
        this.dom.className = 'tp-te-table-wrapper';
        const node = args[0] as TiptapNodeLike;
        const selection = (args[2] as { readonly state?: { readonly selection: unknown } })?.state
          ?.selection;
        this.#mark(selection instanceof CellSelection && selection.$anchorCell.node(-1) === node);
        this.#sizeAutomatically(node);
      }

      override update(
        node: TiptapNodeLike,
        decorations: readonly ViewDecorationLike[] = [],
      ): boolean {
        if (!super.update(node)) return false;
        this.#mark(
          decorations.some((decoration) => decoration.spec?.[TABLE_SELECTION_FLAG] === true),
        );
        this.#sizeAutomatically(node);
        return true;
      }

      #mark(selected: boolean): void {
        this.table.classList.toggle('tp-te-table-selection', selected);
      }

      /**
       * A table without widths sizes its columns automatically: the engine's minimum column and
       * table widths go, so that the 48-pixel minimum holds only for committed widths, which the
       * shared table edit never sets below it (`uwg-te-req-tables-1`). The widths that a reused
       * view still shows go too (the engine only adds a minimum when a width goes, so an undone
       * resize or a replaced table kept the old columns).
       */
      #sizeAutomatically(node: TiptapNodeLike): void {
        if (hasColumnWidths(node)) return;
        this.table.style.removeProperty('min-width');
        for (const col of Array.from(this.colgroup.children)) {
          (col as HTMLElement).style.removeProperty('min-width');
          (col as HTMLElement).style.removeProperty('width');
        }
      }
    };
    byTables.set(tables, View);
  }
  return View;
}

/**
 * The table view class of a mount: the modules' class, with each scroll wrapper registered as a
 * content stop while it lives. Its wrapper's attribute writes are no content changes.
 */
export function stoppedTableView(
  View: new (...args: unknown[]) => TiptapTableViewLike,
  stops: TiptapContentStops,
): new (...args: unknown[]) => TiptapTableViewLike {
  const Base = View as new (...args: unknown[]) => TiptapTableViewLike & {
    ignoreMutation(mutation: { readonly type: string; readonly target: Node }): boolean;
    destroy?(): void;
  };
  return class extends Base {
    constructor(...args: unknown[]) {
      super(...args);
      // A new wrapper is a stop as by default; only an inactive registry writes.
      if (!stops.active) writeContentTabStop(this.dom, false);
      stops.scrollers.add(this.dom);
    }

    override ignoreMutation(mutation: { readonly type: string; readonly target: Node }): boolean {
      return (
        (mutation.type === 'attributes' && mutation.target === this.dom) ||
        super.ignoreMutation(mutation)
      );
    }

    override destroy(): void {
      stops.scrollers.delete(this.dom);
      super.destroy?.();
    }
  };
}

/** Whether a table node holds committed column widths, which are all or nothing. */
function hasColumnWidths(table: TiptapNodeLike): boolean {
  const row = table.firstChild;
  let found = false;
  row?.forEach((cell) => {
    const widths = cell.attrs.colwidth;
    if (Array.isArray(widths) && widths.some((width) => typeof width === 'number' && width > 0))
      found = true;
  });
  return found;
}

/** The palette name of a cell background, or `null`. */
export const cellBackground = (node: TiptapNodeLike): string | null =>
  typeof node.attrs.background === 'string' && node.attrs.background !== ''
    ? node.attrs.background
    : null;

/** A cell's view: its element with the vocabulary, the background name and the CSSOM alignment. */
function cellView(tag: 'td' | 'th', className: string) {
  return (props: NodeViewProps): TiptapNodeView => {
    let current = props.node;
    const dom = props.view.dom.ownerDocument.createElement(tag);
    // The class is set once: the selected-cell decoration adds its class to it.
    dom.className = className;
    const apply = (node: TiptapNodeLike) => {
      const { colspan, rowspan } = node.attrs;
      if (typeof colspan === 'number' && colspan > 1) dom.colSpan = colspan;
      else dom.removeAttribute('colspan');
      if (typeof rowspan === 'number' && rowspan > 1) dom.rowSpan = rowspan;
      else dom.removeAttribute('rowspan');
      const background = cellBackground(node);
      if (background) dom.setAttribute('data-background', background);
      else dom.removeAttribute('data-background');
      writeAlign(dom, nodeAlign(node));
    };
    apply(current);
    return {
      dom,
      contentDOM: dom,
      update(node) {
        if (node.type !== current.type) return false;
        current = node;
        apply(node);
        return true;
      },
      ignoreMutation: (mutation) => mutation.type === 'attributes' && mutation.target === dom,
    };
  };
}

/**
 * The engine's table plugins without their own cell-range paint: the engine decorates the cells
 * of a range with a class of its own, where the adapter paints a range only through the
 * engine-neutral selected-cell class (`uwg-te-req-tables-5`, `uwg-te-tab-vocabulary` r12). Every
 * other property of those plugins is kept.
 */
function withoutEngineCellPaint(
  modules: TextEditorTiptapModules,
  plugins: readonly TiptapPluginLike[],
): TiptapPluginLike[] {
  return plugins.map((plugin) => {
    const spec = plugin.spec as { readonly props?: Readonly<Record<string, unknown>> };
    if (typeof spec.props?.decorations !== 'function') return plugin;
    const props = Object.fromEntries(
      Object.entries(spec.props).filter(([name]) => name !== 'decorations'),
    );
    return new modules.state.Plugin({ ...spec, props });
  });
}

/** The table nodes: no resizing, no engine keys, cells of paragraphs with a background and alignment. */
function tableNodes(modules: TextEditorTiptapModules, stops: TiptapContentStops) {
  if (!hasTiptapTables(modules)) return [];
  const { Table, TableRow, TableCell, TableHeader } = modules.table;
  const cellConfig = (tag: 'td' | 'th', className: string) => ({
    content: 'paragraph+',
    addAttributes(this: ExtensionThis) {
      const parent = (this.parent?.() ?? {}) as Readonly<Record<string, unknown>>;
      return {
        colspan: parent.colspan,
        rowspan: parent.rowspan,
        colwidth: parent.colwidth,
        background: hiddenAttribute(null),
        align: hiddenAttribute(null),
      };
    },
    addNodeView: () => cellView(tag, className),
  });
  return [
    Table.extend({
      addKeyboardShortcuts: () => ({}),
      addProseMirrorPlugins(this: ExtensionThis) {
        return withoutEngineCellPaint(modules, (this.parent?.() ?? []) as TiptapPluginLike[]);
      },
      addAttributes(this: ExtensionThis) {
        const parent = (this.parent?.() ?? {}) as Readonly<Record<string, unknown>>;
        return {
          ...parent,
          headerRow: hiddenAttribute(false),
          headerColumn: hiddenAttribute(false),
        };
      },
    }).configure({
      resizable: false,
      allowTableNodeSelection: true,
      cellMinWidth: 48,
      View: stoppedTableView(tableViewClass(modules), stops),
      HTMLAttributes: { class: 'tp-te-table' },
    }),
    TableRow.configure({}),
    TableCell.extend(cellConfig('td', 'tp-te-cell')).configure({
      HTMLAttributes: { class: 'tp-te-cell' },
    }),
    TableHeader.extend(cellConfig('th', 'tp-te-cell tp-te-header-cell')).configure({
      HTMLAttributes: { class: 'tp-te-cell tp-te-header-cell' },
    }),
  ];
}

// Assembly

/** The node names of the custom blocks of a mount, which carry a block identifier. */
export interface CustomNodeNames {
  readonly blocks: readonly string[];
}

export interface TiptapSchemaSetup {
  readonly urls: TextEditorUrlPolicy;
  readonly labels: TextEditorEngineLabels;
  /** The adapter's plugins, in the order the engine runs them. */
  readonly plugins: readonly TiptapPluginLike[];
  /** The extensions of the custom nodes, generated or overridden. */
  readonly custom?: readonly TiptapExtensionLike[] | undefined;
  readonly customNames?: CustomNodeNames | undefined;
  /**
   * The adapter's editing behavior (the Escape neutralizer, the editing keymap and the input
   * rules), which sets its own priorities.
   */
  readonly behaviors?: readonly TiptapExtensionLike[] | undefined;
  /** The mount's content stops; a registry of its own by default. */
  readonly stops?: TiptapContentStops | undefined;
}

const NO_CUSTOM: CustomNodeNames = Object.freeze({ blocks: [] });

/**
 * The extensions of a mount: the adapter's editing behavior, the configured StarterKit, the
 * adapter's nodes and marks, the list and table nodes, the global attributes, the history without
 * engine keys and the adapter's plugins (identifier repair, normalization, notifications), then
 * the custom nodes.
 */
export function createTiptapExtensions(
  modules: TextEditorTiptapModules,
  setup: TiptapSchemaSetup,
): TiptapExtensionLike[] {
  const plugins = [modules.history.history({ depth: 100, newGroupDelay: 500 }), ...setup.plugins];
  const stops = setup.stops ?? createContentStops();
  return [
    ...(setup.behaviors ?? []),
    starterKit(modules, setup.urls, stops),
    quoteNode(modules),
    imageNode(modules),
    ...ownMarks(modules),
    ...listNodes(modules, setup.labels, stops),
    ...tableNodes(modules, stops),
    globalAttributes(modules, setup.customNames ?? NO_CUSTOM),
    modules.core.Extension.create({
      name: 'tpHistory',
      addProseMirrorPlugins: () => plugins,
    }),
    ...(setup.custom ?? []),
  ];
}
