/**
 * The framework bindings (`src/react/`, `src/widgets/react/`) are generated from the custom
 * elements manifest. These tests analyze the sources in memory with the shipped analyzer config,
 * as `npm run cem` does, so they need no build: they fail when a committed binding is stale
 * (regenerate with `npm run cem`) and when an element's event has no type to generate from.
 */
import { describe, expect, it } from 'vitest';

interface ManifestEvent {
  name: string;
  type?: { text: string; references?: { name: string; module: string }[] };
}
interface Manifest {
  modules: {
    path: string;
    declarations?: { kind: string; name: string; tagName?: string; events?: ManifestEvent[] }[];
  }[];
}
interface BindingElement {
  tagName: string;
  wrapperName: string;
  events: { name: string; prop: string; type: { text: string } }[];
}
interface BindingGroup {
  folder: string;
  elements: BindingElement[];
}

// The analyzer's programmatic entry and the generator scripts (`.mjs`) are loaded by specifier,
// outside the type graph.
const cliEntry: string = '@custom-elements-manifest/analyzer/cli.js';
const generatorEntry: string = new URL('../scripts/bindings/generate.mjs', import.meta.url).href;
const modelEntry: string = new URL('../scripts/bindings/model.mjs', import.meta.url).href;
const root = new URL('..', import.meta.url).pathname;

let analysis: Promise<Manifest> | undefined;
/** One in-memory analysis per file, shared by the tests and started by the first of them. */
const manifest = () =>
  (analysis ??= (async () => {
    const { cli } = (await import(/* @vite-ignore */ cliEntry)) as {
      cli: (options: { argv: string[]; cwd: string; noWrite: boolean }) => Promise<Manifest>;
    };
    return cli({ argv: ['analyze', '--quiet'], cwd: root, noWrite: true });
  })());

describe('framework bindings', () => {
  it('types every event of every element a consumer writes', async () => {
    const { bindingModel } = (await import(/* @vite-ignore */ modelEntry)) as {
      bindingModel: (
        manifest: Manifest,
        options: { root: string },
      ) => { components: BindingGroup[]; widgets: BindingGroup[] };
    };
    const model = bindingModel(await manifest(), { root });
    const elements = [...model.components, ...model.widgets].flatMap((group) => group.elements);
    expect(elements.length).toBeGreaterThan(190);
    const untyped = elements.flatMap((element) =>
      element.events
        .filter((event) => !event.type.text || /^CustomEvent(<unknown>)?$/u.test(event.type.text))
        .map((event) => `${element.tagName} ${event.name}: ${event.type.text}`),
    );
    expect(untyped).toEqual([]);
  }, 180_000);

  it('matches the committed bindings (run `npm run cem` after changing an element)', async () => {
    const { generateBindings, staleBindings } = (await import(
      /* @vite-ignore */ generatorEntry
    )) as {
      generateBindings: (manifest: Manifest) => Promise<Map<string, string>>;
      staleBindings: (files: Map<string, string>) => string[];
    };
    expect(staleBindings(await generateBindings(await manifest()))).toEqual([]);
  }, 180_000);
});
