import '../../../../src/register.ts';
import type { TpAutocomplete } from '../../../../src/components/autocomplete/index.js';
import type { SearchSource } from '../../../../src/foundation/search/index.js';
import { createIndexSource } from '../../../../src/foundation/search/index.js';

const cities = [
  'Amsterdam',
  'Athens',
  'Barcelona',
  'Berlin',
  'Bruges',
  'Brussels',
  'Budapest',
  'Copenhagen',
  'Dublin',
  'Edinburgh',
  'Florence',
  'Lisbon',
  'London',
  'Madrid',
  'Milan',
  'Munich',
  'Paris',
  'Prague',
  'Rome',
  'Stockholm',
  'Vienna',
  'Warsaw',
  'Zurich',
];
const index = createIndexSource(cities);

const requests: string[] = [];
const aborted: string[] = [];
let fail = false;
let latency = 400;
/** A simulated server: ranked by the built-in index, 400ms latency by default, abortable. */
const server: SearchSource<string> = {
  search(query, { signal }) {
    requests.push(query);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (fail) reject(new Error('Service unavailable'));
        else resolve(index.search(query, { signal, limit: 8, locale: undefined }));
      }, latency);
      signal.addEventListener('abort', () => {
        aborted.push(query);
        clearTimeout(timer);
      });
    });
  },
};
const element = document.querySelector<TpAutocomplete>('#server')!;
element.source = server;

const log: { id: string; type: string; detail: unknown }[] = [];
for (const type of ['tp-value-change', 'tp-open-change', 'tp-search-status', 'tp-search-error'])
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    const detail = (event as CustomEvent).detail as Record<string, unknown> | undefined;
    log.push({
      id: target.id,
      type,
      detail:
        type === 'tp-value-change'
          ? { value: detail?.value, reason: detail?.reason }
          : type === 'tp-open-change'
            ? { open: detail?.open, reason: detail?.reason }
            : detail,
    });
  });
let submitted: string | null = null;
document.querySelector('form')!.addEventListener('submit', (event) => {
  event.preventDefault();
  submitted = String(new FormData(event.target as HTMLFormElement).get('fruit'));
});

Object.assign(window, {
  fixture: {
    log,
    requests,
    aborted,
    submitted: () => submitted,
    setFail: (value: boolean) => (fail = value),
    setLatency: (value: number) => (latency = value),
  },
});
