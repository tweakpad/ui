import { css, html, nothing } from 'lit';
import { observeSlots } from '../shared/slots.js';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { interactiveTargetInPath } from '../../foundation/interactive-target.js';
import { PresenceController } from '../../foundation/presence.js';
import {
  DisclosureIndicator,
  DisclosurePanelController,
} from '../../foundation/disclosure-panel.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { shallowEqual } from '../../foundation/store.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { checkIcon } from '../../icons/check.js';
import { minusIcon } from '../../icons/minus.js';
import { treeViewPresentation } from '../../presentation/families/tree-view.js';
import {
  disclosureIndicatorStyles,
  disclosurePanelStyles,
  fillLayerStyles,
} from '../../presentation/motion.js';
import { TpIcon } from '../icon/icon.js';
import { TpSpinner } from '../spinner/spinner.js';
import { TpButton } from '../button/button.js';
import { selectionBoxStyles } from '../shared/control-styles.js';
import { GROUP_EXTENT } from './segments.js';
import type { TreeItemOwner, TreeItemState } from './types.js';

const NAMED_SLOTS = new Set(['leading', 'trailing', 'indicator', 'handle']);

/**
 * One Tree view item (`ucl20-tree-view` Item). In markup mode it is authored inside a
 * `tp-tree-view` (or another item) and nests its children; in records mode the tree renders one
 * per mounted row. The owning tree publishes the state; the item renders it.
 *
 * @slot - The label; text and elements without a known slot name.
 * @slot leading - Content before the label, such as an icon.
 * @slot trailing - Content after the label, such as a badge or an action.
 * @slot indicator - Replaces the default disclosure chevron.
 * @csspart row - The pressable line; `data-selected`, `data-expanded`, `data-disabled`.
 * @csspart indent - Indentation and guides.
 * @csspart indicator - The disclosure indicator region.
 * @csspart checkbox - The checked indicator; `data-checked`, `data-indeterminate`.
 * @csspart leading - @csspart label - @csspart trailing - Content regions.
 * @csspart handle - The reorder handle region.
 * @csspart status - Loading or load-error line.
 * @csspart group - Markup mode: the region holding child items.
 */
export class TpTreeItem extends TpElement {
  static tagName = 'tp-tree-item';
  static override presentation = treeViewPresentation;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon, TpSpinner, TpButton];
  }
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    label: { type: String },
    hasChildren: { type: Boolean, attribute: 'has-children', reflect: true },
    state: { attribute: false, hasChanged: (a: unknown, b: unknown) => !shallowEqual(a, b) },
  };
  static override styles = [
    TpElement.styles,
    selectionBoxStyles,
    fillLayerStyles("[part~='row']"),
    disclosureIndicatorStyles('[data-default-indicator]'),
    disclosurePanelStyles("[part~='group']", GROUP_EXTENT.block),
    css`
      :host {
        /* Contains the row's block margins, so the item's measured extent includes them. */
        display: flow-root;
        outline: none;
      }

      [part~='row'] {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        min-inline-size: 0;
        position: relative;
        cursor: default;
        user-select: none;
      }

      [part~='indent'] {
        position: absolute;
        inset-block: 0;
        inline-size: calc(var(--_tp-tree-depth, 0) * var(--tp-tree-view-indent));
        background-repeat: repeat-x;
        pointer-events: none;
      }

      [part~='indent'][data-depth='0'] {
        display: none;
      }

      [part~='indicator'],
      [part~='leading'],
      [part~='trailing'],
      [part~='handle'] {
        display: inline-flex;
        flex: none;
        align-items: center;
      }

      [part~='indicator'] {
        justify-content: center;
        inline-size: var(--tp-icon-size-md);
        block-size: var(--tp-icon-size-md);
      }

      [part~='indicator'][data-placeholder] {
        visibility: hidden;
      }

      [data-default-indicator] {
        display: inline-flex;
        line-height: 1;
      }

      [part~='checkbox'] {
        display: inline-flex;
        flex: none;
        align-items: center;
      }

      .check {
        display: inline-flex;
        inline-size: 100%;
        block-size: 100%;
        visibility: hidden;
      }

      [part~='checkbox'][data-checked] .check,
      [part~='checkbox'][data-indeterminate] .check {
        visibility: visible;
      }

      .check tp-icon {
        inline-size: 100%;
        block-size: 100%;
      }

      :host(:dir(rtl)) [data-default-indicator] tp-icon {
        scale: -1 1;
      }

      [part~='label'] {
        flex: 1 1 auto;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      [part~='leading']:not([data-filled]),
      [part~='trailing']:not([data-filled]),
      [part~='handle']:not([data-filled]) {
        display: none;
      }

      [part~='status'] {
        display: flex;
        align-items: center;
      }

      [part~='group'] {
        display: block;
      }

      .group-body {
        display: flow-root;
      }
    `,
  ];

  /** Item identifier (markup mode). */
  value = '';
  /** Accessible label; defaults to the text of the label slot. */
  label: string | null = null;
  /** Declares children that the tree's `loadChildren` supplies on first expansion. */
  hasChildren = false;
  /** Published by the owning tree. */
  state: TreeItemState | null = null;
  /** The tree that publishes this item's state. */
  owner: TreeItemOwner | null = null;

  readonly #indicator = new DisclosureIndicator();
  readonly #presence = new PresenceController(this, {
    surface: () => this.groupElement,
    onStateChange: (state) => {
      this.#panel.sync(state);
      this.requestUpdate();
    },
  });
  readonly #panel = new DisclosurePanelController(this, {
    owner: () => this,
    panel: () => this.groupElement,
    body: () => this.renderRoot?.querySelector<HTMLElement>('.group-body') ?? null,
    context: () => ({ itemId: this.state?.id ?? this.value, level: this.state?.level ?? 1 }),
    trackCompletion: (completion) => this.#presence.trackCompletion(completion),
    extent: GROUP_EXTENT,
  });
  #releaseSlots: (() => void) | null = null;
  #settled = false;

  constructor() {
    super();
    // Keyboard interaction belongs to the owning tree (one composite with one tab stop).
    this.addEventListener('click', this.#press);
  }

  get groupElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>("[part~='group']") ?? null;
  }

  get rowElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>("[part~='row']") ?? null;
  }

  /** Axis values (size) come from the owning tree. */
  get presentationOwner(): HTMLElement | null {
    return (this.owner as unknown as HTMLElement | null) ?? null;
  }

  /** Child items authored inside this item (markup mode). */
  get childItems(): TpTreeItem[] {
    return [...this.children].filter((child): child is TpTreeItem => child instanceof TpTreeItem);
  }

  /** Text of the label slot, used when `label` is not set. */
  get labelText(): string {
    if (this.label) return this.label;
    let text = '';
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
      else if (
        node instanceof Element &&
        !(node instanceof TpTreeItem) &&
        !NAMED_SLOTS.has(node.getAttribute('slot') ?? '')
      )
        text += node.textContent ?? '';
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Reassign when direct children or their slot names change; the tree observes structure.
    this.#releaseSlots = observeSlots(this, (records) => {
      if (records.some((record) => record.target === this || record.target.parentNode === this))
        this.#assign();
    });
    this.#findOwner();
  }

  override disconnectedCallback(): void {
    this.#releaseSlots?.();
    this.#releaseSlots = null;
    this.#indicator.cancel();
    this.#panel.cancel();
    super.disconnectedCallback();
  }

  /** Markup mode: announce ourselves to the nearest tree; records mode sets `owner` directly. */
  #findOwner(): void {
    if (this.owner) {
      this.owner.itemConnected(this);
      return;
    }
    const tree = this.closest('tp-tree-view') as (HTMLElement & TreeItemOwner) | null;
    if (tree && 'itemConnected' in tree) tree.itemConnected(this);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate?.(changed);
    if (!changed.has('state') || !this.state) return;
    const previous = changed.get('state') as TreeItemState | null | undefined;
    const expanded = this.state.expandable && this.state.expanded;
    const was = Boolean(previous?.expandable && previous.expanded);
    if (previous && expanded !== was && this.state.transition) {
      this.#indicator.prepare(this, this.#defaultIndicator(), was, expanded, {
        itemId: this.state.id,
        level: this.state.level,
      });
    }
    // Markup groups follow the expansion lane; records rows have no group.
    if (!this.state.records && this.state.expandable) {
      if (!this.#settled || !this.state.transition) this.#presence.settle(expanded);
      else this.#presence.setPresent(expanded);
      this.#settled = true;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#assign();
    const state = this.state;
    if (state) this.#reflect(state);
    this.#panel.observe();
    if (changed.has('state') && state) {
      this.#indicator.apply(this.#defaultIndicator(), this.#rotation());
      if (state.transition) this.#indicator.start();
    }
  }

  #rotation(): string {
    const expanded = Boolean(this.state?.expandable && this.state.expanded);
    return DisclosureIndicator.rotation(expanded, this.state?.direction ?? this.direction, true);
  }

  #reflect(state: TreeItemState): void {
    const set = (name: string, value: string | null) => {
      if (value === null) this.removeAttribute(name);
      else if (this.getAttribute(name) !== value) this.setAttribute(name, value);
    };
    set('role', 'treeitem');
    set('aria-level', String(state.level));
    set('aria-setsize', String(state.setSize));
    set('aria-posinset', String(state.posInSet));
    set('aria-expanded', state.expandable ? String(state.expanded) : null);
    set('aria-selected', state.selected === undefined ? null : String(state.selected));
    set(
      'aria-checked',
      state.checked === undefined
        ? null
        : state.checked === 'mixed'
          ? 'mixed'
          : String(state.checked),
    );
    set('aria-disabled', state.disabled ? 'true' : null);
    set('aria-busy', state.status === 'loading' ? 'true' : null);
    if (!this.authoredAttributes.has('aria-label')) set('aria-label', state.label || null);
    set('tabindex', state.tabStop ? '0' : state.focusable ? '-1' : null);
    set('data-guides', state.guides);
    this.toggleAttribute('data-expanded', state.expandable && state.expanded);
    this.toggleAttribute('data-selected', Boolean(state.selected));
    this.toggleAttribute('data-loading', state.status === 'loading');
    this.toggleAttribute('data-error', state.status === 'error');
  }

  /** Manual slot assignment keeps the authored DOM untouched. */
  #assign(): void {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    const slots = new Map<string, HTMLSlotElement>();
    for (const slot of root.querySelectorAll('slot')) slots.set(slot.name, slot);
    const assigned = new Map<string, (Element | Text)[]>();
    for (const node of this.childNodes) {
      let name = '';
      if (node instanceof TpTreeItem) name = 'group';
      else if (node instanceof Element) {
        const slot = node.getAttribute('slot') ?? '';
        name = NAMED_SLOTS.has(slot) ? slot : '';
      } else if (node.nodeType !== Node.TEXT_NODE) continue;
      const list = assigned.get(name) ?? [];
      list.push(node as Element | Text);
      assigned.set(name, list);
    }
    for (const [name, slot] of slots) {
      const nodes = assigned.get(name) ?? [];
      slot.assign(...nodes);
      const filled = nodes.some(
        (node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim(),
      );
      slot.parentElement?.toggleAttribute('data-filled', filled);
    }
  }

  #defaultIndicator(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[data-default-indicator]') ?? null;
  }

  #press = (event: MouseEvent): void => {
    if (!this.owner || event.button !== 0) return;
    const path = event.composedPath();
    // Presses inside a nested item belong to that item.
    if (path.find((node) => node instanceof TpTreeItem) !== this) return;
    const region = (part: string) =>
      path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.getRootNode() === this.renderRoot &&
          node.part?.contains(part),
      );
    if (path.some((node) => node instanceof HTMLElement && node.dataset.retry !== undefined)) {
      this.owner.itemPress(this, 'retry', event);
      return;
    }
    if (region('handle')) return;
    if (region('status') || region('group')) return;
    // Controls placed in the item's content own their presses.
    if (interactiveTargetInPath(event, this)) return;
    this.owner.itemPress(
      this,
      region('indicator') ? 'indicator' : region('checkbox') ? 'checkbox' : 'row',
      event,
    );
  };

  protected override render() {
    const state = this.state;
    const depth = Math.max(0, (state?.level ?? 1) - 1);
    const expandable = Boolean(state?.expandable);
    const expanded = expandable && Boolean(state?.expanded);
    const messages = this.owner?.resolvedMessages;
    const status = state?.status ?? 'idle';
    const checked = state?.checked;
    const row = html`<div
      part="row"
      class="row"
      style=${`--_tp-tree-depth:${depth}`}
      ?data-selected=${Boolean(state?.selected)}
      ?data-expanded=${expanded}
      ?data-disabled=${Boolean(state?.disabled)}
      ?data-dragging=${Boolean(state?.dragging)}
    >
      <span part="indent" aria-hidden="true" data-depth=${depth}></span>
      <span
        part="indicator"
        aria-hidden="true"
        ?data-placeholder=${!expandable}
        ?data-filled=${true}
      >
        <slot name="indicator"
          ><span data-default-indicator><tp-icon .icon=${chevronRightIcon}></tp-icon></span
        ></slot>
      </span>
      ${
        checked === undefined
          ? nothing
          : html`<span
              part="checkbox"
              aria-hidden="true"
              ?data-checked=${checked === true}
              ?data-indeterminate=${checked === 'mixed'}
              ?data-disabled=${Boolean(state?.disabled)}
              ><span class="box"
                ><span class="check"
                  ><tp-icon
                    .icon=${checked === 'mixed' ? minusIcon : checkIcon}
                  ></tp-icon></span></span
            ></span>`
      }
      <span part="leading"><slot name="leading"></slot></span>
      <span part="label"><slot></slot></span>
      <span part="trailing"><slot name="trailing"></slot></span>
      <span part="handle"><slot name="handle"></slot></span>
    </div>`;
    const statusLine =
      expanded && (status === 'loading' || status === 'error')
        ? html`<div part="status" role="none" style=${`--_tp-tree-depth:${depth}`}>
            ${
              status === 'loading'
                ? html`<tp-spinner size="sm" label=""></tp-spinner
                    ><span>${messages?.loading ?? 'Loading'}</span>`
                : html`<span>${messages?.loadError(state?.label ?? '') ?? ''}</span>
                    <tp-button variant="ghost" size="xs" tabindex="-1" data-retry
                      >${messages?.retry ?? 'Retry'}</tp-button
                    >`
            }
          </div>`
        : nothing;
    const presence = this.#presence.state;
    const group =
      expandable && state && !state.records
        ? html`<div
            part="group"
            role="group"
            ?data-open=${presence === 'starting' || presence === 'open'}
            ?data-closed=${presence !== 'starting' && presence !== 'open'}
            ?data-starting-style=${presence === 'starting'}
            ?data-ending-style=${presence === 'ending'}
            ?hidden=${presence === 'absent' || presence === 'retained'}
          >
            <div class="group-body"><slot name="group"></slot></div>
          </div>`
        : html`<slot name="group" hidden></slot>`;
    return html`${row}${statusLine}${group}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-tree-item': TpTreeItem;
  }
}
