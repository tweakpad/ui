// Browser fixture for tp-file-explorer, driven only through Chrome DevTools MCP (see README.md).
const built = new URLSearchParams(location.search).has('built');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');
const { createMemorySource } = await import('../../../../src/foundation/file-explorer/index.ts');
const { observatoryArchive } =
  await import('../../../../src/stories/widgets/file-explorer.examples.ts');

type Explorer = HTMLElement & Record<string, unknown> & { updateComplete: Promise<boolean> };
const explorer = (id: string) => document.getElementById(id) as Explorer;

const archive = createMemorySource(observatoryArchive({ extraPlates: 2000 }));
explorer('full').source = archive;
explorer('full').columns = [
  {
    id: 'observer',
    header: 'Observer',
    width: '9rem',
    fields: ['observer'],
    value: (entry: { metadata?: Record<string, unknown> }) => entry.metadata?.observer,
  },
];
explorer('picker').source = createMemorySource(observatoryArchive());
// A slow source: listings arrive without metadata after 900 ms, and the observer column's
// metadata loads lazily, 600 ms per batch, for the rows that show.
const slow = createMemorySource(observatoryArchive(), { latency: 900 });
const metadataCalls: string[][] = [];
explorer('slow').source = {
  ...slow,
  list: async (request: Parameters<typeof slow.list>[0]) => {
    const result = await slow.list(request);
    return {
      ...result,
      entries: result.entries.map((entry) => ({ ...entry, metadata: {} })),
    };
  },
  metadata: async (request: Parameters<NonNullable<typeof slow.metadata>>[0]) => {
    metadataCalls.push([...request.ids]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return slow.metadata!({ ...request, signal: new AbortController().signal });
  },
};
explorer('slow').columns = [
  {
    id: 'observer',
    header: 'Observer',
    width: '9rem',
    fields: ['observer'],
    value: (entry: { metadata?: Record<string, unknown> }) => entry.metadata?.observer,
  },
];

const events: { id: string; type: string; value: unknown }[] = [];
for (const type of [
  'tp-folder-change',
  'tp-value-change',
  'tp-view-change',
  'tp-sort-change',
  'tp-open',
])
  document.addEventListener(type, (event) => {
    const detail = ((event as CustomEvent).detail ?? {}) as Record<string, unknown>;
    events.push({
      id: (event.target as HTMLElement).id,
      type,
      value: detail.value ?? (detail.entry as { id?: string } | undefined)?.id ?? null,
    });
  });

Object.assign(window, {
  fileExplorerAPI: { events, get: explorer, archive, metadataCalls },
});
document.documentElement.dataset.fixtureReady = '';
