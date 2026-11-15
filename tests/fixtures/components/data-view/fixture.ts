// Browser fixture for tp-data-view, driven only through Chrome DevTools MCP (see README.md).
// The controlled owner supplies its value before the element upgrades.
(document.getElementById('controlled') as unknown as { value: string[] }).value = ['st-0001'];
const built = new URLSearchParams(location.search).has('built');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { html } = await import('lit');
const {
  fieldStations,
  stationColumns,
  statusColumn,
  stationTelemetry,
  telemetryColumns,
  telemetryMiddleware,
  telemetryPartContracts,
} = await import('../../../../src/stories/data-view.examples.ts');
const { sortDataViewRows } = await import('../../../../src/components/data-view/index.ts');
const { ellipsisVerticalIcon: ellipsisIcon } = await import('../../../../src/icons/ellipsis.ts');
(document.getElementById('station-actions') as HTMLElement & { icon: unknown }).icon = ellipsisIcon;

type View = HTMLElement & Record<string, unknown> & { updateComplete: Promise<boolean> };
const view = (id: string) => document.getElementById(id) as View;

const columns = [...stationColumns, statusColumn];
const stations = fieldStations(60);

view('many').columns = [
  { id: 'id', header: 'Reading', sortable: true, rowHeader: true },
  { id: 'station', header: 'Station', sortable: true },
  {
    id: 'temperature',
    header: 'Temperature',
    sortable: true,
    align: 'end',
    format: (value: number) => `${value.toFixed(1)} °C`,
  },
];
view('many').rows = Array.from({ length: 10_000 }, (_, index) => ({
  id: `r-${index + 1}`,
  station: stations[index % stations.length]!.name,
  temperature: Math.sin(index / 40) * 12 + 8,
}));

// Heavy customization: pinned columns, middleware, part contracts and per-column parts.
const telemetry = view('telemetry');
const search = document.getElementById('telemetry-search') as HTMLElement & { value: string };
const readings = stationTelemetry(48);
let query = '';
const filter = () => {
  const q = query.trim().toLowerCase();
  telemetry.rows = q
    ? readings.filter((row) =>
        telemetryColumns.some((column) =>
          String((row as unknown as Record<string, unknown>)[column.id] ?? '')
            .toLowerCase()
            .includes(q),
        ),
      )
    : readings;
};
telemetry.columns = telemetryColumns;
telemetry.middleware = telemetryMiddleware({
  query: () => query,
  clear: () => {
    query = '';
    search.value = '';
    filter();
  },
});
telemetry.partContracts = telemetryPartContracts;
filter();
search.addEventListener('input', () => {
  query = search.value;
  filter();
});

view('multi').columns = columns;
view('multi').rows = stations.slice(0, 24);
view('headless').columns = [stationColumns[0]!, stationColumns[1]!];
view('headless').rows = stations.slice(0, 12);
view('tiles').columns = [stationColumns[0]!, stationColumns[1]!, statusColumn];
view('tiles').rows = stations;

for (const id of ['rows', 'flat', 'rtl', 'wide', 'loading-rows']) {
  view(id).columns = columns;
  view(id).rows = stations;
}

// Manual sorting: the owner reorders with the exported helper.
const manual = view('manual');
manual.columns = columns;
manual.rows = sortDataViewRows(stations, { column: 'name', direction: 'ascending' }, columns);
manual.addEventListener('tp-sort-change', (event) => {
  const sort = (event as CustomEvent<{ value: unknown }>).detail.value as Parameters<
    typeof sortDataViewRows
  >[1];
  manual.rows = sortDataViewRows(stations, sort, columns);
});

// A controlled owner that refuses offline stations.
const controlled = view('controlled');
controlled.columns = columns;
controlled.rows = stations;
controlled.addEventListener('tp-value-change', (event) => {
  const detail = (
    event as CustomEvent<{ value: string[]; metadata?: { rows?: { status: string }[] } }>
  ).detail;
  if (detail.metadata?.rows?.some((row) => row.status === 'offline')) event.preventDefault();
  else controlled.value = detail.value;
});

// Cells with links: a press on a link follows it and does not select.
const links = view('links');
links.columns = [
  ...stationColumns.slice(0, 2),
  {
    id: 'open',
    header: 'Open',
    width: '8rem',
    render: (row: { id: string }) => html`<a href=${`#${row.id}`}>Details</a>`,
  },
];
links.rows = stations.slice(0, 12);
links.selectionMode = 'single';

for (const id of ['loading', 'empty', 'empty-slot', 'error']) view(id).columns = stationColumns;

const events: { id: string; type: string; reason?: string; value: unknown }[] = [];
for (const type of ['tp-value-change', 'tp-sort-change', 'tp-row-activate', 'tp-retry'])
  document.addEventListener(type, (event) => {
    const detail = ((event as CustomEvent).detail ?? {}) as Record<string, unknown>;
    events.push({
      id: (event.target as HTMLElement).id,
      type,
      reason: detail.reason as string | undefined,
      value: detail.value ?? detail.rowId ?? null,
    });
  });

Object.assign(window, {
  dataViewAPI: {
    events,
    clear: () => events.splice(0),
    get: view,
    /** Sets the telemetry search, as typing would. */
    search: (value: string) => {
      query = value;
      search.value = value;
      filter();
    },
    /** Mounted rows and the scroll state of a view. */
    window: (id: string) => {
      const root = view(id).shadowRoot!;
      const viewport = root.querySelector('.viewport') as HTMLElement;
      return {
        mounted: root.querySelectorAll('.body [role="row"]').length,
        scrollTop: Math.round(viewport.scrollTop),
        maxScroll: viewport.scrollHeight - viewport.clientHeight,
        active: (root.activeElement as HTMLElement | null)?.dataset ?? null,
      };
    },
    /** The ids of the mounted rows, in order. */
    mountedIds: (id: string) =>
      [...view(id).shadowRoot!.querySelectorAll<HTMLElement>('.body [role="row"]')].map(
        (row) => row.dataset.row,
      ),
  },
});
document.documentElement.dataset.fixtureReady = '';
