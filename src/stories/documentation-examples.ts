import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * Authored, trusted HTML is both the rendered composition and its copyable source. `viewport` makes
 * the example's own preview a scroll container of that height (a scrolling use case).
 */
export function markupExample(
  title: string,
  code: string,
  description?: string,
  options: { readonly viewport?: string } = {},
) {
  return { title, code, description, ...options, render: () => html`${unsafeHTML(code)}` };
}

/** Foundation entries the package publishes as `@tweakpad/ui/<entry>` (package.json `exports`). */
const PUBLISHED_FOUNDATION_ENTRIES: readonly string[] = [
  'carousel',
  'drag-drop',
  'media',
  'map',
  'code',
  'emoji',
  'markdown',
  'qr',
  'flow',
  'text-editor',
];

/** Rewrites repository-relative icon imports (any depth) to the published `@tweakpad/ui/icons/*`. */
const publishedIconImports = (raw: string) =>
  raw.replace(/'(?:\.\.\/)+icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'");

/** Rewrites repository-relative widget imports (any depth) to the published `@tweakpad/ui/widgets`. */
const publishedWidgetImports = (raw: string) =>
  raw.replace(/'(?:\.\.\/)+widgets\/[^']+'/g, "'@tweakpad/ui/widgets'");

const publishedEntryModule = new RegExp(
  `'(?:\\.\\.\\/)+foundation\\/(${PUBLISHED_FOUNDATION_ENTRIES.join('|')})\\/[^']+'`,
  'g',
);

/** A module of an engine adapter folder of a published entry, which ships at `@tweakpad/ui/<entry>/adapters/<engine>`. */
const publishedAdapterModule = new RegExp(
  `'(?:\\.\\.\\/)+foundation\\/(${PUBLISHED_FOUNDATION_ENTRIES.join('|')})\\/adapters\\/(?!shared\\/)([^/']+)\\/[^']+'`,
  'g',
);

/**
 * Rewrites repository-relative foundation imports (any depth): a module of an engine adapter folder
 * to `@tweakpad/ui/<entry>/adapters/<engine>`, a module of a published entry to `@tweakpad/ui/<entry>`,
 * every other foundation module to `@tweakpad/ui`.
 */
const publishedFoundationImports = (raw: string) =>
  raw
    .replace(publishedAdapterModule, "'@tweakpad/ui/$1/adapters/$2'")
    .replace(publishedEntryModule, "'@tweakpad/ui/$1'")
    .replace(/'(?:\.\.\/)+foundation\/[^']+'/g, "'@tweakpad/ui'");

/** Rewrites repository-relative component imports (any depth) to `@tweakpad/ui`. */
const publishedComponentImports = (raw: string) =>
  raw.replace(/'(?:\.\.\/)+components\/[^']+'/g, "'@tweakpad/ui'");

/**
 * Rewrites every repository-relative package import, at any depth: icons to
 * `@tweakpad/ui/icons/<name>`, widgets to `@tweakpad/ui/widgets`, a module of a published
 * foundation entry to `@tweakpad/ui/<entry>`, every other foundation module and every component
 * module to `@tweakpad/ui`. Every other specifier stays as written.
 */
export const publishedPackageImports = (raw: string): string =>
  publishedComponentImports(
    publishedFoundationImports(publishedWidgetImports(publishedIconImports(raw))),
  );

/** The published form of an authored example module: package imports, relative specifiers without `.js`. */
export const publishedSource = (raw: string): string =>
  publishedPackageImports(raw).replace(/('\.{1,2}\/[^']*)\.js';/g, "$1';");

/** Registration imports of the copyable code; widget examples add `@tweakpad/ui/register/widgets`. */
export const DEFAULT_REGISTER_IMPORTS: readonly string[] = ['@tweakpad/ui/register'];
export const WIDGET_REGISTER_IMPORTS: readonly string[] = [
  '@tweakpad/ui/register',
  '@tweakpad/ui/register/widgets',
];

/**
 * A live example whose behavior is an authored module (`setup` with its `?raw` `source`): the
 * markup is wrapped in a container the module mounts by `id`, and the copyable code is the
 * module's published source followed by `call`.
 */
export function moduleExample({
  title,
  id,
  markup,
  setup,
  source,
  call,
  wrapperStyle,
  description,
  registerImports,
}: {
  readonly title: string;
  readonly id: string;
  readonly markup: string;
  readonly setup: (root: HTMLElement) => () => void;
  readonly source: string;
  readonly call: string;
  readonly wrapperStyle?: string | undefined;
  readonly description?: string | undefined;
  readonly registerImports?: readonly string[] | undefined;
}) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}"${wrapperStyle ? ` style="${wrapperStyle}"` : ''}>${markup}</div>`,
    setup,
    `${publishedSource(source)}\n${call}`,
    description,
    registerImports ? { registerImports } : {},
  );
}

/** One mount/cleanup path for live application examples and their copyable source. */
export function interactiveMarkupExample(
  title: string,
  markup: string,
  setup: (root: HTMLElement) => () => void,
  script: string,
  description?: string,
  options: { readonly registerImports?: readonly string[] } = {},
) {
  const registration = (options.registerImports ?? DEFAULT_REGISTER_IMPORTS)
    .map((specifier) => `import '${specifier}';`)
    .join('\n');
  return {
    title,
    description,
    code: `${markup}\n<script type="module">\n${registration}\nimport '@tweakpad/ui/styles.css';\n${script}\n</script>`,
    render: () => {
      let cleanup: (() => void) | undefined;
      return html`<div
        ${ref((node) => {
          cleanup?.();
          if (node)
            queueMicrotask(() => {
              if (node.isConnected) cleanup = setup(node as HTMLElement);
            });
        })}
      >
        ${unsafeHTML(markup)}
      </div>`;
    },
  };
}
