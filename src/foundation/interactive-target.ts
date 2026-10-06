/**
 * Shared description of targets that own their own pointer activation or keys.
 * Surface-level recognizers (tap gestures, activity toggles) leave events from these
 * targets alone; the key-binding owner (`key-bindings.ts`) uses the same union for
 * Space/Enter activation and the key-ownership classifications below.
 *
 * Native interactive elements, editable content, interactive ARIA roles, interactive
 * Tweakpad components and any subtree marked `data-interactive` are excluded.
 */
export const INTERACTIVE_TARGET_SELECTOR = [
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'a[href]',
  'area[href]',
  'summary',
  'label',
  'iframe',
  'embed',
  'object',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  ...[
    'button',
    'checkbox',
    'combobox',
    'gridcell',
    'link',
    'listbox',
    'menu',
    'menubar',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'scrollbar',
    'searchbox',
    'slider',
    'spinbutton',
    'switch',
    'tab',
    'textbox',
    'treeitem',
  ].map((role) => `[role="${role}"]`),
  ...[
    'tp-button',
    'tp-checkbox',
    'tp-input',
    'tp-menu-checkbox-item',
    'tp-menu-item',
    'tp-menu-radio-item',
    'tp-native-select',
    'tp-number-field',
    'tp-otp-field',
    'tp-radio-group-item',
    'tp-resizable-handle',
    'tp-select',
    'tp-select-trigger',
    'tp-slider',
    'tp-slider-thumb',
    'tp-switch',
    'tp-text-area',
    'tp-toggle',
  ],
  '[data-interactive]',
].join(',');

/**
 * Whether the event's composed path contains an interactive target before reaching
 * `boundary`. The walk follows open shadow roots, so a native control inside a
 * component's shadow tree is detected as well as the component host itself. An
 * element marked `data-interactive` excludes its whole subtree.
 */
export function interactiveTargetInPath(event: Event, boundary: Element): boolean {
  return targetInPath(event, boundary, INTERACTIVE_TARGET_SELECTOR) !== null;
}

/**
 * The first element in the event's composed path, before `boundary`, that matches
 * `selector`. A `null` boundary walks the whole path (document-scope listeners).
 */
export function targetInPath(
  event: Event,
  boundary: EventTarget | null,
  selector: string,
): Element | null {
  for (const node of event.composedPath()) {
    if (node === boundary) return null;
    if ((node as Node).nodeType === 1 && (node as Element).matches(selector))
      return node as Element;
  }
  return null;
}

/**
 * Whether an element accepts text or value entry, so unmodified keys belong to it.
 * Uses `localName`/`isContentEditable` rather than selector matching so inherited
 * editability inside a contenteditable host is included.
 */
export function isEditableTarget(node: EventTarget | null | undefined): boolean {
  const element = node as HTMLElement | null | undefined;
  if (element?.nodeType !== 1) return false;
  if (['input', 'textarea', 'select'].includes(element.localName)) return true;
  if (element.isContentEditable !== undefined) return element.isContentEditable;
  // Non-HTML elements do not expose isContentEditable; read the attribute.
  const editable = element.getAttribute?.('contenteditable');
  return editable !== null && editable !== undefined && editable !== 'false';
}

/** Whether any element in the composed path, before `boundary`, is editable. */
export function editableTargetInPath(event: Event, boundary: EventTarget | null = null): boolean {
  for (const node of event.composedPath()) {
    if (node === boundary) return false;
    if (isEditableTarget(node)) return true;
  }
  return false;
}

/**
 * Focus targets that own navigation keys (arrows, Home/End, PageUp/PageDown): editors,
 * range controls, composite widgets and their items, and media with native controls.
 * Plain buttons and links are deliberately absent; they do not own arrow keys.
 */
export const NAVIGATION_KEY_OWNER_SELECTOR = [
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
  'audio[controls]',
  'video[controls]',
  ...[
    'combobox',
    'grid',
    'gridcell',
    'listbox',
    'menu',
    'menubar',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'radiogroup',
    'scrollbar',
    'searchbox',
    'slider',
    'spinbutton',
    'tab',
    'tablist',
    'textbox',
    'toolbar',
    'tree',
    'treegrid',
    'treeitem',
  ].map((role) => `[role="${role}"]`),
  ...[
    'tp-input',
    'tp-menu-checkbox-item',
    'tp-menu-item',
    'tp-menu-radio-item',
    'tp-native-select',
    'tp-number-field',
    'tp-otp-field',
    'tp-radio-group-item',
    'tp-resizable-handle',
    'tp-select',
    'tp-select-trigger',
    'tp-slider',
    'tp-slider-thumb',
    'tp-text-area',
  ],
].join(',');

/** Collection widgets whose focus turns printable keys into typeahead search. */
export const TYPEAHEAD_KEY_OWNER_SELECTOR = [
  ...[
    'listbox',
    'menu',
    'menubar',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'tree',
    'treegrid',
    'treeitem',
  ].map((role) => `[role="${role}"]`),
  'tp-menu-checkbox-item',
  'tp-menu-item',
  'tp-menu-radio-item',
  'tp-select',
  'tp-select-trigger',
].join(',');

/**
 * Explicit key ownership marker. An empty value owns every key; otherwise the value is
 * a space-separated list of `KeyboardEvent.key` names (`Space` for the space key).
 */
export const KEY_OWNER_ATTRIBUTE = 'data-tp-owns-keys';
