/**
 * Command entries of the suggestion lists (`uwg-te-req-surfaces-2`, `uwg-te-req-inline-2`): the
 * slash menu's tools and a suggestion source's items as command items of the Command palette's
 * list, which renders them with their icon, label, description and shortcut hint.
 */
import type { CommandEntry, CommandItem } from '../../../components/command-palette/model.js';
import { projectCommandItem } from '../../../components/command-palette/item.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  resolveToolMember,
  toolLabel,
  toolVisible,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolRegistry,
} from '../../../foundation/text-editor/tools.js';

/** The labels of the slash menu's tool groups. */
const GROUP_LABELS: Readonly<Record<string, keyof TextEditorStrings>> = {
  text: 'groupText',
  lists: 'groupLists',
  insert: 'groupInsert',
};

export interface TextEditorSlashEntriesInput {
  readonly registry: TextEditorToolRegistry;
  /** The tool context of the slash surface. */
  readonly context: TextEditorToolContext;
  readonly enabled: (tool: TextEditorTool, context: TextEditorToolContext) => boolean;
  readonly shortcut: (toolId: string) => KeyShortcut | undefined;
}

/** A tool as a command item: its identifier as the value, with its label and its hint. */
export function toolCommandItem(
  tool: TextEditorTool,
  context: TextEditorToolContext,
  enabled: boolean,
  shortcut: KeyShortcut | undefined,
): CommandItem {
  const icon = tool.icon === undefined ? undefined : resolveToolMember(tool.icon, context);
  const description =
    tool.description === undefined ? undefined : resolveToolMember(tool.description, context);
  return projectCommandItem({
    value: tool.id,
    label: toolLabel(tool, context),
    ...(icon ? { icon } : {}),
    ...(description ? { description } : {}),
    ...(tool.keywords?.length ? { keywords: tool.keywords } : {}),
    ...(shortcut ? { shortcut: shortcut.display } : {}),
    ...(enabled ? {} : { disabled: true }),
  });
}

/**
 * The slash menu's entries: the available, visible tools of the resolved `slash` layout in its
 * order, one group per layout group named by its tools' group (text, lists, insert), unnamed for
 * any other; a group that keeps no tool is left out. In a table cell the block tools report
 * themselves invisible, so only inline entries remain.
 */
export function slashEntries(
  groups: readonly (readonly string[])[],
  input: TextEditorSlashEntriesInput,
): CommandEntry[] {
  const { registry, context } = input;
  const entries: CommandEntry[] = [];
  for (const ids of groups) {
    const tools = ids
      .map((id) => registry.tools.get(id))
      .filter(
        (tool): tool is TextEditorTool =>
          tool !== undefined &&
          tool.kind !== 'suggestion' &&
          registry.isAvailable(tool.id) &&
          toolVisible(tool, context),
      );
    if (!tools.length) continue;
    const items = tools.map((tool) =>
      toolCommandItem(tool, context, input.enabled(tool, context), input.shortcut(tool.id)),
    );
    const key = tools[0]!.group;
    const label = key && GROUP_LABELS[key] ? context.strings[GROUP_LABELS[key]] : undefined;
    entries.push({ type: 'group', ...(label ? { label } : {}), items });
  }
  return entries;
}

/** The value of a suggestion item's entry: its position in the result and the item itself. */
export interface TextEditorSuggestionEntryValue {
  readonly index: number;
  readonly item: unknown;
}

/** Whether a value is a suggestion item's entry value. */
export function isSuggestionEntryValue(value: unknown): value is TextEditorSuggestionEntryValue {
  return typeof value === 'object' && value !== null && 'index' in value && 'item' in value;
}

/**
 * The entries of a suggestion source's result: each item keyed by its position in that result,
 * labelled and described through the suggestion tool, so an item needs no identity member.
 */
export function suggestionEntries(tool: TextEditorTool, items: readonly unknown[]): CommandItem[] {
  const suggest = tool.suggest;
  return items.map((item, index) => {
    const label = suggest?.label?.(item) ?? String(item);
    const description = suggest?.description?.(item);
    const value: TextEditorSuggestionEntryValue = Object.freeze({ index, item });
    return projectCommandItem({
      value,
      label,
      ...(description ? { description } : {}),
    });
  });
}

/** Search fields of a command entry beyond its label: its keywords and its description. */
export function commandMatchFields(item: unknown): readonly string[] {
  const entry = item as Partial<CommandItem> | null;
  if (!entry || typeof entry !== 'object') return [];
  return [...(entry.keywords ?? []), ...(entry.description ? [entry.description] : [])];
}
