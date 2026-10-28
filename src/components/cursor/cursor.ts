import { html, type PropertyValues } from 'lit';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import { defaultTrue } from '../../foundation/converters.js';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { composedContains } from '../../foundation/focus.js';
import { frameLoopFor, type FrameSubscription } from '../../foundation/frame-loop.js';
import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import { INTERACTIVE_TARGET_SELECTOR } from '../../foundation/interactive-target.js';
import {
  prepareMotion,
  resolvesReducedMotion,
  stateRole,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { observeResize } from '../../foundation/observation.js';
import { CleanupScope } from '../../foundation/services.js';
import {
  clampSpring,
  DEFAULT_FOLLOWER,
  DEFAULT_REST,
  SpringFollower2D,
  type SpringParameters,
} from '../../foundation/spring-follower.js';
import { cursorPresentation } from '../../presentation/families/cursor.js';
import { slotOccupied } from '../shared/slots.js';
import {
  CursorDocument,
  NATIVE_HIDE_ATTRIBUTE,
  SURFACE_ATTRIBUTE,
  type CursorParticipant,
  type CursorPoint,
  type CursorZoneLike,
} from './cursor-document.js';
import { TpCursorZone } from './cursor-zone.js';
import { cursorStyles } from './styles.js';
import {
  readAdoptedProperties,
  zoneBounds,
  type AdoptedProperty,
  type Bounds,
} from './zone-resolution.js';

export type CursorScope = 'document' | 'region';
export type CursorStateReason = 'hover' | 'programmatic';
export type CursorFollowReason = 'pointer' | 'disabled' | 'programmatic';

export interface CursorStateChangeDetail {
  readonly value: string | null;
  readonly previousValue: string | null;
  readonly zone: TpCursorZone | null;
  readonly reason: CursorStateReason;
  readonly sourceEvent: Event | null;
}

export interface CursorFollowChangeDetail {
  readonly value: boolean;
  readonly previousValue: boolean;
  readonly reason: CursorFollowReason;
  readonly sourceEvent: Event | null;
}

export const cursorMotionRoles = {
  /** A state change of the surface: the content morphs between resting and zone looks. */
  state: stateRole('state'),
} as const satisfies Record<string, MotionRoleDefinition>;

/** Light-DOM rules of the native lease (Foundation `cc-native-lease`, `cc-passthrough`). */
const LEASE_CSS = [
  `[${NATIVE_HIDE_ATTRIBUTE}]{--tp-cursor-hidden:1;cursor:none!important}`,
  `[${NATIVE_HIDE_ATTRIBUTE}] *:not(tp-cursor-zone[native],tp-cursor-zone[native] *){cursor:none!important}`,
  // The hidden cursor inherits from the scope element, so a native zone restores it explicitly.
  `[${NATIVE_HIDE_ATTRIBUTE}] tp-cursor-zone[native]{--tp-cursor-hidden:0;cursor:auto!important}`,
].join('\n');

const round = (value: number): number => Math.round(value * 100) / 100;

interface Stuck {
  readonly zone: TpCursorZone;
  readonly mode: 'center' | 'bounds';
  bounds: Bounds;
  readonly scope: CleanupScope;
}

/**
 * `tp-cursor`: a decorative custom pointer (Foundation §18.22 Custom cursor, Component Library
 * Cursor). For mouse and pen users it hides the host pointer over its scope and trails the
 * pointer with a spring in the top layer; `tp-cursor-zone` elements around page content give it
 * a state, content, appearance, attraction and physics while the pointer is inside them. Touch
 * never engages it, and under reduced motion it follows instantly.
 *
 * Markers: `data-following`, `data-outside`, `data-cursor-state="<name>"`, `data-pressed`,
 * `data-moving`, `data-native`, `data-stuck`.
 *
 * @slot - Resting content; without it the content part paints the default ring.
 * @csspart cursor - The host.
 * @csspart surface - The fixed, pointer-transparent box in the top layer.
 * @csspart content - The resting content, the default ring or the active zone's content.
 * @fires tp-cursor-state-change - Cancelable `{ value, previousValue, zone, reason, sourceEvent }`
 * before the state changes (`hover` for zones, `programmatic` for `setState()`).
 * @fires tp-cursor-follow-change - `{ value, previousValue, reason, sourceEvent }` when the
 * cursor starts or stops following (`pointer`, `disabled`, `programmatic`).
 * @fires tp-motion-request - Role `state` on the surface with `state`, `previousState`, `zone`
 * and `stuck` context.
 * @cssprop --tp-cursor-size - Default ring size. Default `var(--tp-space-6)`.
 * @cssprop --tp-cursor-color - Ring and content color. Default `var(--tp-foreground)`.
 * @cssprop --tp-cursor-blend - Surface `mix-blend-mode`. Default `normal`.
 * @cssprop --tp-cursor-opacity - Surface opacity while shown. Default `1`.
 * @cssprop --tp-cursor-radius - Default ring radius. Default `var(--tp-radius-full)`.
 * @cssprop --tp-cursor-x - Published follower x in pixels (read-only).
 * @cssprop --tp-cursor-y - Published follower y in pixels (read-only).
 * @cssprop --tp-cursor-velocity-x - Published velocity in pixels per second (read-only).
 * @cssprop --tp-cursor-velocity-y - Published velocity in pixels per second (read-only).
 * @cssprop --tp-cursor-stuck-width - Published width of the zone the cursor is stuck to.
 * @cssprop --tp-cursor-stuck-height - Published height of the zone the cursor is stuck to.
 */
export class TpCursor extends TpElement implements CursorParticipant {
  static tagName = 'tp-cursor';
  /** Defining the cursor defines its zone too; they form one catalog entry. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpCursorZone];
  }
  static override presentation = cursorPresentation;
  static override properties = {
    ...TpElement.properties,
    stiffness: { type: Number },
    damping: { type: Number },
    mass: { type: Number },
    restSpeed: { type: Number, attribute: 'rest-speed' },
    restDelta: { type: Number, attribute: 'rest-delta' },
    scope: { type: String, reflect: true },
    region: { type: String },
    hideNative: { attribute: 'hide-native', converter: defaultTrue },
  };
  static override styles = [TpElement.styles, cursorStyles];

  /** Spring stiffness, 1 through 1000. */
  stiffness = DEFAULT_FOLLOWER.stiffness;
  /** Damping coefficient, 0 through 100. */
  damping = DEFAULT_FOLLOWER.damping;
  /** Mass, 0.1 through 10. */
  mass = DEFAULT_FOLLOWER.mass;
  /** Speed in pixels per second below which the follower may settle. */
  restSpeed = DEFAULT_REST.restSpeed;
  /** Distance in pixels below which the follower may settle. */
  restDelta = DEFAULT_REST.restDelta;
  /** `document` follows everywhere; `region` only inside the region element. */
  scope: CursorScope = 'document';
  /** Region element id for `scope="region"`; the parent element when empty. */
  region = '';
  /** Hide the host pointer while following; false keeps it (overlay mode). */
  hideNative = true;

  readonly #follower = new SpringFollower2D();
  #parameters: SpringParameters = DEFAULT_FOLLOWER;
  #registry: CursorDocument | undefined;
  #releaseRoot: (() => void) | undefined;
  #subscription: FrameSubscription | undefined;
  #style: GeneratedStyleResource | undefined;
  readonly #environment = new ComposedEnvironmentObserver(this, () => this.#syncReduced());
  #reduced = false;
  #following = false;
  #outside = true;
  #pressed = false;
  #pointer: CursorPoint | null = null;
  #placed = false;
  #override: string | null = null;
  #state: string | null = null;
  #zone: TpCursorZone | null = null;
  #adopted: AdoptedProperty[] = [];
  #clone = false;
  #stuck: Stuck | null = null;
  #lease: (() => void) | undefined;
  #leaseElement: HTMLElement | null = null;
  #motion: MotionHandle | null = null;
  #surface: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #cloneHost: HTMLElement | null = null;

  get element(): HTMLElement {
    return this;
  }

  /** A region-scoped cursor takes only the zones inside its region. */
  accepts(zone: CursorZoneLike): boolean {
    if (this.scope !== 'region') return true;
    const scopeElement = this.#scopeElement();
    return scopeElement !== null && composedContains(scopeElement, zone.element);
  }

  /** Whether a mouse-like pointer is being followed. */
  get following(): boolean {
    return this.#following;
  }

  /** The published state: the programmatic state, else the active zone's. */
  get state(): string | null {
    return this.#state;
  }

  /** The active zone. */
  get zone(): TpCursorZone | null {
    return this.#zone;
  }

  /** The follower's position in client pixels. */
  get position(): CursorPoint {
    return { x: this.#follower.x, y: this.#follower.y };
  }

  /** The follower's velocity in pixels per second. */
  get velocity(): CursorPoint {
    return { x: this.#follower.vx, y: this.#follower.vy };
  }

  /** The last pointer point inside the scope. */
  get pointer(): CursorPoint | null {
    return this.#pointer;
  }

  get pressed(): boolean {
    return this.#pressed;
  }

  /** Whether the cursor is attracted to a zone. */
  get stuck(): boolean {
    return this.#stuck !== null;
  }

  /** Sets a state that persists until cleared or replaced by a later zone entry. */
  setState(name: string | null): void {
    this.#override = name || null;
    this.#resolveState('programmatic', null);
  }

  /** Re-resolves the zones under the pointer, re-measures attraction and re-enters the top layer. */
  refresh(): void {
    this.#registry?.rehit(null);
    this.#remeasure();
    this.raise();
  }

  // ---- Registry callbacks ------------------------------------------------------------------

  pointerMoved(point: CursorPoint, event: PointerEvent): void {
    if (this.disabled) return;
    const scopeElement = this.#scopeElement();
    const inside =
      this.scope !== 'region' ||
      (scopeElement !== null && event.composedPath().includes(scopeElement));
    this.#setOutside(!inside);
    if (!inside) return;
    this.#pointer = point;
    if (!this.#placed) {
      this.#placed = true;
      this.#follower.snap(point.x, point.y);
    }
    this.#setFollowing(this.#registry?.engaged ?? false, 'pointer', event);
    if (this.#following) this.#subscription?.wake();
  }

  pointerLeft(): void {
    this.#setOutside(true);
  }

  gateChanged(event: Event | null): void {
    this.#setFollowing(
      !this.disabled && this.#pointer !== null && (this.#registry?.engaged ?? false),
      'pointer',
      event,
    );
  }

  pressedChanged(pressed: boolean): void {
    this.#pressed = pressed;
    this.toggleAttribute('data-pressed', pressed);
  }

  zonesChanged(event: Event | null, updated: CursorZoneLike | null): void {
    if (updated && updated === (this.#zone as CursorZoneLike | null)) {
      this.#releaseZone();
    }
    const zone = this.#registry?.activeZone(this) ?? null;
    // A later entry into a zone that names a state replaces a programmatic state.
    if (
      zone &&
      zone !== (this.#zone as CursorZoneLike | null) &&
      event &&
      (zone as TpCursorZone).state
    )
      this.#override = null;
    this.#resolveState('hover', event);
  }

  /** Content scrolled under the pointer; a stuck cursor follows its zone. */
  scrolled(): void {
    this.#remeasure();
  }

  /** Re-enters the top layer above surfaces opened later (Foundation `cc-layer`). */
  raise(): void {
    const surface = this.#surface;
    if (!surface || !this.isConnected) return;
    try {
      if (surface.matches(':popover-open')) {
        surface.hidePopover();
        surface.showPopover();
      } else this.#showSurface();
    } catch {
      this.#showSurface();
    }
  }

  // ---- Lifecycle ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    const registry = (this.#registry = CursorDocument.for(this.ownerDocument));
    this.#releaseRoot = registry.addRoot(this);
    this.#style = new GeneratedStyleResource(this, this.ownerDocument);
    this.#style.setText(LEASE_CSS);
    this.#environment.connect();
    this.#syncReduced();
    const view = this.ownerDocument.defaultView;
    if (view) this.#subscription = frameLoopFor(view).subscribe(this.#frame);
    this.toggleAttribute('data-outside', true);
    void this.updateComplete.then(() => {
      if (!this.isConnected) return;
      this.#showSurface();
      this.gateChanged(null);
      this.#resolveState('hover', null);
    });
  }

  override disconnectedCallback(): void {
    this.#motion?.cancel();
    this.#motion = null;
    this.#releaseZone();
    this.#state = null;
    this.removeAttribute('data-cursor-state');
    this.#setFollowing(false, 'programmatic', null);
    this.#subscription?.release();
    this.#subscription = undefined;
    this.#lease?.();
    this.#lease = undefined;
    this.#leaseElement = null;
    this.#environment.disconnect();
    this.#style?.dispose();
    this.#style = undefined;
    const surface = this.#surface;
    if (surface?.matches(':popover-open')) {
      try {
        surface.hidePopover();
      } catch {
        // Already hidden.
      }
    }
    this.#releaseRoot?.();
    this.#releaseRoot = undefined;
    this.#registry = undefined;
    this.#pointer = null;
    this.#placed = false;
    this.toggleAttribute('data-moving', false);
    this.toggleAttribute('data-pressed', false);
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    this.#surface = this.renderRoot.querySelector('[part~="surface"]');
    this.#content = this.renderRoot.querySelector('[part~="content"]');
    this.#cloneHost = this.renderRoot.querySelector('.clone');
    this.#syncMark();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('stiffness') || changed.has('damping') || changed.has('mass')) {
      this.#parameters = clampSpring(
        { stiffness: this.stiffness, damping: this.damping, mass: this.mass },
        DEFAULT_FOLLOWER,
        (key, value) =>
          this.diagnose(
            'cursor-invalid-physics',
            `"${String(value)}" is not a usable ${key}; the value was clamped or ignored.`,
            { severity: 'warning', once: true },
          ),
      );
      this.#applyPhysics();
    }
    if (changed.has('restSpeed') || changed.has('restDelta'))
      this.#follower.setRest({
        restSpeed: Number.isFinite(this.restSpeed)
          ? Math.max(0, this.restSpeed)
          : DEFAULT_REST.restSpeed,
        restDelta: Number.isFinite(this.restDelta)
          ? Math.max(0, this.restDelta)
          : DEFAULT_REST.restDelta,
      });
    if (changed.has('disabled')) {
      if (this.disabled) {
        this.#releaseZone();
        this.#setFollowing(false, 'disabled', null);
      } else
        this.#setFollowing(
          this.#pointer !== null && (this.#registry?.engaged ?? false),
          'disabled',
          null,
        );
      this.#resolveState('hover', null);
    }
    if (changed.has('scope') || changed.has('region') || changed.has('hideNative'))
      this.#syncLease();
    if (changed.has('motionPolicy')) this.#syncReduced();
  }

  protected override render() {
    return html`<div part="surface" popover="manual" aria-hidden="true" ${SURFACE_ATTRIBUTE}>
      <div part="content">
        <div class="resting"><slot @slotchange=${this.#syncMark}></slot></div>
        <div class="clone"></div>
      </div>
    </div>`;
  }

  // ---- Following, lease and visibility ------------------------------------------------------

  #setFollowing(value: boolean, reason: CursorFollowReason, event: Event | null): void {
    if (value === this.#following) return;
    this.#following = value;
    this.toggleAttribute('data-following', value);
    this.#syncLease();
    if (!value) this.toggleAttribute('data-moving', false);
    this.emit<CursorFollowChangeDetail>('tp-cursor-follow-change', {
      value,
      previousValue: !value,
      reason,
      sourceEvent: event,
    });
  }

  #setOutside(value: boolean): void {
    if (value === this.#outside) return;
    this.#outside = value;
    this.toggleAttribute('data-outside', value);
    this.#syncLease();
    if (!value && this.#following) this.#subscription?.wake();
  }

  #scopeElement(): HTMLElement | null {
    if (this.scope !== 'region') return this.ownerDocument.documentElement;
    if (this.region) {
      const root = this.getRootNode() as Document | ShadowRoot;
      return (root.getElementById?.(this.region) ??
        this.ownerDocument.getElementById(this.region)) as HTMLElement | null;
    }
    // The light-tree parent (the host when slotted), so that the lease attribute lands on an
    // element the document rules reach; a cursor placed directly in a shadow root uses its host.
    const parent = this.parentElement ?? (this.getRootNode() as ShadowRoot).host ?? null;
    return parent instanceof HTMLElement ? parent : null;
  }

  #syncLease(): void {
    const scopeElement = this.#scopeElement();
    const wanted =
      this.isConnected &&
      this.#following &&
      !this.#outside &&
      this.hideNative &&
      !this.disabled &&
      scopeElement !== null &&
      this.#registry !== undefined;
    if (wanted && (!this.#lease || this.#leaseElement !== scopeElement)) {
      this.#lease?.();
      this.#lease = this.#registry!.acquireNativeHide(scopeElement!);
      this.#leaseElement = scopeElement;
    } else if (!wanted && this.#lease) {
      this.#lease();
      this.#lease = undefined;
      this.#leaseElement = null;
    }
  }

  #syncReduced(): void {
    this.#reduced = resolvesReducedMotion(this);
    if (this.#reduced) this.toggleAttribute('data-moving', false);
    this.#subscription?.wake();
  }

  #showSurface(): void {
    const surface = this.#surface;
    if (!surface || !this.isConnected) return;
    try {
      if (!surface.matches(':popover-open')) surface.showPopover();
      surface.classList.remove('fixed');
    } catch {
      surface.classList.add('fixed');
      this.diagnose(
        'cursor-top-layer-unavailable',
        'The host cannot place the cursor in the top layer; it falls back to a fixed box.',
        { severity: 'info', once: true },
      );
    }
  }

  // ---- Frames ------------------------------------------------------------------------------

  readonly #frame = (elapsed: number): boolean => {
    if (!this.#following || this.#outside) return false;
    const target = this.#target();
    if (!target) return false;
    const follower = this.#follower;
    if (this.#reduced) follower.snap(target.x, target.y);
    else {
      follower.setTarget(target.x, target.y);
      follower.step(elapsed);
    }
    this.#paint();
    const moving = !this.#reduced && !follower.settled;
    this.toggleAttribute('data-moving', moving);
    return moving;
  };

  #target(): CursorPoint | null {
    const stuck = this.#stuck;
    if (stuck)
      return {
        x: stuck.bounds.x + stuck.bounds.width / 2,
        y: stuck.bounds.y + stuck.bounds.height / 2,
      };
    return this.#pointer;
  }

  #paint(): void {
    const surface = this.#surface;
    const { x, y, vx, vy } = this.#follower;
    if (surface) {
      const scale = this.ownerDocument.defaultView?.visualViewport?.scale ?? 1;
      surface.style.transform = `translate3d(${round(x)}px, ${round(y)}px, 0) translate(-50%, -50%) scale(${1 / scale})`;
    }
    this.style.setProperty('--tp-cursor-x', `${round(x)}px`);
    this.style.setProperty('--tp-cursor-y', `${round(y)}px`);
    this.style.setProperty('--tp-cursor-velocity-x', `${this.#reduced ? 0 : Math.round(vx)}`);
    this.style.setProperty('--tp-cursor-velocity-y', `${this.#reduced ? 0 : Math.round(vy)}`);
  }

  #applyPhysics(): void {
    const zone = this.#zone;
    this.#follower.setParameters(
      zone
        ? clampSpring(zone.physics(), this.#parameters, (key, value) =>
            this.diagnose(
              'cursor-invalid-physics',
              `"${String(value)}" is not a usable zone ${key}; the value was clamped or ignored.`,
              { severity: 'warning', once: true },
            ),
          )
        : this.#parameters,
    );
    this.#subscription?.wake();
  }

  // ---- State and zones ---------------------------------------------------------------------

  #resolveState(reason: CursorStateReason, event: Event | null): void {
    const zone = this.disabled
      ? null
      : ((this.#registry?.activeZone(this) as TpCursorZone | null) ?? null);
    const state = this.#override ?? (zone?.state || null);
    if (zone === this.#zone && state === this.#state) return;
    const previous = this.#state;
    const accepted = this.emit<CursorStateChangeDetail>(
      'tp-cursor-state-change',
      { value: state, previousValue: previous, zone, reason, sourceEvent: event },
      { cancelable: true },
    );
    if (!accepted) return;
    this.#applyZone(zone);
    this.#state = state;
    if (state) this.setAttribute('data-cursor-state', state);
    else this.removeAttribute('data-cursor-state');
    this.#requestMotion(previous, state);
  }

  #applyZone(zone: TpCursorZone | null): void {
    if (zone === this.#zone) return;
    this.#releaseZone();
    this.#zone = zone;
    if (!zone) return;
    const surface = this.#surface;
    if (surface)
      for (const [name, value] of readAdoptedProperties(getComputedStyle(zone))) {
        surface.style.setProperty(name, value);
        this.#adopted.push(name);
      }
    this.#cloneTemplate(zone);
    this.#applyPhysics();
    this.toggleAttribute('data-native', zone.native);
    if (zone.stick !== 'none') this.#stickTo(zone, zone.stick);
  }

  #releaseZone(): void {
    if (!this.#zone) return;
    this.#zone = null;
    const surface = this.#surface;
    if (surface) for (const name of this.#adopted) surface.style.removeProperty(name);
    this.#adopted = [];
    this.#cloneHost?.replaceChildren();
    this.#clone = false;
    this.#syncMark();
    this.#releaseStick();
    this.toggleAttribute('data-native', false);
    this.#applyPhysics();
  }

  #cloneTemplate(zone: TpCursorZone): void {
    const template = zone.template;
    const host = this.#cloneHost;
    if (!template || !host) return;
    const fragment = this.ownerDocument.importNode(template.content, true);
    if (fragment.querySelector(INTERACTIVE_TARGET_SELECTOR)) {
      this.diagnose(
        'cursor-interactive-template',
        'A zone template contains interactive content; the cursor presents it inert.',
        { severity: 'warning', once: true },
      );
      for (const child of Array.from(fragment.children)) (child as HTMLElement).inert = true;
    }
    host.replaceChildren(fragment);
    this.#clone = true;
    this.#syncMark();
  }

  readonly #syncMark = (): void => {
    const content = this.#content;
    if (!content) return;
    content.toggleAttribute('data-tp-clone', this.#clone);
    content.toggleAttribute(
      'data-tp-mark',
      !this.#clone && !slotOccupied(this, '', { text: true }),
    );
  };

  #stickTo(zone: TpCursorZone, mode: 'center' | 'bounds'): void {
    const bounds = zoneBounds(zone);
    if (!bounds) return;
    const scope = new CleanupScope();
    this.#stuck = { zone, mode, bounds, scope };
    const targets =
      zone.getBoundingClientRect().width > 0
        ? [zone]
        : Array.from(zone.children).filter((child) => child.localName !== 'template');
    for (const target of targets) scope.add(observeResize(target, () => this.#remeasure()));
    this.#publishStuck();
    this.#subscription?.wake();
  }

  #remeasure(): void {
    const stuck = this.#stuck;
    if (!stuck) return;
    const bounds = zoneBounds(stuck.zone);
    if (bounds) stuck.bounds = bounds;
    this.#publishStuck();
    this.#subscription?.wake();
  }

  #publishStuck(): void {
    const stuck = this.#stuck;
    const bounds = stuck?.mode === 'bounds';
    this.toggleAttribute('data-stuck', bounds);
    if (bounds && stuck) {
      this.style.setProperty('--tp-cursor-stuck-width', `${round(stuck.bounds.width)}px`);
      this.style.setProperty('--tp-cursor-stuck-height', `${round(stuck.bounds.height)}px`);
    } else {
      this.style.removeProperty('--tp-cursor-stuck-width');
      this.style.removeProperty('--tp-cursor-stuck-height');
    }
  }

  #releaseStick(): void {
    const stuck = this.#stuck;
    if (!stuck) return;
    this.#stuck = null;
    stuck.scope.dispose();
    this.#publishStuck();
    this.#subscription?.wake();
  }

  #requestMotion(previous: string | null, state: string | null): void {
    this.#motion?.cancel();
    this.#motion = null;
    const surface = this.#surface;
    if (!surface || !this.isConnected) return;
    this.#motion = prepareMotion(this, surface, cursorMotionRoles.state, {
      phase: 'change',
      fromState: previous,
      toState: state,
      context: {
        state: state ?? '',
        previousState: previous ?? '',
        zone: this.#zone?.id ?? '',
        stuck: this.#stuck !== null,
      },
    });
    this.#motion.start();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-cursor': TpCursor;
  }
}
