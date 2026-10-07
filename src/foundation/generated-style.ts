import { contentSecurityPolicy, subscribeContentSecurity } from './content-security.js';

/**
 * Constructed sheets shared by identical CSS text within one document. Every instance of a
 * component generates the same structure and recipe CSS for the same presentation state, so one
 * immutable sheet serves all of them: the browser parses and indexes it once instead of once per
 * element (hundreds of instances otherwise hold hundreds of identical rule sets). Sheets are
 * reference counted and dropped when no root adopts them.
 */
const sharedSheets = new WeakMap<Document, Map<string, { sheet: CSSStyleSheet; users: number }>>();
function acquireSheet(document: Document, Sheet: typeof CSSStyleSheet, css: string): CSSStyleSheet {
  let sheets = sharedSheets.get(document);
  if (!sheets) sharedSheets.set(document, (sheets = new Map()));
  let entry = sheets.get(css);
  if (!entry) {
    const sheet = new Sheet();
    sheet.replaceSync(css);
    sheets.set(css, (entry = { sheet, users: 0 }));
  }
  entry.users++;
  return entry.sheet;
}
function releaseSheet(document: Document, css: string): void {
  const sheets = sharedSheets.get(document);
  const entry = sheets?.get(css);
  if (!entry || --entry.users > 0) return;
  sheets!.delete(css);
}

/** Owns only generated CSS transport. Consumer resources and component state are untouched. */
export class GeneratedStyleResource {
  readonly boundary: Comment;
  #css = '';
  #applied = '';
  #style: HTMLStyleElement | undefined;
  #sheet: CSSStyleSheet | undefined;
  /** The shared-sheet key (CSS text) and document this resource holds a reference for. */
  #sheetKey: { document: Document; css: string } | undefined;
  #document?: Document;
  #nonce: string | undefined;
  #unsubscribe: (() => void) | undefined;
  #disposed = false;
  constructor(
    private readonly owner: HTMLElement,
    private readonly target: Document | ShadowRoot,
  ) {
    this.boundary = this.document.createComment('tp-generated-style');
    this.parent.append(this.boundary);
    this.connect();
  }
  private get document(): Document {
    return this.target.nodeType === 9 ? (this.target as Document) : this.target.ownerDocument!;
  }
  private get parent(): HTMLElement | ShadowRoot {
    return this.target.nodeType === 9
      ? (this.target as Document).head
      : (this.target as ShadowRoot);
  }
  setText(css: string): void {
    this.#css = css;
    this.refresh();
  }
  connect(): void {
    if (this.#disposed) return;
    this.#unsubscribe?.();
    this.#unsubscribe = subscribeContentSecurity(this.owner, this.refresh);
    this.refresh();
  }
  /** Detached roots may retain their styles, but never a policy subscription. */
  disconnect(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
  readonly refresh = (): void => {
    if (this.#disposed) return;
    const policy = contentSecurityPolicy(this.owner);
    const document = this.document;
    if (policy.disableStyleElements || !this.#css) {
      this.#remove();
      return;
    }
    if (this.#document !== document || this.#nonce !== policy.nonce) this.#remove();
    this.#document = document;
    this.#nonce = policy.nonce;
    const Sheet = document.defaultView?.CSSStyleSheet;
    const root = this.target as ShadowRoot;
    if (
      policy.nonce === undefined &&
      this.target.nodeType === 11 &&
      'adoptedStyleSheets' in root &&
      Sheet
    ) {
      if (this.#sheetKey?.css !== this.#css || this.#sheetKey.document !== document) {
        // Swap to the shared sheet for the new text in place; shared sheets are never mutated.
        const previous = this.#sheet;
        const previousKey = this.#sheetKey;
        const next = acquireSheet(document, Sheet, this.#css);
        this.#sheet = next;
        this.#sheetKey = { document, css: this.#css };
        const adopted = root.adoptedStyleSheets;
        const index = previous ? adopted.indexOf(previous) : -1;
        root.adoptedStyleSheets =
          index >= 0
            ? [...adopted.slice(0, index), next, ...adopted.slice(index + 1)]
            : [...adopted, next];
        if (previousKey) releaseSheet(previousKey.document, previousKey.css);
      } else if (!root.adoptedStyleSheets.includes(this.#sheet!))
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.#sheet!];
    } else {
      if (!this.#style) {
        this.#style = document.createElement('style');
        if (policy.nonce !== undefined) this.#style.setAttribute('nonce', policy.nonce);
      }
      if (this.#applied !== this.#css) this.#style.textContent = this.#css;
      if (this.#style.parentNode !== this.parent)
        this.parent.insertBefore(this.#style, this.boundary.nextSibling);
    }
    this.#applied = this.#css;
  };
  #remove(): void {
    this.#style?.remove();
    this.#style = undefined;
    if (this.#sheet) {
      const root = this.target as ShadowRoot;
      // Remove one occurrence: another resource of this root may share the same sheet.
      const adopted = root.adoptedStyleSheets;
      const index = adopted.indexOf(this.#sheet);
      if (index >= 0)
        root.adoptedStyleSheets = [...adopted.slice(0, index), ...adopted.slice(index + 1)];
      this.#sheet = undefined;
    }
    if (this.#sheetKey) {
      releaseSheet(this.#sheetKey.document, this.#sheetKey.css);
      this.#sheetKey = undefined;
    }
    this.#applied = '';
  }
  dispose(): void {
    this.disconnect();
    this.#remove();
    this.boundary.remove();
    this.#disposed = true;
  }
}
