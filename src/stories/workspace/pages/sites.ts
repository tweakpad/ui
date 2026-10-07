import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { openFreeMapEngine, setupMapExample } from '../../map-example.js';
import { dateText, type WorkspaceHost } from '../host.js';
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

/**
 * The map engine follows the element's lifetime: it attaches after the page renders and is
 * released when the page is left. A stable callback keeps Lit from re-running it every render.
 */
let release: (() => void) | undefined;
function attachMap(node: Element | undefined) {
  release?.();
  release = undefined;
  if (!node) return;
  queueMicrotask(() => {
    if (node.isConnected && !release)
      release = setupMapExample(node as HTMLElement, openFreeMapEngine());
  });
}

/** Pilot rollout across five launch cities: summary metrics, the site map and a synced list. */
export function renderSites(host: WorkspaceHost): TemplateResult {
  const live = sites.filter((site) => site.status === 'Live').length;
  const teams = sites.reduce((total, site) => total + site.teams, 0);
  return html`<div class="workspace-stack-lg">
    <div class="sites-metrics">
      <tp-card size="sm"
        ><span slot="description">Sites live</span
        ><strong slot="header" class="sites-metric">${live} / ${sites.length}</strong
        ><tp-badge slot="action" variant="outline">+1 this week</tp-badge></tp-card
      >
      <tp-card size="sm"
        ><span slot="description">Pilot teams onboarded</span
        ><strong slot="header" class="sites-metric">${teams}</strong
        ><tp-badge slot="action" variant="outline">8 active today</tp-badge></tp-card
      >
      <tp-card size="sm"
        ><span slot="description">Pilot satisfaction</span
        ><strong slot="header" class="sites-metric">+42</strong
        ><tp-badge slot="action" variant="outline">NPS</tp-badge></tp-card
      >
    </div>
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
      <tp-card
        ><h2 slot="header">Launch cities</h2>
        <p slot="description">Rollout order and go-live dates</p>
        <tp-list-item-group aria-label="Launch cities" data-map-list>
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
        </tp-list-item-group>
        <tp-button slot="footer" variant="outline" @click=${() => host.go('activity')}
          >Message pilot leads</tp-button
        >
      </tp-card>
    </div>
  </div>`;
}
