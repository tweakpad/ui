import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import {
  positionSurface,
  rect,
  themeSpacing,
  type PositioningHandle,
  type Rect,
  type VirtualAnchor,
} from '../../../foundation/positioning.js';
import { ToolbarController, type ToolbarRegistration } from '../../../foundation/toolbar.js';
import { TpButtonGroup } from '../../../components/button-group/button-group.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowStrings } from '../types.js';

export type FlowNodeToolbarPlacement = 'top' | 'bottom';

const toolbarStyles = css`
  :host {
    position: absolute;
    inset-inline-start: 0;
    inset-block-start: 0;
    display: inline-flex;
    inline-size: max-content;
    max-inline-size: none;
    z-index: 4;
  }

  :host(:not([open])),
  :host(:not([data-anchored])) {
    display: none;
  }

  .toolbar {
    display: inline-flex;
    align-items: center;
  }

  tp-button-group {
    display: inline-flex;
  }
`;

/**
 * The node toolbar (Widgets 6.3 Anatomy): a Foundation toolbar of slotted Buttons in a Button
 * group, positioned above (or below) the selected node outside the zoom transform. The root
 * hands it the node's client rect each frame through `setAnchor`; the surface follows it
 * through the frame-synchronized positioning owner and flips when it would leave the pane.
 */
export class TpFlowNodeToolbar extends TpElement {
  static tagName = 'tp-flow-node-toolbar';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpButtonGroup];
  }
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true },
    offset: { type: Number },
    strings: { attribute: false },
    label: { type: String },
  };
  static override styles = [TpElement.styles, toolbarStyles];

  open = false;
  placement: FlowNodeToolbarPlacement = 'top';
  /** Distance from the node in CSS pixels; `undefined` resolves to `--tp-space-2`. */
  offset: number | undefined;
  strings: Partial<FlowStrings> | undefined;
  /** Overrides the toolbar's accessible name. */
  label = '';

  #anchor: Rect | null = null;
  #handle: PositioningHandle | undefined;
  #toolbar: ToolbarController | undefined;
  readonly #items = new Map<HTMLElement, ToolbarRegistration<unknown>>();
  readonly #parts = new Map<HTMLElement, () => void>();

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  /** The current anchor rect (client coordinates). */
  get anchor(): Rect | null {
    return this.#anchor;
  }

  /** Positions the toolbar relative to a node's client rect (`x`, `y`, `width`, `height`); `null` hides it. */
  setAnchor(input: { x: number; y: number; width: number; height: number } | null): void {
    const previous = this.#anchor;
    const next = input ? rect(input.x, input.y, input.width, input.height) : null;
    const changed =
      !!next !== !!previous ||
      (next &&
        previous &&
        (next.x !== previous.x ||
          next.y !== previous.y ||
          next.width !== previous.width ||
          next.height !== previous.height));
    this.#anchor = next;
    this.toggleAttribute('data-anchored', !!next);
    if (!next) this.#destroyHandle();
    else if (!this.#handle) this.#createHandle();
    else if (changed) void this.#handle.update();
  }

  override focus(options?: FocusOptions): void {
    const first = this.querySelector<HTMLElement>(
      'tp-button:not([disabled]), button:not([disabled])',
    );
    if (first) first.focus(options);
    else super.focus(options);
  }

  override disconnectedCallback(): void {
    this.#destroyHandle();
    this.#toolbar?.dispose();
    this.#toolbar = undefined;
    this.#items.clear();
    for (const release of this.#parts.values()) release();
    this.#parts.clear();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const root = this.renderRoot.querySelector<HTMLElement>('.toolbar');
    if (root && !this.#toolbar) this.#toolbar = new ToolbarController(root, {});
    this.#toolbar?.update({ orientation: 'horizontal', disabled: this.disabled });
    this.#syncItems();
    if (changed.has('open') || changed.has('placement') || changed.has('offset')) {
      this.#destroyHandle();
      if (this.open && this.#anchor) this.#createHandle();
    }
  }

  #slotChange = (): void => {
    this.#syncItems();
  };

  /** Slotted Buttons join the roving order and present as `flow-control` parts. */
  #syncItems(): void {
    const toolbar = this.#toolbar;
    if (!toolbar) return;
    const present = new Set<HTMLElement>();
    for (const element of this.querySelectorAll<HTMLElement>('tp-button, button')) {
      if (element.closest('tp-button') !== element && element.localName === 'button') continue;
      present.add(element);
      if (!this.#items.has(element))
        this.#items.set(element, toolbar.registerItem(element, { kind: 'button' }));
      if (element.localName === 'tp-button' && !this.#parts.has(element))
        this.#parts.set(element, this.presentationController.registerPart('flow-control', element));
    }
    for (const [element, registration] of this.#items)
      if (!present.has(element)) {
        registration.dispose();
        this.#items.delete(element);
      }
    for (const [element, release] of this.#parts)
      if (!present.has(element)) {
        release();
        this.#parts.delete(element);
      }
  }

  #createHandle(): void {
    if (this.#handle || !this.open || !this.#anchor || !this.isConnected) return;
    const anchor: VirtualAnchor = {
      getBoundingRectangle: () => this.#anchor ?? rect(0, 0, 0, 0),
      contextElement: this,
    };
    this.#handle = positionSurface(anchor, this, {
      placement: this.placement,
      offset: this.offset ?? themeSpacing(this, 2),
      strategy: 'absolute',
      collision: { side: 'flip', align: 'shift' },
      tracking: { frameSynchronized: true, ancestorScroll: false, elementResize: true },
    });
  }

  #destroyHandle(): void {
    this.#handle?.destroy();
    this.#handle = undefined;
  }

  protected override render() {
    const strings = this.#strings;
    return this.renderPart(
      'flow-node-toolbar',
      { open: this.open, placement: this.placement },
      {
        tag: 'div',
        properties: {
          part: 'flow-node-toolbar',
          class: 'toolbar',
          'aria-label': this.label || strings.nodeToolbar,
          'data-placement': this.placement,
        },
        content: html`<tp-button-group class="group" label=${this.label || strings.nodeToolbar}
          ><slot @slotchange=${this.#slotChange}></slot
        ></tp-button-group>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-node-toolbar': TpFlowNodeToolbar;
  }
}
