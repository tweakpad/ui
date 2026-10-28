import type { SelectEntry, SelectOption, SelectGroup } from '../select/types.js';
import type { IconDefinition } from '../../icons/types.js';
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
export interface CommandGroup extends Omit<SelectGroup, 'items'> {
  items: readonly CommandEntry[];
  forceMount?: boolean;
}
export type CommandEntry =
  CommandItem | CommandGroup | Exclude<SelectEntry, SelectOption | SelectGroup>;
export type CommandFilter = (item: CommandItem, query: string) => number | false;
