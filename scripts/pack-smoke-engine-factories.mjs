// The engine-factory check of the package smoke test (`pack-smoke.mjs`), which the adapters' unit
// tests run against the sources as well. The engine factories need no engine package, which the
// consumer does not install: called with empty modules, and with modules that record each read,
// each builds an engine with exactly the 30 base capabilities and no table one, reserves neither
// select-all nor Escape, has a mount and mounts nothing, reading no module a mount needs but the
// reads `FACTORY_READS` admits.

/** The modules that only a mount needs. */
export const MOUNT_MODULES = new Set([
  'core',
  'state',
  'history',
  'starterKit',
  'list',
  'lexical',
  'extension',
  'richText',
  'selection',
  'link',
  'markdown',
  'code',
  'a11y',
  'html',
]);

/**
 * The reads of a mount's modules that a factory may make, as `<module>` and `<module>.<member>`:
 * the Lexical factory reads the engine's own platform flag, `IS_APPLE` of `lexical`, when it is
 * called, for the chords it reserves (`uwg-te-req-engine-11`), and nothing else of it.
 */
export const FACTORY_READS = Object.freeze({
  createTiptapEngine: Object.freeze([]),
  createLexicalEngine: Object.freeze(['lexical', 'lexical.IS_APPLE']),
});

/**
 * The problems of the factory exported as `name` (empty when it passes) and the engine it builds
 * from empty modules. `base` lists the base capability identifiers.
 */
export function engineFactoryProblems(name, factory, base) {
  const reads = new Set();
  // Modules that record each read: a mount module records the reads of its members too.
  const recording = (prefix) =>
    new Proxy(
      {},
      {
        get: (target, key) => {
          const read = prefix + String(key);
          reads.add(read);
          return prefix === '' && MOUNT_MODULES.has(read) ? recording(`${read}.`) : undefined;
        },
      },
    );
  const engines = [factory({}), factory(recording(''))];
  const problems = [];
  for (const engine of engines) {
    const capabilities = [...engine.capabilities];
    if (capabilities.length !== base.length || base.some((id) => !engine.capabilities.has(id)))
      problems.push('capabilities ' + capabilities.join(' '));
    if (capabilities.some((id) => /table/u.test(id))) problems.push('a table capability');
    if (engine.reservedKeys.some((key) => /^(?:mod\+a|escape)$/iu.test(key)))
      problems.push('reserved ' + engine.reservedKeys.join(' '));
    if (typeof engine.mount !== 'function') problems.push('no mount');
  }
  const admitted = FACTORY_READS[name] ?? [];
  const mounted = [...reads].filter(
    (read) => MOUNT_MODULES.has(read.split('.')[0]) && !admitted.includes(read),
  );
  if (mounted.length) problems.push('read ' + mounted.join(' '));
  return { problems, engine: engines[0] };
}
