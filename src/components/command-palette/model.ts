import type { SelectEntry, SelectOption, SelectGroup } from '../select/types.js';
import type { IconDefinition } from '../../icons/types.js';
export interface CommandItem extends SelectOption {
  keywords?: readonly string[];
  icon?: IconDefinition;
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
