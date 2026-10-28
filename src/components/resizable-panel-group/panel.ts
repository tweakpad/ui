import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import type { TpResizablePanelGroup } from './group.js';
import type { PanelExtent, PanelSize } from './types.js';
import { resizablePanelGroupPresentation } from '../../presentation/families/resizable-panel-group.js';
/**
 * One resizable region of a Resizable panel group, with its own default size and bounds. Sizes
 * are pixels as numbers, or strings in `%`, `px`, `em`, `rem`, `vh` or `vw`; a unitless string is
 * a percentage.
 *
 * @slot - The panel content.
 * @fires tp-panel-resize - After the panel's committed size changes, with `size` and `previousSize` (each in pixels and as a percentage) and the panel `id`.
 * @fires tp-resizable-member-change - Bubbles when the panel's configuration changes, so its group lays out again.
 */
export class TpResizablePanel extends TpElement {
  static tagName = 'tp-resizable-panel';
  static override presentation = resizablePanelGroupPresentation;
  static override properties = {
    ...TpElement.properties,
    defaultSize: { attribute: 'default-size' },
    minSize: { attribute: 'min-size' },
    maxSize: { attribute: 'max-size' },
    collapsedSize: { attribute: 'collapsed-size' },
    collapsible: { type: Boolean, reflect: true },
    resizeBehavior: { attribute: 'resize-behavior' },
    onResize: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: auto;
      }

      .panel {
        min-inline-size: 0;
        min-block-size: 0;
        block-size: 100%;
        inline-size: 100%;
      }
    `,
  ];
  /** The size the panel starts at and returns to on a double-click of its handle; without it, the panel shares the remaining space. */
  defaultSize: PanelExtent | undefined;
  /** The smallest size a resize leaves the panel at, unless it collapses. */
  minSize: PanelExtent | undefined;
  /** The largest size a resize gives the panel. */
  maxSize: PanelExtent | undefined;
  /** The size of the panel while collapsed, between zero and its minimum. */
  collapsedSize: PanelExtent = 0;
  /** Lets a resize past the minimum snap the panel to its collapsed size. */
  collapsible = false;
  /** How the panel answers a change in the group's size: keep its share (`relative`) or keep its pixel size, as a fixed sidebar does. At least one panel keeps its share. */
  resizeBehavior: 'relative' | 'preserve-pixel-size' = 'relative';
  /** Called after the panel's committed size changes, as `tp-panel-resize` is dispatched. */
  onResize: ((size: PanelSize, id: string, previous: PanelSize | undefined) => void) | undefined;
  /** The group the panel belongs to: its parent, when that is a Resizable panel group. */
  get ownerGroup(): TpResizablePanelGroup | null {
    return this.parentElement?.localName === 'tp-resizable-panel-group'
      ? (this.parentElement as TpResizablePanelGroup)
      : null;
  }
  /** Collapses the panel, when it is collapsible. */
  collapse(): void {
    this.ownerGroup?.collapsePanel(this);
  }
  /** Expands the collapsed panel to its last expanded size, else its default or minimum. */
  expand(): void {
    this.ownerGroup?.expandPanel(this);
  }
  /** Resizes the panel within its bounds; its neighbors absorb the difference. */
  resize(size: PanelExtent): void {
    this.ownerGroup?.resizePanel(this, size);
  }
  /** The panel's current size, in pixels and as a percentage of the group. */
  getSize(): PanelSize {
    return this.ownerGroup?.getPanelSize(this) ?? { inPixels: 0, asPercentage: 0 };
  }
  /** Whether the panel is at its collapsed size. */
  isCollapsed(): boolean {
    return this.hasAttribute('data-collapsed');
  }
  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) this.id = createId('tp-panel');
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.dispatchEvent(new Event('tp-resizable-member-change', { bubbles: true }));
  }
  protected override render() {
    return this.renderPart(
      'resizable-panel-group-panel',
      { collapsed: this.isCollapsed(), disabled: this.disabled },
      { properties: { class: 'panel' }, content: html`<slot></slot>` },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-resizable-panel': TpResizablePanel;
  }
}
