import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { CleanupScope } from '../../../foundation/services.js';
import {
  NumberFieldController,
  type NumberFieldOptions,
} from '../../../foundation/number-field/controller.js';
import type { TpValueChangeEvent, TpValueCommitEvent } from '../../../foundation/events.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type {
  FlowIssue,
  FlowLayoutDirection,
  FlowNode,
  FlowNodeDefinition,
  FlowNodeShape,
  FlowPortGeometry,
  FlowPropertyDefinition,
  FlowResolvedPort,
} from '../../../foundation/flow/types.js';
import type { FlowNodeRunState } from '../../../foundation/flow/run/types.js';
import type { IconDefinition } from '../../../icons/types.js';
import { propertyPlacement } from '../../../foundation/flow/defaults.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { setPartComposition } from '../../../presentation/controller.js';
import { TpCard } from '../../../components/card/card.js';
import { TpListItem } from '../../../components/list/list-item.js';
import { TpBadge } from '../../../components/badge/badge.js';
import { TpMarker } from '../../../components/marker/marker.js';
import { TpSpinner } from '../../../components/spinner/spinner.js';
import { TpProgress } from '../../../components/progress/progress.js';
import { TpTooltip } from '../../../components/tooltip/tooltip.js';
import { TpButton } from '../../../components/button/button.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpInput } from '../../../components/input/input.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { TpTextArea } from '../../../components/text-area/text-area.js';
import { TpSlider } from '../../../components/slider/slider.js';
import { TpSelect } from '../../../components/select/select.js';
import { TpSwitch } from '../../../components/switch/switch.js';
import { TpCheckbox } from '../../../components/checkbox/checkbox.js';
import { TpColorPicker } from '../../color-picker/color-picker.js';
import { TpEasingEditor } from '../../easing-editor/easing-editor.js';
import { TpFlowPort, PORT_ACTIVATE } from './port.js';
import { TpFlowNodeResizer, NODE_RESIZE } from './resizer.js';
import { flowNodeStyles } from '../styles.js';
import { DEFAULT_STRINGS } from '../strings.js';
import type {
  FlowLod,
  FlowNodeTemplate,
  FlowPropertyControlContext,
  FlowPropertyControls,
  FlowStrings,
} from '../types.js';
import { controlEventValue, defaultPropertyControls } from './property-controls.js';
import {
  problemSeverity,
  renderCardShape,
  renderCompactShape,
  renderGroupShape,
  renderPanelShape,
  renderShellShape,
  type ShapeContext,
} from './default-templates.js';

export const NODE_PROPERTY = 'flow-node-property';
export const NODE_PORTS_MOVED = 'flow-node-ports';

export interface FlowNodePropertyDetail {
  nodeId: string;
  key: string;
  value: unknown;
  reason: ChangeReason;
  sourceEvent: Event;
  phase: 'propose' | 'commit';
}

export interface FlowPortState {
  candidate?: boolean;
  candidateFocused?: boolean;
  valid?: boolean | null;
  clickConnecting?: boolean;
  /** The worst problem the widget's issues report for the port. */
  issue?: 'error' | 'warning';
  connected?: boolean;
}

/** Lane events of composed controls that stop at the node and become node data proposals. */
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-format-change',
  'tp-view-change',
  'tp-harmony-change',
  'tp-duration-change',
  'tp-adapter-change',
  'tp-presence-complete',
] as const;

const EXPORTED_PARTS = [
  'flow-node',
  'flow-node-card',
  'flow-node-shell',
  'flow-node-header',
  'flow-node-icon',
  'flow-node-title',
  'flow-node-description',
  'flow-node-body',
  'flow-node-row',
  'flow-node-row-label',
  'flow-node-row-control',
  'flow-node-footer',
  'flow-node-status',
  'flow-node-group',
  'flow-node-ports',
  'flow-port',
  'flow-port-dot',
  'flow-port-label',
];

interface NumberBinding {
  controller: NumberFieldController;
  root: HTMLElement;
  input: TpInput;
  key: string;
  scope: CleanupScope;
}

/**
 * A node host (Widgets 6.3 Anatomy node row): the positioned, measured, focusable group that
 * renders its node through the definition's shape (card, compact, panel, group), a custom
 * template or authored light-DOM content, hosts the ports and binds the property controls.
 * Positions are written by the node layer through the object model; the host never reads the
 * viewport. Lane events of composed controls stop here and are re-proposed on the node lane.
 */
export class TpFlowNode extends TpElement {
  static tagName = 'tp-flow-node';
  static override presentation = flowPresentation;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: false };
  static get elementDependencies() {
    return [
      TpFlowPort,
      TpFlowNodeResizer,
      TpCard,
      TpListItem,
      TpBadge,
      TpMarker,
      TpSpinner,
      TpProgress,
      TpTooltip,
      TpButton,
      TpIcon,
      TpInput,
      TpInputGroup,
      TpTextArea,
      TpSlider,
      TpSelect,
      TpSwitch,
      TpCheckbox,
      TpColorPicker,
      TpEasingEditor,
    ];
  }
  static override properties = {
    ...TpElement.properties,
    node: { attribute: false },
    definition: { attribute: false },
    template: { attribute: false },
    propertyControls: { attribute: false },
    icons: { attribute: false },
    tones: { attribute: false },
    strings: { attribute: false },
    ports: { attribute: false },
    portStates: { attribute: false },
    status: { attribute: false },
    issues: { attribute: false },
    accessibleName: { type: String, attribute: 'accessible-name' },
    selected: { type: Boolean },
    focused: { type: Boolean },
    dragging: { type: Boolean },
    connecting: { type: Boolean },
    lod: { type: String },
    editable: { type: Boolean },
    connectable: { type: Boolean },
    layoutDirection: { type: String, attribute: 'layout-direction' },
    showPortLabels: { type: Boolean, attribute: 'show-port-labels' },
  };
  static override styles = [TpElement.styles, flowNodeStyles];

  /** The model record; undefined for an authored element not yet adopted. */
  node: FlowNode | undefined;
  definition: FlowNodeDefinition | undefined;
  template: FlowNodeTemplate | undefined;
  propertyControls: FlowPropertyControls = defaultPropertyControls;
  icons: Readonly<Record<string, IconDefinition>> = {};
  /** Tone keys per schema data type, for port paint. */
  tones: Readonly<Record<string, string>> = {};
  strings: FlowStrings = DEFAULT_STRINGS;
  ports: readonly FlowResolvedPort[] = [];
  portStates: Readonly<Record<string, FlowPortState>> = {};
  status: FlowNodeRunState | undefined;
  /** Problems the widget shows on this node (validation issues and supplied ones). */
  issues: readonly FlowIssue[] = [];
  accessibleName = '';
  selected = false;
  focused = false;
  dragging = false;
  connecting = false;
  lod: FlowLod = 'high';
  editable = true;
  connectable = true;
  layoutDirection: FlowLayoutDirection = 'horizontal';
  showPortLabels = false;

  readonly #numberFields = new Map<HTMLElement, NumberBinding>();
  #composed = new WeakSet<HTMLElement>();
  #composition: unknown;
  #slotted = false;

  constructor() {
    super();
    for (const type of NESTED_EVENT_TYPES) this.addEventListener(type, this.#containNested, true);
  }

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get nodeId(): string {
    return this.node?.id ?? this.id;
  }

  get shape(): FlowNodeShape {
    return this.definition?.shape ?? 'card';
  }

  get label(): string {
    return this.node?.label ?? this.definition?.label ?? this.node?.type ?? this.id;
  }

  /** The host element itself is the focusable group. */
  override focus(options?: FocusOptions): void {
    HTMLElement.prototype.focus.call(this, options);
  }

  /** Ports' boxes relative to the host box in flow units (the layer supplies the zoom). */
  measurePorts(zoom: number): FlowPortGeometry[] {
    // The caller is measuring: positioning must not announce a move that re-enters it.
    this.#positionRowPorts(false);
    const hostRect = this.getBoundingClientRect();
    const result: FlowPortGeometry[] = [];
    const scale = zoom || 1;
    for (const port of this.renderRoot.querySelectorAll<TpFlowPort>('tp-flow-port')) {
      const button = port.button;
      if (!button) continue;
      const rect = button.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      result.push({
        id: port.portId,
        x: (rect.left - hostRect.left) / scale,
        y: (rect.top - hostRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
        side: port.side,
      });
    }
    return result;
  }

  portElement(portId: string): TpFlowPort | null {
    return this.renderRoot.querySelector<TpFlowPort>(
      `tp-flow-port[port-id="${CSS.escape(portId)}"]`,
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener(PORT_ACTIVATE, this.#relayPortActivate);
    this.renderRoot.addEventListener(NODE_RESIZE, this.#relayResize);
    this.setAttribute('exportparts', EXPORTED_PARTS.join(', '));
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const binding of this.#numberFields.values()) this.#disposeNumber(binding);
    this.#numberFields.clear();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.setAttribute('aria-roledescription', this.strings.node);
    this.setAttribute('aria-label', this.accessibleName || this.label);
    this.toggleAttribute('data-selected', this.selected);
    this.toggleAttribute('data-dragging', this.dragging);
    this.toggleAttribute('data-focused', this.focused);
    this.dataset['shape'] = this.shape;
    if (this.status) this.dataset['status'] = this.status.status;
    else delete this.dataset['status'];
    const problem = problemSeverity(this.issues, this.status);
    if (problem) this.dataset['problem'] = problem;
    else delete this.dataset['problem'];
    this.#syncNumberFields();
    this.#syncComposition();
    this.#positionRowPorts();
  }

  /**
   * Panel rows own their ports' vertical position: align each side port with its row. With
   * `notify`, a moved port announces `NODE_PORTS_MOVED` so the layer re-measures; the method is
   * never re-entered from that path.
   */
  #positionRowPorts(notify = true): void {
    if (this.#positioningRows) return;
    const groups = this.renderRoot.querySelectorAll<HTMLElement>('.ports[data-rows]');
    if (!groups.length) return;
    this.#positioningRows = true;
    try {
      this.#alignRowPorts(groups, notify);
    } finally {
      this.#positioningRows = false;
    }
  }
  #positioningRows = false;

  #alignRowPorts(groups: NodeListOf<HTMLElement>, notify: boolean): void {
    const hostRect = this.getBoundingClientRect();
    const scale = hostRect.height ? this.offsetHeight / hostRect.height : 1;
    let moved = false;
    let pending = false;
    for (const group of groups)
      for (const port of group.querySelectorAll<HTMLElement>('tp-flow-port')) {
        const id = port.getAttribute('port-id');
        const row = id
          ? this.renderRoot.querySelector<HTMLElement>(`[data-port-id="${CSS.escape(id)}"]`)
          : null;
        if (!row) continue;
        const rect = row.getBoundingClientRect();
        if (!rect.height || !hostRect.height) {
          // The composed card has not laid out its rows yet; try again next frame.
          pending = true;
          continue;
        }
        const top = `${(rect.top - hostRect.top + rect.height / 2) * scale}px`;
        if (port.style.insetBlockStart !== top) {
          port.style.insetBlockStart = top;
          moved = true;
        }
      }
    if (pending && !this.#rowsRetry) {
      this.#rowsRetry = true;
      requestAnimationFrame(() => {
        this.#rowsRetry = false;
        if (this.isConnected) this.#positionRowPorts();
      });
    }
    if (moved && notify)
      this.dispatchEvent(
        new CustomEvent(NODE_PORTS_MOVED, {
          bubbles: true,
          composed: false,
          detail: { nodeId: this.nodeId },
        }),
      );
  }
  #rowsRetry = false;

  // ---- nested events ---------------------------------------------------------------------------

  /** Whether the node may be resized (node flag, then definition). */
  get resizable(): boolean {
    return this.node?.resizable ?? this.definition?.resizable ?? false;
  }

  /** Resize gestures are non-composed; the host re-dispatches them for the widget root. */
  #relayResize = (event: Event): void => {
    if (event.target === this) return;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(NODE_RESIZE, {
        bubbles: true,
        composed: false,
        detail: { ...(event as CustomEvent).detail, nodeId: this.nodeId },
      }),
    );
  };

  /** Port activations are non-composed; the host re-dispatches them for the widget root. */
  #relayPortActivate = (event: Event): void => {
    if (event.target === this) return;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(PORT_ACTIVATE, {
        bubbles: true,
        composed: false,
        detail: (event as CustomEvent).detail,
      }),
    );
  };

  #containNested = (event: Event): void => {
    // Capture listeners on the host see the retargeted event; the real target is the path head.
    const target = event.composedPath()[0] as HTMLElement | undefined;
    if (!target || target === this) return;
    const inShadow = target.getRootNode() === this.renderRoot;
    const bound = target.closest?.('[data-flow-property]') as HTMLElement | null;
    if (!inShadow && !bound) return;
    event.stopPropagation();
    if (!bound) return;
    const key = bound.dataset['flowProperty'];
    if (!key || !this.node) return;
    const custom = event as TpValueChangeEvent<unknown> | TpValueCommitEvent<unknown>;
    const detail = custom.detail;
    if (event.type === 'tp-value-change' || event.type === 'tp-duration-change') {
      if (!detail || typeof detail !== 'object' || !('value' in detail)) return;
      const accepted = this.#propose(
        key,
        controlEventValue(bound, detail.value),
        detail.reason,
        event,
      );
      if (!accepted && typeof custom.preventDefault === 'function') custom.preventDefault();
    } else if (event.type === 'tp-value-commit') {
      this.#commit(
        key,
        controlEventValue(bound, detail?.value),
        detail?.reason ?? 'programmatic',
        event,
      );
    }
  };

  #propose(key: string, value: unknown, reason: ChangeReason, sourceEvent: Event): boolean {
    const detail: FlowNodePropertyDetail = {
      nodeId: this.nodeId,
      key,
      value,
      reason,
      sourceEvent,
      phase: 'propose',
    };
    return this.dispatchEvent(
      new CustomEvent<FlowNodePropertyDetail>(NODE_PROPERTY, {
        bubbles: true,
        composed: false,
        cancelable: true,
        detail,
      }),
    );
  }

  #commit(key: string, value: unknown, reason: ChangeReason, sourceEvent: Event): void {
    const detail: FlowNodePropertyDetail = {
      nodeId: this.nodeId,
      key,
      value,
      reason,
      sourceEvent,
      phase: 'commit',
    };
    this.dispatchEvent(
      new CustomEvent<FlowNodePropertyDetail>(NODE_PROPERTY, {
        bubbles: true,
        composed: false,
        detail,
      }),
    );
  }

  // ---- number fields -----------------------------------------------------------------------------

  #syncNumberFields(): void {
    for (const [root, binding] of this.#numberFields)
      if (!root.isConnected || root.getRootNode() !== this.renderRoot) {
        this.#disposeNumber(binding);
        this.#numberFields.delete(root);
      }
    for (const root of this.renderRoot.querySelectorAll<HTMLElement>('[data-number-field]')) {
      const key = root.dataset['numberField']!;
      const definition = this.#property(key);
      const input = root.querySelector<TpInput>('tp-input');
      if (!definition || !input) continue;
      const value = this.#numberValue(key);
      const existing = this.#numberFields.get(root);
      if (existing) {
        const options = this.#numberOptions(definition);
        existing.controller.update(
          Object.is(existing.controller.value, value) ? options : { ...options, value },
        );
        continue;
      }
      if (!input.hasUpdated) {
        void input.updateComplete.then(() => this.requestUpdate());
        continue;
      }
      const scope = new CleanupScope();
      const controller = new NumberFieldController(root, input, {
        ...this.#numberOptions(definition),
        value,
      });
      if (root.localName === 'tp-input-group') scope.add(controller.registerGroup(root).dispose);
      this.#numberFields.set(root, { controller, root, input, key, scope });
    }
  }

  #numberOptions(definition: FlowPropertyDefinition): NumberFieldOptions {
    const options: NumberFieldOptions = {
      step: definition.step ?? 'any',
      disabled: this.disabled || !this.editable,
      readOnly: this.readOnly,
    };
    if (definition.min !== undefined) options.minimum = definition.min;
    if (definition.max !== undefined) options.maximum = definition.max;
    return options;
  }

  #numberValue(key: string): number | null {
    const raw = this.node?.data[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  }

  #disposeNumber(binding: NumberBinding): void {
    binding.scope.dispose();
    binding.controller.dispose();
  }

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    for (const nested of this.renderRoot.querySelectorAll<
      HTMLElement & { partPresentation?: unknown }
    >(
      'tp-card, tp-list-item, tp-badge, tp-marker, tp-slider, tp-input, tp-input-group, tp-select, tp-switch, tp-checkbox, tp-text-area, tp-color-picker, tp-easing-editor, tp-flow-port',
    )) {
      if (!changed && this.#composed.has(nested)) continue;
      this.#composed.add(nested);
      setPartComposition(
        nested as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
  }

  // ---- rendering ---------------------------------------------------------------------------------

  #property(key: string): FlowPropertyDefinition | undefined {
    return this.definition?.properties?.find((property) => property.key === key);
  }

  #visible(property: FlowPropertyDefinition): boolean {
    const condition = property.visibleWhen;
    if (!condition || !this.node) return true;
    if (typeof condition === 'function') return condition(this.node.data);
    const value = this.node.data[condition.key];
    if (condition.truthy !== undefined) return Boolean(value) === condition.truthy;
    if (condition.in) return condition.in.includes(value);
    if ('equals' in condition) return value === condition.equals;
    return true;
  }

  #renderPort = (
    port: FlowResolvedPort,
    options: { label?: boolean; placement?: 'before' | 'after' } = {},
  ): TemplateResult => {
    const state = this.portStates[port.id] ?? {};
    const direction = port.direction === 'input' ? this.strings.input : this.strings.output;
    const name = `${this.label}: ${port.label ?? port.id} ${direction}`;
    const tone = port.dataType ? (this.#dataTypeTone(port.dataType) ?? '') : '';
    return html`<tp-flow-port
      class="port"
      node-id=${this.nodeId}
      port-id=${port.id}
      port-direction=${port.direction}
      side=${port.geometry.side}
      label=${port.label ?? port.id}
      ?show-label=${options.label ?? this.showPortLabels}
      label-placement=${options.placement ?? (port.geometry.side === 'right' ? 'before' : 'after')}
      accessible-name=${name}
      data-type=${port.dataType ?? ''}
      tone=${tone}
      ?connectable=${this.connectable && !this.disabled}
      ?connected=${Boolean(state.connected)}
      ?multiple=${port.multiple ?? port.direction === 'output'}
      ?required=${Boolean(port.required)}
      ?candidate=${Boolean(state.candidate)}
      ?candidate-focused=${Boolean(state.candidateFocused)}
      .valid=${state.valid ?? null}
      ?click-connecting=${Boolean(state.clickConnecting)}
      issue=${state.issue ?? ''}
      ?disabled=${this.disabled}
    ></tp-flow-port>`;
  };

  #dataTypeTone(dataType: string): string | undefined {
    return this.tones[dataType];
  }

  #renderControl = (key: string): TemplateResult => {
    const definition = this.#property(key);
    if (!definition || !this.node || !this.#visible(definition)) return html`${nothing}`;
    const factory =
      this.propertyControls[definition.control] ?? defaultPropertyControls[definition.control];
    if (!factory) return html`${nothing}`;
    const port = this.ports.find(
      (candidate) => candidate.control === key || definition.port === candidate.id,
    );
    const connected = port ? Boolean(this.portStates[port.id]?.connected) : false;
    const context: FlowPropertyControlContext = {
      node: this.node,
      definition,
      value: this.node.data[key] ?? definition.default,
      disabled: this.disabled || !this.editable || connected,
      readOnly: this.readOnly,
      propose: (value, reason, sourceEvent) =>
        this.#propose(key, value, reason, sourceEvent ?? new Event('change')),
      commit: (reason) => this.#commit(key, this.node?.data[key], reason, new Event('change')),
      port: connected ? port : undefined,
      id: `${this.nodeId}-${key}`,
    };
    return factory(context);
  };

  #slotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    // A shape that moves the slot (the card body appears with authored content) removes the old
    // slot, which reports an empty assignment; only the rendered slot counts.
    if (!slot.isConnected) return;
    const occupied = slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType === 1 || (node.textContent ?? '').trim());
    if (occupied !== this.#slotted) {
      this.#slotted = occupied;
      this.requestUpdate();
    }
  };

  protected override render() {
    const node = this.node;
    const definition = this.definition;
    const icon = definition?.icon ? this.icons[definition.icon] : undefined;
    // The body holds the properties the schema places on the node; the rest live in the inspector.
    const properties = (definition?.properties ?? []).filter(
      (property) => propertyPlacement(definition, property) === 'node' && this.#visible(property),
    );
    const slot = html`<slot @slotchange=${this.#slotChange}></slot>`;
    const context: ShapeContext = {
      node: node ?? { id: this.id, type: '', position: { x: 0, y: 0 }, data: {} },
      definition,
      label: this.label,
      description: definition?.description,
      icon,
      tone: node?.type && definition?.tone ? definition.tone : undefined,
      lod: this.lod,
      status: this.status,
      issues: this.issues,
      strings: this.strings,
      ports: this.ports,
      properties,
      port: this.#renderPort,
      control: this.#renderControl,
      slot,
      slotted: this.#slotted,
    };
    const shape = this.shape;
    const body = this.template
      ? html`${this.template({
          node: context.node,
          definition,
          selected: this.selected,
          dragging: this.dragging,
          lod: this.lod,
          status: this.status,
          ports: (side) =>
            html`${this.ports.filter((port) => port.geometry.side === side && !port.hidden).map((port) => this.#renderPort(port))}`,
          control: this.#renderControl,
        })}${slot}`
      : this.lod === 'low' && shape !== 'group'
        ? renderShellShape(context, shape)
        : shape === 'compact'
          ? renderCompactShape(context)
          : shape === 'panel'
            ? renderPanelShape(context)
            : shape === 'group'
              ? renderGroupShape(context)
              : renderCardShape(context);
    const tone = definition?.tone ?? '';
    return this.renderPart(
      'flow-node',
      { shape, selected: this.selected, dragging: this.dragging, lod: this.lod },
      {
        tag: 'div',
        properties: {
          part: 'flow-node',
          class: 'host',
          'data-shape': shape,
          'data-tone': tone || undefined,
          'data-selected': this.selected,
          'data-focused': this.focused,
          'data-focus-visible': this.focused && this.matches(':focus-visible'),
          'data-dragging': this.dragging,
          'data-connecting': this.connecting,
          'data-status': this.status?.status,
          'data-problem': problemSeverity(this.issues, this.status),
          'data-warnings': Boolean(this.status?.warnings?.length),
          'data-lod': this.lod,
          'data-pinned': Boolean(node?.pinned),
          'data-parent': Boolean(node?.parentId),
          'data-slotted': this.#slotted,
          'data-disabled': this.disabled,
          'data-readonly': this.readOnly,
        },
        content: html`${body}${
          this.resizable && this.selected && this.editable && !this.readOnly && !this.disabled
            ? html`<tp-flow-node-resizer
                .strings=${this.strings}
                node-label=${this.label}
              ></tp-flow-node-resizer>`
            : nothing
        }`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-node': TpFlowNode;
  }
}
