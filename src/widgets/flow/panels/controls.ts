import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { ToolbarController, type ToolbarRegistration } from '../../../foundation/toolbar.js';
import type { Orientation } from '../../../foundation/types.js';
import { TpBadge } from '../../../components/badge/badge.js';
import { TpButton } from '../../../components/button/button.js';
import { TpButtonGroup } from '../../../components/button-group/button-group.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpInput } from '../../../components/input/input.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { TpKeyHint } from '../../../components/key-hint/key-hint.js';
import { TpKeyHintGroup } from '../../../components/key-hint/key-hint-group.js';
import { TpMenu } from '../../../components/menu/menu.js';
import { TpMenuItem } from '../../../components/menu/menu-item.js';
import { TpSeparator } from '../../../components/separator/separator.js';
import { TpSlider } from '../../../components/slider/slider.js';
import { TpSpinner } from '../../../components/spinner/spinner.js';
import { TpToggle } from '../../../components/toggle/toggle.js';
import { TpToggleGroup } from '../../../components/toggle-group/toggle-group.js';
import { checkIcon } from '../../../icons/check.js';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { circlePauseIcon } from '../../../icons/circle-pause.js';
import { circleXIcon } from '../../../icons/circle-x.js';
import { clockIcon } from '../../../icons/clock.js';
import { handIcon } from '../../../icons/hand.js';
import { lockIcon } from '../../../icons/lock.js';
import { scanIcon } from '../../../icons/map.js';
import { pauseIcon, playIcon, seekBackwardIcon, seekForwardIcon } from '../../../icons/media.js';
import { minusIcon } from '../../../icons/minus.js';
import { mousePointerIcon } from '../../../icons/mouse-pointer.js';
import { plusIcon } from '../../../icons/plus.js';
import { redoIcon } from '../../../icons/redo.js';
import { squareIcon } from '../../../icons/square.js';
import { triangleAlertIcon } from '../../../icons/triangle-alert.js';
import type { IconDefinition } from '../../../icons/types.js';
import { undoIcon } from '../../../icons/undo.js';
import { unlockIcon } from '../../../icons/unlock.js';
import { workflowIcon } from '../../../icons/workflow.js';
import { xIcon } from '../../../icons/x.js';
import type { FlowRunScope } from '../../../foundation/flow/run/types.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { format, resolveStrings } from '../strings.js';
import {
  renderShortcut,
  RUN_KEYS,
  ZOOM_FIT_KEYS,
  ZOOM_IN_KEYS,
  ZOOM_OUT_KEYS,
  ZOOM_RESET_KEYS,
} from '../shortcuts.js';
import {
  FLOW_CONTROL_ACTIONS,
  type FlowControlAction,
  type FlowRunControlState,
  type FlowRunTransportState,
  type FlowStrings,
  type FlowTool,
} from '../types.js';

export const CONTROL_ACTION = 'flow-control-action';
export const TOOL_REQUEST = 'flow-tool-request';
export const RUN_ACTION = 'flow-run-action';
export const EXECUTE_REQUEST = 'flow-execute-request';
export const ZOOM_REQUEST = 'flow-zoom-request';

/** Zoom levels the zoom menu offers by default. */
export const DEFAULT_ZOOM_PRESETS: readonly number[] = [0.5, 1, 2];

/** `actions` / `controls` attribute: a space- or comma-separated list of known actions. */
export const controlActionsConverter = {
  fromAttribute: (value: string | null): FlowControlAction[] =>
    (value ?? '')
      .split(/[\s,]+/)
      .filter((item): item is FlowControlAction =>
        (FLOW_CONTROL_ACTIONS as readonly string[]).includes(item),
      ),
  toAttribute: (value: readonly FlowControlAction[]): string => value.join(' '),
};

export interface FlowZoomRequestDetail {
  /** The requested zoom factor (1 is 100%); absent when `fit` is set. */
  zoom?: number;
  fit?: boolean;
  sourceEvent: Event;
}

export type FlowRunTransportAction = 'play' | 'pause' | 'step' | 'back' | 'seek';

export interface FlowControlActionDetail {
  action: Exclude<FlowControlAction, 'tool' | 'run' | 'zoom' | 'execute' | 'run-summary'>;
  sourceEvent: Event;
}
/** The `execute` control asked to run (a scope of the selected node), stop or clear. */
export interface FlowExecuteRequestDetail {
  action: 'run' | 'stop' | 'clear';
  scope?: FlowRunScope;
  /** Chosen in the control's menu rather than with its Button. */
  menu: boolean;
  sourceEvent: Event;
}
export interface FlowToolRequestDetail {
  tool: FlowTool;
  sourceEvent: Event;
}
export interface FlowRunActionDetail {
  action: FlowRunTransportAction;
  /** The requested step for `seek`. */
  index?: number;
  sourceEvent: Event;
}

/** Actions rendered as plain Buttons, in the order the consumer lists them. */
type ButtonAction = Exclude<
  FlowControlAction,
  'tool' | 'run' | 'zoom' | 'palette' | 'execute' | 'run-summary'
>;
type Segment =
  | { kind: 'buttons'; actions: ButtonAction[] }
  | { kind: 'tool' }
  | { kind: 'lock' }
  | { kind: 'palette' }
  | { kind: 'zoom' }
  | { kind: 'run' }
  | { kind: 'execute' }
  | { kind: 'summary' };

/** The run summary's chips: count key, Badge variant (as the node status pills) and icon. */
const SUMMARY_CHIPS = [
  { key: 'failed', variant: 'destructive', icon: circleXIcon, label: 'summaryFailed' },
  { key: 'warnings', variant: 'warning', icon: triangleAlertIcon, label: 'summaryWarnings' },
  { key: 'waiting', variant: 'warning', icon: circlePauseIcon, label: 'summaryWaiting' },
  { key: 'pending', variant: 'outline', icon: clockIcon, label: 'summaryPending' },
  { key: 'running', variant: 'secondary', icon: undefined, label: 'summaryRunning' },
  { key: 'success', variant: 'success', icon: checkIcon, label: 'summarySuccess' },
] as const;

const BUTTON_ICONS: Record<ButtonAction, IconDefinition> = {
  'zoom-in': plusIcon,
  'zoom-out': minusIcon,
  fit: scanIcon,
  lock: lockIcon,
  layout: workflowIcon,
  undo: undoIcon,
  redo: redoIcon,
};
const BUTTON_STRINGS: Record<ButtonAction, keyof FlowStrings> = {
  'zoom-in': 'zoomIn',
  'zoom-out': 'zoomOut',
  fit: 'fitView',
  lock: 'lock',
  layout: 'layout',
  undo: 'undo',
  redo: 'redo',
};
/** Adjacent Buttons of one set share a Button group; another set starts a new group. */
const BUTTON_SETS: Record<ButtonAction, 'view' | 'history' | 'arrange' | 'lock'> = {
  'zoom-in': 'view',
  'zoom-out': 'view',
  fit: 'view',
  undo: 'history',
  redo: 'history',
  layout: 'arrange',
  lock: 'lock',
};
/** Actions that edit the document; read-only widgets disable them. */
const EDITING_ACTIONS: ReadonlySet<FlowControlAction> = new Set([
  'layout',
  'undo',
  'redo',
  'palette',
]);

const controlsStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
  }

  .controls {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
  }

  .controls[data-orientation='horizontal'] {
    flex-direction: row;
    align-items: center;
  }

  /* A vertical toolbar is one column: every set spans it, so square icon Buttons and the wider
     Toggles line up instead of each group keeping its own fit-content width. */
  .controls[data-orientation='vertical'] > :is(tp-button-group, tp-toggle-group, tp-toggle),
  .controls[data-orientation='vertical'] .transport > tp-button-group {
    inline-size: 100%;
  }

  /* The transport is one set laid out like the panel: its parts keep the panel's set gap. */
  .transport {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    gap: inherit;
  }

  .controls[data-orientation='horizontal'] .transport {
    flex-direction: row;
    align-items: center;
  }

  tp-slider.position {
    min-inline-size: calc(var(--tp-spacing) * 28);
  }

  /* The zoom field holds "100%" and its menu trigger. Inputs and Input groups have one height (the
     default control height), so the bar's Buttons and Toggles use the default size to line up. */
  tp-input-group.zoom {
    inline-size: calc(var(--tp-spacing) * 24);
    flex: none;
  }

  .controls[data-orientation='vertical'] tp-input-group.zoom {
    inline-size: 100%;
  }

  tp-input.zoom-input {
    text-align: center;
  }

  /* The run summary's chips sit in one row, as tags do, with the theme's tag gap. */
  .summary {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--tp-space-1-5);
  }

  .summary[hidden] {
    display: none;
  }

  /* Consumer items (a Button, a Button group) follow the built-in sets. */
  slot.items {
    display: contents;
  }

  .controls[data-orientation='vertical'] tp-slider.position {
    min-inline-size: 0;
    min-block-size: calc(var(--tp-spacing) * 28);
    align-self: center;
  }
`;

/**
 * The controls toolbar (Widgets 6.3 Anatomy): a Foundation toolbar of composed Buttons in a
 * Button group, the select/pan tool pair as a Toggle group, the zoom field (an Input group with
 * the current zoom and a Menu of fit and preset levels) and, when `run` is listed, a transport
 * (back, play/pause, step) with a Slider over the run steps. Consumer children follow the
 * built-in sets and join the toolbar's roving focus. The root renders one bar from `controls`;
 * authored `tp-flow-controls` children slotted into a panel are further bars the root keeps in
 * sync. It owns no document state: every press is reported to the root (`flow-control-action`,
 * `flow-tool-request`, `flow-zoom-request`, `flow-run-action`).
 */
export class TpFlowControls extends TpElement {
  static tagName = 'tp-flow-controls';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [
      TpButtonGroup,
      TpButton,
      TpBadge,
      TpSpinner,
      TpToggleGroup,
      TpToggle,
      TpIcon,
      TpSlider,
      TpInputGroup,
      TpInput,
      TpMenu,
      TpMenuItem,
      TpSeparator,
      TpKeyHintGroup,
      TpKeyHint,
    ];
  }
  static override properties = {
    ...TpElement.properties,
    actions: { converter: controlActionsConverter },
    tool: { type: String, reflect: true },
    locked: { type: Boolean, reflect: true },
    paletteOpen: { type: Boolean, attribute: false },
    canUndo: { type: Boolean, attribute: 'can-undo' },
    canRedo: { type: Boolean, attribute: 'can-redo' },
    strings: { attribute: false },
    runState: { attribute: false },
    runControl: { attribute: false },
    zoom: { type: Number },
    zoomPresets: { attribute: false },
  };
  static override styles = [TpElement.styles, controlsStyles];

  /** Actions in display order; `tool` renders the select/pan pair, `run` the transport. */
  actions: readonly FlowControlAction[] = ['zoom-in', 'zoom-out', 'fit', 'tool', 'lock'];
  tool: FlowTool = 'select';
  locked = false;
  /** Pressed state of the `palette` action: the node library is open. */
  paletteOpen = false;
  canUndo = false;
  canRedo = false;
  strings: Partial<FlowStrings> | undefined;
  runState: FlowRunTransportState | undefined;
  /** What `execute` and `run-summary` show (the root publishes it). */
  runControl: FlowRunControlState | undefined;
  /** The current zoom factor shown by the zoom field (the root publishes it). */
  zoom = 1;
  zoomPresets: readonly number[] = DEFAULT_ZOOM_PRESETS;
  override orientation: Orientation = 'vertical';

  #toolbar: ToolbarController | undefined;
  readonly #items = new Map<HTMLElement, ToolbarRegistration<unknown>>();
  /** Slider value accepted locally until the root publishes the next run state. */
  #seek: number | undefined;
  /** Text typed in the zoom field, shown instead of the zoom until Enter, Escape or blur. */
  #zoomDraft: string | undefined;

  /** The flow: the shadow host of the built-in bar, the ancestor of an authored one. */
  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot
      ? (root.host as HTMLElement)
      : (this.closest<HTMLElement>('tp-flow') ?? null);
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  override focus(options?: FocusOptions): void {
    const target = this.renderRoot.querySelector<HTMLElement>(
      'tp-button.control:not([disabled]), tp-toggle.control',
    );
    if (target) target.focus(options);
    else super.focus(options);
  }

  override disconnectedCallback(): void {
    this.#toolbar?.dispose();
    this.#toolbar = undefined;
    this.#items.clear();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('runState')) this.#seek = undefined;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const root = this.renderRoot.querySelector<HTMLElement>('.controls');
    if (root && !this.#toolbar) this.#toolbar = new ToolbarController(root, {});
    this.#toolbar?.update({ orientation: this.orientation, disabled: this.disabled });
    this.#syncItems();
  }

  /**
   * Registers every composed Button (and the zoom field and its trigger) as a roving item and
   * the Toggle groups as toolbar groups, consumer children included.
   */
  #syncItems = (): void => {
    const toolbar = this.#toolbar;
    if (!toolbar) return;
    const present = new Set<HTMLElement>();
    const slotted = (
      this.renderRoot.querySelector<HTMLSlotElement>('slot.items')?.assignedElements({
        flatten: true,
      }) ?? []
    ).flatMap((element) =>
      element.localName === 'tp-button-group'
        ? [...element.querySelectorAll<HTMLElement>('tp-button, tp-toggle, button')]
        : [element as HTMLElement],
    );
    const elements = [
      ...this.renderRoot.querySelectorAll<HTMLElement>(
        'tp-button.control, tp-toggle.lock, tp-toggle-group.tools, tp-input.zoom-input',
      ),
      ...slotted.filter((element) =>
        ['tp-button', 'tp-toggle', 'tp-toggle-group', 'button'].includes(element.localName),
      ),
    ];
    for (const element of elements) {
      present.add(element);
      if (this.#items.has(element)) continue;
      this.#items.set(
        element,
        element.localName === 'tp-toggle-group'
          ? toolbar.registerGroup(element)
          : toolbar.registerItem(element, {
              // The zoom field keeps its caret keys; the toolbar moves on past its edges.
              kind: element.localName === 'tp-input' ? 'input' : 'button',
            }),
      );
    }
    for (const [element, registration] of this.#items)
      if (!present.has(element)) {
        registration.dispose();
        this.#items.delete(element);
      }
  };

  #segments(): Segment[] {
    const segments: Segment[] = [];
    for (const action of this.actions) {
      if (action === 'tool') segments.push({ kind: 'tool' });
      else if (action === 'lock') segments.push({ kind: 'lock' });
      else if (action === 'palette') segments.push({ kind: 'palette' });
      else if (action === 'run') segments.push({ kind: 'run' });
      else if (action === 'zoom') segments.push({ kind: 'zoom' });
      else if (action === 'execute') segments.push({ kind: 'execute' });
      else if (action === 'run-summary') segments.push({ kind: 'summary' });
      else {
        const last = segments[segments.length - 1];
        if (last?.kind === 'buttons' && BUTTON_SETS[last.actions[0]!] === BUTTON_SETS[action])
          last.actions.push(action);
        else segments.push({ kind: 'buttons', actions: [action] });
      }
    }
    return segments;
  }

  #actionDisabled(action: ButtonAction): boolean {
    if (this.disabled) return true;
    if (action === 'undo') return this.readOnly || !this.canUndo;
    if (action === 'redo') return this.readOnly || !this.canRedo;
    return this.readOnly && EDITING_ACTIONS.has(action);
  }

  #press = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLElement;
    const action = button.dataset['action'] as ButtonAction | undefined;
    if (!action || this.#actionDisabled(action)) return;
    this.emit<FlowControlActionDetail>(
      CONTROL_ACTION,
      { action, sourceEvent: event },
      { composed: false },
    );
  };

  #toolChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    event.stopPropagation();
    const [next] = event.detail.value;
    if (next !== 'select' && next !== 'pan') {
      // The pair is required: a press on the pressed toggle keeps it pressed.
      event.preventDefault();
      return;
    }
    if (next === this.tool) return;
    // The root owns the tool lane; the group reverts unless the root publishes the new tool.
    event.preventDefault();
    this.emit<FlowToolRequestDetail>(
      TOOL_REQUEST,
      { tool: next, sourceEvent: event.detail.sourceEvent ?? event },
      { composed: false },
    );
  };

  #run(action: FlowRunTransportAction, sourceEvent: Event, index?: number): void {
    const detail: FlowRunActionDetail = { action, sourceEvent };
    if (index !== undefined) detail.index = index;
    this.emit<FlowRunActionDetail>(RUN_ACTION, detail, { composed: false });
  }

  #transportPress = (event: MouseEvent): void => {
    const action = (event.currentTarget as HTMLElement).dataset['transport'] as
      'back' | 'toggle' | 'step';
    if (this.disabled || !this.runState) return;
    this.#run(action === 'toggle' ? (this.runState.playing ? 'pause' : 'play') : action, event);
  };

  #seekChange = (event: TpValueChangeEvent<number | readonly number[]>): void => {
    event.stopPropagation();
    const raw = event.detail.value;
    const value = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
    if (!Number.isFinite(value)) return;
    this.#seek = value;
    (event.target as TpSlider).value = value;
    this.#run('seek', event.detail.sourceEvent ?? event, value);
  };

  #contain = (event: Event): void => {
    event.stopPropagation();
  };

  #zoomRequest(detail: Omit<FlowZoomRequestDetail, 'sourceEvent'>, sourceEvent: Event): void {
    this.emit<FlowZoomRequestDetail>(ZOOM_REQUEST, { ...detail, sourceEvent }, { composed: false });
  }

  #zoomInput = (event: TpValueChangeEvent<string>): void => {
    event.stopPropagation();
    this.#zoomDraft = String(event.detail.value ?? '');
    this.requestUpdate();
  };

  /** Enter applies the typed level ("150", "150%"); Escape and blur restore the current one. */
  #zoomKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#zoomDraft !== undefined) {
      event.stopPropagation();
      this.#zoomDraft = undefined;
      this.requestUpdate();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const percent = Number.parseFloat((this.#zoomDraft ?? '').replace('%', '').trim());
    this.#zoomDraft = undefined;
    this.requestUpdate();
    if (Number.isFinite(percent) && percent > 0) this.#zoomRequest({ zoom: percent / 100 }, event);
  };

  /** Focus selects the level, so typing replaces it (Figma's zoom field). */
  #zoomFocus = (event: FocusEvent): void => {
    const input = (event.currentTarget as TpInput).inputElement as HTMLInputElement | null;
    requestAnimationFrame(() => input?.select());
  };

  /**
   * The side the zoom menu opens toward: into the canvas from the panel the bar sits in (the
   * slot of an authored bar, the panel of the built-in one).
   */
  #menuSide(): 'top' | 'bottom' | 'inline-start' | 'inline-end' {
    const position =
      this.getAttribute('slot') ??
      this.closest('[data-position]')?.getAttribute('data-position') ??
      'bottom-start';
    if (position.startsWith('top-') || position.startsWith('header-')) return 'bottom';
    if (position === 'center-start') return 'inline-end';
    if (position === 'center-end') return 'inline-start';
    return 'top';
  }

  #zoomBlur = (): void => {
    if (this.#zoomDraft === undefined) return;
    this.#zoomDraft = undefined;
    this.requestUpdate();
  };

  #zoomMenuAction = (event: CustomEvent<{ value: unknown; sourceEvent?: Event }>): void => {
    event.stopPropagation();
    const value = String(event.detail?.value ?? '');
    const source = event.detail?.sourceEvent ?? event;
    if (value === 'zoom-in' || value === 'zoom-out')
      this.emit<FlowControlActionDetail>(
        CONTROL_ACTION,
        { action: value, sourceEvent: source },
        { composed: false },
      );
    else if (value === 'fit') this.#zoomRequest({ fit: true }, source);
    else if (Number.isFinite(Number(value))) this.#zoomRequest({ zoom: Number(value) }, source);
  };

  /** The zoom field: the current level (editable) and a Menu of fit and preset levels. */
  #renderZoom(): TemplateResult {
    const strings = this.#strings;
    const percent = `${Math.round(this.zoom * 100)}%`;
    return html`<tp-input-group class="zoom" ?disabled=${this.disabled}>
      <tp-input
        class="zoom-input control"
        mono
        inputmode="decimal"
        .value=${this.#zoomDraft ?? percent}
        .ariaLabel=${strings.zoomLevel}
        ?disabled=${this.disabled}
        @tp-value-change=${this.#zoomInput}
        @tp-value-commit=${this.#contain}
        @keydown=${this.#zoomKey}
        @focusin=${this.#zoomFocus}
        @focusout=${this.#zoomBlur}
      ></tp-input>
      <tp-menu
        slot="inline-end"
        class="zoom-menu"
        .portal=${false}
        side=${this.#menuSide()}
        label=${strings.zoomOptions}
        @tp-action=${this.#zoomMenuAction}
        @tp-open-change=${this.#contain}
        @tp-open-change-complete=${this.#contain}
      >
        <tp-button
          slot="trigger"
          class="zoom-trigger"
          variant="ghost"
          size="icon-xs"
          .icon=${chevronDownIcon}
          .ariaLabel=${strings.zoomOptions}
          ?disabled=${this.disabled}
        ></tp-button>
        <tp-menu-item value="zoom-in"
          ><tp-icon .icon=${plusIcon}></tp-icon>${strings.zoomIn}${renderShortcut(
            ZOOM_IN_KEYS,
          )}</tp-menu-item
        >
        <tp-menu-item value="zoom-out"
          ><tp-icon .icon=${minusIcon}></tp-icon>${strings.zoomOut}${renderShortcut(
            ZOOM_OUT_KEYS,
          )}</tp-menu-item
        >
        <tp-menu-item value="fit"
          ><tp-icon .icon=${scanIcon}></tp-icon>${strings.zoomToFit}${renderShortcut(
            ZOOM_FIT_KEYS,
          )}</tp-menu-item
        >
        <tp-separator></tp-separator>
        ${this.zoomPresets.map(
          (level) =>
            html`<tp-menu-item inset value=${String(level)}
              >${format(strings.zoomToLevel, { percent: `${Math.round(level * 100)}%` })}${
                level === 1 ? renderShortcut(ZOOM_RESET_KEYS) : nothing
              }</tp-menu-item
            >`,
        )}
      </tp-menu>
    </tp-input-group>`;
  }

  #renderButton(action: ButtonAction): TemplateResult {
    const strings = this.#strings;
    const label = strings[BUTTON_STRINGS[action]];
    const icon = BUTTON_ICONS[action];
    return html`<tp-button
      class="control"
      variant="outline"
      size="icon"
      data-action=${action}
      .focusableWhenDisabled=${true}
      .disabled=${this.#actionDisabled(action)}
      .ariaLabel=${label}
      .icon=${icon}
      @click=${this.#press}
    ></tp-button>`;
  }

  #renderButtons(actions: readonly ButtonAction[]): TemplateResult {
    return html`<tp-button-group
      class="group"
      .orientation=${this.orientation}
      label=${this.#strings.controls}
      >${actions.map((action) => this.#renderButton(action))}</tp-button-group
    >`;
  }

  /** The lock is a Toggle: its pressed state is the widget's `locked` (the root owns it). */
  #renderLock(): TemplateResult {
    const strings = this.#strings;
    return html`<tp-toggle
      class="control lock"
      variant="outline"
      data-action="lock"
      .pressed=${this.locked}
      ?disabled=${this.disabled}
      .ariaLabel=${this.locked ? strings.unlock : strings.lock}
      @tp-value-change=${this.#lockChange}
      @tp-value-commit=${this.#contain}
      ><tp-icon .icon=${this.locked ? lockIcon : unlockIcon}></tp-icon
    ></tp-toggle>`;
  }

  /** The node library's trigger: a Toggle pressed while the library is open (the root owns it). */
  #renderPaletteToggle(): TemplateResult {
    const strings = this.#strings;
    return html`<tp-toggle
      class="control palette"
      variant="outline"
      data-action="palette"
      .pressed=${this.paletteOpen}
      ?disabled=${this.disabled || this.readOnly}
      .ariaLabel=${strings.palette}
      @tp-value-change=${this.#paletteChange}
      @tp-value-commit=${this.#contain}
      ><tp-icon .icon=${plusIcon}></tp-icon
    ></tp-toggle>`;
  }

  #paletteChange = (event: Event): void => {
    event.stopPropagation();
    this.emit<FlowControlActionDetail>(
      CONTROL_ACTION,
      { action: 'palette', sourceEvent: event },
      { composed: false },
    );
  };

  #lockChange = (event: Event): void => {
    event.stopPropagation();
    this.emit<FlowControlActionDetail>(
      CONTROL_ACTION,
      { action: 'lock', sourceEvent: event },
      { composed: false },
    );
  };

  #renderTools(): TemplateResult {
    const strings = this.#strings;
    return html`<tp-toggle-group
      class="tools"
      variant="outline"
      spacing="0"
      .orientation=${this.orientation}
      .value=${[this.tool]}
      ?disabled=${this.disabled}
      label=${strings.tool}
      @tp-value-change=${this.#toolChange}
      @tp-value-commit=${this.#contain}
    >
      <tp-toggle class="control" value="select" aria-label=${strings.selectTool}
        ><tp-icon .icon=${mousePointerIcon}></tp-icon
      ></tp-toggle>
      <tp-toggle class="control" value="pan" aria-label=${strings.panTool}
        ><tp-icon .icon=${handIcon}></tp-icon
      ></tp-toggle>
    </tp-toggle-group>`;
  }

  #execute(detail: Omit<FlowExecuteRequestDetail, 'sourceEvent'>, sourceEvent: Event): void {
    this.emit<FlowExecuteRequestDetail>(
      EXECUTE_REQUEST,
      { ...detail, sourceEvent },
      { composed: false },
    );
  }

  #executePress = (event: MouseEvent): void => {
    const state = this.runControl;
    if (this.disabled || !state?.runnable) return;
    this.#execute(
      state.running
        ? { action: 'stop', menu: false }
        : { action: 'run', scope: 'graph', menu: false },
      event,
    );
  };

  #executeMenuAction = (event: CustomEvent<{ value: unknown; sourceEvent?: Event }>): void => {
    event.stopPropagation();
    const value = String(event.detail?.value ?? '');
    const source = event.detail?.sourceEvent ?? event;
    if (value === 'clear') this.#execute({ action: 'clear', menu: true }, source);
    else if (value === 'graph' || value === 'node' || value === 'from' || value === 'to')
      this.#execute({ action: 'run', scope: value, menu: true }, source);
  };

  /**
   * Run as a split Button (the Button group split pattern): Run (Stop while a run is going) and a
   * Menu of the scopes, the node ones over the selected node, and Clear run once a run exists.
   */
  #renderExecute(): TemplateResult {
    const strings = this.#strings;
    const state = this.runControl;
    const unavailable = this.disabled || !state?.runnable;
    const running = Boolean(state?.running);
    const node = state?.selectedNode;
    return html`<tp-button-group
      class="group execute"
      orientation="horizontal"
      label=${strings.run}
    >
      <tp-button
        class="control run"
        variant="outline"
        data-execute=${running ? 'stop' : 'run'}
        .focusableWhenDisabled=${true}
        .disabled=${unavailable}
        .icon=${running ? squareIcon : playIcon}
        @click=${this.#executePress}
        >${running ? strings.stop : strings.run}</tp-button
      >
      <tp-separator></tp-separator>
      <tp-menu
        class="execute-menu"
        .portal=${false}
        side=${this.#menuSide()}
        align="end"
        label=${strings.runOptions}
        @tp-action=${this.#executeMenuAction}
        @tp-open-change=${this.#contain}
        @tp-open-change-complete=${this.#contain}
      >
        <tp-button
          slot="trigger"
          class="control execute-trigger"
          variant="outline"
          size="icon"
          .icon=${chevronDownIcon}
          .ariaLabel=${strings.runOptions}
          .focusableWhenDisabled=${true}
          .disabled=${unavailable}
        ></tp-button>
        <tp-menu-item value="graph"
          ><tp-icon .icon=${playIcon}></tp-icon>${strings.runGraph}${renderShortcut(
            RUN_KEYS,
          )}</tp-menu-item
        >
        <tp-menu-item inset value="node" ?disabled=${!node || running}
          >${strings.runSelected}</tp-menu-item
        >
        <tp-menu-item inset value="from" ?disabled=${!node || running}
          >${strings.runFromSelected}</tp-menu-item
        >
        <tp-menu-item inset value="to" ?disabled=${!node || running}
          >${strings.runToSelected}</tp-menu-item
        >
        ${
          state?.hasRun
            ? html`<tp-separator></tp-separator>
                <tp-menu-item value="clear" ?disabled=${running}
                  ><tp-icon .icon=${xIcon}></tp-icon>${strings.clearRun}</tp-menu-item
                >`
            : nothing
        }
      </tp-menu>
    </tp-button-group>`;
  }

  /**
   * The run's node counts as status Badges (the node pills' variants), one per non-zero count;
   * each reads its full label to assistive technology, its icon and number on screen.
   */
  #renderSummary(): TemplateResult {
    const strings = this.#strings;
    const summary = this.runControl?.summary;
    const chips = SUMMARY_CHIPS.filter((chip) => (summary?.[chip.key] ?? 0) > 0);
    return html`<div
      class="summary"
      part="flow-run-summary"
      role="group"
      aria-label=${strings.runSummary}
      ?hidden=${chips.length === 0}
    >
      ${chips.map((chip) => {
        const count = summary![chip.key];
        return html`<tp-badge variant=${chip.variant} data-status=${chip.key}
          >${
            chip.icon
              ? html`<tp-icon .icon=${chip.icon} aria-hidden="true"></tp-icon>`
              : html`<tp-spinner size="sm" label=""></tp-spinner>`
          }<span aria-hidden="true">${count}</span
          ><span class="visually-hidden">${format(strings[chip.label], { count })}</span></tp-badge
        >`;
      })}
    </div>`;
  }

  #renderRun(): TemplateResult {
    const strings = this.#strings;
    const run = this.runState;
    const length = Math.max(0, run?.length ?? 0);
    const index = Math.min(length, Math.max(0, this.#seek ?? run?.index ?? 0));
    const unavailable = this.disabled || !run;
    return html`<div class="transport" ?data-playing=${!!run?.playing}>
      <tp-button-group class="group" .orientation=${this.orientation} label=${strings.run}>
        <tp-button
          class="control"
          variant="outline"
          size="icon"
          data-transport="back"
          .focusableWhenDisabled=${true}
          .disabled=${unavailable || index <= 0}
          .ariaLabel=${strings.stepBack}
          .icon=${seekBackwardIcon}
          @click=${this.#transportPress}
        ></tp-button>
        <tp-button
          class="control"
          variant="outline"
          size="icon"
          data-transport="toggle"
          .focusableWhenDisabled=${true}
          .disabled=${unavailable}
          .ariaLabel=${run?.playing ? strings.pause : strings.play}
          .icon=${run?.playing ? pauseIcon : playIcon}
          @click=${this.#transportPress}
        ></tp-button>
        <tp-button
          class="control"
          variant="outline"
          size="icon"
          data-transport="step"
          .focusableWhenDisabled=${true}
          .disabled=${unavailable || index >= length}
          .ariaLabel=${strings.stepForward}
          .icon=${seekForwardIcon}
          @click=${this.#transportPress}
        ></tp-button>
      </tp-button-group>
      <tp-slider
        class="control position"
        size="sm"
        .orientation=${this.orientation}
        .minimum=${0}
        .maximum=${Math.max(1, length)}
        .step=${1}
        .value=${index}
        ?disabled=${unavailable || length === 0}
        .getAccessibleLabel=${() => strings.position}
        @tp-value-change=${this.#seekChange}
        @tp-value-commit=${this.#contain}
      ></tp-slider>
    </div>`;
  }

  protected override render() {
    const segments = this.#segments();
    return this.renderPart(
      'flow-controls',
      { orientation: this.orientation, locked: this.locked, readOnly: this.readOnly },
      {
        tag: 'div',
        properties: {
          part: 'flow-controls',
          class: 'controls',
          'aria-label': this.#strings.controls,
          'data-orientation': this.orientation,
          'data-locked': this.locked,
          'data-readonly': this.readOnly,
        },
        content: html`${segments.map((segment) =>
            segment.kind === 'buttons'
              ? this.#renderButtons(segment.actions)
              : segment.kind === 'tool'
                ? this.#renderTools()
                : segment.kind === 'lock'
                  ? this.#renderLock()
                  : segment.kind === 'palette'
                    ? this.#renderPaletteToggle()
                    : segment.kind === 'zoom'
                      ? this.#renderZoom()
                      : segment.kind === 'execute'
                        ? this.#renderExecute()
                        : segment.kind === 'summary'
                          ? this.#renderSummary()
                          : this.#renderRun(),
          )}<slot class="items" @slotchange=${this.#syncItems}></slot>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-controls': TpFlowControls;
  }
}
