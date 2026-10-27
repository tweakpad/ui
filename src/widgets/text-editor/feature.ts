/**
 * Features of the text editor (`uwg-te-req-features-1`): the optional controls that an
 * application imports and assigns to `features`, so that a page bundles only the features it
 * uses. A feature is plain data: its name, the built-in tools it contributes, the library elements
 * its templates render, the structural styles it adopts and `attach`, which builds its runtime
 * for one widget over the host the widget provides. The host never imports a feature; a feature
 * never imports the host.
 */
import type { CSSResult, nothing, TemplateResult } from 'lit';
import type { AnnounceOptions } from '../../foundation/announcer.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type { KeyShortcut } from '../../foundation/key-bindings.js';
import type { SurfaceInteraction } from '../../foundation/surface-focus.js';
import type { TextEditorAction } from '../../foundation/text-editor/actions.js';
import type {
  TextEditorAccess,
  TextEditorRequestDetail,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
  TextEditorValueChange,
} from '../../foundation/text-editor/controller.js';
import type {
  TextEditorDiagnosticCode,
  TextEditorEngineInstance,
  TextEditorEngineViews,
} from '../../foundation/text-editor/engine.js';
import type { TextEditorLayout } from '../../foundation/text-editor/layout.js';
import type {
  TextEditorEngineState,
  TextEditorSelection,
  TextEditorSelectionInput,
} from '../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../foundation/text-editor/strings.js';
import type {
  TextEditorRequestSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolRegistry,
  TextEditorToolTarget,
} from '../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TextEditorContextualSurface, TextEditorMenuModality } from './focus.js';
import type { OverlayGeometry } from './geometry.js';
import type { TextEditorLaneSurface } from './views/lanes.js';
import type { BlockBand } from './views/selection-anchor.js';

/** The name of a feature; one feature of each name attaches to a widget. */
export type TextEditorFeatureName =
  'blocks' | 'tables' | 'images' | 'links' | 'selection-toolbar' | 'suggestions';

/** The order in which the features render and receive the widget's lifecycle, whatever their assignment order. */
export const TEXT_EDITOR_FEATURE_ORDER: readonly TextEditorFeatureName[] = Object.freeze([
  'blocks',
  'tables',
  'images',
  'links',
  'selection-toolbar',
  'suggestions',
]);

/** What a feature reads and calls on the widget; the widget implements it once. */
export interface TextEditorFeatureHost {
  readonly element: HTMLElement;
  readonly geometry: OverlayGeometry;
  renderRoot(): ShadowRoot | null;
  /** The widget's window, or null. */
  view(): Window | null;
  requestUpdate(): void;
  /** Resolves once the widget rendered. */
  updateComplete(): Promise<unknown>;
  strings(): TextEditorStrings;
  registry(): TextEditorToolRegistry | null;
  /** The layout in effect. */
  layout(): TextEditorLayout;
  access(): TextEditorAccess;
  direction(): 'ltr' | 'rtl';
  /** The published state. */
  state(): TextEditorEngineState;
  /** The instance while the editor is ready, else null. */
  instance(): TextEditorEngineInstance | null;
  /** The live selection while ready, else the published one. */
  selection(): TextEditorSelection;
  /** Whether the live selection is the whole-document selection. */
  wholeDocument(): boolean;
  /** The content part, which holds the editing root. */
  content(): HTMLElement | null;
  /** The fixed toolbar part, or null. */
  toolbar(): HTMLElement | null;
  viewport(): HTMLElement | null;
  overlay(): HTMLElement | null;
  underlay(): HTMLElement | null;
  /** The tool context of `surface`; `target` is what the tools act on, the selection by default. */
  toolContext(
    surface: TextEditorRequestSurface,
    target?: TextEditorToolTarget,
  ): TextEditorToolContext;
  toolEnabled(tool: TextEditorTool, context: TextEditorToolContext): boolean;
  shortcut(toolId: string): KeyShortcut | undefined;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  can(action: TextEditorAction): boolean;
  announce(message: string, options?: AnnounceOptions): void;
  diagnose(code: TextEditorDiagnosticCode, message: string): void;
  /** Restores editing focus and the selection through the adapter. */
  focusEditing(): void;
  /** Focus is in the editing root. */
  editingFocused(): boolean;
  /** Whether focus is within the widget, its top-layer surfaces included. */
  focused(): boolean;
  menuOpened(trigger: HTMLElement, modality: TextEditorMenuModality): void;
  menuClosed(changed: boolean): void;
  readonly menuFinalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
  /** The widget's one transient surface (`uwg-te-req-surfaces-6`). */
  transientOpened(
    owner: object,
    close: (reason?: ChangeReason) => void,
    reason?: ChangeReason,
  ): void;
  transientClosed(owner: object): void;
  /** Adds a surface to the Alt+F10 cycle. */
  registerContextual(surface: TextEditorContextualSurface): () => void;
  cycleContextual(sourceEvent: Event): boolean;
  /** A change of a surface's open lane with its reason (`uwg-te-tab-reasons` r12, r13). */
  lane(surface: TextEditorLaneSurface, open: boolean, reason: ChangeReason): void;
  /** The reason of the latest document change. */
  editReason(): ChangeReason | null;
  /** Whether the surface of a link, image or table-size tool is open, over every feature. */
  expanded(tool: TextEditorTool): boolean;
  /** The root attributes of the suggestion list changed. */
  referencesChanged(): void;
  /** The widget's `data-dragging` marker. */
  dragChanged(active: boolean): void;
  // What the attached features answer together
  /** A block drag is in progress. */
  dragging(): boolean;
  /** A menu that a table grip, the cell handle or the gutter opened is open. */
  menuOpen(): boolean;
  /** A suggestion list or a popover is open. */
  surfaceOpen(): boolean;
  /** The band the selection toolbar keeps clear above a cell range. */
  keepClear(): BlockBand | null;
  /** How far a table's row grips reach outside its inline-start edge. */
  gripOutset(): number;
  /** A primary press in the editing root. */
  contentPressed(): void;
  /** Whether the active element is in a surface that keeps the selection toolbar hidden. */
  focusExcluded(active: Element | null): boolean;
}

/** The runtime of a feature on one widget, which the widget drives through its own lifecycle. */
export interface TextEditorFeatureInstance {
  readonly name: TextEditorFeatureName;
  /** The widget connected. */
  connected?(): void;
  /** The widget's parts rendered and it is connected (the first update, or a reconnection). */
  partsConnected?(): void;
  /** After each render of the widget. */
  updated?(): void;
  /** After each publication of the state. */
  stateChanged?(): void;
  /** The editor became ready. */
  ready?(): void;
  /** The ready instance went away. */
  detached?(): void;
  /** Focus entered or left the widget. */
  focusChanged?(): void;
  valueChanged?(change: TextEditorValueChange): void;
  /** The widget disconnected. */
  disconnected?(): void;
  /** The feature leaves the widget: every registration and adopted style is released. */
  dispose(): void;
  /** Inside the overlay part. */
  renderOverlay?(): TemplateResult | typeof nothing;
  /** After the status, outside the viewport and the overlay. */
  renderSurfaces?(): TemplateResult | typeof nothing;
  // Router hooks, with the router host's signatures
  editingKey?(sourceEvent: KeyboardEvent): boolean;
  blockTool?(toolId: string, sourceEvent: KeyboardEvent): boolean;
  tableTab?(sourceEvent: KeyboardEvent, backward: boolean): boolean;
  suggestionKey?(sourceEvent: KeyboardEvent): boolean;
  uploadImages?(
    files: readonly File[],
    at: TextEditorSelectionInput,
    reason: 'input-paste' | 'drag',
    sourceEvent: Event,
  ): boolean;
  // Controller hooks
  /** The views the engines mount into the hosts they own. */
  readonly views?: TextEditorEngineViews | undefined;
  /** Opens the surface of a tool run without a value; whether it opened one. */
  openSurface?(tool: TextEditorTool, detail: TextEditorRequestDetail): boolean;
  /** Whether the feature uploads image files. */
  uploads?(): boolean;
  // Answers the widget and the other features read
  expanded?(tool: TextEditorTool): boolean;
  dragging?(): boolean;
  menuOpen?(): boolean;
  surfaceOpen?(): boolean;
  keepClear?(): BlockBand | null;
  gripOutset?(): number;
  contentPressed?(): void;
  focusExcluded?(active: Element | null): boolean;
  /** The id of the suggestion list the editing root references, or null. */
  suggestionList?(): string | null;
  /** Whether the block gutter shows. */
  gutter?(): boolean;
}

/** A feature of the text editor, created by its factory and assigned to `features`. */
export interface TextEditorFeature {
  readonly name: TextEditorFeatureName;
  /** The built-in tools the feature contributes, by identifier. */
  readonly tools: Readonly<Record<string, TextEditorTool>>;
  /** The library elements its templates render; the widget defines them when it attaches. */
  readonly elements: readonly CustomElementConstructorWithTag[];
  /** Structural styles adopted into the widget's shadow root while attached. */
  readonly styles?: readonly CSSResult[] | undefined;
  attach(host: TextEditorFeatureHost): TextEditorFeatureInstance;
}

/**
 * The features to attach, in `TEXT_EDITOR_FEATURE_ORDER`: of two features with one name the first
 * assigned one attaches, and `duplicate` reports the other's name once.
 */
export function orderTextEditorFeatures(
  features: readonly TextEditorFeature[],
  duplicate: (name: TextEditorFeatureName) => void,
): TextEditorFeature[] {
  const byName = new Map<TextEditorFeatureName, TextEditorFeature>();
  const reported = new Set<TextEditorFeatureName>();
  for (const feature of features) {
    if (!feature || typeof feature !== 'object') continue;
    if (byName.has(feature.name)) {
      if (!reported.has(feature.name)) {
        reported.add(feature.name);
        duplicate(feature.name);
      }
      continue;
    }
    byName.set(feature.name, feature);
  }
  return TEXT_EDITOR_FEATURE_ORDER.flatMap((name) => {
    const feature = byName.get(name);
    return feature ? [feature] : [];
  });
}
