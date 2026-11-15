// Browser fixture for tp-heatmap, driven only through Chrome DevTools MCP (see README.md).
const built = new URLSearchParams(location.search).has('built');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');

type Heatmap = HTMLElement & { data: unknown[]; value: unknown; summary: unknown };

/** Deterministic values, so screenshots compare across runs. */
function values(count: number, seed: number): number[] {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return Math.round((state / 2147483648) ** 2 * 8);
  });
}
const day = (offset: number) =>
  new Date(Date.UTC(2026, 10, 13) - offset * 864e5).toISOString().slice(0, 10);
const year = values(400, 7).map((value, offset) => ({ key: day(offset), value }));
year[3] = { ...year[3]!, hint: 'Release Atlas shipped' };

const heatmap = (id: string) => document.getElementById(id) as Heatmap;
for (const id of [
  'year',
  'separated',
  'separated-trim',
  'separated-scroll',
  'separated-vertical',
  'scroll',
  'scroll-vertical',
  'trim',
  'range',
  'rtl',
])
  heatmap(id).data = year;
heatmap('vertical').data = values(365, 3).map((value, offset) => ({
  key: new Date(Date.UTC(2026, 0, 1) + offset * 864e5).toISOString().slice(0, 10),
  value,
}));
heatmap('hours').data = values(13 * 24, 11).map((value, offset) => ({
  key: new Date(Date.UTC(2026, 10, 1) + offset * 36e5).toISOString().slice(0, 13),
  value,
}));
heatmap('square').data = values(256, 5).map((value, key) => ({ key, value }));

const events: { id: string; type: string; detail: unknown }[] = [];
for (const type of [
  'tp-value-change',
  'tp-value-commit',
  'tp-inspection-change',
  'tp-cell-activate',
])
  document.addEventListener(type, (event) => {
    const detail = (event as CustomEvent).detail as Record<string, unknown>;
    events.push({
      id: (event.target as HTMLElement).id,
      type,
      detail:
        'cell' in detail ? ((detail.cell as { id?: string } | null)?.id ?? null) : detail.value,
    });
  });

Object.assign(window, {
  heatmapAPI: {
    events,
    clear: () => events.splice(0),
    get: heatmap,
    /** Where a scrolling heatmap's viewport rests: its offsets and the furthest it can go. */
    scroll: (id: string) => {
      const viewport = (
        heatmap(id).shadowRoot!.querySelector('.scroller') as HTMLElement & {
          viewportElement: HTMLElement;
        }
      ).viewportElement;
      return {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        maxLeft: viewport.scrollWidth - viewport.clientWidth,
        maxTop: viewport.scrollHeight - viewport.clientHeight,
      };
    },
    /** Appends a day after the range end, as live data arriving. */
    append: (id: string) => {
      const target = heatmap(id);
      target.data = [...target.data, { key: '2026-11-14', value: 8 }];
      target.setAttribute('today', '2026-11-14');
    },
  },
});
document.documentElement.dataset.fixtureReady = '';
