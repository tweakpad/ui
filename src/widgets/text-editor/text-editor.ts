import {
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
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
import { defineElement, type CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { composedContains, deepActiveElement } from '../../foundation/focus.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import { TpFormElement, type FieldAssociationAttributes } from '../../foundation/form-element.js';
import { frameLoopFor, windowFrames, type FrameSubscription } from '../../foundation/frame-loop.js';
import { adoptStyleText, SuppressionFallbackStyle } from '../../foundation/generated-style.js';
import { presenceRole } from '../../foundation/motion.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { isTextEditorFormat, type TextEditorAction } from '../../foundation/text-editor/actions.js';
import { textEditorCoreTools } from '../../foundation/text-editor/builtin-tools/core.js';
import { TEXT_MECHANICS_INHERITED } from '../../foundation/text-editor/content/mechanics.js';
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
  TextEditorEngineViews,
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
import type {
  TextEditorEngineState,
  TextEditorSelection,
} from '../../foundation/text-editor/model.js';
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
import {
  orderTextEditorFeatures,
  type TextEditorFeature,
  type TextEditorFeatureHost,
  type TextEditorFeatureInstance,
} from './feature.js';
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
  TextEditorReadyDetail,
} from './types.js';
import {
  placeholderModel,
  renderPlaceholder,
  TextEditorPlaceholderLayer,
} from './views/placeholder.js';
import { CONTEXT_BAR_MOTION } from './views/context-bar.js';
import { TextEditorToolbar, type TextEditorToolbarHandlers } from './views/toolbar.js';
import { reportTextEditorLane } from './views/lanes.js';

/** The motion roles of the widget's surfaces. */
export const textEditorMotionRoles = {
  surface: presenceRole('surface'),
  contextBar: CONTEXT_BAR_MOTION,
} as const;

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

/** The id of the hidden instructions text in the shadow root, which the editing root's description lists. */
export const TEXT_EDITOR_INSTRUCTIONS_ID = 'tp-text-editor-instructions';

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
  /**
   * The id of the hidden instructions text, which the description lists last while the editor is
   * editable; null or absent without it (the slash menu inactive).
   */
  readonly instructions?: string | null | undefined;
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
    // The instructions name the slash trigger and Alt+F10, which act only while editable.
    'aria-describedby':
      [input.describedBy, input.readOnly || input.disabled ? null : input.instructions]
        .filter((id) => id)
        .join(' ') || null,
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

/**
 * The inherited text mechanics of the content part while the content-security policy suppresses
 * generated styles, the engine stylesheet included: the editing root and the preview inherit them,
 * so that text keeps its spaces and wraps on every engine. Otherwise the stylesheet carries them.
 */
export function textEditorSuppressionFallback(
  owner: HTMLElement,
  content: HTMLElement,
): SuppressionFallbackStyle {
  return new SuppressionFallbackStyle(owner, content, TEXT_MECHANICS_INHERITED);
}

// Placement (uwg-te-req-engine-8, uwg-te-req-evt-5) -----------------------------------------

/**
 * The tree root whose capture listeners receive the form events of the element's form owner: its
 * own root (the document, or the shadow root that holds it). A form owner is always in the
 * element's tree, and `submit` and `formdata` do not cross shadow boundaries, so a listener on
 * the document misses a form inside a shadow root. `null` while the element is not in a tree.
 */
export function formEventRoot(element: Node): Document | ShadowRoot | null {
  const root = element.getRootNode();
  return root.nodeType === 9 || root.nodeType === 11 ? (root as Document | ShadowRoot) : null;
}

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

/** The default measure: the longest line of text, in characters of the content's font. */
export const TEXT_EDITOR_DEFAULT_MEASURE = 65;

/**
 * The CSS length of `measure`: that many `ch` of the content's font for a positive finite number,
 * `none` for `null`, zero or anything else (no limit).
 */
export function textEditorMeasureLength(measure: unknown): string {
  return typeof measure === 'number' && Number.isFinite(measure) && measure > 0
    ? `${measure}ch`
    : 'none';
}

/** The format in effect: the value when it is one of the four, else 'html'. */
export function effectiveTextEditorFormat(format: unknown): TextEditorFormat {
  return isTextEditorFormat(format) ? format : 'html';
}

/**
 * Whether the focused editing root paints no caret: with no selection (a cleared one) and with a
 * block selection, which the overlay paints; the caret that the engine or the browser keeps in
 * the root (one engine keeps a collapsed one at the root's start in block mode) is then hidden.
 */
export function textEditorCaretHidden(kind: TextEditorSelection['kind']): boolean {
  return kind === 'none' || kind === 'blocks';
}

/**
 * The `format` attribute's value as the property: a removed attribute restores the default
 * `html` rather than `null`, so it is not reported as a format outside the domain.
 */
export const textEditorFormatConverter = {
  fromAttribute: (value: string | null): string => value ?? 'html',
};

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

/**
 * '' while the document is empty, otherwise the handle (null before ready); never a serialization.
 * The handle's own `empty` decides once there is one: Field reads the value on the change event,
 * before the state of that revision is published.
 */
export function textEditorFieldValue(
  empty: boolean,
  value: TextEditorSnapshot | null,
): '' | TextEditorSnapshot | null {
  return (value ? value.empty : empty) ? '' : value;
}

/**
 * The `tp-field-value` of the first ready (reason `initial`): the mounted document's field value
 * after the one a Field read before ready; none when they are equal (an empty document).
 */
export function initialFieldValueDetail(
  previousValue: '' | null,
  value: '' | TextEditorSnapshot | null,
): {
  readonly value: '' | TextEditorSnapshot | null;
  readonly previousValue: '' | null;
  readonly reason: 'initial';
} | null {
  return value === previousValue ? null : { value, previousValue, reason: 'initial' };
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
  /** The attached features, in their order; their tools join the core set. */
  readonly features: readonly TextEditorFeature[];
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
    previous.features !== next.features ||
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

/**
 * The severity of a tooling diagnostic: an explicitly placed tool that the engine cannot serve is
 * information (`text-editor-tool-unavailable`, G2-D21), every other finding a warning.
 */
export function textEditorToolingSeverity(code: string): 'info' | 'warning' {
  return code === 'text-editor-tool-unavailable' ? 'info' : 'warning';
}

/** The resolved tooling of an input, with the registry's and the layout's diagnostics in order. */
export interface TextEditorTooling {
  readonly registry: TextEditorToolRegistry;
  readonly layout: TextEditorLayout;
  readonly strings: TextEditorStrings;
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/** The built-in tools in effect: the core set with the set of each attached feature. */
export function textEditorBuiltins(
  features: readonly Pick<TextEditorFeature, 'tools'>[],
): Readonly<Record<string, TextEditorTool>> {
  if (features.length === 0) return textEditorCoreTools;
  return Object.freeze(
    Object.assign({ ...textEditorCoreTools }, ...features.map((feature) => feature.tools)),
  ) as Readonly<Record<string, TextEditorTool>>;
}

export function resolveTextEditorTooling(input: TextEditorResolutionInput): TextEditorTooling {
  const registry = resolveTextEditorTools({
    builtins: textEditorBuiltins(input.features),
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
 * with portable HTML, Markdown and text content, forms and Field support. The optional controls
 * (block editing, tables, images, links, the selection toolbar and the suggestion lists) are
 * features the application imports and assigns to `features`; without any, the core editor.
 *
 * @fires tp-text-editor-request - Cancelable; every proposed change, before it applies.
 * @fires tp-text-editor-request-failed - A request was rejected.
 * @fires tp-value-change - The document changed.
 * @fires tp-value-commit - A change was committed.
 * @fires tp-text-editor-ready - The editor is ready; the detail carries the engine's editor object.
 * @fires tp-text-editor-error - The engine failed to mount; `detail.error` is the reason.
 * @fires tp-diagnostic - A development diagnostic with a `text-editor-*` code.
 *
 * @cssprop --_tp-text-editor-measure - Internal: the measure as a length, from `measure`.
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
 * @csspart text-editor-alt-input - The alternative text field of a selected image, in the context bar.
 * @csspart text-editor-link-editor - The link editor at the caret, in the context bar.
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
    ];
  }
  static override presentation = textEditorPresentation;
  static override properties: PropertyDeclarations = {
    ...TpFormElement.properties,
    value: { attribute: false, noAccessor: true },
    engine: { attribute: false },
    defaultValue: { attribute: 'default-value' },
    format: { converter: textEditorFormatConverter },
    placeholder: { type: String },
    label: { type: String },
    measure: { type: Number },
    features: { attribute: false },
    tools: { attribute: false },
    layout: { attribute: false, noAccessor: true },
    nodes: { attribute: false },
    strings: { attribute: false },
  };
  static override styles = [TpElement.styles, textEditorStyles];

  /** The engine that renders the editing surface; replacing it remounts with the content kept. */
  engine: TextEditorEngine | null = null;
  /** The initial content in `format`; form reset restores it. */
  defaultValue: string | object | null = null;
  format: TextEditorFormat = 'html';
  placeholder = '';
  /** The editing root's name when no Field labels it. */
  label = '';
  /** The longest line of text in characters (`ch` of the content's font); `null` or 0 for no limit. */
  measure: number | null = TEXT_EDITOR_DEFAULT_MEASURE;
  /** The optional features in use, created by their factories; none for the core editor. */
  features: readonly TextEditorFeature[] = EMPTY;
  /** Tools added to the built-in ones; an equal identifier replaces one. */
  tools: readonly TextEditorTool[] = EMPTY;
  /** Custom node definitions; a change remounts with the content kept. */
  nodes: readonly TextEditorNodeDefinition[] = EMPTY;
  /** Overrides of the built-in strings. */
  strings: Partial<TextEditorStrings> | null = null;

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
  /** The tree root (document or shadow root) whose form events the widget listens to. */
  #formRoot: Document | ShadowRoot | null = null;
  #edited = false;
  /**
   * The field value a Field read before the first ready (`''` or `null`), which the first ready
   * reports as the previous value of its `initial` field value; `undefined` once reported.
   */
  #preReadyFieldValue: '' | null | undefined = null;
  /** While `firstUpdated` connects the controller, whose mount can settle within that call. */
  #connecting = false;
  /** The frame that renders a focus change (`#focusChanged`), and whether no render followed it. */
  #focusFrame: FrameSubscription | null = null;
  #focusPending = false;
  #unsubscribe: (() => void) | null = null;
  #root: HTMLElement | null = null;
  #viewport: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #suppressionFallback: SuppressionFallbackStyle | null = null;
  #overlay: HTMLElement | null = null;
  #underlay: HTMLElement | null = null;
  /** The attached features' runtimes, in feature order. */
  #features: readonly TextEditorFeatureInstance[] = EMPTY;
  /** The `features` list the runtimes were attached for, by identity. */
  #attachedFeatures: readonly TextEditorFeature[] = EMPTY;
  /** The ordered features attached, which the resolution reads. */
  #orderedFeatures: readonly TextEditorFeature[] = EMPTY;
  /** The releases of the adopted feature styles. */
  #featureStyles: (() => void)[] = [];
  /** Whether the features received `partsConnected` and not yet `disconnected`. */
  #featuresConnected = false;
  readonly #featureHost: TextEditorFeatureHost;
  /** The views the engines mount into their hosts: the first attached feature's that renders one. */
  readonly #views: TextEditorEngineViews = Object.freeze({
    pendingImage: (element: HTMLElement, id: string) => {
      for (const feature of this.#features) {
        const view = feature.views?.pendingImage;
        if (view) return view.call(feature.views, element, id);
      }
      return undefined;
    },
  });

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
        selectionToolbar: this.#query('text-editor-selection-toolbar'),
        content: this.#content,
      }),
      selection: () =>
        this.#instance && this.#controller.status === 'ready'
          ? this.#instance.getState().selection
          : this.#controller.state.selection,
      direction: () => this.direction,
      request: (proposal) => this.#controller.request(proposal),
      selectRootContent: (event) => this.#controller.selectContent(event),
      extendRootSelection: (event, direction) => this.#controller.extendSelection(direction, event),
      editingKey: (event) => this.#features.some((feature) => feature.editingKey?.(event)),
      blockTool: (id, event) => this.#features.some((feature) => feature.blockTool?.(id, event)),
      contextualControls: (event) => void this.#focus.cycleContextual(event),
      tableTab: (event, backward) =>
        this.#features.some((feature) => feature.tableTab?.(event, backward)),
      suggestionKey: (event) => this.#features.some((feature) => feature.suggestionKey?.(event)),
      pointAt: (x, y) =>
        (this.#controller.status === 'ready' ? this.#instance : null)?.pointAt(x, y) ?? null,
      uploadImages: (files, at, reason, event) =>
        this.#features.some((feature) => feature.uploadImages?.(files, at, reason, event)),
      canLink: (href) => this.#controller.can({ type: 'link.set', href }),
    });
    this.#focus = new TextEditorFocus({
      element: this,
      contentElement: () => this.#content,
      readyInstance: () => (this.#controller.status === 'ready' ? this.#instance : null),
      access: () => this.#access(),
      focusChanged: () => this.#focusChanged(),
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
    this.#featureHost = this.#buildFeatureHost();
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
        for (const feature of this.#features) feature.stateChanged?.();
        this.#requestRender();
      },
    );
    for (const feature of this.#features) feature.connected?.();
    this.#listenForms(formEventRoot(this));
    this.#checkPlacement();
    if (!this.hasUpdated) return;
    this.#suppressionFallback?.connect();
    this.#toolbar.connected();
    this.#observeGeometry();
    this.#connectFeatures();
    this.#controller.connect();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cancelFocusFrame();
    this.#router.detach();
    this.#focus.detach();
    this.#toolbar.disconnected();
    this.#suppressionFallback?.disconnect();
    this.#geometry.release();
    this.#disconnectFeatures();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#listenForms(null);
    this.#announcer.release();
    this.#customization.release();
    this.#controller.disconnect();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    // This render shows the current focus.
    this.#focusPending = false;
    if (changed.has('format') && !isTextEditorFormat(this.format))
      this.diagnose(
        'text-editor-format-invalid',
        `The format "${String(this.format)}" is not html, markdown, text or json; html is used.`,
      );
    this.#applyFeatures();
    this.#resolve();
    if (this.#preReadyFieldValue !== undefined && this.value === null)
      this.#preReadyFieldValue = this.fieldValue as '' | null;
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    this.#root = this.#query('text-editor');
    this.#viewport = this.#query('text-editor-viewport');
    this.#content = this.#query('text-editor-content');
    this.#overlay = this.#query('text-editor-overlay');
    this.#underlay = (this.renderRoot as ShadowRoot).querySelector<HTMLElement>('.underlay');
    // Before the engine mounts: it reads the root's mechanics once, at the first edit.
    if (this.#content) {
      this.#suppressionFallback = textEditorSuppressionFallback(this, this.#content);
      if (this.isConnected) this.#suppressionFallback.connect();
    }
    this.#syncPreview();
    // A host removed before its first update ran sets up no views, which would keep it reachable
    // (V-585); `connectedCallback` sets them up when it connects again.
    if (!this.isConnected) return;
    this.#toolbar.connected();
    this.#observeGeometry();
    this.#connectFeatures();
    // The mount's status renders in the next update, requested once this one has completed: an
    // update requested from inside `firstUpdated` would run again at once, so a mount that
    // settles (or fails) while the controller connects requests nothing itself.
    this.#connecting = true;
    try {
      this.#controller.connect();
    } finally {
      this.#connecting = false;
    }
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
    this.toggleAttribute('data-dragging', this.#dragging());
    this.toggleAttribute(
      'data-gutter',
      this.#features.some((feature) => feature.gutter?.() === true),
    );
    // The removal released the views; an update requested before it and run after it must not set
    // them up again (observers, listeners, timers), which only a reconnection does.
    if (!this.isConnected) return;
    this.#toolbar.updated();
    for (const feature of this.#features) feature.updated?.();
    this.#customization.adoptNodeStyles(this.nodes ?? EMPTY);
    this.#customization.compose(this.partPresentation);
    this.#syncPreview();
  }

  // The content part's click guard only cancels link activations while disabled; Enter on a link
  // reaches it as a click, so it needs no key listener of its own.
  /* eslint-disable lit-a11y/click-events-have-key-events */
  protected override render(): TemplateResult {
    const disabled = this.effectiveDisabled;
    // Focus anywhere in the widget, its top-layer popups included (`uwg-te-req-pres-1`).
    return html`<div
      part="text-editor"
      ?data-focus-within=${this.#focus.focused}
      style=${styleMap({ '--_tp-text-editor-measure': textEditorMeasureLength(this.measure) })}
    >
      ${this.#toolbar.render()}
      <div
        part="text-editor-viewport"
        tabindex=${textEditorViewportTabIndex(disabled) ?? nothing}
        @mousedown=${this.#viewportPress}
      >
        <div
          class="surface"
          ?data-unplaced=${textEditorCaretHidden(this.#controller.state.selection.kind)}
        >
          <div class="underlay"></div>
          <div
            part="text-editor-content"
            @click=${this.#linkGuard}
            @auxclick=${this.#linkGuard}
          ></div>
          <div part="text-editor-overlay">
            ${renderPlaceholder(this.#placeholder)}${this.#features.map((feature) => feature.renderOverlay?.() ?? nothing)}
          </div>
        </div>
      </div>
      ${this.#renderStatus()}${this.#features.map((feature) => feature.renderSurfaces?.() ?? nothing)}
      <div id=${TEXT_EDITOR_INSTRUCTIONS_ID} hidden>${this.#strings().instructions}</div>
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
      imageUpload: () => this.#features.some((feature) => feature.uploads?.() === true),
      views: () => this.#views,
      adoptStyles: (cssText) => adoptStyleText(this, this.renderRoot as ShadowRoot, cssText),
      dispatchRequest: (detail) =>
        this.emit('tp-text-editor-request', detail, { cancelable: true }),
      requestFailed: (detail) => void this.emit('tp-text-editor-request-failed', detail),
      openSurface: (tool, detail) =>
        this.#features.some((feature) => feature.openSurface?.(tool, detail) === true),
      attached: (instance) => this.#attached(instance),
      ready: (native) => this.#ready(native),
      failed: (error) => this.#failed(error),
      valueChanged: (change) => this.#valueChanged(change),
      valueCommitted: (commit) => this.#valueCommitted(commit),
      diagnostic: (code, message) => this.diagnose(code, message),
    };
  }

  /** What the features read and call, built once; every answer reads the widget's current state. */
  #buildFeatureHost(): TextEditorFeatureHost {
    const ready = () => (this.#controller.status === 'ready' ? this.#instance : null);
    return {
      element: this,
      geometry: this.#geometry,
      renderRoot: () => (this.renderRoot as ShadowRoot | undefined) ?? null,
      view: () => this.ownerDocument.defaultView,
      requestUpdate: () => this.requestUpdate(),
      updateComplete: () => this.updateComplete,
      strings: () => this.#strings(),
      registry: () => this.#tooling?.registry ?? null,
      layout: () => this.#tooling?.layout ?? this.#effectiveLayout,
      access: () => this.#access(),
      direction: () => this.direction,
      state: () => this.#controller.state,
      instance: ready,
      selection: () => ready()?.getState().selection ?? this.#controller.state.selection,
      wholeDocument: () => this.#controller.holdsWholeDocument(),
      content: () => this.#content,
      toolbar: () => this.#query('text-editor-toolbar'),
      viewport: () => this.#viewport,
      overlay: () => this.#overlay,
      underlay: () => this.#underlay,
      toolContext: (surface, target) => this.#controller.toolContext(surface, undefined, target),
      toolEnabled: (tool, context) => this.#controller.isToolEnabled(tool, context),
      shortcut: (id) => this.#router.shortcut(id),
      request: (proposal) => this.#controller.request(proposal),
      can: (action) => this.#controller.can(action),
      announce: (message, options) => this.#announcer.announce(message, options),
      diagnose: (code, message) => this.diagnose(code, message),
      focusEditing: () => void this.#focus.focusEditing('restore').catch(() => {}),
      editingFocused: () => {
        const content = this.#content;
        return content !== null && composedContains(content, deepActiveElement(this.ownerDocument));
      },
      focused: () => this.#focus.focused,
      menuOpened: (trigger, modality) => this.#focus.menuOpened(trigger, modality),
      menuClosed: (changed) => this.#focus.menuClosed(changed),
      menuFinalFocus: this.#focus.menuFinalFocus,
      transientOpened: (owner, close, reason) => this.#focus.transientOpened(owner, close, reason),
      transientClosed: (owner) => this.#focus.transientClosed(owner),
      registerContextual: (surface) => this.#focus.registerContextual(surface),
      cycleContextual: (event) => this.#focus.cycleContextual(event),
      lane: (surface, open, reason) => reportTextEditorLane({ host: this, surface, open, reason }),
      editReason: () => this.#controller.lastChangeReason,
      expanded: (tool) => this.#surfaceExpanded(tool),
      referencesChanged: () => this.#applyRootAttributes(),
      dragChanged: (active) => this.toggleAttribute('data-dragging', active),
      dragging: () => this.#dragging(),
      menuOpen: () => this.#features.some((feature) => feature.menuOpen?.() === true),
      surfaceOpen: () => this.#features.some((feature) => feature.surfaceOpen?.() === true),
      keepClear: () => {
        for (const feature of this.#features) {
          const band = feature.keepClear?.();
          if (band) return band;
        }
        return null;
      },
      gripOutset: () =>
        this.#features.reduce(
          (outset, feature) => Math.max(outset, feature.gripOutset?.() ?? 0),
          0,
        ),
      contentPressed: () => {
        for (const feature of this.#features) feature.contentPressed?.();
      },
      focusExcluded: (active) =>
        this.#features.some((feature) => feature.focusExcluded?.(active) === true),
    };
  }

  #dragging(): boolean {
    return this.#features.some((feature) => feature.dragging?.() === true);
  }

  /**
   * Attaches the assigned features once per `features` identity, in feature order: the runtimes
   * of the previous list are released, each feature's elements are defined and its styles adopted,
   * and a feature attached while the widget is connected joins its lifecycle at once.
   */
  #applyFeatures(): void {
    const assigned = Array.isArray(this.features) ? this.features : EMPTY;
    if (assigned === this.#attachedFeatures) return;
    this.#attachedFeatures = assigned;
    this.#disconnectFeatures();
    for (const feature of this.#features) feature.dispose();
    for (const release of this.#featureStyles) release();
    this.#featureStyles = [];
    const ordered = orderTextEditorFeatures(assigned, (name) =>
      this.diagnose(
        'text-editor-feature-duplicate',
        `The features hold more than one "${name}" feature; the first one is used.`,
        { defer: true },
      ),
    );
    this.#orderedFeatures = Object.freeze(ordered);
    const root = this.renderRoot as ShadowRoot | undefined;
    const defines = typeof customElements !== 'undefined';
    this.#features = Object.freeze(
      ordered.map((feature) => {
        if (defines)
          for (const element of feature.elements)
            if (element.tagName) defineElement(element.tagName, element);
        if (root)
          for (const style of feature.styles ?? EMPTY)
            this.#featureStyles.push(adoptStyleText(this, root, style.cssText));
        return feature.attach(this.#featureHost);
      }),
    );
    if (!this.isConnected) return;
    for (const feature of this.#features) feature.connected?.();
    if (this.hasUpdated) this.#connectFeatures();
  }

  /** The features' part set-up: once the parts rendered, on the first update or a reconnection. */
  #connectFeatures(): void {
    if (this.#featuresConnected) return;
    this.#featuresConnected = true;
    for (const feature of this.#features) feature.partsConnected?.();
  }

  #disconnectFeatures(): void {
    if (!this.#featuresConnected) return;
    this.#featuresConnected = false;
    for (const feature of this.#features) feature.disconnected?.();
  }

  #attached(instance: TextEditorEngineInstance | null): void {
    this.#instance = instance;
    this.#appliedRecord = null;
    if (instance) this.#applyRootAttributes();
    else {
      for (const feature of this.#features) feature.detached?.();
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
    this.#reportInitialFieldValue();
    for (const feature of this.#features) feature.ready?.();
    this.#focus.ready();
    this.#geometry.invalidate('instance');
    this.#requestRender();
  }

  /**
   * The first ready gives a Field the mounted document as its initial value (`tp-field-value`
   * with reason `initial`), so that the content applied at mount is neither filled late nor
   * dirty; an empty document keeps the empty text it read before.
   */
  #reportInitialFieldValue(): void {
    const previousValue = this.#preReadyFieldValue;
    if (previousValue === undefined) return;
    this.#preReadyFieldValue = undefined;
    const detail = initialFieldValueDetail(previousValue, this.fieldValue);
    if (detail) this.emit('tp-field-value', detail);
  }

  #failed(error: unknown): void {
    this.emit<TextEditorErrorDetail>('tp-text-editor-error', { error });
    this.#geometry.invalidate('instance');
    this.#requestRender();
  }

  /** Requests an update, unless `firstUpdated` is connecting: it requests one once it completed. */
  #requestRender(): void {
    if (!this.#connecting) this.requestUpdate();
  }

  /**
   * Renders a focus change of the widget (the root's `data-focus-within`) in the next frame, unless
   * a render ran before: the state that the same change publishes renders the element in its
   * frame, so a press that moves focus between editors renders each once, not once in its focus
   * event and again in the frame. While that publication waits, the check moves to the next frame.
   * `:focus-within` styles the root at once (`uwg-te-req-perf-1`).
   */
  #focusChanged(): void {
    // The table chrome follows at once, in its own layer pass, without a render of the element.
    for (const feature of this.#features) feature.focusChanged?.();
    this.#focusPending = true;
    this.#focusFrame ??= frameLoopFor(this.ownerDocument.defaultView ?? window).subscribe(() => {
      if (!this.#focusPending || !this.isConnected) return false;
      if (this.#controller.publicationPending) return true;
      this.requestUpdate();
      return false;
    });
    this.#focusFrame.wake();
  }

  #cancelFocusFrame(): void {
    this.#focusFrame?.release();
    this.#focusFrame = null;
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
    for (const feature of this.#features) feature.valueChanged?.(change);
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
      features: this.#orderedFeatures,
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
        this.diagnose(code, message, { defer: true, severity: textEditorToolingSeverity(code) });
    } else if (steps.includes('strings'))
      tooling = { ...tooling, strings: resolveTextEditorStrings(next.strings) };
    this.#tooling = tooling;
    for (const step of steps)
      if (step === 'remount') this.#focus.beforeRemount();
      else if (step === 'router') this.#router.sync(textEditorRouterConfig(next, tooling));
      else applyTextEditorResolution(this.#controller, [step], next, tooling);
    this.#resolution = next;
    this.#updatePlaceholder();
    // Access and layout decide whether the description lists the instructions.
    this.#applyRootAttributes();
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

  #toolbarView() {
    const tooling = this.#tooling;
    if (!tooling) return null;
    return resolveToolbarView({
      registry: tooling.registry,
      layout: tooling.layout,
      access: this.#access(),
      focused: this.#focus.focused,
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
    return this.#features.some((feature) => feature.expanded?.(tool) === true);
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
      instructions: (this.#tooling?.layout ?? this.#effectiveLayout).suggestions.includes('slash')
        ? TEXT_EDITOR_INSTRUCTIONS_ID
        : null,
      strings: this.#strings(),
      placeholder: this.placeholder,
      readOnly: this.readOnly,
      disabled: this.effectiveDisabled,
      suggestionList: this.#suggestionList(),
    });
    const serialized = JSON.stringify(record);
    if (serialized === this.#appliedRecord) return;
    this.#appliedRecord = serialized;
    instance.setRootAttributes(record);
  }

  /** The id of the suggestion list the editing root references, from the feature that shows one. */
  #suggestionList(): string | null {
    for (const feature of this.#features) {
      const id = feature.suggestionList?.();
      if (id) return id;
    }
    return null;
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
   * Listens to the form events of a tree root, or of none: the root is remembered, since a move
   * into another tree has already changed it when the widget disconnects.
   */
  #listenForms(root: Document | ShadowRoot | null): void {
    const current = this.#formRoot;
    if (current === root) return;
    current?.removeEventListener('submit', this.#submitCapture, true);
    current?.removeEventListener('formdata', this.#formDataCapture, true);
    this.#formRoot = root;
    root?.addEventListener('submit', this.#submitCapture, true);
    root?.addEventListener('formdata', this.#formDataCapture, true);
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
