import { html } from 'lit';
import type { TpKeyHint, TpKeyHintGroup } from '../../../../src/components/key-hint/index.js';
import type { TpElement } from '../../../../src/foundation/element.js';
import type { PartRenderContext } from '../../../../src/foundation/part.js';
const fixtureWindow = window as Window & {
  keyHintLibrary: typeof import('../../../../src/index.js');
  keyHintBuilt: boolean;
};
export async function verifyKeyHints() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const settle = async () => {
    for (let n = 0; n < 5; n++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      for (const el of document.querySelectorAll('tp-key-hint,tp-key-hint-group'))
        await (el as TpElement).updateComplete;
    }
  };
  const box = (el: Element) => el.shadowRoot!.querySelector('kbd')!;
  const text = (el: Element) => el.shadowRoot!.textContent!;
  const root = document.createElement('section');
  document.querySelector('main')!.append(root);
  root.innerHTML =
    '<tp-key-hint-group platform="mac"><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>K</tp-key-hint></tp-key-hint-group>';
  const group = root.firstElementChild as TpKeyHintGroup;
  const [first, second] = [...group.children] as TpKeyHint[];
  await settle();
  assert(
    first!.resolvedPlatform === 'mac' && text(first!).includes('Command'),
    'parent platform reaches generated key',
  );
  assert(text(second!).startsWith('+'), 'default plus separator');
  assert(getComputedStyle(box(first!)).height === '20px', 'default keycap height 20px');
  assert(
    getComputedStyle(box(group)).backgroundColor === 'rgba(0, 0, 0, 0)',
    'group does not get individual keycap paint',
  );
  group.separator = 'none';
  await settle();
  assert(!text(second!).includes('+'), 'none removes separator');
  group.separator = 'then';
  group.keyLabels = { then: 'puis', command: { text: 'Cmd', label: 'Commande' } };
  await settle();
  assert(
    text(first!).includes('CmdCommande') && text(second!).startsWith('puis'),
    'localized notation and sequence',
  );
  group.platform = 'windows';
  await settle();
  assert(text(first!).includes('CtrlControl'), 'dynamic platform propagates');
  first!.platform = 'linux';
  first!.key = 'command';
  await settle();
  assert(text(first!).includes('CmdCommande'), 'localized override retained on explicit platform');
  first!.keyLabels = { command: 'Super local' };
  await settle();
  assert(text(first!).includes('Super local'), 'child labels override parent without mutation');
  assert(group.keyLabels.command.text === 'Cmd', 'parent label mapping unchanged');
  first!.hidden = true;
  await settle();
  assert(!text(second!).includes('puis'), 'hidden member does not contribute separator');
  first!.hidden = false;
  group.prepend(second!);
  await settle();
  assert(
    !text(second!).includes('puis') && text(first!).startsWith('puis'),
    'reorder recalculates separators',
  );
  const other = document.createElement('tp-key-hint-group');
  other.platform = 'mac';
  other.separator = 'none';
  root.append(other);
  other.append(first!);
  await settle();
  assert(
    !text(first!).includes('puis') && first!.platform === 'linux',
    'moving member releases old prefix and preserves explicit property',
  );
  other.removeChild(first!);
  root.append(first!);
  first!.platform = 'auto';
  first!.keyLabels = {};
  await settle();
  assert(!text(first!).includes('Super local'), 'detached member loses inherited labels');
  const nested = document.createElement('tp-key-hint-group');
  nested.innerHTML = '<tp-key-hint key="mod"></tp-key-hint><tp-key-hint>C</tp-key-hint>';
  group.append(nested);
  await settle();
  assert(
    nested.resolvedPlatform === 'windows' && text(nested).startsWith('puis'),
    'nested group inherits platform and outer separator',
  );
  assert(
    text(nested.lastElementChild!).startsWith('+'),
    'nested group retains independent chord separator',
  );
  const parent = group.parentElement;
  group.remove();
  await settle();
  parent!.append(group);
  await settle();
  assert(text(nested).startsWith('puis'), 'reconnection restores context');
  const item = nested.firstElementChild as TpKeyHint;
  item.partContracts = { 'key-hint': { styleHook: { 'min-inline-size': '37px' } } };
  await settle();
  assert(getComputedStyle(box(item)).minWidth === '37px', 'per-key style hook');
  group.partContracts = { 'key-hint-group': { styleHook: { gap: '9px' } } };
  await settle();
  assert(getComputedStyle(box(group)).gap === '9px', 'independent group style hook');
  item.partContracts = {
    'key-hint': {
      renderDelegate: ({ bind, content }: PartRenderContext) =>
        html`<kbd data-delegated ${bind}>${content}</kbd>`,
    },
  };
  await settle();
  assert(
    !!item.shadowRoot.querySelector('[data-delegated]'),
    'key render delegate retains native anatomy',
  );
  root.style.setProperty('--tp-spacing', '4px');
  await settle();
  assert(getComputedStyle(box(item)).height === '25px', 'spacing token scales key geometry');
  assert(
    !root.querySelector('[tabindex]') &&
      [...root.querySelectorAll('tp-key-hint')].every(
        (k) => !k.shadowRoot!.querySelector('button,input,[tabindex]'),
      ),
    'keys do not add focusable controls',
  );
  const rtl = document.querySelector('[dir=rtl] tp-key-hint-group')!;
  const keys = [...rtl.children];
  assert(
    keys[0]!.getBoundingClientRect().x > keys[1]!.getBoundingClientRect().x,
    'RTL key ordering follows direction',
  );
  const icon = document.querySelector('#icon-key tp-icon')!;
  const large = document.querySelector('#large-icon tp-icon')!;
  assert(
    getComputedStyle(icon.shadowRoot!.querySelector('svg')!).width === '12px',
    'default icon 12px',
  );
  assert(
    getComputedStyle(large.shadowRoot!.querySelector('svg')!).width === '16px',
    'explicit icon extent retained',
  );
  const lib = fixtureWindow.keyHintLibrary;
  try {
    lib.setPresentationDictionary({
      'key-hint': [{ declarations: { background: 'rgb(1, 2, 3)' } }],
      'key-hint-group': [{ declarations: { gap: '11px' } }],
    });
    await settle();
    assert(
      getComputedStyle(box(first!)).backgroundColor === 'rgb(1, 2, 3)',
      'dictionary replacement reaches Key',
    );
    assert(
      getComputedStyle(box(other)).gap === '11px',
      'dictionary replacement reaches constituent Group',
    );
    assert(text(nested).startsWith('puis'), 'dictionary replacement preserves sequence state');
  } finally {
    lib.setPresentationDictionary(lib.defaultPresentationDictionary);
    await settle();
  }
  root.remove();
  return { built: fixtureWindow.keyHintBuilt, assertions: results.length, results };
}
