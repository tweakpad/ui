import { html, nothing } from 'lit';
import { TpProgress, defaultPresentationDictionary, setPresentationDictionary } from './runtime.js';
import type { TpProgress as Progress } from './runtime.js';
const byId = (id: string) => document.getElementById(id) as Progress;
const main = byId('main');
main.partContracts = { 'progress-value-output': { content: (state) => state.formattedValue } };
document.getElementById('advance')!.addEventListener('click', () => {
  main.value = Math.min(100, (main.value ?? 0) + 10);
});
document.getElementById('unknown')!.addEventListener('click', () => {
  main.value = null;
});
document.getElementById('reset')!.addEventListener('click', () => {
  main.value = 56;
});
async function settle(...elements: Progress[]): Promise<void> {
  for (let index = 0; index < 3; index++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await new Promise<void>((resolve) => {
      let completed = false;
      const finish = () => {
        if (!completed) {
          completed = true;
          resolve();
        }
      };
      requestAnimationFrame(finish);
      setTimeout(finish, 32);
    });
  }
}
async function runAssertions() {
  const rows: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) => {
    sessionStorage.setItem('progress-api-step', name);
    rows.push({ name, passed, actual });
  };
  const progress = new TpProgress() as Progress;
  progress.label = 'API task';
  progress.value = 25;
  document.body.append(progress);
  await settle(progress);
  const part = (name: string) =>
    progress.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`);
  const root = () => part('progress')!;
  check(
    'determinate-range-format-geometry',
    progress.percentage === 25 &&
      root().getAttribute('aria-valuenow') === '25' &&
      part('progress-indicator')!.style.inlineSize === '25%',
    progress.state,
  );
  check(
    'legacy-name-noninteractive-no-live-region',
    root().getAttribute('aria-label') === 'API task' &&
      !root().hasAttribute('tabindex') &&
      !root().hasAttribute('aria-live'),
  );
  check('optional-label-value-absent', !part('progress-label') && !part('progress-value-output'));
  const snapshots: unknown[] = [];
  let reference: HTMLElement | null = null;
  progress.partContracts = {
    'progress-label': {
      content: 'Label task',
      elementReference: (element) => {
        reference = element;
      },
    },
    'progress-value-output': {
      content: (state) => {
        snapshots.push(state);
        return state.formattedValue;
      },
    },
    'progress-indicator': {
      classHook: 'consumer-indicator',
      styleHook: { opacity: '0.8' },
      hostProperties: { 'data-consumer': 'true' },
    },
  };
  await settle(progress);
  check(
    'optional-label-value-content-name-ref',
    !!reference &&
      reference === part('progress-label') &&
      root().getAttribute('aria-labelledby') === reference.id &&
      part('progress-value-output')!.textContent === '25%',
  );
  check(
    'part-hooks-host-properties',
    part('progress-indicator')!.classList.contains('consumer-indicator') &&
      part('progress-indicator')!.style.opacity === '0.8' &&
      part('progress-indicator')!.getAttribute('data-consumer') === 'true',
  );
  check(
    'one-frozen-resolver-snapshot',
    snapshots.at(-1) === progress.state && Object.isFrozen(progress.state),
  );
  progress.minimum = 20;
  progress.maximum = 40;
  progress.value = 30;
  await settle(progress);
  check(
    'custom-range-normalized-percentage',
    progress.percentage === 50 &&
      root().getAttribute('aria-valuemin') === '20' &&
      root().getAttribute('aria-valuemax') === '40' &&
      root().getAttribute('aria-valuenow') === '30',
  );
  progress.value = 100;
  await settle(progress);
  check(
    'upper-clamp-complete-all-parts',
    progress.state.clampedValue === 40 &&
      progress.status === 'complete' &&
      [...progress.shadowRoot!.querySelectorAll('[part]')].filter((el) =>
        el.hasAttribute('data-complete'),
      ).length === 5,
  );
  progress.value = -1;
  await settle(progress);
  check(
    'lower-clamp-progressing-zero',
    progress.percentage === 0 &&
      progress.state.clampedValue === 20 &&
      progress.status === 'progressing',
  );
  progress.locale = 'de-DE';
  progress.format = { style: 'currency', currency: 'EUR' };
  progress.value = 30;
  await settle(progress);
  check(
    'locale-and-scalar-format',
    progress.formattedValue ===
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(30),
  );
  let raw: number | null = null;
  progress.getAccessibleValueText = (formatted, value) => {
    raw = value;
    return `Task ${formatted}`;
  };
  progress.value = 55;
  await settle(progress);
  check(
    'accessible-resolver-clamped-format-raw-value',
    raw === 55 && root().getAttribute('aria-valuetext') === `Task ${progress.formattedValue}`,
  );
  progress.valueText = 'Manual status';
  await settle(progress);
  check(
    'explicit-accessible-text-priority',
    root().getAttribute('aria-valuetext') === 'Manual status',
  );
  progress.valueText = undefined;
  progress.getAccessibleValueText = undefined;
  progress.format = undefined;
  for (const value of [null, NaN, Infinity, -Infinity]) {
    progress.value = value;
    await settle(progress);
    check(
      `indeterminate-${String(value)}`,
      progress.status === 'indeterminate' &&
        progress.percentage === null &&
        !root().hasAttribute('aria-valuenow') &&
        progress.formattedValue === '' &&
        part('progress-value-output')!.textContent === '' &&
        !part('progress-indicator')!.style.inlineSize,
    );
  }
  let diagnostic = 0;
  progress.addEventListener('tp-diagnostic', () => {
    diagnostic++;
  });
  progress.minimum = 5;
  progress.maximum = 5;
  progress.value = 6;
  await settle(progress);
  check(
    'invalid-range-safe-zero-diagnostic',
    progress.state.invalidRange &&
      progress.percentage === 0 &&
      root().getAttribute('aria-valuemin') === '0' &&
      root().getAttribute('aria-valuemax') === '100' &&
      root().getAttribute('aria-valuenow') === '0' &&
      progress.state.value === 6 &&
      diagnostic === 1,
    progress.state,
  );
  progress.value = null;
  await settle(progress);
  check(
    'invalid-range-indeterminate-stays-empty',
    progress.state.invalidRange &&
      progress.percentage === null &&
      !root().hasAttribute('aria-valuenow'),
  );
  progress.minimum = 0;
  progress.maximum = 100;
  progress.value = 50;
  progress.partContracts = { 'progress-track': { renderDelegate: () => nothing } };
  await settle(progress);
  check(
    'optional-track-omission-preserves-role-value',
    !part('progress-track') &&
      !part('progress-indicator') &&
      root().getAttribute('aria-valuenow') === '50',
  );
  let delegateRef: HTMLElement | null = null;
  progress.partContracts = {
    'progress-indicator': {
      renderDelegate: ({ bind }) => html`<span ${bind}></span>`,
      elementReference: (element) => {
        delegateRef = element;
      },
    },
  };
  await settle(progress);
  check(
    'delegate-required-properties-ref',
    delegateRef === part('progress-indicator') &&
      delegateRef?.localName === 'span' &&
      delegateRef.style.inlineSize === '50%',
  );
  progress.remove();
  await settle(progress);
  check('disconnect-ref-cleanup', delegateRef === null);
  document.body.append(progress);
  await settle(progress);
  check('reconnect-ref-restored', delegateRef === part('progress-indicator'));
  const names = [
    'progress',
    'progress-label',
    'progress-value-output',
    'progress-track',
    'progress-indicator',
  ];
  const refs: Record<string, HTMLElement | null> = {};
  const seen: Record<string, unknown> = {};
  progress.partContracts = Object.fromEntries(
    names.map((name) => [
      name,
      {
        classHook: () => `consumer-${name}`,
        styleHook: () => ({ opacity: '0.9' }),
        hostProperties: { 'data-consumer': 'yes' },
        elementReference: (element: HTMLElement | null) => {
          refs[name] = element;
        },
        renderDelegate: ({
          state,
          content,
          bind,
        }: {
          state: unknown;
          content: unknown;
          bind: unknown;
        }) => {
          seen[name] = state;
          return name === 'progress-label' || name === 'progress-value-output'
            ? html`<span ${bind}>${content}</span>`
            : html`<div ${bind}>${content}</div>`;
        },
      },
    ]),
  );
  await settle(progress);
  for (const name of names) {
    const node = part(name);
    check(
      `five-part-delegate-properties-class-style-ref-${name}`,
      !!node &&
        node === refs[name] &&
        seen[name] === progress.state &&
        node.classList.contains(`consumer-${name}`) &&
        node.style.opacity === '0.9' &&
        node.getAttribute('data-consumer') === 'yes',
    );
  }
  for (const name of names) {
    progress.partContracts = { [name]: { content: () => `content-${name}` } };
    await settle(progress);
    check(`five-part-content-resolver-${name}`, part(name)?.textContent === `content-${name}`);
  }
  progress.partContracts = {};
  progress.minimum = 0;
  progress.maximum = 100;
  progress.value = 25;
  // Normal is the explicit animation optin; OS inheritance is asserted separately below.
  progress.motionPolicy = 'normal';
  const requests: { role: string; phase: string; percentage?: unknown; reduced: boolean }[] = [];
  let canceled = 0;
  const driver = (event: Event) => {
    const motion = event as Event & {
      request: {
        role: string;
        phase: string;
        context: Record<string, unknown>;
        reducedMotion: boolean;
      };
      respondWith: (value: unknown) => boolean;
    };
    motion.respondWith({
      play: (request: typeof motion.request) => {
        requests.push({
          role: request.role,
          phase: request.phase,
          percentage: request.context.percentage,
          reduced: request.reducedMotion,
        });
        return {
          finished: new Promise<void>(() => {}),
          cancel: () => {
            canceled++;
          },
        };
      },
    });
  };
  progress.addEventListener('tp-motion-request', driver);
  await settle(progress);
  progress.value = 60;
  await settle(progress);
  check(
    'finite-driver-synchronous-aria-context',
    root().getAttribute('aria-valuenow') === '60' &&
      requests.some(
        (request) =>
          request.role === 'value' && request.phase === 'change' && request.percentage === 60,
      ),
  );
  progress.value = 30;
  await settle(progress);
  check(
    'rapid-driver-reversal-cancels',
    canceled > 0 && root().getAttribute('aria-valuenow') === '30',
  );
  progress.value = null;
  await settle(progress);
  check(
    'ambient-driver-start',
    requests.some((request) => request.role === 'indeterminate' && request.phase === 'start'),
  );
  progress.value = 80;
  await settle(progress);
  check(
    'ambient-driver-stop',
    requests.some((request) => request.role === 'indeterminate' && request.phase === 'stop'),
  );
  progress.value = null;
  await settle(progress);
  const beforeCancel = canceled;
  progress.partContracts = { 'progress-indicator': { renderDelegate: () => nothing } };
  await settle(progress);
  check(
    'indicator-omission-cancels-motion',
    canceled > beforeCancel && !part('progress-indicator'),
  );
  progress.partContracts = {};
  progress.motionPolicy = 'reduce';
  await settle(progress);
  check(
    'explicit-reduced-motion-static-indeterminate',
    part('progress-indicator')!.hasAttribute('data-reduced-motion') &&
      getComputedStyle(part('progress-indicator')!).animationName === 'none' &&
      !root().hasAttribute('aria-valuenow'),
  );
  progress.removeEventListener('tp-motion-request', driver);
  progress.value = 50;
  await settle(progress);
  progress.style.setProperty('--tp-space-1', '9px');
  progress.style.setProperty('--tp-primary', 'rgb(18, 52, 86)');
  await settle(progress);
  check(
    'scoped-token-customization-preserves-state',
    getComputedStyle(part('progress-track')!).height === '9px' &&
      getComputedStyle(part('progress-indicator')!).backgroundColor === 'rgb(18, 52, 86)' &&
      progress.percentage === 50,
  );
  progress.partPresentation = {
    'progress-track': { classHook: 'presentation-track', styleHook: { opacity: '0.7' } },
  };
  await settle(progress);
  check(
    'part-presentation-keeps-geometry-role',
    part('progress-track')!.classList.contains('presentation-track') &&
      part('progress-track')!.style.opacity === '0.7' &&
      root().getAttribute('role') === 'progressbar' &&
      part('progress-indicator')!.style.inlineSize === '50%',
  );
  try {
    setPresentationDictionary({
      'progress-track': [{ declarations: { height: '11px', background: 'rgb(30, 60, 90)' } }],
      'progress-indicator': [{ declarations: { background: 'rgb(90, 60, 30)' } }],
    });
    await settle(progress);
    check(
      'full-dictionary-replacement-mandatory-geometry-state',
      getComputedStyle(part('progress-track')!).height === '11px' &&
        getComputedStyle(part('progress-indicator')!).backgroundColor === 'rgb(90, 60, 30)' &&
        part('progress-indicator')!.style.inlineSize === '50%' &&
        root().getAttribute('aria-valuenow') === '50',
    );
  } finally {
    setPresentationDictionary(defaultPresentationDictionary);
  }
  const owner = document.createElement('div');
  owner.lang = 'de-DE';
  owner.dir = 'ltr';
  document.body.append(owner);
  const shadow = owner.attachShadow({ mode: 'open' });
  const nested = new TpProgress() as Progress;
  nested.value = 12.5;
  shadow.append(nested);
  await settle(nested);
  const nestedIndicator = () =>
    nested.shadowRoot!.querySelector<HTMLElement>('[part~="progress-indicator"]')!;
  check(
    'shadow-language-owner-inherited',
    nested.formattedValue === new Intl.NumberFormat('de-DE', { style: 'percent' }).format(0.125),
  );
  owner.lang = 'en-US';
  owner.dir = 'rtl';
  nested.value = null;
  await settle(nested);
  check(
    'shadow-owner-language-direction-lifetime',
    nested.formattedValue === '' && nestedIndicator().getAttribute('data-direction') === 'rtl',
  );
  nested.value = 12.5;
  await settle(nested);
  check(
    'changed-shadow-language-number',
    nested.formattedValue === new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.125),
  );
  const label = document.createElement('span');
  label.id = 'progress-api-external';
  label.textContent = 'External initial';
  document.body.append(label);
  nested.setAttribute('aria-labelledby', label.id);
  await settle(nested);
  const nestedRoot = nested.shadowRoot!.querySelector<HTMLElement>('[part~="progress"]')!;
  check(
    'external-label-native-elements-reference',
    nestedRoot.ariaLabelledByElements?.[0] === label && !nestedRoot.hasAttribute('aria-label'),
  );
  label.textContent = 'External changed';
  await settle(nested);
  check(
    'external-label-text-reference-live',
    nestedRoot.ariaLabelledByElements?.[0]?.textContent === 'External changed',
  );
  nested.removeAttribute('aria-labelledby');
  nested.setAttribute('aria-label', 'Explicit task');
  await settle(nested);
  check(
    'external-label-clear-explicit-name',
    nestedRoot.getAttribute('aria-label') === 'Explicit task' &&
      !nestedRoot.ariaLabelledByElements?.length,
  );
  progress.motionPolicy = 'inherit';
  progress.value = null;
  await settle(progress);
  const osReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  check(
    'actual-os-policy-inheritance-runtime',
    part('progress-indicator')!.hasAttribute('data-reduced-motion') === osReduced &&
      (osReduced
        ? getComputedStyle(part('progress-indicator')!).animationName === 'none' &&
          getComputedStyle(part('progress-indicator')!).transitionDuration === '0s'
        : getComputedStyle(part('progress-indicator')!).animationName.includes(
            'tp-progress-indeterminate',
          )) &&
      !root().hasAttribute('aria-valuenow'),
    { osReduced, animation: getComputedStyle(part('progress-indicator')!).animationName },
  );
  progress.motionPolicy = 'normal';
  await settle(progress);
  check(
    'explicit-normal-animation-optin',
    !part('progress-indicator')!.hasAttribute('data-reduced-motion') &&
      getComputedStyle(part('progress-indicator')!).animationName.includes(
        'tp-progress-indeterminate',
      ),
  );
  owner.setAttribute('motion-policy', 'reduce');
  nested.value = null;
  await settle(nested);
  check(
    'composed-shadow-ancestor-reduce-policy',
    nestedIndicator().hasAttribute('data-reduced-motion') &&
      getComputedStyle(nestedIndicator()).animationName === 'none',
  );
  owner.setAttribute('motion-policy', 'normal');
  await settle(nested);
  check(
    'composed-shadow-ancestor-normal-policy',
    !nestedIndicator().hasAttribute('data-reduced-motion') &&
      getComputedStyle(nestedIndicator()).animationName.includes('rtl'),
  );
  const frame = document.createElement('iframe');
  frame.title = 'Progress adoption test';
  document.body.append(frame);
  const foreignDoc = frame.contentDocument!;
  foreignDoc.documentElement.lang = 'fr-FR';
  foreignDoc.documentElement.dir = 'rtl';
  await new Promise<void>((resolve, reject) => {
    const link = foreignDoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = location.pathname.endsWith('/package.html')
      ? '/dist/styles.css'
      : '/src/styles.css';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Progress adoption stylesheet failed'));
    foreignDoc.head.append(link);
    setTimeout(() => reject(new Error('Progress adoption stylesheet timed out')), 3000);
  });
  const adopted = new TpProgress() as Progress;
  adopted.value = 12.5;
  document.body.append(adopted);
  await settle(adopted);
  const sameRoot = adopted.shadowRoot!.querySelector('[part~="progress"]');
  foreignDoc.body.append(foreignDoc.adoptNode(adopted));
  await settle(adopted);
  const adoptedIndicator = () =>
    adopted.shadowRoot!.querySelector<HTMLElement>('[part~="progress-indicator"]')!;
  check(
    'iframe-adoption-native-identity-locale-and-paint',
    adopted.ownerDocument === foreignDoc &&
      adopted.shadowRoot!.querySelector('[part~="progress"]') === sameRoot &&
      adopted.formattedValue ===
        new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(0.125) &&
      Math.abs(
        parseFloat(
          foreignDoc.defaultView!.getComputedStyle(
            adopted.shadowRoot!.querySelector('[part~="progress-track"]')!,
          ).height,
        ) - 3.2,
      ) < 0.05,
    {
      formatted: adopted.formattedValue,
      height: foreignDoc.defaultView!.getComputedStyle(
        adopted.shadowRoot!.querySelector('[part~="progress-track"]')!,
      ).height,
    },
  );
  adopted.value = null;
  await settle(adopted);
  check(
    'iframe-adoption-owner-os-policy-rtl',
    adoptedIndicator().hasAttribute('data-reduced-motion') ===
      foreignDoc.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      adoptedIndicator().getAttribute('data-direction') === 'rtl' &&
      (foreignDoc.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? foreignDoc.defaultView!.getComputedStyle(adoptedIndicator()).animationName === 'none'
        : foreignDoc
            .defaultView!.getComputedStyle(adoptedIndicator())
            .animationName.includes('rtl')),
    { osReduced: foreignDoc.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches },
  );
  adopted.motionPolicy = 'normal';
  await settle(adopted);
  check(
    'iframe-adoption-normal-policy-ambient',
    !adoptedIndicator().hasAttribute('data-reduced-motion') &&
      foreignDoc.defaultView!.getComputedStyle(adoptedIndicator()).animationName.includes('rtl'),
  );
  foreignDoc.documentElement.lang = 'de-DE';
  foreignDoc.documentElement.dir = 'ltr';
  adopted.value = 12.5;
  await settle(adopted);
  check(
    'iframe-adoption-inherited-owner-lifetime',
    adopted.formattedValue === new Intl.NumberFormat('de-DE', { style: 'percent' }).format(0.125) &&
      adoptedIndicator().getAttribute('data-direction') === 'ltr',
  );
  frame.remove();
  owner.remove();
  label.remove();
  progress.remove();
  return rows;
}
Object.assign(window, {
  progressAPI: {
    main,
    byId,
    settle,
    runAssertions,
    ready: Promise.all(
      [...document.querySelectorAll<Progress>('tp-progress')].map(
        (element) => element.updateComplete,
      ),
    ),
  },
});
