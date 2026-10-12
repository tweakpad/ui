import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { ToolbarController, type ToolbarRegistration } from '../../../foundation/toolbar.js';
import type { Orientation } from '../../../foundation/types.js';
import { TpButton } from '../../../components/button/button.js';
import { TpButtonGroup } from '../../../components/button-group/button-group.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpSlider } from '../../../components/slider/slider.js';
import { TpToggle } from '../../../components/toggle/toggle.js';
import { TpToggleGroup } from '../../../components/toggle-group/toggle-group.js';
import { handIcon } from '../../../icons/hand.js';
import { lockIcon } from '../../../icons/lock.js';
import { scanIcon } from '../../../icons/map.js';
import { pauseIcon, playIcon, seekBackwardIcon, seekForwardIcon } from '../../../icons/media.js';
import { minusIcon } from '../../../icons/minus.js';
import { mousePointerIcon } from '../../../icons/mouse-pointer.js';
import { plusIcon } from '../../../icons/plus.js';
import { redoIcon } from '../../../icons/redo.js';
import type { IconDefinition } from '../../../icons/types.js';
import { undoIcon } from '../../../icons/undo.js';
import { unlockIcon } from '../../../icons/unlock.js';
import { workflowIcon } from '../../../icons/workflow.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowControlAction, FlowRunTransportState, FlowStrings, FlowTool } from '../types.js';

export const CONTROL_ACTION = 'flow-control-action';
export const TOOL_REQUEST = 'flow-tool-request';
export const RUN_ACTION = 'flow-run-action';

export type FlowRunTransportAction = 'play' | 'pause' | 'step' | 'back' | 'seek';

export interface FlowControlActionDetail {
  action: Exclude<FlowControlAction, 'tool' | 'run'>;
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
type ButtonAction = Exclude<FlowControlAction, 'tool' | 'run'>;
type Segment =
  | { kind: 'buttons'; actions: ButtonAction[] }
  | { kind: 'tool' }
  | { kind: 'lock' }
  | { kind: 'run' };

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
/** Actions that edit the document; read-only widgets disable them. */
const EDITING_ACTIONS: ReadonlySet<FlowControlAction> = new Set(['layout', 'undo', 'redo']);

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

  .transport {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
  }

  .controls[data-orientation='horizontal'] .transport {
    flex-direction: row;
    align-items: center;
  }

  tp-slider.position {
    min-inline-size: calc(var(--tp-spacing) * 28);
  }

  .controls[data-orientation='vertical'] tp-slider.position {
    min-inline-size: 0;
    min-block-size: calc(var(--tp-spacing) * 28);
    align-self: center;
  }
`;

/**
 * The controls toolbar (Widgets 6.3 Anatomy): a Foundation toolbar of composed Buttons in a
 * Button group, the select/pan tool pair as a Toggle group and, when `run` is listed, a transport
 * (back, play/pause, step) with a Slider over the run steps. It owns no document state: every
 * press is reported to the root (`flow-control-action`, `flow-tool-request`, `flow-run-action`).
 */
export class TpFlowControls extends TpElement {
  static tagName = 'tp-flow-controls';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpButtonGroup, TpButton, TpToggleGroup, TpToggle, TpIcon, TpSlider];
  }
  static override properties = {
    ...TpElement.properties,
    actions: { attribute: false },
    tool: { type: String, reflect: true },
    locked: { type: Boolean, reflect: true },
    canUndo: { type: Boolean, attribute: 'can-undo' },
    canRedo: { type: Boolean, attribute: 'can-redo' },
    strings: { attribute: false },
    runState: { attribute: false },
  };
  static override styles = [TpElement.styles, controlsStyles];

  /** Actions in display order; `tool` renders the select/pan pair, `run` the transport. */
  actions: readonly FlowControlAction[] = ['zoom-in', 'zoom-out', 'fit', 'tool', 'lock'];
  tool: FlowTool = 'select';
  locked = false;
  canUndo = false;
  canRedo = false;
  strings: Partial<FlowStrings> | undefined;
  runState: FlowRunTransportState | undefined;
  override orientation: Orientation = 'vertical';

  #toolbar: ToolbarController | undefined;
  readonly #items = new Map<HTMLElement, ToolbarRegistration<unknown>>();
  /** Slider value accepted locally until the root publishes the next run state. */
  #seek: number | undefined;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
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

  /** Registers every composed Button as a roving item and the Toggle group as a toolbar group. */
  #syncItems(): void {
    const toolbar = this.#toolbar;
    if (!toolbar) return;
    const present = new Set<HTMLElement>();
    for (const element of this.renderRoot.querySelectorAll<HTMLElement>(
      'tp-button.control, tp-toggle.lock, tp-toggle-group.tools',
    )) {
      present.add(element);
      if (this.#items.has(element)) continue;
      this.#items.set(
        element,
        element.localName === 'tp-toggle-group'
          ? toolbar.registerGroup(element)
          : toolbar.registerItem(element, { kind: 'button' }),
      );
    }
    for (const [element, registration] of this.#items)
      if (!present.has(element)) {
        registration.dispose();
        this.#items.delete(element);
      }
  }

  #segments(): Segment[] {
    const segments: Segment[] = [];
    for (const action of this.actions) {
      if (action === 'tool') segments.push({ kind: 'tool' });
      else if (action === 'lock') segments.push({ kind: 'lock' });
      else if (action === 'run') segments.push({ kind: 'run' });
      else {
        const last = segments[segments.length - 1];
        if (last?.kind === 'buttons') last.actions.push(action);
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
    this.dispatchEvent(
      new CustomEvent<FlowControlActionDetail>(CONTROL_ACTION, {
        bubbles: true,
        composed: false,
        detail: { action, sourceEvent: event },
      }),
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
    this.dispatchEvent(
      new CustomEvent<FlowToolRequestDetail>(TOOL_REQUEST, {
        bubbles: true,
        composed: false,
        detail: { tool: next, sourceEvent: event.detail.sourceEvent ?? event },
      }),
    );
  };

  #run(action: FlowRunTransportAction, sourceEvent: Event, index?: number): void {
    const detail: FlowRunActionDetail = { action, sourceEvent };
    if (index !== undefined) detail.index = index;
    this.dispatchEvent(
      new CustomEvent<FlowRunActionDetail>(RUN_ACTION, {
        bubbles: true,
        composed: false,
        detail,
      }),
    );
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

  #renderButton(action: ButtonAction): TemplateResult {
    const strings = this.#strings;
    const label = strings[BUTTON_STRINGS[action]];
    const icon = BUTTON_ICONS[action];
    return html`<tp-button
      class="control"
      variant="outline"
      size="icon-sm"
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
      size="sm"
      data-action="lock"
      .pressed=${this.locked}
      ?disabled=${this.disabled}
      .ariaLabel=${this.locked ? strings.unlock : strings.lock}
      @tp-value-change=${this.#lockChange}
      @tp-value-commit=${this.#contain}
      ><tp-icon .icon=${this.locked ? lockIcon : unlockIcon}></tp-icon
    ></tp-toggle>`;
  }

  #lockChange = (event: Event): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<FlowControlActionDetail>(CONTROL_ACTION, {
        bubbles: true,
        composed: false,
        detail: { action: 'lock', sourceEvent: event },
      }),
    );
  };

  #renderTools(): TemplateResult {
    const strings = this.#strings;
    return html`<tp-toggle-group
      class="tools"
      variant="outline"
      size="sm"
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
          size="icon-sm"
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
          size="icon-sm"
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
          size="icon-sm"
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
                : this.#renderRun(),
        )}`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-controls': TpFlowControls;
  }
}
