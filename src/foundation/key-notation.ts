export type KeyHintPlatform = 'auto' | 'mac' | 'windows' | 'linux';
export type KeyHintSeparator = 'plus' | 'then' | 'none';
export type KeyHintLabels = Record<string, string | { text: string; label?: string }>;
export type ResolvedKeyHintPlatform = Exclude<KeyHintPlatform, 'auto'>;

export function keyHintPlatform(
  platform: KeyHintPlatform,
  navigator?: Pick<Navigator, 'platform' | 'userAgent'>,
): ResolvedKeyHintPlatform {
  if (platform === 'mac' || platform === 'windows' || platform === 'linux') return platform;
  const source = `${navigator?.platform ?? ''} ${navigator?.userAgent ?? ''}`;
  return /Mac|iPhone|iPad|iPod/i.test(source) ? 'mac' : /Win/i.test(source) ? 'windows' : 'linux';
}

const aliases: Record<string, string> = {
  cmd: 'command',
  meta: 'command',
  ctrl: 'control',
  option: 'alt',
  return: 'enter',
  esc: 'escape',
  ' ': 'space',
  '⌘': 'command',
  '⌃': 'control',
  '⌥': 'alt',
  '⇧': 'shift',
  '⏎': 'enter',
  '⌫': 'backspace',
  '↑': 'arrowup',
  '↓': 'arrowdown',
  '←': 'arrowleft',
  '→': 'arrowright',
};
const names: Record<string, string> = {
  command: 'Command',
  control: 'Control',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  escape: 'Escape',
  backspace: 'Backspace',
  delete: 'Delete',
  tab: 'Tab',
  space: 'Space',
  arrowup: 'Up arrow',
  arrowdown: 'Down arrow',
  arrowleft: 'Left arrow',
  arrowright: 'Right arrow',
};
const symbols: Record<string, string> = {
  command: '⌘',
  control: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '⏎',
  escape: 'Esc',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  space: 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};
/** The canonical lowercase name of an authored key: `Esc`, `Return`, `⌘` and friends resolved. */
export function canonicalKeyName(key: string): string {
  const normalized = key.toLowerCase();
  return Object.hasOwn(aliases, normalized) ? aliases[normalized]! : normalized;
}

export function keyHintNotation(
  key: string,
  platform: ResolvedKeyHintPlatform,
  labels: KeyHintLabels = {},
): { text: string; label: string } {
  let name = canonicalKeyName(key);
  if (name === 'mod') name = platform === 'mac' ? 'command' : 'control';
  const override = Object.hasOwn(labels, key)
    ? labels[key]
    : Object.hasOwn(labels, name)
      ? labels[name]
      : undefined;
  if (override)
    return typeof override === 'string'
      ? { text: override, label: override }
      : { text: override.text, label: override.label ?? override.text };
  if (!Object.hasOwn(names, name)) return { text: key, label: key };
  if (platform === 'mac')
    return { text: symbols[name]!, label: name === 'alt' ? 'Option' : names[name]! };
  if (name === 'command')
    return {
      text: platform === 'windows' ? 'Win' : 'Super',
      label: platform === 'windows' ? 'Windows' : 'Super',
    };
  return {
    text: name === 'control' ? 'Ctrl' : name === 'escape' ? 'Esc' : names[name]!,
    label: names[name]!,
  };
}
