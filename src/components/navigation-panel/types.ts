import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
/** The edge a Navigation panel sits on, in writing direction. */
export type NavigationPanelSide = 'inline-start' | 'inline-end';
/**
 * What collapsing a Navigation panel does on wide screens: slide it away, keep a narrow icon rail,
 * or never collapse.
 */
export type NavigationPanelCollapseMode = 'off-canvas' | 'compact' | 'none';
/**
 * The surface treatment of a Navigation panel: part of the page, a floating card, or a frame around
 * an inset page.
 */
export type NavigationPanelVariant = 'integrated' | 'floating' | 'inset';
export interface NavigationPanelState extends Readonly<Record<string, unknown>> {
  expanded: boolean;
  collapsed: boolean;
  compact: boolean;
  compactOpen: boolean;
  side: NavigationPanelSide;
  collapseMode: NavigationPanelCollapseMode;
  variant: NavigationPanelVariant;
}
/**
 * Decides when a Navigation panel is compact by observing the host and publishing a boolean; it
 * returns a cleanup.
 */
export interface NavigationPanelResponsiveAdapter {
  observe(host: HTMLElement, publish: (compact: boolean) => void): () => void;
}
/**
 * The key and modifiers of a Navigation panel's toggle shortcut, and whether it also fires inside
 * editable fields.
 */
export interface NavigationPanelShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  allowEditable?: boolean;
}
/**
 * Registers a Navigation panel's toggle shortcut, scoped as your application decides, and returns a
 * cleanup.
 */
export interface NavigationPanelShortcutAdapter {
  register(
    host: HTMLElement,
    binding: NavigationPanelShortcut,
    handler: (event: KeyboardEvent) => void,
  ): () => void;
}
/**
 * Your storage for a Navigation panel's wide expanded preference, loaded once and saved after each
 * change.
 */
export interface NavigationPanelPersistenceAdapter {
  load(key: string): boolean | undefined | Promise<boolean | undefined>;
  save(key: string, expanded: boolean): void | Promise<void>;
}
/**
 * Called with each proposal to expand or collapse a Navigation panel, as `tp-value-change` is
 * dispatched.
 */
export type NavigationPanelExpandedChangeCallback = (event: TpValueChangeEvent<boolean>) => void;
/**
 * Called with each proposal to open or close a Navigation panel's compact Drawer, as
 * `tp-open-change` is dispatched.
 */
export type NavigationPanelCompactOpenChangeCallback = (event: TpSurfaceOpenChangeEvent) => void;
