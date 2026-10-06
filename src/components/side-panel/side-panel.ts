import { TpDrawer } from '../drawer/drawer.js';
import type { DrawerEdge } from '../drawer/types.js';
import { drawerPresentation } from '../../presentation/families/drawer.js';
/** @deprecated Use DrawerEdge. */
export type PanelEdge = DrawerEdge;
/** @deprecated Use tp-drawer with edge="inline-end" and swipe-enabled="false". */
export class TpSidePanel extends TpDrawer {
  static override tagName = 'tp-side-panel';
  static presentationTagName = 'tp-drawer';
  static override presentation = drawerPresentation;
  override edge: DrawerEdge = 'inline-end';
  override swipeEnabled = false;
}
