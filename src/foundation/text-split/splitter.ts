/**
 * The Text motion splitting engine (Foundation §18.19). It moves the original content into a
 * detached holder, builds presentation-only pieces in the light tree, groups words into lines
 * from the rendered layout, and restores the original nodes on revert.
 *
 * Interactive descendants are never copied: the original element moves into the split tree as
 * one piece and back into the holder on revert, so listeners, focus and identity survive.
 * Formatting elements are cloned around their pieces, once per line when lines are split.
 */
import { staggerPositions, type StaggerFrom } from '../reveal-coordination.js';
import { groupLines } from './lines.js';
import { isJoinedScript, strongDirection } from './scripts.js';
import { graphemes, hasUnspacedScript, splitChunk, tokenize } from './segment.js';

export type SplitUnit = 'lines' | 'words' | 'chars';

export interface SplitConfig {
  readonly units: ReadonlySet<SplitUnit>;
  readonly mask: SplitUnit | null;
  readonly staggerFrom: StaggerFrom;
}

export interface SplitPieces {
  readonly lines: HTMLElement[];
  readonly words: HTMLElement[];
  readonly chars: HTMLElement[];
  readonly masks: HTMLElement[];
  /** The pieces that carry the reveal (the finest split unit), in document order. */
  readonly animated: HTMLElement[];
}

/** A bidirectional isolate grouping words whose direction differs from the paragraph. */
interface Isolate {
  readonly dir: 'ltr' | 'rtl';
}
type PathEntry = Element | Isolate;

interface Item {
  readonly kind: 'word' | 'space' | 'break' | 'hidden' | 'block';
  /** The node placed in the split tree (a word or its mask, text, a break, a hidden run). */
  readonly node: Node;
  path: PathEntry[];
  /** For words: the element whose box is measured. */
  readonly word?: HTMLElement;
  readonly direction?: 'ltr' | 'rtl' | null;
  /** For blocks: the nested container. */
  readonly container?: Container;
  /** For words: the content assembled inside the word once every item is known. */
  readonly inner?: Item[];
  /** For words: the original text ranges and interactive elements the word presents. */
  readonly sources?: readonly (Element | { node: Text; start: number; end: number })[];
}

interface Container {
  readonly element: Element;
  readonly items: Item[];
}

interface Fragment {
  readonly path: PathEntry[];
  readonly text?: string;
  readonly atomic?: Element;
  /** Where the text sits in the original content, for measuring. */
  readonly node?: Text;
  readonly start?: number;
}

/** Elements kept whole and original: interactive, replaced or self-contained content. */
const ATOMIC = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'img',
  'svg',
  'math',
  'video',
  'audio',
  'canvas',
  'iframe',
  'object',
  'embed',
  'picture',
  'meter',
  'progress',
  'output',
  'table',
  'details',
  'ruby',
]);

/** Elements that start their own block of lines. */
const BLOCK = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'ul',
]);

/** Elements that are never presented and never split. */
const SKIPPED = new Set(['script', 'style', 'template', 'noscript']);

const OBJECT = '￼';

function isAtomic(element: Element): boolean {
  return (
    ATOMIC.has(element.localName) ||
    element.localName.includes('-') ||
    element.hasAttribute('tabindex') ||
    element.hasAttribute('contenteditable') ||
    element.hasAttribute('role')
  );
}

/**
 * Inline interactive elements whose text wraps like ordinary text: their words are split inside
 * them so they wrap exactly as before. The original element holds the first fragment; fragments
 * on later lines are inert continuations that forward activation to it.
 */
function isLive(element: Element): boolean {
  return (
    (element.localName === 'a' ||
      (element.localName === 'label' &&
        !element.querySelector('input, select, textarea, button, meter, progress, output'))) &&
    !element.hasAttribute('role') &&
    ![...element.children].some((child) => isAtomic(child) || BLOCK.has(child.localName))
  );
}

export interface TextSplitterOptions {
  /** Called with a diagnostic code and message (for example, a joined-script fallback). */
  diagnose?(code: string, message: string): void;
}

export class TextSplitter {
  #holder: DocumentFragment | null = null;
  readonly #placeholders = new Map<Element, Comment>();
  /** Live inline originals and the stand-ins holding their content in the holder. */
  readonly #live = new Map<Element, Element>();
  /** Live originals that appear in a word's outer path (the others sit inside one word). */
  readonly #liveOuter = new Set<Element>();
  /** The continuations of each live original in the current presentation. */
  readonly #continuations = new Map<Element, Set<HTMLElement>>();
  /** Live originals given an accessible name from their text. */
  readonly #labelled = new Set<Element>();
  #joined: string[] = [];
  /** The word items of each line, per container, from the last line pass. */
  #lineWords: Item[][][] = [];
  /** The hidden copy of the original laid out for the current measurement. */
  #measure: {
    box: HTMLElement;
    map: Map<Node, Node>;
    slots: [Element, Node, Node | null][];
  } | null = null;
  /** The host's content edges at the last measurement. */
  #frame = { indent: 0, justified: false, decoration: 0 };
  /** Content widths between which the current lines provably stay the same. */
  #keep = { min: Infinity, max: -Infinity };
  #containers: Container[] = [];
  #config: SplitConfig | null = null;
  #pieces: SplitPieces = { lines: [], words: [], chars: [], masks: [], animated: [] };
  /** Top-level nodes this splitter placed in the host. */
  #placed = new Set<Node>();

  constructor(
    private readonly host: HTMLElement,
    private readonly options: TextSplitterOptions = {},
  ) {}

  /** Whether the host currently presents split pieces. */
  get active(): boolean {
    return this.#holder !== null;
  }

  /** The detached holder of the original content while split. */
  get holder(): DocumentFragment | null {
    return this.#holder;
  }

  get pieces(): SplitPieces {
    return this.#pieces;
  }

  /** Whether the current split depends on layout (lines are split or masked). */
  get measuresLines(): boolean {
    // Lines are always laid out from measurement, requested or not: inline boxes cannot shape
    // across their edges (kerning against spaces), so their own wrapping would drift.
    return Boolean(this.#config && this.active);
  }

  /** The connected continuations of a live original (its fragments on later lines). */
  continuationsOf(original: Element): HTMLElement[] {
    return [...(this.#continuations.get(original) ?? [])].filter((clone) => clone.isConnected);
  }

  /** Whether `nodes` are exactly the top-level nodes this splitter placed in the host. */
  owns(nodes: NodeListOf<ChildNode> | readonly Node[]): boolean {
    const list = [...nodes];
    return list.length === this.#placed.size && list.every((node) => this.#placed.has(node));
  }

  /** Top-level host children that this splitter did not place. */
  foreign(): ChildNode[] {
    return [...this.host.childNodes].filter((node) => !this.#placed.has(node));
  }

  /**
   * Adopts outside changes to the host's children as the new original: a replacement when any
   * placed node was removed, otherwise the added nodes join the original at the same end.
   */
  adopt(): void {
    if (!this.#holder) return;
    const foreign = this.foreign();
    const replaced = [...this.#placed].some((node) => node.parentNode !== this.host);
    if (replaced) {
      this.#placeholders.clear();
      this.#live.clear();
      this.#liveOuter.clear();
      this.#labelled.clear();
      this.#holder = this.host.ownerDocument.createDocumentFragment();
      this.#holder.append(...foreign);
      return;
    }
    const first = this.host.firstChild;
    const before = foreign.filter(
      (node) =>
        first &&
        this.#placed.has(first) &&
        !!(node.compareDocumentPosition(first) & 4) /* first follows node */,
    );
    for (const node of foreign) {
      if (before.includes(node)) this.#holder.prepend(node);
      else this.#holder.append(node);
    }
  }

  /**
   * Builds the pieces from the original content and presents them. Lines are measured now unless
   * `deferLines` is set, in which case a batched line pass must follow before the next paint.
   */
  split(config: SplitConfig, deferLines = false): SplitPieces {
    this.#config = config;
    this.#capture();
    this.#restoreAtomics();
    const focused = this.#focused();
    this.#joined = [];
    this.#lineWords = [];
    this.#containers = flattenContainers([this.#build(this.#holder!, this.host, config)]);
    if (this.#joined.length)
      this.options.diagnose?.(
        'text-motion-joined-script',
        `${this.#joined.length} word(s) use a script whose letters join when shaped ("${this.#joined[0]}"); they are split into words, not characters.`,
      );
    this.#endMeasure();
    this.host.replaceChildren();
    this.#placed.clear();
    this.#collect();
    this.#finish();
    if (!deferLines) {
      this.flatten();
      this.relayout(this.measure());
    }
    this.#refocus(focused);
    return this.#pieces;
  }

  /**
   * Lays out a hidden, zero-height copy of the original content inside the host, so lines are
   * measured from the original's own layout: the pieces are never touched to measure, and any
   * browser line-breaking subtlety of the original text applies exactly. Interactive originals
   * move into the copy for the measurement and return in `relayout`.
   */
  flatten(): void {
    if (!this.active || this.#measure) return;
    const doc = this.#doc;
    const box = doc.createElement('div');
    box.dataset.tpMeasure = '';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText =
      'display:block;block-size:0;overflow:hidden;visibility:hidden;contain:strict;pointer-events:none';
    const copy = this.#holder!.cloneNode(true) as DocumentFragment;
    const map = new Map<Node, Node>();
    const original = doc.createTreeWalker(this.#holder!);
    const copied = doc.createTreeWalker(copy);
    for (let a = original.nextNode(), b = copied.nextNode(); a && b;) {
      map.set(a, b);
      a = original.nextNode();
      b = copied.nextNode();
    }
    const slots: [Element, Node, Node | null][] = [];
    for (const [atomic, placeholder] of this.#placeholders) {
      const target = map.get(placeholder);
      if (!target || !atomic.parentNode) continue;
      slots.push([atomic, atomic.parentNode, atomic.nextSibling]);
      (target as ChildNode).replaceWith(atomic);
    }
    box.append(copy);
    this.host.append(box);
    this.#measure = { box, map, slots };
  }

  /** Reads every word box from the original's layout (one layout for a whole batch). */
  measure(): DOMRect[][] {
    const style = this.host.ownerDocument.defaultView?.getComputedStyle(this.host);
    const measure = this.#measure;
    this.#frame = {
      indent: Number.parseFloat(style?.textIndent ?? '0') || 0,
      justified: (style?.textAlign ?? '').startsWith('justify'),
      decoration: measure ? this.#decoration(measure.map) : 0,
    };
    const range = this.#doc.createRange();
    const empty = new DOMRectReadOnly();
    return this.#containers.map((container) =>
      container.items.map((item) => {
        if (item.kind !== 'word') return empty;
        if (!measure) return item.word!.getBoundingClientRect();
        let top = Infinity;
        let bottom = -Infinity;
        let left = Infinity;
        let right = -Infinity;
        for (const source of item.sources ?? []) {
          let rects: DOMRect[];
          if ('nodeType' in source) rects = [source.getBoundingClientRect()];
          else {
            const node = measure.map.get(source.node) as Text | undefined;
            if (!node) continue;
            range.setStart(node, Math.min(source.start, node.length));
            range.setEnd(node, Math.min(source.end, node.length));
            rects = [...range.getClientRects()];
          }
          // A word never breaks, so its first fragment box decides its line.
          const [first] = rects;
          if (!first) continue;
          if (top === Infinity) {
            top = first.top;
            bottom = first.bottom;
          }
          for (const rect of rects) {
            left = Math.min(left, rect.left);
            right = Math.max(right, rect.right);
          }
        }
        return top === Infinity
          ? empty
          : new DOMRectReadOnly(left, top, Math.max(0, right - left), bottom - top);
      }),
    ) as DOMRect[][];
  }

  /**
   * Inline padding, border and margin of the formatting elements, summed: word boxes are text
   * rects, so a line's measured extent may omit them. Used as a conservative margin only.
   */
  #decoration(map: Map<Node, Node>): number {
    const view = this.host.ownerDocument.defaultView;
    if (!view) return 0;
    const seen = new Set<Element>();
    let total = 0;
    for (const container of this.#containers)
      for (const item of container.items)
        for (const entry of [...item.path, ...(item.inner?.flatMap((inner) => inner.path) ?? [])]) {
          if (!('nodeType' in entry) || seen.has(entry)) continue;
          seen.add(entry);
          const copy = map.get(this.#live.get(entry) ?? entry) as Element | undefined;
          if (!copy) continue;
          const style = view.getComputedStyle(copy);
          for (const value of [
            style.paddingInlineStart,
            style.paddingInlineEnd,
            style.borderInlineStartWidth,
            style.borderInlineEndWidth,
            style.marginInlineStart,
            style.marginInlineEnd,
          ])
            total += Math.abs(Number.parseFloat(value) || 0);
        }
    return total;
  }

  /** Removes the measuring copy and returns interactive originals to their pieces. */
  #endMeasure(): void {
    const measure = this.#measure;
    if (!measure) return;
    this.#measure = null;
    for (const [atomic, parent, next] of measure.slots)
      parent.insertBefore(atomic, next && next.parentNode === parent ? next : null);
    measure.box.remove();
  }

  /** Writes lines from boxes read by `measure`; returns whether the lines changed. */
  relayout(boxes: DOMRect[][]): boolean {
    const config = this.#config;
    const focused = this.#focused();
    this.#endMeasure();
    if (!config || !this.active) return false;
    const allGroups = this.#containers.map((container, index) =>
      this.#lineGroups(container, boxes[index] ?? []),
    );
    const lineWords = allGroups.map((groups) =>
      groups
        .filter((group) => !group.block)
        .map((group) => group.items.filter((item) => item.kind === 'word')),
    );
    this.#keep = this.#keepRange(allGroups[0] ?? [], boxes[0] ?? []);
    // Unchanged lines need no writes.
    if (this.#pieces.lines.length && sameLines(lineWords, this.#lineWords)) {
      this.#refocus(focused);
      return false;
    }
    this.#lineWords = lineWords;
    const pick = this.#picker();
    const lines: HTMLElement[] = [];
    const masks: HTMLElement[] = this.#pieces.masks.filter(
      (mask) => mask.dataset.tpMaskUnit !== 'lines',
    );
    this.#containers.forEach((container, index) => {
      const groups = allGroups[index]!;
      const children: Node[] = [];
      for (const group of groups) {
        if (group.block) {
          children.push(group.block.node);
          continue;
        }
        const line = this.#doc.createElement('div');
        line.dataset.tpPiece = 'line';
        // Only a container's first line keeps its text indent.
        if (children.length === 0) line.dataset.tpFirstLine = '';
        assemble(line, group.items, pick);
        lines.push(line);
        if (config.mask === 'lines') {
          const mask = this.#doc.createElement('div');
          mask.dataset.tpPiece = 'mask';
          mask.dataset.tpMaskUnit = 'lines';
          mask.append(line);
          masks.push(mask);
          children.push(mask);
        } else children.push(line);
      }
      container.element.replaceChildren(...children);
    });
    this.#placed = new Set(this.host.childNodes);
    this.#pieces = { ...this.#pieces, lines, masks };
    this.#finish();
    this.#refocus(focused);
    return true;
  }

  /**
   * Whether the current lines stay valid at content width `width`, so no line pass is needed:
   * every line of several words still fits, and no line's next word would fit after it. Only
   * decided for a single container; nested blocks may not change width with the host.
   */
  fits(width: number): boolean {
    return (
      this.#containers.length === 1 &&
      this.#pieces.lines.length > 0 &&
      width >= this.#keep.min &&
      width < this.#keep.max
    );
  }

  #keepRange(
    groups: { items: Item[]; block?: Item }[],
    boxes: readonly DOMRect[],
  ): { min: number; max: number } {
    const container = this.#containers[0];
    if (!container || this.#containers.length !== 1) return { min: Infinity, max: -Infinity };
    // Stretched spacing hides the natural line widths, and scripts written without spaces trim
    // or hang punctuation at line edges, so such text always measures.
    if (this.#frame.justified || hasUnspacedScript(this.#holder?.textContent ?? ''))
      return { min: Infinity, max: -Infinity };
    const boxOf = new Map(container.items.map((item, index) => [item, boxes[index]]));
    let min = 0;
    let max = Infinity;
    const lines = groups.filter((group) => !group.block);
    lines.forEach((group, index) => {
      const words = group.items.filter((item) => item.kind === 'word');
      // The line's own extent, independent of alignment, plus the first line's indent.
      const lineBoxes = words.map((item) => boxOf.get(item)!);
      const end = lineBoxes.length
        ? Math.max(...lineBoxes.map((box) => box.right)) -
          Math.min(...lineBoxes.map((box) => box.left)) +
          (index === 0 ? this.#frame.indent : 0)
        : 0;
      if (words.length > 1) min = Math.max(min, end);
      const next = lines[index + 1]?.items.find((item) => item.kind === 'word');
      const broken = group.items.some((item) => item.kind === 'break');
      // Conservative: a zero-width space and half the next word (line-end punctuation can be
      // trimmed or hang) can only trigger an unneeded pass, never miss one.
      if (next && !broken) max = Math.min(max, end + boxOf.get(next)!.width / 2);
    });
    // A pixel of margin on both sides absorbs layout-unit rounding near a wrap threshold.
    const margin = 1 + this.#frame.decoration;
    return { min: min + margin, max: max - margin };
  }

  /** Restores the original nodes, with their listeners, in place of the pieces. */
  revert(): void {
    if (!this.#holder) return;
    this.#restoreAtomics();
    this.host.replaceChildren(...this.#holder.childNodes);
    this.#endMeasure();
    this.#holder = null;
    this.#lineWords = [];
    this.#containers = [];
    this.#placed.clear();
    this.#pieces = { lines: [], words: [], chars: [], masks: [], animated: [] };
    this.host.removeAttribute('data-tp-unit');
  }

  get #doc(): Document {
    return this.host.ownerDocument;
  }

  #capture(): void {
    if (this.#holder) return;
    this.#holder = this.#doc.createDocumentFragment();
    this.#holder.append(...this.host.childNodes);
  }

  /** Moves interactive originals back from the pieces into their places in the holder. */
  #restoreAtomics(): void {
    for (const [atomic, placeholder] of this.#placeholders) placeholder.replaceWith(atomic);
    this.#placeholders.clear();
    for (const [original, standIn] of this.#live) {
      original.replaceChildren(...standIn.childNodes);
      standIn.replaceWith(original);
    }
    this.#live.clear();
    this.#liveOuter.clear();
    for (const original of this.#labelled) original.removeAttribute('aria-label');
    this.#labelled.clear();
  }

  #focused(): Element | null {
    const root = this.host.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    return active && this.host.contains(active) ? active : null;
  }

  #refocus(element: Element | null): void {
    if (element && element.isConnected && this.host.contains(element))
      (element as HTMLElement).focus({ preventScroll: true });
  }

  /** Builds the items of one container (the host or a block) from original nodes. */
  #build(source: ParentNode, element: Element, config: SplitConfig): Container {
    const items: Item[] = [];
    const container: Container = { element, items };
    const locale = this.host.closest('[lang]')?.getAttribute('lang') || undefined;
    let fragments: Fragment[] = [];
    // The text of the current accessible run, and the item index it is announced before.
    let run = '';
    let runStart = -1;
    let insideLive = 0;

    const finishWord = () => {
      if (!fragments.length) return;
      for (const word of this.#words(fragments, locale)) items.push(this.#word(word, config));
      fragments = [];
    };
    /** Announces the run so far through visually hidden text, without ending the word. */
    const flushRun = () => {
      if (runStart >= 0 && run.trim()) {
        const hidden = this.#doc.createElement('span');
        hidden.dataset.tpText = '';
        hidden.textContent = run;
        const next = items[runStart]?.path ?? fragments[0]?.path ?? [];
        const path: PathEntry[] = [];
        // Never inside a live element: its accessible name already carries its own text.
        for (const entry of next) {
          if ('nodeType' in entry && this.#live.has(entry)) break;
          path.push(entry);
        }
        items.splice(runStart, 0, { kind: 'hidden', node: hidden, path });
      }
      run = '';
      runStart = -1;
    };
    const addRun = (text: string) => {
      if (insideLive) return;
      if (runStart < 0) runStart = items.length;
      run += text;
    };

    const walk = (parent: ParentNode, path: PathEntry[]) => {
      for (const child of [...parent.childNodes]) {
        if (child.nodeType === 3) {
          let offset = 0;
          for (const token of tokenize((child as Text).data)) {
            const start = offset;
            offset += token.text.length;
            addRun(token.text);
            if (token.space) {
              finishWord();
              items.push({
                kind: 'space',
                node: this.#doc.createTextNode(token.text),
                path: [...path],
              });
            } else
              fragments.push({ path: [...path], text: token.text, node: child as Text, start });
          }
          continue;
        }
        if (child.nodeType !== 1) continue;
        const element = child as Element;
        const name = element.localName;
        if (SKIPPED.has(name)) continue;
        if (name === 'br') {
          finishWord();
          addRun(' ');
          items.push({ kind: 'break', node: element.cloneNode(false), path: [...path] });
          continue;
        }
        if (BLOCK.has(name) && path.length === 0) {
          finishWord();
          flushRun();
          const clone = cloneShallow(element);
          items.push({
            kind: 'block',
            node: clone,
            path: [],
            container: this.#build(element, clone, config),
          });
          continue;
        }
        if (isLive(element)) {
          // The original keeps the first fragment; its content waits in a stand-in for revert.
          flushRun();
          const standIn = element.cloneNode(false) as Element;
          standIn.append(...element.childNodes);
          element.replaceWith(standIn);
          this.#live.set(element, standIn);
          if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
            const name = (standIn.textContent ?? '').replace(/\s+/g, ' ').trim();
            if (name) {
              element.setAttribute('aria-label', name);
              this.#labelled.add(element);
            }
          }
          insideLive++;
          walk(standIn, [...path, element]);
          insideLive--;
          continue;
        }
        if (isAtomic(element)) {
          // Keep the original element; its place in the holder is remembered for revert.
          flushRun();
          const placeholder = this.#doc.createComment('tp-text-motion');
          element.replaceWith(placeholder);
          this.#placeholders.set(element, placeholder);
          fragments.push({ path: [...path], atomic: element });
          continue;
        }
        walk(element, [...path, element]);
      }
    };
    walk(source, []);
    finishWord();
    flushRun();
    // A live original sits in the outer flow when any item's own path holds it; otherwise it
    // stays inside the single word it appears in.
    for (const item of items)
      for (const entry of item.path)
        if ('nodeType' in entry && this.#live.has(entry)) this.#liveOuter.add(entry);
    const innerUsed = new Set<Element>();
    for (const item of items)
      if (item.inner)
        assemble(item.word!, item.inner, (entry) => {
          if (this.#live.has(entry) && !this.#liveOuter.has(entry) && !innerUsed.has(entry)) {
            innerUsed.add(entry);
            return entry;
          }
          return this.#cloneEntry(entry);
        });
    this.#isolate(items);
    return container;
  }

  /** A clone for a formatting path entry: a live element gets an inert continuation. */
  #cloneEntry(entry: Element): Element {
    if (!this.#live.has(entry)) return cloneShallow(entry);
    const clone = entry.cloneNode(false) as HTMLElement;
    clone.removeAttribute('id');
    clone.removeAttribute('aria-label');
    clone.setAttribute('tabindex', '-1');
    clone.setAttribute('aria-hidden', 'true');
    clone.dataset.tpContinuation = '';
    const continuations = this.#continuations.get(entry) ?? new Set<HTMLElement>();
    for (const previous of continuations) if (!previous.isConnected) continuations.delete(previous);
    continuations.add(clone);
    this.#continuations.set(entry, continuations);
    clone.addEventListener('click', (event) => {
      event.preventDefault();
      const view = entry.ownerDocument.defaultView;
      if (!view) return;
      entry.dispatchEvent(
        new view.MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          composed: true,
          button: event.button,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        }),
      );
    });
    return clone;
  }

  /** Picks path elements for one assembly pass: each outer live original is used once. */
  #picker(): (entry: Element) => Element {
    const used = new Set<Element>();
    return (entry) => {
      if (this.#liveOuter.has(entry) && !used.has(entry)) {
        used.add(entry);
        entry.replaceChildren();
        return entry;
      }
      return this.#cloneEntry(entry);
    };
  }

  /** Splits a whitespace-free sequence of fragments into words where lines may already break. */
  #words(fragments: Fragment[], locale: string | undefined): Fragment[][] {
    const text = fragments.map((fragment) => fragment.text ?? OBJECT).join('');
    const breaks = new Set<number>();
    let offset = 0;
    for (const part of splitChunk(text, locale)) {
      offset += part.length;
      breaks.add(offset);
    }
    const words: Fragment[][] = [];
    let word: Fragment[] = [];
    let position = 0;
    for (const fragment of fragments) {
      if (fragment.atomic) {
        word.push(fragment);
        position += 1;
        if (breaks.has(position) && position < text.length) {
          words.push(word);
          word = [];
        }
        continue;
      }
      let piece = '';
      let pieceStart = fragment.start ?? 0;
      const part = (text: string): Fragment => ({
        path: fragment.path,
        text,
        ...(fragment.node ? { node: fragment.node, start: pieceStart } : {}),
      });
      for (const character of fragment.text!) {
        piece += character;
        position += character.length;
        if (breaks.has(position) && position < text.length) {
          word.push(part(piece));
          words.push(word);
          word = [];
          pieceStart += piece.length;
          piece = '';
        }
      }
      if (piece) word.push(part(piece));
    }
    if (word.length) words.push(word);
    return words.filter((parts) => parts.length);
  }

  /** Creates one word piece (and its characters and mask); its content is assembled later. */
  #word(fragments: Fragment[], config: SplitConfig): Item {
    const doc = this.#doc;
    const locale = this.host.closest('[lang]')?.getAttribute('lang') || undefined;
    const path = commonPath(fragments.map((fragment) => fragment.path));
    const word = doc.createElement('span');
    word.dataset.tpPiece = 'word';
    const text = fragments.map((fragment) => fragment.text ?? '').join('');
    // Interactive content inside the word keeps the word exposed; its text is hidden instead.
    const interactive = fragments.some(
      (fragment) =>
        fragment.atomic ||
        fragment.path
          .slice(path.length)
          .some((entry) => 'nodeType' in entry && this.#live.has(entry)),
    );
    const joined = config.units.has('chars') && isJoinedScript(text);
    if (joined) this.#joined.push(text);
    const splitChars = config.units.has('chars') && !joined;
    if (interactive) word.dataset.tpInteractive = '';
    else word.setAttribute('aria-hidden', 'true');
    const inner: Item[] = [];
    for (const fragment of fragments) {
      const below = fragment.path.slice(path.length);
      if (fragment.atomic) {
        let node: Node = fragment.atomic;
        if (splitChars) {
          const char = doc.createElement('span');
          char.dataset.tpPiece = 'char';
          char.dataset.tpInteractive = '';
          char.append(fragment.atomic);
          node = this.#maskChar(char, config);
        }
        inner.push({ kind: 'word', node, path: below });
        continue;
      }
      if (splitChars) {
        for (const grapheme of graphemes(fragment.text!, locale)) {
          const char = doc.createElement('span');
          char.dataset.tpPiece = 'char';
          char.textContent = grapheme;
          if (interactive) char.setAttribute('aria-hidden', 'true');
          inner.push({ kind: 'word', node: this.#maskChar(char, config), path: below });
        }
      } else if (interactive) {
        const hidden = doc.createElement('span');
        hidden.setAttribute('aria-hidden', 'true');
        hidden.textContent = fragment.text!;
        inner.push({ kind: 'word', node: hidden, path: below });
      } else inner.push({ kind: 'word', node: doc.createTextNode(fragment.text!), path: below });
    }
    if (config.units.has('chars') && !splitChars) word.dataset.tpWhole = '';
    let node: HTMLElement = word;
    if (config.mask === 'words') {
      node = doc.createElement('span');
      node.dataset.tpPiece = 'mask';
      node.dataset.tpMaskUnit = 'words';
      node.append(word);
    }
    const sources = fragments.map((fragment) =>
      fragment.atomic
        ? fragment.atomic
        : {
            node: fragment.node!,
            start: fragment.start ?? 0,
            end: (fragment.start ?? 0) + fragment.text!.length,
          },
    );
    return { kind: 'word', node, path, word, inner, sources, direction: strongDirection(text) };
  }

  #maskChar(char: HTMLElement, config: SplitConfig): HTMLElement {
    if (config.mask !== 'chars') return char;
    const mask = this.#doc.createElement('span');
    mask.dataset.tpPiece = 'mask';
    mask.dataset.tpMaskUnit = 'chars';
    mask.append(char);
    return mask;
  }

  /**
   * Groups runs of words written against the paragraph direction into isolates: atomic inline
   * boxes are neutral to the bidirectional algorithm, so without them such words would reorder.
   */
  #isolate(items: Item[]): void {
    const base = getComputedStyleSafe(this.host)?.direction === 'rtl' ? 'rtl' : 'ltr';
    let start = -1;
    let end = -1;
    let dir: 'ltr' | 'rtl' | null = null;
    const flush = () => {
      if (start >= 0 && dir) {
        const isolate: Isolate = { dir };
        for (let index = start; index <= end; index++)
          items[index]!.path = [isolate, ...items[index]!.path];
      }
      start = end = -1;
      dir = null;
    };
    items.forEach((item, index) => {
      if (item.kind === 'block' || item.kind === 'break') return flush();
      if (item.kind !== 'word') return;
      const direction = item.direction ?? null;
      if (direction && direction !== base) {
        if (dir && dir !== direction) flush();
        if (start < 0) start = index;
        dir = direction;
        end = index;
      } else if (direction === base) flush();
      else if (start >= 0) end = index; // neutral words inside a run stay in it
    });
    flush();
  }

  /** Collects the word, character and mask pieces in document order. */
  #collect(): void {
    const words: HTMLElement[] = [];
    const chars: HTMLElement[] = [];
    const masks: HTMLElement[] = [];
    for (const item of documentItems(this.#containers[0])) {
      if (item.kind !== 'word') continue;
      words.push(item.word!);
      if (item.node !== item.word) masks.push(item.node as HTMLElement);
      for (const piece of item.word!.querySelectorAll<HTMLElement>('[data-tp-piece]')) {
        if (piece.dataset.tpPiece === 'char') chars.push(piece);
        else if (piece.dataset.tpPiece === 'mask') masks.push(piece);
      }
    }
    this.#pieces = { lines: [], words, chars, masks, animated: [] };
  }

  /** Splits a container's items into line groups (and blocks), from measured word boxes. */
  #lineGroups(container: Container, boxes: readonly DOMRect[]): { items: Item[]; block?: Item }[] {
    const groups: { items: Item[]; block?: Item }[] = [];
    let run: { item: Item; box: DOMRect }[] = [];
    const flushRun = () => {
      if (!run.length) return;
      const words = run.filter(({ item }) => item.kind === 'word');
      const lineOf = groupLines(words.map(({ box }) => box));
      const measured = new Map(words.map(({ item }, index) => [item, lineOf[index]!]));
      const lines: Item[][] = [];
      let last = -1;
      let broken = false;
      let pending: Item[] = [];
      const take = (item: Item) => {
        if (!lines.length) lines.push([]);
        lines.at(-1)!.push(...pending, item);
        pending = [];
      };
      for (const { item } of run) {
        if (item.kind === 'hidden') pending.push(item);
        else if (item.kind === 'word') {
          const line = measured.get(item)!;
          // A wrap or a break starts a line; a break's next word is always on a new one.
          if (!lines.length || line !== last || broken) lines.push([]);
          last = line;
          broken = false;
          take(item);
        } else if (item.kind === 'break') {
          // Consecutive breaks each make an empty line of their own.
          if (broken) lines.push([]);
          take(item);
          broken = true;
        } else take(item);
      }
      if (pending.length) lines.push(pending);
      for (const items of lines) if (items.length) groups.push({ items });
      run = [];
    };
    container.items.forEach((item, index) => {
      if (item.kind === 'block') {
        flushRun();
        groups.push({ items: [], block: item });
      } else run.push({ item, box: boxes[index] ?? new DOMRectReadOnly() } as never);
    });
    flushRun();
    return groups;
  }

  /** Marks the animated unit and numbers it for the stagger. */
  #finish(): void {
    const config = this.#config!;
    const { lines, words, chars } = this.#pieces;
    const unit: SplitUnit = config.units.has('chars')
      ? 'chars'
      : config.units.has('words')
        ? 'words'
        : 'lines';
    let animated: HTMLElement[];
    if (unit === 'chars') {
      // Words kept whole (joined scripts) animate as one piece in the character sequence.
      animated = [];
      for (const word of words)
        if (word.hasAttribute('data-tp-whole')) animated.push(word);
        else
          for (const char of word.querySelectorAll<HTMLElement>("[data-tp-piece='char']"))
            animated.push(char);
    } else animated = unit === 'words' ? words : lines;
    for (const piece of [...lines, ...words, ...chars]) piece.removeAttribute('data-tp-animate');
    const positions = staggerPositions(animated.length, config.staggerFrom);
    animated.forEach((piece, index) => {
      piece.setAttribute('data-tp-animate', '');
      piece.style.setProperty('--tp-text-order', String(positions[index]));
    });
    for (const list of [lines, words, chars])
      list.forEach((piece, index) => piece.style.setProperty('--tp-text-index', String(index)));
    this.host.setAttribute('data-tp-unit', unit);
    this.#pieces = { ...this.#pieces, animated };
  }
}

function getComputedStyleSafe(element: Element): CSSStyleDeclaration | null {
  return element.ownerDocument.defaultView?.getComputedStyle(element) ?? null;
}

/** Whether two line passes put the same words on the same lines. */
function sameLines(next: Item[][][], previous: Item[][][]): boolean {
  return (
    next.length === previous.length &&
    next.every(
      (lines, container) =>
        lines.length === previous[container]!.length &&
        lines.every(
          (words, line) =>
            words.length === previous[container]![line]!.length &&
            words.every((word, index) => word === previous[container]![line]![index]),
        ),
    )
  );
}

/** Every item of `container` and its nested blocks, in document order. */
function documentItems(container: Container | undefined): Item[] {
  if (!container) return [];
  return container.items.flatMap((item) =>
    item.container ? [item, ...documentItems(item.container)] : [item],
  );
}

/** Every container, nested ones included, in document order. */
function flattenContainers(containers: Container[]): Container[] {
  const all: Container[] = [];
  const visit = (container: Container) => {
    all.push(container);
    for (const item of container.items) if (item.container) visit(item.container);
  };
  for (const container of containers) visit(container);
  return [...new Set(all)];
}

function commonPath(paths: PathEntry[][]): PathEntry[] {
  const [first = []] = paths;
  let length = first.length;
  for (const path of paths)
    for (let index = 0; index < length; index++)
      if (path[index] !== first[index]) {
        length = index;
        break;
      }
  return first.slice(0, length);
}

const firstClones = new WeakSet<Element>();

/** A shallow clone; ids stay on the first clone of an element so they remain unique. */
function cloneShallow(element: Element): Element {
  const clone = element.cloneNode(false) as Element;
  if (firstClones.has(element)) clone.removeAttribute('id');
  else firstClones.add(element);
  return clone;
}

/**
 * Appends items to `parent`, recreating their formatting path: consecutive items sharing a path
 * prefix share one clone of it, so an element spanning several lines is cloned once per line.
 */
function assemble(
  parent: Element,
  items: readonly Item[],
  pick: (entry: Element) => Element = cloneShallow,
): void {
  const stack: { entry: PathEntry; element: Element }[] = [];
  const document = parent.ownerDocument;
  for (const item of items) {
    let common = 0;
    while (common < stack.length && stack[common]!.entry === item.path[common]) common++;
    stack.length = common;
    for (let index = common; index < item.path.length; index++) {
      const entry = item.path[index]!;
      let element: Element;
      if ('nodeType' in entry) element = pick(entry);
      else {
        element = document.createElement('span');
        element.setAttribute('dir', entry.dir);
        element.setAttribute('data-tp-isolate', '');
      }
      (stack.at(-1)?.element ?? parent).append(element);
      stack.push({ entry, element });
    }
    (stack.at(-1)?.element ?? parent).append(item.node);
  }
}
