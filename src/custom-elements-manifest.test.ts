/**
 * The published custom elements manifest (`customElements` in package.json) for elements that
 * redeclare an inherited reactive property. The fixture modules are analyzed in memory with the
 * manifest analyzer, its Lit plugins and the shipped config's plugins, so the tests observe the
 * manifest that `npm run cem` writes, not a single plugin in isolation.
 */
import { readFileSync } from 'node:fs';
import type * as TypeScript from 'typescript';
import { describe, expect, it } from 'vitest';

interface ManifestType {
  text: string;
}
interface ManifestAttribute {
  name: string;
  fieldName?: string;
  inheritedFrom?: { name: string; module?: string };
}
interface ManifestMember {
  kind: string;
  name: string;
  static?: boolean;
  type?: ManifestType;
  attribute?: string;
  reflects?: boolean;
  readonly?: boolean;
  default?: string;
}
interface ManifestDeclaration {
  name: string;
  tagName?: string;
  attributes?: ManifestAttribute[];
  members?: ManifestMember[];
  events?: { name: string }[];
}
interface Manifest {
  modules: { path: string; declarations?: ManifestDeclaration[] }[];
}
interface Analyzer {
  create(options: {
    modules: TypeScript.SourceFile[];
    plugins: unknown[];
    context: Record<string, unknown>;
  }): Manifest;
  ts: typeof TypeScript;
}
interface AnalyzedElement {
  attributes: string[];
  methods: string[];
  member(name: string): ManifestMember | undefined;
}

// The analyzer's programmatic entry, its Lit plugins (a deep module without declarations) and the
// config (`.mjs`) are loaded by specifier, outside the type graph.
const analyzerEntry: string = '@custom-elements-manifest/analyzer';
const litEntry: string =
  '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
const configEntry: string = new URL('../custom-elements-manifest.config.mjs', import.meta.url).href;

/** An abstract base with three reactive properties, and elements that redeclare them. */
const sources: Record<string, string> = {
  'src/fixture/base.ts': `
import { LitElement } from 'lit';
export abstract class TpFixtureBase<TValue = string> extends LitElement {
  static override properties = {
    value: { type: String, noAccessor: true },
    open: { type: Boolean, reflect: true },
    orientation: { type: String, reflect: true },
  };
  open = false;
  orientation = 'horizontal';
  #value?: TValue;
  get value(): TValue {
    return this.#value as TValue;
  }
  set value(next: TValue) {
    this.#value = next;
  }
}`,
  'src/fixture/elements.ts': `
import { TpFixtureBase } from './base.js';
export interface FixtureSnapshot {
  readonly text: string;
}
export class TpFixtureFiles extends TpFixtureBase<readonly File[]> {
  static tagName = 'tp-fixture-files';
  static override properties = {
    ...TpFixtureBase.properties,
    value: { attribute: false, noAccessor: true },
    open: { attribute: false, reflect: false },
  };
  override get value(): readonly File[] {
    return [];
  }
  override set value(next: readonly File[]) {
    void next;
  }
}
export class TpFixtureSnapshot extends TpFixtureBase {
  static tagName = 'tp-fixture-snapshot';
  static override properties = {
    ...TpFixtureBase.properties,
    value: { attribute: false, noAccessor: true },
  };
  override get value(): FixtureSnapshot | null {
    return null;
  }
}
export class TpFixtureText extends TpFixtureBase {
  static tagName = 'tp-fixture-text';
  static override properties = {
    ...TpFixtureBase.properties,
    value: { type: String, noAccessor: true },
  };
}
export class TpFixtureVertical extends TpFixtureBase {
  static tagName = 'tp-fixture-vertical';
  override orientation = 'vertical';
}`,
  'src/fixture/derived.ts': `
import { TpFixtureFiles } from './elements.js';
export class TpFixtureMoreFiles extends TpFixtureFiles {
  static tagName = 'tp-fixture-more-files';
}
export class TpFixtureValueAgain extends TpFixtureFiles {
  static tagName = 'tp-fixture-value-again';
  static override properties = {
    ...TpFixtureFiles.properties,
    value: { attribute: 'value', noAccessor: true },
  };
}`,
  'src/fixture/owner.ts': `
import { LitElement } from 'lit';
export class TpFixtureOwnerBase extends LitElement {
  static tagName = 'tp-fixture-owner-base';
  static override properties = { owner: { attribute: false } };
  protected owner: HTMLElement | null = null;
  protected forward(): boolean {
    return false;
  }
}
export class TpFixtureOwned extends TpFixtureOwnerBase {
  static tagName = 'tp-fixture-owned';
  override owner: HTMLElement | null = null;
  override forward(): boolean {
    return true;
  }
}`,
};

/** The manifest of `sources`, keyed by repository path, as the shipped config writes it. */
const manifestOf = async (sources: Record<string, string>): Promise<Manifest> => {
  const { create, ts } = (await import(/* @vite-ignore */ analyzerEntry)) as Analyzer;
  const { litPlugin } = (await import(/* @vite-ignore */ litEntry)) as {
    litPlugin: () => unknown[];
  };
  const { default: config } = (await import(/* @vite-ignore */ configEntry)) as {
    default: { plugins: unknown[] };
  };
  const modules = Object.entries(sources).map(([path, text]) =>
    ts.createSourceFile(path, text, ts.ScriptTarget.ES2015, true),
  );
  return create({
    modules,
    plugins: [...litPlugin(), ...config.plugins],
    context: { dev: false, thirdPartyCEMs: [] },
  });
};

const analyze = async (): Promise<(tagName: string) => AnalyzedElement> => {
  const manifest = await manifestOf(sources);
  const declarations = manifest.modules.flatMap((module) => module.declarations ?? []);
  return (tagName) => {
    const declaration = declarations.find((entry) => entry.tagName === tagName);
    if (!declaration) throw new Error(`${tagName} is not in the manifest`);
    return {
      attributes: (declaration.attributes ?? []).map((attribute) => attribute.name),
      methods: (declaration.members ?? [])
        .filter((member) => member.kind === 'method')
        .map((member) => member.name),
      member: (name) =>
        declaration.members?.find(
          (member) => member.kind === 'field' && !member.static && member.name === name,
        ),
    };
  };
};

/** One analysis per file, shared by the tests and started by the first of them. */
let analysis: Promise<(tagName: string) => AnalyzedElement> | undefined;
const analyzed = () => (analysis ??= analyze());

describe('custom elements manifest: inherited attributes of redeclared properties', () => {
  it('drops an inherited attribute that the element redeclares with attribute: false, keeping its own member and type', async () => {
    const element = await analyzed();
    const files = element('tp-fixture-files');
    expect(files.attributes).toEqual(['orientation']);
    expect(files.member('value')).toMatchObject({ type: { text: 'readonly File[]' } });
    expect(files.member('value')).not.toHaveProperty('attribute');
    expect(files.member('open')).toMatchObject({ type: { text: 'boolean' }, default: 'false' });
    expect(files.member('open')).not.toHaveProperty('attribute');
    expect(files.member('open')).not.toHaveProperty('reflects');
    expect(element('tp-fixture-text').attributes).toEqual(['value', 'open', 'orientation']);
    const vertical = element('tp-fixture-vertical');
    expect(vertical.attributes).toEqual(['value', 'open', 'orientation']);
    expect(vertical.member('orientation')).toMatchObject({
      attribute: 'orientation',
      default: "'vertical'",
    });
  });

  it('uwg-te-req-prop-1, uwg-te-req-prop-2: publishes a getter-only value redeclared without an attribute as read-only, with no attribute', async () => {
    const element = await analyzed();
    const snapshot = element('tp-fixture-snapshot');
    expect(snapshot.attributes).toEqual(['open', 'orientation']);
    expect(snapshot.member('value')).toMatchObject({
      readonly: true,
      type: { text: 'FixtureSnapshot | null' },
    });
    expect(snapshot.member('value')).not.toHaveProperty('attribute');
  });

  it('follows the nearest declaration of a property up the class chain, across modules', async () => {
    const element = await analyzed();
    const more = element('tp-fixture-more-files');
    expect(more.attributes).toEqual(['orientation']);
    expect(more.member('value')).toMatchObject({ type: { text: 'readonly File[]' } });
    expect(more.member('value')).not.toHaveProperty('attribute');
    expect(more.member('open')).not.toHaveProperty('attribute');
    const again = element('tp-fixture-value-again');
    expect(again.attributes).toEqual(['value', 'orientation']);
    expect(again.member('value')).toMatchObject({ attribute: 'value' });
  });

  it('publishes a protected base member that an element redeclares as public, and only there', async () => {
    const element = await analyzed();
    const base = element('tp-fixture-owner-base');
    expect(base.member('owner')).toBeUndefined();
    expect(base.methods).not.toContain('forward');
    const owned = element('tp-fixture-owned');
    expect(owned.member('owner')).toMatchObject({
      type: { text: 'HTMLElement | null' },
      default: 'null',
    });
    expect(owned.member('owner')).not.toHaveProperty('privacy');
    expect(owned.member('owner')).not.toHaveProperty('attribute');
    expect(owned.attributes).not.toContain('owner');
    expect(owned.methods).toContain('forward');
  });
});

// The text editor's description check, shared with the package smoke test and loaded by specifier
// like the config.
const descriptionEntry: string = new URL('../scripts/pack-smoke-manifest.mjs', import.meta.url)
  .href;
const descriptionCheck = async (): Promise<(manifest: Manifest) => string[]> =>
  (
    (await import(/* @vite-ignore */ descriptionEntry)) as {
      textEditorManifestProblems: (manifest: Manifest) => string[];
    }
  ).textEditorManifestProblems;

/** A clean description: the base's attributes, the element's own, form and property-only members. */
const describedEditor = (): Manifest => {
  const inherited = (name: string, from: string): ManifestAttribute => ({
    name,
    inheritedFrom: { name: from },
  });
  const field = (name: string): ManifestMember => ({ kind: 'field', name });
  return {
    modules: [
      {
        path: 'src/foundation/element.ts',
        declarations: [
          { name: 'TpElement', attributes: [{ name: 'disabled' }, { name: 'readonly' }] },
        ],
      },
      {
        path: 'src/widgets/text-editor/text-editor.ts',
        declarations: [
          {
            name: 'TpTextEditor',
            tagName: 'tp-text-editor',
            attributes: [
              ...[
                'default-value',
                'format',
                'placeholder',
                'label',
                'sticky-table-headers',
                'image-accept',
                'image-max-file-size',
              ].map((name) => ({ name })),
              inherited('name', 'TpFormElement'),
              inherited('form', 'TpFormElement'),
              inherited('disabled', 'TpElement'),
              inherited('readonly', 'TpElement'),
            ],
            members: [
              { kind: 'field', name: 'value', readonly: true },
              ...['engine', 'tools', 'layout', 'nodes', 'strings', 'imageUpload'].map(field),
            ],
            events: [
              'tp-text-editor-request',
              'tp-text-editor-request-failed',
              'tp-value-change',
              'tp-value-commit',
              'tp-text-editor-ready',
              'tp-text-editor-error',
              'tp-diagnostic',
            ].map((name) => ({ name })),
          } as ManifestDeclaration,
        ],
      },
    ],
  };
};

describe('custom elements manifest: tp-text-editor', () => {
  it('uwg-te-req-prop-1, uwg-te-req-prop-2, uwg-te-req-evt-5: describes tp-text-editor with its attributes, property-only members, read-only value and events', async () => {
    const root = new URL('../', import.meta.url);
    const paths = [
      'src/foundation/element.ts',
      'src/foundation/form-element.ts',
      'src/widgets/text-editor/text-editor.ts',
    ];
    const sources = Object.fromEntries(
      paths.map((path) => [path, readFileSync(new URL(path, root), 'utf8')]),
    );
    const problems = await descriptionCheck();
    expect(problems(await manifestOf(sources))).toEqual([]);
  });

  it('uwg-te-req-prop-2: the description check reports a settable or attribute value, an attribute on a property-only member, a missing or extra attribute and a missing event', async () => {
    const problems = await descriptionCheck();
    const editorOf = (manifest: Manifest) =>
      manifest.modules[1]!.declarations![0]! as ManifestDeclaration & {
        attributes: ManifestAttribute[];
        members: ManifestMember[];
        events: { name: string }[];
      };
    const withDefect = (defect: (editor: ReturnType<typeof editorOf>) => void): string[] => {
      const manifest = describedEditor();
      defect(editorOf(manifest));
      return problems(manifest);
    };
    expect(problems(describedEditor())).toEqual([]);
    expect(withDefect((editor) => (editor.members[0]!.readonly = false))).toEqual([
      'field value is not read-only',
    ]);
    expect(withDefect((editor) => (editor.members[0]!.attribute = 'value'))).toEqual([
      'field value has an attribute',
    ]);
    expect(withDefect((editor) => (editor.members[1]!.attribute = 'engine'))).toEqual([
      'field engine has an attribute',
    ]);
    expect(
      withDefect((editor) => editor.attributes.splice(1, 1)), // format
    ).toEqual(['attributes missing: format']);
    expect(
      withDefect((editor) =>
        editor.attributes.push({ name: 'value', inheritedFrom: { name: 'TpFormElement' } }),
      ),
    ).toEqual(['attributes not in the contract: value']);
    expect(withDefect((editor) => editor.events.splice(4, 1))).toEqual([
      'events missing: tp-text-editor-ready',
    ]);
  });
});
