import type { FlowEdgeKind } from '/src/foundation/flow/types.ts';
/* Flow fixture bootstrap. Driven only through Chrome DevTools MCP (see README.md). */
const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');
const api = await import(/* @vite-ignore */ built ? '/dist/widgets.js' : '/src/widgets/index.ts');
const icons = {
  zap: (await import(/* @vite-ignore */ built ? '/dist/icons/zap.js' : '/src/icons/zap.ts'))
    .zapIcon,
  database: (
    await import(/* @vite-ignore */ built ? '/dist/icons/database.js' : '/src/icons/database.ts')
  ).databaseIcon,
  mail: (await import(/* @vite-ignore */ built ? '/dist/icons/mail.js' : '/src/icons/mail.ts'))
    .mailIcon,
  lock: (await import(/* @vite-ignore */ built ? '/dist/icons/lock.js' : '/src/icons/lock.ts'))
    .lockIcon,
  'git-branch': (
    await import(
      /* @vite-ignore */ built ? '/dist/icons/git-branch.js' : '/src/icons/git-branch.ts'
    )
  ).gitBranchIcon,
  clock: (await import(/* @vite-ignore */ built ? '/dist/icons/clock.js' : '/src/icons/clock.ts'))
    .clockIcon,
  'upload-cloud': (
    await import(
      /* @vite-ignore */ built ? '/dist/icons/upload-cloud.js' : '/src/icons/upload-cloud.ts'
    )
  ).uploadCloudIcon,
  'file-text': (
    await import(/* @vite-ignore */ built ? '/dist/icons/file-text.js' : '/src/icons/file-text.ts')
  ).fileTextIcon,
  download: (
    await import(/* @vite-ignore */ built ? '/dist/icons/download.js' : '/src/icons/download.ts')
  ).downloadIcon,
  'shield-alert': (
    await import(
      /* @vite-ignore */ built ? '/dist/icons/shield-alert.js' : '/src/icons/shield-alert.ts'
    )
  ).shieldAlertIcon,
};
const samples = await import('./sample.ts');
const assertions = await import('./api.ts');

interface Recorded {
  readonly type: string;
  readonly target: string;
  readonly value: unknown;
  readonly previousValue: unknown;
  readonly reason: string;
  readonly cancelled: boolean;
  readonly metadata: unknown;
}
const events: Recorded[] = [];
const leaked: Recorded[] = [];
const record = (event: Event): Recorded => {
  const custom = event as CustomEvent<Record<string, unknown>>;
  const target = event.target as HTMLElement;
  return {
    type: event.type,
    target: target.id || target.localName,
    value: custom.detail?.['value'],
    previousValue: custom.detail?.['previousValue'],
    reason: String(custom.detail?.['reason'] ?? ''),
    cancelled: Boolean(custom.detail?.['cancelled']) || event.defaultPrevented,
    metadata: custom.detail?.['metadata'],
  };
};
const LANES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-viewport-change',
  'tp-selection-change',
  'tp-tool-change',
  'tp-mode-change',
  'tp-open-change',
  'tp-connect',
  'tp-delete',
  'tp-layout-complete',
  'tp-run-change',
  'tp-diagnostic',
];
for (const type of LANES)
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    if (target.localName === 'tp-flow') events.push(record(event));
    else leaked.push(record(event));
  });

type Flow = HTMLElement & {
  schema: unknown;
  icons: unknown;
  value: unknown;
  run: unknown;
  router: unknown;
  toJSON(): unknown;
};
const flows = {
  monitor: document.getElementById('monitor') as Flow,
  material: document.getElementById('material') as Flow,
  declarative: document.getElementById('declarative') as Flow,
  large: document.getElementById('large') as Flow,
  pipeline: document.getElementById('pipeline') as Flow,
  rtl: document.getElementById('rtl') as Flow,
  controlled: document.getElementById('controlled') as Flow,
  lateOwner: document.getElementById('late-owner') as Flow,
  neverOwner: document.getElementById('never-owner') as Flow,
  readonly: document.getElementById('readonly') as Flow,
  view: document.getElementById('view') as Flow,
  disabled: document.getElementById('disabled') as Flow,
  narrow: document.getElementById('narrow') as Flow,
  field: document.getElementById('field') as Flow,
};
for (const flow of Object.values(flows)) {
  flow.schema = samples.workflowSchema;
  flow.icons = icons;
}
flows.material.schema = samples.materialSchema;
flows.pipeline.schema = samples.pipelineSchema;
flows.pipeline.load(samples.pipelineDocument);
flows.rtl.schema = samples.pipelineSchema;
flows.rtl.load(samples.pipelineDocument);
flows.monitor.load(samples.workflowDocument);
flows.monitor.run = samples.sampleRun;
flows.material.load(samples.materialDocument);
for (const key of ['readonly', 'view', 'disabled', 'narrow', 'field'] as const)
  flows[key].load(structuredClone(samples.workflowDocument));
let ownerDocument = structuredClone(samples.workflowDocument);
flows.controlled.value = ownerDocument;
flows.controlled.addEventListener('tp-value-change', (event) => {
  const detail = (event as CustomEvent<{ value: unknown }>).detail;
  if ((window as unknown as { rejectControlled?: boolean }).rejectControlled) {
    event.preventDefault();
    return;
  }
  ownerDocument = detail.value as typeof ownerDocument;
  flows.controlled.value = ownerDocument;
});

// A late owner accepts every proposal and writes it back 40 ms later; a never owner accepts
// proposals but never writes anything back.
let lateDocument = structuredClone(samples.workflowDocument);
flows.lateOwner.value = lateDocument;
const lateWrites: unknown[] = [];
flows.lateOwner.addEventListener('tp-value-change', (event) => {
  const value = (event as CustomEvent<{ value: unknown }>).detail.value;
  setTimeout(() => {
    lateDocument = value as typeof lateDocument;
    lateWrites.push(value);
    flows.lateOwner.value = lateDocument;
  }, 40);
});
flows.neverOwner.value = structuredClone(samples.workflowDocument);

const form = document.getElementById('form') as HTMLFormElement;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  (document.getElementById('submitted') as HTMLOutputElement).value = JSON.stringify([
    ...data.entries(),
  ]).slice(0, 200);
});

function settle(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))),
  );
}

(window as unknown as { flowAPI: unknown }).flowAPI = {
  ...assertions,
  api,
  samples,
  flows,
  lateWrites,
  events,
  leaked,
  clear: () => {
    events.length = 0;
    leaked.length = 0;
  },
  settle,
  generate(count: number, kind?: FlowEdgeKind) {
    flows.large.load(samples.generateDocument(count, 25, kind));
    return settle();
  },
  create(attributes: Record<string, string> = {}) {
    const element = document.createElement('tp-flow') as Flow;
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    element.schema = samples.workflowSchema;
    element.icons = icons;
    document.getElementById('dynamic')!.append(element);
    return element;
  },
};
document.documentElement.dataset['fixtureReady'] = '';
