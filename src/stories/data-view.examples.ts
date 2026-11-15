import { html } from 'lit';
import type {
  DataViewColumn,
  DataViewMiddleware,
  DataViewPartContracts,
} from '../components/data-view/index.js';
import { chevronRightIcon } from '../icons/chevron-right.js';

/** A weather field station, as an application might load it. */
export interface FieldStation {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly sensors: number;
  /** Battery charge, 0–100. */
  readonly battery: number;
  /** Air temperature of the last reading, °C. */
  readonly temperature: number;
  readonly lastReading: Date;
  readonly status: 'online' | 'degraded' | 'offline';
}

const places = [
  'Alder Flats',
  'Brindle Cove',
  'Cinder Ridge',
  'Dovetail Pass',
  'Ember Hollow',
  'Fennick Shoal',
  'Gannet Point',
  'Heron Moor',
  'Isling Fork',
  'Juniper Rise',
  'Kestrel Bluff',
  'Larkspur Basin',
];
const regions = ['Coast', 'Highlands', 'Valley', 'Islands', 'Plains'];
const statuses: FieldStation['status'][] = ['online', 'online', 'online', 'degraded', 'offline'];

/** `count` deterministic stations, so every load shows the same rows. */
export function fieldStations(count = 24): FieldStation[] {
  let seed = 11;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const start = Date.UTC(2026, 10, 15, 9, 0);
  return Array.from({ length: count }, (_, index) => {
    const place = places[index % places.length]!;
    const series = Math.floor(index / places.length) + 1;
    return {
      id: `st-${String(index + 1).padStart(4, '0')}`,
      name: series > 1 ? `${place} ${series}` : place,
      region: regions[Math.floor(random() * regions.length)]!,
      sensors: 3 + Math.floor(random() * 10),
      battery: Math.round(random() * 100),
      temperature: Math.round((random() * 30 - 6) * 10) / 10,
      lastReading: new Date(start - Math.floor(random() * 72 * 60) * 60_000),
      status: statuses[Math.floor(random() * statuses.length)]!,
    };
  });
}

const time = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** The station columns: plain text, numbers aligned at the end, a formatted date. */
export const stationColumns: DataViewColumn<FieldStation>[] = [
  { id: 'name', header: 'Station', sortable: true, rowHeader: true, width: 'minmax(10rem, 2fr)' },
  { id: 'region', header: 'Region', sortable: true },
  { id: 'sensors', header: 'Sensors', sortable: true, align: 'end', width: '6rem' },
  {
    id: 'battery',
    header: 'Battery',
    sortable: true,
    align: 'end',
    width: '6rem',
    format: (value) => `${value}%`,
  },
  {
    id: 'lastReading',
    header: 'Last reading',
    sortable: true,
    width: 'minmax(9rem, 1fr)',
    format: (value) => time.format(value as Date),
  },
];

const statusVariant = { online: 'success', degraded: 'warning', offline: 'destructive' } as const;

/** A status column rendered as a Badge: the renderer contract. */
export const statusColumn: DataViewColumn<FieldStation> = {
  id: 'status',
  header: 'Status',
  sortable: true,
  width: '7rem',
  render: (row) => html`<tp-badge variant=${statusVariant[row.status]}>${row.status}</tp-badge>`,
};

/** A station with its latest readings: many columns, wider than most views. */
export interface StationTelemetry extends FieldStation {
  /** Relative humidity, %. */
  readonly humidity: number;
  /** Wind speed, km/h. */
  readonly wind: number;
  /** Air pressure, hPa. */
  readonly pressure: number;
  /** Rain in the last 24 hours, mm. */
  readonly rainfall: number;
  /** Days since the last restart. */
  readonly uptime: number;
  readonly firmware: string;
}

/** `count` stations with deterministic readings. */
export function stationTelemetry(count = 40): StationTelemetry[] {
  return fieldStations(count).map((station, index) => ({
    ...station,
    humidity: 35 + ((index * 17) % 60),
    wind: Math.round((((index * 7) % 45) + 2) * 10) / 10,
    pressure: 990 + ((index * 13) % 40),
    rainfall: Math.round(((index * 11) % 38) * 10) / 10,
    uptime: (index * 23) % 180,
    firmware: `4.${(index * 3) % 9}.${(index * 5) % 12}`,
  }));
}

/** Units shown in the headers by the units layer. */
export const telemetryUnits: Readonly<Record<string, string>> = {
  temperature: '°C',
  humidity: '%',
  wind: 'km/h',
  pressure: 'hPa',
  rainfall: 'mm',
  uptime: 'd',
};

const dotVariant = { online: 'success', degraded: 'warning', offline: 'destructive' } as const;
const metric = (id: keyof StationTelemetry, header: string): DataViewColumn<StationTelemetry> => ({
  id,
  header,
  sortable: true,
  align: 'end',
  width: '9.5rem',
});

/** Fourteen columns: the station and its actions pinned, the readings scrolling between them. */
export const telemetryColumns: DataViewColumn<StationTelemetry>[] = [
  {
    id: 'name',
    header: 'Station',
    sortable: true,
    rowHeader: true,
    width: '13rem',
    render: (row, cell) =>
      html`<tp-status-dot variant=${dotVariant[row.status]} label=${row.status}></tp-status-dot>
        <span>${cell.renderText()}</span>`,
  },
  { id: 'region', header: 'Region', sortable: true, width: '8rem' },
  { ...metric('sensors', 'Sensors'), width: '6rem' },
  {
    id: 'battery',
    header: 'Battery',
    sortable: true,
    width: '9rem',
    render: (row) =>
      html`<tp-progress
          .value=${row.battery}
          label=${`Battery of ${row.name}`}
          style="flex: 1 1 0; min-inline-size: 0"
        ></tp-progress
        ><span>${row.battery}%</span>`,
  },
  {
    ...metric('temperature', 'Temperature'),
    width: '11rem',
    format: (value) => (value as number).toFixed(1),
  },
  metric('humidity', 'Humidity'),
  { ...metric('wind', 'Wind'), format: (value) => (value as number).toFixed(1) },
  metric('pressure', 'Pressure'),
  { ...metric('rainfall', 'Rainfall'), format: (value) => (value as number).toFixed(1) },
  metric('uptime', 'Uptime'),
  { id: 'firmware', header: 'Firmware', width: '7rem' },
  {
    id: 'lastReading',
    header: 'Last reading',
    sortable: true,
    width: '10rem',
    format: (value) => time.format(value as Date),
  },
  statusColumn as unknown as DataViewColumn<StationTelemetry>,
  {
    id: 'open',
    header: 'Open',
    width: '4.5rem',
    align: 'center',
    render: (row) =>
      html`<tp-button
        variant="ghost"
        size="icon-sm"
        aria-label=${`Open ${row.name}`}
        data-open=${row.id}
        ><tp-icon slot="icon-start" .icon=${chevronRightIcon}></tp-icon
      ></tp-button>`,
  },
];

/**
 * The layers of the telemetry view, outermost first: units in the headers, the search query
 * marked in plain text cells, and an empty state that names the query and clears it.
 */
export function telemetryMiddleware(search: {
  query: () => string;
  clear: () => void;
}): DataViewMiddleware<StationTelemetry>[] {
  return [
    {
      name: 'units',
      columnHeader: (header, next) => {
        const unit = telemetryUnits[header.column.id];
        if (!unit) return next();
        // The header keeps its sort indicator and action; only the text gains the unit.
        return html`<span>${header.column.header} (${unit})</span>${header.sortIndicator()}${
            header.action
          }`;
      },
    },
    {
      name: 'search',
      css: 'mark { background: var(--tp-primary-subtle); color: inherit; border-radius: var(--tp-radius-sm); }',
      // The query is marked in every cell's text, including the Station renderer's.
      text: (cell, next) => {
        const query = search.query().trim().toLowerCase();
        const at = query ? cell.text.toLowerCase().indexOf(query) : -1;
        if (at < 0) return next();
        const end = at + query.length;
        return html`${cell.text.slice(0, at)}<mark>${cell.text.slice(at, end)}</mark>${cell.text.slice(end)}`;
      },
      empty: (state, next) => {
        const query = search.query().trim();
        if (!query) return next();
        return html`<tp-empty-state
          .title=${'No stations match'}
          .description=${`Nothing matches “${query}”.`}
          ><tp-button slot="actions" variant="outline" size="sm" @click=${search.clear}
            >Clear search</tp-button
          ></tp-empty-state
        >`;
      },
    },
  ];
}

/** Part contracts of the telemetry view: offline rows recede, a low battery stands out, firmware is mono. */
export const telemetryPartContracts: DataViewPartContracts<StationTelemetry> = {
  'data-view-row': {
    styleHook: (row) =>
      row.row.status === 'offline' ? { color: 'var(--tp-muted-foreground)' } : {},
  },
  'data-view-cell': {
    styleHook: (cell) =>
      cell.column.id === 'battery' && cell.row.battery < 15
        ? { color: 'var(--tp-destructive-subtle-foreground)' }
        : cell.column.id === 'firmware'
          ? { 'font-family': 'var(--tp-font-mono)' }
          : {},
  },
};
