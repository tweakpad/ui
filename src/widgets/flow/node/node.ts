import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { CleanupScope } from '../../../foundation/services.js';
import { containNestedEvents } from '../../../foundation/nested-events.js';
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
import {
  acceptControlValue,
  controlEventValue,
  defaultPropertyControls,
} from './property-controls.js';
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

/** The control that a node property binds, from inside it. */
const boundControl = (origin: Node): HTMLElement | null =>
  ((origin as Element).closest?.('[data-flow-property]') as HTMLElement | null | undefined) ?? null;

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
 * A node of a `tp-flow`: the positioned, focusable group that renders its node in the shape its
 * definition names (card, compact, panel or group), through a template or with authored content,
 * and holds its ports and property controls. The flow renders one for each node in view; author
 * one as a child of `tp-flow` to declare a node in markup, with the attributes `id`, `type`, `x`,
 * `y`, `width`, `height`, `parent`, `label`, `data` (JSON), `pinned`, `hidden`, and `draggable`,
 * `selectable`, `connectable`, `deletable` and `resizable` (`"false"` turns one off).
 *
 * @slot - Authored content of the node body; a library control with
 * `data-flow-property="key"` edits that key of the node's data.
 *
 * @fires tp-field-value - Reported by the node's numeric fields and stopped at the node, which
 * turns their edits into proposals of its data; it never reaches the page.
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
  /**
   * The schema definition of the node's type, which decides its shape, ports and properties; set by
   * the flow.
   */
  definition: FlowNodeDefinition | undefined;
  /** The template that replaces the node's body, from the flow's `nodeTemplates`. */
  template: FlowNodeTemplate | undefined;
  /** The control factories for the node's properties, from the flow. */
  propertyControls: FlowPropertyControls = defaultPropertyControls;
  /** The icon definitions the node's definition names, from the flow. */
  icons: Readonly<Record<string, IconDefinition>> = {};
  /** Tone keys per schema data type, for port paint. */
  tones: Readonly<Record<string, string>> = {};
  /** The flow's resolved strings, for the node's accessible names. */
  strings: FlowStrings = DEFAULT_STRINGS;
  /** The node's ports with their sides and positions, resolved by the flow. */
  ports: readonly FlowResolvedPort[] = [];
  /** Transient states of the ports by id, such as connection candidates and their validity. */
  portStates: Readonly<Record<string, FlowPortState>> = {};
  /** The node's run state, shown as its status. */
  status: FlowNodeRunState | undefined;
  /** Problems the widget shows on this node (validation issues and supplied ones). */
  issues: readonly FlowIssue[] = [];
  /** The node's accessible name; its label when empty. */
  accessibleName = '';
  /** Whether the node is selected. */
  selected = false;
  /** Whether the node holds keyboard focus within the flow. */
  focused = false;
  /** Whether the node is being dragged. */
  dragging = false;
  /** Whether a connection is being drawn in the flow, which shows the ports' candidate states. */
  connecting = false;
  /** The level of detail the node renders at; low when the flow is zoomed far out. */
  lod: FlowLod = 'high';
  /** Whether the node's controls and resizer accept edits. */
  editable = true;
  /** Whether the node's ports start and accept connections. */
  connectable = true;
  /** The direction the graph is laid out in, which places the ports on its sides. */
  layoutDirection: FlowLayoutDirection = 'horizontal';
  /** Shows each port's label beside it. */
  showPortLabels = false;

  readonly #numberFields = new Map<HTMLElement, NumberBinding>();
  #composed = new WeakSet<HTMLElement>();
  #composition: unknown;
  #slotted = false;

  constructor() {
    super();
    // Events of authored light-DOM content pass unless it is bound to a node property
    // (uwg-fl-req-evt-3).
    containNestedEvents(this, {
      types: NESTED_EVENT_TYPES,
      on: 'host',
      passes: (_event, origin) => origin.getRootNode() !== this.renderRoot && !boundControl(origin),
      contained: (event, origin) => this.#propertyEvent(event, origin),
    });
  }

  /** The flow whose presentation styles the node. */
  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  /** The id of the node in the document. */
  get nodeId(): string {
    return this.node?.id ?? this.id;
  }

  /** The shape the node renders as, from its definition: card, compact, panel or group. */
  get shape(): FlowNodeShape {
    return this.definition?.shape ?? 'card';
  }

  /** The node's visible label: its own, else its definition's, else its type. */
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

  /** The port element for a port id, or null. */
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
    if (moved && notify) this.emit(NODE_PORTS_MOVED, { nodeId: this.nodeId }, { composed: false });
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
    this.emit(
      NODE_RESIZE,
      { ...(event as CustomEvent).detail, nodeId: this.nodeId },
      { composed: false },
    );
  };

  /** Port activations are non-composed; the host re-dispatches them for the widget root. */
  #relayPortActivate = (event: Event): void => {
    if (event.target === this) return;
    event.stopPropagation();
    this.emit(PORT_ACTIVATE, (event as CustomEvent).detail, { composed: false });
  };

  /** A contained constituent event: a bound control's change becomes a node data proposal. */
  #propertyEvent(event: Event, origin: Node): void {
    const bound = boundControl(origin);
    if (!bound) return;
    const key = bound.dataset['flowProperty'];
    if (!key || !this.node) return;
    const custom = event as TpValueChangeEvent<unknown> | TpValueCommitEvent<unknown>;
    const detail = custom.detail;
    if (event.type === 'tp-value-change' || event.type === 'tp-duration-change') {
      if (!detail || typeof detail !== 'object' || !('value' in detail)) return;
      const value = controlEventValue(bound, detail.value);
      // The node owns the bound control's value: a change the graph accepts is written back at
      // once; a cancelled one cancels the control's proposal (uwg-fl-req-evt-3).
      if (this.#propose(key, value, detail.reason, event)) acceptControlValue(bound, value);
      else if (typeof custom.preventDefault === 'function') custom.preventDefault();
    } else if (event.type === 'tp-value-commit') {
      this.#commit(
        key,
        controlEventValue(bound, detail?.value),
        detail?.reason ?? 'programmatic',
        event,
      );
    }
  }

  #propose(key: string, value: unknown, reason: ChangeReason, sourceEvent: Event): boolean {
    const detail: FlowNodePropertyDetail = {
      nodeId: this.nodeId,
      key,
      value,
      reason,
      sourceEvent,
      phase: 'propose',
    };
    return this.emit<FlowNodePropertyDetail>(NODE_PROPERTY, detail, {
      composed: false,
      cancelable: true,
    });
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
    this.emit<FlowNodePropertyDetail>(NODE_PROPERTY, detail, { composed: false });
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
