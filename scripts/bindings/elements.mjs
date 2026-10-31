import { posix } from 'node:path';
import { header, qualifiedType, typeImports } from './types.mjs';

/**
 * Type-only declarations for writing the elements' own tags (`<tp-select>`) in a framework's
 * templates: each framework's element map gains every tag, with the element's settable properties
 * (typed by its class) and its events under the name that framework listens with. The `on…`
 * callback properties are left out: these frameworks read any `on…` prop as a listener.
 * Generic elements take `unknown` type arguments.
 */
const frameworks = [
  {
    name: 'react',
    open: true,
    folder: 'src/react',
    file: 'jsx.ts',
    preamble: [
      "import type { DetailedHTMLProps, HTMLAttributes } from 'react';",
      '',
      '/** A tag React 19 renders: its own properties and `ontp-…` event listeners. */',
      'type Tag<E extends HTMLElement, F extends keyof E, V> = Omit<',
      '  DetailedHTMLProps<HTMLAttributes<E>, E>,',
      '  F',
      '> & { [K in F]?: E[K] | undefined } & {',
      '  [K in keyof V & string as `on${K}`]?: ((event: V[K]) => void) | undefined;',
      '};',
    ],
    augment:
      "declare module 'react' {\n  namespace JSX {\n    interface IntrinsicElements extends Tags {}\n  }\n}",
  },
  {
    name: 'preact',
    open: true,
    folder: 'src/preact',
    file: 'index.ts',
    preamble: [
      "import type { HTMLAttributes } from 'preact';",
      '',
      '/** A tag Preact renders: its own properties and `ontp-…` event listeners. */',
      'type Tag<E extends HTMLElement, F extends keyof E, V> = Omit<HTMLAttributes<E>, F> & {',
      '  [K in F]?: E[K] | undefined;',
      '} & { [K in keyof V & string as `on${K}`]?: ((event: V[K]) => void) | undefined };',
    ],
    augment:
      "declare module 'preact' {\n  namespace JSX {\n    interface IntrinsicElements extends Tags {}\n  }\n}",
  },
  {
    name: 'solid',
    open: true,
    folder: 'src/solid',
    file: 'index.ts',
    preamble: [
      "import type { JSX } from 'solid-js';",
      '',
      '/** A tag Solid renders: its own properties and `on:tp-…` event listeners. */',
      'type Tag<E extends HTMLElement, F extends keyof E, V> = Omit<JSX.HTMLAttributes<E>, F> & {',
      '  [K in F]?: E[K] | undefined;',
      '} & { [K in keyof V & string as `on:${K}`]?: ((event: V[K]) => void) | undefined };',
    ],
    augment:
      "declare module 'solid-js' {\n  namespace JSX {\n    interface IntrinsicElements extends Tags {}\n  }\n}",
  },
  {
    name: 'svelte',
    folder: 'src/svelte',
    file: 'index.ts',
    preamble: [
      "import type { HTMLAttributes } from 'svelte/elements';",
      '',
      '/** A tag Svelte renders: its own properties and `ontp-…` event attributes. */',
      'type Tag<E extends HTMLElement, F extends keyof E, V> = Omit<HTMLAttributes<E>, F> & {',
      '  [K in F]?: E[K] | undefined;',
      '} & { [K in keyof V & string as `on${K}`]?: ((event: V[K]) => void) | undefined };',
    ],
    augment:
      "declare module 'svelte/elements' {\n  interface SvelteHTMLElements extends Tags {}\n}",
  },
  {
    name: 'vue',
    folder: 'src/vue',
    file: 'elements.ts',
    preamble: [
      "import type { DefineSetupFnComponent } from 'vue';",
      `import type { EventPropName } from './adapter.js';`,
      '',
      '/** A tag Vue templates write: its own properties and `@tp-…` listeners. */',
      'type Tag<E extends HTMLElement, F extends keyof E, V> = DefineSetupFnComponent<',
      '  { [K in F]?: E[K] | undefined } & {',
      '    [K in keyof V & string as `on${EventPropName<K>}`]?: ((event: V[K]) => void) | undefined;',
      '  }',
      '>;',
    ],
    augment: "declare module 'vue' {\n  interface GlobalComponents extends Tags {}\n}",
  },
];

export function elementTypes(model) {
  const files = new Map();
  for (const framework of frameworks)
    for (const [groups, folder] of [
      [model.components, framework.folder],
      [model.widgets, `${framework.folder}/widgets`],
    ]) {
      const path = `${folder}/${framework.file}`;
      const relative = (target) => {
        const value = posix.relative(folder, target.replace(/\.ts$/u, '.js'));
        return value.startsWith('.') ? value : `./${value}`;
      };
      const elements = groups.flatMap((group) => group.elements);
      const types = typeImports(
        elements.flatMap((element) =>
          element.events.flatMap((event) => event.type.references ?? []),
        ),
        relative,
      );
      const preamble = framework.preamble.map((line) =>
        line.replace("'./adapter.js'", `'${relative('src/vue/adapter.ts')}'`),
      );
      const lines = [
        header,
        // Module augmentation is written as the framework declares its element map.
        `/* eslint-disable ${framework.open ? '@typescript-eslint/no-namespace, ' : ''}@typescript-eslint/no-empty-object-type */`,
        ...preamble.slice(0, preamble.indexOf('')),
        ...[...new Set(elements.map((element) => element.module))].sort().map(
          (module) =>
            `import type { ${elements
              .filter((element) => element.module === module)
              .map((element) => element.className)
              .sort()
              .join(', ')} } from '${relative(module)}';`,
        ),
        ...types.imports,
        ...preamble.slice(preamble.indexOf('')),
        '',
        // Declared out here, where the platform's event types resolve (inside the framework's
        // module, React's `MouseEvent` would shadow the DOM's).
        '/** Every tag, with its properties and events. */',
        'type Tags = {',
      ];
      for (const element of elements) {
        const instance = element.typeParameters.length
          ? `${element.className}<${element.typeParameters.map(() => 'unknown').join(', ')}>`
          : element.className;
        const fields = element.fields.length
          ? element.fields.map((name) => `'${name}'`).join(' | ')
          : 'never';
        const events = element.events
          .map((event) => `'${event.name}': ${qualifiedType(event.type, types.alias)};`)
          .join(' ');
        lines.push(
          `'${element.tagName}': Tag<${instance}, ${fields}, ${events ? `{ ${events} }` : 'Record<never, never>'}>;`.replace(
            new RegExp(`\\b(${element.typeParameters.join('|') || '(?!)'})\\b`, 'gu'),
            'unknown',
          ),
        );
      }
      lines.push('};', '', framework.augment, '');
      files.set(path, lines.join('\n'));
    }
  return files;
}
