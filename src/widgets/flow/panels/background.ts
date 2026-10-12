import { svg } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import type { FlowViewport } from '../../../foundation/flow/types.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import type { FlowBackground } from '../types.js';
import { css } from 'lit';

const backgroundStyles = css`
  :host {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: clip;
  }

  svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
  }
`;

/**
 * The background pattern layer (Widgets 6.3 Anatomy): dots, lines or a cross at the grid gap,
 * following the viewport transform. The pattern geometry is written through the object model
 * once per frame by `setViewport`; the colors come from the recipe.
 */
export class TpFlowBackground extends TpElement {
  static tagName = 'tp-flow-background';
  static override presentation = flowPresentation;
  static override properties = {
    ...TpElement.properties,
    pattern: { type: String, reflect: true },
    gap: { type: Number },
  };
  static override styles = [TpElement.styles, backgroundStyles];

  pattern: FlowBackground = 'dots';
  gap = 16;

  #viewport: FlowViewport = { x: 0, y: 0, zoom: 1 };
  readonly #patternId = `tp-flow-pattern-${Math.random().toString(36).slice(2, 8)}`;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  /** Called by the viewport owner once per frame; no Lit update. */
  setViewport(viewport: FlowViewport): void {
    this.#viewport = viewport;
    const pattern = this.renderRoot?.querySelector('pattern');
    if (pattern) this.#writePattern(pattern);
  }

  #writePattern(pattern: SVGPatternElement): void {
    const { x, y, zoom } = this.#viewport;
    const size = this.gap * zoom;
    pattern.setAttribute('x', String(((x % size) + size) % size));
    pattern.setAttribute('y', String(((y % size) + size) % size));
    pattern.setAttribute('width', String(size));
    pattern.setAttribute('height', String(size));
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    const scale = pattern.querySelector('g');
    scale?.setAttribute('transform', `scale(${zoom})`);
  }

  protected override updated(): void {
    const pattern = this.renderRoot.querySelector('pattern');
    if (pattern) this.#writePattern(pattern);
  }

  protected override render() {
    if (this.pattern === 'none') return null;
    const gap = this.gap;
    const half = gap / 2;
    const shape =
      this.pattern === 'dots'
        ? svg`<circle cx=${half} cy=${half} r="1"></circle>`
        : this.pattern === 'lines'
          ? svg`<path d=${`M${half} 0V${gap}M0 ${half}H${gap}`} stroke-width="1"></path>`
          : svg`<path d=${`M${half - 3} ${half}H${half + 3}M${half} ${half - 3}V${half + 3}`} stroke-width="1"></path>`;
    return this.renderPart(
      'flow-background',
      { pattern: this.pattern },
      {
        tag: 'div',
        properties: { part: 'flow-background', 'aria-hidden': 'true' },
        content: svg`<svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id=${this.#patternId} part="flow-background-pattern" data-pattern=${this.pattern} patternUnits="userSpaceOnUse" width=${gap} height=${gap}>
              <g>${shape}</g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill=${`url(#${this.#patternId})`}></rect>
        </svg>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-background': TpFlowBackground;
  }
}
