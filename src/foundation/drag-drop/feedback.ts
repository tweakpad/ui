import { css, html } from 'lit';
import { CleanupScope } from '../services.js';
import { OwnedAttributes } from '../owned-attributes.js';
import { OwnedStyles } from '../owned-styles.js';
import { OwnedPortal } from '../owned-portal.js';
import { resolvesReducedMotion, type MotionHandle } from '../motion.js';
import { cloneFeedback } from './clone.js';
import {
  getFrameTransform,
  measureElement,
  parseTransform,
  ancestorScale,
} from './dom-geometry.js';
import { markFeedbackRoot } from './feedback-scope.js';
import { Rectangle, type Coordinates } from './geometry.js';
import type { DragDropManager } from './manager.js';
import { dragMotion, validateTransition } from './motion.js';
import type { Draggable } from './entities.js';
import type { FeedbackMode, FeedbackOptions } from './types.js';

export class DragFeedback {
  #scope: CleanupScope | undefined;
  #element: HTMLElement | undefined;
  #original: HTMLElement | undefined;
  #placeholder: HTMLElement | undefined;
  #styles: OwnedStyles | undefined;
  #source: Draggable | undefined;
  #options: FeedbackOptions = {};
  #translate: Coordinates = { x: 0, y: 0 };
  #initialTranslate: Coordinates = { x: 0, y: 0 };
  #motion: MotionHandle | undefined;
  #origin: Rectangle | undefined;
  mode: FeedbackMode = 'none';
  constructor(readonly manager: DragDropManager) {}
  /** List adapter supplies a real component composition for opaque shadow content. */
  createPreview: ((source: Draggable) => HTMLElement | undefined) | undefined;
  get element(): HTMLElement | undefined {
    return this.#element;
  }
  get placeholder(): HTMLElement | undefined {
    return this.#placeholder;
  }
  start(): void {
    this.dispose();
    const source = this.manager.dragOperation.source;
    if (!source?.element) return;
    const options = (this.#options = this.manager.effectiveOptions);
    const mode =
      typeof options.feedback === 'function'
        ? options.feedback(source, this.manager)
        : (options.feedback ?? 'default');
    if (!['default', 'clone', 'move', 'none'].includes(mode))
      throw new TypeError('Invalid drag feedback mode.');
    this.mode = mode;
    if (mode === 'none') return;
    validateTransition(options.keyboardTransition, source.element);
    if (typeof options.dropAnimation !== 'function')
      validateTransition(options.dropAnimation, source.element);
    const overlayDisabled =
      typeof options.overlayDisabled === 'function'
        ? options.overlayDisabled(source)
        : options.overlayDisabled;
    const overlay = overlayDisabled ? null : options.overlay;
    const original = source.element as HTMLElement,
      element = (overlay ?? original) as HTMLElement;
    if (!element.style)
      throw new Error('Feedback requires a styled element or an explicit overlay.');
    const initial = measureElement(original),
      view = original.ownerDocument.defaultView;
    if (!initial || !view) throw new Error('Feedback source is no longer measurable.');
    const computed = view.getComputedStyle(original);
    // Capture live computed values before markers or generated presentation writes.
    const transform = computed.transform,
      scale = computed.scale,
      translate = computed.translate,
      origin = computed.transformOrigin;
    const originalAncestors = ancestorScale(original),
      originalFrame = getFrameTransform(original);
    const parsed = parseTransform({ transform, scale, translate });
    const parsedTranslate = parseTransform({ translate });
    this.#initialTranslate = { x: parsedTranslate?.x ?? 0, y: parsedTranslate?.y ?? 0 };
    this.#source = source;
    this.#original = original;
    this.#element = element;
    this.#origin = initial;
    const scope = (this.#scope = new CleanupScope((error) => this.manager.reportError(error)));
    const attributes = new OwnedAttributes(element),
      styles = (this.#styles = new OwnedStyles(element));
    scope.add(() => styles.dispose());
    scope.add(() => attributes.dispose());
    attributes.set('data-dragging', '');
    if (overlay) {
      scope.add(markFeedbackRoot(element));
      attributes.set('inert', '');
      attributes.set('aria-hidden', 'true');
      attributes.set('data-preview', '');
    } else if (mode !== 'move') {
      const preview = this.createPreview?.(source);
      const clone = preview ? null : cloneFeedback(original);
      const placeholder = (this.#placeholder = preview ?? clone!.element);
      const release = preview ? markFeedbackRoot(placeholder) : undefined;
      placeholder.setAttribute('inert', '');
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.setAttribute('tabindex', '-1');
      placeholder.setAttribute('data-preview', '');
      placeholder.style.pointerEvents = 'none';
      if (mode === 'default') placeholder.style.visibility = 'hidden';
      placeholder.style.width = `${initial.width / Math.abs(originalAncestors.x * originalFrame.scaleX * (parsed?.scaleX ?? 1))}px`;
      placeholder.style.boxSizing = 'border-box';
      original.after(placeholder);
      scope.add(() => {
        clone?.dispose();
        placeholder.remove();
        release?.();
      });
      for (const target of this.manager.registry.droppables) {
        const proxy =
          target.element === original
            ? placeholder
            : target.element
              ? clone?.mapping.get(target.element)
              : undefined;
        if (!proxy) continue;
        const previous = target.proxy;
        target.proxy = proxy;
        scope.add(() => {
          if (target.proxy === proxy) target.proxy = previous;
        });
      }
      if (original.localName === 'tr') {
        const cells = [...original.querySelectorAll(':scope > td,:scope > th')];
        for (const cell of cells) {
          const cellStyles = new OwnedStyles(cell as HTMLElement);
          cellStyles.set('width', `${cell.getBoundingClientRect().width}px`);
          scope.add(() => cellStyles.dispose());
        }
      }
      if (view.MutationObserver) {
        const observer = new view.MutationObserver(() => {
          // Follow an authored/Lit reparent; never restore into an obsolete sibling location.
          if (
            original.isConnected &&
            original.parentNode !== element.ownerDocument.body &&
            original.nextSibling !== placeholder &&
            !this.#portalHost?.contains(original)
          )
            original.after(placeholder);
        });
        observer.observe(original.ownerDocument, { childList: true, subtree: true });
        scope.add(() => observer.disconnect());
      }
    }
    const root =
      typeof options.rootElement === 'function' ? options.rootElement(source) : options.rootElement;
    if (root && (!root.isConnected || root.nodeType !== 1))
      throw new Error('Feedback root must be a connected element.');
    const topLayer = !root && 'showPopover' in element && !element.hasAttribute('popover');
    if (!topLayer || root) {
      const portal = (this.#portal = new OwnedPortal(
        original,
        css`
          :host {
            position: fixed;
            inset: 0 auto auto 0;
            pointer-events: none;
            z-index: 2147483647;
          }
        `,
      ));
      if (!element.parentNode) (root ?? original.ownerDocument.body).append(element);
      if (
        !portal.update((root ?? original.ownerDocument.body) as HTMLElement, html`<slot></slot>`, {
          projectedNodes: [element],
          externalProjection: true,
          allowSameOriginDocument: true,
        })
      )
        throw new Error('Unsupported feedback root realm.');
      this.#portalHost = portal.host;
      scope.add(() => {
        portal.clear();
        this.#portal = undefined;
        this.#portalHost = null;
      });
    }
    const frame = getFrameTransform(element),
      ancestors = ancestorScale(element);
    frame.scaleX *= ancestors.x;
    frame.scaleY *= ancestors.y;
    const retained = {
      x: (originalAncestors.x * originalFrame.scaleX) / frame.scaleX,
      y: (originalAncestors.y * originalFrame.scaleY) / frame.scaleY,
    };
    const independent = parseTransform({ scale });
    styles.set('position', 'fixed');
    styles.set('margin', '0');
    styles.set('box-sizing', 'border-box');
    styles.set('pointer-events', 'none');
    styles.set('inset', 'auto');
    styles.set('left', `${(initial.left - frame.x) / frame.scaleX}px`);
    styles.set('top', `${(initial.top - frame.y) / frame.scaleY}px`);
    styles.set(
      'width',
      `${initial.width / Math.abs(frame.scaleX * (overlay ? 1 : (parsed?.scaleX ?? 1) * retained.x))}px`,
    );
    styles.set(
      'height',
      `${initial.height / Math.abs(frame.scaleY * (overlay ? 1 : (parsed?.scaleY ?? 1) * retained.y))}px`,
    );
    styles.set('transform', overlay ? 'none' : transform);
    styles.set(
      'scale',
      overlay
        ? 'none'
        : `${(independent?.scaleX ?? 1) * retained.x} ${(independent?.scaleY ?? 1) * retained.y}`,
    );
    styles.set('transform-origin', overlay ? '0 0' : origin);
    styles.set('translate', overlay ? '0px 0px' : translate);
    if (overlay) this.#initialTranslate = { x: 0, y: 0 };
    if (topLayer) {
      attributes.set('popover', 'manual');
      try {
        element.showPopover();
        scope.add(() => {
          if (element.matches(':popover-open')) element.hidePopover();
        });
      } catch (error) {
        throw new Error('Feedback could not enter the top layer.', { cause: error });
      }
    }
    const positioned = measureElement(element);
    if (positioned) {
      styles.set(
        'left',
        `${(initial.left - frame.x + initial.left - positioned.left) / frame.scaleX}px`,
      );
      styles.set(
        'top',
        `${(initial.top - frame.y + initial.top - positioned.top) / frame.scaleY}px`,
      );
    }
    if (this.#placeholder && view.ResizeObserver) {
      const observer = new view.ResizeObserver(() => {
        const placeholder = this.#placeholder,
          measured = placeholder && measureElement(placeholder);
        if (!measured || !this.#origin || this.manager.dragOperation.status !== 'dragging') return;
        styles.set(
          'width',
          `${measured.width / Math.abs(frame.scaleX * (parsed?.scaleX ?? 1) * retained.x)}px`,
        );
        styles.set(
          'height',
          `${measured.height / Math.abs(frame.scaleY * (parsed?.scaleY ?? 1) * retained.y)}px`,
        );
      });
      observer.observe(this.#placeholder);
      scope.add(() => observer.disconnect());
    }
    this.update();
  }
  #portal: OwnedPortal | undefined;
  #portalHost: HTMLElement | null = null;
  syncPlacement(): void {
    if (!this.#placeholder || !this.#original) return;
    if (this.#portal) this.#portal.relocateProjection(this.#original, this.#placeholder);
    else this.#placeholder.before(this.#original);
  }
  update(): void {
    const element = this.#element,
      styles = this.#styles,
      operation = this.manager.dragOperation;
    if (!element || !styles || operation.status !== 'dragging') return;
    const frame = getFrameTransform(element),
      ancestors = ancestorScale(element);
    frame.scaleX *= ancestors.x;
    frame.scaleY *= ancestors.y;
    const translate = {
      x: this.#initialTranslate.x + operation.transform.x / frame.scaleX,
      y: this.#initialTranslate.y + operation.transform.y / frame.scaleY,
    };
    if (translate.x === this.#translate.x && translate.y === this.#translate.y) return;
    const previous = this.#translate;
    this.#translate = translate;
    styles.set('translate', `${translate.x}px ${translate.y}px`);
    if (operation.input === 'keyboard' && this.#options.keyboardTransition !== null) {
      this.#motion?.cancel();
      this.#motion = dragMotion(
        this.#original!,
        element,
        'keyboard-feedback',
        [
          { translate: `${previous.x}px ${previous.y}px` },
          { translate: `${translate.x}px ${translate.y}px` },
        ],
        this.#options.keyboardTransition ?? {},
        { itemId: this.#source!.id, x: translate.x, y: translate.y },
      );
    }
  }
  async settle(): Promise<void> {
    const element = this.#element,
      source = this.#source,
      original = this.#original;
    if (!element || !source || !original) return;
    const animation =
      source.feedbackOptions.dropAnimation !== undefined
        ? source.feedbackOptions.dropAnimation
        : this.#options.dropAnimation;
    if (animation === null || !element.isConnected || resolvesReducedMotion(original)) return;
    this.#motion?.cancel();
    const attributes = new OwnedAttributes(element);
    attributes.set('data-dropping', '');
    this.#scope?.add(() => attributes.dispose());
    if (typeof animation === 'function') {
      // The shared motion owner bounds custom visual work separately from decision suspension.
      const { prepareMotion } = await import('../motion.js');
      const motion = (this.#motion = prepareMotion(
        original,
        element,
        { name: 'drop-settlement', kind: 'state', phases: ['change'], completion: 'blocking' },
        { phase: 'change', context: { itemId: source.id } },
        {
          play: () => ({
            finished: Promise.resolve(
              animation({
                source,
                originalElement: original,
                feedbackElement: element,
                placeholder: this.#placeholder ?? null,
                translate: { ...this.#translate },
                moved: !!(this.#translate.x || this.#translate.y),
              }),
            ),
            cancel() {},
          }),
        },
      ));
      motion.start();
      await motion.finished;
      return;
    }
    const operation = this.manager.dragOperation;
    const destination = this.#placeholder?.isConnected
      ? this.#placeholder
      : operation.source?.element;
    const target = measureElement(destination) ?? this.#origin,
      current = measureElement(element);
    if (!target || !current) return;
    const delta = Rectangle.delta(target, current, source.alignment),
      frame = getFrameTransform(element);
    const final = {
      x: this.#translate.x + delta.x / frame.scaleX,
      y: this.#translate.y + delta.y / frame.scaleY,
    };
    this.#motion = dragMotion(
      original,
      element,
      'drop-settlement',
      [
        {
          translate: `${this.#translate.x}px ${this.#translate.y}px`,
          width: `${current.width / Math.abs(frame.scaleX)}px`,
          height: `${current.height / Math.abs(frame.scaleY)}px`,
        },
        {
          translate: `${final.x}px ${final.y}px`,
          width: `${target.width / Math.abs(frame.scaleX)}px`,
          height: `${target.height / Math.abs(frame.scaleY)}px`,
        },
      ],
      animation ?? {},
      { itemId: source.id, x: final.x, y: final.y },
    );
    await this.#motion.finished;
  }
  dispose(): void {
    this.mode = 'none';
    this.#motion?.cancel();
    this.#motion = undefined;
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#element = this.#original = this.#placeholder = undefined;
    this.#styles = undefined;
    this.#source = undefined;
    this.#origin = undefined;
    this.#translate = { x: 0, y: 0 };
  }
}
