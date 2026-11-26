// Chart verification: the built-in marks in the compositions the docs and stories show.
import '../../../../src/register.ts';
import type { TpChart } from '../../../../src/components/chart/chart.js';

const chart = (id: string) => document.getElementById(id) as TpChart;
const hour = 3_600_000;
const day = Date.UTC(2026, 10, 25);

// Latency percentiles every 15 minutes, flat with a few spikes.
const spikes: Record<number, number> = { 21: 0.18, 38: 0.1, 54: 0.13, 59: 0.35 };
const ms = (value: number) => `${value} ms`;
chart('latency').series = {
  p50: { label: 'P50', format: ms },
  p90: { label: 'P90', format: ms },
  p99: { label: 'P99', format: ms },
  p999: { label: 'P999', format: ms },
};
chart('latency').data = Array.from({ length: 96 }, (_, i) => {
  const spike = spikes[i] ?? 0;
  return {
    time: day + i * (hour / 4),
    p50: +(spike * 0.5).toFixed(3),
    p90: +(spike * 0.85).toFixed(3),
    p99: +(spike * 0.95).toFixed(3),
    p999: spike,
  };
});
chart('latency').legendOptions = { placement: 'top', value: 'latest' };

// Deployments per hour.
const deployments: Record<number, number> = { 5: 1, 9: 1, 13: 1, 14: 26 };
chart('deployments').series = { ef6fbbd2: { label: 'ef6fbbd2' } };
chart('deployments').data = Array.from({ length: 24 }, (_, i) => ({
  time: day + i * hour,
  ef6fbbd2: deployments[i] ?? 0,
}));
chart('deployments').legendOptions = { placement: 'top', value: 'sum' };

// Requests by status class per hour, stacked.
const wave = (i: number, phase: number, size: number) =>
  Math.max(0, Math.round(size * Math.abs(Math.sin(i / 3 + phase)) * (i % 5 === 0 ? 0.3 : 1)));
chart('requests').series = {
  '1xx': { label: '1xx' },
  '2xx': { label: '2xx' },
  '3xx': { label: '3xx' },
  '4xx': { label: '4xx' },
  '5xx': { label: '5xx' },
};
chart('requests').data = Array.from({ length: 24 }, (_, i) => ({
  time: day + i * hour,
  '1xx': 0,
  '2xx': wave(i, 0.4, i > 12 ? 140 : 20),
  '3xx': wave(i, 1.1, 40),
  '4xx': wave(i, 2.2, i === 3 || i === 10 ? 170 : 50),
  '5xx': i % 7 === 3 ? 3 : 0,
}));
chart('requests').legendOptions = { placement: 'top', value: 'sum' };

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const signed = [42, -18, 26, -34, 51, -9, 38, 62];
chart('change').series = {
  change: { label: 'Change', color: 'var(--tp-chart-3)', negativeColor: 'var(--tp-destructive)' },
};
chart('change').data = months.map((month, i) => ({ month, change: signed[i] }));

chart('signups').series = { signups: { label: 'Signups', color: 'var(--tp-chart-1)' } };
chart('signups').data = months.map((month, i) => ({
  month,
  signups: [48, 62, 44, 76, 64, 84, 78, 102][i],
}));

chart('cash').series = { cash: { label: 'Net cash flow', color: 'var(--tp-chart-1)' } };
chart('cash').data = months.map((month, i) => ({ month, cash: signed[i] }));

// One series needs no legend.
for (const id of ['change', 'signups', 'cash']) chart(id).legendOptions = false;

for (const id of ['loading-bar', 'loading-line']) {
  chart(id).series = { value: { label: 'Value' } };
  chart(id).style.aspectRatio = '';
}

// Sales by category: one record, one slice per series.
chart('sales').series = {
  electronics: { label: 'Electronics' },
  clothing: { label: 'Clothing' },
  home: { label: 'Home & garden' },
  books: { label: 'Books' },
  toys: { label: 'Toys' },
};
chart('sales').data = [
  { electronics: 45_600, clothing: 28_800, home: 21_600, books: 13_200, toys: 10_800 },
];
chart('sales').legendOptions = { placement: 'end', title: 'Sales by category', value: 'sum' };

// Team skills: one spoke per skill, one shape per team.
chart('skills').series = { platform: { label: 'Platform' }, product: { label: 'Product' } };
chart('skills').data = [
  { skill: 'Reliability', platform: 92, product: 54 },
  { skill: 'Design', platform: 40, product: 86 },
  { skill: 'Research', platform: 35, product: 78 },
  { skill: 'Security', platform: 84, product: 46 },
  { skill: 'Data', platform: 70, product: 62 },
  { skill: 'Delivery', platform: 76, product: 72 },
];

const gb = (value: number) => `${value} GB`;
chart('storage').series = {
  video: { label: 'Video', format: gb },
  photos: { label: 'Photos', format: gb },
  documents: { label: 'Documents', format: gb },
  other: { label: 'Other', format: gb },
};
chart('storage').data = [{ video: 256, photos: 128, documents: 76, other: 52 }];

// Sessions by campaign, with a meter beside each in the legend.
const sessions = { search: 4_890, social: 3_420, email: 2_610, referral: 1_927 };
const total = Object.values(sessions).reduce((all, value) => all + value, 0);
chart('campaigns').series = {
  search: { label: 'Search' },
  social: { label: 'Social' },
  email: { label: 'Email' },
  referral: { label: 'Referral' },
};
chart('campaigns').data = [sessions];
chart('campaigns').yDomain = [0, 5_000];
chart('campaigns').legendOptions = {
  placement: 'end',
  title: 'Campaign performance',
  value: 'sum',
  formatter: (label, item) => {
    const value = item.value as number;
    const entry = document.createElement('span');
    entry.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:4px 12px;flex:1';
    const name = document.createElement('span');
    name.textContent = label;
    const share = document.createElement('span');
    share.style.color = 'var(--tp-muted-foreground)';
    share.textContent = `${value.toLocaleString('en')} · ${Math.round((value / total) * 100)}%`;
    const meter = document.createElement('tp-progress') as HTMLElement & { value: number };
    meter.value = Math.round((value / total) * 100);
    meter.setAttribute('label', `${label} share`);
    meter.style.gridColumn = '1 / -1';
    // The meter fills in its series' color.
    meter.style.setProperty('--tp-primary', String(item.color));
    entry.append(name, share, meter);
    return entry;
  },
};

// Activity goals in percent, labeled on the rings.
chart('activity').series = {
  move: { label: 'Move', format: (value) => `${value}%` },
  exercise: { label: 'Exercise', format: (value) => `${value}%` },
  stand: { label: 'Stand', format: (value) => `${value}%` },
};
chart('activity').data = [{ move: 84, exercise: 62, stand: 45 }];
chart('activity').legendOptions = { placement: 'inline' };

// Error rate per region, each line labeled where it ends.
chart('errors').series = {
  us: { label: 'US', format: (value) => `${value}%` },
  eu: { label: 'EU', format: (value) => `${value}%` },
  apac: { label: 'APAC', format: (value) => `${value}%` },
};
chart('errors').data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
  day,
  us: +(2.4 - i * 0.22).toFixed(2),
  eu: +(2.1 - i * 0.24).toFixed(2),
  apac: +(3.1 - i * 0.2).toFixed(2),
}));
chart('errors').legendOptions = { placement: 'inline', value: 'latest' };

for (const id of ['loading-pie', 'loading-radial'])
  chart(id).series = { value: { label: 'Value' } };

document.documentElement.dataset.ready = '';
