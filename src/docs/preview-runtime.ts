/**
 * The runtime of a documentation preview, shared by both renderings. A preview's `code` renders
 * as written and is the copyable source; its `script` is behavior markup cannot express (opening a
 * dialog, feeding chart data, installing an editor engine). The script runs as a module after the
 * markup, and the copyable code shows it in a script tag.
 *
 * A script imports from the library, its subpath entries, `lit` and the engine packages the text
 * editor runs on, as an application would: named imports (`import { a } from`) and namespace
 * imports (`import * as a from`). An inline module cannot resolve bare specifiers, so the page runs
 * a copy where each such import reads the module from the page's own bundle through
 * `window.__tpPreviewModules`; the copyable code keeps the import as written. The renderings fill
 * that registry from their bundle (`installPreviewModules`), so a script never resolves a specifier
 * the registry does not list.
 */

/** Library entries and companion packages a preview script may import. */
export const PREVIEW_SPECIFIERS: readonly string[] = [
  '@tweakpad/ui',
  '@tweakpad/ui/carousel',
  '@tweakpad/ui/code',
  '@tweakpad/ui/drag-drop',
  '@tweakpad/ui/emoji',
  '@tweakpad/ui/flow',
  '@tweakpad/ui/map',
  '@tweakpad/ui/markdown',
  '@tweakpad/ui/media',
  '@tweakpad/ui/qr',
  '@tweakpad/ui/text-editor',
  '@tweakpad/ui/text-editor/adapters/tiptap',
  '@tweakpad/ui/text-editor/adapters/lexical',
  '@tweakpad/ui/widgets',
  'lit',
  // The engines of the text editor examples.
  '@tiptap/core',
  '@tiptap/starter-kit',
  '@tiptap/extension-list',
  '@tiptap/extension-table',
  '@tiptap/pm/state',
  '@tiptap/pm/history',
  '@tiptap/pm/tables',
  'lexical',
  '@lexical/extension',
  '@lexical/rich-text',
  '@lexical/history',
  '@lexical/selection',
  '@lexical/list',
  '@lexical/link',
  '@lexical/markdown',
  '@lexical/code',
  '@lexical/a11y',
  '@lexical/html',
  '@lexical/table',
];

const ICON_SPECIFIER = /^@tweakpad\/ui\/icons\/[\w-]+$/;

/** Whether a preview script may import `specifier`: a listed entry or one icon module. */
export function isPreviewSpecifier(specifier: string): boolean {
  return PREVIEW_SPECIFIERS.includes(specifier) || ICON_SPECIFIER.test(specifier);
}

const NAMED_IMPORT = /^import\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2;?[ \t]*$/gm;
const NAMESPACE_IMPORT = /^import\s*\*\s*as\s+([\w$]+)\s+from\s*(['"])([^'"]+)\2;?[ \t]*$/gm;
const OTHER_IMPORT = /^import\b/gm;

/** Every specifier a script imports with a form the previews support, in order. */
export function previewImports(script: string): string[] {
  return [
    ...[...script.matchAll(NAMED_IMPORT)].map((match) => ({
      index: match.index,
      specifier: match[3]!,
    })),
    ...[...script.matchAll(NAMESPACE_IMPORT)].map((match) => ({
      index: match.index,
      specifier: match[3]!,
    })),
  ]
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.specifier);
}

/** Import statements the previews do not support (default imports, side-effect imports). */
export function unsupportedImports(script: string): number {
  const supported = [...script.matchAll(NAMED_IMPORT), ...script.matchAll(NAMESPACE_IMPORT)].map(
    (match) => match.index,
  );
  return [...script.matchAll(OTHER_IMPORT)].filter((match) => !supported.includes(match.index))
    .length;
}

const load = (specifier: string) =>
  `await (await window.__tpPreviewModules.ready)(${JSON.stringify(specifier)})`;

/**
 * The runnable copy of a preview script: each supported import of an allowed specifier becomes a
 * read of the page's module registry; anything else stays as written.
 */
export function rewritePreviewImports(script: string): string {
  return script
    .replace(NAMED_IMPORT, (statement, names: string, _quote: string, specifier: string) => {
      if (!isPreviewSpecifier(specifier)) return statement;
      const bindings = names
        .split(',')
        .map((name) => name.trim().replace(/\s+as\s+/, ': '))
        .filter(Boolean)
        .join(', ');
      return `const { ${bindings} } = ${load(specifier)};`;
    })
    .replace(NAMESPACE_IMPORT, (statement, name: string, _quote: string, specifier: string) =>
      isPreviewSpecifier(specifier) ? `const ${name} = ${load(specifier)};` : statement,
    );
}

/** The copyable source of a preview: its markup, then its script in a module script tag. */
export function previewSource(code: string, script?: string): string {
  const markup = code.trim();
  const behavior = script?.trim();
  return behavior ? `${markup}\n\n<script type="module">\n${behavior}\n</script>` : markup;
}

export type PreviewImport = (specifier: string) => Promise<unknown>;

export interface PreviewModuleRegistry {
  /** Resolves to the loader once a rendering has installed its modules. */
  readonly ready: Promise<PreviewImport>;
  resolve(load: PreviewImport): void;
}

declare global {
  interface Window {
    __tpPreviewModules?: PreviewModuleRegistry;
  }
}

/** The page's module registry, created on first use so a script can wait on it before it is filled. */
export function previewModuleRegistry(): PreviewModuleRegistry {
  if (!window.__tpPreviewModules) {
    let resolve: (load: PreviewImport) => void = () => {};
    const ready = new Promise<PreviewImport>((done) => (resolve = done));
    window.__tpPreviewModules = { ready, resolve: (load) => resolve(load) };
  }
  return window.__tpPreviewModules;
}

/**
 * Fills the page's registry from a rendering's bundle: a loader per specifier (lazy imports), and
 * optionally one for icon modules by name (`@tweakpad/ui/icons/<name>` → `name`).
 */
export function installPreviewModules(
  modules: Readonly<Record<string, () => Promise<unknown>>>,
  icons?: (name: string) => Promise<unknown>,
): void {
  previewModuleRegistry().resolve((specifier) => {
    const loader = modules[specifier];
    if (loader) return loader();
    const icon = ICON_SPECIFIER.test(specifier)
      ? icons?.(specifier.slice('@tweakpad/ui/icons/'.length))
      : undefined;
    return icon ?? Promise.reject(new Error(`preview scripts cannot import ${specifier}`));
  });
}

export interface MountedPreview {
  /** The script's module evaluation, for a caller that waits on it. */
  readonly ran: Promise<void>;
  /** Removes the markup; a script that listens on the document then sees no connected elements. */
  dispose(): void;
}

/**
 * Renders a preview into `host`: the markup as its children, then the script as a module that
 * reads its imports from the page's registry. Demo forms validate and show their states but never
 * leave the page.
 */
export function mountPreview(
  host: HTMLElement,
  preview: { readonly code: string; readonly script?: string | undefined },
): MountedPreview {
  host.innerHTML = preview.code;
  const submit = (event: Event) => event.preventDefault();
  host.addEventListener('submit', submit);
  let url: string | undefined;
  const ran = preview.script
    ? (async () => {
        const runnable = rewritePreviewImports(preview.script!.trim());
        url = URL.createObjectURL(new Blob([runnable], { type: 'text/javascript' }));
        await import(/* @vite-ignore */ url);
      })()
    : Promise.resolve();
  return {
    ran,
    dispose() {
      host.removeEventListener('submit', submit);
      host.replaceChildren();
      if (url) URL.revokeObjectURL(url);
    },
  };
}
