import type { IconDefinition } from '../../icons/types.js';
import type { TreeMove, TreeViewMessages } from '../../components/tree-view/types.js';

/** One value a layer's state can take. */
export interface LayerStateValue {
  value: string;
  /** Read after the state's label in the control's name; the value itself when left out. */
  label?: string;
  /** Shown by the state's control while the layer has this value; without it the row shows nothing. */
  icon?: IconDefinition;
  /** Shows the control at rest, or only while the row is hovered or has focus. */
  display?: 'always' | 'hover';
  /** Dims the layer's label and icon, and everything inside a group, while it has this value. */
  dims?: boolean;
}

/**
 * A state of one layer, such as its visibility: its current value and the values it can take, in
 * the order a press on its control steps through them.
 */
export interface LayerState {
  /** Names the state; layers that share a state share its name. */
  name: string;
  /** The control's accessible name. */
  label: string;
  value: string;
  values: readonly LayerStateValue[];
  /** A press on a selected row changes this layer only, or every selected layer with the state. */
  scope?: 'layer' | 'selection';
}

/** One layer of a stack: a plain record the app owns and publishes back after each change. */
export interface Layer<D = unknown> {
  /** Unique across the whole stack, groups included; as markup, the element's `id`. */
  id: string;
  /** The visible text, which renaming edits. */
  label: string;
  /** Shown before the label. */
  icon?: IconDefinition;
  /** An array, even an empty one, makes the layer a group. */
  children?: readonly Layer<D>[];
  /**
   * The layer's states, each with a control in its row. `enabled` is the one state every layer
   * has: a layer is enabled unless its `enabled` state's value is `'false'`.
   */
  states?: readonly LayerState[];
  /** Whether people can rename this layer; the stack's `canRename` when left out. */
  canRename?: boolean;
  /** Whether people can remove this layer; the stack's `canRemove` when left out. */
  canRemove?: boolean;
  /** Anything the app keeps with the layer, such as the object it stands for. */
  data?: D;
}

/** Where a layer goes: its parent group (null at the top level) and its index among siblings. */
export interface LayerLocation {
  parentId: string | null;
  index: number;
}

/** What a `tp-layers-change` proposal does, in `detail.metadata.change`. */
export type LayersChange<D = unknown> =
  | { action: 'move'; ids: readonly string[]; parentId: string | null; index: number }
  | { action: 'rename'; id: string; label: string; previous: string }
  | { action: 'state'; ids: readonly string[]; name: string; value: string }
  | { action: 'add'; layers: readonly Layer<D>[]; parentId: string | null; index: number }
  /** `layers[i]` is the copy of `ids[i]`, placed above it. */
  | { action: 'duplicate'; ids: readonly string[]; layers: readonly Layer<D>[] }
  | { action: 'remove'; ids: readonly string[] }
  | { action: 'group'; group: Layer<D>; ids: readonly string[] }
  | { action: 'ungroup'; ids: readonly string[] };

/** The state of a row, handed to `renderLayer`. */
export interface LayerRowState {
  readonly id: string;
  readonly depth: number;
  readonly group: boolean;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly active: boolean;
  /** Dimmed by a state value of its own or of a group around it. */
  readonly dimmed: boolean;
  /** False when the layer's `enabled` state is `'false'`. */
  readonly enabled: boolean;
  readonly renaming: boolean;
}

/** Replaces a row's leading content, for example with a thumbnail. */
export type LayersRenderLayer<D = unknown> = (layer: Layer<D>, state: LayerRowState) => unknown;

/** Proposes the id of a duplicated layer or a new group that `taken` does not hold. */
export type LayersCreateId<D = unknown> = (
  source: Layer<D> | null,
  taken: { has(id: string): boolean },
) => string;

/** A move the user offers by dragging or with the reorder handle's keys. */
export type LayersMove = TreeMove;

/** User-facing text. Every entry is optional and falls back to English. */
export interface LayersMessages {
  /** Accessible name of the rename field; receives the layer's label. */
  renameField?: (label: string) => string;
  /** Name of a state's control; receives the state's label and the current value's label. */
  stateControl?: (state: string, value: string) => string;
  /** Label of a new group. */
  groupLabel?: string;
  /** Title of the placeholder shown while the stack has no layers and the `empty` slot is unfilled. */
  empty?: string;
  /** Suffix of a duplicated layer's label. */
  copySuffix?: string;
  /** Announced after the user moves several layers. */
  movedLayers?: (count: number) => string;
  /** Text of the tree's own messages, such as the reorder announcements. */
  tree?: TreeViewMessages;
}
