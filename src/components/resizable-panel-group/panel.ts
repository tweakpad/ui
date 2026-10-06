import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import type { TpResizablePanelGroup } from './group.js';
import type { PanelExtent, PanelSize } from './types.js';
import { resizablePanelGroupPresentation } from '../../presentation/families/resizable-panel-group.js';
export class TpResizablePanel extends TpElement {
  static tagName = 'tp-resizable-panel';
  static presentationTagName = 'tp-resizable-panel-group';
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
  defaultSize: PanelExtent | undefined;
  minSize: PanelExtent | undefined;
  maxSize: PanelExtent | undefined;
  collapsedSize: PanelExtent = 0;
  collapsible = false;
  resizeBehavior: 'relative' | 'preserve-pixel-size' = 'relative';
  onResize: ((size: PanelSize, id: string, previous: PanelSize | undefined) => void) | undefined;
  get ownerGroup(): TpResizablePanelGroup | null {
    return this.parentElement?.localName === 'tp-resizable-panel-group'
      ? (this.parentElement as TpResizablePanelGroup)
      : null;
  }
  collapse(): void {
    this.ownerGroup?.collapsePanel(this);
  }
  expand(): void {
    this.ownerGroup?.expandPanel(this);
  }
  resize(size: PanelExtent): void {
    this.ownerGroup?.resizePanel(this, size);
  }
  getSize(): PanelSize {
    return this.ownerGroup?.getPanelSize(this) ?? { inPixels: 0, asPercentage: 0 };
  }
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
