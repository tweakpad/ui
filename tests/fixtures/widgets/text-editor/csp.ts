/**
 * Bootstrap of the strict-policy page `csp.html` (C-451, V-591): the page's policy allows styles
 * only from the origin, from constructed sheets and from elements with the page's nonce, never
 * from `style` attributes. Paired `tp-text-editor` instances of both engines run under three
 * content-security scopes: `sheets` (no service: generated styles go to adopted sheets), `nonce`
 * (a `ContentSecurityService` with the page's nonce: nonced `style` elements) and `no-styles`
 * (`disableStyleElements`: no generated style at all). The page itself writes no `style`
 * attribute. Query parameters: `?only=<variants or ids>` and `?engine=tiptap|lexical`. Driven only
 * through the Chrome DevTools MCP (see README.md).
 */
import '../../../../src/register.js';
import '../../../../src/register/widgets.js';
import { ContentSecurityService } from '../../../../src/foundation/content-security.js';
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import * as api from './api.js';
import { ElementFixtureEditor, elementEditorOf } from './element-editor.js';
import { loadCorpus, loadFixtureEngines } from './engine-modules.js';
import {
  check,
  editorOf,
  fixture,
  nodeLabel,
  report,
  summarize,
  type EngineName,
  type Report,
} from './harness.js';

/** The nonce of the page's policy (`csp.html`). */
export const CSP_NONCE = 'tpFixtureCsp';

// Violations, from before the bootstrap (buffered reports) and as they happen ------------------

interface ViolationRecord {
  readonly directive: string;
  readonly blocked: string;
  readonly sample: string;
  readonly source: string;
  readonly line: number;
  readonly target: string;
}
const violations: ViolationRecord[] = [];
const seen = new Set<string>();
function addViolation(record: ViolationRecord): void {
  const key = JSON.stringify(record);
  if (seen.has(key)) return;
  seen.add(key);
  violations.push(record);
}
document.addEventListener(
  'securitypolicyviolation',
  (event) =>
    addViolation({
      directive: event.violatedDirective,
      blocked: event.blockedURI,
      sample: event.sample,
      source: event.sourceFile,
      line: event.lineNumber,
      target: nodeLabel(event.composedPath()[0] as Node | null),
    }),
  true,
);
try {
  const reports = new ReportingObserver(
    (list) => {
      for (const entry of list) {
        const body = entry.body as unknown as Record<string, unknown> | null;
        addViolation({
          directive: String(body?.['effectiveDirective'] ?? ''),
          blocked: String(body?.['blockedURL'] ?? ''),
          sample: String(body?.['sample'] ?? ''),
          source: String(body?.['sourceFile'] ?? ''),
          line: Number(body?.['lineNumber'] ?? 0),
          target: 'report',
        });
      }
    },
    { types: ['csp-violation'], buffered: true },
  );
  reports.observe();
} catch {
  // No reporting observer: the event listener alone records violations.
}

// Page --------------------------------------------------------------------------------------

const PAGE_CSS = `
body { margin: 0; background: var(--tp-background); color: var(--tp-foreground); font-family: var(--tp-font-sans); }
main { box-sizing: border-box; max-width: 1240px; margin: 0 auto; padding: 24px 16px; display: grid; gap: 20px; }
h1 { margin: 0; font-size: var(--tp-text-xl); }
main > button { justify-self: start; }
.meta { margin: 0; color: var(--tp-muted-foreground); font-size: var(--tp-text-sm); }
.variant { display: grid; gap: 8px; }
.variant h2 { margin: 0; font-size: var(--tp-text-base); }
.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.slot { min-inline-size: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; align-content: start; }
.slot-label { margin: 0; display: flex; gap: 8px; font-size: var(--tp-text-sm); color: var(--tp-muted-foreground); }
.slot-label output { font-weight: 600; }
`;

const params = new URLSearchParams(location.search);
const only = new Set(
  (params.get('only') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);
const engineFilter = params.get('engine');
const ENGINES: readonly EngineName[] = ['tiptap', 'lexical'];
const wanted = (engine: EngineName) => !engineFilter || engineFilter === engine;

// A constructed sheet, which the policy does not restrict.
const pageSheet = new CSSStyleSheet();
pageSheet.replaceSync(PAGE_CSS);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageSheet];
fixture.level = 0;

const corpus = loadCorpus();
const html = corpus.get('state')?.html ?? '<p>Field notes</p>';
const fixtureEngines = await loadFixtureEngines({ wanted });

type Scope = 'sheets' | 'nonce' | 'no-styles';
const SCOPES: readonly { readonly variant: Scope; readonly title: string }[] = [
  { variant: 'sheets', title: 'Adopted sheets (no policy service)' },
  { variant: 'nonce', title: 'Nonced style elements' },
  { variant: 'no-styles', title: 'No generated styles' },
];

const instances = document.getElementById('instances')!;
const meta = document.getElementById('meta')!;
const summary = document.getElementById('summary')!;
const services: ContentSecurityService[] = [];
const scopes = new Map<string, Scope>();

for (const { variant, title } of SCOPES) {
  const engines = ENGINES.filter(
    (engine) =>
      wanted(engine) && (only.size === 0 || only.has(variant) || only.has(`${engine}-${variant}`)),
  );
  if (engines.length === 0) continue;
  const section = document.createElement('section');
  section.className = 'variant';
  section.dataset['variant'] = variant;
  const heading = document.createElement('h2');
  heading.textContent = title;
  const pair = document.createElement('div');
  pair.className = 'pair';
  section.append(heading, pair);
  instances.append(section);
  if (variant === 'nonce') services.push(new ContentSecurityService(pair, { nonce: CSP_NONCE }));
  if (variant === 'no-styles')
    services.push(new ContentSecurityService(pair, { disableStyleElements: true }));
  for (const engine of engines) {
    const id = `${engine}-${variant}`;
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset['instance'] = id;
    const label = document.createElement('p');
    label.className = 'slot-label';
    label.dataset['fixtureChrome'] = '';
    const name = document.createElement('span');
    name.textContent = id;
    const status = document.createElement('output');
    status.textContent = 'idle';
    label.append(name, status);
    slot.append(label);
    pair.append(slot);
    const configured: TextEditorEngine | null = fixtureEngines.createEngine(engine, 'full');
    const editor = new ElementFixtureEditor({
      id,
      variant: 'csp',
      engineName: engine,
      engine: configured,
      configured,
      parent: slot,
      levels: [],
      defaultValue: html,
      attributes: { label: 'Policy notes' },
    });
    fixture.editors.set(id, editor);
    scopes.set(id, variant);
    void editor.settled().then((value) => (status.textContent = value));
  }
}

// Page helpers ------------------------------------------------------------------------------

/** The first selector of each engine's base CSS, which identifies its rules. */
const ENGINE_SELECTORS: Readonly<Record<EngineName, string>> = {
  tiptap: '.ProseMirror',
  lexical: '[data-lexical-editor]',
};

/** Every shadow root in the composed tree of `root`, `root` included. */
function shadowTree(root: ShadowRoot): ShadowRoot[] {
  const roots = [root];
  for (let index = 0; index < roots.length; index++)
    for (const element of roots[index]!.querySelectorAll('*'))
      if (element.shadowRoot) roots.push(element.shadowRoot);
  return roots;
}

const holdsSelector = (css: string, selector: string): boolean => css.includes(`${selector} {`);
const sheetText = (sheet: CSSStyleSheet): string =>
  [...sheet.cssRules].map((rule) => rule.cssText).join('\n');

/**
 * The styles of an instance: where its engine CSS went (adopted sheets or `style` elements of its
 * shadow root), the nonce of every `style` element in its composed tree, and its editing root's
 * computed `white-space`.
 */
function styles(id: string) {
  const editor = elementEditorOf(id);
  const engine = editor.engineName ?? 'tiptap';
  const selector = ENGINE_SELECTORS[engine];
  const shadow = editor.shadow;
  const elements = [...shadow.querySelectorAll('style')];
  const tree = shadowTree(shadow);
  const allStyles = tree.flatMap((root) => [...root.querySelectorAll('style')]);
  const root = editor.root;
  return {
    scope: scopes.get(id),
    engineSheets: shadow.adoptedStyleSheets.filter((sheet) =>
      holdsSelector(sheetText(sheet), selector),
    ).length,
    engineStyleElements: elements.filter((style) =>
      holdsSelector(style.textContent ?? '', selector),
    ).length,
    styleElements: allStyles.length,
    unnonced: allStyles.filter((style) => style.nonce !== CSP_NONCE).length,
    rootWhiteSpace: root ? getComputedStyle(root).whiteSpace : null,
  };
}

/**
 * The policy checks of an instance (V-591): no violation on the page; the editing root keeps its
 * spaces (`white-space: pre-wrap`) in every scope, from the engine CSS or, with `no-styles`, from
 * the content part's inline mechanics; with `sheets` the engine CSS is an adopted sheet and no
 * `style` element exists; with `nonce` it is a `style` element of the shadow root and every
 * `style` element in the instance's tree carries the nonce; with `no-styles` neither exists. The
 * editing steps run separately (real input).
 */
function assertCsp(id: string): Report {
  const value = styles(id);
  const checks = [
    check('no policy violation on the page', violations.length === 0, violations.slice(0, 12)),
    check('ready', editorOf(id).status === 'ready', editorOf(id).status),
    check(
      'editing root white-space pre-wrap',
      value.rootWhiteSpace === 'pre-wrap',
      value.rootWhiteSpace,
    ),
  ];
  switch (value.scope) {
    case 'sheets':
      checks.push(
        check('engine CSS in one adopted sheet', value.engineSheets === 1, value.engineSheets),
        check('no style element in the tree', value.styleElements === 0, value.styleElements),
      );
      break;
    case 'nonce':
      checks.push(
        check(
          'engine CSS in one nonced style element',
          value.engineStyleElements === 1 && value.engineSheets === 0,
          value,
        ),
        check('every style element carries the nonce', value.unnonced === 0, value.unnonced),
      );
      break;
    case 'no-styles':
      checks.push(
        check(
          'no engine sheet and no engine style element',
          value.engineSheets === 0 && value.engineStyleElements === 0,
          value,
        ),
        check('no style element in the tree', value.styleElements === 0, value.styleElements),
      );
      break;
    default:
      checks.push(check('instance on this page', false, id));
  }
  return report(checks, { styles: value });
}

const textEditorAPI = {
  ...api,
  nonce: CSP_NONCE,
  violations: () => [...violations],
  styles,
  assertCsp,
  /** Ends the policy services, so that the scoped instances fall back to the document's policy. */
  disposeServices: () => {
    for (const service of services) service.dispose();
  },
  factories: fixtureEngines.factories,
  loadErrors: () => summarize(fixtureEngines.loadErrors),
};
(window as unknown as { textEditorAPI: typeof textEditorAPI }).textEditorAPI = textEditorAPI;

meta.textContent = [
  `nonce ${CSP_NONCE}`,
  engineFilter ? `engine ${engineFilter}` : '',
  only.size > 0 ? `only ${[...only].join(', ')}` : '',
]
  .filter(Boolean)
  .join('; ');

const READY_TIMEOUT = 10_000;
const statuses = await Promise.race([
  api.ready(),
  new Promise<Record<string, string>>((resolve) =>
    setTimeout(
      () =>
        resolve(
          Object.fromEntries([...fixture.editors.keys()].map((id) => [id, editorOf(id).status])),
        ),
      READY_TIMEOUT,
    ),
  ),
]);
const failed = Object.entries(statuses).filter(([, status]) => status !== 'ready');
summary.textContent =
  failed.length > 0
    ? `Not ready: ${failed.map(([id, status]) => `${id} (${status})`).join(', ')}.`
    : `All ${Object.keys(statuses).length} instances settled.`;
if (failed.length === 0) document.documentElement.dataset['fixtureReady'] = '';
else document.documentElement.dataset['fixtureError'] = failed.map(([id]) => id).join(' ');
