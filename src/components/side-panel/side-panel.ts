import { css, type PropertyValues } from 'lit';
import { TpDialog, dialogMotionRoles } from '../dialog/dialog.js';
import { resolveSide, type Side } from '../../foundation/positioning.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
export type PanelEdge = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
const edges: readonly PanelEdge[] = ['block-start', 'block-end', 'inline-start', 'inline-end'];
/** Sheet preset of Dialog. Deliberately has no Drawer gesture/snap state. */
export class TpSidePanel extends TpDialog {
  static tagName = 'tp-side-panel';
  static override properties = {
    ...TpDialog.properties,
    edge: { type: String, reflect: true },
    side: { type: String, noAccessor: true },
  };
  static override styles = [
    TpDialog.styles,
    css`
      .content {
        margin: 0;
        inset: auto;
        inline-size: auto;
        block-size: auto;
        max-inline-size: none;
        max-block-size: none;
        overflow: hidden;
      }

      .content[open] {
        display: flex;
        flex-direction: column;
      }

      .content[data-side='left'],
      .content[data-side='right'] {
        top: 0;
        bottom: 0;
        width: min(75vw, calc(var(--tp-spacing) * 96));
        height: 100dvh;
        max-height: 100dvh;
      }

      .content[data-side='left'] {
        left: 0;
        right: auto;
      }

      .content[data-side='right'] {
        right: 0;
        left: auto;
      }

      .content[data-side='top'],
      .content[data-side='bottom'] {
        left: 0;
        right: 0;
        width: 100vw;
        height: auto;
        max-height: calc(100dvh - var(--tp-space-8));
      }

      .content[data-side='top'] {
        top: 0;
        bottom: auto;
      }

      .content[data-side='bottom'] {
        bottom: 0;
        top: auto;
      }

      .header,
      .footer {
        flex: none;
      }

      .body {
        flex: 1;
        min-block-size: 0;
        overflow: auto;
      }

      .footer {
        margin-block-start: auto;
      }
    `,
  ];
  edge: PanelEdge = 'inline-end';
  #legacySide: Side | undefined;
  get side(): Side {
    return resolveSide(edges.includes(this.edge) ? this.edge : 'inline-end', this);
  }
  set side(value: Side) {
    if (!['left', 'right', 'top', 'bottom'].includes(value)) return;
    this.#legacySide = value;
    this.#normalizeSide();
    this.requestUpdate('side');
  }
  readonly #environment = new ComposedEnvironmentObserver(this, () => this.#place());
  #normalizeSide(): void {
    if (!this.#legacySide || !this.isConnected) return;
    this.edge = edges.find((edge) => resolveSide(edge, this) === this.#legacySide) ?? 'inline-end';
    this.#legacySide = undefined;
  }
  #place(): void {
    const surface = this.surfaceRoot.querySelector<HTMLElement>('.content');
    if (surface) surface.dataset.side = this.side;
  }
  protected override get partPrefix(): string {
    return 'side-panel';
  }
  protected override motionTargets() {
    return [
      ...super.motionTargets(),
      {
        target: this.surfaceRoot.querySelector<HTMLElement>('.content'),
        role: dialogMotionRoles.surface,
      },
    ];
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#normalizeSide();
    this.#environment.connect();
  }
  override disconnectedCallback(): void {
    this.#environment.disconnect();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#normalizeSide();
    this.#place();
  }
}
