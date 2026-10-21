/**
 * The floating surfaces of the text editor (M7): the selection toolbar, the suggestion lists and
 * the link and image popovers, with the pasted and dropped image files. One owner per widget
 * composes them, keeps one transient surface open at a time (`uwg-te-req-surfaces-6`) and gives
 * the element a few members to call from its lifecycle, render, router and controller host.
 */
import { html, type TemplateResult } from 'lit';
import { composedContains, deepActiveElement } from '../../../foundation/focus.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type {
  TextEditorAccess,
  TextEditorRequestDetail,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorDiagnosticCode,
  TextEditorEngineInstance,
} from '../../../foundation/text-editor/engine.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorEngineState,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type {
  TextEditorRequestSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolRegistry,
} from '../../../foundation/text-editor/tools.js';
import type { TextEditorContextualSurface, TextEditorMenuModality } from '../focus.js';
import type { TextEditorToolActivation } from '../tools/controls.js';
import { resolveSelectionToolbarView } from '../tools/resolve.js';
import type { TextEditorImageUpload } from '../types.js';
import { insertImageFiles, TextEditorImagePopover } from './image-popover.js';
import { TextEditorLinkPopover } from './link-popover.js';
import { composedSelectionText, TextEditorSelectionToolbar } from './selection-toolbar.js';
import { TextEditorSuggestions } from './suggestions.js';

/** What the floating surfaces read and call; the element implements it. */
export interface TextEditorPopupsHost {
  readonly renderRoot: ShadowRoot;
  requestUpdate(): void;
  strings(): TextEditorStrings;
  registry(): TextEditorToolRegistry | null;
  layout(): TextEditorLayout | null;
  access(): TextEditorAccess;
  /** The published state. */
  state(): TextEditorEngineState;
  /** The instance while the editor is ready, else null. */
  instance(): TextEditorEngineInstance | null;
  /** The content part, which holds the editing root. */
  content(): HTMLElement | null;
  /** The fixed toolbar part, or null. */
  toolbar(): HTMLElement | null;
  toolContext(surface: TextEditorRequestSurface): TextEditorToolContext;
  toolEnabled(tool: TextEditorTool, context: TextEditorToolContext): boolean;
  shortcut(toolId: string): KeyShortcut | undefined;
  /**
   * The widget's one transient surface (`uwg-te-req-surfaces-6`): a surface that opens closes the
   * one open before it through its `close`.
   */
  transientOpened?(owner: object, close: () => void): void;
  transientClosed?(owner: object): void;
  /** Whether the surface of a link, image or table-size tool is open. */
  expanded?(tool: TextEditorTool): boolean;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  imageUpload(): TextEditorImageUpload | null;
  /** Focuses the editing root with its selection, through the adapter. */
  focusEditing(): void;
  announce(message: string): void;
  diagnose(code: TextEditorDiagnosticCode, message: string): void;
  /** A block drag is in progress. */
  dragging(): boolean;
  /** The root attributes of the suggestion list changed. */
  referencesChanged(): void;
  menuOpened(trigger: HTMLElement, modality: TextEditorMenuModality): void;
  menuClosed(changed: boolean): void;
  readonly menuFinalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
  /** Adds a surface to the Alt+F10 cycle. */
  registerContextual(surface: TextEditorContextualSurface): () => void;
  cycleContextual(sourceEvent: Event): boolean;
}

export class TextEditorPopups {
  readonly #host: TextEditorPopupsHost;
  readonly selectionToolbar: TextEditorSelectionToolbar;
  readonly suggestions: TextEditorSuggestions;
  readonly link: TextEditorLinkPopover;
  readonly image: TextEditorImagePopover;
  /** `aria-controls` and `aria-activedescendant` of the editing root while a list shows. */
  #reference: string | null = null;
  /** Aborts the uploads of pasted and dropped image files when the widget disconnects. */
  #uploads: AbortController | null = null;
  readonly #releaseContextual: () => void;
  /** Whether the text selection holds more than whitespace, read while the editing root has focus. */
  #selectedText: { readonly selection: unknown; readonly value: boolean } | null = null;

  constructor(host: TextEditorPopupsHost) {
    this.#host = host;
    const ready = () => host.instance();
    const rects = () => ready()?.selectionRects() ?? [];
    const caret = () => ready()?.caretRect() ?? null;
    const opening = (except: 'suggestions' | 'link' | 'image') => () => this.#closeOthers(except);
    this.selectionToolbar = new TextEditorSelectionToolbar({
      get renderRoot() {
        return host.renderRoot;
      },
      view: () => {
        const registry = host.registry();
        const layout = host.layout();
        if (!registry || !layout) return null;
        return resolveSelectionToolbarView({
          registry,
          layout,
          access: host.access(),
          context: (surface) => host.toolContext(surface),
          enabled: (tool, context) => host.toolEnabled(tool, context),
          shortcut: (id) => host.shortcut(id),
          expanded: (tool) => host.expanded?.(tool) ?? false,
        });
      },
      visibility: () => this.#visibility(),
      selectionRects: rects,
      content: () => host.content(),
      activate: (activation) => this.#activate(activation),
      menuOpened: (trigger, modality) => host.menuOpened(trigger, modality),
      menuClosed: (changed) => host.menuClosed(changed),
      transientOpened: (owner, close) => host.transientOpened?.(owner, close),
      transientClosed: (owner) => host.transientClosed?.(owner),
      menuFinalFocus: host.menuFinalFocus,
      focusEditing: () => host.focusEditing(),
      cycleContextual: (event) => host.cycleContextual(event),
    });
    this.suggestions = new TextEditorSuggestions({
      requestUpdate: () => host.requestUpdate(),
      strings: () => host.strings(),
      registry: () => host.registry(),
      layout: () => host.layout(),
      state: () => host.state(),
      allowed: () => {
        const access = host.access();
        const state = host.state();
        return (
          ready() !== null &&
          state.editable &&
          !access.readOnly &&
          !access.disabled &&
          this.#editingFocused()
        );
      },
      context: (surface) => host.toolContext(surface),
      enabled: (tool, context) => host.toolEnabled(tool, context),
      shortcut: (id) => host.shortcut(id),
      rangeRects: (range) => ready()?.rangeRects(range) ?? [],
      caretRect: caret,
      content: () => host.content(),
      request: (proposal) => host.request(proposal),
      // A tool run without a value opens its surface through the request pipeline: the link and
      // image popovers here, the table size picker with the tables.
      openSurface: (toolId, surface) =>
        void host
          .request({ target: toolId, surface, reason: 'item-press', trigger: null })
          .catch(() => undefined),
      referenceList: (id) => {
        if (id === this.#reference) return;
        this.#reference = id;
        host.referencesChanged();
      },
      announce: (message) => host.announce(message),
      opening: opening('suggestions'),
    });
    this.link = new TextEditorLinkPopover({
      requestUpdate: () => host.requestUpdate(),
      strings: () => host.strings(),
      link: () => ready()?.getState().link ?? host.state().link,
      rangeRects: (range) => ready()?.rangeRects(range) ?? [],
      selectionRects: rects,
      caretRect: caret,
      content: () => host.content(),
      request: (proposal) => host.request(proposal),
      focusEditing: () => host.focusEditing(),
      opening: opening('link'),
    });
    this.image = new TextEditorImagePopover({
      requestUpdate: () => host.requestUpdate(),
      strings: () => host.strings(),
      imageUpload: () => host.imageUpload(),
      selection: () => ready()?.getState().selection ?? host.state().selection,
      blockIds: () =>
        ready()
          ?.getBlocks()
          .ordered()
          .map((block) => block.id) ?? [],
      selectionRects: rects,
      caretRect: caret,
      endRect: () => {
        const instance = ready();
        const last = instance?.getBlocks().roots.at(-1);
        return last ? (instance?.blockRects(last)?.box ?? null) : null;
      },
      content: () => host.content(),
      request: (proposal) => host.request(proposal),
      diagnose: (message) => host.diagnose('text-editor-upload-rejected', message),
      focusEditing: () => host.focusEditing(),
      opening: opening('image'),
    });
    const toolbar = this.selectionToolbar;
    this.#releaseContextual = host.registerContextual({
      order: 0,
      applicable: () => toolbar.shown,
      enter: () => toolbar.focus(),
      holdsFocus: () => toolbar.contains(deepActiveElement(host.renderRoot.ownerDocument)),
    });
  }

  /** The root attribute values of the suggestion list's references, null while none. */
  get references(): { readonly controls: string | null; readonly activeDescendant: string | null } {
    return { controls: this.#reference, activeDescendant: this.#reference };
  }

  /** Whether a suggestion list or a popover is open. */
  get surfaceOpen(): boolean {
    return this.suggestions.isOpen || this.link.isOpen || this.image.isOpen;
  }

  /**
   * Opens the surface of a link or image tool run without a value (`uwg-te-req-tools-4`): at the
   * tool's control in the fixed toolbar, at the More trigger for its item in the More menu, or at
   * the selection. Returns whether it opened one.
   */
  openSurface(tool: TextEditorTool, detail: TextEditorRequestDetail): boolean {
    return this.openTool(tool.id, detail.surface, detail.trigger, tool.kind);
  }

  /** Opens the link or image popover for a tool identifier; false for any other tool. */
  openTool(
    toolId: string,
    surface: TextEditorRequestSurface,
    trigger: Element | null,
    kind = this.#host.registry()?.tools.get(toolId)?.kind,
  ): boolean {
    if (kind === 'link') {
      this.link.open(surface);
      return true;
    }
    if (kind === 'image') {
      this.image.open(surface, this.#imageAnchor(surface, trigger));
      return true;
    }
    return false;
  }

  /** Every state publication: the suggestion occurrence and the selection toolbar follow it. */
  stateChanged(): void {
    this.suggestions.sync();
    const access = this.#host.access();
    if (access.readOnly || access.disabled) {
      this.link.close('programmatic');
      this.image.close('programmatic');
    }
  }

  /** A key forwarded while a suggestion list shows; whether the list consumed it. */
  suggestionKey(event: KeyboardEvent): boolean {
    return this.suggestions.forwardKey(event);
  }

  /** The text point under a client point while ready. */
  pointAt(x: number, y: number): TextEditorTextPoint | null {
    return this.#host.instance()?.pointAt(x, y) ?? null;
  }

  /** Uploads pasted or dropped image files through `imageUpload`; false without the hook. */
  uploadImages(
    files: readonly File[],
    at: TextEditorSelectionInput,
    reason: 'input-paste' | 'drag',
    sourceEvent: Event,
  ): boolean {
    const upload = this.#host.imageUpload();
    if (!upload) return false;
    this.#uploads ??= new AbortController();
    const instance = () => this.#host.instance();
    void insertImageFiles({
      upload,
      files,
      at,
      surface: reason === 'drag' ? 'drag' : 'paste',
      reason,
      sourceEvent,
      signal: this.#uploads.signal,
      blockIds: () =>
        instance()
          ?.getBlocks()
          .ordered()
          .map((block) => block.id) ?? [],
      request: (proposal) => this.#host.request(proposal),
      diagnose: (message) => this.#host.diagnose('text-editor-upload-rejected', message),
    });
    return true;
  }

  render(): TemplateResult {
    return html`${this.selectionToolbar.render()}${this.suggestions.render()}${this.link.render()}${this.image.render()}`;
  }

  updated(): void {
    this.selectionToolbar.updated();
    this.suggestions.updated(this.#host.renderRoot);
  }

  connected(): void {
    this.selectionToolbar.connected();
  }

  disconnected(): void {
    this.selectionToolbar.disconnected();
    this.suggestions.release();
    this.image.release();
    this.link.close('programmatic');
    this.#uploads?.abort();
    this.#uploads = null;
    this.#reference = null;
  }

  dispose(): void {
    this.#releaseContextual();
  }

  #activate(activation: TextEditorToolActivation): void {
    void this.#host
      .request({
        target: activation.tool,
        ...(activation.value === undefined ? {} : { value: activation.value }),
        surface: activation.surface,
        reason: activation.reason,
        sourceEvent: activation.sourceEvent,
        trigger: activation.trigger,
        focus: activation.focus,
      })
      .catch(() => undefined);
  }

  /**
   * Opening one transient surface closes the others (`uwg-te-req-surfaces-6`): through the
   * widget's register, which also closes the menus and the table size picker, else among these
   * three. A suggestion list that another surface closes stays dismissed until its trigger goes.
   */
  #closeOthers(except: 'suggestions' | 'link' | 'image'): void {
    const closers = {
      suggestions: () => {
        if (this.suggestions.isOpen) this.suggestions.close(true);
      },
      link: () => this.link.close('programmatic'),
      image: () => this.image.close('programmatic'),
    } as const;
    const owner = this[except];
    if (this.#host.transientOpened) {
      this.#host.transientOpened(owner, closers[except]);
      return;
    }
    for (const [name, close] of Object.entries(closers)) if (name !== except) close();
  }

  /** The image popover's anchor: the opening control in the fixed toolbar, or its More trigger. */
  #imageAnchor(surface: TextEditorRequestSurface, trigger: Element | null): Element | null {
    if (surface !== 'toolbar' || !trigger) return null;
    const toolbar = this.#host.toolbar();
    if (!toolbar || !composedContains(toolbar, trigger)) return null;
    if (trigger.closest('.toolbar-more'))
      return toolbar.querySelector('.toolbar-more-trigger') ?? null;
    return trigger;
  }

  /** Focus is in the editing root. */
  #editingFocused(): boolean {
    const content = this.#host.content();
    return content !== null && composedContains(content, deepActiveElement(content.ownerDocument));
  }

  /**
   * Whether a text selection holds more than whitespace: read from the document selection while
   * the editing root holds focus, and kept for the same selection while focus is in the toolbar
   * or one of its menus, where the document selection may not reflect it.
   */
  #hasText(selection: TextEditorEngineState['selection']): boolean {
    if (selection.kind !== 'text' || selection.empty) return false;
    const cached = this.#selectedText;
    if (cached?.selection === selection && !this.#editingFocused()) return cached.value;
    const text = composedSelectionText(this.#host.renderRoot);
    const value =
      text === null ? cached?.selection === selection && cached.value : text.trim() !== '';
    this.#selectedText = { selection, value };
    return value;
  }

  /** The selection toolbar's visibility inputs (`uwg-te-req-surfaces-1`). */
  #visibility() {
    const host = this.#host;
    const instance = host.instance();
    const state = instance?.getState() ?? host.state();
    const access = host.access();
    const active = deepActiveElement(host.renderRoot.ownerDocument);
    const toolbar = host.toolbar();
    // Focus anywhere in the widget but the fixed toolbar and the popovers: the editing root, the
    // selection toolbar and its menus, the gutter and the table controls.
    const focusInside =
      composedContains(host.renderRoot.host, active) &&
      !(toolbar && composedContains(toolbar, active)) &&
      !this.link.isOpen &&
      !this.image.isOpen;
    const selection = state.selection;
    return {
      ready: instance !== null,
      editable: state.editable && !access.readOnly && !access.disabled,
      selection,
      hasText: this.#hasText(selection),
      focusInside,
      composing: state.composing,
      dragging: host.dragging(),
      surfaceOpen: this.surfaceOpen,
    };
  }
}
