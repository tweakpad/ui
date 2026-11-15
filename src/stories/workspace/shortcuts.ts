import type { Overlay, Section } from './host.js';

export type WorkspaceCommand =
  'search' | 'settings' | 'new-task' | 'complete-tasks' | 'brief-preview' | 'brief-download';

/**
 * Application commands only; native editing, the brief's text editor (bold, italic) and the
 * Navigation panel own their remaining keys.
 */
export function workspaceCommand(
  event: Pick<
    KeyboardEvent,
    'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing' | 'defaultPrevented'
  >,
  section: Section,
  overlay: Overlay,
  editing: boolean,
): WorkspaceCommand | null {
  if (event.defaultPrevented || event.isComposing || event.altKey) return null;
  const key = event.key.toLowerCase();
  const mod = event.metaKey || event.ctrlKey;
  if (mod && !event.shiftKey && key === 'k') return 'search';
  if (overlay) return null;
  if (mod && !event.shiftKey && key === ',') return 'settings';
  if (section === 'brief' && mod && !event.shiftKey) {
    if (key === 's') return 'brief-download';
    if (key === 'p') return 'brief-preview';
  }
  if (editing) return null;
  if (!mod && !event.shiftKey && key === 'c') return 'new-task';
  if (section === 'work' && mod && key === 'enter') return 'complete-tasks';
  return null;
}
