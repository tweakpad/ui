import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { PresenceController } from '../../../foundation/presence.js';
import type { FlowCategoryDefinition, FlowNodeDefinition } from '../../../foundation/flow/types.js';
import { TpAccordion } from '../../../components/accordion/accordion.js';
import { TpAccordionItem } from '../../../components/accordion/accordion-item.js';
import { TpButton } from '../../../components/button/button.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { TpInput } from '../../../components/input/input.js';
import { TpInputGroup } from '../../../components/input-group/input-group.js';
import { navigationIcons } from '../../../icons/navigation.js';
import type { IconDefinition } from '../../../icons/types.js';
import { xIcon } from '../../../icons/x.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { setPartComposition } from '../../../presentation/controller.js';
import { resolveStrings } from '../strings.js';
import type { FlowStrings } from '../types.js';

export const PALETTE_INSERT = 'flow-palette-insert';
export const PALETTE_CLOSE = 'flow-palette-close';
export const PALETTE_DRAG_START = 'flow-palette-drag-start';
export const PALETTE_DRAG_END = 'flow-palette-drag-end';
/** Drag payload type of a palette item; the root reads it on drop. */
export const PALETTE_DRAG_TYPE = 'application/x-tweakpad-flow-node';

export interface FlowPaletteInsertDetail {
  type: string;
  /** `place` (a pointer click) arms placement; `insert` (the keyboard) inserts at once. */
  mode: 'insert' | 'place';
  sourceEvent: Event;
}
export interface FlowPaletteCloseDetail {
  sourceEvent: Event;
}
export interface FlowPaletteDragStartDetail {
  type: string;
  sourceEvent: Event;
}

/** One category of the library with the definitions the search keeps. */
interface PaletteGroup {
  id: string;
  label: string;
  tone?: string;
  open: boolean;
  definitions: FlowNodeDefinition[];
}

const paletteStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
  }

  .palette {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-inline-size: 0;
    min-block-size: 0;
  }

  .header {
    display: flex;
    align-items: center;
    flex: none;
  }

  .title {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search {
    flex: none;
  }

  /* The body scrolls the groups below the search. */
  .body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .groups {
    display: flex;
    flex-direction: column;
    gap: var(--tp-space-4);
  }

  /* The menu lays the groups out as columns. */
  :host([layout='menu']) .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--tp-spacing) * 36), 1fr));
    gap: var(--tp-space-6) var(--tp-space-4);
    align-items: start;
  }

  .items {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .items > tp-button {
    inline-size: 100%;
    justify-content: flex-start;
  }

  .empty {
    margin: 0;
  }
`;

/**
 * The node library (Widgets 6.3 Anatomy): the schema's definitions grouped by category, each a
 * compact outline Button chip with the definition's icon. In the `sidebar` layout it floats at
 * the root's inline start, enters and leaves like the inspector from its side, and shows the
 * groups as Accordion sections; in the `menu` layout (inside the root's Dialog) the groups are
 * columns. A search filters both. A chip is dragged onto the canvas; a pointer click arms
 * placement and Enter inserts at once (`flow-palette-insert`).
 */
export class TpFlowPalette extends TpElement {
  static tagName = 'tp-flow-palette';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpButton, TpIcon, TpInput, TpInputGroup, TpAccordion, TpAccordionItem];
  }
  static override properties = {
    ...TpElement.properties,
    definitions: { attribute: false },
    categories: { attribute: false },
    icons: { attribute: false },
    strings: { attribute: false },
    layout: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    query: { type: String },
    label: { type: String },
  };
  static override styles = [TpElement.styles, paletteStyles];

  definitions: readonly FlowNodeDefinition[] = [];
  categories: readonly FlowCategoryDefinition[] = [];
  /** Region name; unique per page when several graphs show a palette. */
  label = '';
  icons: Record<string, IconDefinition> = {};
  strings: Partial<FlowStrings> | undefined;
  layout: 'sidebar' | 'menu' = 'sidebar';
  /** The sidebar's presence; the menu's Dialog owns its own. */
  open = false;
  query = '';

  readonly #composed = new WeakSet<TpElement>();
  readonly #presence = new PresenceController(this, {
    surface: () => this.renderRoot?.querySelector('.palette') ?? null,
  });

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  get #present(): boolean {
    return this.layout === 'menu' || this.open;
  }

  /** Focuses the search. */
  override focus(options?: FocusOptions): void {
    const input = this.renderRoot?.querySelector<HTMLElement>('tp-input.search-input');
    if (input) input.focus(options);
    else super.focus(options);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.hasUpdated) this.#presence.settle(this.#present);
    else if (changed.has('open') || changed.has('layout')) this.#presence.setPresent(this.#present);
    this.hidden = this.#presence.state === 'absent';
    this.inert = !this.#present;
  }

  /**
   * Compact composition: a chip's label starts at its icon, and the sidebar's sections keep
   * tight rows (the Button and Accordion recipes stay theirs).
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    for (const item of this.renderRoot.querySelectorAll<TpElement>('tp-button.item')) {
      if (this.#composed.has(item)) continue;
      this.#composed.add(item);
      setPartComposition(item, this, {
        button: { styleHook: { 'justify-content': 'flex-start' } },
      });
    }
    const sections = this.renderRoot.querySelector<TpElement>('tp-accordion.sections');
    if (sections && !this.#composed.has(sections)) {
      this.#composed.add(sections);
      setPartComposition(sections, this, {
        'accordion-trigger': {
          styleHook: { 'padding-block': 'var(--tp-space-1-5)', 'padding-inline': '0' },
        },
        'accordion-content-body': {
          styleHook: { 'padding-block': '0 var(--tp-space-3)', 'padding-inline': '0' },
        },
      });
    }
  }

  /** Categories in schema order, then any others in first-use order; the search filters them. */
  #groups(): PaletteGroup[] {
    const strings = this.#strings;
    const query = this.query.trim().toLowerCase();
    const known = new Map(this.categories.map((category) => [category.id, category]));
    const groups = new Map<string, PaletteGroup>();
    const group = (id: string): PaletteGroup => {
      let found = groups.get(id);
      if (!found) {
        const category = known.get(id);
        found = {
          id,
          label: id ? (category?.label ?? id) : strings.uncategorized,
          ...(category?.tone ? { tone: category.tone } : {}),
          open: category?.open ?? true,
          definitions: [],
        };
        groups.set(id, found);
      }
      return found;
    };
    for (const category of this.categories) group(category.id);
    for (const definition of this.definitions) {
      const target = group(definition.category ?? '');
      const text = [definition.label, definition.description, definition.type, target.label]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!query || text.includes(query)) target.definitions.push(definition);
    }
    return [...groups.values()].filter((entry) => entry.definitions.length);
  }

  #dragStart = (event: DragEvent): void => {
    const item = event.currentTarget as HTMLElement;
    const type = item.dataset['type'];
    if (!type || this.disabled || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    event.dataTransfer.setData('text/plain', type);
    event.dataTransfer.effectAllowed = 'copy';
    // Once the drag image is taken the root lets the canvas show (and take the drop) under the menu.
    queueMicrotask(() =>
      this.dispatchEvent(
        new CustomEvent<FlowPaletteDragStartDetail>(PALETTE_DRAG_START, {
          bubbles: true,
          composed: true,
          detail: { type, sourceEvent: event },
        }),
      ),
    );
  };

  #dragEnd = (event: DragEvent): void => {
    this.dispatchEvent(
      new CustomEvent<FlowPaletteCloseDetail>(PALETTE_DRAG_END, {
        bubbles: true,
        composed: true,
        detail: { sourceEvent: event },
      }),
    );
  };

  /** A pointer click (detail 1 or more) arms placement; Enter and Space (detail 0) insert. */
  #activate = (event: MouseEvent): void => {
    const type = (event.currentTarget as HTMLElement).dataset['type'];
    if (!type || this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<FlowPaletteInsertDetail>(PALETTE_INSERT, {
        bubbles: true,
        composed: true,
        detail: { type, mode: event.detail > 0 ? 'place' : 'insert', sourceEvent: event },
      }),
    );
  };

  #queryChange = (event: TpValueChangeEvent<string>): void => {
    event.stopPropagation();
    this.query = String(event.detail.value ?? '');
  };

  #contain = (event: Event): void => {
    event.stopPropagation();
  };

  #close = (event: Event): void => {
    this.dispatchEvent(
      new CustomEvent<FlowPaletteCloseDetail>(PALETTE_CLOSE, {
        bubbles: true,
        composed: true,
        detail: { sourceEvent: event },
      }),
    );
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || this.layout === 'menu') return;
    event.preventDefault();
    event.stopPropagation();
    this.#close(event);
  };

  #renderItem(definition: FlowNodeDefinition): TemplateResult {
    const icon = definition.icon ? this.icons[definition.icon] : undefined;
    return html`<tp-button
      class="item"
      variant="outline"
      size="xs"
      draggable=${this.disabled ? 'false' : 'true'}
      data-type=${definition.type}
      data-tone=${definition.tone ?? nothing}
      title=${definition.description ?? this.#strings.dragToPlace}
      .icon=${icon}
      ?disabled=${this.disabled}
      @dragstart=${this.#dragStart}
      @dragend=${this.#dragEnd}
      @click=${this.#activate}
      >${definition.label}</tp-button
    >`;
  }

  #renderItems(group: PaletteGroup): TemplateResult {
    return this.renderPart(
      'flow-palette-items',
      {},
      {
        tag: 'div',
        properties: { part: 'flow-palette-items', class: 'items' },
        content: html`${group.definitions.map((definition) => this.#renderItem(definition))}`,
      },
    ) as TemplateResult;
  }

  #renderGroupLabel(group: PaletteGroup, tag: 'h3' | 'span', slot?: string): unknown {
    return this.renderPart(
      'flow-palette-group-label',
      {},
      {
        tag,
        properties: {
          part: 'flow-palette-group-label',
          class: 'group-label',
          'data-tone': group.tone,
          ...(slot ? { slot } : {}),
        },
        content: group.label,
      },
    );
  }

  /** A group with its label as a heading: the menu's columns and the sidebar while searching. */
  #renderSection(group: PaletteGroup): TemplateResult {
    return this.renderPart(
      'flow-palette-group',
      {},
      {
        tag: 'section',
        properties: {
          part: 'flow-palette-group',
          class: 'group',
          'data-tone': group.tone,
          'aria-label': group.label,
        },
        content: html`${this.#renderGroupLabel(group, 'h3')}${this.#renderItems(group)}`,
      },
    ) as TemplateResult;
  }

  /** The sidebar's groups: Accordion sections, all of them open unless their category says. */
  #renderSections(groups: readonly PaletteGroup[]): TemplateResult {
    return html`<tp-accordion
      class="sections"
      part="flow-palette-sections"
      selection-mode="multiple"
      .defaultValue=${groups.filter((group) => group.open).map((group) => group.id || '-')}
      @tp-value-change=${this.#contain}
      @tp-value-commit=${this.#contain}
      >${groups.map(
        (group) =>
          html`<tp-accordion-item value=${group.id || '-'}
            >${this.#renderGroupLabel(group, 'span', 'label')}${this.#renderItems(
              group,
            )}</tp-accordion-item
          >`,
      )}</tp-accordion
    >`;
  }

  protected override render() {
    const strings = this.#strings;
    const groups = this.#groups();
    const sidebar = this.layout === 'sidebar';
    const searching = this.query.trim().length > 0;
    const state = this.#presence.state;
    const header = sidebar
      ? this.renderPart(
          'flow-palette-header',
          {},
          {
            tag: 'header',
            properties: { part: 'flow-palette-header', class: 'header' },
            content: html`<span class="title">${strings.palette}</span>
              <tp-button
                class="close"
                variant="ghost"
                size="icon-sm"
                .ariaLabel=${strings.close}
                .icon=${xIcon}
                @click=${this.#close}
              ></tp-button>`,
          },
        )
      : nothing;
    const search = html`<tp-input-group class="search" part="flow-palette-search">
      <tp-icon slot="inline-start" .icon=${navigationIcons.search} aria-hidden="true"></tp-icon>
      <tp-input
        class="search-input"
        type="search"
        .value=${this.query}
        placeholder=${strings.searchNodes}
        .ariaLabel=${strings.searchNodes}
        @tp-value-change=${this.#queryChange}
        @tp-value-commit=${this.#contain}
      ></tp-input>
    </tp-input-group>`;
    const content = !groups.length
      ? html`<p class="empty">${strings.noResults}</p>`
      : sidebar && !searching && groups.some((group) => group.id)
        ? this.#renderSections(groups)
        : html`<div class="groups">${groups.map((group) => this.#renderSection(group))}</div>`;
    const body = this.renderPart(
      'flow-palette-body',
      { query: this.query },
      {
        tag: 'div',
        properties: { part: 'flow-palette-body', class: 'body' },
        content: html`${search}${content}`,
      },
    );
    return this.renderPart(
      'flow-palette',
      { query: this.query },
      {
        tag: 'div',
        properties: {
          part: 'flow-palette',
          class: 'palette',
          role: 'region',
          'aria-label': this.label || strings.palette,
          'data-layout': this.layout,
          'data-open': this.#present,
          'data-starting-style': sidebar && state === 'starting',
          'data-ending-style': sidebar && state === 'ending',
          '@keydown': this.#keyDown,
        },
        content: html`${header}${body}`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-palette': TpFlowPalette;
  }
}
