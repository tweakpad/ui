import { describe, expect, it } from 'vitest';
import { EngineMountSession, type EngineMountControl } from './engine-session.js';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

class Instance {
  destroyed = 0;
  constructor(
    readonly name: string,
    readonly log: string[],
    readonly failDestroy = false,
  ) {}
  destroy(): void {
    this.destroyed += 1;
    this.log.push(`destroy ${this.name}`);
    if (this.failDestroy) throw new Error(`${this.name} cannot be destroyed`);
  }
}

function setup() {
  const log: string[] = [];
  const errors: unknown[] = [];
  const session = new EngineMountSession<Instance>({
    attached: (instance) => void log.push(`attached ${instance.name}`),
    ready: (instance) => void log.push(`ready ${instance.name}`),
    detaching: (instance) => void log.push(`detaching ${instance.name}`),
    failed: (error) => {
      errors.push(error);
      log.push('failed');
    },
  });
  const controls: EngineMountControl[] = [];
  const start = (mount: (control: EngineMountControl) => Instance | Promise<Instance>) =>
    session.start((control) => {
      controls.push(control);
      return mount(control);
    });
  return { session, log, errors, controls, start };
}

describe('EngineMountSession (map-f-mount, uwg-te-req-engine-7)', () => {
  it('attaches a synchronous result a microtask later and an asynchronous one on arrival', async () => {
    const { session, log, start } = setup();
    const first = new Instance('a', log);
    start(() => first);
    expect(session.mounting).toBe(true);
    expect(session.instance).toBeNull();
    await flush();
    expect(session.mounting).toBe(false);
    expect(session.instance).toBe(first);
    session.teardown();
    const pending = deferred<Instance>();
    start(() => pending.promise);
    await flush();
    expect(session.mounting).toBe(true);
    const second = new Instance('b', log);
    pending.resolve(second);
    await flush();
    expect(session.instance).toBe(second);
    expect(log).toEqual(['attached a', 'detaching a', 'destroy a', 'attached b']);
  });

  it('V-835: destroys a superseded result on arrival', async () => {
    const { session, log, controls, start } = setup();
    const slow = deferred<Instance>();
    start(() => slow.promise);
    const replacement = new Instance('b', log);
    start(() => replacement);
    expect(controls[0]!.signal.aborted).toBe(true);
    expect(controls[0]!.live()).toBe(false);
    await flush();
    const superseded = new Instance('a', log);
    slow.resolve(superseded);
    await flush();
    expect(superseded.destroyed).toBe(1);
    expect(session.instance).toBe(replacement);
    expect(log).toEqual(['attached b', 'destroy a']);
  });

  it('V-835: reports ready once, after the instance is attached', async () => {
    const { log, controls, start } = setup();
    start((control) => {
      // An engine that reports ready while it mounts, before its result arrives.
      control.ready();
      control.ready();
      return new Instance('a', log);
    });
    expect(log).toEqual([]);
    await flush();
    expect(log).toEqual(['attached a', 'ready a']);
    controls[0]!.ready();
    expect(log).toEqual(['attached a', 'ready a']);

    const late = setup();
    late.start(() => new Instance('b', late.log));
    await flush();
    expect(late.log).toEqual(['attached b']);
    late.controls[0]!.ready();
    late.controls[0]!.ready();
    expect(late.log).toEqual(['attached b', 'ready b']);
  });

  it('ignores the callbacks of a superseded session', async () => {
    const { session, log, errors, controls, start } = setup();
    start(() => new Instance('a', log));
    await flush();
    start(() => new Instance('b', log));
    await flush();
    const [stale, current] = controls;
    stale!.ready();
    stale!.fail(new Error('stale'));
    expect(stale!.live()).toBe(false);
    expect(current!.live()).toBe(true);
    expect(errors).toEqual([]);
    expect(session.instance?.name).toBe('b');
    expect(log).toEqual(['attached a', 'detaching a', 'destroy a', 'attached b']);
  });

  it('routes a throw and a rejection to failed', async () => {
    const thrown = setup();
    const error = new Error('style');
    thrown.start(() => {
      throw error;
    });
    expect(thrown.errors).toEqual([error]);
    expect(thrown.controls[0]!.signal.aborted).toBe(true);
    expect(thrown.session.mounting).toBe(false);

    const rejected = setup();
    rejected.start(() => Promise.reject(error));
    expect(rejected.errors).toEqual([]);
    await flush();
    expect(rejected.errors).toEqual([error]);
    expect(rejected.controls[0]!.live()).toBe(false);
    expect(rejected.session.mounting).toBe(false);
    expect(rejected.log).toEqual(['failed']);
  });

  it('ends a mount on a fatal engine error: detach, destroy, then failed', async () => {
    const { session, log, errors, controls, start } = setup();
    const instance = new Instance('a', log, true);
    start(() => instance);
    await flush();
    const fatal = new Error('context lost');
    controls[0]!.fail(fatal);
    controls[0]!.fail(new Error('again'));
    expect(errors).toEqual([fatal]);
    expect(session.instance).toBeNull();
    expect(controls[0]!.signal.aborted).toBe(true);
    // The failing destroy is swallowed: the engine already failed.
    expect(log).toEqual(['attached a', 'detaching a', 'destroy a', 'failed']);
  });

  it('fails a pending mount on a fatal error and destroys its late result', async () => {
    const { session, log, errors, controls, start } = setup();
    const pending = deferred<Instance>();
    start(() => pending.promise);
    const fatal = new Error('engine crashed');
    controls[0]!.fail(fatal);
    expect(errors).toEqual([fatal]);
    expect(session.mounting).toBe(false);
    const late = new Instance('a', log);
    pending.resolve(late);
    await flush();
    expect(late.destroyed).toBe(1);
    expect(session.instance).toBeNull();
    expect(log).toEqual(['failed', 'destroy a']);
  });

  it('aborts the signal on teardown', async () => {
    const { session, log, controls, start } = setup();
    expect(session.teardown()).toBeNull();
    const instance = new Instance('a', log);
    start(() => instance);
    await flush();
    const signal = controls[0]!.signal;
    expect(signal.aborted).toBe(false);
    expect(session.teardown()).toBe(instance);
    expect(signal.aborted).toBe(true);
    expect(controls[0]!.live()).toBe(false);
    expect(session.instance).toBeNull();
    expect(instance.destroyed).toBe(1);
    expect(session.teardown()).toBeNull();

    const pending = deferred<Instance>();
    start(() => pending.promise);
    expect(session.teardown()).toBeNull();
    expect(controls[1]!.signal.aborted).toBe(true);
    const late = new Instance('b', log);
    pending.resolve(late);
    await flush();
    expect(late.destroyed).toBe(1);
    expect(log).toEqual(['attached a', 'detaching a', 'destroy a', 'destroy b']);
  });

  it('lets a failing destroy throw from teardown after the mount has ended', async () => {
    const { session, log, controls, start } = setup();
    start(() => new Instance('a', log, true));
    await flush();
    expect(() => session.teardown()).toThrow('a cannot be destroyed');
    expect(session.instance).toBeNull();
    expect(controls[0]!.live()).toBe(false);
  });
});
