/**
 * The capture owner of the widget's keys, pastes and drops: one keymap on the shadow root, so that
 * its bindings run before the engine's handlers (`uwg-te-req-key-1`, `uwg-te-kb-req-capture`).
 */
import {
  KeyBindingOwner,
  type KeyBindingGuards,
  type KeyShortcut,
} from '../../foundation/key-bindings.js';
import { keyHintPlatform, type KeyHintPlatform } from '../../foundation/key-notation.js';
import { allowedUrl, imageProtocols, linkProtocols } from '../../foundation/markdown/url.js';
import type {
  TextEditorAction,
  TextEditorContentInsertAction,
} from '../../foundation/text-editor/actions.js';
import {
  parseHtmlDocument,
  type HtmlParserView,
} from '../../foundation/text-editor/content/dom.js';
import type { TextEditorStepDirection } from '../../foundation/text-editor/content/edges.js';
import { readClipboardHtml } from '../../foundation/text-editor/content/html.js';
import type { TextEditorPortableFragment } from '../../foundation/text-editor/content/portable.js';
import { readMarkdown } from '../../foundation/text-editor/content/markdown.js';
import { readText } from '../../foundation/text-editor/content/text.js';
import type { TextEditorUrlPolicy } from '../../foundation/text-editor/engine.js';
import { matchUrl } from '../../foundation/text-editor/input-rules.js';
import type {
  TextEditorAccess,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../foundation/text-editor/controller.js';
import type { TextEditorLayout } from '../../foundation/text-editor/layout.js';
import type {
  TextEditorSelection,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../foundation/text-editor/model.js';
import type { TextEditorNodeDefinition } from '../../foundation/text-editor/nodes.js';
import type { TextEditorToolRegistry } from '../../foundation/text-editor/tools.js';
import { activationMovesFocus, selectionInput } from './focus.js';

/** Where a key, paste or drag event happens: the editing root, the fixed toolbar, a popup of the widget, or elsewhere. */
export type TextEditorKeyZone = 'editing' | 'toolbar' | 'popup' | 'other';

/** The parts of the current render that zones are told apart by. */
export interface TextEditorRouterParts {
  /** The `text-editor-toolbar` part, or null while the layout places no tool. */
  readonly toolbar: Element | null;
  /**
   * The `text-editor-selection-toolbar` part: a top-layer surface whose controls take the tool chords
   * as the fixed toolbar's do (`uwg-te-tab-keymap`, scope "selection toolbar").
   */
  readonly selectionToolbar?: Element | null | undefined;
  /** The `text-editor-content` part, which holds the editing root. */
  readonly content: Element | null;
}

/**
 * The zone of an event from its composed path, walked from the target outwards: the content part gives
 * `editing`, the fixed or the selection toolbar part gives `toolbar`, any other element with a
 * `popover` attribute (a top-layer surface: a Menu or Popover popup) gives `popup`; the first one met
 * wins, so a toolbar menu's popup is `popup`; otherwise `other`.
 */
export function textEditorKeyZone(
  path: readonly EventTarget[],
  parts: TextEditorRouterParts,
): TextEditorKeyZone {
  for (const node of path) {
    if (node === parts.content) return 'editing';
    if (parts.selectionToolbar && node === parts.selectionToolbar) return 'toolbar';
    if ((node as Partial<Element>).hasAttribute?.('popover')) return 'popup';
    if (node === parts.toolbar) return 'toolbar';
  }
  return 'other';
}

/** Keymap rows 11–15: tools that act in the editing root only (`uwg-te-tab-keymap`). */
const EDITING_ROOT_TOOLS: ReadonlySet<string> = new Set([
  'move-block-up',
  'move-block-down',
  'duplicate-block',
  'nest-block',
  'unnest-block',
  'open-block-menu',
  'toggle-task',
]);

/** Keymap row 14: consumed only while the gutter can appear (`uwg-te-req-blocks-3`). */
const GUTTER_TOOLS: ReadonlySet<string> = new Set(['open-block-menu']);

/** Keymap row 1: the tools that repeat while their chord is held. */
const REPEATING_TOOLS: ReadonlySet<string> = new Set(['undo', 'redo']);

/** The editing-host profile of `uwg-te-kb-req-host`. */
const HOST_GUARDS: KeyBindingGuards = { editable: 'none', activation: false, composites: false };

const ignore = (): void => undefined;

/** What the router needs from the element, which implements it. */
export interface TextEditorRouterHost {
  parts(): TextEditorRouterParts;
  /** The selection now: the ready instance's live selection, else the published state's. */
  selection(): TextEditorSelection;
  /**
   * The writing direction of the widget, which maps a physical alignment of pasted HTML and the
   * physical arrows of a read-only extension.
   */
  direction(): 'ltr' | 'rtl';
  /** The request pipeline. */
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** Selects the content of the editing root while read-only (`uwg-te-tab-keymap-host-r13`). */
  selectRootContent(sourceEvent: KeyboardEvent): void;
  /**
   * Extends a caret, or no selection, of the read-only editing root by one character in document
   * order (`uwg-te-req-a11y-1`); answers whether it set a selection.
   */
  extendRootSelection?(sourceEvent: KeyboardEvent, direction: TextEditorStepDirection): boolean;
  /** Alt+F10 in the editing root: moves focus to the contextual controls (`uwg-te-tab-keymap-host-r2`). */
  contextualControls?(sourceEvent: KeyboardEvent): void;
  /**
   * Tab or Shift+Tab in the editing root (`uwg-te-req-tables-7`): moves between table cells and
   * answers whether it consumed the key; false outside a table cell or while not editable.
   */
  tableTab?(sourceEvent: KeyboardEvent, backward: boolean): boolean;
  /**
   * Blocks (M8): a keydown in the editing root before the keymap, for the Escape order and the
   * keys of block mode (`uwg-te-req-key-4`, `uwg-te-tab-keymap-host`); answers whether it consumed
   * the key, which is then prevented and stopped.
   */
  editingKey?(sourceEvent: KeyboardEvent): boolean;
  /**
   * Blocks (M8): a block tool's shortcut whose action the widget computes (moves, duplicate, the
   * block menu); answers whether it handled the activation, which then makes no tool request.
   */
  blockTool?(toolId: string, sourceEvent: KeyboardEvent): boolean;
  /**
   * Suggestions (M7): a keydown in the editing root while a suggestion list shows, before every
   * other key handling (`uwg-te-req-inline-2`); answers whether the list consumed it, which is
   * then prevented and stopped. Keys the list leaves reach the engine.
   */
  suggestionKey?(sourceEvent: KeyboardEvent): boolean;
  /** Drops (M7): the text point under a client point, or null (`uwg-te-req-content-6`). */
  pointAt?(x: number, y: number): TextEditorTextPoint | null;
  /**
   * Pastes and drops (M7): image files to upload through `imageUpload` and insert at `at`, each
   * once its upload completes; false while no upload hook is set (the files are then ignored).
   */
  uploadImages?(
    files: readonly File[],
    at: TextEditorSelectionInput,
    reason: 'input-paste' | 'drag',
    sourceEvent: Event,
  ): boolean;
  /** Pastes: whether a link to `href` applies to the selection now (a dry run). */
  canLink?(href: string): boolean;
}

/** The resolution that the bindings follow, handed over once per resolution. */
export interface TextEditorRouterConfig {
  /** The resolved registry; null before the first resolution. Compared by identity. */
  readonly registry: TextEditorToolRegistry | null;
  /** The resolved layout; its `gutter` key gates the block menu chord (`uwg-te-req-blocks-3`). */
  readonly layout: TextEditorLayout;
  /**
   * The assigned engine's reserved chords, compared by identity; without an engine the element passes one
   * frozen empty array, so that engine-less syncs re-register nothing.
   */
  readonly reservedKeys: readonly string[];
  readonly access: TextEditorAccess;
  /** The custom node definitions that pasted content is read with. */
  readonly nodes: readonly TextEditorNodeDefinition[];
}

export interface TextEditorRouterOptions {
  /** The platform of `Mod` and of the matching rules; `auto` (default) reads the widget's window. */
  readonly platform?: KeyHintPlatform | undefined;
}

/** The capture owner of the widget's keys, pastes and drops (`uwg-te-req-key-1`, `uwg-te-kb-req-capture`). */
export class TextEditorRouter {
  readonly #host: TextEditorRouterHost;
  readonly #platform: KeyHintPlatform;
  #root: ShadowRoot | null = null;
  #owner: KeyBindingOwner | null = null;
  #config: TextEditorRouterConfig | null = null;
  /** The registry and reserved keys that the owner's bindings were registered from. */
  #bound: Pick<TextEditorRouterConfig, 'registry' | 'reservedKeys'> | null = null;
  #releases: (() => void)[] = [];
  /** The zone of the keydown being dispatched; bindings read it. */
  #zone: TextEditorKeyZone = 'other';
  #composing = false;
  /** The last `dragstart` from the editing root, until its drag ends. */
  #drag: Event | null = null;

  constructor(host: TextEditorRouterHost, options?: TextEditorRouterOptions) {
    this.#host = host;
    this.#platform = options?.platform ?? 'auto';
  }

  /**
   * Creates the key-binding owner on the shadow root and adds the capture listeners for keys, pastes,
   * composition and drags. Idempotent for the same root; called on connection, so that the shortcuts exist
   * for the first render.
   */
  attach(renderRoot: ShadowRoot): void {
    if (this.#root === renderRoot && this.#owner && !this.#owner.disposed) return;
    this.detach();
    this.#root = renderRoot;
    const owner = new KeyBindingOwner(renderRoot, {
      listen: false,
      dispatch: false,
      platform: this.#platform,
      disabled: () => this.#config?.access.disabled ?? false,
    });
    this.#owner = owner;
    for (const [type, listener] of this.#listeners())
      renderRoot.addEventListener(type, listener, { capture: true });
    if (this.#config) this.#bind(this.#config);
  }

  /** Removes the listeners, forgets a drag record and disposes the owner; called on disconnection. */
  detach(): void {
    const root = this.#root;
    if (root)
      for (const [type, listener] of this.#listeners())
        root.removeEventListener(type, listener, { capture: true });
    this.#releases = [];
    this.#owner?.dispose();
    this.#owner = null;
    this.#root = null;
    this.#bound = null;
    this.#drag = null;
    this.#composing = false;
  }

  /**
   * Re-registers the tool and reserved bindings when `registry` or `reservedKeys` changed by identity, and
   * only then; keeps `access`, `layout` and `nodes` for match time. Callable before `attach`.
   */
  sync(config: TextEditorRouterConfig): void {
    this.#config = config;
    const bound = this.#bound;
    if (bound && bound.registry === config.registry && bound.reservedKeys === config.reservedKeys)
      return;
    if (this.#owner) this.#bind(config);
  }

  /** The shortcut of the binding registered with action `toolId`, or undefined. */
  shortcut(toolId: string): KeyShortcut | undefined {
    return this.#owner?.shortcut(toolId);
  }

  #bind(config: TextEditorRouterConfig): void {
    const owner = this.#owner;
    if (!owner) return;
    for (const release of this.#releases) release();
    this.#releases = [];
    this.#bound = { registry: config.registry, reservedKeys: config.reservedKeys };
    const register = (options: Parameters<KeyBindingOwner['register']>[0]) => {
      // A pattern that the owner cannot parse binds nothing.
      try {
        this.#releases.push(owner.register(options));
      } catch {
        // Ignored: the tool keeps no shortcut.
      }
    };
    const { registry } = config;
    if (registry)
      for (const id of registry.order) {
        const tool = registry.tools.get(id);
        if (!tool?.shortcut || !registry.isAvailable(id)) continue;
        register({
          keys: tool.shortcut,
          action: id,
          repeat: true,
          handler: (event) => this.#runTool(id, event),
        });
      }
    register({
      keys: 'Mod+A',
      repeat: true,
      guards: HOST_GUARDS,
      handler: (event) => {
        const access = this.#config?.access;
        if (this.#zone !== 'editing' || !access?.readOnly || access.disabled) return false;
        if (!event.repeat) this.#host.selectRootContent(event);
        return true;
      },
    });
    // A browser extends no collapsed selection in content that is not editable: the first
    // Shift+Arrow from a caret, or from no selection, of the read-only root selects one character,
    // and the browser extends the selection from then on (`uwg-te-req-a11y-1`).
    for (const [keys, right] of [
      ['Shift+ArrowRight', true],
      ['Shift+ArrowLeft', false],
    ] as const)
      register({
        keys,
        repeat: true,
        guards: HOST_GUARDS,
        handler: (event) => {
          const access = this.#config?.access;
          if (this.#zone !== 'editing' || !access?.readOnly || access.disabled) return false;
          const selection = this.#host.selection();
          if (selection.kind !== 'none' && !(selection.kind === 'text' && selection.empty))
            return false;
          const forward = right === (this.#host.direction() === 'ltr');
          return this.#host.extendRootSelection?.(event, forward ? 'forward' : 'backward') ?? false;
        },
      });
    register({
      keys: 'Alt+F10',
      repeat: true,
      guards: HOST_GUARDS,
      handler: (event) => {
        if (this.#zone !== 'editing') return false;
        if (!event.repeat) this.#host.contextualControls?.(event);
        return true;
      },
    });
    // Tables (M9): Tab and Shift+Tab between cells, editing-host bindings.
    for (const [keys, backward] of [
      ['Tab', false],
      ['Shift+Tab', true],
    ] as const)
      register({
        keys,
        repeat: true,
        guards: HOST_GUARDS,
        handler: (event) => {
          const access = this.#config?.access;
          if (this.#zone !== 'editing' || !access || access.readOnly || access.disabled)
            return false;
          return this.#host.tableTab?.(event, backward) ?? false;
        },
      });
    for (const keys of config.reservedKeys)
      register({
        keys,
        repeat: true,
        guards: { editable: 'none' },
        handler: () => this.#zone === 'editing',
      });
  }

  #runTool(id: string, event: KeyboardEvent): boolean {
    const zone = this.#zone;
    if (zone !== 'editing' && (zone !== 'toolbar' || EDITING_ROOT_TOOLS.has(id))) return false;
    if (GUTTER_TOOLS.has(id)) {
      const config = this.#config;
      if (!config || config.access.readOnly || config.access.disabled || !config.layout.gutter)
        return false;
    }
    if (event.repeat && !REPEATING_TOOLS.has(id)) return true;
    if (zone === 'editing' && this.#host.blockTool?.(id, event)) return true;
    this.#host
      .request({
        target: id,
        surface: 'keyboard',
        reason: 'hotkey',
        sourceEvent: event,
        trigger: null,
        focus: activationMovesFocus({ reason: 'hotkey', zone }),
      })
      .catch(ignore);
    return true;
  }

  #zoneOf(event: Event): TextEditorKeyZone {
    return textEditorKeyZone(event.composedPath(), this.#host.parts());
  }

  /** A drag that started in the document and that nothing cancelled. */
  #dragInside(): boolean {
    return this.#drag !== null && !this.#drag.defaultPrevented;
  }

  #refuse(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  readonly #onKeyDown = (event: Event): void => {
    const key = event as KeyboardEvent;
    if (key.isComposing || key.keyCode === 229 || this.#composing) return;
    const owner = this.#owner;
    if (!owner) return;
    const zone = this.#zoneOf(event);
    if (zone !== 'editing' && zone !== 'toolbar') return;
    this.#zone = zone;
    try {
      if (zone === 'editing' && (this.#host.suggestionKey?.(key) || this.#host.editingKey?.(key))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (owner.handleKeyDown(key)) event.stopPropagation();
    } finally {
      this.#zone = 'other';
    }
  };

  readonly #onCompositionStart = (): void => {
    this.#composing = true;
  };

  readonly #onCompositionEnd = (): void => {
    this.#composing = false;
  };

  /** Whether the editor accepts document changes: neither read-only nor disabled. */
  #editable(): boolean {
    const access = this.#config?.access;
    return !!access && !access.readOnly && !access.disabled;
  }

  readonly #onPaste = (event: Event): void => {
    if (this.#zoneOf(event) !== 'editing') return;
    this.#refuse(event);
    const data = (event as ClipboardEvent).clipboardData ?? null;
    const files = imageFiles(data);
    const at = selectionInput(this.#host.selection());
    // Read-only and disabled editors upload nothing; the content request is rejected as usual.
    if (files.length && at && this.#editable())
      this.#host.uploadImages?.(files, at, 'input-paste', event);
    const host = this.#host;
    const proposal = pasteProposal({
      data,
      selection: host.selection(),
      nodes: this.#config?.nodes ?? [],
      direction: host.direction(),
      parserWindow: this.#root?.ownerDocument?.defaultView ?? null,
      sourceEvent: event,
      ...(host.canLink ? { canLink: (href: string) => host.canLink?.(href) ?? true } : {}),
    });
    if (proposal) this.#host.request(proposal).catch(ignore);
    // A paste of image files alone is rejected too while the editor takes no changes.
    else if (files.length && at && !this.#editable())
      this.#host.request(imagePasteRefusal(at, event)).catch(ignore);
  };

  readonly #onDragStart = (event: Event): void => {
    if (this.#zoneOf(event) === 'editing') this.#drag = event;
  };

  readonly #onDragEnd = (): void => {
    this.#drag = null;
  };

  readonly #onDragOver = (event: Event): void => {
    if (this.#zoneOf(event) !== 'editing' || this.#dragInside()) return;
    const transfer = (event as DragEvent).dataTransfer;
    // A drop from outside the document is accepted only while the editor accepts changes.
    if (transfer) transfer.dropEffect = this.#editable() ? 'copy' : 'none';
    this.#refuse(event);
  };

  readonly #onDrop = (event: Event): void => {
    if (this.#zoneOf(event) !== 'editing') return;
    const inside = this.#dragInside();
    this.#drag = null;
    if (inside) return;
    this.#refuse(event);
    if (!this.#editable()) return;
    const drop = event as DragEvent;
    const point = this.#host.pointAt?.(drop.clientX, drop.clientY) ?? null;
    if (!point) return;
    const at: TextEditorSelectionInput = { kind: 'text', anchor: point };
    const data = drop.dataTransfer ?? null;
    const files = imageFiles(data);
    if (files.length) this.#host.uploadImages?.(files, at, 'drag', event);
    const proposal = dropProposal({
      data,
      at,
      nodes: this.#config?.nodes ?? [],
      direction: this.#host.direction(),
      parserWindow: this.#root?.ownerDocument?.defaultView ?? null,
      sourceEvent: event,
    });
    if (proposal) this.#host.request(proposal).catch(ignore);
  };

  /**
   * Mod+click on a link while the editor is editable opens it in a new browsing context without an
   * opener; a plain click stays the engine's, which never navigates, and a link of a read-only
   * editor navigates natively (C-249, `uwg-te-req-surfaces-3`).
   */
  readonly #onClick = (event: Event): void => {
    const click = event as MouseEvent;
    if (click.button !== 0 || click.altKey || click.shiftKey || !this.#editable()) return;
    const view = this.#root?.ownerDocument?.defaultView;
    const mac = keyHintPlatform(this.#platform, view?.navigator) === 'mac';
    if (!(mac ? click.metaKey && !click.ctrlKey : click.ctrlKey && !click.metaKey)) return;
    if (this.#zoneOf(event) !== 'editing') return;
    const href = linkHref(event.composedPath(), this.#host.parts().content);
    if (!href || !allowedUrl(href, DEFAULT_URLS.links)) return;
    event.preventDefault();
    event.stopPropagation();
    view?.open(href, '_blank', 'noopener');
  };

  #listeners(): readonly (readonly [string, (event: Event) => void])[] {
    return [
      ['click', this.#onClick],
      ['keydown', this.#onKeyDown],
      ['compositionstart', this.#onCompositionStart],
      ['compositionend', this.#onCompositionEnd],
      ['paste', this.#onPaste],
      ['dragstart', this.#onDragStart],
      ['dragend', this.#onDragEnd],
      ['dragover', this.#onDragOver],
      ['drop', this.#onDrop],
    ];
  }
}

/** The `href` of the nearest link on a composed path inside the content part, or `null`. */
function linkHref(path: readonly EventTarget[], content: Element | null): string | null {
  for (const target of path) {
    if (target === content) return null;
    const element = target as Partial<Element>;
    if (element.localName === 'a') return element.getAttribute?.('href') || null;
  }
  return null;
}

/** The shared URL policy of the editor's content. */
const DEFAULT_URLS: TextEditorUrlPolicy = Object.freeze({
  links: linkProtocols(null),
  images: imageProtocols(null),
});

/** What a paste into the editing root carries. */
export interface TextEditorPasteInput {
  /** The pasted data, or null when the event carries none. */
  readonly data: Pick<DataTransfer, 'getData'> | null;
  readonly selection: TextEditorSelection;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly direction: 'ltr' | 'rtl';
  /** The window whose `DOMParser` reads pasted HTML; null where none exists. */
  readonly parserWindow: HtmlParserView | null;
  readonly sourceEvent: Event;
  /** The URL policy; default the shared Markdown protocols. */
  readonly urls?: TextEditorUrlPolicy | undefined;
  /**
   * Whether a link to `href` applies to the selection; a selection that a link cannot cover (one
   * that holds no text, such as a block boundary) takes the URL as text. Default: it applies.
   */
  readonly canLink?: ((href: string) => boolean) | undefined;
}

/**
 * The fragment of transferred data: its HTML through the clipboard reader, else its Markdown
 * through the Markdown reader, else its text.
 */
export function transferContent(
  data: Pick<DataTransfer, 'getData'>,
  options: Pick<TextEditorPasteInput, 'nodes' | 'direction' | 'parserWindow'>,
): TextEditorPortableFragment | null {
  const html = data.getData('text/html');
  const root = html ? parseHtmlDocument(html, options.parserWindow) : null;
  if (root) {
    const { fragment } = readClipboardHtml(root, {
      nodes: options.nodes,
      direction: options.direction,
    });
    if (fragment.blocks.length) return fragment;
  }
  // Markdown that a source labels as such reads through the shared Markdown reader.
  const markdown = data.getData('text/markdown');
  if (markdown) {
    const { document } = readMarkdown(markdown, { nodes: options.nodes });
    if (document.blocks.length) return { kind: 'range', blocks: document.blocks };
  }
  const text = data.getData('text/plain');
  return text ? { kind: 'range', blocks: readText(text).blocks } : null;
}

/** The image files of transferred data, in order. */
export function imageFiles(data: Pick<DataTransfer, 'files'> | null | undefined): File[] {
  const files = data?.files;
  if (!files) return [];
  return [...files].filter((file) => file.type.startsWith('image/'));
}

/**
 * The one request of a paste (`uwg-te-req-content-6`): a single URL that passes the link policy,
 * pasted over a non-empty text selection that a link can cover, links that selection (`link.set`);
 * otherwise the HTML
 * read by the shared clipboard reader, else (no HTML, or HTML that no parser reads) Markdown
 * labelled `text/markdown` read by the shared Markdown reader, else the text read as a text range, inserted by one `content.insert` at the selection. Surface `paste`, reason
 * `input-paste`; null when it holds neither (files only, or nothing) or nothing is selected.
 */
export function pasteProposal(input: TextEditorPasteInput): TextEditorRequestProposal | null {
  const at = selectionInput(input.selection);
  const data = input.data;
  if (!at || !data) return null;
  const request = (actions: readonly TextEditorAction[]): TextEditorRequestProposal => ({
    target: actions,
    surface: 'paste',
    reason: 'input-paste',
    sourceEvent: input.sourceEvent,
    trigger: null,
  });
  const { selection } = input;
  if (selection.kind === 'text' && !selection.empty) {
    const url = matchUrl(data.getData('text/plain'), input.urls ?? DEFAULT_URLS);
    if (url && (input.canLink?.(url) ?? true)) return request([{ type: 'link.set', href: url }]);
  }
  const content = transferContent(data, input);
  if (!content) return null;
  const action: TextEditorContentInsertAction = { type: 'content.insert', content, at };
  return request([action]);
}

/**
 * The request of a paste of image files alone while the editor is read-only or disabled
 * (`uwg-te-req-content-6`): the paste is rejected as every other document change is, so it is
 * proposed as one `content.insert` at the selection, surface `paste` and reason `input-paste`,
 * that holds no block, since the images would exist only after uploads that never start; the
 * pipeline rejects it with a NotSupportedError and reports `tp-text-editor-request-failed`.
 */
export function imagePasteRefusal(
  at: TextEditorSelectionInput,
  sourceEvent: Event,
): TextEditorRequestProposal {
  const action: TextEditorContentInsertAction = {
    type: 'content.insert',
    content: { kind: 'blocks', blocks: [] },
    at,
  };
  return {
    target: [action],
    surface: 'paste',
    reason: 'input-paste',
    sourceEvent,
    trigger: null,
  };
}

/** What a drop from outside the document carries. */
export interface TextEditorDropInput {
  readonly data: Pick<DataTransfer, 'getData'> | null;
  /** The text point under the pointer, as a selection input. */
  readonly at: TextEditorSelectionInput;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly direction: 'ltr' | 'rtl';
  readonly parserWindow: HtmlParserView | null;
  readonly sourceEvent: Event;
}

/**
 * The one request of a drop from outside the document (`uwg-te-req-content-6`): its HTML, else its
 * text, inserted by one `content.insert` at the text point under the pointer, surface and reason
 * `drag`; null when it holds neither.
 */
export function dropProposal(input: TextEditorDropInput): TextEditorRequestProposal | null {
  if (!input.data) return null;
  const content = transferContent(input.data, input);
  if (!content) return null;
  const action: TextEditorContentInsertAction = { type: 'content.insert', content, at: input.at };
  return {
    target: [action],
    surface: 'drag',
    reason: 'drag',
    sourceEvent: input.sourceEvent,
    trigger: null,
  };
}
