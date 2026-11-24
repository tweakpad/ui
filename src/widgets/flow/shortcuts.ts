// One chord per command, shared by the key bindings and the menu hints so the two never drift.
// Shift+digit chords match the physical digit key (Foundation key bindings).
export const ZOOM_IN_KEYS = '+';
export const ZOOM_OUT_KEYS = '-';
export const ZOOM_FIT_KEYS = 'Shift+1';
export const ZOOM_RESET_KEYS = 'Shift+0';
export const DUPLICATE_KEYS = 'Mod+D';
export const SELECT_ALL_KEYS = 'Mod+A';
// Copy, cut and paste run on the native clipboard events of these chords.
export const COPY_KEYS = 'Mod+C';
export const CUT_KEYS = 'Mod+X';
export const PASTE_KEYS = 'Mod+V';
/** Runs the whole graph (`runnable`). */
export const RUN_KEYS = 'Mod+Enter';
/** Opens the sub-view of the focused group. */
export const ENTER_GROUP_KEYS = 'Alt+ArrowDown';
/** Returns to the view the current group sits in. */
export const EXIT_GROUP_KEYS = 'Alt+ArrowUp';
/** Wraps the selected nodes in a new group. */
export const GROUP_KEYS = 'Mod+G';
/** Dissolves the selected group and keeps its members. */
export const UNGROUP_KEYS = 'Mod+Shift+G';
/** Collapses or expands the focused group. */
export const COLLAPSE_KEYS = 'C';
/** The first chord is the hint: the Backspace key is the Mac keyboard's Delete. */
export const DELETE_KEYS = ['Backspace', 'Delete'] as const;
