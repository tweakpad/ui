import { contentSecurityPolicy, subscribeContentSecurity } from './content-security.js';

/** Owns only generated CSS transport. Consumer resources and component state are untouched. */
export class GeneratedStyleResource {
  readonly boundary: Comment;
  #css = '';
  #applied = '';
  #style: HTMLStyleElement | undefined;
  #sheet: CSSStyleSheet | undefined;
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
      this.#sheet ??= new Sheet();
      if (this.#applied !== this.#css) this.#sheet.replaceSync(this.#css);
      if (!root.adoptedStyleSheets.includes(this.#sheet))
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.#sheet];
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
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((sheet) => sheet !== this.#sheet);
      this.#sheet = undefined;
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
