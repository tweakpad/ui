import { css, unsafeCSS, type PropertyValues } from 'lit';
import { resizeSeparatorTargetCss } from '../../foundation/resize-separator.js';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import type { TpResizablePanelGroup } from './group.js';
import { separatorValue } from './layout.js';
import { resizablePanelGroupPresentation } from '../../presentation/families/resizable-panel-group.js';
export interface ResizeHandleState {
  orientation: 'horizontal' | 'vertical';
  min: number;
  max: number;
  now: number;
  controls: string;
  disabled: boolean;
  dragging: boolean;
}
/**
 * The focusable separator between two panels of a Resizable panel group. People drag it or use
 * the arrow keys on it; it describes and adjusts the panel it controls, the one before it unless
 * `target` names the other neighbor.
 *
 * @fires tp-resizable-member-change - Bubbles when the handle's configuration changes, so its group lays out again.
 */
export class TpResizableHandle extends TpElement {
  static tagName = 'tp-resizable-handle';
  static override presentation = resizablePanelGroupPresentation;
  static override properties = {
    ...TpElement.properties,
    withHandle: { type: Boolean, attribute: 'with-handle' },
    target: { type: String },
    label: { type: String },
    disableDoubleClickReset: { type: Boolean, attribute: 'disable-double-click-reset' },
    ownerGroup: { attribute: false },
    boundary: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: flex;
        flex: none;
        position: relative;
        inline-size: var(--tp-border-width);
        min-inline-size: 0;
        min-block-size: 0;
        align-self: stretch;
        z-index: 1;
      }

      :host([orientation='vertical']) {
        inline-size: auto;
        block-size: var(--tp-border-width);
      }

      .separator {
        position: relative;
        inline-size: 100%;
        block-size: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
        user-select: none;
        outline: none;
        cursor: col-resize;
      }

      :host([orientation='vertical']) .separator {
        cursor: row-resize;
      }

      ${unsafeCSS(resizeSeparatorTargetCss('.separator', 'horizontal'))}

      ${unsafeCSS(resizeSeparatorTargetCss(":host([orientation='vertical']) .separator", 'vertical'))}

      .decoration {
        position: relative;
        flex: none;
        pointer-events: none;
      }

      .separator[data-disabled] {
        cursor: default;
      }
    `,
  ];
  /** Shows a grip on the line, a visible cue that it can be dragged. */
  withHandle = false;
  /** The id of the adjacent panel the handle describes and adjusts with the keyboard; the preceding panel by default. */
  target = '';
  /** The accessible name of the separator, such as "Resize sidebar". */
  label = 'Resize panels';
  /** Stops a double-click on this handle from restoring its panel's default size. */
  disableDoubleClickReset = false;
  /** The group a generated handle belongs to, which is not its parent; set by the group. */
  ownerGroup: TpResizablePanelGroup | undefined;
  /** The index of the boundary between panels the handle moves; set by the group. */
  boundary = -1;
  #state: ResizeHandleState = {
    orientation: 'horizontal',
    min: 0,
    max: 100,
    now: 0,
    controls: '',
    disabled: true,
    dragging: false,
  };
  /** The group the handle belongs to. */
  get group(): TpResizablePanelGroup | null {
    return (
      this.ownerGroup ??
      (this.parentElement?.localName === 'tp-resizable-panel-group'
        ? (this.parentElement as TpResizablePanelGroup)
        : null)
    );
  }
  /** @internal The group publishes the separator's values and state. */
  setHandleState(state: ResizeHandleState): void {
    if (JSON.stringify(state) === JSON.stringify(this.#state)) return;
    this.#state = state;
    this.orientation = state.orientation;
    this.requestUpdate();
  }
  /** The focusable separator element, for focusing the handle from code. */
  get separatorElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.separator') ?? null;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) this.id = createId('tp-resize-handle');
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      ['target', 'disabled', 'withHandle'].some((key) =>
        changed.has(key as keyof TpResizableHandle),
      )
    )
      this.dispatchEvent(new Event('tp-resizable-member-change', { bubbles: true }));
  }
  protected override render() {
    const state = { ...this.#state };
    return this.renderPart('resizable-panel-group-separator', state, {
      properties: {
        class: 'separator',
        role: 'separator',
        tabindex: state.disabled ? -1 : 0,
        'aria-label': this.label,
        'aria-orientation': state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
        'aria-controls': state.controls || undefined,
        '.ariaControlsElements': this.group?.getPanelElement(state.controls)
          ? [this.group.getPanelElement(state.controls)]
          : [],
        'aria-valuemin': separatorValue(state.min),
        'aria-valuemax': separatorValue(state.max),
        'aria-valuenow': separatorValue(state.now),
        'aria-disabled': state.disabled ? 'true' : undefined,
        'data-disabled': state.disabled,
        'data-dragging': state.dragging,
        'data-orientation': state.orientation,
        '@pointerdown': (event: PointerEvent) => this.group?.startResize(this, event),
        '@pointermove': (event: PointerEvent) => this.group?.moveResize(event),
        '@pointerup': (event: PointerEvent) => this.group?.endResize(event),
        '@pointercancel': (event: PointerEvent) => this.group?.endResize(event),
        '@lostpointercapture': (event: PointerEvent) => this.group?.endResize(event),
        '@keydown': (event: KeyboardEvent) => this.group?.handleKey(this, event),
        '@dblclick': (event: MouseEvent) => this.group?.resetPanel(this, event),
      },
      content: this.withHandle
        ? this.renderPart('resizable-panel-group-handle-decoration', state, {
            properties: {
              class: 'decoration',
              'aria-hidden': 'true',
              'data-orientation': state.orientation,
            },
          })
        : undefined,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-resizable-handle': TpResizableHandle;
  }
}
