import { html } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { FlowSide } from '../../../foundation/flow/types.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { flowPortStyles } from '../styles.js';

export const PORT_ACTIVATE = 'flow-port-activate';

export interface FlowPortActivateDetail {
  nodeId: string;
  portId: string;
  direction: 'input' | 'output';
  /** True when the activation came from the keyboard (Enter or Space on the button). */
  keyboard: boolean;
  sourceEvent: Event;
}

/**
 * A connection endpoint (Widgets 6.3 Anatomy port row): a native button named with the node and
 * port labels and its direction, carrying the candidate, validity and connection markers the
 * recipe paints. Pointer presses are classified by the node layer's delegated drag; the button's
 * keyboard activation starts a keyboard connection through `flow-port-activate`.
 */
export class TpFlowPort extends TpElement {
  static tagName = 'tp-flow-port';
  static override presentation = flowPresentation;
  static override properties = {
    ...TpElement.properties,
    nodeId: { type: String, attribute: 'node-id' },
    portId: { type: String, attribute: 'port-id' },
    portDirection: { type: String, attribute: 'port-direction', reflect: true },
    side: { type: String, reflect: true },
    label: { type: String },
    showLabel: { type: Boolean, attribute: 'show-label' },
    accessibleName: { type: String, attribute: 'accessible-name' },
    dataType: { type: String, attribute: 'data-type' },
    tone: { type: String, reflect: true },
    connectable: { type: Boolean },
    connected: { type: Boolean },
    multiple: { type: Boolean },
    required: { type: Boolean },
    candidate: { type: Boolean },
    candidateFocused: { type: Boolean, attribute: 'candidate-focused' },
    valid: { attribute: false },
    clickConnecting: { type: Boolean, attribute: 'click-connecting' },
    issue: { type: String },
    labelPlacement: { type: String, attribute: 'label-placement' },
  };
  static override styles = [TpElement.styles, flowPortStyles];

  nodeId = '';
  portId = '';
  portDirection: 'input' | 'output' = 'input';
  side: FlowSide = 'left';
  label = '';
  showLabel = false;
  accessibleName = '';
  dataType = '';
  tone = '';
  connectable = true;
  connected = false;
  multiple = false;
  required = false;
  candidate = false;
  candidateFocused = false;
  /** Tri-state validity while a connection is in progress. */
  valid: boolean | null = null;
  clickConnecting = false;
  /** A problem reported for the port: `error` or `warning` (an unconnected required input). */
  issue: '' | 'error' | 'warning' = '';
  labelPlacement: 'before' | 'after' = 'after';

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    const host = root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
    // A port inside a node host resolves to the flow root that owns the family.
    const owner = host?.getRootNode();
    return owner instanceof ShadowRoot ? (owner.host as HTMLElement) : host;
  }

  get button(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector('button') ?? null;
  }

  override focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  #click = (event: MouseEvent): void => {
    if (this.disabled || !this.connectable) return;
    this.emit<FlowPortActivateDetail>(
      PORT_ACTIVATE,
      {
        nodeId: this.nodeId,
        portId: this.portId,
        direction: this.portDirection,
        keyboard: event.detail === 0,
        sourceEvent: event,
      },
      { composed: false },
    );
  };

  protected override render() {
    const label =
      this.showLabel && this.label
        ? html`<span class="label" part="flow-port-label">${this.label}</span>`
        : null;
    const button = this.renderPart(
      'flow-port',
      { direction: this.portDirection, connected: this.connected, candidate: this.candidate },
      {
        tag: 'button',
        properties: {
          part: 'flow-port',
          type: 'button',
          'aria-label': this.accessibleName || this.label || this.portId,
          'aria-disabled': this.disabled || !this.connectable ? 'true' : undefined,
          'aria-pressed': this.clickConnecting ? 'true' : undefined,
          'aria-keyshortcuts': 'Enter',
          tabindex: this.disabled ? -1 : 0,
          'data-direction': this.portDirection,
          'data-side': this.side,
          'data-connected': this.connected,
          'data-candidate': this.candidate,
          'data-candidate-focused': this.candidateFocused,
          'data-valid': this.valid === true,
          'data-invalid': this.valid === false,
          'data-click-connecting': this.clickConnecting,
          'data-multiple': this.multiple,
          'data-required': this.required,
          'data-issue': this.issue || undefined,
          'data-tone': this.tone || undefined,
          'data-port': this.portId,
          'data-node': this.nodeId,
          '@click': this.#click,
        },
        content: html`<span class="dot" part="flow-port-dot" aria-hidden="true"></span>`,
      },
    );
    return this.labelPlacement === 'before' ? html`${label}${button}` : html`${button}${label}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-port': TpFlowPort;
  }
}
