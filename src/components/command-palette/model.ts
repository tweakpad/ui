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
/** Rank is finite and stable; token matches may span label, value and keywords. */
export function commandRank(item: CommandItem, query: string): number | false {
  const normalize = (text: string) =>
    text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const fields = [
    String(item.value),
    item.text ?? (typeof item.label === 'string' ? item.label : ''),
    ...(item.keywords ?? []),
  ].map(normalize);
  if (!tokens.every((token) => fields.some((field) => field.includes(token)))) return false;
  return tokens.every((token) => fields.some((field) => field.startsWith(token))) ? 0 : 1;
}
