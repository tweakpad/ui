import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { composedContains, deepActiveElement } from '../../../foundation/focus.js';
import { preventComponentHandling, type ComponentPartContract } from '../../../foundation/part.js';
import type { FlowNodeDefinition } from '../../../foundation/flow/types.js';
import { TpCommandPalette } from '../../../components/command-palette/command-palette.js';
import type { CommandEntry, CommandItem } from '../../../components/command-palette/model.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpListItem } from '../../../components/list-item/list-item.js';
import type { IconDefinition } from '../../../icons/types.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowStrings } from '../types.js';

export const PALETTE_INSERT = 'flow-palette-insert';
export const PALETTE_CLOSE = 'flow-palette-close';
/** Drag payload type of a palette item; the root reads it on drop. */
export const PALETTE_DRAG_TYPE = 'application/x-tweakpad-flow-node';

export interface FlowPaletteInsertDetail {
  type: string;
  sourceEvent: Event;
}
export interface FlowPaletteCloseDetail {
  sourceEvent: Event;
}

const paletteStyles = css`
  /* The root writes the available height; the panel shrinks to it and its body scrolls. */
  :host {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    max-block-size: min(calc(var(--tp-spacing) * 94), var(--tp-available-height, 100%));
  }

  :host(:not([open])) {
    display: none;
  }

  .palette {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
    overflow: auto;
  }

  tp-command-palette {
    display: block;
    min-inline-size: 0;
    min-block-size: 0;
  }
`;

/**
 * The node palette (Widgets 6.3 Anatomy): a Command palette over the schema's node definitions,
 * grouped by category, each command a presentational List item with the definition's icon tile,
 * label and description. Activation inserts (`flow-palette-insert`); the items are also native
 * drag sources carrying the node type so the root can drop them at a canvas point.
 */
export class TpFlowPalette extends TpElement {
  static tagName = 'tp-flow-palette';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpCommandPalette, TpListItem, TpIcon];
  }
  static override properties = {
    ...TpElement.properties,
    definitions: { attribute: false },
    icons: { attribute: false },
    strings: { attribute: false },
    open: { type: Boolean, reflect: true },
    query: { type: String },
    label: { type: String },
  };
  static override styles = [TpElement.styles, paletteStyles];

  definitions: readonly FlowNodeDefinition[] = [];
  /** Region name; unique per page when several graphs show a palette. */
  label = '';
  icons: Record<string, IconDefinition> = {};
  strings: Partial<FlowStrings> | undefined;
  open = false;
  query = '';

  #entries: readonly CommandEntry[] = [];
  #entriesFor: readonly FlowNodeDefinition[] | undefined;
  #entriesIcons: Record<string, IconDefinition> | undefined;
  readonly #registered = new WeakSet<HTMLElement>();
  readonly #registrations: Array<() => void> = [];
  /**
   * A press on a draggable item keeps its native default: the Select's own press handling cancels
   * it to hold focus in the query, which also cancels the native drag. Activation still runs
   * through the Command palette's click path (`tp-execute`).
   */
  readonly #paletteContracts: Record<string, ComponentPartContract> = {
    'command-palette-item': {
      hostProperties: {
        '@pointerdown': (event: PointerEvent) => {
          if (event.button !== 0 || this.disabled) return;
          const target = event.target as Element | null;
          if (target?.closest?.('[draggable="true"]')) preventComponentHandling(event);
        },
      },
    },
  };

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  get commandPalette(): TpCommandPalette | null {
    return this.renderRoot?.querySelector('tp-command-palette') ?? null;
  }

  /** Focuses the palette's query input. */
  override focus(options?: FocusOptions): void {
    const input = this.commandPalette?.inputElement;
    if (input) input.focus(options);
    else super.focus(options);
  }

  override disconnectedCallback(): void {
    for (const release of this.#registrations.splice(0)) release();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.#entriesFor !== this.definitions || this.#entriesIcons !== this.icons) {
      this.#entriesFor = this.definitions;
      this.#entriesIcons = this.icons;
      this.#entries = this.#buildEntries();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    void this.#registerItems();
  }

  #buildEntries(): CommandEntry[] {
    const groups = new Map<string, CommandItem[]>();
    const loose: CommandItem[] = [];
    for (const definition of this.definitions) {
      const item = this.#item(definition);
      if (definition.category) {
        const list = groups.get(definition.category) ?? [];
        list.push(item);
        groups.set(definition.category, list);
      } else loose.push(item);
    }
    const entries: CommandEntry[] = [];
    for (const [label, items] of groups) entries.push({ type: 'group', label, items });
    entries.push(...loose);
    return entries;
  }

  #item(definition: FlowNodeDefinition): CommandItem {
    const icon = definition.icon ? this.icons[definition.icon] : undefined;
    const keywords = [definition.type, definition.category ?? ''].filter(Boolean);
    return {
      value: definition.type,
      text: definition.description
        ? `${definition.label} ${definition.description}`
        : definition.label,
      keywords,
      label: html`<tp-list-item
        class="item"
        size="sm"
        draggable="true"
        data-type=${definition.type}
        data-tone=${definition.tone ?? ''}
        description=${definition.description ?? ''}
        @dragstart=${this.#dragStart}
        >${
          icon
            ? html`<tp-icon slot="media" class="tile" .icon=${icon} aria-hidden="true"></tp-icon>`
            : null
        }${definition.label}</tp-list-item
      >`,
    };
  }

  /** The List items render inside the Command palette's list; register them as palette items. */
  async #registerItems(): Promise<void> {
    const palette = this.commandPalette;
    if (!palette) return;
    await palette.updateComplete;
    const list = palette.shadowRoot?.querySelector<
      HTMLElement & { updateComplete: Promise<unknown> }
    >('tp-command-list');
    if (!list) return;
    await list.updateComplete;
    if (!this.isConnected) return;
    for (const item of list.shadowRoot?.querySelectorAll<HTMLElement>('tp-list-item.item') ?? []) {
      if (this.#registered.has(item)) continue;
      this.#registered.add(item);
      this.#registrations.push(this.presentationController.registerPart('flow-palette-item', item));
    }
  }

  #dragStart = (event: DragEvent): void => {
    const item = event.currentTarget as HTMLElement;
    const type = item.dataset['type'];
    if (!type || this.disabled || !event.dataTransfer) return;
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    event.dataTransfer.setData('text/plain', type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  #insert(type: string, sourceEvent: Event): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<FlowPaletteInsertDetail>(PALETTE_INSERT, {
        bubbles: true,
        composed: false,
        detail: { type, sourceEvent },
      }),
    );
    // A pointer activation moved focus to the command (its press kept the native default for
    // the drag); the query takes it back unless the root closed the palette or moved focus.
    const input = this.commandPalette?.inputElement;
    const active = deepActiveElement(this.ownerDocument);
    if (
      this.open &&
      this.isConnected &&
      input &&
      active !== input &&
      composedContains(this, active)
    )
      input.focus({ preventScroll: true });
  }

  /** Activation through the Command palette: Enter on the active command or a click on it. */
  #execute = (event: CustomEvent<{ commandId: unknown; sourceEvent: Event }>): void => {
    event.stopPropagation();
    const type = event.detail.commandId;
    if (typeof type === 'string') this.#insert(type, event.detail.sourceEvent);
  };

  #queryChange = (event: TpValueChangeEvent<string>): void => {
    event.stopPropagation();
    this.query = event.detail.value;
  };

  #contain = (event: Event): void => {
    event.stopPropagation();
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<FlowPaletteCloseDetail>(PALETTE_CLOSE, {
        bubbles: true,
        composed: false,
        detail: { sourceEvent: event },
      }),
    );
  };

  protected override render() {
    const strings = this.#strings;
    return this.renderPart(
      'flow-palette',
      { open: this.open, query: this.query },
      {
        tag: 'div',
        properties: {
          part: 'flow-palette',
          class: 'palette',
          role: 'region',
          'aria-label': this.label || strings.palette,
          '@keydown': this.#keyDown,
        },
        content: html`<tp-command-palette
          inline
          label=${strings.palette}
          placeholder=${strings.searchNodes}
          .items=${this.#entries}
          .query=${this.query}
          .partContracts=${this.#paletteContracts}
          ?disabled=${this.disabled}
          @tp-execute=${this.#execute}
          @tp-query-change=${this.#queryChange}
          @tp-value-change=${this.#contain}
          @tp-open-change=${this.#contain}
        ></tp-command-palette>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-palette': TpFlowPalette;
  }
}
