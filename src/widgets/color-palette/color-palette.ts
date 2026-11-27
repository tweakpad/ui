import { html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { join } from 'lit/directives/join.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import {
  ControllableState,
  type ControllableStateOptions,
} from '../../foundation/controllable-state.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { fillTemplate } from '../../foundation/template.js';
import { reportDiagnostic } from '../../foundation/services.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { parseColor } from '../../foundation/color/parse.js';
import { serializeColor } from '../../foundation/color/serialize.js';
import { isColorFormat, type ColorFormat } from '../../foundation/color/types.js';
import { infoIcon } from '../../icons/info.js';
import { colorIdentity, resolveColorCollection } from '../../foundation/color-palette/parse.js';
import { defaultColorCollection } from '../../foundation/color-palette/collections/default.js';
import {
  isColorCollectionLoader,
  loadColorCollection,
  loadedColorCollection,
} from '../../foundation/color-palette/load.js';
import type {
  ColorCollection,
  ColorCollectionAttribution,
  ColorCollectionEntry,
  ColorCollectionLoader,
  ColorCollectionStatus,
  PaletteGrouping,
  PaletteSort,
  ResolvedColorCollection,
} from '../../foundation/color-palette/types.js';
import type { SortDirection } from '../../foundation/color/palette.js';
import { setPartComposition } from '../../presentation/controller.js';
import { colorPalettePresentation } from '../../presentation/families/color-palette.js';
import { TpButton } from '../../components/button/button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpMenu } from '../../components/menu/menu.js';
import { TpMenuRadioGroup } from '../../components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from '../../components/menu/menu-radio-item.js';
import { TpMenuItem } from '../../components/menu/menu-item.js';
import { TpEmptyState } from '../../components/empty-state/empty-state.js';
import { emptyStateIcons } from '../../icons/empty-state.js';
import { paletteIcon, favoriteHeartIcon } from '../../icons/color-palette.js';
import { resolveMotionTiming } from '../../foundation/motion.js';
import { contrastColor } from '../../foundation/color/contrast.js';
import { TpSeparator } from '../../components/separator/separator.js';
import { TpScrollArea } from '../../components/scroll-area/scroll-area.js';
import { TpTabs } from '../../components/tabs/tabs.js';
import { TpTooltip } from '../../components/tooltip/tooltip.js';
import { TpCopyButton } from '../../components/copy-button/copy-button.js';
import { TpTextTransform } from '../../components/text-transform/text-transform.js';
import { TpPreviewCard } from '../../components/preview-card/preview-card.js';
import { TpStack } from '../../components/stack/stack.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import { TpSpinner } from '../../components/spinner/spinner.js';
import { PaletteList, optionKey } from './list.js';
import {
  buildListModel,
  sameFavorite,
  sanitizeFavorites,
  hslText,
  listText,
  selectedKey,
  swatchInfo,
  type PaletteListModel,
  type PaletteSlot,
} from './model.js';
import { resolveStrings } from './strings.js';
import { colorPaletteStyles } from './styles.js';
import type {
  ColorPaletteChangeMetadata,
  ColorPaletteLayout,
  ColorPaletteMode,
  ColorPalettePaletteStyle,
  ColorPaletteFavorite,
  ColorPaletteFavoritesMetadata,
  ColorPalettePersistence,
  ColorPaletteSize,
  ColorPaletteStrings,
  ColorPaletteSwatchInfo,
} from './types.js';
import { renderToolbar } from './views/toolbar.js';

/** Receives each proposed color; a controlled owner writes `value` back to accept it. */
export type ColorPaletteValueChangeCallback = (event: TpValueChangeEvent<string>) => void;
/** Receives each settled color. */
export type ColorPaletteValueCommitCallback = (event: TpValueCommitEvent<string>) => void;
/** Receives each loading status change of a collection, with the collection's id. */
export type ColorPaletteLoadingStatusCallback = (
  status: ColorCollectionStatus,
  collection: string,
) => void;

/** A collection offered by the palette: a document, resolved, or a loader and what it loaded. */
interface CollectionEntry {
  readonly id: string;
  readonly label: string;
  readonly loader?: ColorCollectionLoader;
  /** Absent while a loader has not loaded. */
  readonly resolved?: ResolvedColorCollection;
}
/** The detail of the palette's `tp-value-change`. */
export type ColorPaletteChangeDetail = TpValueChangeEvent<string>['detail'];

const MODES: readonly ColorPaletteMode[] = ['colors', 'palettes', 'favorites'];
const PERSISTENCES: readonly ColorPalettePersistence[] = ['local', 'none'];
/** Where uncontrolled favorites are kept in local storage unless `storageKey` names another. */
const DEFAULT_STORAGE_KEY = 'tp-color-palette-favorites';
/** How long the heart of a new favorite stays before it leaves. */
const FAVORITE_MARK_MS = 2000;
/** The heart's arrival grows past its size to this scale, then settles back (back out). */
const FAVORITE_MARK_OVERSHOOT = 1.08;
/** The part of the arrival spent growing to the overshoot. */
const FAVORITE_MARK_PEAK = 0.6;
/** The heart stays translucent over its color. */
const FAVORITE_MARK_OPACITY = 0.75;
const PALETTE_STYLES: readonly ColorPalettePaletteStyle[] = ['stops', 'gradient'];
const GROUPINGS: readonly PaletteGrouping[] = ['collection', 'hue', 'none'];
const SORTS: readonly PaletteSort[] = ['collection', 'lightness', 'hue', 'chroma'];
const DIRECTIONS: readonly SortDirection[] = ['ascending', 'descending'];
const LAYOUTS: readonly ColorPaletteLayout[] = ['grid', 'list'];
const SIZES: readonly ColorPaletteSize[] = ['sm', 'default', 'lg'];
const DEFAULT_COLUMNS = 9;
/** Rows of medium cells the list's box holds. */
const ROWS = 6;
/**
 * Cell extents of the sizes at the default density, in pixels, as the recipe sets them; used until
 * the rendered cell is measured. The palette's box holds `columns` medium cells; another size
 * reflows the cells inside that box.
 */
const SIZE_PIXELS: Readonly<Record<ColorPaletteSize, number>> = { sm: 24, default: 32, lg: 42 };
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-presence-complete',
  'tp-action',
] as const;
const stop = (event: Event): void => event.stopPropagation();
const NESTED_HOSTS =
  'tp-scroll-area, tp-tabs, tp-button, tp-menu, tp-menu-radio-group, tp-menu-radio-item, tp-menu-item, tp-empty-state, tp-tooltip, tp-copy-button, tp-text-transform, tp-toggle, tp-preview-card';

interface ImmediateCommit {
  readonly reason: ChangeReason;
  readonly source: Event | undefined;
  readonly previous: string;
  readonly metadata: ColorPaletteChangeMetadata;
}

/**
 * One enumerated lane of the palette: a controlled and uncontrolled pair with its own cancelable
 * change event.
 */
class Lane<T> {
  provided: T | undefined;
  readonly state: ControllableState<T>;
  constructor(
    readonly host: TpColorPalette,
    initial: T,
    readDefault: () => T | undefined,
    eventFactory: NonNullable<ControllableStateOptions<T>['eventFactory']>,
    code: string,
    equals?: (a: T, b: T) => boolean,
  ) {
    this.state = new ControllableState<T>({
      host,
      initialValue: initial,
      readControlledValue: () => this.provided,
      readDefaultValue: readDefault,
      hasDefaultValue: () => readDefault() !== undefined,
      eventFactory,
      ...(equals ? { equals } : {}),
      onCommit: () => host.requestUpdate(),
      diagnostic: (message) => host.diagnose(code, message),
    });
  }
  /** A write before the first update or to a controlled lane is the owner's; later, a proposal. */
  write(next: T | undefined): void {
    if (!this.host.hasUpdated || this.state.controlled) {
      this.provided = next;
      if (this.host.hasUpdated) this.state.sync();
    } else if (next !== undefined) this.state.set(next, 'programmatic');
  }
}

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): T | undefined =>
    values.includes(value as T) ? (value as T) : undefined;

/**
 * Chooses a color from swatch collections of any size. The colors mode shows a gapless grid
 * grouped by the collection or by hue and sorted by lightness, hue or chroma, or a list of rows
 * that name each color. The palettes mode shows the collection's palettes and palettes generated
 * from the chosen color with the color theory functions, as hard stops or blended as gradients,
 * each of at most twelve colors. The cells follow the size and the density of their region.
 * Form-associated: `name` submits the chosen color.
 *
 * @fires tp-value-change - Cancelable proposal of a different color; `detail.metadata` carries the
 * picked `swatch` and the `collection` id.
 * @fires tp-value-commit - The settled color, right after an accepted pick.
 * @fires tp-collection-change - Cancelable proposal of another active collection.
 * @fires tp-loading-status-change - A collection's loading status changed.
 * @fires tp-mode-change - Cancelable proposal of another mode.
 * @fires tp-grouping-change - Cancelable proposal of another grouping of the grid.
 * @fires tp-sort-change - Cancelable proposal of another sort of the grid.
 * @fires tp-sort-direction-change - Cancelable proposal of another sort direction.
 * @fires tp-layout-change - Cancelable proposal of another layout of the colors mode.
 * @fires tp-palette-style-change - Cancelable proposal of hard stops or gradients for palettes.
 * @fires tp-favorites-change - Cancelable proposal of the favorites with a color, palette or
 * gradient added or removed; `detail.metadata` carries the `action` and the `favorite`.
 * @fires tp-size-change - Cancelable proposal of another cell size.
 * @fires tp-field-value - Each committed value, for a surrounding Field's validation state.
 */
export class TpColorPalette extends TpFormElement<string> {
  static tagName = 'tp-color-palette';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpScrollArea,
      TpTabs,
      TpButton,
      TpIcon,
      TpMenu,
      TpMenuRadioGroup,
      TpMenuRadioItem,
      TpMenuItem,
      TpEmptyState,
      TpSeparator,
      TpTooltip,
      TpCopyButton,
      TpTextTransform,
      TpPreviewCard,
      TpStack,
      TpToggle,
      TpSpinner,
    ];
  }
  static override presentation = colorPalettePresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    collections: { attribute: false },
    collection: { type: String, noAccessor: true },
    defaultCollection: { type: String, attribute: 'default-collection' },
    mode: { type: String, noAccessor: true },
    defaultMode: { type: String, attribute: 'default-mode' },
    modes: { attribute: false },
    grouping: { type: String, noAccessor: true },
    defaultGrouping: { type: String, attribute: 'default-grouping' },
    sort: { type: String, noAccessor: true },
    defaultSort: { type: String, attribute: 'default-sort' },
    sortDirection: { type: String, attribute: 'sort-direction', noAccessor: true },
    defaultSortDirection: { type: String, attribute: 'default-sort-direction' },
    layout: { type: String, noAccessor: true },
    paletteStyle: { type: String, attribute: 'palette-style', noAccessor: true },
    favorites: { attribute: false, noAccessor: true },
    defaultFavorites: { attribute: false },
    persistence: { type: String },
    format: { type: String },
    storageKey: { type: String, attribute: 'storage-key' },
    defaultPaletteStyle: { type: String, attribute: 'default-palette-style' },
    defaultLayout: { type: String, attribute: 'default-layout' },
    columns: { type: Number },
    fill: { type: Boolean, reflect: true },
    toolbar: { type: Boolean, converter: defaultTrue },
    size: { type: String, noAccessor: true },
    defaultSize: { type: String, attribute: 'default-size' },
    label: { type: String },
    locale: { type: String },
    strings: { attribute: false },
  };
  static override styles = [TpElement.styles, colorPaletteStyles];

  /** Starting color of an uncontrolled palette; form reset returns to it. */
  defaultValue: string | undefined;
  /**
   * Collections offered after the built-in default: documents, or loaders that load when chosen.
   * `colorCollectionCatalog` offers every shipped collection as a loader.
   */
  collections: readonly ColorCollectionEntry[] = [];
  /** Starting collection id of an uncontrolled collection choice. */
  defaultCollection: string | undefined;
  /** Starting mode of an uncontrolled mode choice. */
  defaultMode: ColorPaletteMode | undefined;
  /** The tabs the toolbar offers, in order; with one, the tabs are hidden. */
  modes: readonly ColorPaletteMode[] = MODES;
  /** Starting grouping of an uncontrolled grid. */
  defaultGrouping: PaletteGrouping | undefined;
  /** Starting sort of an uncontrolled grid. */
  defaultSort: PaletteSort | undefined;
  /** Starting sort direction. */
  defaultSortDirection: SortDirection | undefined;
  /** Starting layout of an uncontrolled grid. */
  defaultLayout: ColorPaletteLayout | undefined;
  /** Starting palette style of an uncontrolled palettes mode. */
  defaultPaletteStyle: ColorPalettePaletteStyle | undefined;
  /** Starting favorites of uncontrolled favorites, when local storage holds none. */
  defaultFavorites: readonly ColorPaletteFavorite[] | undefined;
  /**
   * Where favorites are kept between visits: local storage under `storage-key`, or nowhere when
   * the application owns them through `favorites`.
   */
  persistence: ColorPalettePersistence = 'local';
  /** How the status bar writes the chosen color, and what its copy button copies. */
  format: ColorFormat = 'hex';
  /** Local storage key of the favorites; palettes that share it share their favorites. */
  storageKey = DEFAULT_STORAGE_KEY;
  /** Starting cell size of an uncontrolled size. */
  defaultSize: ColorPaletteSize | undefined;
  /** Cells per row of the grid. */
  columns = DEFAULT_COLUMNS;
  /**
   * Fills its container: the palette takes the host's width and height, the grid fits as many
   * whole cells as the width holds, and the list takes the height the toolbar and status bar leave.
   */
  fill = false;
  /** Shows the toolbar: the tabs and the view options. */
  toolbar = true;
  /** Accessible name of the color list; a surrounding Field supplies it otherwise. */
  label = '';
  /** Language of the texts; the document language when empty. */
  locale = '';
  /** Replacement texts, for localization; the English ones are `colorPaletteStrings`. */
  strings: Partial<ColorPaletteStrings> = {};
  /**
   * Called synchronously with each `tp-value-change` proposal, before listeners; a controlled owner
   * writes `value` back here to accept it.
   */
  onValueChange: ColorPaletteValueChangeCallback | undefined;
  /** Called with each settled pick. */
  onValueCommitted: ColorPaletteValueCommitCallback | undefined;
  /** Called with each loading status change of a collection, before `tp-loading-status-change`. */
  onLoadingStatusChange: ColorPaletteLoadingStatusCallback | undefined;

  #provided: string | undefined;
  #strings: ColorPaletteStrings = resolveStrings();
  #immediate: ImmediateCommit | undefined;
  #model: { key: readonly unknown[]; model: PaletteListModel } | undefined;
  /** Option key of the last pick, so the picked option stays the selected one. */
  #picked: string | undefined;
  #reported = new Set<string>();
  #composed = new WeakSet<Element>();
  #composition: object | undefined;
  /** The list state that a toolbar change reveals the value against. */
  #revealKey: string | undefined;
  /** This palette's view of each loader: its status, and the token of its pending load. */
  #loads = new Map<ColorCollectionLoader, { status: ColorCollectionStatus; token?: object }>();
  /** Bumped when a load settles, so the entries are rebuilt with the loaded collection. */
  #loadVersion = 0;

  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: (a, b) => a === b,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#committed(value, previous, reason),
    diagnostic: (message) => this.diagnose('color-palette-state', message),
  });
  readonly #collection = new Lane<string>(
    this,
    '',
    () => this.defaultCollection,
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<string>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-collection-change',
      ),
    'color-palette-collection',
  );
  readonly #mode = new Lane<ColorPaletteMode>(
    this,
    'colors',
    () => oneOf(MODES)(this.defaultMode),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<ColorPaletteMode>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-mode-change',
      ),
    'color-palette-mode',
  );
  readonly #grouping = new Lane<PaletteGrouping>(
    this,
    'none',
    () => oneOf(GROUPINGS)(this.defaultGrouping),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<PaletteGrouping>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-grouping-change',
      ),
    'color-palette-grouping',
  );
  readonly #sort = new Lane<PaletteSort>(
    this,
    'collection',
    () => oneOf(SORTS)(this.defaultSort),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<PaletteSort>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-sort-change',
      ),
    'color-palette-sort',
  );
  readonly #direction = new Lane<SortDirection>(
    this,
    'ascending',
    () => oneOf(DIRECTIONS)(this.defaultSortDirection),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<SortDirection>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-sort-direction-change',
      ),
    'color-palette-sort-direction',
  );
  readonly #layout = new Lane<ColorPaletteLayout>(
    this,
    'grid',
    () => oneOf(LAYOUTS)(this.defaultLayout),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<ColorPaletteLayout>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-layout-change',
      ),
    'color-palette-layout',
  );
  readonly #paletteStyle = new Lane<ColorPalettePaletteStyle>(
    this,
    'stops',
    () => oneOf(PALETTE_STYLES)(this.defaultPaletteStyle),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<ColorPalettePaletteStyle>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-palette-style-change',
      ),
    'color-palette-palette-style',
  );
  readonly #favorites = new Lane<readonly ColorPaletteFavorite[]>(
    this,
    [],
    () => this.#initialFavorites(),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<readonly ColorPaletteFavorite[]>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-favorites-change',
      ),
    'color-palette-favorites',
    // Lists of the same favorites are equal: writing back an equal list proposes nothing.
    (a, b) =>
      a.length === b.length &&
      a.every(
        (favorite, index) => sameFavorite(favorite, b[index]!) && favorite.name === b[index]!.name,
      ),
  );
  readonly #size = new Lane<ColorPaletteSize>(
    this,
    'default',
    () => oneOf(SIZES)(this.defaultSize),
    (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent<ColorPaletteSize>(
        value,
        previous,
        reason,
        sourceEvent,
        options,
        'tp-size-change',
      ),
    'color-palette-size',
  );

  constructor() {
    super();
    // Nested constituent events stop at this shadow root; the widget republishes its own lanes.
    containNestedEvents(this, { types: NESTED_EVENT_TYPES, on: 'root' });
  }

  // ---- lanes -------------------------------------------------------------------------------

  /** The chosen color, as its swatch's CSS color text; empty when nothing is chosen. */
  override get value(): string {
    return this.#state.value;
  }
  override set value(value: string) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : String(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  /** Id of the active collection; the first of `collections` when none is set. */
  get collection(): string {
    return this.activeCollection.id;
  }
  set collection(value: string) {
    const previous = this.collection;
    this.#collection.write(value === null || value === undefined ? undefined : String(value));
    this.requestUpdate('collection', previous);
  }
  /**
   * The tab the palette shows.
   * @default 'colors'
   */
  get mode(): ColorPaletteMode {
    const mode = this.#mode.state.value;
    const offered = this.#modes();
    return offered.includes(mode) ? mode : offered[0]!;
  }
  set mode(value: ColorPaletteMode) {
    const previous = this.mode;
    this.#mode.write(oneOf(MODES)(value));
    this.requestUpdate('mode', previous);
  }
  /**
   * How the grid groups its colors: by the collection's own groups, by hue, or not at all.
   * @default 'none'
   */
  get grouping(): PaletteGrouping {
    return this.#grouping.state.value;
  }
  set grouping(value: PaletteGrouping) {
    const previous = this.grouping;
    this.#grouping.write(oneOf(GROUPINGS)(value));
    this.requestUpdate('grouping', previous);
  }
  /**
   * Order inside each group: the collection's order, or by a color feature.
   * @default 'collection'
   */
  get sort(): PaletteSort {
    return this.#sort.state.value;
  }
  set sort(value: PaletteSort) {
    const previous = this.sort;
    this.#sort.write(oneOf(SORTS)(value));
    this.requestUpdate('sort', previous);
  }
  /**
   * Direction of the sort.
   * @default 'ascending'
   */
  get sortDirection(): SortDirection {
    return this.#direction.state.value;
  }
  set sortDirection(value: SortDirection) {
    const previous = this.sortDirection;
    this.#direction.write(oneOf(DIRECTIONS)(value));
    this.requestUpdate('sortDirection', previous);
  }
  /**
   * Cells in rows, or one row per color with its name.
   * @default 'grid'
   */
  get layout(): ColorPaletteLayout {
    return this.#layout.state.value;
  }
  set layout(value: ColorPaletteLayout) {
    const previous = this.layout;
    this.#layout.write(oneOf(LAYOUTS)(value));
    this.requestUpdate('layout', previous);
  }
  /**
   * The bookmarked colors, palettes and gradients; an application that keeps them sets this and
   * `persistence` to `none`.
   */
  get favorites(): readonly ColorPaletteFavorite[] {
    return this.#favorites.state.value;
  }
  set favorites(value: readonly ColorPaletteFavorite[]) {
    const previous = this.favorites;
    this.#favorites.write(
      value === null || value === undefined ? undefined : sanitizeFavorites(value),
    );
    this.requestUpdate('favorites', previous);
  }
  /**
   * How each palette shows: hard stops side by side, or blended as one gradient.
   * @default 'stops'
   */
  get paletteStyle(): ColorPalettePaletteStyle {
    return this.#paletteStyle.state.value;
  }
  set paletteStyle(value: ColorPalettePaletteStyle) {
    const previous = this.paletteStyle;
    this.#paletteStyle.write(oneOf(PALETTE_STYLES)(value));
    this.requestUpdate('paletteStyle', previous);
  }
  /**
   * Cell size of the grid and the list.
   * @default 'default'
   */
  get size(): ColorPaletteSize {
    return this.#size.state.value;
  }
  set size(value: ColorPaletteSize) {
    const previous = this.size;
    this.#size.write(oneOf(SIZES)(value));
    this.requestUpdate('size', previous);
  }

  // ---- read-only state ---------------------------------------------------------------------

  /** The active collection, parsed; until a loader's collection loads, only its id and name. */
  get activeCollection(): ResolvedColorCollection {
    const entry = this.#activeEntry();
    return entry.resolved ?? placeholder(entry);
  }
  /** Loading status of the active collection; documents are `loaded`. */
  get collectionStatus(): ColorCollectionStatus {
    const loader = this.#activeEntry().loader;
    return loader ? this.#statusOf(loader) : 'loaded';
  }
  /** The highlighted color and where it is listed. */
  get activeSwatch(): ColorPaletteSwatchInfo | null {
    const key = this.#list.highlighted;
    const slot = key === undefined ? undefined : this.#listModel().slots.get(key);
    return slot ? swatchInfo(slot) : null;
  }
  /** Whether the value is owned by the application through `value`. */
  get controlled(): boolean {
    return this.#state.controlled;
  }

  // ---- methods -----------------------------------------------------------------------------

  /** Proposes and commits a value; returns whether it was accepted. */
  setValue(value: string, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    return this.#propose(String(value ?? ''), reason, sourceEvent, {});
  }
  /** Scrolls the value's color into view and highlights it; false when it is not listed. */
  async scrollToValue(): Promise<boolean> {
    await this.updateComplete;
    const key = this.#selectedKey();
    if (key === undefined) return false;
    this.#list.highlight(key, true);
    return true;
  }

  // ---- lifecycle ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker (Field's selector list is closed).
    this.setAttribute('data-field-control', '');
    this.#probes = undefined;
  }

  override disconnectedCallback(): void {
    this.#probeObserver?.disconnect();
    this.#probeObserver = undefined;
    // A load cut short by disconnection is ignored and starts again on reconnection; the shared
    // request itself finishes, so the next start finds its document.
    for (const [loader, load] of this.#loads)
      if (load.status === 'loading') this.#loads.delete(loader);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('strings')) this.#strings = resolveStrings(this.strings);
    this.#state.initialize();
    for (const lane of this.#lanes()) lane.state.initialize();
    // Only the active collection loads; the others wait until they are chosen.
    const loader = this.#activeEntry().loader;
    if (loader && this.isConnected && this.#statusOf(loader) === 'idle') this.#load(loader);
    if (changed.has('columns') && !this.#validColumns() && this.columns !== DEFAULT_COLUMNS)
      this.diagnose(
        'color-palette-columns',
        `columns must be a positive integer; ${String(this.columns)} uses ${DEFAULT_COLUMNS}.`,
      );
    for (const { resolved: collection } of this.#entries())
      for (const issue of collection?.issues ?? [])
        reportDiagnostic(
          this,
          { code: issue.code, message: issue.message, severity: 'warning' },
          { once: this.#reported },
        );
    const id = this.#collection.state.value;
    if (id && !this.#entries().some((entry) => entry.id === id))
      reportDiagnostic(
        this,
        {
          code: 'color-palette-collection',
          message: `No collection "${id}"; the first loaded collection is shown.`,
          severity: 'warning',
        },
        { once: this.#reported },
      );
    this.#list.sync();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-empty', !this.value);
    const status = this.collectionStatus;
    this.setAttribute('data-status', status);
    this.toggleAttribute('data-loading', status === 'loading' || status === 'idle');
    this.toggleAttribute('data-error', status === 'error');
    this.setAttribute('data-mode', this.mode);
    this.setAttribute('data-grouping', this.grouping);
    this.setAttribute('data-sort', this.sort);
    this.setAttribute('data-layout', this.layout);
    this.setAttribute('data-palette-style', this.paletteStyle);
    this.#storeFavorites();
    this.setFormValue(this.value || null, this.value);
    this.setRequiredValidity(this.required && !this.value, this.#strings.valueMissing);
    this.#syncComposition();
    this.#observeProbes();
    this.#revealAfterViewChange();
    this.#runFavoriteMarks();
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.#state.set(state, 'programmatic', undefined, { cancelable: false });
  }

  override get inputElement(): HTMLElement | null {
    return this.#listbox;
  }

  protected override focusTarget(): HTMLElement | null {
    return this.#listbox ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="color-palette"]');
  }

  /** Reports a diagnostic from this palette. */
  override diagnose(code: string, message: string): void {
    super.diagnose(code, message);
  }

  // ---- model -------------------------------------------------------------------------------

  #lanes(): readonly Lane<unknown>[] {
    return [
      this.#collection,
      this.#mode,
      this.#grouping,
      this.#sort,
      this.#direction,
      this.#layout,
      this.#paletteStyle,
      this.#favorites,
      this.#size,
    ] as unknown as readonly Lane<unknown>[];
  }

  #entriesCache:
    | { source: readonly ColorCollectionEntry[]; version: number; entries: CollectionEntry[] }
    | undefined;
  /**
   * The offered collections: the default first, then `collections` in order (a given default is
   * not repeated), each loader with its collection once loaded.
   */
  #entries(): CollectionEntry[] {
    const source = this.collections ?? [];
    const cached = this.#entriesCache;
    if (cached?.source === source && cached.version === this.#loadVersion) return cached.entries;
    const given = source.filter((entry) => entry && entry.id !== defaultColorCollection.id);
    const entries = [defaultColorCollection, ...given].map((entry): CollectionEntry => {
      if (!isColorCollectionLoader(entry)) {
        const resolved = resolveColorCollection(entry);
        return { id: resolved.id, label: resolved.name ?? resolved.id, resolved };
      }
      const document = loadedColorCollection(entry);
      const resolved = document ? resolveColorCollection(named(document, entry.id)) : undefined;
      return {
        id: entry.id,
        label: resolved?.name ?? entry.name ?? entry.id,
        loader: entry,
        ...(resolved ? { resolved } : {}),
      };
    });
    this.#entriesCache = { source, version: this.#loadVersion, entries };
    return entries;
  }

  /** The chosen collection, otherwise the first given one, or the default. */
  #activeEntry(): CollectionEntry {
    const entries = this.#entries();
    const id = this.#collection.state.value;
    return entries.find((entry) => entry.id === id) ?? entries[1] ?? entries[0]!;
  }

  /** This palette's status of a loader: `loaded` at once when another palette loaded it. */
  #statusOf(loader: ColorCollectionLoader): ColorCollectionStatus {
    const status = this.#loads.get(loader)?.status;
    if (status) return status;
    return loadedColorCollection(loader) ? 'loaded' : 'idle';
  }

  #setStatus(loader: ColorCollectionLoader, status: ColorCollectionStatus, error?: unknown): void {
    const token = status === 'loading' ? {} : undefined;
    this.#loads.set(loader, { status, ...(token ? { token } : {}) });
    if (status !== 'loading') this.#loadVersion++;
    this.onLoadingStatusChange?.(status, loader.id);
    this.emit('tp-loading-status-change', {
      status,
      collection: loader.id,
      ...(status === 'error' ? { error } : {}),
    });
    this.requestUpdate();
  }

  /** Loads a collection; Retry calls it again after a failure. */
  #load(loader: ColorCollectionLoader): void {
    this.#setStatus(loader, 'loading');
    const token = this.#loads.get(loader)?.token;
    loadColorCollection(loader).then(
      (document) => {
        if (this.#loads.get(loader)?.token !== token) return;
        if (document.id !== loader.id)
          reportDiagnostic(
            this,
            {
              code: 'color-palette-collection-load',
              message: `The loader "${loader.id}" loaded the collection "${document.id}"; it is offered as "${loader.id}".`,
              severity: 'warning',
            },
            { once: this.#reported },
          );
        this.#setStatus(loader, 'loaded');
      },
      (error: unknown) => {
        if (this.#loads.get(loader)?.token !== token) return;
        this.diagnose(
          'color-palette-collection-load',
          `The collection "${loader.id}" could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.#setStatus(loader, 'error', error);
      },
    );
  }

  #retry = (): void => {
    const loader = this.#activeEntry().loader;
    if (loader && this.#statusOf(loader) === 'error') this.#load(loader);
  };

  #modes(): readonly ColorPaletteMode[] {
    const modes = (this.modes ?? []).filter((mode) => MODES.includes(mode));
    return modes.length ? modes : MODES;
  }

  #validColumns(): boolean {
    return Number.isInteger(this.columns) && this.columns > 0;
  }

  /** Medium cells per row of the palette's box. */
  #columns(): number {
    return this.#validColumns() ? this.columns : DEFAULT_COLUMNS;
  }

  /**
   * Cells of the current size that fit in a row of the box: the size reflows, the box stays. The
   * rendered cell and medium cell are measured, since the density of the region sets them.
   */
  #cellColumns(): number {
    const cell = this.#measured?.cell || SIZE_PIXELS[this.size] || SIZE_PIXELS.default;
    // A filling palette fits whole cells across the width its box leaves for them.
    if (this.fill && this.#measured?.width)
      return Math.max(1, Math.floor((this.#measured.width - this.#measured.chrome) / cell + 1e-6));
    const frame = this.#measured?.frame || SIZE_PIXELS.default;
    return Math.max(1, Math.floor((this.#columns() * frame) / cell + 1e-6));
  }

  #measured: { cell: number; frame: number; chrome: number; width: number } | undefined;

  /** A row's extent: the cell of the current size, stretched across the width when filling. */
  #cellExtent(): number {
    const measured = this.#measured;
    if (this.fill && measured?.width)
      return (measured.width - measured.chrome) / this.#cellColumns();
    return measured?.cell || SIZE_PIXELS[this.size] || SIZE_PIXELS.default;
  }
  #probes: readonly Element[] | undefined;
  #probeObserver: ResizeObserver | undefined;

  /** Follows the rendered cell and medium cell, which the size and the region's density set. */
  #observeProbes(): void {
    const root = this.renderRoot.querySelector('.root');
    const probes = [...this.renderRoot.querySelectorAll('.probe > span')];
    if (
      !root ||
      probes.length !== 3 ||
      [...probes, root].every((probe, index) => this.#probes?.[index] === probe)
    )
      return;
    this.#probes = [...probes, root];
    this.#probeObserver?.disconnect();
    const view = this.ownerDocument.defaultView;
    if (!view?.ResizeObserver) return;
    this.#probeObserver = new view.ResizeObserver(() => {
      const [cell, frame, chrome] = probes.map((probe) => probe.getBoundingClientRect().width);
      if (!cell || !frame) return;
      const previous = this.#cellColumns();
      this.#measured = {
        cell,
        frame,
        chrome: chrome ?? 0,
        width: root.getBoundingClientRect().width,
      };
      if (this.#cellColumns() !== previous) this.requestUpdate();
    });
    for (const probe of [...probes, root]) this.#probeObserver.observe(probe);
  }

  #listModel(): PaletteListModel {
    const collection = this.activeCollection;
    const mode = this.mode;
    const key = [
      collection,
      mode,
      this.layout,
      this.paletteStyle,
      this.mode === 'favorites' ? this.favorites : undefined,
      this.grouping,
      this.sort,
      this.sortDirection,
      this.#strings,
      this.#cellColumns(),
    ] as const;
    const cached = this.#model;
    if (cached && cached.key.every((part, index) => part === key[index])) return cached.model;
    const model = buildListModel({
      collection,
      mode,
      layout: this.layout,
      paletteStyle: this.paletteStyle,
      grouping: this.grouping,
      sort: this.sort,
      direction: this.sortDirection,
      strings: this.#strings,
      columns: this.#cellColumns(),
      favorites: this.favorites,
    });
    this.#model = { key, model };
    return model;
  }

  #selectedKey(): string | undefined {
    return selectedKey(this.#listModel(), this.value, this.#picked, identityOf);
  }

  // ---- favorites ---------------------------------------------------------------------------

  /** The favorites text last read from or written to local storage. */
  #storedText: string | undefined;

  /** Uncontrolled favorites start from local storage, otherwise from `defaultFavorites`. */
  #initialFavorites(): readonly ColorPaletteFavorite[] | undefined {
    if (this.persistence === 'local') {
      try {
        const text = this.ownerDocument.defaultView?.localStorage.getItem(this.#storageKey());
        if (text) {
          this.#storedText = text;
          return sanitizeFavorites(JSON.parse(text));
        }
      } catch {
        // Unreadable or unavailable storage: start from the default.
      }
    }
    return this.defaultFavorites ? sanitizeFavorites(this.defaultFavorites) : undefined;
  }

  #storageKey(): string {
    return this.storageKey || DEFAULT_STORAGE_KEY;
  }

  /** Keeps uncontrolled favorites in local storage; controlled favorites are the owner's. */
  #storeFavorites(): void {
    if (oneOf(PERSISTENCES)(this.persistence) !== 'local' || this.#favorites.state.controlled)
      return;
    const text = JSON.stringify(this.favorites);
    if (text === this.#storedText || (this.#storedText === undefined && text === '[]')) return;
    this.#storedText = text;
    try {
      this.ownerDocument.defaultView?.localStorage.setItem(this.#storageKey(), text);
    } catch {
      // Storage can be unavailable (privacy modes, quotas); the favorites still apply.
    }
  }

  /** The favorite an option bookmarks: its color, or its whole palette in the shown style. */
  #favoriteOf(key: string): ColorPaletteFavorite | undefined {
    const slot = this.#listModel().slots.get(key);
    if (!slot) return undefined;
    if (this.mode === 'colors')
      return {
        kind: 'color',
        value: slot.swatch.value,
        ...(slot.swatch.name ? { name: slot.swatch.name } : {}),
      };
    const set = slot.set;
    if (this.mode !== 'palettes' || !set) return undefined;
    return {
      kind: this.paletteStyle === 'gradient' ? 'gradient' : 'palette',
      ...(set.name ? { name: set.name } : {}),
      colors: set.swatches.map((swatch) => swatch.value),
      ...(set.weights ? { weights: set.weights } : {}),
    };
  }

  /**
   * The chosen color or palette as a favorite: the bookmark the status bar's heart toggles, with
   * its place in the favorites when it is one.
   */
  #chosenFavorite(): { key: string; favorite: ColorPaletteFavorite; index: number } | undefined {
    const key = this.#selectedKey();
    if (key === undefined) return undefined;
    if (this.mode === 'favorites') {
      const index = this.#listModel().slots.get(key)?.favorite;
      const favorite = index === undefined ? undefined : this.favorites[index];
      return favorite && index !== undefined ? { key, favorite, index } : undefined;
    }
    const favorite = this.#favoriteOf(key);
    if (!favorite) return undefined;
    return {
      key,
      favorite,
      index: this.favorites.findIndex((entry) => sameFavorite(entry, favorite)),
    };
  }

  /** The status bar's heart: bookmarks the chosen color or palette, or removes its bookmark. */
  #favoriteToggle = (event: Event): void => {
    event.stopPropagation();
    const chosen = this.#chosenFavorite();
    if (!chosen) return;
    const { key, favorite, index } = chosen;
    if (index >= 0) {
      this.#proposeFavorites(
        this.favorites.filter((_, position) => position !== index),
        'item-press',
        event,
        { action: 'remove', favorite: this.favorites[index]! },
      );
      return;
    }
    if (
      this.#proposeFavorites([...this.favorites, favorite], 'item-press', event, {
        action: 'add',
        favorite,
      })
    )
      this.#markFavorite(key);
  };

  #proposeFavorites(
    next: readonly ColorPaletteFavorite[],
    reason: ChangeReason,
    event: Event,
    metadata: ColorPaletteFavoritesMetadata,
  ): boolean {
    if (this.readOnly || this.effectiveDisabled) return false;
    return this.#favorites.state.set(next, reason, event, { metadata });
  }

  /**
   * A double click on a color bookmarks it, on a palette the whole palette; in the favorites it
   * removes the favorite.
   */
  #favoriteDoubleClick = (event: MouseEvent): void => {
    const key = optionKey(event);
    // In the favorites, a double click removes the favorite instead.
    if (this.mode === 'favorites') {
      if (key !== undefined) this.#removeFavoriteOf(key, 'item-press', event);
      return;
    }
    const favorite = key === undefined ? undefined : this.#favoriteOf(key);
    if (!favorite || this.favorites.some((entry) => sameFavorite(entry, favorite))) return;
    if (
      this.#proposeFavorites([...this.favorites, favorite], 'item-press', event, {
        action: 'add',
        favorite,
      })
    )
      this.#markFavorite(key!);
  };

  /**
   * Hearts that signal new favorites, by the key of the color option or of the palette row they
   * show in, with the color a palette row's heart takes.
   */
  readonly #marks = new Map<string, string | undefined>();
  readonly #marksRunning = new Set<string>();

  /** Shows a heart in the color, or across the palette row, that just became a favorite. */
  #markFavorite(key: string): void {
    const model = this.#listModel();
    const slot = model.slots.get(key);
    if (!slot) return;
    if (!slot.set) {
      this.#marks.set(key, undefined);
    } else {
      const row = model.units[model.rowOf.get(key) ?? -1];
      if (!row || row.kind !== 'row') return;
      // The heart sits at the middle of the row: it takes the contrast of the color there.
      const shares = row.slots.map((entry) => entry.share ?? 1 / row.slots.length);
      let start = 0;
      const middle =
        row.slots.find((_, index) => (start += shares[index]!) >= 0.5) ?? row.slots[0]!;
      this.#marks.set(row.key, contrastColor(middle.swatch.color));
    }
    this.#marksRunning.delete(slot.set ? (model.units[model.rowOf.get(key)!]?.key ?? key) : key);
    this.requestUpdate();
  }

  /** Runs the hearts rendered since the last update: fade and scale in, stay, fade out. */
  #runFavoriteMarks(): void {
    for (const key of this.#marks.keys()) {
      if (this.#marksRunning.has(key)) continue;
      this.#marksRunning.add(key);
      void this.#runFavoriteMark(key);
    }
  }

  async #runFavoriteMark(key: string): Promise<void> {
    const find = () =>
      this.renderRoot.querySelector<HTMLElement>(`.favorite-mark[data-mark="${CSS.escape(key)}"]`);
    const mark = find();
    if (mark) {
      // A back out from the motion roles: the enter curve grows past the size, the standard curve
      // settles back.
      const enter = resolveMotionTiming(mark, 'normal', 'enter');
      const settle = resolveMotionTiming(mark, 'normal', 'standard');
      await mark
        .animate(
          [
            { opacity: 0, scale: 0.4, easing: enter.easing },
            {
              opacity: FAVORITE_MARK_OPACITY,
              scale: FAVORITE_MARK_OVERSHOOT,
              offset: FAVORITE_MARK_PEAK,
              easing: settle.easing,
            },
            { opacity: FAVORITE_MARK_OPACITY, scale: 1 },
          ],
          { duration: enter.duration, fill: 'both' },
        )
        .finished.catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, FAVORITE_MARK_MS));
    // The row may have scrolled out of the window and back: leave from the current element.
    const current = find();
    if (current) {
      const exit = resolveMotionTiming(current, 'fast', 'exit');
      await current
        .animate(
          [
            { opacity: FAVORITE_MARK_OPACITY, scale: 1 },
            { opacity: 0, scale: 0.8 },
          ],
          { duration: exit.duration, easing: exit.easing, fill: 'forwards' },
        )
        .finished.catch(() => undefined);
    }
    this.#marks.delete(key);
    this.#marksRunning.delete(key);
    this.requestUpdate();
  }

  /** The heart of a new favorite, decorative: the change event announces the favorite. */
  #renderFavoriteMark(key: string): unknown {
    if (!this.#marks.has(key)) return nothing;
    const color = this.#marks.get(key);
    return html`<span
      class="favorite-mark"
      part="color-palette-favorite-mark"
      data-mark=${key}
      aria-hidden="true"
      style=${color ? `color:${color}` : ''}
      ><tp-icon .icon=${favoriteHeartIcon} size="var(--tp-icon-size-md)"></tp-icon
    ></span>`;
  }

  /** Removes the favorite an option of the favorites mode belongs to. */
  #removeFavoriteOf(key: string, reason: ChangeReason, event: Event): void {
    const index = this.#listModel().slots.get(key)?.favorite;
    const favorite = index === undefined ? undefined : this.favorites[index];
    if (index === undefined || !favorite) return;
    const keys = this.#listModel().keys;
    const at = keys.indexOf(key);
    const next = this.favorites.filter((_, position) => position !== index);
    if (!this.#proposeFavorites(next, reason, event, { action: 'remove', favorite })) return;
    // The highlight moves to the option that takes the removed one's place.
    void this.updateComplete.then(() => {
      const after = this.#listModel().keys;
      this.#list.highlight(after[Math.min(at, after.length - 1)], true);
    });
  }

  /** The option the favorites context menu acts on. */
  #contextKey: string | undefined;

  /**
   * A context click on a favorite opens its menu; anywhere else, and in the other modes, the
   * browser's own menu opens.
   */
  #listContextMenu = (event: MouseEvent): void => {
    const key = this.mode === 'favorites' ? optionKey(event) : undefined;
    if (key === undefined) {
      event.stopPropagation();
      return;
    }
    this.#contextKey = key;
    this.#list.highlight(key);
  };

  /** Whether the open favorites menu was opened from the keyboard, to return focus to the list. */
  #menuFromKeyboard = false;

  /**
   * Opens the favorites menu from the keyboard at the highlighted favorite, as a context click
   * inside it would, then focuses its command.
   */
  #openFavoriteMenu(key: string): void {
    const option = this.renderRoot.querySelector<HTMLElement>(`#${CSS.escape(optionId(key))}`);
    const menu = this.renderRoot.querySelector<TpMenu>('tp-menu.favorites-menu');
    if (!option || !menu) return;
    const box = option.getBoundingClientRect();
    this.#menuFromKeyboard = true;
    option.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        composed: true,
        cancelable: true,
        button: 2,
        clientX: box.left + Math.min(box.width / 2, 24),
        clientY: box.top + box.height / 2,
      }),
    );
    void menu.updateComplete.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (menu.open) menu.querySelector<HTMLElement>('tp-menu-item')?.focus();
        }),
      ),
    );
  }

  /** A menu opened from the keyboard returns focus to the list when it closes. */
  #favoriteMenuClosed = (event: Event): void => {
    event.stopPropagation();
    const menu = event.currentTarget as TpMenu;
    if (menu.open || !this.#menuFromKeyboard) return;
    this.#menuFromKeyboard = false;
    this.#listbox?.focus({ preventScroll: true });
  };

  #favoriteAction = (event: CustomEvent<{ value: unknown; sourceEvent?: Event }>): void => {
    event.stopPropagation();
    const key = this.#contextKey;
    if (event.detail.value === 'remove' && key !== undefined)
      this.#removeFavoriteOf(key, 'item-press', event);
  };

  /** Delete and Backspace remove the highlighted favorite; the menu keys open its menu. */
  #listKeyDown = (event: KeyboardEvent): void => {
    if (this.mode === 'favorites' && !event.defaultPrevented) {
      const highlighted = this.#list.highlighted;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (highlighted !== undefined) {
          event.preventDefault();
          this.#removeFavoriteOf(highlighted, 'keyboard', event);
        }
        return;
      }
      if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
        event.stopPropagation();
        if (highlighted !== undefined) {
          event.preventDefault();
          this.#openFavoriteMenu(highlighted);
        }
        return;
      }
    } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
      event.stopPropagation();
    this.#list.keyDown(event);
  };

  // ---- picks -------------------------------------------------------------------------------

  #pick = (key: unknown, event: Event): void => {
    if (this.readOnly || this.effectiveDisabled) return;
    const slot = this.#listModel().slots.get(String(key));
    if (!slot) return;
    const reason: ChangeReason = event.type.startsWith('key') ? 'keyboard' : 'item-press';
    const value = slot.swatch.value;
    if (value === this.value) {
      this.#picked = slot.key;
      this.requestUpdate();
      return;
    }
    if (
      this.#propose(value, reason, event, {
        swatch: swatchInfo(slot),
        collection: this.activeCollection.id,
      })
    )
      this.#picked = slot.key;
  };

  #propose(
    value: string,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    metadata: ColorPaletteChangeMetadata,
  ): boolean {
    const previous = this.value;
    this.#immediate = { reason, source: sourceEvent, previous, metadata };
    const accepted = this.#state.set(value, reason, sourceEvent, { metadata });
    if (!accepted || !this.controlled) this.#immediate = undefined;
    return accepted;
  }

  #committed(value: string, previous: string, reason: ChangeReason): void {
    this.emit('tp-field-value', { value, previousValue: previous, reason });
    const immediate = this.#immediate;
    if (immediate) {
      this.#immediate = undefined;
      if (value !== immediate.previous) {
        const event = new TpValueCommitEvent<string>(
          value,
          immediate.previous,
          immediate.reason,
          immediate.source,
          { metadata: immediate.metadata },
        );
        this.onValueCommitted?.(event);
        this.dispatchEvent(event);
      }
    }
    this.requestUpdate('value', previous);
  }

  // ---- constituents ------------------------------------------------------------------------

  /** The listbox of the colors, which takes focus. */
  get #listbox(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>('.list') ?? null;
  }

  /** The viewport of the Scroll area around the listbox, which scrolls it. */
  get #viewport(): HTMLElement | null {
    return (
      this.renderRoot?.querySelector?.<TpScrollArea>('tp-scroll-area')?.viewportElement ?? null
    );
  }

  /** The color list over the Foundation virtual window and choice collection. */
  readonly #list = new PaletteList(this, {
    model: () => this.#listModel(),
    listbox: () => this.#listbox,
    viewport: () => this.#viewport,
    extent: () => this.#cellExtent(),
    selected: () => this.#selectedKey(),
    disabled: () => this.effectiveDisabled,
    locale: () => this.locale || undefined,
    pick: (key, event) => this.#pick(key, event),
    highlighted: () => this.requestUpdate(),
  });

  /** Stable references per row key, so a row's extent is followed across renders. */
  readonly #rowRefs = new Map<string, (element: HTMLElement | null) => void>();
  #rowRef(key: string): (element: HTMLElement | null) => void {
    let reference = this.#rowRefs.get(key);
    if (!reference) {
      reference = (element) => this.#list.observe(key, element ?? null);
      this.#rowRefs.set(key, reference);
    }
    return reference;
  }

  /** Re-proposes a constituent's change on `lane`; a rejected proposal cancels the constituent's. */
  #relay<T>(lane: Lane<T>, read: (value: unknown) => T | undefined) {
    return (event: TpValueChangeEvent<unknown>): void => {
      event.stopPropagation();
      const { reason, sourceEvent } = event.detail;
      const next = read(event.detail.value);
      if (next === undefined || this.effectiveDisabled) {
        event.preventDefault();
        return;
      }
      if (!lane.state.set(next, reason === 'keyboard' ? 'keyboard' : 'item-press', sourceEvent))
        event.preventDefault();
    };
  }

  #onMode = this.#relay(this.#mode, (value) =>
    oneOf(MODES)(Array.isArray(value) ? value[0] : value),
  );
  #onCollection = this.#relay(this.#collection, (value) =>
    typeof value === 'string' && value ? value : undefined,
  );
  #onLayout = this.#relay(this.#layout, oneOf(LAYOUTS));
  #onPaletteStyle = this.#relay(this.#paletteStyle, oneOf(PALETTE_STYLES));
  #onSize = this.#relay(this.#size, oneOf(SIZES));

  /**
   * Group by: Auto proposes the hue grouping ordered by lightness, Collection the collection's own
   * groups and order, and None one flat group in the collection's order; each choice proposes the
   * grouping and the sort as one transaction in which both lanes change or neither, so a choice
   * shows the same order whatever was chosen before.
   */
  #onGroups = (event: TpValueChangeEvent<unknown>): void => {
    event.stopPropagation();
    const { reason, sourceEvent } = event.detail;
    const choice = event.detail.value;
    if (this.effectiveDisabled || !['auto', 'collection', 'none'].includes(choice as string)) {
      event.preventDefault();
      return;
    }
    const lane = reason === 'keyboard' ? 'keyboard' : 'item-press';
    const grouping: PaletteGrouping =
      choice === 'auto' ? 'hue' : choice === 'none' ? 'none' : 'collection';
    const accepted = ControllableState.transaction([
      this.#grouping.state.proposal(grouping, lane, sourceEvent),
      this.#sort.state.proposal(choice === 'auto' ? 'lightness' : 'collection', lane, sourceEvent),
    ]);
    if (!accepted) event.preventDefault();
  };

  /** After a mode, collection, grouping or sort change, the value comes into view. */
  #revealAfterViewChange(): void {
    const key = [
      this.activeCollection.id,
      this.mode,
      this.layout,
      this.grouping,
      this.sort,
      this.sortDirection,
    ].join('|');
    if (key === this.#revealKey) return;
    const first = this.#revealKey === undefined;
    this.#revealKey = key;
    if (!this.value) return;
    void this.updateComplete.then(() => {
      const selected = this.#selectedKey();
      if (selected === undefined) return;
      // The first render scrolls the value's group to the top; later views reveal its row.
      if (first) this.#list.showGroupOf(selected);
      else this.#list.reveal(selected);
    });
  }

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    for (const nested of this.renderRoot.querySelectorAll<HTMLElement>(NESTED_HOSTS)) {
      if (!changed && this.#composed.has(nested)) continue;
      this.#composed.add(nested);
      setPartComposition(
        nested as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
  }

  // ---- render ------------------------------------------------------------------------------

  /** Whether the grid shows one row per color. */
  #listLayout(): boolean {
    return this.mode === 'colors' && this.layout === 'list';
  }

  /** Accessible name of an option: the text it shows, then its color text and share. */
  #optionName(slot: PaletteSlot): string {
    const { swatch } = slot;
    // A list row's name starts with the text it shows.
    const shown = swatch.name ?? (this.#listLayout() ? hslText(swatch, this.#strings) : undefined);
    const parts = [shown ? `${shown}, ${swatch.value}` : swatch.value];
    if (slot.share !== undefined)
      parts.push(fillTemplate(this.#strings.share, { share: Math.round(slot.share * 100) }));
    // In the favorites, the section names the kind: the palette's own name follows.
    if (this.mode === 'favorites' && slot.setName) parts.push(slot.setName);
    return parts.join(', ');
  }

  /** The favorites' context menu: its target is the Scroll area, its subject the option. */
  #renderFavoritesMenu(): unknown {
    if (this.mode !== 'favorites' || !this.favorites.length || this.effectiveDisabled)
      return nothing;
    return html`<tp-menu
      class="favorites-menu"
      invocation="context"
      .portal=${false}
      label=${this.#strings.modeFavorites}
      @tp-action=${this.#favoriteAction}
      @tp-open-change=${stop}
      @tp-open-change-complete=${this.#favoriteMenuClosed}
      ><tp-menu-item value="remove" variant="destructive"
        >${this.#strings.removeFavorite}</tp-menu-item
      ></tp-menu
    >`;
  }

  /** The listbox: its mounted groups, label rows and option rows, with spaces for the rest. */
  #renderList(model: PaletteListModel, label: string, state: Record<string, unknown>): unknown {
    // The favorites do not depend on the collection; the colors and palettes wait for it.
    const status = this.mode === 'favorites' ? 'loaded' : this.collectionStatus;
    if (status === 'error') return this.#renderLoadError();
    if (status !== 'loaded') return this.#renderLoading();
    if (!model.units.length) return this.#renderEmpty();
    const highlighted = this.#list.highlighted;
    const selected = this.#selectedKey();
    const disabled = this.effectiveDisabled;
    const list = this.#listLayout();
    type Block = { readonly key: string; readonly group: number; readonly content: unknown[] };
    const blocks: Block[] = [];
    let open: Block | undefined;
    for (const slot of this.#list.slots()) {
      if (slot.kind === 'space') {
        const space = html`<div
          class="space"
          aria-hidden="true"
          style=${`block-size:${slot.extent}px`}
        ></div>`;
        if (open) open.content.push(space);
        else blocks.push({ key: slot.key, group: -1, content: [space] });
        continue;
      }
      const unit = model.units[slot.index]!;
      if (open?.group !== unit.group) {
        open = { key: model.groups[unit.group]!.key, group: unit.group, content: [] };
        blocks.push(open);
      }
      const group = model.groups[unit.group]!;
      open.content.push(
        unit.kind === 'label'
          ? this.renderPart('color-palette-group-label', state, {
              tag: 'div',
              properties: {
                part: 'color-palette-group-label',
                class: 'label',
                'aria-hidden': 'true',
                'data-section': group.section,
              },
              reference: this.#rowRef(unit.key),
              content: group.label,
            })
          : this.renderPart('color-palette-row', state, {
              tag: 'div',
              properties: {
                part: 'color-palette-row',
                class: 'row',
                role: 'presentation',
                'data-palette': unit.palette,
                'data-blend': !!unit.palette && unit.slots.some((option) => option.blend),
                // A palette is selected as a whole: its row carries the mark, not the color.
                'data-selected':
                  !!unit.palette && unit.slots.some((option) => option.key === selected),
              },
              reference: this.#rowRef(unit.key),
              content: html`${repeat(
                unit.slots,
                (option) => option.key,
                (option) =>
                  this.#renderOption(option, {
                    selected: option.key === selected,
                    highlighted: option.key === highlighted,
                    disabled,
                    list,
                    member: !!unit.palette,
                  }),
              )}${this.#renderFavoriteMark(unit.key)}`,
            }),
      );
    }
    return this.renderPart('color-palette-list', state, {
      tag: 'div',
      properties: {
        part: 'color-palette-list',
        class: 'list',
        role: 'listbox',
        tabindex: disabled ? -1 : 0,
        'aria-label': label,
        'aria-activedescendant':
          highlighted !== undefined && !disabled ? optionId(highlighted) : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-readonly': this.readOnly ? 'true' : undefined,
        '@keydown': this.#listKeyDown,
        '@dblclick': this.#favoriteDoubleClick,
        '@contextmenu': this.#listContextMenu,
        '@focusin': this.#list.focusIn,
        '@pointermove': this.#list.pointerMove,
        '@click': this.#list.click,
      },
      content: repeat(
        blocks,
        (block) => block.key,
        (block) =>
          block.group < 0
            ? block.content
            : this.renderPart('color-palette-group', state, {
                tag: 'div',
                properties: {
                  part: 'color-palette-group',
                  class: 'group',
                  role: model.groups[block.group]!.name ? 'group' : 'presentation',
                  'aria-label': model.groups[block.group]!.name,
                },
                content: block.content,
              }),
      ),
    });
  }

  /**
   * The status bar: a copy button and the chosen color in `format`, or the chosen palette's name
   * and size; with nothing chosen, an info icon that credits the collection's source and license
   * (in a Preview Card with the description when the collection has one), then its summary.
   */
  #renderStatus(model: PaletteListModel, collection: ResolvedColorCollection): unknown {
    const strings = this.#strings;
    const format = isColorFormat(this.format) ? this.format : 'hex';
    const key = this.#selectedKey();
    const slot = key === undefined ? undefined : model.slots.get(key);
    // The name truncates; the count or the color text beside it stays whole.
    const named = (name: string, rest: unknown) =>
      html`<tp-text-transform class="status-name" truncate="end">${name}</tp-text-transform
        >${rest}`;
    const count = (value: number, one: string, other: string) =>
      fillTemplate(
        new Intl.PluralRules(this.locale || undefined).select(value) === 'one' ? one : other,
        {
          count: value.toLocaleString(this.locale || undefined),
        },
      );
    const summary = (value: string) =>
      html`<span class="status-count"
        >${fillTemplate(strings.summaryCount, { count: value })}</span
      >`;
    let text: unknown;
    let copy = '';
    if (slot?.set) {
      // A palette is chosen as a whole: its name and size, and all its colors to copy.
      const colors = slot.set.swatches.map((swatch) => serializeColor(swatch.color, format));
      copy = colors.join(', ');
      text = named(
        slot.setName ?? '',
        summary(count(colors.length, strings.colorCountOne, strings.colorCount)),
      );
    } else {
      // The bar follows the visible selection: a value the active collection does not list (after
      // switching collections) shows the collection's summary and source instead.
      const parsed = slot?.swatch.color;
      if (parsed) {
        copy = serializeColor(parsed, format);
        const value = html`<span class="status-value">${copy}</span>`;
        text = slot?.swatch.name ? html`${value}${named(slot.swatch.name, nothing)}` : value;
      } else if (this.mode === 'favorites') {
        // Nothing chosen: what the mode lists, the favorites or the active library.
        text = count(this.favorites.length, strings.favoriteCountOne, strings.favoriteCount);
      } else if (this.collectionStatus !== 'loaded') {
        // A collection still loading, or that failed to: its name and what is happening.
        const failed = this.collectionStatus === 'error';
        text = named(
          collection.name ?? collection.id,
          html`<span class="status-count"
            >${failed ? strings.loadErrorShort : strings.loading}</span
          >`,
        );
      } else {
        const name = collection.name ?? collection.id;
        text = named(
          name,
          summary(
            this.mode === 'palettes'
              ? count(collection.palettes.length, strings.paletteCountOne, strings.paletteCount)
              : count(collection.swatches.length, strings.colorCountOne, strings.colorCount),
          ),
        );
      }
    }
    // One source or several, each a short link (or name) with its own license.
    const attribution = collection.attribution;
    const sources: readonly ColorCollectionAttribution[] =
      attribution === undefined ? [] : Array.isArray(attribution) ? attribution : [attribution];
    const sourceName = (source: ColorCollectionAttribution) =>
      source.name ?? collection.name ?? collection.id;
    const links = (sources.length ? sources : [{}]).map((source) =>
      source.url
        ? html`<a href=${source.url} target="_blank" rel="noopener noreferrer"
            >${sourceName(source)}</a
          >`
        : html`<span class="source-name">${sourceName(source)}</span>`,
    );
    const licenses = sources
      .filter((source) => source.license)
      .map((source) =>
        fillTemplate(strings.license, {
          license:
            sources.length > 1 && source.name
              ? `${source.license} (${source.name})`
              : source.license!,
        }),
      );
    const icon = html`<tp-icon
      slot="trigger"
      class="source-icon"
      part="color-palette-source"
      tabindex="0"
      .label=${strings.source}
      .icon=${infoIcon}
    ></tp-icon>`;
    // The source info takes the start of the bar while nothing is chosen; the copy button does
    // once something is. A collection with a description opens a Preview Card that can hold its
    // source link; otherwise a Tooltip names the source, then its license on a line of its own.
    const source =
      copy || (!sources.length && !collection.description)
        ? nothing
        : collection.description
          ? html`<tp-preview-card class="source" label=${strings.source}
              >${icon}<tp-stack class="source-card" part="color-palette-attribution" gap="1"
                ><span class="source-links">${join(links, ' · ')}</span
                ><span class="source-description">${collection.description}</span>${licenses.map(
                  (license) => html`<span class="source-license">${license}</span>`,
                )}</tp-stack
              ></tp-preview-card
            >`
          : html`<tp-tooltip class="source" wrap max-width="18rem"
              >${icon}<span part="color-palette-attribution"
                >${sources.map(
                  (source) => html`<span class="credit-line">${sourceName(source)}</span>`,
                )}${licenses.map((license) => html`<span class="credit-line">${license}</span>`)}</span
              ></tp-tooltip
            >`;
    const copyButton = copy
      ? html`<tp-copy-button
          class="copy"
          size="xs"
          .value=${copy}
          .label=${slot?.set ? strings.copyPalette : strings.copyColor}
        ></tp-copy-button>`
      : nothing;
    return html`<div class="status" part="color-palette-status">
      ${source}${copyButton}<span class="status-text">${text}</span>${this.#renderFavoriteToggle()}
    </div>`;
  }

  /**
   * The heart at the end of the status bar, for a chosen color or palette: a dimmed outline, or the
   * solid heart while the choice is a favorite.
   */
  #renderFavoriteToggle(): unknown {
    const chosen = this.#chosenFavorite();
    if (!chosen) return nothing;
    const pressed = chosen.index >= 0;
    return html`<tp-toggle
      class="favorite-toggle"
      part="color-palette-favorite-toggle"
      size="icon-xs"
      aria-label=${this.#strings.favorite}
      .pressed=${pressed}
      ?disabled=${this.effectiveDisabled || this.readOnly}
      @tp-value-change=${this.#favoriteToggle}
      ><tp-icon
        class=${pressed ? 'heart' : 'heart dim'}
        .icon=${pressed ? favoriteHeartIcon : emptyStateIcons.heart}
      ></tp-icon
    ></tp-toggle>`;
  }

  /** While the collection loads: a Spinner and the collection's name, where the error would show. */
  #renderLoading(): unknown {
    return html`<tp-empty-state
      class="empty"
      part="color-palette-loading"
      media-treatment="icon"
      .title=${this.activeCollection.name ?? ''}
      .description=${this.#strings.loading}
      ><tp-spinner slot="media" size="lg" label=""></tp-spinner
    ></tp-empty-state>`;
  }

  /** The collection failed to load: what happened and a Retry Button that loads it again. */
  #renderLoadError(): unknown {
    const strings = this.#strings;
    return html`<tp-empty-state
      class="empty"
      media-treatment="icon"
      .title=${fillTemplate(strings.loadError, { name: this.activeCollection.name ?? '' })}
      .description=${strings.loadErrorHint}
      ><tp-icon slot="media" .icon=${paletteIcon} aria-hidden="true"></tp-icon
      ><tp-button
        slot="actions"
        class="retry"
        part="color-palette-retry"
        variant="outline"
        size="sm"
        @click=${this.#retry}
        >${strings.retry}</tp-button
      ></tp-empty-state
    >`;
  }

  /**
   * The empty state of the mode: how to add favorites, or that the collection has no palettes or
   * no colors.
   */
  #renderEmpty(): unknown {
    const strings = this.#strings;
    const [title, description, icon] =
      this.mode === 'favorites'
        ? [strings.favoritesEmpty, strings.favoritesHint, emptyStateIcons.heart]
        : this.mode === 'palettes'
          ? [strings.palettesEmpty, strings.palettesHint, paletteIcon]
          : [strings.empty, strings.emptyHint, paletteIcon];
    return html`<tp-empty-state
      class="empty"
      media-treatment="icon"
      .title=${title}
      .description=${description}
      ><tp-icon slot="media" .icon=${icon} aria-hidden="true"></tp-icon
    ></tp-empty-state>`;
  }

  /** One color: a gapless cell, or in the list layout a row with its color and its name. */
  #renderOption(
    slot: PaletteSlot,
    flags: {
      selected: boolean;
      highlighted: boolean;
      disabled: boolean;
      list: boolean;
      /** A color of a palette row, whose row carries the selection mark. */
      member?: boolean;
    },
  ): unknown {
    return this.renderPart(
      'color-palette-item',
      { ...flags },
      {
        tag: 'div',
        properties: {
          part: 'color-palette-item',
          class: 'option',
          id: optionId(slot.key),
          role: 'option',
          'aria-selected': String(flags.selected),
          'aria-label': this.#optionName(slot),
          'aria-disabled': flags.disabled ? 'true' : undefined,
          'data-key': slot.key,
          'data-selected': flags.selected,
          'data-highlighted': flags.highlighted,
          'data-disabled': flags.disabled,
          'data-layout': flags.list ? 'list' : undefined,
          'data-paint': slot.blend ? 'blend' : undefined,
          'data-member': flags.member,
          style: slot.paint,
        },
        content: flags.list
          ? html`<span class="swatch">${this.#renderFavoriteMark(slot.key)}</span
              ><span class="row-text">${listText(slot.swatch, this.#strings)}</span>`
          : this.#renderFavoriteMark(slot.key),
      },
    );
  }

  protected override render() {
    const strings = this.#strings;
    const collection = this.activeCollection;
    const columns = this.#columns();
    const state = {
      value: this.value,
      size: this.size,
      empty: !this.value,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
    };
    const label = this.label || strings.label;
    const model = this.#listModel();
    const entries = this.#entries();
    const toolbar = this.toolbar
      ? renderToolbar({
          strings,
          modes: this.#modes(),
          mode: this.mode,
          collections: entries.map((entry) => ({ id: entry.id, label: entry.label })),
          collection: collection.id,
          layout: this.layout,
          paletteStyle: this.paletteStyle,
          grouping: this.grouping,
          size: this.size,
          disabled: this.effectiveDisabled,
          onMode: this.#onMode,
          onCollection: this.#onCollection,
          onLayout: this.#onLayout,
          onPaletteStyle: this.#onPaletteStyle,
          onGroups: this.#onGroups,
          onSize: this.#onSize,
        })
      : nothing;
    return this.renderPart('color-palette', state, {
      tag: 'div',
      properties: {
        part: 'color-palette',
        class: 'root',
        role: 'group',
        'aria-label': label,
        'data-mode': this.mode,
        'data-layout': this.layout,
        'data-palette-style': this.paletteStyle,
        'data-empty': !this.value,
        'aria-busy':
          this.mode !== 'favorites' &&
          (this.collectionStatus === 'loading' || this.collectionStatus === 'idle')
            ? 'true'
            : undefined,
        'data-disabled': this.effectiveDisabled,
        'data-readonly': this.readOnly,
        style: {
          // The box: medium cells and rows, whatever the size; the cells reflow inside it.
          '--_tp-color-palette-frame-columns': String(columns),
          '--_tp-color-palette-columns': String(this.#cellColumns()),
          // A filling palette stretches its cells so the columns span the whole width.
          ...(this.fill
            ? {
                // A filling palette's content meets the edges of the box it fills.
                '--_tp-color-palette-inset': '0px',
                '--_tp-color-palette-cell':
                  'calc((100cqi - var(--_tp-color-palette-chrome)) / var(--_tp-color-palette-columns, 9))',
              }
            : {}),
          '--_tp-color-palette-list': `calc(var(--_tp-color-palette-frame) * ${ROWS + 1} + var(--tp-space-1) * 2)`,
        },
      },
      content: html`<div class="probe" aria-hidden="true">
          <span class="probe-cell"></span><span class="probe-frame"></span
          ><span class="probe-chrome"></span>
        </div>
        ${toolbar}<tp-scroll-area class="scroller" axis="y" scroll-edge-fade
          >${this.#renderList(model, label, state)}${this.#renderFavoritesMenu()}</tp-scroll-area
        >${this.#renderStatus(model, collection)}`,
    });
  }
}

const placeholders = new WeakMap<CollectionEntry, ResolvedColorCollection>();
/** A collection that has not loaded yet: its id and name, no colors and no palettes. */
function placeholder(entry: CollectionEntry): ResolvedColorCollection {
  let resolved = placeholders.get(entry);
  if (!resolved) {
    const source: ColorCollection = { id: entry.id, name: entry.label, colors: [] };
    resolved = {
      id: entry.id,
      name: entry.label,
      groups: [],
      swatches: [],
      palettes: [],
      issues: [],
      source,
    };
    placeholders.set(entry, resolved);
  }
  return resolved;
}

const renamed = new WeakMap<ColorCollection, ColorCollection>();
/** A loaded document under its loader's id, so the menu and `collection` keep one identity. */
function named(document: ColorCollection, id: string): ColorCollection {
  if (document.id === id) return document;
  let copy = renamed.get(document);
  if (!copy) {
    copy = { ...document, id };
    renamed.set(document, copy);
  }
  return copy;
}

/** The element id of an option, from its key. */
const optionId = (key: string): string => `option-${key.replace(/\s/g, '_')}`;

/** The hex identity of a color text, or undefined when it does not parse. */
function identityOf(value: string): string | undefined {
  const parsed = value ? parseColor(value) : null;
  return parsed ? colorIdentity(parsed) : undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-palette': TpColorPalette;
  }
}
