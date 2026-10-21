import {
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { TpBadge } from '../../components/badge/badge.js';
import { TpButtonGroup } from '../../components/button-group/button-group.js';
import { TpButton } from '../../components/button/button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpKeyHintGroup } from '../../components/key-hint/key-hint-group.js';
import { TpKeyHint } from '../../components/key-hint/key-hint.js';
import { TpMenuCheckboxItem } from '../../components/menu/menu-checkbox-item.js';
import { TpMenuItem } from '../../components/menu/menu-item.js';
import { TpMenuRadioGroup } from '../../components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from '../../components/menu/menu-radio-item.js';
import { TpMenu } from '../../components/menu/menu.js';
import { TpOverflowList } from '../../components/overflow-list/overflow-list.js';
import { TpSeparator } from '../../components/separator/separator.js';
import { TpSpinner } from '../../components/spinner/spinner.js';
import { TpToggleGroup } from '../../components/toggle-group/toggle-group.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import { TpTooltip } from '../../components/tooltip/tooltip.js';
import { TpInput } from '../../components/input/input.js';
import { TpField } from '../../components/field/field.js';
import { TpPopover } from '../../components/popover/popover.js';
import { TpCommandList } from '../../components/command-palette/list.js';
import { TpFileUpload } from '../../components/file-upload/file-upload.js';
import { TpInputGroup } from '../../components/input-group/input-group.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { composedContains, deepActiveElement } from '../../foundation/focus.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import { TpFormElement, type FieldAssociationAttributes } from '../../foundation/form-element.js';
import { windowFrames } from '../../foundation/frame-loop.js';
import { adoptStyleText } from '../../foundation/generated-style.js';
import { presenceRole } from '../../foundation/motion.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { isTextEditorFormat, type TextEditorAction } from '../../foundation/text-editor/actions.js';
import { textEditorTools } from '../../foundation/text-editor/builtin-tools.js';
import type { TextEditorPortableDocument } from '../../foundation/text-editor/content/portable.js';
import { renderPortablePreview } from '../../foundation/text-editor/content/view.js';
import {
  TextEditorController,
  type TextEditorAccess,
  type TextEditorControllerHost,
  type TextEditorRequestOutcome,
  type TextEditorValueChange,
  type TextEditorValueCommit,
} from '../../foundation/text-editor/controller.js';
import type {
  TextEditorDiagnostic,
  TextEditorEngine,
  TextEditorEngineInstance,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorRootAttributes,
  TextEditorSnapshot,
} from '../../foundation/text-editor/engine.js';
import {
  defaultTextEditorLayout,
  resolveTextEditorLayout,
  type TextEditorLayout,
} from '../../foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../foundation/text-editor/model.js';
import type { TextEditorNodeDefinition } from '../../foundation/text-editor/nodes.js';
import {
  resolveTextEditorStrings,
  type TextEditorStrings,
} from '../../foundation/text-editor/strings.js';
import {
  resolveTextEditorCapabilities,
  resolveTextEditorTools,
  type TextEditorTool,
  type TextEditorToolRegistry,
} from '../../foundation/text-editor/tools.js';
import { textEditorPresentation } from '../../presentation/families/text-editor.js';
import { TextEditorAnnouncer } from './announcer.js';
import { TextEditorCustomization } from './customization.js';
import { TextEditorFocus } from './focus.js';
import { OverlayGeometry } from './geometry.js';
import { TextEditorRouter, type TextEditorRouterConfig } from './router.js';
import { TEXT_EDITOR_PREVIEW_ATTRIBUTE, textEditorStyles } from './styles.js';
import type { TextEditorToolActivation } from './tools/controls.js';
import { resolveToolbarView } from './tools/resolve.js';
import type {
  TextEditorChangeMetadata,
  TextEditorErrorDetail,
  TextEditorFocusOptions,
  TextEditorImageUpload,
  TextEditorReadyDetail,
} from './types.js';
import {
  placeholderModel,
  renderPlaceholder,
  TextEditorPlaceholderLayer,
} from './views/placeholder.js';
import { TextEditorBlocks, type TextEditorBlocksHost } from './views/blocks.js';
import { TextEditorToolbar, type TextEditorToolbarHandlers } from './views/toolbar.js';
import { TextEditorTables, type TextEditorTablesHost } from './views/tables.js';
import { TextEditorPopups, type TextEditorPopupsHost } from './views/popups.js';

/** The motion roles of the widget's surfaces. */
export const textEditorMotionRoles = { surface: presenceRole('surface') } as const;

/** The constituent events that stop at the widget's shadow root (`uwg-te-req-evt-6`). */
const NESTED_EVENT_TYPES = Object.freeze([
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-input-value-change',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-presence-complete',
  'tp-action',
  'tp-execute',
  'tp-query-change',
  'tp-overflow-change',
  'tp-upload-start',
  'tp-upload-complete',
  'tp-upload-error',
  'tp-file-reject',
  'tp-file-retry',
  'tp-picker-cancel',
  'tp-field-validity',
  'tp-search-status',
  'tp-search-error',
  'tp-select-source-change',
]);

/** One frozen empty list: the default tools and nodes, and the reserved keys without an engine. */
const EMPTY: readonly never[] = Object.freeze([]);

// Root attribute record (uwg-te-req-a11y-1, uwg-te-req-engine-9) ---------------------------

export interface TextEditorRootAttributeInput {
  /** The label of the Field that labels the widget, as last passed to setFieldAssociation; '' without one. */
  readonly fieldLabel: string;
  readonly label: string;
  /** The host's own `aria-label` attribute; null without one. */
  readonly hostLabel: string | null;
  /** The Field description and error node ids; null without them. */
  readonly describedBy: string | null;
  readonly strings: TextEditorStrings;
  readonly placeholder: string;
  readonly readOnly: boolean;
  /** The effective disabled state. */
  readonly disabled: boolean;
  /**
   * The suggestion list that the editing root references while it shows, through
   * `aria-controls` and `aria-activedescendant` (`uwg-te-req-a11y-3`); null or absent without one.
   */
  readonly suggestionList?: string | null | undefined;
}

/**
 * The attributes of the editing root, always the same eleven keys, null to remove. The name is the
 * first non-empty of the Field label, `label` and the host's `aria-label`, else `strings.label`.
 */
export function textEditorRootAttributes(
  input: TextEditorRootAttributeInput,
): TextEditorRootAttributes {
  const name =
    [input.fieldLabel, input.label, input.hostLabel ?? ''].find((text) => text !== '') ??
    input.strings.label;
  return Object.freeze({
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': name,
    'aria-describedby': input.describedBy,
    'aria-placeholder': input.placeholder === '' ? null : input.placeholder,
    'aria-readonly': input.readOnly ? 'true' : null,
    'aria-disabled': input.disabled ? 'true' : null,
    tabindex: input.disabled ? null : '0',
    spellcheck: 'true',
    'aria-controls': input.suggestionList ?? null,
    'aria-activedescendant': input.suggestionList ?? null,
  });
}

// Disabled (uwg-te-req-prop-3) --------------------------------------------------------------

/**
 * Whether a click or auxclick must be cancelled: the widget is effectively disabled, and an entry
 * of `path` before `boundary` matches `a[href]`. Entries without `matches` are skipped; a link
 * outside the boundary does not count.
 */
export function cancelsDisabledActivation(
  disabled: boolean,
  path: readonly EventTarget[],
  boundary: EventTarget,
): boolean {
  if (!disabled) return false;
  for (const target of path) {
    if (target === boundary) return false;
    const element = target as Partial<Pick<Element, 'matches'>>;
    if (typeof element.matches === 'function' && element.matches('a[href]')) return true;
  }
  return false;
}

/** The viewport's tabindex: '-1' while effectively disabled, else null (no attribute). */
export function textEditorViewportTabIndex(disabled: boolean): '-1' | null {
  return disabled ? '-1' : null;
}

// Placement (uwg-te-req-engine-8, uwg-te-req-evt-5) -----------------------------------------

/**
 * The innermost closed shadow root that `node` sits under, walking its root node and each root's
 * host outward; `null` when every enclosing shadow root is open.
 */
export function closedAncestorRoot(node: Node): ShadowRoot | null {
  const seen = new Set<Node>();
  for (let root = node.getRootNode(); !seen.has(root) && 'host' in root;) {
    seen.add(root);
    const shadow = root as ShadowRoot;
    if (shadow.mode === 'closed') return shadow;
    root = shadow.host.getRootNode();
  }
  return null;
}

/** How a diagnostic names an element: its local name, then its identifier when it has one. */
export function describeElement(element: Element): string {
  return element.id ? `${element.localName}#${element.id}` : element.localName;
}

// Properties (uwg-te-req-prop-1, uwg-te-tab-props) ------------------------------------------

/** The format in effect: the value when it is one of the four, else 'html'. */
export function effectiveTextEditorFormat(format: unknown): TextEditorFormat {
  return isTextEditorFormat(format) ? format : 'html';
}

const LAYOUT_KEYS = Object.keys(defaultTextEditorLayout) as (keyof TextEditorLayout)[];

/**
 * The assigned members that have their key's shape over the default layouts, frozen; the defaults
 * object itself when nothing usable is assigned.
 */
export function effectiveTextEditorLayout(
  assigned: Partial<TextEditorLayout> | null | undefined,
): TextEditorLayout {
  if (!assigned || typeof assigned !== 'object') return defaultTextEditorLayout;
  let effective: Record<string, unknown> | null = null;
  for (const key of LAYOUT_KEYS) {
    const value: unknown = assigned[key];
    const shaped = key === 'gutter' ? typeof value === 'boolean' : Array.isArray(value);
    if (!shaped) continue;
    effective ??= { ...defaultTextEditorLayout };
    effective[key] = value;
  }
  return effective
    ? (Object.freeze(effective) as unknown as TextEditorLayout)
    : defaultTextEditorLayout;
}

// Field and forms (uwg-te-req-value-1, uwg-te-req-value-4, ucl17-field-q1) ------------------

/** '' while the document is empty, otherwise the handle (null before ready); never a serialization. */
export function textEditorFieldValue(
  empty: boolean,
  value: TextEditorSnapshot | null,
): '' | TextEditorSnapshot | null {
  return empty ? '' : value;
}

/**
 * The form entry: null while disabled (`read` is not called), null when `read` returns null or
 * undefined, JSON text for an object, the string otherwise.
 */
export function textEditorFormValue(
  format: TextEditorFormat,
  disabled: boolean,
  read: (format: TextEditorFormat) => unknown,
): string | null {
  if (disabled) return null;
  const content = read(format);
  if (content === null || content === undefined) return null;
  return typeof content === 'string' ? content : JSON.stringify(content);
}

type FormEntry = readonly [string, FormDataEntryValue];

/**
 * The entries of a form data set built outside a submission with the widget's stale entry
 * replaced in place, appended when absent, or removed for a null fresh entry; null when nothing
 * changes. Other entries keep their order and values.
 */
export function patchFormEntries(
  entries: readonly FormEntry[],
  name: string,
  stale: string | null,
  fresh: string | null,
): FormEntry[] | null {
  if (stale === fresh) return null;
  const index =
    stale === null ? -1 : entries.findIndex(([key, value]) => key === name && value === stale);
  if (index < 0) return fresh === null ? null : [...entries, [name, fresh]];
  const next = [...entries];
  if (fresh === null) next.splice(index, 1);
  else next[index] = [name, fresh];
  return next;
}

// Resolution (uwg-te-req-engine-8, uwg-te-tab-props) ----------------------------------------

export interface TextEditorResolutionInput {
  readonly engine: TextEditorEngine | null;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly tools: readonly TextEditorTool[];
  /** The assigned partial, not the effective layout. */
  readonly layout: Partial<TextEditorLayout> | null;
  readonly strings: Partial<TextEditorStrings> | null;
  readonly readOnly: boolean;
  /** The effective disabled state. */
  readonly disabled: boolean;
  readonly defaultValue: string | object | null;
  /** The format in effect. */
  readonly format: TextEditorFormat;
}

export type TextEditorResolutionStep =
  | 'registry'
  | 'strings'
  | 'tools'
  | 'access'
  | 'default'
  | 'remount'
  | 'release'
  | 'nodes'
  | 'labels'
  | 'engine'
  | 'router';

const taskCheckbox = (input: TextEditorResolutionInput) =>
  resolveTextEditorStrings(input.strings).taskCheckbox;

/**
 * The steps of one resolution, in order, each only when its own input changed; `previous` is null
 * for the first resolution, and `mounted` is true while a mount is current or loading.
 */
export function textEditorResolutionSteps(
  previous: TextEditorResolutionInput | null,
  next: TextEditorResolutionInput,
  mounted: boolean,
): readonly TextEditorResolutionStep[] {
  const steps: TextEditorResolutionStep[] = [];
  const first = previous === null;
  const registry =
    first ||
    previous.engine !== next.engine ||
    previous.nodes !== next.nodes ||
    previous.tools !== next.tools ||
    previous.layout !== next.layout;
  const strings = first || previous.strings !== next.strings;
  const access =
    first || previous.readOnly !== next.readOnly || previous.disabled !== next.disabled;
  const defaults =
    first ||
    previous.defaultValue !== next.defaultValue ||
    (next.defaultValue !== null && previous.format !== next.format);
  const nodes = first ? next.nodes.length > 0 : previous.nodes !== next.nodes;
  const labels = first ? strings : taskCheckbox(previous) !== taskCheckbox(next);
  const engine = first ? next.engine !== null : previous.engine !== next.engine;
  const reservedKeys = (input: TextEditorResolutionInput) => input.engine?.reservedKeys ?? EMPTY;
  const router =
    first ||
    registry ||
    access ||
    previous.nodes !== next.nodes ||
    reservedKeys(previous) !== reservedKeys(next);
  if (registry) steps.push('registry');
  if (strings) steps.push('strings');
  if (registry || strings) steps.push('tools');
  if (access) steps.push('access');
  if (defaults) steps.push('default');
  if (mounted && (engine || nodes || labels)) steps.push('remount');
  if (mounted && engine && (nodes || labels)) steps.push('release');
  if (nodes) steps.push('nodes');
  if (labels) steps.push('labels');
  if (engine) steps.push('engine');
  if (router) steps.push('router');
  return steps;
}

/** The resolved tooling of an input, with the registry's and the layout's diagnostics in order. */
export interface TextEditorTooling {
  readonly registry: TextEditorToolRegistry;
  readonly layout: TextEditorLayout;
  readonly strings: TextEditorStrings;
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

export function resolveTextEditorTooling(input: TextEditorResolutionInput): TextEditorTooling {
  const registry = resolveTextEditorTools({
    builtins: textEditorTools,
    tools: input.tools,
    nodes: input.nodes,
    capabilities: resolveTextEditorCapabilities(input.engine, input.nodes),
  });
  const { layout, diagnostics } = resolveTextEditorLayout(input.layout, registry);
  return {
    registry,
    layout,
    strings: resolveTextEditorStrings(input.strings),
    diagnostics: [...registry.diagnostics, ...diagnostics],
  };
}

/** The controller members a resolution calls. */
export type TextEditorResolutionTarget = Pick<
  TextEditorController,
  'setTools' | 'setAccess' | 'setDefaultContent' | 'setNodes' | 'setViewLabels' | 'setEngine'
>;

/** Runs the controller steps of `steps` in order; `remount`, `registry`, `strings` and `router` are the element's. */
export function applyTextEditorResolution(
  target: TextEditorResolutionTarget,
  steps: readonly TextEditorResolutionStep[],
  input: TextEditorResolutionInput,
  tooling: TextEditorTooling,
): void {
  for (const step of steps)
    switch (step) {
      case 'tools':
        target.setTools({
          registry: tooling.registry,
          layout: tooling.layout,
          strings: tooling.strings,
        });
        break;
      case 'access':
        target.setAccess({ readOnly: input.readOnly, disabled: input.disabled });
        break;
      case 'default':
        target.setDefaultContent(
          input.defaultValue === null
            ? null
            : { content: input.defaultValue, format: input.format },
        );
        break;
      case 'release':
        target.setEngine(null);
        break;
      case 'nodes':
        target.setNodes(input.nodes);
        break;
      case 'labels':
        target.setViewLabels({ taskCheckbox: tooling.strings.taskCheckbox });
        break;
      case 'engine':
        target.setEngine(input.engine);
        break;
      default:
        break;
    }
}

/**
 * The router configuration of a resolution. Without an engine the reserved keys are the module's
 * one frozen empty list, so engine-less configurations keep one identity.
 */
export function textEditorRouterConfig(
  input: TextEditorResolutionInput,
  tooling: TextEditorTooling,
): TextEditorRouterConfig {
  return {
    registry: tooling.registry,
    layout: tooling.layout,
    reservedKeys: input.engine?.reservedKeys ?? EMPTY,
    access: { readOnly: input.readOnly, disabled: input.disabled },
    nodes: input.nodes,
  };
}

/**
 * A rich text editor: a fixed toolbar over an editing surface that an assigned engine renders,
 * with portable HTML, Markdown and text content, forms and Field support.
 *
 * @fires tp-text-editor-request - Cancelable; every proposed change, before it applies.
 * @fires tp-text-editor-request-failed - A request was rejected.
 * @fires tp-value-change - The document changed.
 * @fires tp-value-commit - A change was committed.
 * @fires tp-text-editor-ready - The editor is ready; the detail carries the engine's editor object.
 * @fires tp-text-editor-error - The engine failed to mount; `detail.error` is the reason.
 * @fires tp-diagnostic - A development diagnostic with a `text-editor-*` code.
 *
 * @csspart text-editor - The root container.
 * @csspart text-editor-toolbar - The fixed toolbar.
 * @csspart text-editor-viewport - The scroll container of the editing surface.
 * @csspart text-editor-content - The container of the editing root.
 * @csspart text-editor-overlay - The layer of overlay marks over the content.
 * @csspart text-editor-placeholder - The placeholder text.
 * @csspart text-editor-gutter - The block gutter.
 * @csspart text-editor-insert - The gutter's insert button.
 * @csspart text-editor-grip - The gutter's block grip.
 * @csspart text-editor-drop-indicator - The block drop indicator.
 * @csspart text-editor-block-selection - The selected-block highlight.
 * @csspart text-editor-selection-toolbar - The floating selection toolbar.
 * @csspart text-editor-suggestions - The suggestion popup.
 * @csspart text-editor-link-popover - The link popover.
 * @csspart text-editor-image-popover - The image popover.
 * @csspart text-editor-table-picker - The table size picker.
 * @csspart text-editor-swatch - A color swatch.
 * @csspart text-editor-status - The loading and error status.
 * @csspart text-editor-row-grip - A table row grip.
 * @csspart text-editor-column-grip - A table column grip.
 * @csspart text-editor-cell-handle - The table cell handle.
 * @csspart text-editor-add-row - The add-row button of a table.
 * @csspart text-editor-add-column - The add-column button of a table.
 * @csspart text-editor-resize-handle - A table column resize handle.
 * @csspart text-editor-table-selection - The table cell selection.
 * @csspart text-editor-sticky-header - The sticky table header.
 */
export class TpTextEditor extends TpFormElement<TextEditorSnapshot | null> {
  static tagName = 'tp-text-editor';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpSpinner,
      TpBadge,
      TpOverflowList,
      TpButtonGroup,
      TpSeparator,
      TpButton,
      TpToggle,
      TpToggleGroup,
      TpMenu,
      TpMenuItem,
      TpMenuCheckboxItem,
      TpMenuRadioGroup,
      TpMenuRadioItem,
      TpTooltip,
      TpKeyHint,
      TpKeyHintGroup,
      TpIcon,
      TpPopover,
      TpField,
      TpInput,
      TpInputGroup,
      TpFileUpload,
      TpCommandList,
    ];
  }
  static override presentation = textEditorPresentation;
  static override properties: PropertyDeclarations = {
    ...TpFormElement.properties,
    value: { attribute: false, noAccessor: true },
    engine: { attribute: false },
    defaultValue: { attribute: 'default-value' },
    format: { type: String },
    placeholder: { type: String },
    label: { type: String },
    stickyTableHeaders: { type: Boolean, attribute: 'sticky-table-headers' },
    tools: { attribute: false },
    layout: { attribute: false, noAccessor: true },
    nodes: { attribute: false },
    strings: { attribute: false },
    imageUpload: { attribute: false },
  };
  static override styles = [TpElement.styles, textEditorStyles, ...TextEditorTables.styles];

  /** The engine that renders the editing surface; replacing it remounts with the content kept. */
  engine: TextEditorEngine | null = null;
  /** The initial content in `format`; form reset restores it. */
  defaultValue: string | object | null = null;
  format: TextEditorFormat = 'html';
  placeholder = '';
  /** The editing root's name when no Field labels it. */
  label = '';
  stickyTableHeaders = false;
  /** Tools added to the built-in ones; an equal identifier replaces one. */
  tools: readonly TextEditorTool[] = EMPTY;
  /** Custom node definitions; a change remounts with the content kept. */
  nodes: readonly TextEditorNodeDefinition[] = EMPTY;
  /** Overrides of the built-in strings. */
  strings: Partial<TextEditorStrings> | null = null;
  /** Uploads an image file and resolves to its source. */
  imageUpload: TextEditorImageUpload | null = null;

  #assignedLayout: Partial<TextEditorLayout> | null = null;
  #effectiveLayout: TextEditorLayout = defaultTextEditorLayout;
  /** The layouts in effect: the assigned keys over the defaults. */
  get layout(): TextEditorLayout {
    return this.#effectiveLayout;
  }
  set layout(value: Partial<TextEditorLayout> | null) {
    const previous = this.#effectiveLayout;
    this.#assignedLayout = value ?? null;
    this.#effectiveLayout = effectiveTextEditorLayout(this.#assignedLayout);
    this.requestUpdate('layout', previous);
  }

  readonly #controller: TextEditorController;
  readonly #toolbar: TextEditorToolbar;
  readonly #router: TextEditorRouter;
  readonly #focus: TextEditorFocus;
  readonly #geometry: OverlayGeometry;
  readonly #placeholder: TextEditorPlaceholderLayer;
  readonly #announcer: TextEditorAnnouncer;
  /** The part presentation of nested controls and the styles of custom nodes. */
  readonly #customization: TextEditorCustomization;
  readonly #toolbarHandlers: TextEditorToolbarHandlers;
  #instance: TextEditorEngineInstance | null = null;
  #resolution: TextEditorResolutionInput | null = null;
  #tooling: TextEditorTooling | null = null;
  #fieldLabel = '';
  #describedBy: string | null = null;
  #appliedRecord: string | null = null;
  #preview: HTMLElement | null = null;
  /** The document the preview shows; undefined while none is rendered. */
  #previewDocument: TextEditorPortableDocument | null | undefined = undefined;
  #formEntry: string | null = null;
  /** The document whose form events the widget listens to while connected. */
  #formDocument: Document | null = null;
  #edited = false;
  #unsubscribe: (() => void) | null = null;
  #root: HTMLElement | null = null;
  #viewport: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #overlay: HTMLElement | null = null;
  #underlay: HTMLElement | null = null;
  readonly #blocks: TextEditorBlocks;
  readonly #tables: TextEditorTables;
  readonly #popups: TextEditorPopups;

  readonly #linkGuard = {
    handleEvent: (event: Event) => {
      if (
        event.currentTarget &&
        cancelsDisabledActivation(this.effectiveDisabled, event.composedPath(), event.currentTarget)
      )
        event.preventDefault();
    },
    capture: true,
  };

  constructor() {
    super();
    containNestedEvents(this, { types: NESTED_EVENT_TYPES, on: 'root' });
    this.#controller = new TextEditorController(this.#controllerHost());
    this.#router = new TextEditorRouter({
      parts: () => ({
        toolbar: this.#query('text-editor-toolbar'),
        content: this.#content,
      }),
      selection: () =>
        this.#instance && this.#controller.status === 'ready'
          ? this.#instance.getState().selection
          : this.#controller.state.selection,
      direction: () => this.direction,
      request: (proposal) => this.#controller.request(proposal),
      selectRootContent: (event) => this.#controller.selectContent(event),
      editingKey: (event) => this.#blocks.editingKey(event),
      blockTool: (id, event) => this.#blocks.blockTool(id, event),
      contextualControls: (event) => void this.#focus.cycleContextual(event),
      tableTab: (event, backward) => this.#tables.tableTab(event, backward),
      suggestionKey: (event) => this.#popups.suggestionKey(event),
      pointAt: (x, y) => this.#popups.pointAt(x, y),
      uploadImages: (files, at, reason, event) =>
        this.#popups.uploadImages(files, at, reason, event),
    });
    this.#focus = new TextEditorFocus({
      element: this,
      contentElement: () => this.#content,
      readyInstance: () => (this.#controller.status === 'ready' ? this.#instance : null),
      access: () => this.#access(),
      focusChanged: () => this.requestUpdate(),
      commitPending: (event) => this.#controller.commitPending(event),
    });
    this.#toolbarHandlers = Object.freeze<TextEditorToolbarHandlers>({
      activate: (activation: TextEditorToolActivation) =>
        void this.#controller
          .request({
            target: activation.tool,
            ...(activation.value === undefined ? {} : { value: activation.value }),
            surface: activation.surface,
            reason: activation.reason,
            sourceEvent: activation.sourceEvent,
            trigger: activation.trigger,
            focus: activation.focus,
          })
          .catch(() => {}),
      menuOpened: (trigger, modality) => this.#focus.menuOpened(trigger, modality),
      menuClosed: (changed) => this.#focus.menuClosed(changed),
      transientOpened: (owner, close) => this.#focus.transientOpened(owner, close),
      transientClosed: (owner) => this.#focus.transientClosed(owner),
      finalFocus: this.#focus.menuFinalFocus,
    });
    const shadow = () => this.renderRoot as ShadowRoot;
    this.#toolbar = new TextEditorToolbar({
      get renderRoot() {
        return shadow();
      },
      toolbarView: () => this.#toolbarView(),
      handlers: this.#toolbarHandlers,
      requestUpdate: () => this.requestUpdate(),
    });
    this.#geometry = new OverlayGeometry({
      instance: () => (this.#controller.status === 'ready' ? this.#instance : null),
      preview: () =>
        this.#controller.status !== 'ready' && this.#preview?.parentNode === this.#content
          ? this.#preview
          : null,
    });
    this.#placeholder = new TextEditorPlaceholderLayer(this.#geometry);
    this.#announcer = new TextEditorAnnouncer(() => this.#root);
    this.#blocks = new TextEditorBlocks(this.#blocksHost());
    this.#focus.registerContextual(this.#blocks.contextual);
    this.#tables = new TextEditorTables(this.#tablesHost());
    this.#popups = new TextEditorPopups(this.#popupsHost());
    this.#customization = new TextEditorCustomization({
      owner: this,
      renderRoot: () => (this.renderRoot as ShadowRoot | undefined) ?? null,
      adoptStyles: (cssText) => adoptStyleText(this, this.renderRoot as ShadowRoot, cssText),
    });
  }

  // Read-only members (uwg-te-req-prop-2) ---------------------------------------------------

  /** The snapshot handle of the committed document; null before ready. */
  override get value(): TextEditorSnapshot | null {
    return this.#controller.value;
  }

  /** The normalized state, the same object until the next publication. */
  get state(): TextEditorEngineState {
    return this.#controller.state;
  }

  /** The engine's editor object while ready, otherwise null. */
  get native(): unknown {
    return this.#controller.native;
  }

  /** Empty text while the document is empty, otherwise `value`. */
  get fieldValue(): '' | TextEditorSnapshot | null {
    return textEditorFieldValue(this.#controller.state.empty, this.value);
  }

  override get inputElement(): HTMLElement | null {
    return null;
  }

  // Methods ----------------------------------------------------------------------------------

  /** The current document in `format`, by default the element's format. */
  getContent(format: TextEditorPortableFormat): string | null;
  getContent(format?: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat = effectiveTextEditorFormat(this.format)): unknown {
    return this.#controller.getContent(format);
  }

  /** Replaces the document as one undoable step; before ready the last call applies at ready. */
  setContent(
    content: string | object,
    format?: TextEditorFormat,
  ): Promise<TextEditorRequestOutcome> {
    const action: TextEditorAction = {
      type: 'content.set',
      content,
      format: format ?? effectiveTextEditorFormat(this.format),
      history: 'push',
    };
    const request = this.#controller.request({
      target: [action],
      surface: 'api',
      reason: 'imperative-action',
    });
    this.requestUpdate();
    return request;
  }

  /** Runs a tool, an action or a list of actions as one request. */
  run(
    target: string | TextEditorAction | readonly TextEditorAction[],
    options: { readonly value?: unknown; readonly sourceEvent?: Event | undefined } = {},
  ): Promise<TextEditorRequestOutcome> {
    const request = this.#controller.request({
      target,
      ...('value' in options ? { value: options.value } : {}),
      surface: 'api',
      reason: 'imperative-action',
      sourceEvent: options.sourceEvent,
      trigger: null,
    });
    this.requestUpdate();
    return request;
  }

  /** Calls `callback` at most once per publication when the selected slice changed. */
  subscribe<S>(
    selector: (state: TextEditorEngineState) => S,
    callback: (selected: S) => void,
  ): () => void {
    return this.#controller.subscribe(selector, callback);
  }

  /** Focuses the editing root at `position`; before ready the last call applies once ready. */
  override focus(options?: TextEditorFocusOptions): void {
    void this.#focus.focusEditing(options?.position).catch(() => {});
  }

  override blur(): void {
    this.#focus.blur();
  }

  override formStateRestoreCallback(
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    void mode;
    if (this.#edited || typeof state !== 'string') return;
    this.#controller.restoreContent({
      content: state,
      format: effectiveTextEditorFormat(this.format),
    });
    this.#formEntry = state;
    this.setFormValue(state, state);
    this.requestUpdate();
  }

  override setFieldAssociation(association: {
    label?: string;
    description?: string;
    error?: string;
  }): void {
    if ('label' in association) this.#fieldLabel = association.label ?? '';
    super.setFieldAssociation(association);
  }

  // Lifecycle --------------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('data-field-control', '');
    const root = this.renderRoot as ShadowRoot;
    this.#router.attach(root);
    this.#focus.attach(root);
    this.#unsubscribe = this.#controller.subscribe(
      (state) => state,
      () => {
        this.#updatePlaceholder();
        this.#geometry.invalidate('state');
        this.#blocks.stateChanged();
        this.#tables.stateChanged();
        this.#popups.stateChanged();
        this.requestUpdate();
      },
    );
    this.#blocks.connected(this.ownerDocument.defaultView);
    this.#listenForms(this.ownerDocument);
    this.#popups.connected();
    this.#checkPlacement();
    if (!this.hasUpdated) return;
    this.#toolbar.connected();
    this.#observeGeometry();
    this.#tables.connected();
    this.#controller.connect();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#router.detach();
    this.#focus.detach();
    this.#toolbar.disconnected();
    this.#geometry.release();
    this.#tables.disconnected();
    this.#popups.disconnected();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#listenForms(null);
    this.#announcer.clear();
    this.#customization.release();
    this.#blocks.disconnected();
    this.#controller.disconnect();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('format') && !isTextEditorFormat(this.format))
      this.diagnose(
        'text-editor-format-invalid',
        `The format "${String(this.format)}" is not html, markdown, text or json; html is used.`,
      );
    this.#resolve();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    this.#root = this.#query('text-editor');
    this.#viewport = this.#query('text-editor-viewport');
    this.#content = this.#query('text-editor-content');
    this.#overlay = this.#query('text-editor-overlay');
    this.#underlay = (this.renderRoot as ShadowRoot).querySelector<HTMLElement>('.underlay');
    this.#syncPreview();
    this.#toolbar.connected();
    this.#observeGeometry();
    this.#tables.connected();
    this.#controller.connect();
    // The mount's status renders in the next update, requested once this one has completed: an
    // update requested from inside `firstUpdated` would run again at once.
    if (this.#controller.status !== 'idle')
      void this.updateComplete.then(
        () => this.requestUpdate(),
        () => undefined,
      );
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const state = this.#controller.state;
    this.setAttribute('data-status', this.#controller.status);
    this.toggleAttribute('data-focused', state.focused);
    this.toggleAttribute('data-filled', !state.empty);
    this.toggleAttribute('data-dragging', this.#blocks.drag.active);
    this.toggleAttribute('data-gutter', this.#effectiveLayout.gutter);
    this.#toolbar.updated();
    this.#tables.updated();
    this.#blocks.updated();
    this.#popups.updated();
    this.#customization.adoptNodeStyles(this.nodes ?? EMPTY);
    this.#customization.compose(this.partPresentation);
    this.#syncPreview();
  }

  // The content part's click guard only cancels link activations while disabled; Enter on a link
  // reaches it as a click, so it needs no key listener of its own.
  /* eslint-disable lit-a11y/click-events-have-key-events */
  protected override render(): TemplateResult {
    const disabled = this.effectiveDisabled;
    return html`<div part="text-editor">
      ${this.#toolbar.render()}
      <div
        part="text-editor-viewport"
        tabindex=${textEditorViewportTabIndex(disabled) ?? nothing}
        @mousedown=${this.#viewportPress}
      >
        <div class="surface">
          <div class="underlay"></div>
          <div
            part="text-editor-content"
            @click=${this.#linkGuard}
            @auxclick=${this.#linkGuard}
          ></div>
          <div part="text-editor-overlay">
            ${renderPlaceholder(this.#placeholder)}${this.#blocks.render()}${this.#tables.renderOverlay()}
          </div>
        </div>
      </div>
      ${this.#renderStatus()}${this.#tables.renderSurfaces()}${this.#popups.render()}
    </div>`;
  }

  /* eslint-enable lit-a11y/click-events-have-key-events */

  protected override focusTarget(): HTMLElement | null {
    return null;
  }

  protected override associationTarget(): HTMLElement | null {
    return null;
  }

  protected override applyFieldAssociation(attributes: FieldAssociationAttributes): boolean {
    this.#describedBy = attributes['aria-describedby'];
    this.#applyRootAttributes();
    return true;
  }

  protected override associationContainer(): ParentNode {
    return this.#root ?? this.renderRoot;
  }

  protected override resetFormValue(): void {
    const action: TextEditorAction =
      this.defaultValue === null
        ? { type: 'content.set', content: '', format: 'html', history: 'reset' }
        : {
            type: 'content.set',
            content: this.defaultValue,
            format: effectiveTextEditorFormat(this.format),
            history: 'reset',
          };
    void this.#controller
      .request({ target: [action], surface: 'api', reason: 'form-reset' })
      .catch(() => {});
    this.requestUpdate();
  }

  // Internals --------------------------------------------------------------------------------

  #query(part: string): HTMLElement | null {
    return (
      (this.renderRoot as ShadowRoot | undefined)?.querySelector<HTMLElement>(
        `[part~='${part}']`,
      ) ?? null
    );
  }

  #access(): TextEditorAccess {
    return { readOnly: this.readOnly, disabled: this.effectiveDisabled };
  }

  #strings(): TextEditorStrings {
    return this.#tooling?.strings ?? resolveTextEditorStrings(this.strings);
  }

  #controllerHost(): TextEditorControllerHost {
    return {
      container: () => this.#content,
      frames: () => windowFrames(this.ownerDocument.defaultView ?? window),
      direction: () => this.direction,
      adoptStyles: (cssText) => adoptStyleText(this, this.renderRoot as ShadowRoot, cssText),
      dispatchRequest: (detail) =>
        this.emit('tp-text-editor-request', detail, { cancelable: true }),
      requestFailed: (detail) => void this.emit('tp-text-editor-request-failed', detail),
      // No surface exists yet.
      openSurface: (tool, detail) =>
        this.#popups.openSurface(tool, detail) || this.#tables.openSurface(tool, detail),
      attached: (instance) => this.#attached(instance),
      ready: (native) => this.#ready(native),
      failed: (error) => this.#failed(error),
      valueChanged: (change) => this.#valueChanged(change),
      valueCommitted: (commit) => this.#valueCommitted(commit),
      diagnostic: (code, message) => this.diagnose(code, message),
    };
  }

  /** What the floating surfaces read and call (M7). */
  #popupsHost(): TextEditorPopupsHost {
    const ready = () => (this.#controller.status === 'ready' ? this.#instance : null);
    const shadow = () => this.renderRoot as ShadowRoot;
    return {
      get renderRoot() {
        return shadow();
      },
      requestUpdate: () => this.requestUpdate(),
      strings: () => this.#strings(),
      registry: () => this.#tooling?.registry ?? null,
      layout: () => this.#tooling?.layout ?? null,
      access: () => this.#access(),
      state: () => this.#controller.state,
      instance: ready,
      content: () => this.#content,
      toolbar: () => this.#query('text-editor-toolbar'),
      toolContext: (surface) => this.#controller.toolContext(surface),
      toolEnabled: (tool, context) => this.#controller.isToolEnabled(tool, context),
      shortcut: (id) => this.#router.shortcut(id),
      expanded: (tool) => this.#surfaceExpanded(tool),
      request: (proposal) => this.#controller.request(proposal),
      imageUpload: () => this.imageUpload,
      focusEditing: () => void this.#focus.focusEditing('restore').catch(() => {}),
      announce: (message) => this.#announcer.announce(message, { key: 'suggestion' }),
      diagnose: (code, message) => this.diagnose(code, message),
      dragging: () => this.#blocks.drag.active,
      referencesChanged: () => this.#applyRootAttributes(),
      menuOpened: (trigger, modality) => this.#focus.menuOpened(trigger, modality),
      menuClosed: (changed) => this.#focus.menuClosed(changed),
      transientOpened: (owner, close) => this.#focus.transientOpened(owner, close),
      transientClosed: (owner) => this.#focus.transientClosed(owner),
      menuFinalFocus: this.#focus.menuFinalFocus,
      registerContextual: (surface) => this.#focus.registerContextual(surface),
      cycleContextual: (event) => this.#focus.cycleContextual(event),
    };
  }

  /** What the block controls read and call (M8). */
  #blocksHost(): TextEditorBlocksHost {
    const ready = () => (this.#controller.status === 'ready' ? this.#instance : null);
    return {
      geometry: this.#geometry,
      instance: ready,
      selection: () => ready()?.getState().selection ?? this.#controller.state.selection,
      strings: () => this.#strings(),
      layout: () => this.#tooling?.layout ?? this.#effectiveLayout,
      access: () => this.#access(),
      direction: () => this.direction,
      registry: () => this.#tooling?.registry ?? null,
      toolContext: (surface) => this.#controller.toolContext(surface),
      toolEnabled: (tool, context) => this.#controller.isToolEnabled(tool, context),
      shortcut: (id) => this.#router.shortcut(id),
      request: (proposal) => this.#controller.request(proposal),
      can: (action) => this.#controller.can(action),
      announce: (message) => this.#announcer.announce(message),
      focusEditing: () => void this.#focus.focusEditing('restore').catch(() => {}),
      editingFocused: () => {
        const content = this.#content;
        return content !== null && composedContains(content, deepActiveElement(this.ownerDocument));
      },
      cycleContextual: (event) => this.#focus.cycleContextual(event),
      renderRoot: () => (this.renderRoot as ShadowRoot | undefined) ?? null,
      viewport: () => this.#viewport,
      content: () => this.#content,
      overlay: () => this.#overlay,
      underlay: () => this.#underlay,
      dragChanged: (active) => this.toggleAttribute('data-dragging', active),
      requestUpdate: () => this.requestUpdate(),
      tableGripOutset: () => this.#tables.chrome.rowGripOutset(),
      transientOpened: (owner, close) => this.#focus.transientOpened(owner, close),
      transientClosed: (owner) => this.#focus.transientClosed(owner),
    };
  }

  #attached(instance: TextEditorEngineInstance | null): void {
    this.#instance = instance;
    this.#appliedRecord = null;
    if (instance) this.#applyRootAttributes();
    else {
      this.#blocks.detached();
      this.#geometry.invalidate('instance');
    }
  }

  #ready(native: unknown): void {
    // The editing root replaces the preview within the mount's task, so no frame shows both.
    this.#preview?.remove();
    this.#preview = null;
    this.#previewDocument = undefined;
    this.emit<TextEditorReadyDetail>('tp-text-editor-ready', { native });
    this.#refreshFormValue();
    this.#blocks.ready();
    this.#focus.ready();
    this.#geometry.invalidate('instance');
    this.requestUpdate();
  }

  #failed(error: unknown): void {
    this.emit<TextEditorErrorDetail>('tp-text-editor-error', { error });
    this.#geometry.invalidate('instance');
    this.requestUpdate();
  }

  #valueChanged(change: TextEditorValueChange): void {
    this.#edited = true;
    const metadata: TextEditorChangeMetadata = {
      origin: change.origin,
      tool: change.tool,
      actions: change.actions,
    };
    this.dispatchEvent(
      new TpValueChangeEvent(
        change.value,
        change.previousValue,
        change.reason,
        change.sourceEvent,
        {
          cancelable: false,
          metadata,
        },
      ),
    );
    this.#tables.valueChanged(change.actions, change.origin);
    this.#geometry.invalidate('state');
  }

  #valueCommitted(commit: TextEditorValueCommit): void {
    this.#refreshFormValue();
    this.dispatchEvent(
      new TpValueCommitEvent(commit.value, commit.previousValue, commit.reason, commit.sourceEvent),
    );
  }

  /** One resolution of the properties the controller, the router and the toolbar read. */
  #resolve(): void {
    const previous = this.#resolution;
    const next: TextEditorResolutionInput = {
      engine: this.engine ?? null,
      nodes: this.nodes ?? EMPTY,
      tools: this.tools ?? EMPTY,
      layout: this.#assignedLayout,
      strings: this.strings ?? null,
      readOnly: this.readOnly,
      disabled: this.effectiveDisabled,
      defaultValue: this.defaultValue ?? null,
      format: effectiveTextEditorFormat(this.format),
    };
    const status = this.#controller.status;
    const steps = textEditorResolutionSteps(
      previous,
      next,
      status === 'loading' || status === 'ready',
    );
    let tooling = this.#tooling;
    if (steps.includes('registry') || !tooling) {
      tooling = resolveTextEditorTooling(next);
      for (const { code, message } of tooling.diagnostics)
        this.diagnose(code, message, { defer: true });
    } else if (steps.includes('strings'))
      tooling = { ...tooling, strings: resolveTextEditorStrings(next.strings) };
    this.#tooling = tooling;
    for (const step of steps)
      if (step === 'remount') this.#focus.beforeRemount();
      else if (step === 'router') this.#router.sync(textEditorRouterConfig(next, tooling));
      else applyTextEditorResolution(this.#controller, [step], next, tooling);
    this.#resolution = next;
    this.#updatePlaceholder();
    // Before ready the entry is the pending content as given, with no serialization.
    const enabled = previous !== null && previous.disabled && !next.disabled;
    if (this.#controller.status !== 'ready' || previous?.format !== next.format || enabled)
      this.#refreshFormValue();
  }

  #updatePlaceholder(): void {
    this.#placeholder.update(
      placeholderModel(this.#controller.state, {
        placeholder: this.placeholder,
        hint: this.#strings().emptyBlockHint,
        access: this.#access(),
      }),
    );
  }

  /** The table controls' view of the element (M9). */
  #tablesHost(): TextEditorTablesHost {
    const ready = () => (this.#controller.status === 'ready' ? this.#instance : null);
    return {
      element: this,
      geometry: this.#geometry,
      instance: ready,
      state: () => ready()?.getState() ?? this.#controller.state,
      strings: () => this.#strings(),
      layout: () => this.#tooling?.layout ?? defaultTextEditorLayout,
      access: () => this.#access(),
      direction: () => this.direction,
      registry: () => this.#tooling?.registry ?? null,
      toolContext: (surface, target) => this.#controller.toolContext(surface, undefined, target),
      toolEnabled: (tool, context) => this.#controller.isToolEnabled(tool, context),
      shortcut: (id) => this.#router.shortcut(id),
      request: (proposal) => this.#controller.request(proposal),
      announce: (message) => this.#announcer.announce(message),
      focusEditing: () => void this.#focus.focusEditing('restore').catch(() => {}),
      registerContextual: (surface) => this.#focus.registerContextual(surface),
      cycleContextual: (event) => this.#focus.cycleContextual(event),
      stickyHeaders: () => this.stickyTableHeaders,
      viewport: () => this.#viewport,
      content: () => this.#content,
      toolbar: () => this.#query('text-editor-toolbar'),
      requestUpdate: () => this.requestUpdate(),
      updateComplete: () => this.updateComplete,
      transientOpened: (owner, close) => this.#focus.transientOpened(owner, close),
      transientClosed: (owner) => this.#focus.transientClosed(owner),
    };
  }

  #toolbarView() {
    const tooling = this.#tooling;
    if (!tooling) return null;
    return resolveToolbarView({
      registry: tooling.registry,
      layout: tooling.layout,
      access: this.#access(),
      context: (surface) => this.#controller.toolContext(surface),
      enabled: (tool, context) => this.#controller.isToolEnabled(tool, context),
      shortcut: (id) => this.#router.shortcut(id),
      expanded: (tool) => this.#surfaceExpanded(tool),
    });
  }

  /**
   * Whether the surface that a link, image or table-size tool opens is open, which its controls
   * expose (`uwg-te-req-a11y-2`).
   */
  #surfaceExpanded(tool: TextEditorTool): boolean {
    switch (tool.kind) {
      case 'link':
        return this.#popups.link.isOpen;
      case 'image':
        return this.#popups.image.isOpen;
      case 'table-size':
        return this.#tables.picker.open;
      default:
        return false;
    }
  }

  /** Passes the root attribute record to the instance when it or the instance changed. */
  #applyRootAttributes(): void {
    const instance = this.#instance;
    if (!instance) return;
    const record = textEditorRootAttributes({
      fieldLabel: this.#fieldLabel,
      label: this.label,
      hostLabel: this.getAttribute('aria-label'),
      describedBy: this.#describedBy,
      strings: this.#strings(),
      placeholder: this.placeholder,
      readOnly: this.readOnly,
      disabled: this.effectiveDisabled,
      suggestionList: this.#popups.references.controls,
    });
    const serialized = JSON.stringify(record);
    if (serialized === this.#appliedRecord) return;
    this.#appliedRecord = serialized;
    instance.setRootAttributes(record);
  }

  /** Renders the pre-ready preview while idle or failed, never over an engine's root. */
  #syncPreview(): void {
    const content = this.#content;
    const status = this.#controller.status;
    if (!content || status === 'loading' || status === 'ready') return;
    for (const child of content.children) if (child !== this.#preview) return;
    const document = this.#controller.previewDocument();
    if (document === this.#previewDocument && (!document || this.#preview?.parentNode === content))
      return;
    this.#previewDocument = document;
    if (!document) {
      this.#preview?.remove();
      this.#preview = null;
      return;
    }
    const root = renderPortablePreview(document, content, { nodes: this.nodes ?? EMPTY });
    root.setAttribute(TEXT_EDITOR_PREVIEW_ATTRIBUTE, '');
    this.#preview = root;
  }

  #observeGeometry(): void {
    const viewport = this.#viewport;
    const content = this.#content;
    const overlay = this.#overlay;
    if (viewport && content && overlay) this.#geometry.observe({ viewport, content, overlay });
  }

  #renderStatus(): TemplateResult | typeof nothing {
    const status = this.#controller.status;
    const strings = this.#strings();
    if (status === 'loading')
      return html`<div part="text-editor-status" role="status" aria-live="polite">
        <tp-spinner aria-hidden="true"></tp-spinner><span>${strings.loading}</span>
      </div>`;
    if (status === 'error')
      return html`<div part="text-editor-status" role="alert">${strings.error}</div>`;
    return nothing;
  }

  /** While disabled, a press on the viewport's own box keeps the focus where it is. */
  readonly #viewportPress = (event: MouseEvent): void => {
    if (this.effectiveDisabled) event.preventDefault();
  };

  /**
   * Listens to the form events of `document`, or of none: the document is remembered, since a
   * move into another document has already changed `ownerDocument` when the widget disconnects.
   */
  #listenForms(document: Document | null): void {
    const current = this.#formDocument;
    if (current === document) return;
    current?.removeEventListener('submit', this.#submitCapture, true);
    current?.removeEventListener('formdata', this.#formDataCapture, true);
    this.#formDocument = document;
    document?.addEventListener('submit', this.#submitCapture, true);
    document?.addEventListener('formdata', this.#formDataCapture, true);
  }

  /** Reports placement under a closed ancestor shadow root, once per connection. */
  #checkPlacement(): void {
    const closed = closedAncestorRoot(this);
    if (!closed) return;
    this.diagnose(
      'text-editor-closed-root',
      `The editor is placed under the closed shadow root of ${describeElement(closed.host)}, through which the engines cannot read their selection; place it under open shadow roots only.`,
      { context: closed.host },
    );
  }

  #refreshFormValue(): void {
    const entry = textEditorFormValue(
      effectiveTextEditorFormat(this.format),
      this.effectiveDisabled,
      (format) => this.#controller.getContent(format),
    );
    this.#formEntry = entry;
    this.setFormValue(entry, entry);
  }

  /** Submission: the entry is current before the form builds its entry list. */
  readonly #submitCapture = (event: Event): void => {
    if (event.target === this.form) this.#refreshFormValue();
  };

  /** Form data built outside a submission: the stale entry is replaced in place. */
  readonly #formDataCapture = (event: Event): void => {
    if (event.target !== this.form || !this.form) return;
    const data = (event as FormDataEvent).formData;
    const stale = this.#formEntry;
    const fresh = textEditorFormValue(
      effectiveTextEditorFormat(this.format),
      this.effectiveDisabled,
      (format) => this.#controller.getContent(format),
    );
    const patched = patchFormEntries([...data.entries()], this.effectiveName, stale, fresh);
    if (patched) {
      for (const name of new Set(patched.map(([key]) => key).concat([...data.keys()])))
        data.delete(name);
      for (const [name, value] of patched) data.append(name, value);
    }
    if (stale !== fresh) {
      this.#formEntry = fresh;
      this.setFormValue(fresh, fresh);
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-text-editor': TpTextEditor;
  }
}
