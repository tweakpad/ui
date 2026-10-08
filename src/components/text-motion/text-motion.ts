import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { MotionRoleDefinition } from '../../foundation/motion.js';
import {
  discardSubtreeRecords,
  fontsLoaded,
  observeFonts,
  observeResize,
  observeSubtree,
  whenFontsReady,
} from '../../foundation/observation.js';
import {
  parseStaggerFrom,
  RevealMembership,
  type RevealMember,
  type StaggerFrom,
} from '../../foundation/reveal-coordination.js';
import {
  RevealPlayback,
  StandaloneReveal,
  transitionSpan,
} from '../../foundation/reveal-playback.js';
import { scheduleLinePass, type LinePass } from '../../foundation/text-split/scheduler.js';
import {
  TextSplitter,
  type SplitConfig,
  type SplitUnit,
} from '../../foundation/text-split/splitter.js';
import { acquireRootStyles } from '../../foundation/text-split/styles.js';
import { textMotionPresentation } from '../../presentation/families/text-motion.js';
import { textMotionPieceCss } from './piece-styles.js';

export type TextMotionEffect =
  'fade' | 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out' | 'blur';
export type TextMotionMask = 'none' | 'lines' | 'words' | 'chars';

const EFFECTS: readonly TextMotionEffect[] = [
  'fade',
  'up',
  'down',
  'left',
  'right',
  'zoom-in',
  'zoom-out',
  'blur',
];
const DEFAULT_REVEAL = 'fade up';

/** Milliseconds of the first time in a computed time list (`0.56s`, `560ms`). */
function seconds(value: string): number {
  const text = value.split(',')[0]!.trim();
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  return text.endsWith('ms') ? number : number * 1000;
}

export const textMotionRoles = {
  reveal: {
    name: 'reveal',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

/** The units named by a `split` value; `chars` without `words` still keeps words whole. */
export function parseSplitUnits(value: string | null | undefined): Set<SplitUnit> {
  const tokens = (value ?? '').split(/\s+/);
  const units = new Set<SplitUnit>();
  for (const unit of ['lines', 'words', 'chars'] as const)
    if (tokens.includes(unit)) units.add(unit);
  if (!units.size) units.add('words');
  return units;
}

/**
 * `tp-text-motion`: splits its text into lines, words and characters, optionally masked, and
 * reveals the pieces with a staggered effect (Foundation §18.19, Component Library Text motion).
 *
 * Pieces are built in the light tree so page typography and links keep working; the original
 * nodes are kept and restored by `revert()`. Lines are recalculated before paint when the width
 * changes or fonts finish loading, and splitting never changes the space the text occupies.
 * Standalone it reveals on entering the viewport; inside a `tp-scroll-trigger` (or an image group)
 * that coordinator owns the timing.
 *
 * Markers: `data-split-ready`, `data-in-view` (while observed), `data-revealed`.
 *
 * @slot - The text, with inline formatting and interactive elements.
 * @csspart text-motion - The host.
 * @fires tp-text-split - `{ lines, words, chars, masks }` after every split.
 * @fires tp-reveal-change - `{ revealed, effect }` when the reveal starts or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last piece settles.
 * @cssprop --tp-text-motion-duration - Per-piece reveal duration. Default twice the normal duration.
 * @cssprop --tp-text-motion-easing - Reveal easing. Default `ease-out`.
 * @cssprop --tp-text-motion-distance - Travel without a mask. Default `0.4em`.
 * @cssprop --tp-text-motion-scale - Scale offset for zoom-in and zoom-out. Default `0.2`.
 * @cssprop --tp-text-motion-blur - Start blur for `blur`. Default `0.15em`.
 * @cssprop --tp-text-motion-mask-bleed - How far masks extend over ascenders and descenders.
 * Default `0.1em`.
 */
export class TpTextMotion extends TpElement {
  static tagName = 'tp-text-motion';
  static override presentation = textMotionPresentation;
  static override properties = {
    ...TpElement.properties,
    split: { type: String, reflect: true },
    mask: { type: String, reflect: true },
    reveal: { type: String, reflect: true },
    stagger: { type: Number },
    staggerFrom: { type: String, attribute: 'stagger-from', reflect: true },
    revealRepeat: { type: Boolean, attribute: 'reveal-repeat', reflect: true },
    revealHold: { type: Boolean, attribute: 'reveal-hold', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      :host([hidden]) {
        display: none;
      }

      /* Characters are positioned individually, so kerning and ligatures cannot apply; they are
         off from the first frame so splitting never re-wraps the text. */
      :host([split~='chars']) {
        font-kerning: none;
        font-variant-ligatures: none;
      }
    `,
  ];

  /** Units to create: tokens of `chars`, `words`, `lines`. The finest unit animates. */
  split = 'words';
  /** The unit whose pieces are clipped, so they emerge from behind it. */
  mask: TextMotionMask = 'none';
  /**
   * Effect tokens (`fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out`, `blur`). Unset
   * uses the coordinator default, or `fade up`; empty disables the reveal.
   */
  reveal: string | undefined = undefined;
  /** Milliseconds between consecutive pieces. */
  stagger = 30;
  /** The piece the stagger starts from. */
  staggerFrom: StaggerFrom = 'first';
  /** Reveal again on every viewport entry instead of only the first. */
  revealRepeat = false;
  /** While set, a ready reveal waits in its start state. */
  revealHold = false;

  readonly #splitter = new TextSplitter(this, {
    diagnose: (code, message) =>
      queueMicrotask(() => this.emit('tp-diagnostic', { code, message, severity: 'warning' })),
  });
  #splitKey: string | undefined;
  #reverted = false;
  #fontsReady = false;
  #width = -1;
  #height = -1;
  #releases: (() => void)[] = [];
  #releaseContent: (() => void)[] = [];
  #releaseStyles: (() => void) | undefined;

  /** The line pieces, in order (empty unless `split` includes `lines`). */
  get lines(): HTMLElement[] {
    // Lines always exist internally so wrapping matches the original; only requested ones show.
    return this.#config.units.has('lines') ? [...this.#splitter.pieces.lines] : [];
  }

  /** The word pieces, in order. */
  get words(): HTMLElement[] {
    return [...this.#splitter.pieces.words];
  }

  /** The character pieces, in order (empty unless `split` includes `chars`). */
  get chars(): HTMLElement[] {
    return [...this.#splitter.pieces.chars];
  }

  /** The mask wrappers, in order. */
  get masks(): HTMLElement[] {
    return [...this.#splitter.pieces.masks];
  }

  /** Whether the reveal has played (false again after a repeat reset). */
  get revealed(): boolean {
    return this.#playback.revealed;
  }

  get #effects(): TextMotionEffect[] {
    const value = this.reveal ?? (this.#membership.host?.reveal || DEFAULT_REVEAL);
    const tokens = value.split(/\s+/);
    return EFFECTS.filter((effect) => tokens.includes(effect));
  }

  get #config(): SplitConfig {
    const units = parseSplitUnits(this.split);
    const mask = this.mask === 'none' ? null : (this.mask as SplitUnit);
    return {
      units,
      mask: mask && units.has(mask) ? mask : null,
      staggerFrom: parseStaggerFrom(this.staggerFrom),
    };
  }

  /** Ready to reveal: split, with the fonts it uses loaded. */
  #ready(): boolean {
    return this.#fontsReady && (this.#splitter.active || this.#reverted);
  }

  readonly #playback = new RevealPlayback({
    owner: this,
    role: textMotionRoles.reveal,
    emit: (type, detail) => this.emit(type, detail),
    effect: () => this.#effects.join(' '),
    context: () => {
      const animated = this.#splitter.pieces.animated;
      return {
        unit: this.getAttribute('data-tp-unit'),
        count: animated.length,
      };
    },
    apply: (revealed, delay) => {
      if (revealed && delay > 0) this.style.setProperty('--_tp-tm-delay', `${delay}ms`);
      else this.style.removeProperty('--_tp-tm-delay');
      this.toggleAttribute('data-revealed', revealed);
    },
    span: () => {
      const view = this.ownerDocument.defaultView;
      const animated = this.#splitter.pieces.animated;
      if (!view || !animated.length) return 0;
      // The last piece in stagger order settles last.
      const last = animated.reduce((latest, piece) =>
        Number(piece.style.getPropertyValue('--tp-text-order')) >=
        Number(latest.style.getPropertyValue('--tp-text-order'))
          ? piece
          : latest,
      );
      return transitionSpan(view.getComputedStyle(last));
    },
  });

  readonly #member: RevealMember = {
    element: this,
    ready: () => this.#ready(),
    revealing: () => this.#effects.length > 0,
    revealed: () => this.#playback.revealed,
    held: () => this.revealHold,
    prepare: () => {},
    reveal: (delay) => this.#playback.play(delay),
    reset: () => this.#playback.reset(),
    refresh: () => this.requestUpdate(),
    duration: () => {
      // The scrubbed keyframe resolves the piece duration; the last stagger offset adds to it.
      const animated = this.#splitter.pieces.animated;
      const view = this.ownerDocument.defaultView;
      if (!animated.length || !view) return 0;
      this.toggleAttribute('data-tp-scrub', true);
      const last = Math.max(
        ...animated.map((piece) => Number(piece.style.getPropertyValue('--tp-text-order')) || 0),
      );
      return (
        last * Math.max(0, Number(this.stagger) || 0) +
        seconds(view.getComputedStyle(animated[0]!).animationDuration)
      );
    },
    scrub: (time) => {
      if (time === null) {
        this.removeAttribute('data-tp-scrub');
        this.style.removeProperty('--_tp-tm-time');
        return;
      }
      this.toggleAttribute('data-tp-scrub', true);
      this.style.setProperty('--_tp-tm-time', `${Math.max(0, time)}ms`);
    },
  };

  readonly #membership = new RevealMembership(this, this.#member, () => {
    this.requestUpdate();
    this.#readinessChanged();
  });

  readonly #standalone = new StandaloneReveal(this, {
    playback: this.#playback,
    repeat: () => this.revealRepeat,
    revealing: () => this.#effects.length > 0,
    ready: () => this.#ready(),
    held: () => this.revealHold,
    coordinated: () => this.#membership.coordinated,
  });

  readonly #linePass: LinePass = {
    active: () => this.isConnected && this.#splitter.measuresLines,
    flatten: () => this.#splitter.flatten(),
    measure: () => this.#splitter.measure(),
    relayout: (boxes) => {
      if (this.#splitter.relayout(boxes)) this.#afterSplit();
      else this.#discardOwnRecords();
    },
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusin', this.#mirrorFocus);
    this.addEventListener('focusout', this.#mirrorFocus);
    this.#releaseStyles = acquireRootStyles(this, textMotionPieceCss);
    this.#membership.connect();
    this.#observe();
    if (this.#splitter.measuresLines) scheduleLinePass(this.#linePass);
    this.#waitForFonts();
  }

  /**
   * A focused link that wraps onto later lines shows its focus ring on every fragment, as a
   * native wrapped link would: its continuations mirror the original's outline.
   */
  readonly #mirrorFocus = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    const continuations = this.#splitter.continuationsOf(target);
    if (!continuations.length) return;
    const style =
      event.type === 'focusin' && target.matches(':focus-visible')
        ? this.ownerDocument.defaultView?.getComputedStyle(target)
        : undefined;
    for (const clone of continuations) {
      clone.style.outline = style?.outline ?? '';
      clone.style.outlineOffset = style?.outlineOffset ?? '';
    }
  };

  override disconnectedCallback(): void {
    this.removeEventListener('focusin', this.#mirrorFocus);
    this.removeEventListener('focusout', this.#mirrorFocus);
    for (const release of [...this.#releases, ...this.#releaseContent]) release();
    this.#releases = [];
    this.#releaseContent = [];
    this.#releaseStyles?.();
    this.#releaseStyles = undefined;
    this.#standalone.release();
    this.#membership.disconnect();
    super.disconnectedCallback();
  }

  /** Splits again from the original content (after `revert()`, or to force a recalculation). */
  splitText(): void {
    this.#reverted = false;
    this.#splitKey = undefined;
    this.requestUpdate();
  }

  /** Restores the original content and stops splitting until `splitText()` is called. */
  revert(): void {
    this.#reverted = true;
    for (const release of this.#releaseContent) release();
    this.#releaseContent = [];
    this.#splitter.revert();
    this.#splitKey = undefined;
    this.removeAttribute('data-split-ready');
    this.removeAttribute('data-tp-masked');
    this.#emitSplit();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const effects = this.#effects.join(' ');
    if (effects) this.setAttribute('data-reveal', effects);
    else this.removeAttribute('data-reveal');
    this.style.setProperty('--_tp-tm-stagger', `${Math.max(0, Number(this.stagger) || 0)}ms`);
    if (this.#reverted) return;
    const config = this.#config;
    const key = JSON.stringify([[...config.units], config.mask, config.staggerFrom]);
    // The first split happens here, before the first paint of the defined element.
    if (key !== this.#splitKey) {
      this.#splitKey = key;
      this.#split();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('revealHold') || changed.has('reveal') || changed.has('revealRepeat'))
      this.#readinessChanged();
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  #split(): void {
    const config = this.#config;
    this.toggleAttribute('data-tp-masked', config.mask !== null);
    this.#splitter.split(config, true);
    scheduleLinePass(this.#linePass);
    this.#afterSplit();
    this.#observeContent();
  }

  /** After every split or line pass: drop our own mutation records and announce the pieces. */
  #afterSplit(): void {
    this.#discardOwnRecords();
    this.toggleAttribute('data-split-ready', this.#splitter.active);
    this.#emitSplit();
    this.#readinessChanged();
  }

  #emitSplit(): void {
    this.emit('tp-text-split', {
      lines: this.lines,
      words: this.words,
      chars: this.chars,
      masks: this.masks,
    });
  }

  #discardOwnRecords(): void {
    discardSubtreeRecords(this, { subtree: false });
    const holder = this.#splitter.holder;
    if (holder) discardSubtreeRecords(holder, { content: true });
  }

  #readinessChanged(): void {
    if (this.#membership.coordinated) this.#membership.update();
    else this.#standalone.update();
  }

  #waitForFonts(): void {
    if (this.#fontsReady) return;
    if (fontsLoaded(this.ownerDocument)) {
      this.#fontsReady = true;
      return;
    }
    void whenFontsReady(this.ownerDocument).then(() => {
      if (this.#splitter.measuresLines) scheduleLinePass(this.#linePass);
      this.#fontsReady = true;
      queueMicrotask(() => this.#readinessChanged());
    });
  }

  /** Width and font observation, which only line splits need. */
  #observe(): void {
    this.#releases.push(
      observeResize(this, (entry) => {
        const { width, height } = entry.contentRect;
        const [previousWidth, previousHeight] = [this.#width, this.#height];
        this.#width = width;
        this.#height = height;
        if (previousWidth < 0 || !this.#splitter.measuresLines) return;
        // Recalculated inside the resize delivery, before the new layout is painted. A width
        // change matters only when it can move a word; a height change at the same width comes
        // from outside (typography, content), since a line pass never changes the height.
        const widthMoves = width !== previousWidth && !this.#splitter.fits(width);
        const heightMoved = width === previousWidth && height !== previousHeight;
        if (widthMoves || heightMoved) scheduleLinePass(this.#linePass);
      }),
      observeFonts(this.ownerDocument, () => {
        if (this.#splitter.measuresLines) scheduleLinePass(this.#linePass);
      }),
    );
    this.#observeContent();
  }

  /** Outside changes to the content: edits of the original, or new children of the host. */
  #observeContent(): void {
    for (const release of this.#releaseContent) release();
    this.#releaseContent = [];
    const holder = this.#splitter.holder;
    if (!this.isConnected || !holder) return;
    this.#releaseContent.push(
      observeSubtree(holder, () => this.#contentChanged(), { content: true }),
      observeSubtree(
        this,
        () => {
          if (!this.#splitter.foreign().length && this.#splitter.owns(this.childNodes)) return;
          this.#splitter.adopt();
          this.#contentChanged();
        },
        { subtree: false },
      ),
    );
  }

  #contentChanged(): void {
    if (this.#reverted || !this.isConnected) return;
    this.#split();
  }
}
