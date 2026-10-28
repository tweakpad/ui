/**
 * Tests of the module probes of the Tiptap adapter: a missing, incompatible or second copy of an
 * engine module rejects the mount with an error that names it.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { engineCopy } from '../shared/test-helpers.test.js';
import { probeTiptapModules } from './modules.js';
import { mountResult, stubTiptapModules, TIPTAP_MODULES } from './tiptap-stubs.test.js';

describe('uwg-te-req-engine-1: modules of one copy of the engine', () => {
  it('a second copy of the state module fails the mount naming it, with or without tables', async () => {
    const require = createRequire(import.meta.url);
    const url = pathToFileURL(require.resolve('prosemirror-state')).href;
    const copy = (await import(/* @vite-ignore */ `${url}?second-copy`)) as unknown;
    expect((copy as { Selection: unknown }).Selection).not.toBe(TIPTAP_MODULES.state.Selection);
    const { table, tables, ...plain } = TIPTAP_MODULES;
    void [table, tables];
    for (const modules of [
      { ...TIPTAP_MODULES, state: copy },
      { ...plain, state: copy },
    ]) {
      const { error } = await mountResult(modules);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('"state"');
      expect(error?.message).toContain('copy');
    }
  });

  it('a history module whose plugin is not of the state module fails the mount naming it', async () => {
    class Plugin {
      readonly spec = {};
    }
    const history = { ...TIPTAP_MODULES.history, history: () => new Plugin() };
    const { error } = await mountResult({ ...TIPTAP_MODULES, history });
    expect(error?.message).toContain('"history"');
  });

  it('every module from a real second copy of the engine fails the mount naming it', async () => {
    const copy = await engineCopy(
      (name) => name.startsWith('@tiptap/') || name.startsWith('prosemirror-'),
      {
        core: '@tiptap/core',
        state: '@tiptap/pm/state',
        history: '@tiptap/pm/history',
        starterKit: '@tiptap/starter-kit',
        list: '@tiptap/extension-list',
        table: '@tiptap/extension-table',
        tables: '@tiptap/pm/tables',
      },
    );
    try {
      expect(copy.modules['core']).not.toBe(TIPTAP_MODULES.core);
      // The modules of one copy belong together, whichever copy it is.
      expect(probeTiptapModules(copy.modules)).toBeNull();
      expect(probeTiptapModules(TIPTAP_MODULES)).toBeNull();
      expect(probeTiptapModules(stubTiptapModules().modules)).toBeNull();
      for (const name of ['core', 'state', 'history', 'starterKit', 'list', 'table', 'tables']) {
        const { error } = await mountResult({ ...TIPTAP_MODULES, [name]: copy.modules[name] });
        expect(error, name).toBeInstanceOf(Error);
        expect(error?.message, name).toContain(`"${name}"`);
        expect(error?.message, name).toContain('another copy of the engine');
      }
    } finally {
      copy.remove();
    }
  });
});
