/* Emoji picker fixture checks. Each assert* returns a Report; run them in file order after a load. */
type Picker = HTMLElement & {
  value: string;
  query: string;
  skinTone: string;
  open: boolean;
  status: string;
  emojiData: { emojis: readonly unknown[] } | null;
  activeEmoji: { value: string; label: string } | null;
  activeCategory: string | undefined;
  supportedVersion: number | undefined;
  controlled: boolean;
  data: unknown;
  recent: readonly string[];
  custom: readonly unknown[];
  updateComplete: Promise<unknown>;
  setValue(value: string, reason?: string): boolean;
  setOpen(open: boolean, reason?: string): boolean;
  reload(): void;
  scrollToCategory(id: string): Promise<boolean>;
};
type Api = Record<string, unknown> & {
  createEmojibaseSource: (options: { url: string; cache?: boolean }) => unknown;
};

export interface Check {
  readonly name: string;
  readonly pass: boolean;
  readonly actual: unknown;
}
export interface Report {
  readonly checks: Check[];
  readonly passed: boolean;
}

const report = (checks: Check[]): Report => ({
  checks,
  passed: checks.every((check) => check.pass),
});
const check = (name: string, pass: boolean, actual?: unknown): Check => ({ name, pass, actual });
const byId = (id: string) => document.getElementById(id) as Picker;
export const settle = async (target?: HTMLElement & { updateComplete?: Promise<unknown> }) => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await target?.updateComplete;
};

/** The list element and its shadow root of a picker. */
export function listOf(picker: Picker) {
  const list = picker.shadowRoot!.querySelector('tp-emoji-picker-list') as HTMLElement & {
    shadowRoot: ShadowRoot;
    inputElement: HTMLInputElement | null;
    updateComplete: Promise<unknown>;
  };
  return { list, root: list.shadowRoot };
}

/** Original custom emoji art: a rounded tile with a letter, as an SVG data URI. */
function tile(color: string, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" font-family="sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A large synthetic dataset for windowing checks: ranges of pictographic code points. */
export function syntheticDataset(): unknown {
  const ranges: [string, string, number, number][] = [
    ['misc-symbols', 'Miscellaneous symbols', 0x1f300, 0x1f5ff],
    ['faces', 'Faces', 0x1f600, 0x1f64f],
    ['transport', 'Transport', 0x1f680, 0x1f6ff],
    ['supplemental', 'Supplemental', 0x1f900, 0x1f9ff],
    ['extended', 'Extended', 0x1fa70, 0x1faff],
    ['dingbats', 'Dingbats', 0x2600, 0x27bf],
  ];
  const categories = ranges.map(([id, label]) => ({ id, label }));
  const emojis = ranges.flatMap(([id, , from, to]) =>
    Array.from({ length: to - from + 1 }, (_, index) => {
      const code = from + index;
      return {
        emoji: String.fromCodePoint(code),
        label: `Glyph ${code.toString(16).toUpperCase()}`,
        keywords: [`u${code.toString(16)}`],
        category: id,
        version: 1,
      };
    }),
  );
  return { locale: 'en', categories, emojis };
}

/** Where the highlighted option sits in its list, and which labels are in view. */
export async function revealState(id: string) {
  await settle();
  await settle();
  const picker = byId(id);
  const { root, list } = listOf(picker);
  const active = list.inputElement?.ariaActiveDescendantElement as HTMLElement | null;
  const scroller = root.querySelector<HTMLElement>('.select-list')!;
  const bounds = scroller.getBoundingClientRect();
  const rect = active?.getBoundingClientRect();
  const labels = [...root.querySelectorAll('.select-label')]
    .map((label) => {
      const box = label.getBoundingClientRect();
      return {
        text: label.textContent?.trim(),
        top: Math.round(box.top - bounds.top),
        bottom: Math.round(box.bottom - bounds.top),
      };
    })
    .filter((label) => label.bottom > 0 && label.top < bounds.height);
  return {
    active: picker.activeEmoji?.label,
    activeTop: rect && Math.round(rect.top - bounds.top),
    activeBottom: rect && Math.round(rect.bottom - bounds.top),
    clientHeight: scroller.clientHeight,
    scrollTop: scroller.scrollTop,
    labels,
    activeCategory: picker.activeCategory,
  };
}

/** Configures the instances that need properties; instances removed by `?only=` are skipped. */
export function setupInstances(api: Api): void {
  const custom = byId('custom');
  if (custom) {
    custom.custom = [
      {
        id: 'team',
        label: 'Team',
        emojis: [
          {
            id: 'ship-it',
            label: 'Ship it',
            keywords: ['deploy', 'release'],
            src: tile('#16a34a', 'S'),
          },
          {
            id: 'lgtm',
            label: 'Looks good',
            keywords: ['approve', 'review'],
            src: tile('#2563eb', 'L'),
          },
          { id: 'blocked', label: 'Blocked', keywords: ['stop'], src: tile('#dc2626', 'B') },
          { id: 'lgtm', label: 'Duplicate', src: tile('#000000', 'D') },
        ],
      },
    ];
    custom.recent = ['👍🏽', ':ship-it:', '🦄', '🎉'];
  }
  const adapter = byId('adapter');
  if (adapter)
    adapter.data = api.createEmojibaseSource({
      url: new URL('./emojibase', location.href).href,
      cache: false,
    });
  const failing = byId('failing');
  if (failing) failing.data = () => Promise.reject(new Error('Network unavailable'));
  const large = byId('large');
  if (large) {
    large.data = syntheticDataset();
    large.setAttribute('emoji-version', '100');
  }
}

/** Rows mounted in the list against the rows of the complete list. */
export function windowStats(id: string) {
  const { root } = listOf(byId(id));
  const list = root.querySelector<HTMLElement>('.select-list')!;
  return {
    mountedRows: root.querySelectorAll('.select-row').length,
    mountedOptions: root.querySelectorAll('[role="option"]').length,
    labels: root.querySelectorAll('.select-label').length,
    scrollHeight: list.scrollHeight,
    clientHeight: list.clientHeight,
    scrollTop: list.scrollTop,
  };
}

export async function assertDefaults(): Promise<Report> {
  const picker = byId('default');
  const { list, root } = listOf(picker);
  const checks = [
    check('status loaded', picker.status === 'loaded', picker.status),
    check('value empty', picker.value === '' && picker.hasAttribute('data-empty'), picker.value),
    check('skin tone none', picker.skinTone === 'none', picker.skinTone),
    check('query empty', picker.query === '', picker.query),
    check(
      'listbox named',
      root.querySelector('[role="listbox"]')?.getAttribute('aria-label') === 'Reaction',
    ),
    check(
      'search named',
      list.inputElement?.getAttribute('aria-label') === 'Search emoji',
      list.inputElement?.getAttribute('aria-label'),
    ),
    check('combobox role', list.inputElement?.getAttribute('role') === 'combobox'),
    check('nine columns', root.querySelector('.select-row')?.children.length === 9),
    check(
      'groups named',
      root.querySelector('[role="group"]')?.getAttribute('aria-labelledby') !== null,
    ),
    check(
      'supported version detected',
      typeof picker.supportedVersion === 'number',
      picker.supportedVersion,
    ),
  ];
  return report(checks);
}

interface LaneEvent {
  type: string;
  value: unknown;
  reason: string;
  cancelable: boolean;
}
/** Records the widget's own lane events and constituent events that escape it. */
function capture(target: HTMLElement) {
  const events: LaneEvent[] = [];
  const escaped: string[] = [];
  const types = [
    'tp-value-change',
    'tp-value-commit',
    'tp-query-change',
    'tp-skin-tone-change',
    'tp-action',
    'tp-open-change',
    'tp-loading-status-change',
    'tp-input-value-change',
    'tp-field-value',
  ];
  const listener = (event: Event) => {
    if (event.target !== target) {
      escaped.push(`${event.type}@${(event.target as Element).localName}`);
      return;
    }
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
    events.push({
      type: event.type,
      value: detail.value ?? detail.status,
      reason: String(detail.reason ?? ''),
      cancelable: event.cancelable,
    });
  };
  for (const type of types) document.addEventListener(type, listener);
  return {
    events,
    escaped,
    stop: () => {
      for (const type of types) document.removeEventListener(type, listener);
    },
  };
}

function fresh(attributes: Record<string, string> = {}): Picker {
  const picker = document.createElement('tp-emoji-picker') as Picker;
  for (const [name, value] of Object.entries(attributes)) picker.setAttribute(name, value);
  document.getElementById('dynamic')!.append(picker);
  return picker;
}

export async function assertValueLanes(): Promise<Report> {
  const checks: Check[] = [];
  const uncontrolled = fresh({ 'default-value': '🎉', label: 'Lanes' });
  await settle(uncontrolled);
  const log = capture(uncontrolled);
  checks.push(
    check('default value, no initial change', uncontrolled.value === '🎉' && !log.events.length),
  );
  checks.push(check('uncontrolled', uncontrolled.controlled === false));
  uncontrolled.setValue('🔥');
  await settle(uncontrolled);
  checks.push(check('setValue commits', uncontrolled.value === '🔥', uncontrolled.value));
  checks.push(
    check(
      'programmatic change then commit',
      log.events
        .filter((event) => event.type !== 'tp-field-value')
        .map((event) => `${event.type}:${event.reason}`)
        .join() === 'tp-value-change:programmatic,tp-value-commit:programmatic',
      log.events,
    ),
  );
  const reject = (event: Event) => event.preventDefault();
  uncontrolled.addEventListener('tp-value-change', reject);
  checks.push(check('rejected proposal returns false', uncontrolled.setValue('🌈') === false));
  await settle(uncontrolled);
  checks.push(check('rejected value unchanged', uncontrolled.value === '🔥', uncontrolled.value));
  uncontrolled.removeEventListener('tp-value-change', reject);
  log.stop();

  const controlled = fresh({ label: 'Controlled' });
  controlled.value = '😀';
  await settle(controlled);
  checks.push(check('controlled', controlled.controlled === true));
  const accepted = controlled.setValue('😎');
  await settle(controlled);
  checks.push(
    check(
      'controlled waits for the owner',
      accepted && controlled.value === '😀',
      controlled.value,
    ),
  );
  controlled.value = '😎';
  await settle(controlled);
  checks.push(check('controlled publishes the owner value', controlled.value === '😎'));
  const { root } = listOf(controlled);
  checks.push(
    check(
      'value option selected',
      root.querySelector('[aria-selected="true"]')?.getAttribute('aria-label') ===
        'Smiling face with sunglasses',
      root.querySelector('[aria-selected="true"]')?.getAttribute('aria-label'),
    ),
  );
  uncontrolled.remove();
  controlled.remove();
  return report(checks);
}

export async function assertQueryAndTone(): Promise<Report> {
  const checks: Check[] = [];
  const picker = fresh({ 'default-query': 'cat', label: 'Query' });
  await settle(picker);
  const { list, root } = listOf(picker);
  await settle(list);
  const names = [...root.querySelectorAll('[role="option"]')].map((option) =>
    option.getAttribute('aria-label'),
  );
  checks.push(
    check(
      'default query filters',
      names.includes('Cat face') && names.includes('Grinning cat'),
      names,
    ),
  );
  checks.push(
    check('input shows the query', list.inputElement?.value === 'cat', list.inputElement?.value),
  );
  checks.push(check('searching marker', picker.hasAttribute('data-searching')));
  const log = capture(picker);
  picker.query = 'zzzz';
  await settle(picker);
  await settle(list);
  checks.push(
    check(
      'empty state text',
      root.textContent?.includes('No emoji found.') === true &&
        !root.querySelector('[role="option"]'),
    ),
  );
  checks.push(
    check(
      'query lane event',
      log.events.some(
        (event) => event.type === 'tp-query-change' && event.reason === 'programmatic',
      ),
    ),
  );
  picker.query = '';
  picker.skinTone = 'medium-dark';
  await settle(picker);
  await settle(list);
  const hand = root.querySelector('[aria-label^="Waving hand"]');
  checks.push(
    check('tone applied to glyphs', hand?.textContent?.includes('👋🏾') === true, hand?.textContent),
  );
  checks.push(
    check(
      'tone in option name',
      hand?.getAttribute('aria-label') === 'Waving hand, Medium-dark skin tone',
      hand?.getAttribute('aria-label'),
    ),
  );
  checks.push(
    check(
      'tone lane event',
      log.events.some(
        (event) =>
          event.type === 'tp-skin-tone-change' && event.value === 'medium-dark' && event.cancelable,
      ),
    ),
  );
  const tones = [
    ...picker.shadowRoot!.querySelectorAll<HTMLElement & { checked: boolean }>(
      'tp-menu.skin-tone-menu tp-menu-radio-item',
    ),
  ];
  checks.push(
    check(
      'tone menu lists every tone, the active one checked',
      tones.length === 6 &&
        tones
          .filter((item) => item.checked)
          .map((item) => item.getAttribute('value'))
          .join() === 'medium-dark',
      tones.map((item) => `${item.getAttribute('value')}:${item.checked}`),
    ),
  );
  checks.push(check('nothing escapes', !log.escaped.length, log.escaped));
  log.stop();
  picker.remove();
  return report(checks);
}

export async function assertDataSources(): Promise<Report> {
  const checks: Check[] = [];
  // A slow source superseded by a locale change: the first result is ignored.
  const calls: { locale: string; aborted: () => boolean }[] = [];
  const picker = fresh({ label: 'Async', locale: 'fr' });
  const log = capture(picker);
  picker.data = ({ locale, signal }: { locale: string; signal: AbortSignal }) => {
    calls.push({ locale, aborted: () => signal.aborted });
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            locale,
            categories: [{ id: 'only', label: `Only ${locale}` }],
            emojis: [
              {
                emoji: locale === 'fr' ? '🥐' : '🥯',
                label: locale,
                keywords: [],
                category: 'only',
              },
            ],
          }),
        150,
      ),
    );
  };
  await settle(picker);
  checks.push(check('loading status', picker.status === 'loading', picker.status));
  picker.locale = 'de';
  await settle(picker);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await settle(picker);
  checks.push(
    check(
      'previous call aborted',
      calls.length >= 2 && calls[calls.length - 2]!.aborted(),
      calls.map((call) => call.locale),
    ),
  );
  checks.push(
    check(
      'latest locale loaded',
      picker.status === 'loaded' && picker.emojiData?.emojis.length === 1,
      picker.status,
    ),
  );
  const { root } = listOf(picker);
  checks.push(check('latest dataset shown', root.textContent?.includes('Only de') === true));
  checks.push(
    check(
      'status events',
      log.events
        .filter((event) => event.type === 'tp-loading-status-change')
        .map((event) => event.value)
        .join() === 'loading,loaded',
      log.events,
    ),
  );
  log.stop();
  picker.remove();

  // A failing source shows the error state; Retry calls the source again.
  let attempts = 0;
  const failing = fresh({ label: 'Failing' });
  failing.data = () => {
    attempts++;
    return attempts === 1
      ? Promise.reject(new Error('offline'))
      : {
          locale: 'en',
          categories: [{ id: 'x', label: 'Back' }],
          emojis: [{ emoji: '✅', label: 'Done', keywords: [], category: 'x' }],
        };
  };
  await new Promise((resolve) => setTimeout(resolve, 50));
  await settle(failing);
  const retry = failing.shadowRoot!.querySelector<HTMLElement>('tp-button.retry');
  checks.push(
    check('error status and retry', failing.status === 'error' && !!retry, failing.status),
  );
  const announced = listOf(failing).root.querySelector('[role=status]')?.textContent?.trim();
  checks.push(check('error announced', announced === 'Emoji could not be loaded.', announced));
  failing.reload();
  await settle(failing);
  checks.push(
    check(
      'reload recovers',
      failing.status === 'loaded' && !failing.shadowRoot!.querySelector('tp-button.retry'),
      failing.status,
    ),
  );
  failing.remove();

  // emojiVersion hides newer emoji without probing.
  const limited = fresh({ label: 'Version', 'emoji-version': '5' });
  await settle(limited);
  const versions = (limited.emojiData?.emojis ?? []) as { version?: number }[];
  checks.push(
    check(
      'version cap',
      versions.length > 0 && versions.every((record) => (record.version ?? 1) <= 5),
      versions.length,
    ),
  );
  checks.push(
    check('supportedVersion is the cap', limited.supportedVersion === 5, limited.supportedVersion),
  );
  limited.remove();
  return report(checks);
}

export async function assertFormsAndStates(): Promise<Report> {
  const checks: Check[] = [];
  const form = document.getElementById('form') as HTMLFormElement | null;
  const required = byId('required');
  if (form && required) {
    checks.push(check('required invalid while empty', !form.checkValidity()));
    required.setValue('🌟');
    await settle(required);
    checks.push(check('form value', new FormData(form).get('mood') === '🌟'));
    form.reset();
    await settle(required);
    checks.push(check('reset to default', required.value === '', required.value));
  }
  const readonly = byId('readonly');
  if (readonly) {
    const { list, root } = listOf(readonly);
    checks.push(check('read-only keeps the search enabled', list.inputElement?.disabled === false));
    const before = readonly.value;
    root.querySelectorAll<HTMLElement>('[role=option]')[3]?.click();
    await settle(readonly);
    checks.push(check('read-only refuses picks', readonly.value === before, readonly.value));
  }
  const disabled = byId('disabled');
  if (disabled) {
    const { list } = listOf(disabled);
    checks.push(check('disabled search', list.inputElement?.disabled === true));
    const tabs = [...disabled.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.category')];
    checks.push(
      check(
        'disabled category bar',
        tabs.length > 0 && tabs.every((tab) => tab.disabled),
        tabs.length,
      ),
    );
    const tone = disabled.shadowRoot!.querySelector<HTMLElement & { disabled: boolean }>(
      'tp-button.skin-tone',
    );
    checks.push(check('disabled skin tone selector', tone?.disabled === true));
  }
  return report(checks);
}
