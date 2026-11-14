import type { SelectEntry, SelectOption, SelectGroup } from '../select/types.js';
import type { IconDefinition } from '../../icons/types.js';
/**
 * One selectable command in a Command palette, with optional search keywords, an icon, a secondary
 * description and a shortcut hint.
 */
export interface CommandItem extends SelectOption {
  keywords?: readonly string[];
  icon?: IconDefinition;
  /**
   * Secondary text after the label and the item's accessible description; filtering reads it only
   * through a supplied filter or, on the list, through `matchFields` or a `source`.
   */
  description?: string;
  shortcut?: string;
  forceMount?: boolean;
  onSelect?: (event: Event) => void;
}
/**
 * A labelled group of commands in a Command palette's `items`, which can itself hold nested
 * entries.
 */
export interface CommandGroup extends Omit<SelectGroup, 'items'> {
  items: readonly CommandEntry[];
  forceMount?: boolean;
}
/** One entry in a Command palette's `items`: a command, a group of commands or a separator. */
export type CommandEntry =
  CommandItem | CommandGroup | Exclude<SelectEntry, SelectOption | SelectGroup>;
/** Ranks a command for a query: `false` hides it, and a number sorts it, lowest first. */
export type CommandFilter = (item: CommandItem, query: string) => number | false;
