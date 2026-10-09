import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { composedParent } from '../../foundation/focus.js';
import { resolveLocale } from '../../foundation/services.js';
import { prepareMotion, resolvesReducedMotion } from '../../foundation/motion.js';
import type { MotionHandle } from '../../foundation/motion.js';
import { progressMotionRoles } from './motion.js';
import { progressState } from './state.js';
import type { AccessibleProgressText, ProgressState } from './state.js';
import { progressPresentation } from '../../presentation/families/progress.js';

const progressValueConverter = {
  fromAttribute: (value: string | null): number | null =>
    value === null || value.trim() === '' ? null : Number(value),
};
const minimumConverter = {
  fromAttribute: (value: string | null): number => (value === null ? 0 : Number(value)),
};
const maximumConverter = {
  fromAttribute: (value: string | null): number => (value === null ? 100 : Number(value)),
};

/** Noninteractive task progress; every part observes one semantic and formatting snapshot. */
export class TpProgress extends TpElement {
  static tagName = 'tp-progress';
  static override presentation = progressPresentation;
  static override properties = {
    ...TpElement.properties,
    value: { converter: progressValueConverter },
    minimum: { converter: minimumConverter },
    maximum: { converter: maximumConverter },
    min: { converter: minimumConverter, noAccessor: true },
    max: { converter: maximumConverter, noAccessor: true },
    label: { type: String },
    locale: { attribute: false },
    format: { attribute: false },
    valueText: { attribute: 'value-text' },
    getAccessibleValueText: { attribute: false },
  };
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-label', 'aria-labelledby'];
  }
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      [part~='progress'] {
        display: flex;
        flex-wrap: wrap;
        min-inline-size: 0;
      }

      [part~='progress-label'],
      [part~='progress-value-output'] {
        min-inline-size: 0;
      }

      [part~='progress-track'] {
        position: relative;
        display: flex;
        inline-size: 100%;
        overflow: hidden;
      }

      [part~='progress-indicator'] {
        block-size: 100%;
        flex: 0 0 auto;
      }

      [part~='progress-indicator'][data-indeterminate] {
        inline-size: 35%;
      }

      [part~='progress-indicator'][data-reduced-motion] {
        animation: none !important;
        transition: none !important;
      }

      [part~='progress-indicator'][data-tp-motion-driven~='value'] {
        transition: none !important;
      }

      [part~='progress-indicator'][data-tp-motion-driven~='indeterminate'] {
        animation: none !important;
      }

      @keyframes tp-progress-indeterminate {
        from {
          translate: -100% 0;
        }

        to {
          translate: 300% 0;
        }
      }

      @keyframes tp-progress-indeterminate-rtl {
        from {
          translate: 100% 0;
        }

        to {
          translate: -300% 0;
        }
      }
    `,
  ];

  value: number | null = null;
  minimum = 0;
  maximum = 100;
  /** Legacy accessible-name fallback; a Label slot supplies the visible operation name. */
  label = 'Progress';
  locale: string | string[] | undefined;
  format: Intl.NumberFormatOptions | undefined;
  valueText: string | undefined;
  getAccessibleValueText: AccessibleProgressText | undefined;
  get min(): number {
    return this.minimum;
  }
  set min(value: number) {
    this.minimum = value;
  }
  get max(): number {
    return this.maximum;
  }
  set max(value: number) {
    this.maximum = value;
  }

  #state: ProgressState = progressState({ value: null, minimum: 0, maximum: 100 });
  #previous: ProgressState = this.#state;
  #root: HTMLElement | null = null;
  #label: HTMLElement | null = null;
  #indicator: HTMLElement | null = null;
  #motionTarget: HTMLElement | null = null;
  #labelId = createId('tp-progress-label');
  #valueMotion: MotionHandle | null = null;
  #ambientMotion: MotionHandle | null = null;
  #ambient = false;
  #reduced = false;
  #observer: MutationObserver | null = null;
  #media: MediaQueryList | null = null;
  #contentSignature = '';
  #diagnostics = new Set<string>();
  readonly #rootReference = (element: HTMLElement | null): void => {
    this.#root = element;
  };
  readonly #labelReference = (element: HTMLElement | null): void => {
    this.#label = element;
  };
  readonly #indicatorReference = (element: HTMLElement | null): void => {
    this.#indicator = element;
  };

  /** Current immutable raw/clamped/format/status snapshot, also supplied to every part resolver. */
  get state(): ProgressState {
    return this.#state;
  }
  get status(): ProgressState['status'] {
    return this.#state.status;
  }
  get percentage(): number | null {
    return this.#state.percentage;
  }
  get formattedValue(): string {
    return this.#state.formattedValue;
  }

  override attributeChangedCallback(
    name: string,
    previous: string | null,
    next: string | null,
  ): void {
    super.attributeChangedCallback(name, previous, next);
    if (previous !== next && ['aria-label', 'aria-labelledby'].includes(name)) this.requestUpdate();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    const ownerWindow = this.ownerDocument.defaultView;
    this.#media = ownerWindow?.matchMedia('(prefers-reduced-motion: reduce)') ?? null;
    this.#media?.addEventListener('change', this.#contentChanged);
    const Observer = ownerWindow?.MutationObserver;
    if (Observer) {
      this.#observer = new Observer(this.#contentChanged);
      const scopes = new Set<Node>([this.ownerDocument, this.getRootNode()]);
      for (let node: Node | null = composedParent(this); node; node = composedParent(node))
        scopes.add(node.getRootNode());
      for (const scope of scopes)
        this.#observer.observe(scope, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            'id',
            'lang',
            'dir',
            'aria-label',
            'aria-labelledby',
            'motion-policy',
            'slot',
            'class',
            'style',
          ],
        });
    }
    this.#contentSignature = this.#signature();
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#media?.removeEventListener('change', this.#contentChanged);
    this.#media = null;
    this.#valueMotion?.cancel();
    this.#ambientMotion?.cancel();
    this.#valueMotion = this.#ambientMotion = null;
    this.#ambient = false;
    this.#motionTarget = null;
    super.disconnectedCallback();
  }
  readonly #contentChanged = (): void => {
    const signature = this.#signature();
    if (signature === this.#contentSignature) return;
    this.#contentSignature = signature;
    this.requestUpdate();
  };
  #slots(name: string): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(`[slot="${name}"]`)].filter(
      (element) => element.parentElement?.closest<HTMLElement>('tp-progress') === this,
    );
  }
  #partProvided(name: string, slot: string): boolean {
    const contract = this.partContracts[name];
    return (
      this.#slots(slot).length > 0 ||
      (!!contract && ('content' in contract || !!contract.renderDelegate))
    );
  }
  #externalLabels(): Element[] {
    const properties = this.partContracts.progress?.hostProperties ?? {};
    const supplied = properties['.ariaLabelledByElements'];
    if (Array.isArray(supplied))
      return supplied.filter(
        (element): element is Element => element instanceof this.ownerDocument.defaultView!.Element,
      );
    const ids = String(properties['aria-labelledby'] ?? this.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/u)
      .filter(Boolean);
    const scope = this.getRootNode() as Document | ShadowRoot;
    return ids.flatMap((id) => {
      const element = scope.getElementById?.(id) ?? this.ownerDocument.getElementById(id);
      return element ? [element] : [];
    });
  }
  #signature(): string {
    return JSON.stringify([
      this.#slots('label').map((element) => [element.id, element.textContent]),
      this.#slots('output').map((element) => [element.id, element.textContent]),
      this.#externalLabels().map((element) => [element.id, element.textContent]),
      resolveLocale(this),
      this.direction,
      resolvesReducedMotion(this),
    ]);
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#previous = this.#state;
    this.#reduced = resolvesReducedMotion(this);
    this.#state = progressState({
      value: this.value,
      minimum: this.minimum,
      maximum: this.maximum,
      locale: (this.locale ?? resolveLocale(this)) || undefined,
      format: this.format,
      valueText: this.valueText,
      getAccessibleValueText: this.getAccessibleValueText,
      diagnostic: this.#diagnose,
    });
  }
  readonly #diagnose = (code: string, message: string): void => {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.diagnose('progress-' + code, message);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    for (const status of ['indeterminate', 'progressing', 'complete'])
      this.toggleAttribute(`data-${status}`, this.#state.status === status);
    this.#syncName();
    this.#syncMotion();
  }
  #syncName(): void {
    if (!this.#root) return;
    const properties = this.partContracts.progress?.hostProperties ?? {};
    const explicit =
      properties['aria-label'] ?? properties['.ariaLabel'] ?? this.getAttribute('aria-label');
    const labels = this.#externalLabels();
    const internal = this.#label?.isConnected ? this.#label : null;
    if (labels.length) {
      this.#root.removeAttribute('aria-label');
      this.#root.ariaLabelledByElements = labels;
    } else if (explicit !== null && explicit !== undefined) {
      this.#root.ariaLabelledByElements = null;
      this.#root.removeAttribute('aria-labelledby');
      this.#root.setAttribute('aria-label', String(explicit));
    } else if (internal) {
      this.#root.ariaLabelledByElements = null;
      if (!internal.id) internal.id = this.#labelId;
      this.#root.removeAttribute('aria-label');
      this.#root.setAttribute('aria-labelledby', internal.id || this.#labelId);
    } else {
      this.#root.ariaLabelledByElements = null;
      this.#root.removeAttribute('aria-labelledby');
      this.#root.setAttribute('aria-label', this.label);
    }
  }
  #syncMotion(): void {
    const target = this.#indicator?.isConnected ? this.#indicator : null;
    if (target !== this.#motionTarget) {
      this.#valueMotion?.cancel();
      this.#ambientMotion?.cancel();
      this.#valueMotion = this.#ambientMotion = null;
      this.#ambient = false;
      this.#motionTarget = target;
    }
    if (!target) return;
    const ambient = this.#state.indeterminate && !this.#reduced;
    if (ambient !== this.#ambient) {
      this.#ambientMotion?.cancel();
      this.#ambientMotion = prepareMotion(this, target, progressMotionRoles.indeterminate, {
        phase: ambient ? 'start' : 'stop',
        fromState: this.#ambient ? 'indeterminate' : 'determinate',
        toState: ambient ? 'indeterminate' : 'determinate',
      });
      this.#ambientMotion.start();
      this.#ambient = ambient;
    }
    if (this.#state.percentage !== null && this.#state.percentage !== this.#previous.percentage) {
      this.#valueMotion?.cancel();
      this.#valueMotion = prepareMotion(this, target, progressMotionRoles.value, {
        phase: 'change',
        fromState: this.#previous.clampedValue,
        toState: this.#state.clampedValue,
        context: {
          minimum: this.#state.minimum,
          maximum: this.#state.maximum,
          percentage: this.#state.percentage,
          fromPercentage: this.#previous.percentage,
        },
      });
      this.#valueMotion.start();
    }
  }
  protected override render(): unknown {
    const state = this.#state;
    const markers = {
      '?data-indeterminate': state.indeterminate,
      '?data-progressing': state.progressing,
      '?data-complete': state.complete,
    };
    const label = this.renderPart('progress-label', state, {
      tag: 'span',
      enabled: this.#partProvided('progress-label', 'label'),
      properties: { ...markers, id: this.#labelId, role: 'presentation' },
      reference: this.#labelReference,
      content: html`<slot name="label">${this.label}</slot>`,
    });
    const value = this.renderPart('progress-value-output', state, {
      tag: 'span',
      enabled: this.#partProvided('progress-value-output', 'output'),
      properties: { ...markers, 'aria-hidden': 'true' },
      content: this.#slots('output').length
        ? html`<slot name="output"></slot>`
        : state.formattedValue,
    });
    const indicator = this.renderPart('progress-indicator', state, {
      tag: 'div',
      properties: {
        ...markers,
        '?data-reduced-motion': this.#reduced,
        'data-direction': this.direction,
        style: state.percentage === null ? {} : { inlineSize: `${state.percentage}%` },
      },
      reference: this.#indicatorReference,
    });
    const track = this.renderPart('progress-track', state, {
      tag: 'div',
      properties: markers,
      content: indicator,
    });
    return this.renderPart('progress', state, {
      tag: 'div',
      reference: this.#rootReference,
      properties: {
        ...markers,
        role: 'progressbar',
        'aria-label': this.label,
        'aria-valuemin': String(state.minimum),
        'aria-valuemax': String(state.maximum),
        'aria-valuenow': state.clampedValue === null ? nothing : String(state.clampedValue),
        'aria-valuetext': state.accessibleValueText,
      },
      content: html`${label}${value}${track}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-progress': TpProgress;
  }
}
