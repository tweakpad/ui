import { css } from 'lit';
import { TpDrawer } from '../drawer/index.js';
import { drawerPresentation } from '../../presentation/families/drawer.js';
/** Private composition: the existing Drawer owns every modal and presence behavior. */
export class NavigationPanelDrawer extends TpDrawer {
  static override tagName = 'tp-navigation-panel-drawer';
  static override presentation = drawerPresentation;
  controlsTarget: HTMLElement | undefined;
  protected override triggerControlsTarget(): HTMLElement {
    return this.controlsTarget ?? super.triggerControlsTarget();
  }
  static override styles = [
    TpDrawer.styles,
    css`
      .content {
        grid-template-rows: minmax(0, 1fr);
      }

      .body {
        grid-row: 1;
        min-block-size: 0;
        block-size: 100%;
        overflow: hidden;
        padding: 0;
      }

      .content:has(> .corner-close) .body {
        padding-block-start: calc(var(--tp-target-size-min) + var(--tp-space-2) * 2);
      }

      .corner-close,
      .corner-close::part(button) {
        inline-size: var(--tp-target-size-min);
        block-size: var(--tp-target-size-min);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-navigation-panel-drawer': NavigationPanelDrawer;
  }
}
