import { definePreview, setCustomElementsManifest } from '@storybook/web-components-vite';
import * as manifestArgTypes from '@storybook/web-components/entry-preview-argtypes';
import addonDocs from '@storybook/addon-docs';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import DocumentationPage from './docs-page.mdx';
import { ThemedDocsContainer } from './docs-container.mdx';
import { applyTheme, themePreference } from './docs-theme.js';
import { manifest } from './manifest.js';
import { elementApi } from '../src/docs/api.js';
import {
  installPreviewModules,
  mountPreview,
  type MountedPreview,
} from '../src/docs/preview-runtime.js';
import type { LibraryDoc } from '../src/stories/library-docs.js';
import '../src/styles.css';
import './docs.css';
import './density-compact.css';
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
  },
  (name) => {
    const load = icons[`../src/icons/${name}.ts`];
    return load ? load() : Promise.reject(new Error(`no icon module ${name}`));
  },
);

/** The hero mounted in each story root, so a re-render replaces it. */
const mountedHeroes = new WeakMap<Element, MountedPreview>();
const sameArgs = (args: Record<string, unknown>, initial: Record<string, unknown>) =>
  Object.keys({ ...args, ...initial }).every((key) => Object.is(args[key], initial[key]));

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
    density: {
      description: 'Token density preset (prototype)',
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
  initialGlobals: { theme: 'system', density: 'default' },
  // The manifest lists every member of the element, base plumbing included. Controls keep the
  // element's own public attributes and properties (the rows of its API reference) plus whatever
  // the story declares itself; events, slots and parts are the Docs page's API section.
  argTypesEnhancers: [
    ({ argTypes, component }) => {
      const api = typeof component === 'string' ? elementApi(manifest, component) : undefined;
      if (!api) return argTypes;
      const own = new Set([
        ...api.attributes.flatMap((attribute) => [attribute.name, attribute.property]),
        ...api.properties.map((property) => property.name),
      ]);
      return Object.fromEntries(
        Object.entries(argTypes).filter(
          ([name, argType]) =>
            own.has(name) ||
            // A story's own fixture knob; the manifest's event handlers arrive as empty entries.
            (argType.table?.category === undefined && Object.keys(argType).length > 0),
        ),
      );
    },
  ],
  decorators: [
    (story, context) => {
      const root = document.documentElement;
      if (context.globals.density === 'compact') root.dataset.tpDensity = 'compact';
      else delete root.dataset.tpDensity;
      applyTheme(themePreference(context.globals));
      return story();
    },
    // A documented element's Default story is the page's main use case: until its Controls change,
    // it renders the page's hero, whose code is the story's source. Changed Controls render the
    // story itself.
    (story, context) => {
      const doc = (context.parameters.docs as { library?: LibraryDoc } | undefined)?.library;
      const hero = doc?.page.hero;
      if (!hero || context.name !== 'Default' || !sameArgs(context.args, context.initialArgs))
        return story();
      return html`<div
        class="tp-docs-example-preview"
        data-align=${hero.align ?? 'center'}
        ${ref((host) => {
          if (!host || mountedHeroes.has(host)) return;
          mountedHeroes.set(host, mountPreview(host as HTMLElement, hero));
        })}
      ></div>`;
    },
  ],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    // Sidebar sections: the library pages first, then foundational components, then widgets.
    options: { storySort: { order: ['Tweakpad UI', 'Components', 'Widgets'] } },
    docs: {
      page: DocumentationPage,
      // Every Docs page takes the Theme toolbar's scheme (System by default), Storybook's blocks
      // and the library previews alike.
      container: ThemedDocsContainer,
      source: { format: false },
      // Every story on a docs page keeps the canvas toolbar (reload, zoom, open isolated). The
      // Canvas block reads this parameter as a boolean; its declared type mirrors `withSource`.
      canvas: { withToolbar: true as unknown as 'open' },
    },
    layout: 'padded',
  },
});

export default preview;
