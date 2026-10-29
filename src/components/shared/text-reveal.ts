import { css, html, type PropertyValues } from 'lit';
import { cssTimeMs, stateRole } from '../../foundation/motion.js';
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
  type RevealCoordinatorHost,
  type RevealMember,
  type StaggerFrom,
} from '../../foundation/reveal-coordination.js';
import {
  RevealPlayback,
  StandaloneReveal,
  transitionSpan,
} from '../../foundation/reveal-playback.js';
import { scheduleLayoutPass, type LayoutPass } from '../../foundation/layout-batch.js';
import { adoptStyleText } from '../../foundation/generated-style.js';
import {
  TextSplitter,
  type SplitConfig,
  type SplitUnit,
} from '../../foundation/text-split/splitter.js';

/** The motion role every text reveal plays (Foundation §18.19). */
export const textRevealRoles = {
  reveal: stateRole('reveal'),
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

/** What a text reveal splits: its units, the clipped unit, and whether lines become mirrors. */
export type TextRevealSplit = Omit<SplitConfig, 'staggerFrom'>;

/**
 * The shared owner of the Motion › Text elements (Text split, Text mirror, Text stroke): it
 * splits the text into pieces around the original content, keeps the lines in step with the
 * layout, and plays, holds, hides and scrubs the reveal alone or inside a Scroll trigger. Each
 * element names what it splits, its effect tokens and its piece styles; everything else is here.
 */
export abstract class TextRevealElement extends TpElement {
  static override properties = {
    ...TpElement.properties,
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
    `,
  ];

  /** Milliseconds between consecutive pieces. */
  stagger = 30;
  /** The piece the stagger starts from. */
  staggerFrom: StaggerFrom = 'first';
  /** Reveal again on every viewport entry instead of only the first. */
  revealRepeat = false;
  /**
   * While set, a ready reveal waits in its start state. Setting it on a revealed text hides it,
   * playing the reveal backwards; removing it reveals the text again.
   */
  revealHold = false;

  /** Light-tree piece styles, adopted once per root for every instance in it. */
  protected abstract readonly pieceCss: string;
  /** What to split; read before every split. */
  protected abstract splitOptions(): TextRevealSplit;
  /** The active effect tokens; empty disables the reveal. */
  protected abstract revealEffects(coordinator: RevealCoordinatorHost | undefined): string[];
  /** After every split and line pass, and when the effects change: build effect-owned pieces. */
  protected afterSplit(): void {}
  /** The width changed without moving a word: aligned text moved inside its lines. */
  protected widthChanged(): void {}
  /** The element whose transitions and scrubbed animation time a piece's reveal. */
  protected timedElement(piece: HTMLElement): Element {
    return piece;
  }

  readonly #splitter = new TextSplitter(this, {
    diagnose: (code, message) => queueMicrotask(() => this.diagnose(code, message)),
  });
  #splitKey: string | undefined;
  #reverted = false;
  #fontsReady = false;
  #width = -1;
  #height = -1;
  /** The last line pass ran without a layout; it runs again once the text appears. */
  #linesPending = false;
  #measuredBlind = false;
  #releases: (() => void)[] = [];
  #releaseContent: (() => void)[] = [];
  #releaseStyles: (() => void) | undefined;

  /** The line pieces, in order (empty unless lines are split). */
  get lines(): HTMLElement[] {
    // Lines always exist internally so wrapping matches the original; only requested ones show.
    return this.#config.units.has('lines') ? [...this.#splitter.pieces.lines] : [];
  }

  /** The word pieces, in order. */
  get words(): HTMLElement[] {
    return [...this.#splitter.pieces.words];
  }

  /** The character pieces, in order (empty unless characters are split). */
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

  get #effects(): string[] {
    return this.revealEffects(this.#membership.host);
  }

  get #config(): SplitConfig {
    return { ...this.splitOptions(), staggerFrom: parseStaggerFrom(this.staggerFrom) };
  }

  /** The pieces that carry the reveal, in document order. */
  protected get animatedPieces(): readonly HTMLElement[] {
    return this.#splitter.pieces.animated;
  }

  /** Ready to reveal: split, with the fonts it uses loaded. */
  #ready(): boolean {
    return this.#fontsReady && (this.#splitter.active || this.#reverted);
  }

  readonly #playback = new RevealPlayback({
    owner: this,
    role: textRevealRoles.reveal,
    emit: (type, detail) => {
      // A settled reveal can drop what only the motion needed (Text mirror's sliding copies).
      if (type === 'tp-reveal-change-complete' && (detail as { revealed: boolean }).revealed)
        this.toggleAttribute('data-tp-at-rest', true);
      this.emit(type, detail);
    },
    effect: () => this.#effects.join(' '),
    context: () => ({
      unit: this.getAttribute('data-tp-unit'),
      count: this.#splitter.pieces.animated.length,
    }),
    apply: (revealed, delay, animated = false) => {
      if (revealed && delay > 0) this.style.setProperty('--_tp-tm-delay', `${delay}ms`);
      else this.style.removeProperty('--_tp-tm-delay');
      // A hide keeps the transitions on while the pieces return to their start state.
      this.toggleAttribute('data-tp-hiding', !revealed && animated);
      this.removeAttribute('data-tp-at-rest');
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
      return transitionSpan(view.getComputedStyle(this.timedElement(last)));
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
      const timed = view.getComputedStyle(this.timedElement(animated[0]!));
      return (
        last * Math.max(0, Number(this.stagger) || 0) +
        cssTimeMs(timed.animationDuration.split(',')[0]!)
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

  /** Line passes (Foundation §18.19 `tm-lines`): flatten, measure every splitter, relayout. */
  readonly #linePass: LayoutPass<DOMRect[][]> = {
    active: () => this.isConnected && this.#splitter.measuresLines,
    write: () => this.#splitter.flatten(),
    measure: () => {
      // Without a layout (inside a hidden panel, tab or dialog) the text still gets its pieces,
      // but every line measures as one: the pass is redone once the text appears.
      this.#measuredBlind = this.getClientRects().length === 0;
      return this.#splitter.measure();
    },
    apply: (boxes) => {
      this.#linesPending = this.#measuredBlind;
      if (this.#splitter.relayout(boxes)) this.#afterSplit();
      else this.#discardOwnRecords();
    },
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusin', this.#mirrorFocus);
    this.addEventListener('focusout', this.#mirrorFocus);
    // Pieces live in the light tree, so their structure is shared by every instance in this root.
    const root = this.getRootNode();
    this.#releaseStyles = adoptStyleText(
      this,
      root.nodeType === 11 ? (root as ShadowRoot) : this.ownerDocument,
      this.pieceCss,
    );
    this.#membership.connect();
    this.#observe();
    if (this.#splitter.measuresLines) scheduleLayoutPass(this, this.#linePass);
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
    const key = JSON.stringify([[...config.units], config.mask, config.staggerFrom, config.mirror]);
    // The first split happens here, before the first paint of the defined element.
    if (key !== this.#splitKey) {
      this.#splitKey = key;
      this.#split();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // Holding a revealed text again hides it: the reveal plays backwards to the start state.
    if (changed.has('revealHold') && this.revealHold && this.#playback.revealed)
      void this.#playback.hide();
    if (changed.has('revealHold') || changed.has('revealRepeat')) this.#readinessChanged();
  }

  /** The effects changed: effect-owned pieces follow, and the reveal re-evaluates. */
  protected effectsChanged(): void {
    this.afterSplit();
    this.#readinessChanged();
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  #split(): void {
    const config = this.#config;
    this.toggleAttribute('data-tp-masked', config.mask !== null);
    this.#splitter.split(config, true);
    scheduleLayoutPass(this, this.#linePass);
    this.#afterSplit();
    this.#observeContent();
  }

  /** After every split or line pass: drop our own mutation records and announce the pieces. */
  #afterSplit(): void {
    this.afterSplit();
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
      if (this.#splitter.measuresLines) scheduleLayoutPass(this, this.#linePass);
      this.#fontsReady = true;
      queueMicrotask(() => this.#readinessChanged());
    });
  }

  /** Width and font observation, which only line splits need. */
  #observe(): void {
    this.#releases.push(
      observeResize(this, (entry) => {
        const { width, height } = entry.contentRect;
        // Hidden: the lines laid out for the last visible width stay, and nothing is measured.
        if (width === 0 && height === 0) return;
        const [previousWidth, previousHeight] = [this.#width, this.#height];
        this.#width = width;
        this.#height = height;
        if (!this.#splitter.measuresLines) return;
        // A text split while hidden measures its lines now that it has a layout.
        if (this.#linesPending) {
          scheduleLayoutPass(this, this.#linePass);
          return;
        }
        if (previousWidth < 0) return;
        // Aligned text moves inside its line box with the width, even when no word moves.
        if (width !== previousWidth) this.widthChanged();
        // Recalculated inside the resize delivery, before the new layout is painted. A width
        // change matters only when it can move a word; a height change at the same width comes
        // from outside (typography, content), since a line pass never changes the height.
        const widthMoves = width !== previousWidth && !this.#splitter.fits(width);
        const heightMoved = width === previousWidth && height !== previousHeight;
        if (widthMoves || heightMoved) scheduleLayoutPass(this, this.#linePass);
      }),
      observeFonts(this.ownerDocument, () => {
        if (this.#splitter.measuresLines) scheduleLayoutPass(this, this.#linePass);
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
