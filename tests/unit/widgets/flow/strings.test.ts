import { describe, expect, it } from 'vitest';
import { fillTemplate } from '../../../../src/foundation/template.js';
import { DEFAULT_STRINGS, resolveStrings } from '../../../../src/widgets/flow/strings.js';
import { FLOW_SHORTCUTS } from '../../../../src/widgets/flow/interaction/keyboard.js';
import {
  COLLAPSE_KEYS,
  ENTER_GROUP_KEYS,
  EXIT_GROUP_KEYS,
  GROUP_KEYS,
  UNGROUP_KEYS,
  ZOOM_FIT_KEYS,
  ZOOM_RESET_KEYS,
} from '../../../../src/widgets/flow/shortcuts.js';

const GROUP_STRINGS = [
  'group',
  'groupInputs',
  'groupOutputs',
  'terminal',
  'enterGroup',
  'exitGroup',
  'groupSelection',
  'ungroup',
  'collapseGroup',
  'expandGroup',
  'moveOutOfGroup',
  'addInput',
  'addOutput',
  'removePort',
  'portName',
  'ports',
  'groupMembers',
  'groupPath',
  'resetPosition',
  'ariaGroupExpanded',
  'ariaGroupCollapsed',
  'announceEntered',
  'announceExited',
  'announceGrouped',
  'announceUngrouped',
  'announceCollapsed',
  'announceExpanded',
  'announceMovedToGroup',
] as const;

describe('flow group strings (uwg-flg-req-a11y-4)', () => {
  it('has an English default for every group string', () => {
    for (const key of GROUP_STRINGS) expect(DEFAULT_STRINGS[key], key).toMatch(/\S/);
  });

  it('fills the count, name and graph placeholders', () => {
    expect(fillTemplate(DEFAULT_STRINGS.groupMembers, { count: 4 })).toBe('members: 4');
    expect(fillTemplate(DEFAULT_STRINGS.removePort, { name: 'Image' })).toBe('Remove Image');
    expect(fillTemplate(DEFAULT_STRINGS.groupPath, { flow: 'Pipeline' })).toBe(
      'Pipeline group path',
    );
    expect(fillTemplate(DEFAULT_STRINGS.announceMovedToGroup, { count: 2, label: 'Decode' })).toBe(
      'Moved 2 nodes to Decode',
    );
  });

  it('describes entering and leaving groups in the keyboard instructions', () => {
    expect(DEFAULT_STRINGS.instructions).toContain('Alt with Down arrow');
    expect(DEFAULT_STRINGS.instructions).toContain('Alt with Up arrow');
  });

  it('replaces a group string through the overrides', () => {
    const strings = resolveStrings({ groupInputs: 'Eingänge' });
    expect(strings.groupInputs).toBe('Eingänge');
    expect(strings.groupOutputs).toBe(DEFAULT_STRINGS.groupOutputs);
  });
});

describe('flow shortcut table', () => {
  const keys = (action: string) => FLOW_SHORTCUTS.find((row) => row.action === action)?.keys;

  it('lists the group chords from the shared constants', () => {
    expect(keys('enter-group')).toBe(ENTER_GROUP_KEYS);
    expect(keys('exit-group')).toBe(EXIT_GROUP_KEYS);
    expect(keys('group')).toBe(GROUP_KEYS);
    expect(keys('ungroup')).toBe(UNGROUP_KEYS);
    expect(keys('collapse')).toBe(COLLAPSE_KEYS);
  });

  it('lists fit and reset with the chords the bindings use', () => {
    expect(keys('fit')).toBe(ZOOM_FIT_KEYS);
    expect(keys('zoom-reset')).toBe(ZOOM_RESET_KEYS);
  });
});
