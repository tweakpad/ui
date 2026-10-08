import type { TpAutocomplete } from '../components/autocomplete/index.js';
import { createIndexSource, type SearchSource } from '../foundation/search/index.js';
import { interactiveMarkupExample, markupExample } from './documentation-examples.js';

const fruits = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Grape',
  'Mango',
  'Passion fruit',
  'Pineapple',
  'Raspberry',
  'Strawberry',
];
const options = (items: readonly string[], indent = '  ') =>
  items.map((item) => `${indent}<option>${item}</option>`).join('\n');

export const autocompleteDefaultSource = `<tp-field label="Fruit" description="Try a typo: rasberry, bluebery">
  <tp-autocomplete name="fruit" placeholder="Search fruit">
${options(fruits, '    ')}
  </tp-autocomplete>
</tp-field>`;

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

const serverScript = `const cities = ${JSON.stringify(cities)};
// A stand-in for a search endpoint: 500ms latency, abortable, ranked by the built-in index.
const index = createIndexSource(cities);
const autocomplete = document.querySelector('#city');
autocomplete.searchDelay = 250;
autocomplete.source = {
  search: (query, { signal, limit, locale }) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(index.search(query, { signal, limit: 8, locale })), 500);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    }),
};`;

interface Article {
  readonly title: string;
  readonly summary: string;
}
const articles: Article[] = [
  {
    title: 'Getting started',
    summary: 'Install the package, import the styles and register the elements.',
  },
  { title: 'Theming', summary: 'Tokens, color schemes and scoped themes for every component.' },
  { title: 'Forms', summary: 'Fields, validation, form association and submission.' },
  { title: 'Motion', summary: 'Reveal effects, reduced motion and scroll-linked animation.' },
  { title: 'Accessibility', summary: 'Keyboard support, focus management and screen readers.' },
  { title: 'Server rendering', summary: 'Declarative shadow DOM and hydration of components.' },
];

export const autocompleteExamples = [
  markupExample(
    'Exact matching',
    `<tp-field label="Country">
  <tp-autocomplete matching="prefix" placeholder="Type the start of a word">
${options(['United Kingdom', 'United States', 'United Arab Emirates', 'South Africa', 'South Korea', 'New Zealand'], '    ')}
  </tp-autocomplete>
</tp-field>`,
    '`matching="prefix"` suggests only items with a word starting with each typed word (`un st` finds United States), in their own order. `contains` and `exact` match anywhere or the whole text; all three ignore case and accents. The default, `fuzzy`, ranks by relevance and tolerates typos.',
  ),
  interactiveMarkupExample(
    'Server search',
    `<tp-field label="City" description="Simulated server with 500ms latency">
  <tp-autocomplete id="city" placeholder="Search cities" show-clear></tp-autocomplete>
</tp-field>`,
    (root) => {
      const index = createIndexSource(cities);
      const autocomplete = root.querySelector<TpAutocomplete>('#city')!;
      autocomplete.searchDelay = 250;
      const source: SearchSource<string> = {
        search: (query, { signal, locale }) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => resolve(index.search(query, { signal, limit: 8, locale })),
              500,
            );
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(signal.reason);
            });
          }),
      };
      autocomplete.source = source;
      return () => {
        autocomplete.source = undefined;
      };
    },
    `import { createIndexSource } from '@tweakpad/ui';\n${serverScript}`,
    'A search source supplies the suggestions: typing waits for a 250ms pause (`search-delay`), a newer query aborts the previous request, and the previous suggestions stay while the next ones load. With `createRequestSource({ url, map })` a JSON endpoint needs no code beyond the URL.',
  ),
  interactiveMarkupExample(
    'Records over several fields',
    `<tp-field label="Documentation" description="Matches titles and summaries; titles rank higher">
  <tp-autocomplete id="docs-search" placeholder="Search the docs"></tp-autocomplete>
</tp-field>`,
    (root) => {
      const autocomplete = root.querySelector<TpAutocomplete>('#docs-search')!;
      autocomplete.itemToText = (article) => (article as Article).title;
      autocomplete.source = createIndexSource(articles, {
        fields: ['title', 'summary'],
        boost: { title: 3 },
        extract: (article, field) => article[field as keyof Article],
      });
      return () => {
        autocomplete.source = undefined;
      };
    },
    `import { createIndexSource } from '@tweakpad/ui';
const articles = ${JSON.stringify(articles, null, 2)};
const autocomplete = document.querySelector('#docs-search');
autocomplete.itemToText = (article) => article.title;
autocomplete.source = createIndexSource(articles, {
  fields: ['title', 'summary'],
  boost: { title: 3 },
  extract: (article, field) => article[field],
});`,
    'The built-in index on its own, over records: `createIndexSource` searches the title and summary of each article, weighting the title three times. Any other search engine plugs in the same way, as a source returning items or hits with matched ranges.',
  ),
  markupExample(
    'Inline completion',
    `<tp-field label="Fruit">
  <tp-autocomplete completion-mode="both" auto-highlight placeholder="Type ap">
${options(fruits, '    ')}
  </tp-autocomplete>
</tp-field>`,
    '`completion-mode="both"` completes the text with the highlighted suggestion and selects the completed part, so typing continues over it; `auto-highlight` highlights the first suggestion, so Enter accepts it. Escape removes the completion.',
  ),
  markupExample(
    'Grouped suggestions',
    `<tp-field label="Ingredient">
  <tp-autocomplete placeholder="Search ingredients">
    <optgroup label="Fruit">
${options(['Apple', 'Lemon', 'Orange'], '      ')}
    </optgroup>
    <optgroup label="Herbs">
${options(['Basil', 'Mint', 'Rosemary', 'Thyme'], '      ')}
    </optgroup>
  </tp-autocomplete>
</tp-field>`,
    'Groups keep their labels while their matching suggestions are shown; groups without matches are hidden.',
  ),
  interactiveMarkupExample(
    'In a form',
    `<form id="order" style="display: grid; gap: var(--tp-space-3); max-inline-size: 20rem">
  <tp-field label="Fruit">
    <tp-autocomplete name="fruit" required submit-on-item-click placeholder="Search fruit">
${options(fruits, '      ')}
    </tp-autocomplete>
  </tp-field>
  <tp-button type="submit">Order</tp-button>
  <output id="ordered" style="color: var(--tp-muted-foreground)"></output>
</form>`,
    (root) => {
      const form = root.querySelector<HTMLFormElement>('#order')!;
      const output = root.querySelector<HTMLOutputElement>('#ordered')!;
      const submit = (event: SubmitEvent) => {
        event.preventDefault();
        output.value = `Ordered: ${String(new FormData(form).get('fruit'))}`;
      };
      form.addEventListener('submit', submit);
      return () => form.removeEventListener('submit', submit);
    },
    `const form = document.querySelector('#order');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#ordered').value = \`Ordered: \${new FormData(form).get('fruit')}\`;
});`,
    'The form receives the text. Accepting a suggestion submits (`submit-on-item-click`); Enter with nothing highlighted submits whatever was typed.',
  ),
];
