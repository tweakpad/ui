import { definePreview, setCustomElementsManifest } from '@storybook/web-components-vite';
import * as manifestArgTypes from '@storybook/web-components/entry-preview-argtypes';
import addonDocs from '@storybook/addon-docs';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import DocumentationPage from './docs-page.mdx';
import { ThemedDocsContainer } from './docs-container.mdx';
import { applyAppearance, applyDensity, applyTheme, themePreference } from './docs-theme.js';
import { manifest } from './manifest.js';
import { elementApi, elementDeclaration } from '../src/docs/api.js';
import { attributeBadge, memberDescription, rowProseHtml, signatureHtml } from './api-rows.js';

/** An object without some keys: one table has no categories, and a row without a default shows none. */
const withoutKeys = <T extends object>(value: T | undefined, keys: readonly string[]): Partial<T> =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([key]) => !keys.includes(key)),
  ) as Partial<T>;
import {
  installPreviewModules,
  mountPreview,
  type MountedPreview,
} from '../src/docs/preview-runtime.js';
import type { LibraryDoc } from '../src/stories/library-docs.js';
import '../src/styles.css';
import './docs.css';
import '../src/register.js';
import '../src/register/widgets.js';

// Controls read attribute and property descriptions, types and defaults from the Custom Elements
// Manifest (`npm run cem` runs before Storybook), so JSDoc on an element documents it once.
setCustomElementsManifest(manifest);

// The scripts of documentation previews import the library as an application does; here they
// read the repository sources, so a page shows the code of the checkout.
const icons = import.meta.glob('../src/icons/*.ts');
installPreviewModules(
  {
    '@tweakpad/ui': () => import('../src/index.js'),
    '@tweakpad/ui/carousel': () => import('../src/foundation/carousel/index.js'),
    '@tweakpad/ui/code': () => import('../src/foundation/code/index.js'),
    '@tweakpad/ui/drag-drop': () => import('../src/foundation/drag-drop/index.js'),
    '@tweakpad/ui/emoji': () => import('../src/foundation/emoji/index.js'),
    '@tweakpad/ui/color-palette': () => import('../src/foundation/color-palette/index.js'),
    '@tweakpad/ui/color-palette/collections/css-named': () =>
      import('../src/foundation/color-palette/collections/css-named/index.js'),
    '@tweakpad/ui/color-palette/collections/riso': () =>
      import('../src/foundation/color-palette/collections/riso/index.js'),
    '@tweakpad/ui/color-palette/collections/colorbrewer': () =>
      import('../src/foundation/color-palette/collections/colorbrewer/index.js'),
    '@tweakpad/ui/color-palette/collections/nippon': () =>
      import('../src/foundation/color-palette/collections/nippon/index.js'),
    '@tweakpad/ui/color-palette/collections/sanzo-wada': () =>
      import('../src/foundation/color-palette/collections/sanzo-wada/index.js'),
    '@tweakpad/ui/color-palette/collections/wes-anderson': () =>
      import('../src/foundation/color-palette/collections/wes-anderson/index.js'),
    '@tweakpad/ui/color-palette/collections/le-corbusier': () =>
      import('../src/foundation/color-palette/collections/le-corbusier/index.js'),
    '@tweakpad/ui/color-palette/collections/werner': () =>
      import('../src/foundation/color-palette/collections/werner/index.js'),
    '@tweakpad/ui/color-palette/collections/lospec': () =>
      import('../src/foundation/color-palette/collections/lospec/index.js'),
    '@tweakpad/ui/color-palette/collections/nice-color-palettes': () =>
      import('../src/foundation/color-palette/collections/nice-color-palettes/index.js'),
    '@tweakpad/ui/flow': () => import('../src/foundation/flow/index.js'),
    '@tweakpad/ui/map': () => import('../src/foundation/map/index.js'),
    '@tweakpad/ui/markdown': () => import('../src/foundation/markdown/index.js'),
    '@tweakpad/ui/media': () => import('../src/foundation/media/index.js'),
    '@tweakpad/ui/qr': () => import('../src/foundation/qr/index.js'),
    '@tweakpad/ui/text-editor': () => import('../src/foundation/text-editor/index.js'),
    '@tweakpad/ui/text-editor/adapters/tiptap': () =>
      import('../src/foundation/text-editor/adapters/tiptap/index.js'),
    '@tweakpad/ui/text-editor/adapters/lexical': () =>
      import('../src/foundation/text-editor/adapters/lexical/index.js'),
    '@tweakpad/ui/widgets': () => import('../src/widgets/index.js'),
    lit: () => import('lit'),
    '@tiptap/core': () => import('@tiptap/core'),
    '@tiptap/pm/state': () => import('@tiptap/pm/state'),
    '@tiptap/pm/history': () => import('@tiptap/pm/history'),
    '@tiptap/starter-kit': () => import('@tiptap/starter-kit'),
    '@tiptap/extension-list': () => import('@tiptap/extension-list'),
    '@tiptap/extension-table': () => import('@tiptap/extension-table'),
    '@tiptap/pm/tables': () => import('@tiptap/pm/tables'),
    lexical: () => import('lexical'),
    '@lexical/extension': () => import('@lexical/extension'),
    '@lexical/rich-text': () => import('@lexical/rich-text'),
    '@lexical/history': () => import('@lexical/history'),
    '@lexical/selection': () => import('@lexical/selection'),
    '@lexical/list': () => import('@lexical/list'),
    '@lexical/link': () => import('@lexical/link'),
    '@lexical/markdown': () => import('@lexical/markdown'),
    '@lexical/code': () => import('@lexical/code'),
    '@lexical/a11y': () => import('@lexical/a11y'),
    '@lexical/html': () => import('@lexical/html'),
    '@lexical/table': () => import('@lexical/table'),
  },
  (name) => {
    const load = icons[`../src/icons/${name}.ts`];
    return load ? load() : Promise.reject(new Error(`no icon module ${name}`));
  },
);

/** The hero mounted in each story root, so a re-render replaces it. */
const mountedHeroes = new WeakMap<Element, MountedPreview>();
/** Args compared by value: Storybook copies array and object args, so identity never matches. */
const sameArgs = (args: Record<string, unknown>, initial: Record<string, unknown>) =>
  Object.keys({ ...args, ...initial }).every(
    (key) =>
      Object.is(args[key], initial[key]) ||
      JSON.stringify(args[key]) === JSON.stringify(initial[key]),
  );

/** The inline sizing declared on the hero's root element, which places it in the preview. */
const heroRootSizing = (code: string): string =>
  (/<[\w-]+[^>]*?\sstyle="([^"]*)"/u.exec(code.trim().split('\n')[0] ?? '')?.[1] ?? '')
    .split(';')
    .filter((declaration) => /^\s*(?:min-|max-)?(?:inline-size|width)\s*:/u.test(declaration))
    .join(';');

const preview = definePreview({
  // The framework's manifest reader (Controls rows and descriptions from `custom-elements.json`)
  // is not part of its `definePreview`, so it is added here.
  addons: [addonDocs(), manifestArgTypes],
  // Every story file gets a Docs page; opt out per file with `tags: ['!autodocs']`.
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Color scheme of the Docs pages and stories; System follows the device',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    appearance: {
      description: 'Appearance of every library element: bordered (Default) or borderless (Flat)',
      toolbar: {
        title: 'Appearance',
        icon: 'contrast',
        items: [
          { value: 'default', title: 'Default' },
          { value: 'flat', title: 'Flat' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Density of every library element: Default or Compact',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'default', title: 'Default' },
          { value: 'compact', title: 'Compact' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'system', density: 'default', appearance: 'default' },
  // The Properties table under the main use case: one row per property of the element
  // (`elementApi().members`, attribute-backed first), each with what it does, its type as the
  // compiler declares it (type names open their cards), its default, and a control only when the
  // value is a choice, a toggle or a plain field. No categories: one table. Base plumbing, events,
  // slots and parts are left out; the API Reference prints the last three.
  argTypesEnhancers: [
    ({ argTypes, component, initialArgs }) => {
      const api = typeof component === 'string' ? elementApi(manifest, component) : undefined;
      if (!api) return argTypes;
      // Only a value the Default story drives gets a control: the table never offers an empty
      // "Set" button for a value the main use case does not use.
      const driven = new Set(Object.keys(initialArgs ?? {}));
      const off = { disable: true } as const;
      const rows: [string, (typeof argTypes)[string]][] = [];
      const covered = new Set<string>();
      for (const row of api.members) {
        const existing =
          argTypes[row.name] ?? (row.attribute ? argTypes[row.attribute] : undefined);
        covered.add(row.name);
        if (row.attribute) covered.add(row.attribute);
        // A story may offer its own choices for a value the type cannot list (a mode or a callback).
        const storyChoice = existing?.options?.length ? existing.control : undefined;
        const control = !driven.has(row.name)
          ? off
          : row.control === 'select'
            ? (storyChoice ?? { type: 'select' })
            : row.control
              ? { type: row.control }
              : (storyChoice ?? off);
        rows.push([
          row.name,
          {
            // The description carries the type, with clickable names: no type chip.
            ...withoutKeys(existing, ['type']),
            name: row.name,
            description: memberDescription(row, component as string),
            ...(row.control === 'select' && !storyChoice ? { options: [...row.values!] } : {}),
            control,
            table: {
              ...withoutKeys(existing?.table, ['category', 'subcategory', 'defaultValue', 'type']),
              ...(row.default ? { defaultValue: { summary: row.default } } : {}),
            },
          },
        ]);
      }
      // A story knob for a property the element inherits (`disabled`, `initialFocus`) reads its
      // description and type from the base, rendered like every other row (linked types, no
      // type chip); other knobs keep the story's own entry. The manifest's event handlers arrive
      // as hidden entries.
      const declaration = elementDeclaration(manifest, component as string);
      for (const [name, argType] of Object.entries(argTypes)) {
        if (covered.has(name)) continue;
        const base = declaration?.members?.find(
          (member) => member.name === name && member.kind === 'field',
        );
        const attribute = declaration?.attributes?.find((entry) => entry.fieldName === name)?.name;
        if (base && driven.has(name))
          rows.push([
            name,
            {
              ...withoutKeys(argType, ['type']),
              name,
              description: [
                [
                  attribute ? attributeBadge(attribute) : '',
                  rowProseHtml(component as string, base.description ?? ''),
                ]
                  .filter(Boolean)
                  .join(' '),
                signatureHtml(
                  component as string,
                  base.type?.text?.replace(/\s*\|\s*undefined$/u, '') ?? '',
                ),
              ]
                .filter(Boolean)
                .join('\n\n'),
              table: {
                ...withoutKeys(argType.table, ['category', 'subcategory', 'defaultValue', 'type']),
                ...(base.default ? { defaultValue: { summary: base.default } } : {}),
              },
            },
          ]);
        else if (argType.table?.category === undefined && Object.keys(argType).length > 0)
          rows.push([name, argType]);
      }
      return Object.fromEntries(rows);
    },
  ],
  decorators: [
    // A documented element's Default story is the page's main use case: until its Controls change,
    // it renders the page's hero, whose code is the story's source. Changed Controls render the
    // story itself, in the hero's frame, alignment and root width, so a Control never moves or
    // resizes the use case.
    (story, context) => {
      const doc = (context.parameters.docs as { library?: LibraryDoc } | undefined)?.library;
      const hero = doc?.page.hero;
      const width = (context.parameters.demoWidth as string | undefined) ?? hero?.width;
      const frameClass = `tp-docs-example-preview${width && /^[1-8]$/.test(width) ? ` demo-frame demo-w-${width}` : ''}`;
      if (!hero || context.name !== 'Default')
        return width
          ? html`<div class=${frameClass} data-align="stretch">${story()}</div>`
          : story();
      if (!sameArgs(context.args, context.initialArgs))
        return html`<div class=${frameClass} data-align=${hero.align ?? 'center'}>
          <div style=${`display:flow-root;${heroRootSizing(hero.code)}`}>${story()}</div>
        </div>`;
      return html`<div
        class=${frameClass}
        data-align=${hero.align ?? 'center'}
        ${ref((host) => {
          if (!host || mountedHeroes.has(host)) return;
          mountedHeroes.set(host, mountPreview(host as HTMLElement, hero));
        })}
      ></div>`;
    },
    // The toolbar globals apply to the preview document. Last in the list, this decorator is the
    // outermost, so it runs for every story, including a Default story that renders its hero
    // without calling the stories inside it.
    (story, context) => {
      applyDensity(context.globals);
      applyAppearance(context.globals);
      applyTheme(themePreference(context.globals));
      return story();
    },
  ],
  parameters: {
    a11y: { test: 'error' },
    // Controls only control: name and control. The API Reference below holds each row's
    // description, values and default, so a fact appears once on the page.
    controls: { expanded: false },
    // Sidebar sections: the library pages first, then foundational components, Motion (grouped by
    // what moves: Text, then Surface) and widgets.
    options: {
      storySort: {
        order: ['Tweakpad UI', 'Components', 'Motion', ['Text', 'Surface'], 'Widgets', 'Patterns'],
      },
    },
    docs: {
      page: DocumentationPage,
      // Every Docs page takes the Theme toolbar's scheme (System by default), Storybook's blocks
      // and the library previews alike.
      container: ThemedDocsContainer,
      // Code samples are dark in both schemes, as every preview's source is: Storybook draws a
      // Canvas source dark whatever the theme, so `<Code>` blocks match it.
      source: { format: false, dark: true },
      // Every story on a docs page keeps the canvas toolbar (reload, zoom, open isolated). The
      // Canvas block reads this parameter as a boolean; its declared type mirrors `withSource`.
      canvas: { withToolbar: true as unknown as 'open' },
    },
    layout: 'padded',
  },
});

export default preview;
