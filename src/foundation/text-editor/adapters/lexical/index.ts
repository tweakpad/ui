/**
 * The Lexical engine of the text editor (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine`,
 * `uwg-te-req-engine-1`–`-12`).
 *
 * The library does not depend on Lexical: pass the module namespaces you import yourself.
 *
 * ```ts
 * import * as lexical from 'lexical';
 * import * as extension from '@lexical/extension';
 * // … richText, history, selection, list, link, markdown, code, a11y, html and, for tables, table
 * editor.engine = createLexicalEngine({ lexical, extension, richText, history, selection, list,
 *   link, markdown, code, a11y, html, table });
 * ```
 *
 * The factory never throws and calls no engine: it fixes the capabilities, the reserved chords and
 * the node support. A mount checks the modules, creates a fresh editing root in the container,
 * builds the editor with the adapter's extension and the initial content, sets the root (the
 * engine renders synchronously, so the mount is ready right after) and adopts the base CSS.
 * `destroy` leaves the container empty; the engine's writes stay on the discarded root.
 */
import { engineCapabilities, type TextEditorCapability } from '../../capabilities.js';
import type { TextEditorEngine, TextEditorEngineContext } from '../../engine.js';
import { isSupportedNode, type TextEditorNodeDefinition } from '../../nodes.js';
import { resolvedDirection } from '../shared/content.js';
import { nodeOverrides, type TextEditorAdapterOptions } from '../shared/options.js';
import { lexicalReservedKeys } from './guards.js';
import { lexicalRuntime, openLexicalInstance } from './instance.js';
import {
  probeLexicalModules,
  type LexicalKlassLike,
  type TextEditorLexicalModules,
} from './modules.js';

export type { TextEditorLexicalModules } from './modules.js';

/** A node class that replaces the generated class of a custom node definition. */
export interface TextEditorLexicalNodeOverride {
  /**
   * The class registered in place of the generated one. Its JSON type is `tp-block-<name>` for a
   * block and `tp-inline-<name>` for an inline node, and its JSON holds the node's attribute
   * values in `attrs`.
   */
  readonly klass: LexicalKlassLike;
}

/**
 * Options of `createLexicalEngine` (`uwg-te-par-engine-1`): `css`, a sheet that replaces the
 * adapter's base CSS or a function that receives it and returns the sheet, and `nodes`, classes
 * that replace the generated classes of custom node definitions, by definition name.
 */
export type TextEditorLexicalOptions = TextEditorAdapterOptions<TextEditorLexicalNodeOverride>;

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/**
 * The capabilities of a modules object (`engineCapabilities`): tables with the table module, and
 * moving rows and columns when it can move rows.
 */
function capabilitiesOf(modules: unknown): ReadonlySet<TextEditorCapability> {
  const table = isObject(modules) ? modules['table'] : undefined;
  return engineCapabilities({
    tables: isObject(table),
    move: isObject(table) && typeof table['$moveTableRow'] === 'function',
  });
}

/**
 * Whether the engine binds its keys for an Apple platform: the `IS_APPLE` flag of the `lexical`
 * module, which its keydown table reads; `false` when the modules do not tell.
 */
function appleEngine(modules: unknown): boolean {
  const lexical = isObject(modules) ? modules['lexical'] : undefined;
  return isObject(lexical) && lexical['IS_APPLE'] === true;
}

/** Creates the Lexical engine. It never throws; problems with the modules reject the mount. */
export function createLexicalEngine(
  modules: TextEditorLexicalModules,
  options: TextEditorLexicalOptions = {},
): TextEditorEngine {
  const capabilities = capabilitiesOf(modules);
  const overrides = nodeOverrides(options);
  const engine: TextEditorEngine = Object.freeze({
    name: 'lexical',
    capabilities,
    // The engine's own platform flag, read when the factory is called (`uwg-te-req-engine-11`).
    reservedKeys: lexicalReservedKeys(appleEngine(modules)),
    supportsNode: (definition: TextEditorNodeDefinition) => isSupportedNode(definition, overrides),
    mount: (container: HTMLElement, context: TextEditorEngineContext) => {
      probeLexicalModules(modules);
      const rt = lexicalRuntime(engine, modules, options, context, {
        view: container.ownerDocument.defaultView,
        direction: () => resolvedDirection(container),
      });
      return openLexicalInstance(engine, rt, options, context, container);
    },
  });
  return engine;
}
