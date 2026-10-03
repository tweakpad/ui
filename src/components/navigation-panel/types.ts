import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
export type NavigationPanelSide = 'inline-start' | 'inline-end';
export type NavigationPanelCollapseMode = 'off-canvas' | 'compact' | 'none';
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
export interface NavigationPanelResponsiveAdapter {
  observe(host: HTMLElement, publish: (compact: boolean) => void): () => void;
}
export interface NavigationPanelShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  allowEditable?: boolean;
}
export interface NavigationPanelShortcutAdapter {
  register(
    host: HTMLElement,
    binding: NavigationPanelShortcut,
    handler: (event: KeyboardEvent) => void,
  ): () => void;
}
export interface NavigationPanelPersistenceAdapter {
  load(key: string): boolean | undefined | Promise<boolean | undefined>;
  save(key: string, expanded: boolean): void | Promise<void>;
}
export type NavigationPanelExpandedChangeCallback = (event: TpValueChangeEvent<boolean>) => void;
export type NavigationPanelCompactOpenChangeCallback = (event: TpSurfaceOpenChangeEvent) => void;
