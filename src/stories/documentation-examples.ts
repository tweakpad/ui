import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/** Authored, trusted HTML is both the rendered composition and its copyable source. */
export function markupExample(title: string, code: string, description?: string) {
  return { title, code, description, render: () => html`${unsafeHTML(code)}` };
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
