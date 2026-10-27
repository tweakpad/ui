/**
 * The table controls of the text editor, composed for the element (`uwg-te-req-tables-2` to
 * `uwg-te-req-tables-9`): the size picker, the chrome with its menus, the column resize, the
 * table-controls session, the sticky header, Tab between cells and the table announcements.
 */
import { css, html, type TemplateResult } from 'lit';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { AnchorGeometry, VirtualAnchor } from '../../../foundation/positioning.js';
import type { TextEditorAction } from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorAccess,
  TextEditorRequestDetail,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineInstance } from '../../../foundation/text-editor/engine.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorCellAddress,
  TextEditorEngineState,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type {
  TextEditorRequestSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolRegistry,
  TextEditorToolTarget,
} from '../../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type { TextEditorContextualSurface } from '../focus.js';
import type { OverlayGeometry } from '../geometry.js';
import { resolveMenuGroups, type TextEditorToolbarGroup } from '../tools/resolve.js';
import { tableChromeStyles, tableTabMove, TextEditorTableChrome } from './table-chrome.js';
import { TextEditorTableControls } from './table-controls.js';
import { TextEditorTablePicker } from './table-picker.js';
import { renderTableSticky, TextEditorTableSticky } from './table-sticky.js';
import { selectionAnchor } from './selection-toolbar.js';

/**
 * Whether the control that opened the size picker takes focus back when it closes: only while it
 * is rendered, so the control of a selection toolbar that hid for the picker gives focus to the
 * editing root instead.
 */
export function openerTakesFocus(opener: HTMLElement | null): opener is HTMLElement {
  return !!opener?.isConnected && (opener.checkVisibility?.() ?? true);
}

/** What the table controls need from the element, which implements it. */
export interface TextEditorTablesHost {
  readonly element: HTMLElement;
  readonly geometry: OverlayGeometry;
  /** The instance while ready, else `null`. */
  instance(): TextEditorEngineInstance | null;
  state(): TextEditorEngineState;
  strings(): TextEditorStrings;
  layout(): TextEditorLayout;
  access(): TextEditorAccess;
  direction(): 'ltr' | 'rtl';
  registry(): TextEditorToolRegistry | null;
  toolContext(
    surface: TextEditorRequestSurface,
    target: TextEditorToolTarget,
  ): TextEditorToolContext;
  toolEnabled(tool: TextEditorTool, context: TextEditorToolContext): boolean;
  shortcut(toolId: string): KeyShortcut | undefined;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  announce(message: string): void;
  /** Restores editing focus and the selection through the adapter. */
  focusEditing(): void;
  /** Whether focus is within the widget, its top-layer surfaces included. */
  focused(): boolean;
  /** Adds a surface to the Alt+F10 cycle. */
  registerContextual(surface: TextEditorContextualSurface): () => void;
  /** Alt+F10: the next contextual controls. */
  cycleContextual(event: Event): boolean;
  /** `stickyTableHeaders`. */
  stickyHeaders(): boolean;
  viewport(): HTMLElement | null;
  content(): HTMLElement | null;
  toolbar(): HTMLElement | null;
  requestUpdate(): void;
  /** Resolves once the element rendered. */
  updateComplete(): Promise<unknown>;
  /** The widget's one transient surface (`uwg-te-req-surfaces-6`): menus and the size picker. */
  transientOpened?(
    owner: object,
    close: (reason?: ChangeReason) => void,
    reason?: ChangeReason,
  ): void;
  transientClosed?(owner: object): void;
  /** A change of the size picker's open lane (`uwg-te-tab-reasons` r12, r13). */
  pickerLane?(open: boolean, reason: ChangeReason): void;
}

const ignore = (): void => undefined;

/** The table controls of one widget. */
export class TextEditorTables {
  /** The structure of the table chrome and the sticky copy, for the element's styles. */
  static readonly styles = [
    tableChromeStyles,
    css`
      .table-sticky {
        position: absolute;
        top: 0;
        left: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .table-sticky[hidden] {
        display: none !important;
      }
    `,
  ];

  readonly #host: TextEditorTablesHost;
  readonly chrome: TextEditorTableChrome;
  readonly controls: TextEditorTableControls;
  readonly picker: TextEditorTablePicker;
  readonly sticky: TextEditorTableSticky;
  #unregister: (() => void) | null = null;
  /** The selection, the caret, or else the end of the document (`uwg-te-req-tables-2`). */
  readonly #selectionAnchor: VirtualAnchor;

  constructor(host: TextEditorTablesHost) {
    this.#host = host;
    this.#selectionAnchor = selectionAnchor(
      () => {
        const instance = host.instance();
        if (!instance) return [];
        const rects = instance.selectionRects();
        if (rects.length) return rects;
        const caret = instance.caretRect();
        if (caret) return [caret];
        const last = instance.getBlocks().roots.at(-1);
        const block = last === undefined ? null : instance.blockRects(last);
        return block ? [block.content] : [];
      },
      () => host.content(),
    );
    this.chrome = new TextEditorTableChrome({
      element: host.element,
      geometry: host.geometry,
      instance: () => host.instance(),
      state: () => host.state(),
      access: () => host.access(),
      strings: () => host.strings(),
      direction: () => host.direction(),
      request: (proposal) => host.request(proposal),
      menuGroups: (surface, target) => this.#menuGroups(surface, target),
      focusEditing: () => host.focusEditing(),
      announce: (message) => host.announce(message),
      requestUpdate: () => host.requestUpdate(),
      focused: () => host.focused(),
      transientOpened: (owner, close) => host.transientOpened?.(owner, close),
      transientClosed: (owner) => host.transientClosed?.(owner),
    });
    this.controls = new TextEditorTableControls({
      element: host.element,
      chrome: this.chrome,
      applicable: () => {
        const access = host.access();
        const state = host.state();
        return (
          !access.readOnly &&
          !access.disabled &&
          state.editable &&
          host.instance() !== null &&
          state.table !== null
        );
      },
      focusEditing: () => host.focusEditing(),
      cycle: (event) => {
        if (!host.cycleContextual(event)) {
          this.controls.end();
          host.focusEditing();
        }
      },
      rendered: () => host.updateComplete(),
    });
    this.picker = new TextEditorTablePicker({
      strings: () => host.strings(),
      disabled: () => host.access().disabled,
      insert: (size, surface, sourceEvent, trigger) =>
        void host
          .request({
            target: 'table',
            value: size,
            surface,
            reason: 'item-press',
            sourceEvent,
            trigger,
            focus: true,
          })
          .catch(ignore),
      restoreFocus: (opener) => {
        if (host.access().disabled) return false;
        if (openerTakesFocus(opener)) return opener;
        host.focusEditing();
        return false;
      },
      requestUpdate: () => host.requestUpdate(),
      transientOpened: (owner, close, reason) => host.transientOpened?.(owner, close, reason),
      transientClosed: (owner) => host.transientClosed?.(owner),
      lane: (open, reason) => host.pickerLane?.(open, reason),
    });
    this.sticky = new TextEditorTableSticky({
      geometry: host.geometry,
      enabled: () => host.stickyHeaders(),
      instance: () => host.instance(),
      viewport: () => host.viewport(),
      toolbar: () => host.toolbar(),
    });
  }

  // Lifecycle -------------------------------------------------------------------------------------

  /** Joins the Alt+F10 cycle and observes the viewport; call once the parts render. */
  connected(): void {
    this.#unregister ??= this.#host.registerContextual(this.controls);
    const viewport = this.#host.viewport();
    if (viewport) this.chrome.observe(viewport);
    this.sticky.sync();
    this.chrome.update();
  }

  disconnected(): void {
    this.#unregister?.();
    this.#unregister = null;
    this.controls.end();
    this.chrome.release();
    this.sticky.release();
    this.picker.disconnected();
  }

  /** After each render: menu triggers, picker fields, the sticky observations. */
  updated(): void {
    this.chrome.updated();
    const root = this.#host.element.shadowRoot;
    if (root) this.picker.updated(root);
    this.sticky.sync();
  }

  /** A new published state: the chrome's model and the cell range announcement. */
  stateChanged(): void {
    const access = this.#host.access();
    if (access.readOnly || access.disabled) this.controls.end();
    if (access.disabled) this.picker.close('disabled');
    this.chrome.update();
  }

  /**
   * Focus entered or left the widget: the grips at the selection head and the cell range's outline
   * show only with it (`uwg-te-req-tables-3`).
   */
  focusChanged(): void {
    this.chrome.update();
  }

  /** A document change: structural table changes are announced; the sticky copy is renewed. */
  valueChanged(actions: readonly TextEditorAction[], origin: 'request' | 'engine'): void {
    if (origin === 'request') this.chrome.changed(actions);
    this.sticky.contentChanged();
  }

  // Rendering -------------------------------------------------------------------------------------

  /** The chrome and the sticky copy, inside the overlay part. */
  renderOverlay(): TemplateResult {
    return html`${renderTableSticky(this.sticky)}${this.chrome.render()}`;
  }

  /** The size picker and the chrome's menus, outside the viewport and the overlay. */
  renderSurfaces(): TemplateResult {
    return html`${this.picker.render()}${this.chrome.renderMenus()}`;
  }

  // Requests --------------------------------------------------------------------------------------

  /** Opens the surface of the `table` tool run without a value: the size picker. */
  openSurface(tool: TextEditorTool, detail: TextEditorRequestDetail): boolean {
    if (tool.kind !== 'table-size') return false;
    const trigger = detail.trigger;
    return this.picker.show({
      anchor: this.#pickerAnchor(detail),
      surface: detail.surface,
      opener: trigger?.isConnected ? (trigger as HTMLElement) : null,
      reason: detail.reason,
    });
  }

  /**
   * Tab and Shift+Tab with the selection head in a cell (`uwg-te-req-tables-7`): the caret moves
   * collapsed to the end of the next or previous cell as a selection change; Tab in the last cell
   * appends a row as one request and moves the caret into its first cell; Shift+Tab in the first
   * cell is consumed without effect. Returns false outside a cell.
   */
  tableTab(event: KeyboardEvent, backward: boolean): boolean {
    const instance = this.#host.instance();
    const table = this.#host.state().table;
    if (!instance || !table) return false;
    const model = instance.getTable(table.id);
    if (!model) return false;
    const head = table.range?.head ?? table.cell;
    const move = tableTabMove(model, head, backward);
    if (event.repeat && move.kind === 'append') return true;
    if (move.kind === 'cell')
      void this.#host
        .request({
          target: {
            type: 'selection.set',
            selection: { kind: 'caret', block: table.id, cell: move.cell, position: 'end' },
          },
          surface: 'keyboard',
          reason: 'keyboard',
          sourceEvent: event,
        })
        .then((outcome) => this.#revealCell(outcome, table.id, move.cell))
        .catch(ignore);
    else if (move.kind === 'append')
      void this.#host
        .request({
          target: [{ type: 'table.insert-row', table: table.id, index: model.rows, select: true }],
          surface: 'keyboard',
          reason: 'keyboard',
          sourceEvent: event,
        })
        .then((outcome) => this.#revealCell(outcome, table.id, { row: model.rows, column: 0 }))
        .catch(ignore);
    return true;
  }

  /**
   * Scrolls the cell that Tab moved the caret into into view, also inside a table that scrolls
   * sideways: a selection set from code scrolls nothing by itself.
   */
  #revealCell(outcome: TextEditorRequestOutcome, table: string, cell: TextEditorCellAddress): void {
    if (outcome !== 'applied') return;
    this.#host
      .instance()
      ?.cellElement(table, cell)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  /** Whether a cell-handle drag or a column resize is in progress (the Escape order's gesture). */
  get gesture(): boolean {
    return this.chrome.gesture;
  }

  /** Whether a table menu or the size picker is open. */
  get surfaceOpen(): boolean {
    return this.chrome.menuOpen || this.picker.open;
  }

  /**
   * Where the picker opens: at the tool's control in the fixed toolbar, at the More menu's trigger
   * for its item there, otherwise at the selection (`uwg-te-req-tables-2`).
   */
  #pickerAnchor(detail: TextEditorRequestDetail): AnchorGeometry {
    const trigger = detail.trigger;
    const toolbar = this.#host.toolbar();
    if (trigger?.isConnected && toolbar?.contains(trigger)) {
      const more = trigger.closest('.toolbar-more-menu');
      return (
        more?.querySelector<HTMLElement>(':scope > .toolbar-more-trigger') ??
        (trigger as HTMLElement)
      );
    }
    return this.#selectionAnchor;
  }

  /** Closes the table menus and the picker: another transient surface opens. */
  closeSurfaces(): void {
    this.picker.close();
    this.chrome.closeMenus();
  }

  #menuGroups(
    surface: TextEditorRequestSurface,
    target: TextEditorToolTarget,
  ): readonly TextEditorToolbarGroup[] {
    const host = this.#host;
    const registry = host.registry();
    if (!registry) return [];
    const layout = host.layout();
    const groups =
      surface === 'table-row'
        ? layout.tableRow
        : surface === 'table-column'
          ? layout.tableColumn
          : layout.tableCell;
    return resolveMenuGroups(
      groups,
      {
        registry,
        layout,
        access: host.access(),
        context: (menu) => host.toolContext(menu, target),
        enabled: (tool, context) => host.toolEnabled(tool, context),
        shortcut: (id) => host.shortcut(id),
      },
      surface,
    );
  }
}
