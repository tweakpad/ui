/**
 * Bare engines for the performance baselines (V-588, V-589): each engine with the same content and
 * no adapter, in a fixture-only host with an open shadow root, as `engines.html?baseline` and
 * `large.html` place them. Driven only through the Chrome DevTools MCP (see README.md).
 */
import * as lexicalA11y from '@lexical/a11y';
import * as lexicalCode from '@lexical/code';
import * as lexicalExtension from '@lexical/extension';
import * as lexicalHistory from '@lexical/history';
import * as lexicalHtml from '@lexical/html';
import * as lexicalLink from '@lexical/link';
import * as lexicalList from '@lexical/list';
import * as lexicalRichText from '@lexical/rich-text';
import * as lexicalTable from '@lexical/table';
import * as tiptapCore from '@tiptap/core';
import * as tiptapTable from '@tiptap/extension-table';
import * as tiptapStarterKit from '@tiptap/starter-kit';
import * as lexical from 'lexical';
import { adoptStyleText } from '../../../../src/foundation/generated-style.js';
import type { HostParts } from './harness.js';

export interface BareEngine {
  /** The engine's editor object. */
  readonly native: unknown;
  /** The engine's editing root. */
  readonly root: HTMLElement;
  /** The synchronous mount, content load included, in ms. */
  readonly mountMs: number;
  destroy(): void;
}

/**
 * The bare Tiptap engine in `parts`. The engine's own style injection writes a `style` element
 * into the document head, which the shadow root does not see, so the host adopts the root CSS that
 * the adapter adopts: the editing mechanics the engine relies on, `white-space: pre-wrap` among
 * them. The caller imports that CSS, so that a page without the Tiptap adapter loads none of it.
 */
export function mountBareTiptap(parts: HostParts, html: string, baseCss: string): BareEngine {
  const release = adoptStyleText(parts.host, parts.shadow, baseCss);
  const start = performance.now();
  const editor = new tiptapCore.Editor({
    element: parts.container,
    extensions: [tiptapStarterKit.StarterKit, tiptapTable.TableKit],
    content: html,
    injectCSS: false,
  });
  const mountMs = performance.now() - start;
  return {
    native: editor,
    root: editor.view.dom,
    mountMs,
    destroy: () => {
      editor.destroy();
      release();
    },
  };
}

/** The bare Lexical engine in `parts`: its root, its extensions and the content, no selection. */
export function mountBareLexical(parts: HostParts, html: string): BareEngine {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  parts.container.append(root);
  const start = performance.now();
  const editor = lexicalExtension.buildEditorFromExtensions(
    lexical.defineExtension({
      name: '[tp-fixture-baseline]',
      namespace: 'tp-fixture-baseline',
      theme: { tableScrollableWrapper: 'table-wrapper' },
      dependencies: [
        lexicalRichText.RichTextExtension,
        lexicalHistory.HistoryExtension,
        lexicalList.ListExtension,
        lexicalLink.LinkExtension,
        lexicalCode.CodeExtension,
        lexicalTable.TableExtension,
        lexicalExtension.HorizontalRuleExtension,
        lexical.configExtension(lexicalA11y.AriaLiveRegionExtension, {
          owner: document.createElement('div'),
        }),
      ],
    }),
  );
  editor.setRootElement(root);
  editor.update(
    () => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const nodes = lexicalHtml.$generateNodesFromDOM(editor, parsed);
      lexical.$getRoot().clear().select();
      lexical.$insertNodes(nodes);
      // No selection, so the bare engine takes no focus at load.
      lexical.$setSelection(null);
    },
    { discrete: true, tag: 'skip-dom-selection' },
  );
  const mountMs = performance.now() - start;
  return {
    native: editor,
    root,
    mountMs,
    destroy: () => {
      editor.setRootElement(null);
      editor.dispose();
      root.remove();
    },
  };
}
