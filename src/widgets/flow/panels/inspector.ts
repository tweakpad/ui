import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { CleanupScope } from '../../../foundation/services.js';
import { focusableElements } from '../../../foundation/focus.js';
import {
  NumberFieldController,
  type NumberFieldOptions,
} from '../../../foundation/number-field/controller.js';
import type { TpValueChangeEvent, TpValueCommitEvent } from '../../../foundation/events.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type {
  FlowEdge,
  FlowNode,
  FlowNodeDefinition,
  FlowPropertyDefinition,
} from '../../../foundation/flow/types.js';
import type { FlowNodeRunState, FlowNodeRunStatus } from '../../../foundation/flow/run/types.js';
import type { IconDefinition } from '../../../icons/types.js';
import { xIcon } from '../../../icons/x.js';
import { gitBranchIcon } from '../../../icons/git-branch.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { TpBadge } from '../../../components/badge/badge.js';
import { TpButton } from '../../../components/button/button.js';
import { TpField } from '../../../components/field/field.js';
import { TpForm } from '../../../components/form/form.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpInput } from '../../../components/input/input.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { TpListItem } from '../../../components/list-item/list-item.js';
import { TpListItemGroup } from '../../../components/list-item/group.js';
import { TpTabs } from '../../../components/tabs/tabs.js';
import { TpTextArea } from '../../../components/text-area/text-area.js';
import { TpSlider } from '../../../components/slider/slider.js';
import { TpSelect } from '../../../components/select/select.js';
import { TpSwitch } from '../../../components/switch/switch.js';
import { TpCheckbox } from '../../../components/checkbox/checkbox.js';
import { TpColorPicker } from '../../color-picker/color-picker.js';
import { TpEasingEditor } from '../../easing-editor/easing-editor.js';
import { resolveStrings } from '../strings.js';
import { controlEventValue, defaultPropertyControls } from '../node/property-controls.js';
import type { FlowPropertyControlContext, FlowPropertyControls, FlowStrings } from '../types.js';

export const INSPECTOR_CHANGE = 'flow-inspector-change';
export const INSPECTOR_COMMIT = 'flow-inspector-commit';
export const INSPECTOR_FOCUS_EDGE = 'flow-inspector-focus-edge';
export const INSPECTOR_CLOSE = 'flow-inspector-close';

export type FlowInspectorTab = 'settings' | 'wiring' | 'run';
export type FlowInspectorCommit = 'live' | 'explicit';

export interface FlowInspectorConnection {
  edge: FlowEdge;
  /** The other node's label (with the port names appended by the inspector). */
  label: string;
}
export interface FlowInspectorConnections {
  incoming: readonly FlowInspectorConnection[];
  outgoing: readonly FlowInspectorConnection[];
}

export interface FlowInspectorChangeDetail {
  nodeId: string;
  key: string;
  value: unknown;
  reason: ChangeReason;
  sourceEvent: Event | null;
}
export interface FlowInspectorCommitDetail {
  nodeId: string;
  /** The keys the commit covers (explicit mode) or the one key that settled (live mode). */
  keys: readonly string[];
  sourceEvent: Event | null;
}
export interface FlowInspectorFocusEdgeDetail {
  edgeId: string;
  sourceEvent: Event;
}
export interface FlowInspectorCloseDetail {
  sourceEvent: Event;
}

/** Lane events of the composed controls that stop at the inspector and become edits. */
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
  'tp-query-change',
] as const;

/** NumberField reasons after which a live edit counts as settled. */
const NUMBER_SETTLE_REASONS: ReadonlySet<ChangeReason> = new Set([
  'input-blur',
  'increment',
  'decrement',
  'keyboard',
  'scrub',
  'wheel',
]);

const BADGE_VARIANTS: Record<FlowNodeRunStatus, TpBadge['variant']> = {
  success: 'success',
  failed: 'destructive',
  running: 'default',
  waiting: 'warning',
  pending: 'warning',
  idle: 'secondary',
  skipped: 'secondary',
  cancelled: 'secondary',
};
const STATUS_STRINGS: Record<FlowNodeRunStatus, keyof FlowStrings> = {
  idle: 'statusIdle',
  pending: 'statusPending',
  running: 'statusRunning',
  waiting: 'statusWaiting',
  success: 'statusSuccess',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
  cancelled: 'statusCancelled',
};

interface NumberBinding {
  controller: NumberFieldController;
  scope: CleanupScope;
}

const inspectorStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
    block-size: 100%;
  }

  :host(:not([open])) {
    display: none;
  }

  .inspector {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    flex: 1 1 auto;
    inline-size: 100%;
  }

  .header {
    display: flex;
    align-items: flex-start;
    flex: none;
  }

  .titles {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    flex: 1 1 auto;
  }

  .title,
  .subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tp-tabs.tabs {
    flex: none;
  }

  /* One body below the tab list: the active tab's content, scrolling inside the panel. */
  .body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: auto;
  }

  tp-form.form,
  .fields {
    display: flex;
    flex-direction: column;
    gap: inherit;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    flex: none;
  }

  .empty {
    color: var(--tp-muted-foreground);
  }

  dl.run {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--tp-space-2) var(--tp-space-3);
    margin: 0;
  }

  dl.run dt {
    color: var(--tp-muted-foreground);
  }

  dl.run dd {
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
`;

/**
 * The inspector (Widgets 6.3 Anatomy): the side panel the root docks inline-end inside its
 * Resizable panel, with Tabs for Settings (one Field per visible property definition, edited by
 * the library control its definition names), Wiring (the node's connections as List items) and
 * Run (status badge, attempts, duration, message, error). Edits are reported through
 * `flow-inspector-change`; in `explicit` mode they stay local until Save (one change per edited
 * key, then `flow-inspector-commit`) and Cancel reverts silently.
 */
export class TpFlowInspector extends TpElement {
  static tagName = 'tp-flow-inspector';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [
      TpTabs,
      TpForm,
      TpField,
      TpButton,
      TpIcon,
      TpListItem,
      TpListItemGroup,
      TpBadge,
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
    label: { type: String },
    node: { attribute: false },
    definition: { attribute: false },
    propertyControls: { attribute: false },
    icons: { attribute: false },
    strings: { attribute: false },
    connections: { attribute: false },
    run: { attribute: false },
    commit: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    tab: { type: String, reflect: true },
  };
  static override styles = [TpElement.styles, inspectorStyles];

  node: FlowNode | undefined;
  definition: FlowNodeDefinition | undefined;
  propertyControls: FlowPropertyControls = defaultPropertyControls;
  icons: Record<string, IconDefinition> = {};
  strings: Partial<FlowStrings> | undefined;
  connections: FlowInspectorConnections = { incoming: [], outgoing: [] };
  run: FlowNodeRunState | undefined;
  commit: FlowInspectorCommit = 'live';
  /** Region name; unique per page when several graphs show an inspector. */
  label = '';
  open = false;
  tab: FlowInspectorTab = 'settings';

  /** Edits not yet reflected by `node` (explicit mode: until Save or Cancel). */
  #draft = new Map<string, unknown>();
  #draftNodeId: string | undefined;
  readonly #numberFields = new Map<HTMLElement, NumberBinding>();
  readonly #id = `tp-flow-inspector-${Math.random().toString(36).slice(2, 8)}`;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  /** Keys edited since the last commit, in edit order (explicit mode). */
  get dirtyKeys(): readonly string[] {
    return [...this.#draft.keys()].filter(
      (key) => !Object.is(this.#draft.get(key), this.node?.data[key]),
    );
  }

  /**
   * Focuses the first focusable element of the active tab's body (through composed controls
   * such as an Input group that do not delegate focus), else the tab list.
   */
  override focus(options?: FocusOptions): void {
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    const target =
      (body ? focusableElements(body)[0] : undefined) ??
      this.renderRoot.querySelector<HTMLElement>('tp-tabs');
    if (target) target.focus(options);
    else super.focus(options);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // On the shadow root, where the target is the control itself (the host retargets it).
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.addEventListener(type, this.#containNested);
    this.renderRoot.addEventListener('focusout', this.#numberBlur as EventListener);
  }

  /**
   * A NumberField whose typed text already parses to the current value re-proposes nothing on
   * blur, so leaving the field settles a pending live edit here.
   */
  #numberBlur = (event: FocusEvent): void => {
    const target = event.target as HTMLElement | null;
    const bound = target?.closest?.(
      '[data-flow-property][data-number-field]',
    ) as HTMLElement | null;
    const key = bound?.dataset['flowProperty'];
    if (!bound || !key || !this.node || this.commit !== 'live') return;
    const related = event.relatedTarget as Node | null;
    if (related && bound.contains(related)) return;
    if (this.#pendingLive.has(key)) this.#settle(key, event);
  };

  override disconnectedCallback(): void {
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.removeEventListener(type, this.#containNested);
    for (const binding of this.#numberFields.values()) this.#disposeNumber(binding);
    this.#numberFields.clear();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('node')) {
      const id = this.node?.id;
      // A new node drops the draft; in live mode the root's node is the only source.
      if (id !== this.#draftNodeId || this.commit === 'live') this.#draft.clear();
      if (id !== this.#draftNodeId) this.#pendingLive.clear();
      this.#draftNodeId = id;
    }
    if (changed.has('commit') && this.commit === 'live') this.#draft.clear();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-dirty', this.dirtyKeys.length > 0);
    this.#syncNumberFields();
  }

  // ---- edits -----------------------------------------------------------------------------------

  #containNested = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target === this || target.getRootNode() !== this.renderRoot) return;
    event.stopPropagation();
    if (event.type === 'tp-value-change' && target.localName === 'tp-tabs') {
      const value = (event as TpValueChangeEvent<unknown>).detail.value;
      if (value === 'settings' || value === 'wiring' || value === 'run') this.tab = value;
      return;
    }
    const bound = target.closest?.('[data-flow-property]') as HTMLElement | null;
    if (!bound || !this.node) return;
    const key = bound.dataset['flowProperty'];
    if (!key) return;
    const custom = event as TpValueChangeEvent<unknown> | TpValueCommitEvent<unknown>;
    const detail = custom.detail;
    const numberRoot = bound.hasAttribute('data-number-field');
    if (event.type === 'tp-value-change' || event.type === 'tp-duration-change') {
      if (!detail || typeof detail !== 'object' || !('value' in detail)) return;
      // A NumberField re-proposes its Input's text as the parsed number; a cleared field is
      // pending until a number is typed.
      if (numberRoot && detail.reason === 'input-clear') return;
      this.#edit(
        key,
        numberRoot ? detail.value : controlEventValue(bound, detail.value),
        detail.reason,
        event,
      );
      // NumberField publishes no commit: its blur and step reasons settle the edit.
      if (numberRoot && NUMBER_SETTLE_REASONS.has(detail.reason)) this.#settle(key, event);
    } else if (event.type === 'tp-value-commit') {
      this.#settle(key, event);
    }
  };

  #edit(key: string, value: unknown, reason: ChangeReason, sourceEvent: Event): void {
    if (!this.node) return;
    if (
      this.#draft.has(key)
        ? Object.is(this.#draft.get(key), value)
        : Object.is(this.node.data[key], value)
    )
      return;
    this.#draft.set(key, value);
    this.#draftNodeId = this.node.id;
    this.requestUpdate();
    if (this.commit === 'live') {
      this.#pendingLive.add(key);
      this.#change(key, value, reason, sourceEvent);
    }
  }

  /** Live edits proposed since their last settle (the draft itself clears on every node update). */
  readonly #pendingLive = new Set<string>();

  #settle(key: string, sourceEvent: Event): void {
    if (this.commit !== 'live' || !this.node) return;
    this.#pendingLive.delete(key);
    this.dispatchEvent(
      new CustomEvent<FlowInspectorCommitDetail>(INSPECTOR_COMMIT, {
        bubbles: true,
        composed: false,
        detail: { nodeId: this.node.id, keys: [key], sourceEvent },
      }),
    );
  }

  #change(key: string, value: unknown, reason: ChangeReason, sourceEvent: Event | null): void {
    if (!this.node) return;
    this.dispatchEvent(
      new CustomEvent<FlowInspectorChangeDetail>(INSPECTOR_CHANGE, {
        bubbles: true,
        composed: false,
        detail: { nodeId: this.node.id, key, value, reason, sourceEvent },
      }),
    );
  }

  /** Explicit mode: publishes every edited key, then one commit; clears the draft. */
  save(sourceEvent: Event | null = null): void {
    const node = this.node;
    if (!node) return;
    const keys = this.dirtyKeys;
    for (const key of keys) this.#change(key, this.#draft.get(key), 'trigger-press', sourceEvent);
    this.#draft.clear();
    this.requestUpdate();
    if (!keys.length) return;
    this.dispatchEvent(
      new CustomEvent<FlowInspectorCommitDetail>(INSPECTOR_COMMIT, {
        bubbles: true,
        composed: false,
        detail: { nodeId: node.id, keys, sourceEvent },
      }),
    );
  }

  /** Explicit mode: drops the local edits; the controls return to the node's data. */
  cancel(): void {
    this.#draft.clear();
    this.requestUpdate();
  }

  #save = (event: MouseEvent): void => this.save(event);
  #cancel = (): void => this.cancel();

  #close = (event: MouseEvent): void => {
    this.dispatchEvent(
      new CustomEvent<FlowInspectorCloseDetail>(INSPECTOR_CLOSE, {
        bubbles: true,
        composed: false,
        detail: { sourceEvent: event },
      }),
    );
  };

  #focusEdge = (event: Event): void => {
    const edgeId = (event.currentTarget as HTMLElement).dataset['edge'];
    if (!edgeId) return;
    this.dispatchEvent(
      new CustomEvent<FlowInspectorFocusEdgeDetail>(INSPECTOR_FOCUS_EDGE, {
        bubbles: true,
        composed: false,
        detail: { edgeId, sourceEvent: event },
      }),
    );
  };

  // ---- number fields ---------------------------------------------------------------------------

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
      const raw = this.#value(definition);
      const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
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
      this.#numberFields.set(root, { controller, scope });
    }
  }

  #numberOptions(definition: FlowPropertyDefinition): NumberFieldOptions {
    const options: NumberFieldOptions = {
      step: definition.step ?? 'any',
      disabled: this.disabled,
      readOnly: this.readOnly,
    };
    if (definition.min !== undefined) options.minimum = definition.min;
    if (definition.max !== undefined) options.maximum = definition.max;
    return options;
  }

  #disposeNumber(binding: NumberBinding): void {
    binding.scope.dispose();
    binding.controller.dispose();
  }

  // ---- properties ------------------------------------------------------------------------------

  #property(key: string): FlowPropertyDefinition | undefined {
    return this.definition?.properties?.find((property) => property.key === key);
  }

  /** The effective data: the node's data under the local draft. */
  #data(): Record<string, unknown> {
    const data = { ...(this.node?.data ?? {}) };
    for (const [key, value] of this.#draft) data[key] = value;
    return data;
  }

  #value(definition: FlowPropertyDefinition): unknown {
    if (this.#draft.has(definition.key)) return this.#draft.get(definition.key);
    const value = this.node?.data[definition.key];
    return value === undefined ? definition.default : value;
  }

  #visible(property: FlowPropertyDefinition, data: Record<string, unknown>): boolean {
    const condition = property.visibleWhen;
    if (!condition) return true;
    if (typeof condition === 'function') return condition(data);
    const value = data[condition.key];
    if (condition.truthy !== undefined) return Boolean(value) === condition.truthy;
    if (condition.in) return condition.in.includes(value);
    if ('equals' in condition) return value === condition.equals;
    return true;
  }

  #context(definition: FlowPropertyDefinition): FlowPropertyControlContext | null {
    const node = this.node;
    if (!node) return null;
    return {
      node,
      definition,
      value: this.#value(definition),
      disabled: this.disabled,
      readOnly: this.readOnly,
      propose: (value, reason, sourceEvent) => {
        this.#edit(definition.key, value, reason, sourceEvent ?? new Event('propose'));
        return true;
      },
      commit: () => this.#settle(definition.key, new Event('commit')),
      port: undefined,
      id: `${this.#id}-${definition.key}`,
    };
  }

  // ---- render ----------------------------------------------------------------------------------

  #renderSettings(): TemplateResult {
    const strings = this.#strings;
    const node = this.node;
    const definition = this.definition;
    if (!node || !definition) return html`<p class="empty">${strings.noSelection}</p>`;
    const data = this.#data();
    const fields: TemplateResult[] = [];
    for (const property of definition.properties ?? []) {
      if (!this.#visible(property, data)) continue;
      const factory = this.propertyControls[property.control];
      const context = this.#context(property);
      if (!factory || !context) continue;
      fields.push(
        html`<tp-field
          class="field"
          label=${property.label}
          description=${property.description ?? ''}
          ?disabled=${this.disabled}
          >${factory(context)}</tp-field
        >`,
      );
    }
    return html`<tp-form class="form" @submit=${(event: Event) => event.preventDefault()}>
      <div class="fields">${fields}</div>
    </tp-form>`;
  }

  #renderConnection(connection: FlowInspectorConnection, direction: 'in' | 'out'): TemplateResult {
    const edge = connection.edge;
    const strings = this.#strings;
    const ports =
      direction === 'in'
        ? `${edge.sourcePort ?? edge.source} → ${edge.targetPort ?? edge.target}`
        : `${edge.sourcePort ?? edge.source} → ${edge.targetPort ?? edge.target}`;
    const label = `${strings.focusEdge}: ${connection.label}`;
    return html`<tp-list-item
      class="connection"
      size="sm"
      data-edge=${edge.id}
      description=${edge.label ? `${edge.label} · ${ports}` : ports}
      .partContracts=${{
        'list-item-root': {
          renderDelegate: ({ bind, content }: { bind: unknown; content: unknown }) =>
            html`<button
              type="button"
              class="row"
              data-edge=${edge.id}
              aria-label=${label}
              @click=${this.#focusEdge}
              ${bind}
            >
              ${content}
            </button>`,
        },
      }}
      ><tp-icon slot="media" .icon=${gitBranchIcon} aria-hidden="true"></tp-icon
      >${connection.label}</tp-list-item
    >`;
  }

  #renderWiring(): TemplateResult {
    const strings = this.#strings;
    const { incoming, outgoing } = this.connections;
    if (!this.node) return html`<p class="empty">${strings.noSelection}</p>`;
    if (!incoming.length && !outgoing.length)
      return html`<p class="empty">${strings.noConnections}</p>`;
    const group = (
      title: string,
      items: readonly FlowInspectorConnection[],
      direction: 'in' | 'out',
    ) =>
      items.length
        ? html`<tp-list-item-group class="connections" aria-label=${title}
            >${items.map((item) => this.#renderConnection(item, direction))}</tp-list-item-group
          >`
        : nothing;
    return html`${group(strings.incoming, incoming, 'in')}${group(strings.outgoing, outgoing, 'out')}`;
  }

  #renderRun(): TemplateResult {
    const strings = this.#strings;
    const run = this.run;
    if (!this.node) return html`<p class="empty">${strings.noSelection}</p>`;
    if (!run) return html`<p class="empty">${strings.noRun}</p>`;
    const duration =
      run.durationMs ??
      (run.startedAt !== undefined && run.endedAt !== undefined
        ? run.endedAt - run.startedAt
        : undefined);
    return html`<dl class="run">
      <dt>${strings.status}</dt>
      <dd>
        <tp-badge class="status" variant=${BADGE_VARIANTS[run.status]} data-status=${run.status}
          >${strings[STATUS_STRINGS[run.status]]}</tp-badge
        >
      </dd>
      <dt>${strings.attempts}</dt>
      <dd>${run.attempts}</dd>
      ${
        duration !== undefined
          ? html`<dt>${strings.duration}</dt>
              <dd>${formatDuration(duration)}</dd>`
          : nothing
      }
      ${
        run.message
          ? html`<dt>${strings.message}</dt>
              <dd>${run.message}</dd>`
          : nothing
      }
      ${
        run.error
          ? html`<dt>${strings.error}</dt>
              <dd class="error">${run.error}</dd>`
          : nothing
      }
    </dl>`;
  }

  /**
   * The active tab's content as one tab panel below the Tabs list. Tabs owns the list, roving
   * focus and selection; the panel is a sibling so it takes part in the panel's flex sizing and
   * scrolls inside it.
   */
  #renderBody(tab: FlowInspectorTab) {
    const content =
      tab === 'settings'
        ? this.#renderSettings()
        : tab === 'wiring'
          ? this.#renderWiring()
          : this.#renderRun();
    return this.renderPart(
      'flow-inspector-body',
      { tab },
      {
        tag: 'section',
        properties: {
          part: 'flow-inspector-body',
          class: 'body',
          role: 'tabpanel',
          'aria-labelledby': `${this.#id}-tab-${tab}`,
          // Only a panel without focusable content needs its own stop to scroll by keyboard.
          tabindex: tab === 'run' ? 0 : undefined,
          'data-tab': tab,
        },
        content,
      },
    );
  }

  protected override render() {
    const strings = this.#strings;
    const node = this.node;
    const definition = this.definition;
    const title = node?.label ?? definition?.label ?? strings.inspector;
    const subtitle =
      node && definition && node.label && node.label !== definition.label ? definition.label : '';
    const dirty = this.dirtyKeys.length > 0;
    const header = this.renderPart(
      'flow-inspector-header',
      { title },
      {
        tag: 'header',
        properties: { part: 'flow-inspector-header', class: 'header' },
        content: html`<div class="titles">
            <span class="title" id=${`${this.#id}-title`}>${title}</span>
            ${subtitle ? html`<span class="subtitle">${subtitle}</span>` : nothing}
          </div>
          <tp-button
            class="close"
            variant="ghost"
            size="icon-sm"
            .ariaLabel=${strings.close}
            .icon=${xIcon}
            @click=${this.#close}
          ></tp-button>`,
      },
    );
    const footer =
      this.commit === 'explicit'
        ? this.renderPart(
            'flow-inspector-footer',
            { dirty },
            {
              tag: 'footer',
              properties: { part: 'flow-inspector-footer', class: 'footer', 'data-dirty': dirty },
              content: html`<tp-button
                  class="cancel"
                  variant="outline"
                  size="sm"
                  .disabled=${!dirty}
                  @click=${this.#cancel}
                  >${strings.cancel}</tp-button
                ><tp-button
                  class="save"
                  size="sm"
                  .disabled=${!dirty || this.readOnly}
                  @click=${this.#save}
                  >${strings.save}</tp-button
                >`,
            },
          )
        : nothing;
    return this.renderPart(
      'flow-inspector',
      { open: this.open, commit: this.commit, tab: this.tab, dirty },
      {
        tag: 'div',
        properties: {
          part: 'flow-inspector',
          class: 'inspector',
          role: 'region',
          'aria-label': this.label || strings.inspector,
          'data-commit': this.commit,
          'data-dirty': dirty,
        },
        content: html`${header}
          <tp-tabs class="tabs" variant="underline" label=${strings.inspector} .value=${this.tab}>
            <button slot="tab" value="settings" id=${`${this.#id}-tab-settings`}>
              ${strings.settings}
            </button>
            <button slot="tab" value="wiring" id=${`${this.#id}-tab-wiring`}>
              ${strings.wiring}
            </button>
            <button slot="tab" value="run" id=${`${this.#id}-tab-run`}>${strings.run}</button>
          </tp-tabs>
          ${this.#renderBody(this.tab)} ${footer}`,
      },
    );
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-inspector': TpFlowInspector;
  }
}
