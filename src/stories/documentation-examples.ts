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

/** Rewrites repository-relative icon imports (any depth) to the published `@tweakpad/ui/icons/*`. */
export const publishedIconImports = (raw: string) =>
  raw.replace(/'(?:\.\.\/)+icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'");

/** Rewrites repository-relative widget imports (any depth) to the published `@tweakpad/ui/widgets`. */
export const publishedWidgetImports = (raw: string) =>
  raw.replace(/'(?:\.\.\/)+widgets\/[^']+'/g, "'@tweakpad/ui/widgets'");

/** The published form of an authored example module: package icons and widgets, extensionless specifiers. */
export const publishedSource = (raw: string) =>
  publishedWidgetImports(publishedIconImports(raw)).replaceAll(".js';", "';");

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
