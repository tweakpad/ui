/**
 * Brands for surface hosts, so composed controls recognise any modal or anchored surface
 * (including subclasses under other tags) without a hard-coded tag list.
 */
export const SURFACE_HOST: unique symbol = Symbol('tp-surface-host');
export const DRAWER_HOST: unique symbol = Symbol('tp-drawer-host');

export interface SurfaceHost extends HTMLElement {
  readonly [SURFACE_HOST]: true;
  open: boolean;
}

/** A Dialog, Drawer, Popover, Menu, Select or other surface owner, open or not. */
export function isSurfaceHost(node: unknown): node is SurfaceHost {
  return typeof node === 'object' && node !== null && SURFACE_HOST in node;
}

/** A Drawer under any tag. */
export function isDrawerHost(node: unknown): node is HTMLElement & { open: boolean } {
  return typeof node === 'object' && node !== null && DRAWER_HOST in node;
}
