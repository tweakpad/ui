import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { stepForKey, type DimensionDefinition } from '../../foundation/dimension-step.js';
import { TpValueCommitEvent, type TpValueChangeEvent } from '../../foundation/events.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ImageLoadController, type ImageLoadStatus } from '../../foundation/image-load.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { observeResize } from '../../foundation/observation.js';
import {
  PanZoomController,
  type PanZoomPolicy,
  type PanZoomReason,
  type PanZoomViewport,
} from '../../foundation/pan-zoom.js';
import { PointerDrag, type PointerDragPoint } from '../../foundation/pointer-drag.js';
import { PressAndHold } from '../../foundation/press-and-hold.js';
import { ToolbarController } from '../../foundation/toolbar.js';
import type { ChangeReason } from '../../foundation/types.js';
import { TpButton } from '../../components/button/button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpSlider } from '../../components/slider/slider.js';
import { imageIcon } from '../../icons/image.js';
import { scanIcon } from '../../icons/map.js';
import { minusIcon } from '../../icons/minus.js';
import { plusIcon } from '../../icons/plus.js';
import { refreshIcon } from '../../icons/refresh.js';
import { rotateCcwIcon } from '../../icons/rotate-ccw.js';
import { rotateCwIcon } from '../../icons/rotate-cw.js';
import { squareIcon } from '../../icons/square.js';
import type { IconDefinition } from '../../icons/types.js';
import { imageEditorPresentation } from '../../presentation/families/image-editor.js';
import { drawRegion, regionBlob } from './export.js';
import {
  REGION_HANDLES,
  centredView,
  clampView,
  clampZoom,
  fitRegion,
  initialRegion,
  moveRegion,
  normalizeRotation,
  parseAspectRatio,
  resizeRegion,
  resolveLength,
  resolveMinZoom,
  rotateAround,
  rotatedBounds,
  straightenBase,
  roundRect,
  sameRect,
  valueOfView,
  viewOfValue,
  zoomAround,
  zoomRange,
  type Point,
  type Rect,
  type RegionHandle,
  type RegionLimits,
  type Size,
  type View,
  type ZoomRange,
} from './geometry.js';
import { resolveImageEditorMessages } from './strings.js';
import { imageEditorStyles } from './styles.js';
import {
  IMAGE_EDITOR_CONTROLS,
  type ImageEditorBackground,
  type ImageEditorBlobOptions,
  type ImageEditorControl,
  type ImageEditorControlsPosition,
  type ImageEditorCrop,
  type ImageEditorExportOptions,
  type ImageEditorFit,
  type ImageEditorMessages,
  type ImageEditorPoint,
  type ImageEditorSize,
  type ImageEditorRegionDrag,
  type ImageEditorRegionMode,
  type ImageEditorValue,
  type ImageEditorValueChangeCallback,
  type ImageEditorValueCommitCallback,
  type ImageEditorWheel,
  type ImageEditorZoomRange,
} from './types.js';

/** Each `+`/`-` key or button press and each zoom step scales by this factor. */
const ZOOM_STEP = 1.25;
/** Arrow-key pan, in screen pixels: Arrow, Alt+Arrow and Shift+Arrow. */
const PAN_KEYS: DimensionDefinition = { min: 0, max: 0, step: 20, smallStep: 2, largeStep: 100 };
/** Arrow-key region steps, in screen pixels. */
const REGION_KEYS: DimensionDefinition = { min: 0, max: 0, step: 4, smallStep: 1, largeStep: 20 };
/** How long the guides stay after a key or control step, in milliseconds. */
const ADJUST_SETTLE = 600;
/** The zoom Slider's integer track: positions spread logarithmically over the zoom range. */
const ZOOM_TRACK = 200;
/** The straighten Slider's range, in degrees. */
const STRAIGHTEN = 45;

const minZoomConverter = {
  fromAttribute(value: string | null): number | string | undefined {
    if (value === null || !value.trim()) return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : value.trim();
  },
  toAttribute(value: number | string | undefined): string | null {
    return value === undefined ? null : String(value);
  },
};

const controlsConverter = {
  fromAttribute(value: string | null): readonly ImageEditorControl[] {
    return (value ?? '')
      .split(/[\s,]+/u)
      .filter((entry): entry is ImageEditorControl =>
        IMAGE_EDITOR_CONTROLS.includes(entry as ImageEditorControl),
      );
  },
  toAttribute(value: readonly ImageEditorControl[]): string | null {
    return value.length ? value.join(' ') : null;
  },
};

function parseValue(text: string): ImageEditorValue | undefined {
  try {
    const value = JSON.parse(text) as Partial<ImageEditorValue>;
    return validValue(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function validValue(value: unknown): value is ImageEditorValue {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    ['x', 'y', 'width', 'height', 'rotation'].every(
      (key) => typeof record[key] === 'number' && Number.isFinite(record[key]),
    ) &&
    (record.width as number) > 0 &&
    (record.height as number) > 0
  );
}

/** The registered reason of a camera gesture. */
function cameraReason(reason: PanZoomReason): ChangeReason {
  return reason;
}

interface RegionGesture {
  readonly handle: RegionHandle | 'move';
  readonly region: Rect;
  readonly client: Point;
  readonly value: ImageEditorValue | undefined;
}

/**
 * An image in a viewport that the user zooms, pans and rotates, to inspect it at full quality or
 * to pick the part of it to keep: a crop region, a rect or a circle, fixed while the image moves
 * under it or adjustable with handles. The value is the frame (the region, or the whole viewport
 * without a crop) in image space, so it says what is visible or what to cut; `toBlob` and
 * `toCanvas` export it.
 *
 * @summary Zooms, pans and rotates an image, and picks a crop region of it.
 * @slot fallback - Content shown when the image cannot be loaded; a default message otherwise.
 * @fires tp-value-change - A cancelable proposal of a new value during a gesture, a key press or a
 * control press. `detail.value` is the proposed value and `detail.reason` its cause.
 * @fires tp-value-commit - The value after a gesture, a key press or a control press settles.
 * @fires tp-field-value - Each committed value, for a surrounding Field's validation state.
 * @fires tp-load - The image loaded; `detail` holds its `naturalWidth` and `naturalHeight`.
 * @fires tp-error - The image could not be loaded.
 * @cssprop --tp-image-editor-checker-size - The tile of the checker behind the image.
 * @cssprop --tp-image-editor-checker-color - The second color of the checker.
 * @cssprop --tp-image-editor-dim - The paint over the image outside the crop region.
 * @cssprop --tp-image-editor-inset - The space the default crop region leaves at the viewport edges.
 * @csspart image-editor - The root: the viewport, then the controls.
 * @csspart image-editor-viewport - The focusable surface that pans and zooms.
 * @csspart image-editor-background - The fill behind the image.
 * @csspart image-editor-image - The image.
 * @csspart image-editor-region - The crop region, which dims everything outside it.
 * @csspart image-editor-guides - The rule-of-thirds lines inside the region.
 * @csspart image-editor-handle - One of the eight handles of an adjustable region.
 * @csspart image-editor-placeholder - The pulsing placeholder while the image loads.
 * @csspart image-editor-error - The message shown when the image cannot be loaded.
 * @csspart image-editor-controls - The bar of controls.
 * @csspart image-editor-control-set - One set of controls in the bar.
 */
export class TpImageEditor extends TpFormElement<ImageEditorValue | undefined> {
  static tagName = 'tp-image-editor';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpIcon, TpSlider];
  }
  static override presentation = imageEditorPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    src: { type: String },
    alt: { type: String },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    fit: { type: String, reflect: true },
    minZoom: { converter: minZoomConverter, attribute: 'min-zoom' },
    maxZoom: { type: Number, attribute: 'max-zoom' },
    wheel: { type: String },
    cooperativeGestures: { type: Boolean, attribute: 'cooperative-gestures' },
    pinchRotate: { type: Boolean, attribute: 'pinch-rotate' },
    background: { type: String, reflect: true },
    label: { type: String },
    crop: { type: String, reflect: true },
    aspectRatio: { attribute: 'aspect-ratio' },
    regionMode: { type: String, attribute: 'region-mode', reflect: true },
    regionDrag: { type: String, attribute: 'region-drag' },
    regionWidth: { attribute: 'region-width' },
    regionHeight: { attribute: 'region-height' },
    regionMinWidth: { attribute: 'region-min-width' },
    regionMinHeight: { attribute: 'region-min-height' },
    regionMaxWidth: { attribute: 'region-max-width' },
    regionMaxHeight: { attribute: 'region-max-height' },
    guides: { type: Boolean },
    controls: { converter: controlsConverter },
    controlsPosition: { type: String, attribute: 'controls-position', reflect: true },
    messages: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [TpFormElement.styles, imageEditorStyles];

  /** The value an uncontrolled editor starts from and a form reset returns to. */
  defaultValue: ImageEditorValue | undefined;
  /** The image source. */
  src = '';
  /** The image's text alternative. */
  alt = '';
  /** The image's CORS mode; `anonymous` lets `toBlob` and `toCanvas` read a cross-origin image. */
  crossOrigin: '' | 'anonymous' | 'use-credentials' | null = null;
  /** How small the image may get against the frame; panning keeps to the same rule. */
  fit: ImageEditorFit = 'contain';
  /**
   * The lowest zoom, where `1` is the image's natural size: a number, or a CSS length that the
   * image's longer side may not render below (`120px`, `8rem`). It only raises the floor of `fit`.
   */
  minZoom: number | string | undefined;
  /** The highest zoom, where `1` is the image's natural size. */
  maxZoom = 8;
  /** What a plain wheel does; Control or Meta wheels and trackpad pinches always zoom. */
  wheel: ImageEditorWheel = 'zoom';
  /** Plain wheels and single-finger drags scroll the page; modified wheels and pinches reach the editor. */
  cooperativeGestures = false;
  /** Twisting two fingers rotates the image. */
  pinchRotate = false;
  /** The fill behind the image: a checker, or nothing. */
  background: ImageEditorBackground = 'checker';
  /** The editor's accessible name; `Image editor` by default. */
  label = '';
  /** The crop region's shape; `none` makes the whole viewport the frame. */
  crop: ImageEditorCrop = 'none';
  /** The region's width-to-height ratio, as a number or `w/h`; free when unset. A circle is 1. */
  aspectRatio: number | string | undefined;
  /** Whether the region stays put while the image moves under it, or has handles and moves. */
  regionMode: ImageEditorRegionMode = 'fixed';
  /** In an adjustable region, whether a drag inside it moves it or pans the image under it. */
  regionDrag: ImageEditorRegionDrag = 'move';
  /** The region's initial width, a CSS length or a percentage of the viewport. */
  regionWidth: string | number | undefined;
  /** The region's initial height, a CSS length or a percentage of the viewport. */
  regionHeight: string | number | undefined;
  /** The region's smallest width. */
  regionMinWidth: string | number = '48px';
  /** The region's smallest height. */
  regionMinHeight: string | number = '48px';
  /** The region's largest width. */
  regionMaxWidth: string | number = '100%';
  /** The region's largest height. */
  regionMaxHeight: string | number = '100%';
  /** Shows rule-of-thirds lines inside the region while it is adjusted. */
  guides = false;
  /** The controls of the bar, in order: `zoom`, `zoom-in`, `zoom-out`, `rotate`, `rotation`, `fit`, `actual`, `reset`. */
  controls: readonly ImageEditorControl[] = [];
  /** Where the bar of controls sits over the viewport. */
  controlsPosition: ImageEditorControlsPosition = 'bottom';
  /** User-facing text; English by default. */
  messages: Partial<ImageEditorMessages> | undefined;
  /** Called with each `tp-value-change` proposal. */
  onValueChange: ImageEditorValueChangeCallback | undefined;
  /** Called with each `tp-value-commit`. */
  onValueCommitted: ImageEditorValueCommitCallback | undefined;

  #provided: ImageEditorValue | undefined;
  #natural: Size | undefined;
  #viewportSize: Size = { width: 0, height: 0 };
  #region: Rect | undefined;
  /** The region settings the current region was made from; a change makes a new one. */
  #regionKey = '';
  #view: View | undefined;
  /** The value `#view` shows; another value re-derives the view. */
  #viewFor: ImageEditorValue | undefined;
  #viewportElement: HTMLElement | null = null;
  #regionElement: HTMLElement | null = null;
  #image: HTMLImageElement | null = null;
  #panZoom: PanZoomController | undefined;
  #regionDrag: PointerDrag | undefined;
  #regionGesture: RegionGesture | undefined;
  #cameraStart: ImageEditorValue | undefined;
  #adjusting = false;
  #releaseResize: (() => void) | undefined;
  #toolbar: ToolbarController | undefined;
  #holds: PressAndHold[] = [];

  readonly #load = new ImageLoadController(this, {
    onStatusChange: (status) => this.#statusChanged(status),
  });

  readonly #state = new ControllableState<ImageEditorValue | undefined>({
    host: this,
    initialValue: undefined,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => (validValue(this.defaultValue) ? this.defaultValue : undefined),
    hasDefaultValue: () => validValue(this.defaultValue),
    equals: sameRect,
    onChange: (event) => this.onValueChange?.(event as TpValueChangeEvent<ImageEditorValue>),
    onCommit: (value, previous, reason) => {
      this.emit('tp-field-value', { value, previousValue: previous, reason });
    },
    diagnostic: (message) => this.diagnose('image-editor-state', message),
  });

  constructor() {
    super();
    // The bar's Sliders propose their own values; the editor republishes them as its value.
    containNestedEvents(this, {
      types: ['tp-value-change', 'tp-value-commit', 'tp-field-value'],
      on: 'root',
    });
  }

  // ---- public lanes --------------------------------------------------------------------------

  /** The frame in image space: what is visible, or the crop region. Undefined until the image loads. */
  override get value(): ImageEditorValue | undefined {
    return this.#state.value;
  }
  override set value(value: ImageEditorValue | undefined) {
    const previous = this.value;
    this.#provided = validValue(value) ? value : undefined;
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }

  /** Whether an owner supplies `value`. */
  get controlled(): boolean {
    return this.#state.controlled;
  }

  /** The current zoom, where `1` is the image's natural size. Setting it zooms around the frame's centre. */
  get zoom(): number {
    return this.#currentView()?.zoom ?? 1;
  }
  set zoom(zoom: number) {
    if (Number.isFinite(zoom)) this.#zoomTo(zoom, undefined, 'programmatic');
  }

  /** The current rotation in degrees. */
  get rotation(): number {
    return this.value?.rotation ?? 0;
  }

  /** The effective zoom range; `fit` is the zoom `fit()` goes to. */
  get zoomRange(): ImageEditorZoomRange {
    return this.#range() ?? { min: 1, max: Math.max(1, this.maxZoom), fit: 1 };
  }

  /** The loaded image's natural size, or undefined before it loads. */
  get naturalSize(): ImageEditorSize | undefined {
    return this.#natural;
  }

  /** Proposes a value as an edit does. Returns whether it was accepted. */
  setValue(
    value: ImageEditorValue,
    reason: ChangeReason = 'programmatic',
    source?: Event,
  ): boolean {
    return validValue(value) && this.#state.set(roundRect(value), reason, source);
  }

  /** Zooms to `zoom` around a viewport point, the frame's centre by default. */
  zoomTo(zoom: number, point?: ImageEditorPoint): boolean {
    return this.#zoomTo(zoom, point, 'imperative-action');
  }

  /** Zooms by a factor around a viewport point, the frame's centre by default. */
  zoomBy(factor: number, point?: ImageEditorPoint): boolean {
    return this.#zoomTo(this.zoom * factor, point, 'imperative-action');
  }

  /** Moves the image by a screen delta. */
  panBy(dx: number, dy: number): boolean {
    const view = this.#currentView();
    return (
      !!view &&
      this.#step(
        () =>
          this.#act(
            { ...view, x: view.x + dx, y: view.y + dy },
            this.rotation,
            'imperative-action',
          ),
        'imperative-action',
      )
    );
  }

  /** Turns the image to `degrees` about the frame's centre. */
  rotateTo(degrees: number): boolean {
    return this.#rotateTo(degrees, undefined, 'imperative-action');
  }

  /** Turns the image by `degrees` about the frame's centre. */
  rotateBy(degrees: number): boolean {
    return this.#rotateTo(this.rotation + degrees, undefined, 'imperative-action');
  }

  /** Zooms to the fit zoom, centred. */
  fitImage(): boolean {
    return this.#fitImage('imperative-action');
  }

  /** Shows the image at its natural size around the frame's centre. */
  actualSize(): boolean {
    return this.#zoomTo(1, undefined, 'imperative-action');
  }

  /** Returns to `defaultValue`, or the fitted, unrotated image without one. */
  reset(): boolean {
    return this.#reset('imperative-action');
  }

  /** Draws the value's region at natural resolution, or scaled to `maxSize`. */
  toCanvas(options: ImageEditorExportOptions = {}): HTMLCanvasElement {
    const value = this.value;
    if (!this.#image || !value) throw new Error('The image has not loaded.');
    return drawRegion(this.#image, value, options);
  }

  /** `toCanvas`, encoded as `type` (PNG by default). */
  toBlob(options: ImageEditorBlobOptions = {}): Promise<Blob> {
    const value = this.value;
    if (!this.#image || !value) return Promise.reject(new Error('The image has not loaded.'));
    try {
      return regionBlob(this.#image, value, options);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker.
    this.setAttribute('data-field-control', '');
  }

  override disconnectedCallback(): void {
    this.#panZoom?.disconnect();
    this.#panZoom = undefined;
    this.#regionDrag?.disconnect();
    this.#regionDrag = undefined;
    this.#regionElement = null;
    this.#releaseResize?.();
    this.#releaseResize = undefined;
    this.#viewportElement = null;
    this.#toolbar = undefined;
    for (const hold of this.#holds) hold.cancel();
    this.#holds = [];
    clearTimeout(this.#settleTimer);
    this.#settleTimer = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#state.initialize();
    if (changed.has('src') || changed.has('crossOrigin') || !this.hasUpdated) {
      this.#natural = undefined;
      this.#view = undefined;
      this.#viewFor = undefined;
      this.#load.load(
        { src: this.src || null, crossOrigin: this.crossOrigin ?? null },
        { preload: false },
      );
    }
    if (changed.has('fit') || changed.has('minZoom') || changed.has('maxZoom'))
      this.#viewFor = undefined;
    this.#prepare();
  }

  protected override firstUpdated(): void {
    this.#connectSurfaces();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#connectSurfaces();
    const image = this.renderRoot.querySelector<HTMLImageElement>('img');
    this.#image = image;
    if (changed.has('src') || changed.has('crossOrigin')) this.#load.inspect(image);
    const value = this.value;
    const text = value ? JSON.stringify(roundRect(value)) : null;
    this.setFormValue(text, text);
  }

  protected override resetFormValue(): void {
    this.#state.reset();
    this.#viewFor = undefined;
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    const value = parseValue(state);
    if (value) this.#state.set(value, 'programmatic', undefined, { cancelable: false });
  }

  protected override focusTarget(): HTMLElement | null {
    return this.#viewportElement ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.#viewportElement;
  }

  #statusChanged(status: ImageLoadStatus): void {
    if (status === 'loaded') {
      const image = this.renderRoot.querySelector('img');
      if (image?.naturalWidth && image.naturalHeight) {
        this.#natural = { width: image.naturalWidth, height: image.naturalHeight };
        this.#viewFor = undefined;
        this.requestUpdate();
        this.emit('tp-load', {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
      }
    } else if (status === 'error') {
      this.emit('tp-error', { src: this.src });
    }
  }

  // ---- surfaces ------------------------------------------------------------------------------

  #connectSurfaces(): void {
    const viewport = this.renderRoot.querySelector<HTMLElement>('.viewport');
    if (viewport !== this.#viewportElement) {
      this.#panZoom?.disconnect();
      this.#releaseResize?.();
      this.#viewportElement = viewport;
      if (viewport) {
        this.#releaseResize = observeResize(viewport, () => this.#resized());
        this.#panZoom = new PanZoomController({
          element: viewport,
          owner: this.ownerDocument.defaultView,
          // The camera's origin is the image centre, the pivot a pinch turns about.
          viewport: () => {
            const view = this.#currentView();
            return view ? this.#toCamera(view, this.rotation) : { x: 0, y: 0, zoom: 1 };
          },
          limits: () => {
            const range = this.#range(undefined, this.#turn);
            return { minZoom: range?.min ?? 1, maxZoom: range?.max ?? 1 };
          },
          clamp: (camera: PanZoomViewport) => {
            const turn = this.#turn;
            return this.#toCamera(
              this.#clampView(this.#fromCamera(camera, turn), undefined, turn),
              turn,
            );
          },
          policy: () => this.#policy(),
          size: () => this.#viewportSize,
          filter: (event) => this.#cameraFilter(event),
          handlers: {
            start: (_reason, event) => {
              this.#cameraStart = this.value;
              this.#setAdjusting(true);
              // The handled press skipped the native focus; keys continue from the image, without
              // the keyboard focus ring.
              if (event.type === 'pointerdown')
                this.#viewportElement?.focus({
                  preventScroll: true,
                  focusVisible: false,
                } as FocusOptions);
            },
            rotate: (delta: number) => {
              this.#gestureTurn = normalizeRotation(this.#turn + delta);
            },
            move: (camera, reason, event) => {
              const turn = this.#turn;
              this.#act(
                this.#fromCamera(camera, turn),
                turn,
                cameraReason(reason),
                event ?? undefined,
              );
            },
            end: (reason, event) => {
              this.#gestureTurn = undefined;
              this.#setAdjusting(false);
              this.#commit(this.#cameraStart, cameraReason(reason), event ?? undefined);
              this.#cameraStart = undefined;
            },
            cancel: () => {
              this.#gestureTurn = undefined;
              this.#setAdjusting(false);
              this.#cameraStart = undefined;
            },
          },
        });
        this.#panZoom.connect();
      }
    }
    const region = this.renderRoot.querySelector<HTMLElement>('.region');
    if (region !== this.#regionElement) {
      this.#regionDrag?.disconnect();
      this.#regionDrag = undefined;
      this.#regionElement = region;
      if (region)
        this.#regionDrag = new PointerDrag({
          element: region,
          owner: this.ownerDocument.defaultView,
          disabled: () => this.effectiveDisabled || !this.#adjustable,
          grip: (event) => (event.target as Element | null)?.closest?.('.handle'),
          focusTarget: () => region,
          handlers: {
            begin: (_point, event) => this.#beginRegion(event),
            move: (point, event) => this.#moveRegion(point, event),
            end: (_point, event, dragged) => this.#endRegion(event, dragged),
            cancel: (reason, event) =>
              this.#cancelRegion(reason === 'escape' ? 'escape-key' : 'pointer', event),
          },
        });
      this.#regionDrag?.connect();
    }
    const bar = this.renderRoot.querySelector<HTMLElement>('.controls');
    if (bar && !this.#toolbar) this.#toolbar = new ToolbarController(bar, {});
    if (!bar) this.#toolbar = undefined;
    this.#connectHolds();
  }

  #connectHolds(): void {
    const buttons = [...this.renderRoot.querySelectorAll<HTMLElement>('[data-hold]')];
    if (
      buttons.length === this.#holds.length &&
      buttons.every((button, index) => this.#holds[index]!.element === button)
    )
      return;
    for (const hold of this.#holds) hold.cancel();
    this.#holds = buttons.map(
      (button) =>
        new PressAndHold(button, {
          disabled: () => this.effectiveDisabled,
          tick: (event) =>
            this.#zoomTo(
              this.zoom * (button.dataset.hold === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP),
              undefined,
              'imperative-action',
              event,
            ),
          release: (event) => this.#commit(this.#holdStart, 'imperative-action', event),
          start: () => {
            this.#holdStart = this.value;
          },
        }),
    );
  }

  #holdStart: ImageEditorValue | undefined;
  /** The rotation a pinch has turned to, ahead of the value it proposes. */
  #gestureTurn: number | undefined;

  get #turn(): number {
    return this.#gestureTurn ?? this.rotation;
  }

  /** A view (bounding-box origin) as the camera sees it (image-centre origin). */
  #toCamera(view: View, rotation: number): View {
    const box = this.#natural ? rotatedBounds(this.#natural, rotation) : { width: 0, height: 0 };
    return {
      x: view.x + (box.width / 2) * view.zoom,
      y: view.y + (box.height / 2) * view.zoom,
      zoom: view.zoom,
    };
  }

  #fromCamera(camera: View, rotation: number): View {
    const box = this.#natural ? rotatedBounds(this.#natural, rotation) : { width: 0, height: 0 };
    return {
      x: camera.x - (box.width / 2) * camera.zoom,
      y: camera.y - (box.height / 2) * camera.zoom,
      zoom: camera.zoom,
    };
  }

  #policy(): PanZoomPolicy {
    return {
      panButtons: [0, 1],
      wheel: this.wheel,
      pinch: true,
      doubleClickZoom: true,
      cooperative: this.cooperativeGestures,
      activationHeld: false,
      panOnTouch: !this.cooperativeGestures,
      wheelCrossAxisPans: this.wheel === 'zoom',
      pinchRotate: this.pinchRotate,
      doubleTapZoom: true,
    };
  }

  /** Camera presses skip the controls, the handles and, while it moves, the region. */
  #cameraFilter(event: PointerEvent | WheelEvent | MouseEvent): boolean {
    if (this.effectiveDisabled || !this.#natural) return false;
    if (event.type === 'wheel') return true;
    const target = event.composedPath()[0] as Element | undefined;
    if (!target?.closest) return true;
    if (target.closest('.controls, .handle')) return false;
    if (this.#adjustable && this.regionDrag === 'move' && target.closest('.region')) return false;
    return true;
  }

  #resized(): void {
    const viewport = this.#viewportElement;
    if (!viewport) return;
    const size = { width: viewport.clientWidth, height: viewport.clientHeight };
    if (size.width === this.#viewportSize.width && size.height === this.#viewportSize.height)
      return;
    const before = this.#frame();
    const centre = before && this.#view ? this.#layerAt(this.#view, centreOf(before)) : undefined;
    this.#viewportSize = size;
    if (this.#region) this.#region = fitRegion(this.#region, this.#bounds(), this.#ratio);
    // The image point at the frame's centre stays there at the same zoom.
    if (centre && this.#view && !this.controlled) {
      const frame = this.#frame()!;
      const middle = centreOf(frame);
      this.#view = {
        ...this.#view,
        x: middle.x - centre.x * this.#view.zoom,
        y: middle.y - centre.y * this.#view.zoom,
      };
      this.#viewFor = this.value;
    }
    this.requestUpdate();
  }

  // ---- model ---------------------------------------------------------------------------------

  get #messages(): ImageEditorMessages {
    return resolveImageEditorMessages(this.messages);
  }

  get #adjustable(): boolean {
    return this.crop !== 'none' && this.regionMode === 'adjustable';
  }

  get #ratio(): number | undefined {
    return this.crop === 'circle' ? 1 : parseAspectRatio(this.aspectRatio);
  }

  #fontSizes(): { root: number; element: number } {
    const view = this.ownerDocument.defaultView;
    const read = (element: Element | null) =>
      element && view ? parseFloat(view.getComputedStyle(element).fontSize) || 16 : 16;
    return { root: read(this.ownerDocument.documentElement), element: read(this) };
  }

  #length(value: string | number | undefined, reference: number): number | undefined {
    return resolveLength(value, reference, this.#fontSizes());
  }

  /** The default region's margin: the viewport's padding, which carries `--tp-image-editor-inset`. */
  #inset(): number {
    const view = this.ownerDocument.defaultView;
    const viewport = this.#viewportElement;
    if (!view || !viewport) return 0;
    return parseFloat(view.getComputedStyle(viewport).paddingTop) || 0;
  }

  #bounds(): Rect {
    return { x: 0, y: 0, ...this.#viewportSize };
  }

  #limits(): RegionLimits {
    const { width, height } = this.#viewportSize;
    return {
      minWidth: this.#length(this.regionMinWidth, width) ?? 48,
      minHeight: this.#length(this.regionMinHeight, height) ?? 48,
      maxWidth: this.#length(this.regionMaxWidth, width) ?? width,
      maxHeight: this.#length(this.regionMaxHeight, height) ?? height,
    };
  }

  /** Makes or keeps the region and settles the view before rendering. */
  #prepare(): void {
    if (!this.#viewportSize.width || !this.#viewportSize.height) return;
    if (this.crop === 'none') this.#region = undefined;
    else {
      const key = [
        this.crop,
        this.#ratio,
        this.regionWidth,
        this.regionHeight,
        this.regionMinWidth,
        this.regionMinHeight,
        this.regionMaxWidth,
        this.regionMaxHeight,
      ].join('|');
      if (!this.#region || key !== this.#regionKey) {
        this.#regionKey = key;
        const { width, height } = this.#viewportSize;
        this.#region = initialRegion(
          this.#bounds(),
          this.#ratio,
          this.#limits(),
          this.#inset(),
          this.#length(this.regionWidth, width),
          this.#length(this.regionHeight, height),
        );
        this.#viewFor = undefined;
      }
    }
    this.#settle();
  }

  /** The frame on screen: the region, or the whole viewport. */
  #frame(): Rect | undefined {
    if (!this.#viewportSize.width || !this.#viewportSize.height) return undefined;
    return this.#region ?? this.#bounds();
  }

  #range(frame = this.#frame(), rotation = this.rotation): ZoomRange | undefined {
    const image = this.#natural;
    if (!image || !frame) return undefined;
    const minZoom = resolveMinZoom(this.minZoom, image, (text) => this.#length(text, 0));
    return zoomRange(image, rotation, frame, this.fit, minZoom, this.maxZoom);
  }

  #clampView(view: View, frame = this.#frame(), rotation = this.rotation): View {
    const image = this.#natural;
    const range = this.#range(frame, rotation);
    if (!image || !frame || !range) return view;
    const zoom = clampZoom(view.zoom, range);
    const scaled = zoom === view.zoom ? view : zoomAround(view, zoom, centreOf(frame));
    return clampView(scaled, image, rotation, frame, this.fit);
  }

  /** The view that shows the current value; re-derived when the value changed outside a gesture. */
  #currentView(): View | undefined {
    if (this.#viewFor !== this.value || !this.#view) this.#settle();
    return this.#view;
  }

  /** Derives the view from the value (or the initial fit) and publishes a value the clamp moved. */
  #settle(): void {
    const image = this.#natural;
    const frame = this.#frame();
    if (!image || !frame) return;
    const value = this.value;
    const rotation = value?.rotation ?? 0;
    const range = this.#range(frame, rotation)!;
    let view: View;
    if (value && this.#viewFor === value && this.#view) view = this.#view;
    else if (value) view = viewOfValue(value, frame);
    else view = centredView(image, rotation, frame, range.fit);
    view = this.#clampView(view, frame, rotation);
    this.#view = view;
    const next = roundRect(valueOfView(view, frame, rotation));
    if (!sameRect(next, value)) {
      // The initial value, or the clamp of a value that no longer fits; an owner's value stays.
      this.#state.reconcile(next, value ? 'window-resize' : 'initial');
    }
    this.#viewFor = this.value;
  }

  #layerAt(view: View, point: Point): Point {
    return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
  }

  /**
   * Proposes the value a view and rotation show. While uncontrolled the view applies at once;
   * while controlled it applies when the owner writes the value back.
   */
  #act(
    view: View,
    rotation: number,
    reason: ChangeReason,
    source?: Event,
    frame = this.#frame(),
  ): boolean {
    const image = this.#natural;
    if (!image || !frame || this.effectiveDisabled) return false;
    const clamped = this.#clampView(view, frame, rotation);
    const next = roundRect(valueOfView(clamped, frame, rotation));
    if (sameRect(next, this.value)) return false;
    const accepted = this.#state.set(next, reason, source);
    if (accepted && !this.controlled) {
      this.#view = clamped;
      this.#viewFor = this.value;
    }
    return accepted;
  }

  /** Emits the commit once a change settles: at once while uncontrolled, after the owner's write-back otherwise. */
  #commit(previous: ImageEditorValue | undefined, reason: ChangeReason, source?: Event): void {
    const finish = (): void => {
      const value = this.value;
      if (!value || sameRect(previous, value)) return;
      const event = new TpValueCommitEvent(value, previous as ImageEditorValue, reason, source);
      this.onValueCommitted?.(event);
      this.dispatchEvent(event);
    };
    if (!this.controlled) finish();
    else void Promise.resolve().then(() => this.updateComplete.then(finish));
  }

  #step(change: () => boolean, reason: ChangeReason, source?: Event): boolean {
    const previous = this.value;
    const changed = change();
    if (changed) {
      this.#commit(previous, reason, source);
      this.#flashAdjusting();
    }
    return changed;
  }

  #settleTimer: ReturnType<typeof setTimeout> | undefined;

  /** Marks a frame-changing interaction; the guides show while it lasts. */
  #setAdjusting(adjusting: boolean): void {
    clearTimeout(this.#settleTimer);
    this.#settleTimer = undefined;
    if (adjusting === this.#adjusting) return;
    this.#adjusting = adjusting;
    this.requestUpdate();
  }

  /** A discrete step (a key, a control press) shows the guides for a moment. */
  #flashAdjusting(): void {
    if (this.#regionGesture || this.#cameraStart !== undefined) return;
    this.#setAdjusting(true);
    this.#settleTimer = setTimeout(() => this.#setAdjusting(false), ADJUST_SETTLE);
  }

  #zoomTo(zoom: number, point: Point | undefined, reason: ChangeReason, source?: Event): boolean {
    const view = this.#currentView();
    const frame = this.#frame();
    const range = this.#range();
    if (!view || !frame || !range) return false;
    const target = clampZoom(zoom, range);
    const run = () =>
      this.#act(zoomAround(view, target, point ?? centreOf(frame)), this.rotation, reason, source);
    return reason === 'imperative-action' && this.#holdActive()
      ? run()
      : this.#step(run, reason, source);
  }

  #holdActive(): boolean {
    return this.#holds.some((hold) => hold.active);
  }

  #rotateTo(
    degrees: number,
    pivot: Point | undefined,
    reason: ChangeReason,
    source?: Event,
    commit = true,
  ): boolean {
    const image = this.#natural;
    const view = this.#currentView();
    const frame = this.#frame();
    if (!image || !view || !frame) return false;
    const from = this.rotation;
    const to = normalizeRotation(degrees);
    if (to === from) return false;
    const before = this.#range(frame, from);
    // A fitted image stays fitted: it turns into the new fit, centred.
    const fitted = !pivot && before && Math.abs(view.zoom - before.fit) < before.fit * 1e-3;
    const turned = fitted
      ? centredView(image, to, frame, this.#range(frame, to)!.fit)
      : rotateAround(view, image, from, to, pivot ?? centreOf(frame));
    // A turn may raise the floor (a rotated image needs more zoom to cover the frame).
    const run = () => this.#act(turned, to, reason, source);
    const turnedTo = commit ? this.#step(run, reason, source) : run();
    // An accepted quarter turn from a control, a key or a method keeps the straighten offset.
    const turn = normalizeRotation(to - from);
    if (turnedTo && !this.#straightening && this.#straightenBase !== undefined && turn % 90 === 0)
      this.#straightenBase = normalizeRotation(this.#straightenBase + turn);
    return turnedTo;
  }

  #fitImage(reason: ChangeReason, source?: Event): boolean {
    const image = this.#natural;
    const frame = this.#frame();
    const range = this.#range();
    if (!image || !frame || !range) return false;
    return this.#step(
      () =>
        this.#act(
          centredView(image, this.rotation, frame, range.fit),
          this.rotation,
          reason,
          source,
        ),
      reason,
      source,
    );
  }

  #reset(reason: ChangeReason, source?: Event): boolean {
    const image = this.#natural;
    const frame = this.#frame();
    if (!image || !frame) return false;
    const fallback = validValue(this.defaultValue) ? this.defaultValue : undefined;
    return this.#step(
      () => {
        const range = this.#range(frame, fallback?.rotation ?? 0)!;
        const view = fallback
          ? viewOfValue(fallback, frame)
          : centredView(image, 0, frame, range.fit);
        return this.#act(view, fallback?.rotation ?? 0, reason, source);
      },
      reason,
      source,
    );
  }

  // ---- region --------------------------------------------------------------------------------

  /** Where an adjustable region may go: the viewport, and with `cover` the image's box too. */
  #regionBounds(): Rect {
    const bounds = this.#bounds();
    const image = this.#natural;
    const view = this.#currentView();
    if (this.fit !== 'cover' || !image || !view) return bounds;
    const box = rotatedBounds(image, this.rotation);
    const left = Math.max(bounds.x, view.x);
    const top = Math.max(bounds.y, view.y);
    const right = Math.min(bounds.x + bounds.width, view.x + box.width * view.zoom);
    const bottom = Math.min(bounds.y + bounds.height, view.y + box.height * view.zoom);
    return right > left && bottom > top
      ? { x: left, y: top, width: right - left, height: bottom - top }
      : bounds;
  }

  /**
   * Moves the region on screen and proposes the value it then frames, with the image where it is
   * (raised to the floor of a larger `cover` region). Returns whether it applied.
   */
  #setRegion(region: Rect, reason: ChangeReason, source?: Event): boolean {
    const view = this.#currentView();
    if (!view || !this.#region) return false;
    const previous = this.#region;
    this.#region = region;
    const accepted = this.#act(view, this.rotation, reason, source, region);
    if (!accepted && !sameRegion(previous, region)) {
      // An unchanged value (the region moved over a blank area) still moves the region.
      const value = this.value;
      const next =
        value && this.#natural
          ? roundRect(valueOfView(this.#clampView(view, region), region, this.rotation))
          : undefined;
      if (next && sameRect(next, value)) {
        this.#viewFor = this.value;
        this.requestUpdate();
        return true;
      }
      this.#region = previous;
      return false;
    }
    this.requestUpdate();
    return accepted;
  }

  #beginRegion(event: PointerEvent): boolean | undefined {
    if (!this.#region || this.effectiveDisabled) return false;
    const handle = (event.composedPath()[0] as Element | undefined)?.closest?.<HTMLElement>(
      '.handle',
    );
    if (!handle && this.regionDrag === 'pan') return false;
    this.#regionGesture = {
      handle: (handle?.dataset.handle as RegionHandle | undefined) ?? 'move',
      region: this.#region,
      client: { x: event.clientX, y: event.clientY },
      value: this.value,
    };
    return true;
  }

  #moveRegion(_point: PointerDragPoint, event: PointerEvent): void {
    const gesture = this.#regionGesture;
    if (!gesture) return;
    this.#setAdjusting(true);
    const dx = event.clientX - gesture.client.x;
    const dy = event.clientY - gesture.client.y;
    const bounds = this.#regionBounds();
    let ratio = this.#ratio;
    // Shift keeps a free region's current shape.
    if (!ratio && event.shiftKey) ratio = gesture.region.width / gesture.region.height;
    const next =
      gesture.handle === 'move'
        ? moveRegion(gesture.region, dx, dy, bounds)
        : resizeRegion(gesture.region, gesture.handle, dx, dy, ratio, this.#limits(), bounds);
    this.#setRegion(next, 'drag', event);
  }

  #endRegion(event: PointerEvent, dragged: boolean): void {
    const gesture = this.#regionGesture;
    this.#regionGesture = undefined;
    this.#setAdjusting(false);
    if (gesture && dragged) this.#commit(gesture.value, 'drag', event);
  }

  #cancelRegion(reason: ChangeReason, event: Event | null): void {
    const gesture = this.#regionGesture;
    this.#regionGesture = undefined;
    this.#setAdjusting(false);
    if (!gesture) return;
    // Escape and a cancelled pointer restore the region and the value from before the press.
    this.#region = gesture.region;
    if (gesture.value) {
      this.#state.set(gesture.value, reason, event ?? undefined, { cancelable: false });
      this.#viewFor = undefined;
    }
    this.requestUpdate();
  }

  // ---- keyboard ------------------------------------------------------------------------------

  readonly #viewportKeydown = (event: KeyboardEvent): void => {
    if (event.target !== this.#viewportElement || this.effectiveDisabled || !this.#natural) return;
    const view = this.#currentView();
    const range = this.#range();
    if (!view || !range) return;
    const options = { definition: PAN_KEYS, direction: this.direction, angular: true } as const;
    const horizontal = stepForKey(event, { ...options, axis: 'horizontal' });
    const vertical = stepForKey(event, { ...options, axis: 'vertical' });
    let handled = true;
    // Shift with a bracket turns a degree (by physical key, as Shift changes the character).
    const fine = event.shiftKey && (event.code === 'BracketLeft' || event.code === 'BracketRight');
    if (fine)
      this.#rotateTo(
        this.rotation + (event.code === 'BracketLeft' ? -1 : 1),
        undefined,
        'keyboard',
        event,
      );
    else if (horizontal?.kind === 'delta')
      this.#step(
        () =>
          this.#act({ ...view, x: view.x - horizontal.amount }, this.rotation, 'keyboard', event),
        'keyboard',
        event,
      );
    else if (vertical?.kind === 'delta')
      this.#step(
        () => this.#act({ ...view, y: view.y + vertical.amount }, this.rotation, 'keyboard', event),
        'keyboard',
        event,
      );
    else
      switch (event.key) {
        case '+':
        case '=':
          this.#zoomTo(view.zoom * ZOOM_STEP, undefined, 'keyboard', event);
          break;
        case '-':
        case '_':
          this.#zoomTo(view.zoom / ZOOM_STEP, undefined, 'keyboard', event);
          break;
        case '0':
          this.#fitImage('keyboard', event);
          break;
        case '1':
          this.#zoomTo(1, undefined, 'keyboard', event);
          break;
        case 'Home':
          this.#zoomTo(range.min, undefined, 'keyboard', event);
          break;
        case 'End':
          this.#zoomTo(range.max, undefined, 'keyboard', event);
          break;
        case '[':
          this.#rotateTo(this.rotation - 90, undefined, 'keyboard', event);
          break;
        case ']':
          this.#rotateTo(this.rotation + 90, undefined, 'keyboard', event);
          break;
        default:
          handled = false;
      }
    if (handled) event.preventDefault();
  };

  readonly #regionKeydown = (event: KeyboardEvent): void => {
    const region = this.#region;
    if (!region || !this.#adjustable || this.effectiveDisabled || this.#regionGesture) return;
    if (!event.key.startsWith('Arrow')) return;
    const coarse = event.shiftKey || event.ctrlKey || event.metaKey;
    const amount = coarse ? REGION_KEYS.largeStep : REGION_KEYS.step;
    const flip = this.direction === 'rtl' ? -1 : 1;
    const dx =
      event.key === 'ArrowRight' ? amount * flip : event.key === 'ArrowLeft' ? -amount * flip : 0;
    const dy = event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0;
    const bounds = this.#regionBounds();
    const next = event.altKey
      ? resizeRegion(
          region,
          dx ? (flip < 0 ? 'w' : 'e') : 's',
          dx * flip,
          dy,
          this.#ratio,
          this.#limits(),
          bounds,
        )
      : moveRegion(region, dx, dy, bounds);
    event.preventDefault();
    event.stopPropagation();
    this.#step(() => this.#setRegion(next, 'keyboard', event), 'keyboard', event);
  };

  // ---- controls ------------------------------------------------------------------------------

  readonly #controlPress = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLElement;
    const hold = this.#holds.find((entry) => entry.element === button);
    if (hold?.shouldSkipClick(event)) return;
    switch (button.dataset.action) {
      case 'zoom-in':
        this.#zoomTo(this.zoom * ZOOM_STEP, undefined, 'imperative-action', event);
        break;
      case 'zoom-out':
        this.#zoomTo(this.zoom / ZOOM_STEP, undefined, 'imperative-action', event);
        break;
      case 'rotate-left':
        this.#rotateTo(this.rotation - 90, undefined, 'imperative-action', event);
        break;
      case 'rotate-right':
        this.#rotateTo(this.rotation + 90, undefined, 'imperative-action', event);
        break;
      case 'fit':
        this.#fitImage('imperative-action', event);
        break;
      case 'actual':
        this.#zoomTo(1, undefined, 'imperative-action', event);
        break;
      case 'reset':
        this.#reset('imperative-action', event);
        break;
    }
  };

  #sliderStart: ImageEditorValue | undefined;
  /**
   * The quarter turn the straighten Slider offsets. It is chosen when a straighten gesture starts
   * and kept afterwards while the rotation stays within its range: at ±45° a rotation lies between
   * two quarter turns, and choosing again would flip the thumb to the opposite end.
   */
  #straightenBase: number | undefined;
  #straightening = false;

  /** The quarter turn the straighten Slider shows the rotation against. */
  #displayBase(): number {
    const kept = this.#straightenBase;
    return kept !== undefined && Math.abs(normalizeRotation(this.rotation - kept)) <= STRAIGHTEN
      ? kept
      : straightenBase(this.rotation, STRAIGHTEN);
  }

  /** The zoom Slider's integer position for a zoom: a logarithmic track over the zoom range. */
  #zoomToTrack(zoom: number): number {
    const range = this.#range();
    if (!range || range.max <= range.min) return 0;
    const ratio = Math.log2(zoom / range.min) / Math.log2(range.max / range.min);
    return Math.round(Math.min(1, Math.max(0, ratio)) * ZOOM_TRACK);
  }

  #trackToZoom(position: number): number {
    const range = this.#range();
    if (!range) return 1;
    return range.min * (range.max / range.min) ** (position / ZOOM_TRACK);
  }

  readonly #zoomSlide = (event: TpValueChangeEvent<number | readonly number[]>): void => {
    const raw = event.detail.value;
    const value = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
    if (!Number.isFinite(value)) return;
    this.#sliderStart ??= this.value;
    this.#setAdjusting(true);
    this.#act(
      zoomAround(this.#currentView()!, this.#trackToZoom(value), centreOf(this.#frame()!)),
      this.rotation,
      event.detail.reason,
      event.detail.sourceEvent ?? event,
    );
  };

  readonly #rotationSlide = (event: TpValueChangeEvent<number | readonly number[]>): void => {
    const raw = event.detail.value;
    const value = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
    if (!Number.isFinite(value)) return;
    this.#sliderStart ??= this.value;
    this.#setAdjusting(true);
    // The straighten Slider adds to a quarter turn chosen once per gesture: chosen again on each
    // move, it would flip at ±45° and the written-back position would fight the pointer.
    if (!this.#straightening) {
      this.#straightening = true;
      this.#straightenBase = this.#displayBase();
    }
    const base = this.#straightenBase!;
    this.#rotateTo(
      base + value,
      undefined,
      event.detail.reason,
      event.detail.sourceEvent ?? event,
      false,
    );
  };

  readonly #slideCommit = (event: TpValueCommitEvent<number | readonly number[]>): void => {
    this.#commit(this.#sliderStart, event.detail.reason, event.detail.sourceEvent ?? event);
    this.#sliderStart = undefined;
    this.#straightening = false;
    this.#setAdjusting(false);
  };

  #renderButton(
    action: string,
    icon: IconDefinition,
    label: string,
    hold?: 'in' | 'out',
  ): TemplateResult {
    return html`<tp-button
      class="control"
      variant="ghost"
      size="icon"
      data-action=${action}
      data-hold=${hold ?? nothing}
      .focusableWhenDisabled=${true}
      .disabled=${this.effectiveDisabled || !this.#natural}
      .ariaLabel=${label}
      .icon=${icon}
      @click=${this.#controlPress}
    ></tp-button>`;
  }

  #renderControls(range: ZoomRange | undefined, zoom: number): TemplateResult | typeof nothing {
    const controls = this.controls;
    if (!controls.length) return nothing;
    const text = this.#messages;
    const disabled = this.effectiveDisabled || !this.#natural;
    const sets: TemplateResult[] = [];
    const set = (name: string, content: TemplateResult) =>
      html`<div class="set" part="image-editor-control-set" data-set=${name}>${content}</div>`;
    for (const control of controls) {
      switch (control) {
        case 'zoom': {
          const span = range ? Math.log2(range.max / range.min) : 0;
          sets.push(
            set(
              'zoom',
              html`${this.#renderButton('zoom-out', minusIcon, text.zoomOut, 'out')}<tp-slider
                  class="slider"
                  size="sm"
                  .minimum=${0}
                  .maximum=${ZOOM_TRACK}
                  .step=${1}
                  .value=${this.#zoomToTrack(zoom)}
                  ?disabled=${disabled || span < 0.01}
                  .formAssociatedValue=${false}
                  .getAccessibleLabel=${() => text.zoom}
                  .getAccessibleValueText=${(_text: string, value: number) =>
                    `${Math.round(this.#trackToZoom(value) * 100)}%`}
                  @tp-value-change=${this.#zoomSlide}
                  @tp-value-commit=${this.#slideCommit}
                ></tp-slider
                >${this.#renderButton('zoom-in', plusIcon, text.zoomIn, 'in')}`,
            ),
          );
          break;
        }
        case 'zoom-in':
          sets.push(set('zoom-in', this.#renderButton('zoom-in', plusIcon, text.zoomIn, 'in')));
          break;
        case 'zoom-out':
          sets.push(
            set('zoom-out', this.#renderButton('zoom-out', minusIcon, text.zoomOut, 'out')),
          );
          break;
        case 'rotate':
          sets.push(
            set(
              'rotate',
              html`${this.#renderButton('rotate-left', rotateCcwIcon, text.rotateLeft)}${this.#renderButton(
                'rotate-right',
                rotateCwIcon,
                text.rotateRight,
              )}`,
            ),
          );
          break;
        case 'rotation': {
          const offset = normalizeRotation(this.rotation - this.#displayBase());
          sets.push(
            set(
              'rotation',
              html`<tp-slider
                class="slider"
                size="sm"
                .minimum=${-STRAIGHTEN}
                .maximum=${STRAIGHTEN}
                .step=${0.5}
                .value=${Math.max(-STRAIGHTEN, Math.min(STRAIGHTEN, offset))}
                ?disabled=${disabled}
                .formAssociatedValue=${false}
                .getAccessibleLabel=${() => text.rotation}
                .getAccessibleValueText=${(_text: string, value: number) => `${value}°`}
                @tp-value-change=${this.#rotationSlide}
                @tp-value-commit=${this.#slideCommit}
              ></tp-slider>`,
            ),
          );
          break;
        }
        case 'fit':
          sets.push(set('fit', this.#renderButton('fit', scanIcon, text.fit)));
          break;
        case 'actual':
          sets.push(set('actual', this.#renderButton('actual', squareIcon, text.actual)));
          break;
        case 'reset':
          sets.push(set('reset', this.#renderButton('reset', refreshIcon, text.reset)));
          break;
      }
    }
    return html`<div
      class="controls"
      part="image-editor-controls"
      role="toolbar"
      aria-label=${text.controls}
      data-position=${this.controlsPosition}
    >
      ${sets}
    </div>`;
  }

  // ---- render --------------------------------------------------------------------------------

  #renderRegion(region: Rect): TemplateResult {
    const text = this.#messages;
    const adjustable = this.#adjustable;
    return html`<div
      class="region"
      part="image-editor-region"
      data-shape=${this.crop}
      ?data-adjustable=${adjustable}
      ?data-adjusting=${this.#adjusting}
      tabindex=${adjustable && !this.effectiveDisabled ? '0' : nothing}
      role=${adjustable ? 'group' : nothing}
      aria-roledescription=${adjustable ? text.regionRoleDescription : nothing}
      aria-label=${adjustable ? text.region : nothing}
      aria-describedby=${adjustable ? 'region-value' : nothing}
      aria-hidden=${adjustable ? nothing : 'true'}
      style=${`left:${region.x}px;top:${region.y}px;width:${region.width}px;height:${region.height}px`}
      @keydown=${this.#regionKeydown}
    >
      ${
        this.guides
          ? html`<div class="guides" part="image-editor-guides" aria-hidden="true"></div>`
          : nothing
      }
      ${
        adjustable
          ? REGION_HANDLES.map(
              (handle) =>
                html`<div
                  class="handle"
                  part="image-editor-handle"
                  data-handle=${handle}
                  aria-hidden="true"
                ></div>`,
            )
          : nothing
      }
    </div>`;
  }

  protected override render() {
    const text = this.#messages;
    const status = this.#load.status;
    const generation = this.#load.generation;
    const image = this.#natural;
    const view = image ? this.#currentView() : undefined;
    const value = this.value;
    const rotation = value?.rotation ?? 0;
    const range = this.#range();
    const zoom = view?.zoom ?? 1;
    const box = image ? rotatedBounds(image, rotation) : undefined;
    const label = this.label || this.getAttribute('aria-label') || text.label;
    const state = {
      crop: this.crop,
      loading: status === 'loading',
      adjusting: this.#adjusting,
      disabled: this.effectiveDisabled,
    };
    const layer =
      view && box && image
        ? `width:${box.width}px;height:${box.height}px;transform:translate(${view.x}px,${view.y}px) scale(${view.zoom})`
        : 'visibility:hidden';
    const imageStyle =
      image && box
        ? `width:${image.width}px;height:${image.height}px;left:${(box.width - image.width) / 2}px;top:${(box.height - image.height) / 2}px;rotate:${rotation}deg`
        : '';
    return this.renderPart('image-editor', state, {
      tag: 'div',
      properties: {
        part: 'image-editor',
        class: 'root',
        'data-crop': this.crop,
        'data-status': status,
        'data-adjusting': this.#adjusting,
      },
      content: html`<div
          class="viewport"
          part="image-editor-viewport"
          tabindex=${this.effectiveDisabled ? '-1' : '0'}
          role="group"
          aria-roledescription=${text.roleDescription}
          aria-label=${label}
          aria-describedby="view-value instructions"
          aria-disabled=${this.effectiveDisabled ? 'true' : nothing}
          @keydown=${this.#viewportKeydown}
        >
          <div class="background" part="image-editor-background" aria-hidden="true"></div>
          <div class="layer" style=${layer}>
            ${
              this.src
                ? html`<img
                    part="image-editor-image"
                    src=${this.src}
                    alt=${this.alt}
                    crossorigin=${this.crossOrigin ?? nothing}
                    draggable="false"
                    @load=${(event: Event) =>
                      this.#load.settle(
                        'loaded',
                        generation,
                        event.currentTarget as HTMLImageElement,
                      )}
                    @error=${() => this.#load.settle('error', generation)}
                    style=${imageStyle}
                  />`
                : nothing
            }
          </div>
          ${this.#region && image ? this.#renderRegion(this.#region) : nothing}
          ${
            status === 'loading'
              ? html`<div
                  class="placeholder"
                  part="image-editor-placeholder"
                  aria-hidden="true"
                ></div>`
              : nothing
          }
          ${
            status === 'error'
              ? html`<div class="error" part="image-editor-error" role="status">
                  <slot name="fallback"
                    ><tp-icon .icon=${imageIcon} aria-hidden="true"></tp-icon
                    ><span>${text.error}</span></slot
                  >
                </div>`
              : nothing
          }
        </div>
        ${this.#renderControls(range, zoom)}
        <span id="view-value" hidden>${text.view(zoom, rotation)}</span>
        <span id="instructions" hidden>${text.instructions(this.#adjustable)}</span>
        ${
          this.#adjustable && value
            ? html`<span id="region-value" hidden>${text.regionValue(value)}</span>`
            : nothing
        }`,
    });
  }
}

function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function sameRegion(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-image-editor': TpImageEditor;
  }
}
