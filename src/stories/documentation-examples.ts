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

/** The published form of an authored example module: package icons, extensionless specifiers. */
export const publishedSource = (raw: string) => publishedIconImports(raw).replaceAll(".js';", "';");

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
}: {
  readonly title: string;
  readonly id: string;
  readonly markup: string;
  readonly setup: (root: HTMLElement) => () => void;
  readonly source: string;
  readonly call: string;
  readonly wrapperStyle?: string | undefined;
  readonly description?: string | undefined;
}) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}"${wrapperStyle ? ` style="${wrapperStyle}"` : ''}>${markup}</div>`,
    setup,
    `${publishedSource(source)}\n${call}`,
    description,
  );
}

/** One mount/cleanup path for live application examples and their copyable source. */
export function interactiveMarkupExample(
  title: string,
  markup: string,
  setup: (root: HTMLElement) => () => void,
  script: string,
  description?: string,
) {
  return {
    title,
    description,
    code: `${markup}\n<script type="module">\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\n${script}\n</script>`,
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
