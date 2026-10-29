/** Contract checks for CL Visually hidden; run through Chrome DevTools MCP evaluation. */

const built = new URL(location.href).searchParams.has('package');

const hiddenDeclarations = {
  display: 'block',
  position: 'absolute',
  width: '1px',
  height: '1px',
  marginBlockStart: '-1px',
  marginInlineStart: '0px',
  marginInlineEnd: '0px',
  paddingTop: '0px',
  borderTopWidth: '0px',
  overflowX: 'hidden',
  overflowY: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const;

function hiddenMismatch(element: Element): string[] {
  const style = getComputedStyle(element);
  return Object.entries(hiddenDeclarations)
    .filter(([property, value]) => style[property as keyof typeof hiddenDeclarations] !== value)
    .map(
      ([property, value]) =>
        `${property}=${style[property as keyof typeof hiddenDeclarations]} (expected ${value})`,
    );
}

function harness() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  // Timers, not animation frames: a DevTools-driven tab can throttle frames.
  const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
  const settle = async (root: ParentNode = document) => {
    for (let n = 0; n < 3; n++) {
      await wait();
      for (const el of root.querySelectorAll('*'))
        if ('updateComplete' in el)
          await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    }
  };
  const diagnostics: { code: string; target: EventTarget | null }[] = [];
  const collect = (event: Event) =>
    diagnostics.push({
      code: (event as CustomEvent<{ code: string }>).detail.code,
      target: event.composedPath()[0] ?? null,
    });
  document.addEventListener('tp-diagnostic', collect);
  const stage = (markup: string) => {
    const root = document.createElement('section');
    root.className = 'api-checks';
    root.innerHTML = markup;
    document.querySelector('main')!.append(root);
    return root;
  };
  return {
    results,
    assert,
    wait,
    settle,
    diagnostics,
    stage,
    stop: () => document.removeEventListener('tp-diagnostic', collect),
  };
}

const isHidden = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return rect.width <= 1 && rect.height <= 1 && hiddenMismatch(element).length === 0;
};

export async function verifyVisuallyHidden() {
  const { results, assert, wait, settle, diagnostics, stage, stop } = harness();
  await settle();
  const ctor = customElements.get('tp-visually-hidden') as
    (CustomElementConstructor & { elementProperties: Map<string, unknown> }) | undefined;
  assert(ctor, 'tp-visually-hidden is defined');

  // C-08: no properties of its own; the host is the visually-hidden presentation part.
  const base = Object.getPrototypeOf(ctor) as { elementProperties: Map<string, unknown> };
  assert(
    [...ctor!.elementProperties.keys()].every((key) => base.elementProperties.has(key)),
    'no properties beyond the common element properties',
  );

  // C-01: every instance in the page is a clipped 1px box with the shared declarations.
  const instances = [...document.querySelectorAll('tp-visually-hidden')];
  for (const element of instances)
    assert(
      isHidden(element),
      `hidden box: ${element.textContent!.trim().slice(0, 24)} ${hiddenMismatch(element).join(', ')}`,
    );
  assert(
    instances.every((element) => getComputedStyle(element).display === 'block'),
    'host display is block',
  );

  // C-01: no layout contribution inline, in blocks, right to left and in vertical writing.
  const layoutRoot = stage(`
    <p class="pair"><span>Alpha </span><tp-visually-hidden>long hidden words that would wrap the line twice over</tp-visually-hidden><span class="after">Beta</span></p>
    <p class="pair"><span>Alpha </span><span class="after">Beta</span></p>
    <div class="block-pair"><tp-visually-hidden>block hidden</tp-visually-hidden><p class="after" style="margin:0">After</p></div>
    <div class="block-pair"><p class="after" style="margin:0">After</p></div>
    <p dir="rtl" class="pair"><span>ألفا </span><tp-visually-hidden>كلمات مخفية طويلة</tp-visually-hidden><span class="after">باء</span></p>
    <p dir="rtl" class="pair"><span>ألفا </span><span class="after">باء</span></p>
    <div style="writing-mode:vertical-rl;block-size:80px" class="pair"><span>上</span><tp-visually-hidden>隠れた長い文章です</tp-visually-hidden><span class="after">下</span></div>
    <div style="writing-mode:vertical-rl;block-size:80px" class="pair"><span>上</span><span class="after">下</span></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px"><p style="margin:0">Short</p><tp-visually-hidden>hidden text that is far longer than the scroll box is wide</tp-visually-hidden></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px"><p style="margin:0">Short</p></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p style="margin:0">Short</p><p style="margin:0">Second</p><p style="margin:0">Third</p><tp-visually-hidden>hidden text at the end of overflowing content</tp-visually-hidden></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p style="margin:0">Short</p><p style="margin:0">Second</p><p style="margin:0">Third</p></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p dir="rtl" style="margin:0"><tp-visually-hidden>مخفي</tp-visually-hidden>ظاهر</p></div>
    <div class="scroller" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p dir="rtl" style="margin:0">ظاهر</p></div>
    <div class="scroller" dir="rtl" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p dir="ltr" style="margin:0"><tp-visually-hidden>hidden</tp-visually-hidden>Shown</p></div>
    <div class="scroller" dir="rtl" style="overflow:auto;block-size:40px;inline-size:160px;position:relative"><p dir="ltr" style="margin:0">Shown</p></div>`);
  await settle(layoutRoot);
  const pairs = [...layoutRoot.querySelectorAll('.pair, .block-pair')];
  for (let index = 0; index < pairs.length; index += 2) {
    const [withHidden, without] = [pairs[index]!, pairs[index + 1]!];
    const a = withHidden.querySelector('.after')!.getBoundingClientRect();
    const b = without.querySelector('.after')!.getBoundingClientRect();
    const origin = withHidden.getBoundingClientRect();
    const reference = without.getBoundingClientRect();
    assert(
      Math.abs(a.left - origin.left - (b.left - reference.left)) < 0.5 &&
        Math.abs(a.top - origin.top - (b.top - reference.top)) < 0.5 &&
        Math.abs(origin.height - reference.height) < 0.5 &&
        Math.abs(origin.width - reference.width) < 0.5,
      `no layout shift (${withHidden.getAttribute('dir') ?? (withHidden as HTMLElement).style.writingMode ?? 'ltr'} pair ${index / 2})`,
    );
  }
  const scrollers = [...layoutRoot.querySelectorAll<HTMLElement>('.scroller')];
  const scrollerLabels = [
    'static',
    'positioned',
    'right-to-left text in a left-to-right',
    'left-to-right text in a right-to-left',
  ];
  for (let index = 0; index < scrollers.length; index += 2)
    assert(
      scrollers[index]!.scrollWidth === scrollers[index + 1]!.scrollWidth &&
        scrollers[index]!.scrollHeight === scrollers[index + 1]!.scrollHeight,
      `scroll extent unchanged (${scrollerLabels[index / 2]} scroll box): ${scrollers[index]!.scrollWidth}×${scrollers[index]!.scrollHeight}`,
    );

  // C-04: outer styles, inline important styles, class hooks and common properties cannot reveal it.
  const robust = stage(`
    <style>
      .api-checks tp-visually-hidden.reveal, .api-checks #robust {
        position: static !important; inline-size: auto !important; block-size: auto !important;
        width: 300px !important; height: 40px !important; clip-path: none !important;
        overflow: visible !important; white-space: normal !important; margin: 0 !important;
        padding: 12px !important; border: 4px solid red !important; display: contents !important;
      }
    </style>
    <tp-visually-hidden id="robust" style="position: static !important; clip-path: none !important; width: 200px !important" disabled>Spilled secret</tp-visually-hidden>
    <tp-visually-hidden id="hooked">Hooked secret</tp-visually-hidden>`);
  const hooked = robust.querySelector<HTMLElement & { partPresentation: unknown }>('#hooked')!;
  hooked.partPresentation = { 'visually-hidden': { classHook: 'reveal' } };
  await settle(robust);
  assert(hooked.classList.contains('reveal'), 'class hook reaches the visually-hidden host part');
  for (const element of robust.querySelectorAll('tp-visually-hidden'))
    assert(
      isHidden(element),
      `outer styles cannot reveal #${element.id}: ${hiddenMismatch(element).join(', ')}`,
    );
  assert(
    getComputedStyle(robust.querySelector('#robust')!).display === 'block',
    'outer display: contents cannot remove the hidden box',
  );

  // C-05: hidden removes the box and its content; removing the attribute restores it.
  const toggled = robust.querySelector<HTMLElement>('#robust')!;
  toggled.hidden = true;
  await wait();
  assert(
    getComputedStyle(toggled).display === 'none' && toggled.getClientRects().length === 0,
    'hidden removes the element from rendering',
  );
  toggled.hidden = false;
  await wait();
  assert(
    isHidden(toggled) && getComputedStyle(toggled).display === 'block',
    'removing hidden restores it',
  );

  // C-06 / C-09: focusable content raises one diagnostic; text does not; disconnect cancels.
  diagnostics.length = 0;
  const content = stage(`
    <tp-visually-hidden id="d-text">Only text</tp-visually-hidden>
    <tp-visually-hidden id="d-button"><button>Native</button></tp-visually-hidden>
    <tp-visually-hidden id="d-link"><a href="#">Link</a></tp-visually-hidden>
    <tp-visually-hidden id="d-library"><tp-button>Library</tp-button></tp-visually-hidden>
    <tp-visually-hidden id="d-negative"><span tabindex="-1">Programmatic</span></tp-visually-hidden>`);
  await settle(content);
  await wait(60);
  const codes = (id: string) =>
    diagnostics.filter((d) => (d.target as Element | null)?.id === id).map((d) => d.code);
  assert(codes('d-text').length === 0, 'text content raises no diagnostic');
  assert(codes('d-negative').length === 0, 'tabindex -1 content raises no diagnostic');
  for (const id of ['d-button', 'd-link', 'd-library'])
    assert(
      codes(id).join() === 'visually-hidden-focusable-content',
      `focusable content raises one diagnostic (#${id})`,
    );
  diagnostics.length = 0;
  const late = content.querySelector('#d-text')!;
  late.append(Object.assign(document.createElement('button'), { textContent: 'Late' }));
  late.remove();
  await wait(60);
  assert(codes('d-text').length === 0, 'disconnect before the check cancels it');
  content.append(late);
  await wait(60);
  assert(codes('d-text').join() === 'visually-hidden-focusable-content', 'reconnect checks again');

  // C-03: the host adds no role or name; caller attributes apply unchanged.
  const status = document.getElementById('status-region')!;
  assert(
    status.getAttribute('role') === 'status' && !status.hasAttribute('aria-label'),
    'caller role kept, no name added',
  );
  const plain = document.querySelector('#layouts tp-visually-hidden')!;
  assert(
    !plain.hasAttribute('role') && !plain.hasAttribute('aria-live'),
    'no own role or live region',
  );
  assert(
    !instances.some((element) => (element as HTMLElement).tabIndex >= 0),
    'never in the tab order',
  );

  // C-12: an icon-size Button hides its label visually and keeps it as the name.
  const buttonLabel = (id: string) =>
    document.getElementById(id)!.shadowRoot!.querySelector('[part~="button-label"]')!;
  assert(
    isHidden(buttonLabel('button-label')),
    `icon Button label hidden visually: ${hiddenMismatch(buttonLabel('button-label')).join(', ')}`,
  );
  assert(
    buttonLabel('button-label').textContent!.trim() === '' &&
      document.getElementById('button-label')!.textContent!.trim() === 'Remove plot',
    'icon Button label keeps its slotted text',
  );
  const textLabel = buttonLabel('button-text').getBoundingClientRect();
  assert(
    textLabel.width > 20 && getComputedStyle(buttonLabel('button-text')).position !== 'absolute',
    'text Button label stays visible',
  );
  const buttonCodes = (id: string) =>
    allDiagnostics.filter((d) => (d.target as Element | null)?.id === id).map((d) => d.code);
  assert(
    buttonCodes('button-unnamed').join() === 'button-accessible-name-missing',
    'unnamed icon Button diagnosed',
  );
  for (const id of ['button-label', 'button-aria', 'button-text'])
    assert(buttonCodes(id).length === 0, `named Button not diagnosed (#${id})`);

  stop();
  for (const root of document.querySelectorAll('.api-checks')) root.remove();
  return results;
}

/** Diagnostics from page load, for checks on elements that rendered before the module ran. */
const allDiagnostics: { code: string; target: EventTarget | null }[] = ((
  window as unknown as { __tpDiagnostics?: typeof allDiagnostics }
).__tpDiagnostics ??= []);

/** C-07: the library stylesheet hides undefined elements and suppressed shadow styles. */
export async function verifyStylesheet() {
  const { results, assert, wait, settle, stage, stop } = harness();
  const frame = document.createElement('iframe');
  frame.style.cssText = 'inline-size:320px;block-size:120px;border:0';
  frame.srcdoc = `<!doctype html><link rel="stylesheet" href="${built ? '/dist/styles.css' : '/src/styles.css'}"><p>Before<tp-visually-hidden id="undefined">Not yet defined</tp-visually-hidden><span id="after">After</span><tp-visually-hidden id="withdrawn" hidden>Withdrawn</tp-visually-hidden></p>`;
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  document.querySelector('main')!.append(frame);
  await loaded;
  await wait(60);
  const undefinedElement = frame.contentDocument!.getElementById('undefined')!;
  assert(
    !frame.contentWindow!.customElements.get('tp-visually-hidden'),
    'element is undefined in the frame',
  );
  assert(
    isHidden(undefinedElement),
    `undefined element hidden by the stylesheet: ${hiddenMismatch(undefinedElement).join(', ')}`,
  );
  const withdrawn = frame.contentDocument!.getElementById('withdrawn')!;
  assert(
    getComputedStyle(withdrawn).display === 'none',
    'hidden removes an undefined element despite the stylesheet',
  );
  frame.remove();

  const { ContentSecurityService } = (await (built
    ? import('../../../../dist/index.js')
    : import('../../../../src/index.js'))) as typeof import('../../../../src/index.js');
  const scope = stage('<div id="suppressed"></div>').querySelector<HTMLElement>('#suppressed')!;
  const security = new ContentSecurityService(scope, { disableStyleElements: true });
  scope.innerHTML =
    '<p>Before<tp-visually-hidden id="no-styles">Suppressed styles</tp-visually-hidden>After</p>';
  await settle(scope);
  const suppressed = scope.querySelector('tp-visually-hidden')!;
  assert(
    suppressed.shadowRoot!.adoptedStyleSheets.length === 0 &&
      !suppressed.shadowRoot!.querySelector('style'),
    'generated styles are suppressed',
  );
  assert(
    isHidden(suppressed),
    `stylesheet hides content with suppressed styles: ${hiddenMismatch(suppressed).join(', ')}`,
  );
  security.dispose();
  stop();
  for (const root of document.querySelectorAll('.api-checks')) root.remove();
  return results;
}

/** C-11: every library copy of hidden text uses the shared declarations. */
export async function verifySharedOwner() {
  const { results, assert, settle, stop } = harness();
  await settle();
  const consumers = document.getElementById('consumers')!;
  const shadowHidden = (selector: string) =>
    [...consumers.querySelectorAll(selector)].flatMap((host) => [
      ...(host.shadowRoot?.querySelectorAll('.visually-hidden') ?? []),
    ]);
  for (const tag of [
    'tp-spinner',
    'tp-checkbox',
    'tp-overflow-list',
    'tp-code-block',
    'tp-timeline-item',
  ]) {
    const nodes = shadowHidden(tag);
    assert(nodes.length > 0, `${tag} renders visually hidden parts (${nodes.length})`);
    for (const node of nodes)
      assert(
        hiddenMismatch(node).length === 0,
        `${tag} .visually-hidden uses the shared declarations ${hiddenMismatch(node).join(', ')}`,
      );
  }
  const pieces = [...consumers.querySelectorAll('tp-mo-text-split [data-tp-text]')];
  assert(pieces.length > 0, `text split renders hidden text runs (${pieces.length})`);
  for (const piece of pieces)
    assert(
      hiddenMismatch(piece).length === 0,
      `text split run uses the shared declarations ${hiddenMismatch(piece).join(', ')}`,
    );
  const association = [...consumers.querySelectorAll<HTMLElement>('tp-input > span[id]')].filter(
    (node) => node.style.clipPath,
  );
  assert(association.length > 0, `light-DOM description node exists (${association.length})`);
  for (const node of association) {
    assert(
      hiddenMismatch(node).length === 0,
      `light-DOM description node hidden inline ${hiddenMismatch(node).join(', ')}`,
    );
    const box = node.getBoundingClientRect();
    const host = node.parentElement!.getBoundingClientRect();
    assert(
      box.left >= host.left && box.right <= host.right,
      `light-DOM description node stays inside its control (${box.left}..${box.right} in ${host.left}..${host.right})`,
    );
  }
  const palette = consumers.querySelector('tp-command-palette')!;
  const header = palette.shadowRoot?.querySelector('.header');
  if (header)
    assert(
      hiddenMismatch(header).length === 0,
      `command palette header uses the shared declarations ${hiddenMismatch(header).join(', ')}`,
    );
  else
    results.push(
      'command palette header not rendered while closed (checked on open in browser-steps)',
    );
  if (!built) {
    const { LiveAnnouncer } = await import('../../../../src/foundation/announcer.js');
    const announcer = new LiveAnnouncer({ document: () => document });
    announcer.announce('Watering scheduled');
    const region = announcer.region()!;
    assert(
      hiddenMismatch(region).length === 0,
      `live announcer region uses the shared declarations ${hiddenMismatch(region).join(', ')}`,
    );
    announcer.dispose();
  }
  stop();
  return results;
}
