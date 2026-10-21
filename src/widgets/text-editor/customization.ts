/**
 * Customization of the text editor (Widgets `uwg-te-req-pres-8`, `uwg-te-req-pres-1`).
 *
 * - Chrome: every public part is a `part` on an element the widget's own templates author, so
 *   `::part(text-editor-…)` reaches it; the family binds each part by that attribute.
 * - Nested controls (the Buttons, Toggles, Menus, Popovers and the other library hosts in the
 *   widget's shadow root) keep their own families; the widget's `partPresentation` is composed
 *   into each of them (`setPartComposition`), replaced as a whole when the dictionary changes,
 *   without re-rendering them or touching their state, selection or focus.
 * - Content: only tokens, the document content profile and the `css` of custom node definitions,
 *   adopted into the shadow root nested under the content part (`nodeCssText`), so the rules of
 *   a definition reach the document and nothing else.
 */
import type { TextEditorNodeDefinition } from '../../foundation/text-editor/nodes.js';
import { nodeCssText } from '../../foundation/text-editor/content/node-css.js';
import { setPartComposition } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';

/** The selector of the content part, under which custom node styles are nested. */
export const TEXT_EDITOR_CONTENT_SCOPE = '[part~="text-editor-content"]';

/** A library host in the shadow root: an element with a presentation of its own. */
type ComposedHost = Parameters<typeof setPartComposition>[0];

const isComposedHost = (element: Element): element is ComposedHost =>
  element.localName.startsWith('tp-') &&
  'presentationController' in element &&
  'partPresentation' in element;

/** Whether an element is the content part, whose subtree the engine renders. */
const isContentPart = (element: Element): boolean =>
  (element.getAttribute('part') ?? '').split(/\s+/u).includes('text-editor-content');

/**
 * The elements of the shadow root in tree order, without the subtree of the content part: the
 * document holds no control of the widget, and a large one would make every pass long.
 */
function* chromeElements(parent: ParentNode): Generator<Element> {
  for (const element of parent.children) {
    yield element;
    if (!isContentPart(element)) yield* chromeElements(element);
  }
}

/** What the customization reads from the widget. */
export interface TextEditorCustomizationHost {
  /** The widget, the owner of every composition it writes. */
  readonly owner: object;
  /** The widget's shadow root, once it exists. */
  renderRoot(): ShadowRoot | null;
  /** Adopts CSS text into the shadow root; returns its release. */
  adoptStyles(cssText: string): () => void;
}

/** The composition of the widget's part presentation and the adoption of custom node styles. */
export class TextEditorCustomization {
  readonly #host: TextEditorCustomizationHost;
  #presentation: PartPresentation | null = null;
  #composed = new WeakSet<Element>();
  #nodeCss = '';
  #releaseNodeCss: (() => void) | null = null;

  constructor(host: TextEditorCustomizationHost) {
    this.#host = host;
  }

  /**
   * Composes `presentation` into every library host of the shadow root that does not hold it yet;
   * a new dictionary replaces the previous one on every host. Runs after each render, so hosts
   * that a render adds are composed before they paint.
   */
  compose(presentation: PartPresentation): void {
    const root = this.#host.renderRoot();
    if (!root) return;
    const changed = presentation !== this.#presentation;
    this.#presentation = presentation;
    if (changed) this.#composed = new WeakSet();
    for (const element of chromeElements(root)) {
      if (this.#composed.has(element) || !isComposedHost(element)) continue;
      this.#composed.add(element);
      setPartComposition(element, this.#host.owner, presentation);
    }
  }

  /**
   * Adopts the styles of `nodes` nested under the content part, replacing the previous ones when
   * they differ; nodes without styles release them.
   */
  adoptNodeStyles(nodes: readonly TextEditorNodeDefinition[]): void {
    const css = nodeCssText(nodes, TEXT_EDITOR_CONTENT_SCOPE);
    if (css === this.#nodeCss && (css === '' || this.#releaseNodeCss)) return;
    this.#releaseNodeCss?.();
    this.#releaseNodeCss = null;
    this.#nodeCss = css;
    if (css !== '') this.#releaseNodeCss = this.#host.adoptStyles(css);
  }

  /** Releases the adopted node styles; the next `adoptNodeStyles` adopts them again. */
  release(): void {
    this.#releaseNodeCss?.();
    this.#releaseNodeCss = null;
  }
}
