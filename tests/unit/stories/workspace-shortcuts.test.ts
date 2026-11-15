import { describe, expect, it } from 'vitest';
import { workspaceCommand } from '../../../src/stories/workspace/shortcuts.js';

const key = (value: string, mod = false) => ({
  key: value,
  ctrlKey: mod,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  defaultPrevented: false,
});

describe('workspace keyboard commands', () => {
  it('opens search and settings with either platform modifier', () => {
    expect(workspaceCommand(key('k', true), 'overview', '', true)).toBe('search');
    expect(workspaceCommand({ ...key('k'), metaKey: true }, 'overview', '', true)).toBe('search');
    expect(workspaceCommand(key(',', true), 'overview', '', false)).toBe('settings');
  });
  it('keeps typing and modal input from invoking task actions', () => {
    expect(workspaceCommand(key('c'), 'work', '', false)).toBe('new-task');
    expect(workspaceCommand(key('c'), 'work', '', true)).toBeNull();
    expect(workspaceCommand(key('c'), 'work', 'invite', false)).toBeNull();
    expect(workspaceCommand(key('Enter', true), 'work', '', false)).toBe('complete-tasks');
    expect(workspaceCommand(key('Enter', true), 'work', '', true)).toBeNull();
    expect(workspaceCommand(key('Enter', true), 'overview', '', false)).toBeNull();
  });
  it('implements brief hints without stealing native editing elsewhere', () => {
    for (const [value, command] of [
      ['s', 'brief-download'],
      ['p', 'brief-preview'],
    ])
      expect(workspaceCommand(key(value!, true), 'brief', '', true)).toBe(command);
    // Bold and italic belong to the brief's text editor.
    expect(workspaceCommand(key('b', true), 'brief', '', true)).toBeNull();
    expect(workspaceCommand(key('s', true), 'work', '', false)).toBeNull();
  });
  it('respects prior handlers, composition and alternate key chords', () => {
    for (const option of ['defaultPrevented', 'isComposing', 'altKey', 'shiftKey'])
      expect(
        workspaceCommand({ ...key('k', true), [option]: true }, 'overview', '', false),
      ).toBeNull();
  });
});
