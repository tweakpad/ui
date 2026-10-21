/**
 * Layouts of the text editor (Widgets `uwg-te-par-tools-2`, `uwg-te-tab-layout`,
 * `uwg-te-req-tools-1`, `uwg-te-req-tools-2`).
 *
 * `layout` composes each surface from groups of tool identifiers, so that an application adds,
 * removes, reorders, overrides or turns off the tools of a surface without UI code; a key that it
 * leaves out keeps its default. `*` adds the remaining available tools that declare the surface.
 * Resolution is pure: it returns the layout that surfaces render and the diagnostics to report.
 */
import type { TextEditorDiagnostic } from './engine.js';
import type { TextEditorSurface, TextEditorTool, TextEditorToolRegistry } from './tools.js';

/** Groups of tool identifiers in order; `*` adds the remaining tools of the surface. */
export type TextEditorLayoutGroups = readonly (readonly string[])[];

/**
 * One key for each surface, the camelCase form of its identity, and two keys that name no
 * surface: the active suggestion tools and whether the gutter shows.
 */
export interface TextEditorLayout {
  readonly toolbar: TextEditorLayoutGroups;
  readonly selectionToolbar: TextEditorLayoutGroups;
  readonly slash: TextEditorLayoutGroups;
  readonly turnInto: TextEditorLayoutGroups;
  readonly blockMenu: TextEditorLayoutGroups;
  readonly tableRow: TextEditorLayoutGroups;
  readonly tableColumn: TextEditorLayoutGroups;
  readonly tableCell: TextEditorLayoutGroups;
  /** The identifiers of the active suggestion tools. */
  readonly suggestions: readonly string[];
  readonly gutter: boolean;
}

/** The layout key of a surface. */
export type TextEditorLayoutSurfaceKey = Exclude<keyof TextEditorLayout, 'suggestions' | 'gutter'>;

const groups = (...list: (readonly string[])[]): TextEditorLayoutGroups =>
  Object.freeze(list.map((group) => Object.freeze([...group])));

/** The default layouts (`uwg-te-tab-layout` r1–r10). */
export const defaultTextEditorLayout: TextEditorLayout = Object.freeze({
  toolbar: groups(
    ['undo', 'redo'],
    ['block-type', 'list-type', 'blockquote', 'code-block'],
    ['bold', 'italic', 'strike', 'code', 'underline', 'highlight', 'link'],
    ['superscript', 'subscript'],
    ['align'],
    ['table', 'image'],
  ),
  selectionToolbar: groups(
    ['turn-into'],
    ['bold', 'italic', 'underline', 'strike', 'code'],
    ['link'],
    ['color'],
    ['more'],
  ),
  slash: groups(
    ['paragraph', 'heading-1', 'heading-2', 'heading-3', 'blockquote', 'code-block'],
    ['bullet-list', 'ordered-list', 'task-list'],
    ['table', 'image', 'divider'],
    ['*'],
  ),
  turnInto: groups([
    'paragraph',
    'heading-1',
    'heading-2',
    'heading-3',
    'bullet-list',
    'ordered-list',
    'task-list',
    'blockquote',
    'code-block',
    '*',
  ]),
  blockMenu: groups(
    ['turn-into', 'color'],
    ['duplicate-block', 'copy-block-link'],
    ['move-block-up', 'move-block-down'],
    ['*'],
    ['delete-block'],
  ),
  tableRow: groups(
    ['table-move-row-up', 'table-move-row-down'],
    ['table-insert-row-before', 'table-insert-row-after'],
    ['cell-background', 'table-cell-align'],
    ['table-toggle-header-row'],
    ['table-duplicate-row', 'table-delete-row'],
  ),
  tableColumn: groups(
    ['table-move-column-before', 'table-move-column-after'],
    ['table-insert-column-before', 'table-insert-column-after'],
    ['cell-background', 'table-cell-align'],
    ['table-toggle-header-column'],
    ['table-duplicate-column', 'table-delete-column'],
  ),
  tableCell: groups(
    ['table-merge-cells', 'table-split-cell'],
    ['cell-background', 'table-cell-align'],
    ['table-clear-cells'],
  ),
  suggestions: Object.freeze(['slash']),
  gutter: true,
});

/** Each surface with its layout key, in the order of the layout table. */
export const TEXT_EDITOR_LAYOUT_SURFACES: readonly (readonly [
  TextEditorSurface,
  TextEditorLayoutSurfaceKey,
])[] = Object.freeze([
  Object.freeze(['toolbar', 'toolbar'] as const),
  Object.freeze(['selection-toolbar', 'selectionToolbar'] as const),
  Object.freeze(['slash', 'slash'] as const),
  Object.freeze(['turn-into', 'turnInto'] as const),
  Object.freeze(['block-menu', 'blockMenu'] as const),
  Object.freeze(['table-row', 'tableRow'] as const),
  Object.freeze(['table-column', 'tableColumn'] as const),
  Object.freeze(['table-cell', 'tableCell'] as const),
]);

/** The wildcard of a layout group. */
const REMAINING = '*';

export interface TextEditorResolvedLayout {
  /** The layout to render: every key present, `*` expanded, skipped identifiers removed. */
  readonly layout: TextEditorLayout;
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/**
 * Resolves the application's layout over the registry. For each surface it takes the
 * application's groups, or the default ones for a key it leaves out, and in order:
 * - skips an unknown identifier, or a suggestion tool's, with `text-editor-layout-unknown`;
 * - leaves out an unavailable tool, which `text-editor-tool-unavailable` reports only when the
 *   application's layout places it, never a default layout;
 * - expands the first `*` into every available tool that declares the surface, is no suggestion
 *   tool and is not listed elsewhere in the surface's layout, in registration order: alone in a
 *   group into one group per tool group, ordered by the first registered tool of each, followed by
 *   one group of the tools that declare none, and among other identifiers in place;
 * - drops empty groups, so that an empty list turns the surface off.
 * `suggestions` keeps the available suggestion tools it lists, skipping others as above.
 */
export function resolveTextEditorLayout(
  layout: Partial<TextEditorLayout> | null | undefined,
  registry: TextEditorToolRegistry,
): TextEditorResolvedLayout {
  const diagnostics: TextEditorDiagnostic[] = [];
  const reported = new Set<string>();
  const report = (key: string, diagnostic: TextEditorDiagnostic) => {
    if (reported.has(key)) return;
    reported.add(key);
    diagnostics.push(diagnostic);
  };
  const unknown = (layoutKey: string, id: string, reason: string) =>
    report(`unknown ${layoutKey} ${id}`, {
      code: 'text-editor-layout-unknown',
      message: `The ${layoutKey} layout lists "${id}", ${reason}; it is skipped.`,
    });
  const unavailable = (id: string) =>
    report(`unavailable ${id}`, {
      code: 'text-editor-tool-unavailable',
      message: `The layout places the tool "${id}", whose capabilities the engine does not declare; it is left out.`,
    });

  /** The registered tool an identifier places, or `null` when it is skipped. */
  const place = (layoutKey: string, id: string, explicit: boolean): TextEditorTool | null => {
    const tool = registry.tools.get(id);
    if (!tool) {
      unknown(layoutKey, id, 'which is no tool');
      return null;
    }
    if (tool.kind === 'suggestion') {
      unknown(layoutKey, id, 'a suggestion tool, which takes no place on a surface');
      return null;
    }
    if (!registry.isAvailable(id)) {
      if (explicit) unavailable(id);
      return null;
    }
    return tool;
  };

  const resolved: Record<string, unknown> = {};
  for (const [surface, key] of TEXT_EDITOR_LAYOUT_SURFACES) {
    const own = layout?.[key];
    const explicit = Array.isArray(own);
    const written = explicit ? own : defaultTextEditorLayout[key];
    const listed = new Set<string>();
    for (const group of written) if (Array.isArray(group)) for (const id of group) listed.add(id);
    let expanded = false;
    const remaining = (): string[] => {
      if (expanded) return [];
      expanded = true;
      return registry.order.filter((id) => {
        const tool = registry.tools.get(id)!;
        return (
          !listed.has(id) &&
          tool.kind !== 'suggestion' &&
          (tool.surfaces ?? []).includes(surface) &&
          registry.isAvailable(id)
        );
      });
    };
    const result: (readonly string[])[] = [];
    for (const group of written) {
      if (!Array.isArray(group)) continue;
      if (group.length === 1 && group[0] === REMAINING) {
        result.push(...byGroup(remaining(), registry));
        continue;
      }
      const ids: string[] = [];
      for (const id of group) {
        if (id === REMAINING) ids.push(...remaining());
        else if (typeof id !== 'string') unknown(key, String(id), 'which is no tool identifier');
        else if (place(key, id, explicit)) ids.push(id);
      }
      if (ids.length > 0) result.push(Object.freeze(ids));
    }
    resolved[key] = Object.freeze(result);
  }

  const ownSuggestions = layout?.suggestions;
  const explicitSuggestions = Array.isArray(ownSuggestions);
  const suggestions: string[] = [];
  for (const id of explicitSuggestions ? ownSuggestions : defaultTextEditorLayout.suggestions) {
    if (typeof id !== 'string') {
      unknown('suggestions', String(id), 'which is no tool identifier');
      continue;
    }
    if (suggestions.includes(id)) continue;
    const tool = registry.tools.get(id);
    if (!tool) unknown('suggestions', id, 'which is no tool');
    else if (tool.kind !== 'suggestion') unknown('suggestions', id, 'which is no suggestion tool');
    else if (!registry.isAvailable(id)) {
      if (explicitSuggestions) unavailable(id);
    } else suggestions.push(id);
  }
  resolved.suggestions = Object.freeze(suggestions);
  resolved.gutter =
    typeof layout?.gutter === 'boolean' ? layout.gutter : defaultTextEditorLayout.gutter;

  return Object.freeze({
    layout: Object.freeze(resolved) as unknown as TextEditorLayout,
    diagnostics: Object.freeze(diagnostics),
  });
}

/**
 * Tools in groups by their tool group, the groups ordered by their first tool, then one group of
 * the tools that declare none.
 */
function byGroup(ids: readonly string[], registry: TextEditorToolRegistry): (readonly string[])[] {
  const grouped = new Map<string, string[]>();
  const ungrouped: string[] = [];
  for (const id of ids) {
    const group = registry.tools.get(id)?.group;
    if (group === undefined) ungrouped.push(id);
    else if (grouped.has(group)) grouped.get(group)!.push(id);
    else grouped.set(group, [id]);
  }
  const result = [...grouped.values()];
  if (ungrouped.length > 0) result.push(ungrouped);
  return result.map((group) => Object.freeze(group));
}
