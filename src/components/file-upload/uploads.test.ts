import { describe, expect, it } from 'vitest';
import { progressPercentage, UploadQueue, type UploadOutcome } from './uploads.js';

function harness(concurrency = 2) {
  const log: string[] = [];
  const outcomes = new Map<string, UploadOutcome>();
  const resolvers = new Map<
    string,
    {
      resolve: (v: unknown) => void;
      reject: (e: unknown) => void;
      signal: AbortSignal;
      progress: (p: number | null) => void;
    }
  >();
  const queue = new UploadQueue({
    concurrency: () => concurrency,
    run: (id, signal, progress) =>
      new Promise((resolve, reject) => resolvers.set(id, { resolve, reject, signal, progress })),
    started: (id) => log.push(`start ${id}`),
    progressed: (id, value) => log.push(`progress ${id} ${value}`),
    settled: (id, outcome) => {
      outcomes.set(id, outcome);
      log.push(`settle ${id} ${outcome.status}`);
    },
  });
  return { queue, log, outcomes, resolvers };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('UploadQueue', () => {
  it('runs in order with bounded concurrency', async () => {
    const { queue, log, resolvers } = harness(2);
    for (const id of ['a', 'b', 'c']) queue.enqueue(id);
    expect(log).toEqual(['start a', 'start b']);
    resolvers.get('a')!.resolve('ok');
    await tick();
    expect(log).toEqual(['start a', 'start b', 'settle a complete', 'start c']);
  });

  it('reports errors, progress and aborts', async () => {
    const { queue, log, outcomes, resolvers } = harness(3);
    queue.enqueue('a');
    queue.enqueue('b');
    resolvers.get('a')!.progress(40);
    resolvers.get('a')!.reject(new Error('500'));
    await tick();
    expect((outcomes.get('a') as { error: Error }).error.message).toBe('500');
    expect(queue.cancel('b')).toBe(true);
    expect(resolvers.get('b')!.signal.aborted).toBe(true);
    resolvers.get('b')!.progress(10);
    resolvers.get('b')!.resolve('late');
    await tick();
    expect(outcomes.get('b')).toEqual({ status: 'aborted' });
    expect(log.filter((line) => line.startsWith('progress'))).toEqual(['progress a 40']);
  });

  it('drops waiting transfers and cancels everything', async () => {
    const { queue, log } = harness(1);
    queue.enqueue('a');
    queue.enqueue('b');
    expect(queue.cancel('b')).toBe(true);
    queue.cancelAll();
    expect(queue.busy).toBe(false);
    expect(log).toEqual(['start a', 'settle a aborted']);
  });

  it('treats a synchronous throw as an error outcome', async () => {
    const outcomes: UploadOutcome[] = [];
    const queue = new UploadQueue({
      concurrency: () => 1,
      run: () => {
        throw new Error('sync');
      },
      started: () => {},
      progressed: () => {},
      settled: (_id, outcome) => outcomes.push(outcome),
    });
    queue.enqueue('a');
    await tick();
    expect(outcomes[0]!.status).toBe('error');
  });
});

describe('progressPercentage', () => {
  it('reads bytes or percentages and clamps', () => {
    expect(progressPercentage(50, 200)).toBe(25);
    expect(progressPercentage(140)).toBe(100);
    expect(progressPercentage(-3)).toBe(0);
    expect(progressPercentage(5, 0)).toBeNull();
    expect(progressPercentage(Number.NaN)).toBeNull();
  });
});
