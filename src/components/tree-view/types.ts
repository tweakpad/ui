import type { TemplateResult } from 'lit';
import type {
  TreeCheckedState,
  TreeLoadStatus,
  TreeMove,
  TreeSelectionMode,
} from '../../foundation/tree/index.js';
import type { Direction } from '../../foundation/types.js';

export type { TreeCheckedState, TreeLoadStatus, TreeMove, TreeSelectionMode };

/** Default record shape; any shape works with the accessor properties. */
export interface TreeViewItem {
  id: string;
  label?: string;
  children?: readonly TreeViewItem[] | null;
  /** Declares children that `loadChildren` supplies on first expansion. */
  hasChildren?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export type TreeViewExpansionTrigger = 'item' | 'indicator';
/**
 * How presses and arrow keys select in a tree that offers selection: `toggle` presses add or
 * remove an item and arrows only move focus; `replace` presses and arrows select the item alone,
 * while Control or Command toggles and Shift extends.
 */
export type TreeSelectionBehavior = 'toggle' | 'replace';
export type TreeViewGuides = 'line' | 'none';
/** Where a pointer drag can start: on the handle only, or anywhere on the row but its controls. */
export type TreeViewDragActivation = 'handle' | 'item';
/** How a drag shows its landing place: rows make space for it, or a line marks it. */
export type TreeViewDropIndicator = 'displace' | 'line';
/** The edge of the row the reorder handle sits at. */
export type TreeViewHandlePlacement = 'start' | 'end';
export type TreeViewSize = 'sm' | 'default';

/** Row state handed to `renderItem` and pushed to each mounted Item. */
export interface TreeItemState {
  readonly id: string;
  readonly label: string;
  readonly level: number;
  readonly setSize: number;
  readonly posInSet: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  /** Undefined when selection is not offered. */
  readonly selected: boolean | undefined;
  /** Undefined without checkbox selection. */
  readonly checked: TreeCheckedState | undefined;
  /** The item `isItemCurrent` names, such as the active layer of a selection. */
  readonly current: boolean;
  readonly disabled: boolean;
  readonly status: TreeLoadStatus;
  readonly tabStop: boolean;
  /**
   * False for markup-mode ancestors of the tab stop: a shadow host with a negative tabindex
   * would remove its nested items from sequential focus navigation.
   */
  readonly focusable: boolean;
  /** Records mode: rendered by the root; markup mode: authored. */
  readonly records: boolean;
  readonly reorderable: boolean;
  readonly guides: TreeViewGuides;
  readonly expansionTrigger: TreeViewExpansionTrigger;
  /** True only for the one render in which this item's expansion animates. */
  readonly transition: boolean;
  /** The item is the source of a reorder in progress, until it settles in its new place. */
  readonly dragging: boolean;
  /** A dragged item would land as the last child of this item. */
  readonly dropInto: boolean;
  readonly handlePlacement: TreeViewHandlePlacement;
  /** Text direction resolved once by the tree, so rows do not each read computed style. */
  readonly direction: Direction;
}

export interface TreeViewRenderContext extends TreeItemState {
  /** Records mode: the consumer record. */
  readonly item: unknown;
}

export type TreeViewRenderItem<T> = (
  item: T,
  context: TreeViewRenderContext,
) => TemplateResult | string | Node | readonly unknown[] | null | undefined;

export type TreeViewLoadChildren<T> = (
  item: T,
  options: { signal: AbortSignal },
) => Promise<readonly T[] | void> | readonly T[] | void;

export interface TreeViewDropTarget {
  parentId: string | null;
  index: number;
}

export interface TreeViewMessages {
  loading?: string;
  /** Receives the item label. */
  loadError?: (label: string) => string;
  retry?: string;
  /** Accessible name of a reorder handle; receives the item label. */
  moveHandle?: (label: string) => string;
  /** Reorder announcements. */
  pickedUp?: (label: string, level: number, parent: string | null) => string;
  moved?: (label: string, level: number, parent: string | null, position: number) => string;
  dropped?: (label: string, level: number, parent: string | null, position: number) => string;
  cancelled?: (label: string, level: number, parent: string | null, position: number) => string;
  instructions?: string;
  /** Text of the tree root when it has no parent. */
  rootName?: string;
}

/** Tree item owner: the root that publishes state for its items. */
export interface TreeItemOwner {
  itemPress(
    item: HTMLElement,
    region: 'row' | 'indicator' | 'checkbox' | 'retry',
    event: MouseEvent,
  ): void;
  itemConnected(item: HTMLElement): void;
  readonly size: TreeViewSize;
  readonly resolvedMessages: Required<TreeViewMessages>;
}
