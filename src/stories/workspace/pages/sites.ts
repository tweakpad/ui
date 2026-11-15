import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpMap } from '../../../components/map/index.js';
import {
  createPlotStream,
  type PlotAxis,
  type PlotLegend,
  type PlotSeries,
  type PlotStream,
} from '../../../widgets/plot/index.js';
import { openFreeMapEngine, setupMapExample } from '../../map-example.js';
import { dateText, type PageView, type WorkspaceHost } from '../host.js';
import { initials } from '../data.js';
import './sites.css';

interface PilotSite {
  value: string;
  city: string;
  partner: string;
  latitude: number;
  longitude: number;
  status: 'Live' | 'Onboarding' | 'Scheduled';
  /** Launch or go-live date. */
  date: string;
  teams: number;
  leads: readonly string[];
  color: string;
  /** Typical concurrent sessions, the level the live readings move around. */
  sessions: number;
}

const sites: readonly PilotSite[] = [
  {
    value: 'lisbon',
    city: 'Lisbon',
    partner: 'Studio North HQ',
    latitude: 38.7223,
    longitude: -9.1393,
    status: 'Live',
    date: '2026-09-28',
    teams: 6,
    leads: ['Alex Morgan', 'Sam Rivera'],
    color: 'var(--tp-chart-1)',
    sessions: 34,
  },
  {
    value: 'madrid',
    city: 'Madrid',
    partner: 'Caravel Logistics',
    latitude: 40.4168,
    longitude: -3.7038,
    status: 'Live',
    date: '2026-10-02',
    teams: 4,
    leads: ['Sam Rivera'],
    color: 'var(--tp-chart-2)',
    sessions: 26,
  },
  {
    value: 'paris',
    city: 'Paris',
    partner: 'Maison Clément',
    latitude: 48.8566,
    longitude: 2.3522,
    status: 'Onboarding',
    date: '2026-10-09',
    teams: 3,
    leads: ['Jamie Chen', 'Taylor Kim'],
    color: 'var(--tp-chart-3)',
    sessions: 18,
  },
  {
    value: 'amsterdam',
    city: 'Amsterdam',
    partner: 'Grachtwerk Studio',
    latitude: 52.3676,
    longitude: 4.9041,
    status: 'Onboarding',
    date: '2026-10-12',
    teams: 2,
    leads: ['Taylor Kim'],
    color: 'var(--tp-chart-4)',
    sessions: 12,
  },
  {
    value: 'berlin',
    city: 'Berlin',
    partner: 'Kanal Systems',
    latitude: 52.52,
    longitude: 13.405,
    status: 'Scheduled',
    date: '2026-10-16',
    teams: 5,
    leads: ['Alex Morgan', 'Jamie Chen'],
    color: 'var(--tp-chart-5)',
    sessions: 6,
  },
];
/** The pilot region as south,west,north,east. */
const bounds = '37.4,-10.6,54,14.9';
const statusVariant = (status: PilotSite['status']) =>
  status === 'Live' ? 'default' : status === 'Onboarding' ? 'secondary' : 'outline';

const pin = html`<svg
  viewBox="0 0 32 40"
  width="32"
  height="40"
  aria-hidden="true"
  focusable="false"
>
  <path
    d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 39 16 39s15-12.1 15-23.2C31 7.6 24.3 1 16 1z"
    fill="currentColor"
    stroke="white"
    stroke-width="2"
  />
  <circle cx="16" cy="15.5" r="5.5" fill="white" />
</svg>`;

/** The readings cover the last day; a new reading arrives every minute. */
const day = 24 * 60 * 60_000;
const historyStep = 10 * 60_000;
const readingInterval = 60_000;
/** The cities the readings follow: the live sites and the first one onboarding. */
const followed = sites.filter((site) => site.status !== 'Scheduled').slice(0, 3);
/** A small seeded generator, so every visit draws the same pilot day. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
/** How busy a city is at a moment: quiet at night, busiest in the early afternoon. */
const busy = (time: number) => {
  const hour = new Date(time).getHours() + new Date(time).getMinutes() / 60;
  return 0.15 + 0.85 * Math.max(0, Math.sin(((hour - 7) / 15) * Math.PI)) ** 1.5;
};
/** Sessions per city over the last day: one bounded stream shared by every visit to the page. */
let readings: PlotStream | undefined;
function startReadings() {
  const random = seeded(2026);
  const stream = createPlotStream({
    seriesIds: followed.map((site) => site.value),
    capacity: day / historyStep + 64,
  });
  const sample = (time: number) =>
    stream.appendBatch(
      followed.map((site) => ({
        series: site.value,
        points: [
          [
            time,
            Math.round(site.sessions * 1.4 * busy(time) * (0.96 + random() * 0.08) * 10) / 10,
          ] as const,
        ],
      })),
    );
  const now = Date.now();
  for (let time = now - day; time < now; time += historyStep) sample(time);
  sample(now);
  const timer = setInterval(() => sample(Date.now()), readingInterval);
  readings = stream;
  return () => {
    clearInterval(timer);
    stream.dispose();
    readings = undefined;
  };
}
const readingSeries: PlotSeries[] = followed.map((site) => ({
  id: site.value,
  label: site.city,
  color: site.color,
  fill: { baseline: 0, gradient: true },
  marker: 'latest',
  format: (value) => (value === null ? '' : `${Math.round(value)} sessions`),
}));
const readingLegend: PlotLegend = { placement: 'bottom' };
const hour = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const timeAxis: PlotAxis = { type: 'time', tickCount: 6, format: (value) => hour.format(value) };
const readingAxis: PlotAxis = { tickCount: 3 };
/** The plot's own title repeats the Card header, so the Card names it. */
const plotPresentation = { 'plot-label': { styleHook: { display: 'none' } } };

/**
 * The map engine follows the element's lifetime: it attaches after the page renders and is
 * released when the page is left. A stable callback keeps Lit from re-running it every render.
 * The map's selection also chooses the focused site card.
 */
let release: (() => void) | undefined;
let onFocusSite: ((value: string) => void) | undefined;
function attachMap(node: Element | undefined) {
  release?.();
  release = undefined;
  if (!node) return;
  queueMicrotask(() => {
    if (!node.isConnected || release) return;
    const cleanup = setupMapExample(node as HTMLElement, openFreeMapEngine());
    const map = node.querySelector<TpMap>('tp-map');
    const unsubscribe = map?.subscribe(
      (state) => state.selectedPin,
      (value) => {
        if (value) onFocusSite?.(value);
      },
    );
    release = () => {
      unsubscribe?.();
      cleanup();
    };
  });
}

/** Selects a site's pin, or reveals it again when it is already selected. */
function showOnMap(host: WorkspaceHost, value: string) {
  const map = host.querySelector<TpMap>('.sites-map');
  if (!map) return;
  const request = map.selectedPin === value ? map.revealPin(value) : map.selectPin(value);
  void request.catch(() => undefined);
}

/** The site chosen on the map or in the list. */
function siteCard(host: WorkspaceHost, site: PilotSite) {
  return html`<tp-card
    ><h2 slot="header">${site.city}</h2>
    <p slot="description">${site.partner}</p>
    <tp-badge slot="action" .variant=${statusVariant(site.status)}>${site.status}</tp-badge>
    <tp-list aria-label=${`${site.city} rollout`}>
      <tp-list-item size="sm"
        >Go-live<span slot="actions" class="workspace-muted"
          >${dateText(site.date)}</span
        ></tp-list-item
      >
      <tp-list-item size="sm"
        >Pilot teams<span slot="actions" class="workspace-muted">${site.teams}</span></tp-list-item
      >
      <tp-list-item size="sm"
        >Pilot leads<tp-avatar-group slot="actions"
          >${site.leads.map(
            (name) =>
              html`<tp-avatar size="sm" .fallback=${initials(name)} .alt=${name}></tp-avatar>`,
          )}</tp-avatar-group
        ></tp-list-item
      >
    </tp-list>
    <tp-button slot="footer" variant="outline" @click=${() => showOnMap(host, site.value)}
      >Show on the map</tp-button
    ></tp-card
  >`;
}

/** Pilot rollout across five launch cities: summary metrics, the site map and a synced list. */
export function renderSites(host: WorkspaceHost): PageView {
  const live = sites.filter((site) => site.status === 'Live').length;
  const teams = sites.reduce((total, site) => total + site.teams, 0);
  const focused = host.view('sites.focus', sites[0]!.value);
  onFocusSite = (value) => {
    if (value !== host.view('sites.focus', focused)) host.setView('sites.focus', value);
  };
  host.retain('sites.readings', startReadings);
  const site = sites.find((entry) => entry.value === focused) ?? sites[0]!;
  const metric = (label: string, value: unknown, note: string) =>
    html`<tp-card size="sm"
      ><span slot="description">${label}</span
      ><strong slot="header" class="sites-metric">${value}</strong
      ><tp-badge slot="action" variant="outline">${note}</tp-badge></tp-card
    >`;
  const body = html`<div class="workspace-stack-lg">
    <div class="sites-metrics">
      ${metric(
        'Sessions this week',
        html`<tp-text-transform preset="compact" decimals="1" value="48215"></tp-text-transform>`,
        '+9% on last week',
      )}
      ${metric('Sites live', `${live} / ${sites.length}`, '+1 this week')}
      ${metric('Pilot teams onboarded', teams, '8 active today')}
      ${metric('Pilot satisfaction', '+42', 'NPS')}
    </div>
    <tp-card
      ><h2 slot="header">Sessions by city</h2>
      <p slot="description">Concurrent sessions over the last 24 hours.</p>
      <tp-badge slot="action" variant="outline">Updated every minute</tp-badge>
      <tp-plot
        class="sites-plot"
        label="Sessions by city"
        description="Concurrent sessions in the live and onboarding pilot cities over the last 24 hours."
        mode="scroll"
        window=${day}
        y-domain="0 60"
        .series=${readingSeries}
        .stream=${readings}
        interaction="inspect"
        crosshair
        .legend=${readingLegend}
        .xAxis=${timeAxis}
        .yAxis=${readingAxis}
        .partPresentation=${plotPresentation}
      ></tp-plot
    ></tp-card>
    <div class="sites-layout" ${ref(attachMap)}>
      <tp-card class="sites-map-card"
        ><h2 slot="header">Pilot map</h2>
        <p slot="description">Select a city to see its rollout and pilot leads</p>
        <tp-map
          class="sites-map"
          label="Pilot sites"
          default-bounds=${bounds}
          reveal="always"
          reveal-zoom="10"
          cooperative-gestures
          controls="zoom-in zoom-out reset fit-pins"
          >${sites.map(
            (site) =>
              html`<tp-map-pin
                .value=${site.value}
                .latitude=${site.latitude}
                .longitude=${site.longitude}
                .label=${`${site.city} · ${site.status}`}
                style=${`color: ${site.color}`}
                >${pin}
                <tp-map-overlay>
                  <span slot="title">${site.city}</span>
                  <span slot="description"
                    >${site.partner} · ${site.teams} teams · ${dateText(site.date)}</span
                  >
                  <div class="sites-overlay-meta">
                    <tp-badge .variant=${statusVariant(site.status)}>${site.status}</tp-badge>
                    <tp-avatar-group
                      >${site.leads.map(
                        (name) =>
                          html`<tp-avatar
                            size="sm"
                            .fallback=${initials(name)}
                            .alt=${name}
                          ></tp-avatar>`,
                      )}</tp-avatar-group
                    >
                  </div>
                </tp-map-overlay></tp-map-pin
              >`,
          )}</tp-map
        ></tp-card
      >
      <div class="workspace-stack">
        ${siteCard(host, site)}
        <tp-card
          ><h2 slot="header">Launch cities</h2>
          <p slot="description">Rollout order and go-live dates</p>
          <tp-list aria-label="Launch cities" data-map-list>
            ${sites.map(
              (site) =>
                html`<tp-list-item
                  .value=${site.value}
                  .description=${`${site.partner} · ${dateText(site.date)}`}
                  >${site.city}<tp-badge slot="actions" .variant=${statusVariant(site.status)}
                    >${site.status}</tp-badge
                  ><tp-button
                    slot="actions"
                    size="sm"
                    variant="ghost"
                    data-show=${site.value}
                    aria-label=${`Show ${site.city} on the map`}
                    >Show</tp-button
                  ></tp-list-item
                >`,
            )}
          </tp-list>
        </tp-card>
      </div>
    </div>
  </div>`;
  return {
    title: 'Pilot sites',
    description: 'The rollout across five launch cities.',
    actions: html`<tp-button variant="outline" size="sm" @click=${() => host.go('activity')}
      >Message pilot leads</tp-button
    >`,
    body,
  };
}
