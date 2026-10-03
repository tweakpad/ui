import type { TpCombobox } from '../../../../src/components/combobox/index.js';
import type { ComponentPartContract } from '../../../../src/foundation/part.js';
import { html } from 'lit';

type API = {
  create(configure?: (host: TpCombobox) => void): Promise<TpCombobox>;
  settle(host: TpCombobox): Promise<void>;
  api: typeof import('../../../../src/index.js');
};
export async function runComboboxAssertions({ create, settle, api }: API) {
  const results: Array<{ id: string; passed: boolean; actual?: unknown; error?: string }> = [];
  const check = (id: string, condition: unknown, actual?: unknown) =>
    results.push({ id, passed: !!condition, actual });
  const test = async (id: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      results.push({ id, passed: false, error: String(error) });
    }
  };
  const mounted = new Set<TpCombobox>();
  const make = async (configure?: (host: TpCombobox) => void) => {
    const host = await create(configure);
    mounted.add(host);
    return host;
  };
  const options = (host: TpCombobox) => [
    ...(host.listElement?.querySelectorAll<HTMLElement>('[role=option]') ?? []),
  ];
  const key = (host: TpCombobox, key: string) =>
    host.inputElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }),
    );
  const choose = async (host: TpCombobox, index = 0) => {
    host.setOpen(true);
    await settle(host);
    options(host)[index]?.click();
    await settle(host);
  };
  const edit = async (host: TpCombobox, text: string) => {
    host.inputElement!.value = text;
    host.inputElement!.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settle(host);
  };
  try {
    await test('V01-default', async () => {
      const host = await make();
      check('V01-empty-null', host.value === null, host.value);
      check('V03-empty-query', host.inputValue === '');
      check('V04-closed', !host.open && !host.popupElement);
      check(
        'V17-one-editor',
        host.shadowRoot!.querySelectorAll('input[role=combobox]').length === 1,
      );
      const trigger = host.shadowRoot!.querySelector('tp-combobox-trigger')!;
      await (trigger as unknown as TpCombobox).updateComplete;
      const native = trigger.shadowRoot!.querySelector<HTMLElement>('[part~=button]')!;
      check(
        'V18-native-trigger-tab',
        native.localName === 'button' &&
          native.tabIndex === -1 &&
          native.part.contains('combobox-trigger'),
        { tag: native.localName, tab: native.tabIndex, part: native.getAttribute('part') },
      );
      check('V19-clear-absent', !host.shadowRoot!.querySelector('[part~=combobox-clear]'));
      await choose(host, 1);
      check(
        'V06-single-selection-text',
        host.value === 'Banana' && host.inputValue === 'Banana' && !host.open,
        { value: host.value, text: host.inputValue, open: host.open },
      );
      host.setOpen(true);
      await settle(host);
      check(
        'V09-selected-text-retains-all-options',
        options(host).length === 4,
        options(host).length,
      );
    });
    await test('V01-controlled', async () => {
      const host = await make((h) => {
        h.value = null;
      });
      await choose(host);
      check('V01-unaccepted-selection-restored', host.value === null && host.inputValue === '', {
        value: host.value,
        text: host.inputValue,
      });
      host.onValueChange = (event) => {
        host.value = event.detail.value;
      };
      await choose(host, 2);
      check('V01-accepted-selection', host.value === 'Cherry');
      const veto = (event: Event) => event.preventDefault();
      host.addEventListener('tp-value-change', veto);
      host.query = '';
      await settle(host);
      await choose(host, 0);
      check('V36-DOM-veto', host.value === 'Cherry' && host.inputValue === '', {
        value: host.value,
        text: host.inputValue,
      });
      host.removeEventListener('tp-value-change', veto);
    });
    await test('V03-text-controlled', async () => {
      const host = await make((h) => {
        h.inputValue = '';
      });
      await edit(host, 'Ap');
      check('V03-text-rejected', host.inputValue === '' && host.inputElement!.value === '');
      host.onInputValueChange = (event) => {
        host.inputValue = event.detail.value;
      };
      await edit(host, 'Ap');
      check(
        'V03-text-accepted-no-selection',
        host.inputValue === 'Ap' && host.value === null && options(host).length === 2,
      );
      await choose(host);
      check(
        'V06-independent-text-acceptance',
        host.value === 'Apple' && host.inputValue === 'Apple',
      );
    });
    await test('V02-multiple', async () => {
      const host = await make((h) => {
        h.multiple = true;
        h.defaultValue = ['Banana', 'Banana'];
        h.showClear = true;
      });
      check('V02-default-unique', JSON.stringify(host.value) === '["Banana"]', host.value);
      host.query = 'Ap';
      await settle(host);
      let rejectedTextProposals = 0;
      host.onValueChange = (event) => event.preventDefault();
      host.onInputValueChange = () => {
        rejectedTextProposals++;
      };
      await choose(host);
      check(
        'V02-multi-rejected-preserves-query-and-selection',
        JSON.stringify(host.value) === '["Banana"]' &&
          host.inputValue === 'Ap' &&
          rejectedTextProposals === 0,
      );
      host.onValueChange = undefined;
      let metadata: unknown;
      host.onInputValueChange = (event) => {
        metadata = event.detail.metadata;
      };
      await choose(host);
      check('V02-ordered-toggle', JSON.stringify(host.value) === '["Banana","Apple"]', host.value);
      check(
        'V06-multiple-clears-press-metadata',
        host.inputValue === '' && (metadata as { itemPress?: boolean })?.itemPress === true,
        metadata,
      );
      check('V02-multiple-stays-open', host.open);
      host.removeChip('Banana');
      await settle(host);
      check(
        'V23-chip-remove',
        JSON.stringify(host.value) === '["Apple"]' &&
          host.shadowRoot!.querySelectorAll('[part~=combobox-chip]').length === 1,
      );
      const remove = host.shadowRoot!.querySelector('tp-combobox-chip-remove')!;
      await (remove as unknown as TpCombobox).updateComplete;
      const native = remove.shadowRoot!.querySelector<HTMLElement>('[part~=button]')!;
      check(
        'V23-chip-accessible-name',
        native.getAttribute('aria-label') === 'Remove Apple' && native.tabIndex === 0,
      );
      host.showChipRemove = false;
      await settle(host);
      check(
        'V23-independent-remove-visibility',
        host.shadowRoot!.querySelectorAll('[part~=combobox-chip]').length === 1 &&
          !host.shadowRoot!.querySelector('tp-combobox-chip-remove'),
      );
      host.removeChip('Apple');
      await settle(host);
      check('V23-visibility-does-not-disable-public-remove', JSON.stringify(host.value) === '[]');
    });
    await test('V05-atomic-clear', async () => {
      const host = await make((h) => {
        h.defaultValue = 'Apple';
        h.defaultInputValue = 'App';
        h.clearBehavior = 'both';
      });
      let proposals = 0,
        consistent = true;
      host.addEventListener('tp-value-change', () => {
        proposals++;
        consistent &&= host.value === 'Apple' && host.inputValue === 'App';
      });
      const veto = (event: Event) => {
        proposals++;
        consistent &&= host.value === 'Apple' && host.inputValue === 'App';
        event.preventDefault();
      };
      host.addEventListener('tp-input-value-change', veto);
      host.clear();
      await settle(host);
      check(
        'V05-both-veto-atomic',
        consistent && proposals === 2 && host.value === 'Apple' && host.inputValue === 'App',
        { consistent, proposals, value: host.value, text: host.inputValue },
      );
      host.removeEventListener('tp-input-value-change', veto);
      host.clear();
      await settle(host);
      check('V05-both-accepted', host.value === null && host.inputValue === '');
      const contextual = await make((h) => {
        h.defaultValue = 'Apple';
        h.defaultInputValue = 'Ap';
      });
      contextual.clear();
      await settle(contextual);
      check('V05-contextual-query', contextual.value === 'Apple' && contextual.inputValue === '');
      contextual.clear();
      await settle(contextual);
      check('V05-contextual-selection', contextual.value === null);
    });
    await test('V04-open-controlled', async () => {
      const host = await make((h) => {
        h.open = false;
      });
      host.setOpen(true);
      await settle(host);
      check('V04-rejected-open', !host.open && !host.popupElement);
      host.onOpenChange = (event) => {
        host.open = event.detail.value;
      };
      host.setOpen(true);
      await settle(host);
      check('V04-accepted-open', host.open && !!host.popupElement);
      const veto = (event: Event) => event.preventDefault();
      host.addEventListener('tp-open-change', veto);
      host.setOpen(false);
      await settle(host);
      check(
        'V04-veto-close',
        host.open && host.popupElement?.getAttribute('aria-hidden') !== 'true',
      );
      host.removeEventListener('tp-open-change', veto);
      host.setOpen(false);
      await settle(host);
      check('V04-close-final', !host.open && !host.popupElement);
    });
    await test('V07-factory-and-identity', async () => {
      const one = { id: 1, title: 'One' },
        two = { id: 2, title: 'Two' };
      const host = await make((h) => {
        h.items = [one, two];
        h.itemToText = (value) => (value as typeof one).title;
      });
      await choose(host, 1);
      check('V07-object-identity', host.value === two && host.inputValue === 'Two');
      const factory = await make((h) => {
        h.items = api.createComboboxItems([{ label: 'Numbers', items: [null, one, two] }], {
          getValue: (item) => item.id,
          getLabel: (item) => item.title,
        });
      });
      await choose(factory, 1);
      check('V08-factory-primitive', factory.value === 2 && factory.inputValue === 'Two');
      factory.setOpen(true);
      await settle(factory);
      check(
        'V22-factory-group',
        factory.listElement!.querySelectorAll('[role=group]').length === 1,
      );
      const duplicate = await make((h) => {
        h.items = ['Apple', 'Apple', 'Banana'];
      });
      duplicate.setOpen(true);
      await settle(duplicate);
      check('V07-duplicate-excluded', options(duplicate).length === 2);
    });
    await test('V10-filter-order-limit', async () => {
      const host = await make();
      host.query = 'ap';
      host.setOpen(true);
      await settle(host);
      check(
        'V09-collation-filter',
        options(host)
          .map((x) => x.textContent!.trim())
          .join(',') === 'Apple,Grape',
      );
      host.filteredItems = ['Cherry', 'Apple'];
      await settle(host);
      check(
        'V10-authoritative-order',
        options(host)
          .map((x) => x.textContent!.trim())
          .join(',') === 'Cherry,Apple',
        options(host).map((x) => x.textContent!.trim()),
      );
      host.limit = 1;
      await settle(host);
      check(
        'V11-limit',
        options(host).length === 1 && options(host)[0]!.textContent!.trim() === 'Cherry',
      );
      key(host, 'ArrowDown');
      await settle(host);
      const active = host.highlightedValue;
      host.showClear = true;
      await settle(host);
      check('V12-unrelated-render-retains-highlight', host.highlightedValue === active, {
        active,
        current: host.highlightedValue,
      });
      host.limit = 0;
      await settle(host);
      check(
        'V11-empty-state',
        options(host).length === 0 &&
          !!host.popupElement!.querySelector('[part~=combobox-empty-state]'),
      );
      host.loading = true;
      await settle(host);
      check(
        'V11-loading-not-empty',
        !host.popupElement!.querySelector('[part~=combobox-empty-state]') &&
          host.listElement!.getAttribute('aria-busy') === 'true',
      );
      const remote = await make((h) => {
        h.items = undefined;
        h.filteredItems = ['Remote'];
      });
      remote.setOpen(true);
      await settle(remote);
      check(
        'V10-remote-authoritative-source',
        options(remote).length === 1 && options(remote)[0]!.textContent!.trim() === 'Remote',
      );
    });
    await test('V12-navigation-completion', async () => {
      const host = await make((h) => {
        h.autoHighlight = 'always';
        h.completionMode = 'both';
      });
      host.query = 'Ap';
      host.setOpen(true);
      await settle(host);
      check('V12-auto-highlight', host.highlightedValue === 'Apple');
      key(host, 'ArrowDown');
      await settle(host);
      check('V13-source-navigation', host.highlightedValue === 'Grape');
      key(host, 'Home');
      await settle(host);
      check(
        'V15-temporary-completion',
        host.inputValue === 'Ap' && host.inputElement!.value === 'Apple',
        { query: host.inputValue, native: host.inputElement!.value },
      );
      key(host, 'Escape');
      await settle(host);
      check('V15-escape-completion-only', host.open && host.inputElement!.value === 'Ap');
      host.inputElement!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      const before = host.highlightedValue;
      key(host, 'ArrowDown');
      await settle(host);
      check('V15-IME-navigation-guard', host.highlightedValue === before);
      host.inputElement!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      host.completionMode = 'none';
      host.query = 'zz';
      await settle(host);
      check('V15-none-keeps-static-items', options(host).length === 4);
    });
    await test('V14-grid', async () => {
      const records = [
        { label: 'A', row: 0 },
        { label: 'B', row: 0 },
        { label: 'C', row: 1 },
        { label: 'D', row: 1 },
      ];
      const host = await make((h) => {
        h.items = records;
        h.grid = true;
        h.loopFocus = false;
      });
      host.setOpen(true);
      await settle(host);
      check(
        'V24-actual-rows',
        host.listElement!.querySelectorAll('[part~=combobox-row]').length === 2,
      );
      key(host, 'Home');
      key(host, 'ArrowRight');
      await settle(host);
      check('V14-horizontal-column', host.highlightedValue === records[1]);
      key(host, 'ArrowDown');
      await settle(host);
      check('V14-vertical-column', host.highlightedValue === records[3]);
      key(host, 'ArrowRight');
      await settle(host);
      check('V14-nonloop-row-boundary', host.highlightedValue === records[3]);
    });
    await test('V25-virtualization', async () => {
      const host = await make((h) => {
        h.virtualized = true;
        h.mountedItems = ['Apple'];
      });
      host.setOpen(true);
      await settle(host);
      check('V25-window-not-source', options(host).length === 1);
      key(host, 'End');
      await settle(host);
      check(
        'V25-unmounted-logical-highlight',
        host.highlightedValue === 'Grape' &&
          !host.inputElement!.hasAttribute('aria-activedescendant'),
      );
      host.mountedItems = ['Grape'];
      await settle(host);
      check(
        'V25-mounted-active-reference',
        host.inputElement!.ariaActiveDescendantElement === options(host)[0],
      );
    });
    await test('V16-disabled-readonly', async () => {
      const host = await make((h) => {
        h.defaultValue = 'Apple';
        h.readOnly = true;
      });
      host.setOpen(true);
      await settle(host);
      check(
        'V16-readonly-no-open',
        !host.open && host.inputElement!.readOnly && !host.inputElement!.disabled,
      );
      host.disabled = true;
      await settle(host);
      check('V16-disabled-native', host.inputElement!.disabled);
    });
    await test('V20-authored-option', async () => {
      const host = await make((h) => {
        h.items = undefined;
        const item = document.createElement('tp-combobox-option');
        item.value = { id: 'a' };
        item.label = 'Authored';
        item.nativeAction = true;
        item.indicatorKeepMounted = true;
        h.append(item);
      });
      host.setOpen(true);
      await settle(host);
      const item = options(host)[0]!;
      check(
        'V20-authored-native-option',
        item.localName === 'button' && item.getAttribute('role') === 'option',
      );
      check('V21-retained-unselected-indicator', !!item.querySelector('[part~=item-indicator]'));
      const source = host.firstElementChild as unknown as {
        value: unknown;
        label: unknown;
        onClick: (event: MouseEvent) => void;
      };
      source.onClick = (event) =>
        (event as MouseEvent & { preventComponentHandling(): void }).preventComponentHandling();
      await settle(host);
      item.click();
      await settle(host);
      check('V20-author-click-prevents-handling', host.value === null);
      source.onClick = () => {};
      source.label = 'Updated';
      await settle(host);
      options(host)[0]!.click();
      await settle(host);
      check('V20-dynamic-option', host.value === source.value && host.inputValue === 'Updated');
    });
    await test('V35-action-contract', async () => {
      let semantic: HTMLElement | null = null,
        snapshot: unknown;
      const contract: ComponentPartContract = {
        elementReference: (e) => {
          semantic = e;
        },
        classHook: (state) => {
          snapshot = state;
          return 'custom-trigger';
        },
        renderDelegate: (ctx) => html`<span ${ctx.bind}></span>`,
        hostProperties: {
          '@click': (event: Event & { preventComponentHandling(): void }) =>
            event.preventComponentHandling(),
        },
      };
      const host = await make((h) => {
        h.nativeAction = false;
        h.partContracts = { 'combobox-trigger': contract };
      });
      await settle(host);
      const native = semantic as HTMLElement | null;
      check(
        'V35-actual-Button-delegate-ref',
        native?.localName === 'span' &&
          native.getAttribute('role') === 'button' &&
          native.tabIndex === -1 &&
          native.classList.contains('custom-trigger'),
        native?.outerHTML,
      );
      check(
        'V35-combobox-state-in-hook',
        (snapshot as { inputValue?: unknown })?.inputValue === '',
      );
      native?.click();
      await settle(host);
      check('V35-initiating-handler-veto', !host.open);
      host.remove();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      check('V35-ref-release', semantic === null);
    });
    await test('V34-form', async () => {
      const form = document.createElement('form');
      document.getElementById('sandbox')!.append(form);
      const host = await make((h) => {
        h.multiple = true;
        h.name = 'fruit';
        h.defaultValue = ['Cherry', 'Apple'];
        h.defaultInputValue = 'query';
      });
      form.append(host);
      await settle(host);
      check(
        'V34-repeated-values-only',
        JSON.stringify(new FormData(form).getAll('fruit')) === '["Cherry","Apple"]',
      );
      host.removeChip('Cherry');
      await settle(host);
      form.reset();
      await settle(host);
      check(
        'V34-reset-default-lanes',
        JSON.stringify(host.value) === '["Cherry","Apple"]' && host.inputValue === 'query',
      );
      host.readOnly = true;
      await settle(host);
      check('V34-readonly-submits', new FormData(form).getAll('fruit').length === 2);
      host.disabled = true;
      await settle(host);
      check('V34-disabled-excluded', new FormData(form).getAll('fruit').length === 0);
      form.remove();
    });
    await test('V27-presence', async () => {
      const host = await make((h) => {
        h.keepMounted = true;
      });
      host.setOpen(true);
      await settle(host);
      const popup = host.popupElement;
      host.setOpen(false);
      await settle(host);
      check(
        'V27-retained-identity-inert',
        host.popupElement === popup && popup?.inert && popup.getAttribute('aria-hidden') === 'true',
      );
      host.actions.unmount();
      await settle(host);
      check('V27-unmount-closed', host.popupElement === null);
    });
    await test('V37-reconnect-membership', async () => {
      const host = await make();
      host.setOpen(true);
      await settle(host);
      key(host, 'End');
      await settle(host);
      host.items = ['Apple', 'Banana'];
      await settle(host);
      check('V37-removed-highlight', host.highlightedValue === null && host.inputValue === '');
      host.remove();
      document.getElementById('sandbox')!.append(host);
      await settle(host);
      key(host, 'Home');
      await settle(host);
      check(
        'V37-reconnect-native-reference',
        host.highlightedValue === 'Apple' &&
          host.inputElement!.ariaActiveDescendantElement === options(host)[0],
      );
    });
  } finally {
    for (const host of mounted) host.remove();
  }
  return {
    driver: 'public API and synthetic event protocol, not real input',
    mode: new URL(location.href).searchParams.has('package') ? 'built' : 'source',
    total: results.length,
    passed: results.filter((x) => x.passed).length,
    results,
  };
}
