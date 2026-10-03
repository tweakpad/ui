import { css } from 'lit';
import { TpDrawer } from '../overlays.js';
/** Private composition: the existing Drawer owns every modal and presence behavior. */
export class NavigationPanelDrawer extends TpDrawer {
  static override tagName = 'tp-navigation-panel-drawer';
  static presentationTagName = 'tp-drawer';
  controlsTarget: HTMLElement | undefined;
  protected override triggerControlsTarget(): HTMLElement {
    return this.controlsTarget ?? super.triggerControlsTarget();
  }
  static override styles = [
    TpDrawer.styles,
    css`
      .body {
        padding: 0;
      }
    `,
  ];
}
