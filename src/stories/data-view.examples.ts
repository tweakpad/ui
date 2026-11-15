import { html } from 'lit';
import type { DataViewColumn } from '../components/data-view/index.js';

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
