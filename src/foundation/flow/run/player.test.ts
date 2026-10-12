import { describe, expect, it } from 'vitest';
import type { FlowDocument } from '../types.js';
import { FlowRunPlayer } from './player.js';
import { FlowRunState, flowRunGraph } from './state.js';
import type { FlowRunEvent, FlowTicker } from './types.js';

const document: FlowDocument = {
  version: 1,
  nodes: Array.from({ length: 6 }, (_, index) => ({
    id: `n${index}`,
    type: 't',
    position: { x: 0, y: 0 },
    data: {},
  })),
  edges: Array.from({ length: 5 }, (_, index) => ({
    id: `e${index}`,
    source: `n${index}`,
    target: `n${index + 1}`,
  })),
};
const graph = flowRunGraph(document);

/** A linear trace: each node starts and completes, with 100 ms between events. */
function trace(seq = true): FlowRunEvent[] {
  const events: FlowRunEvent[] = [{ type: 'run_started', at: 0 }];
  let time = 0;
  for (let index = 0; index < 6; index += 1) {
    time += 100;
    events.push({ type: 'node_started', nodeId: `n${index}`, at: time });
    time += 100;
    events.push({ type: 'node_completed', nodeId: `n${index}`, at: time });
  }
  events.push({ type: 'run_completed', at: time + 100 });
  return seq ? events.map((event, index) => ({ ...event, seq: index + 1 })) : events;
}

class FakeTicker implements FlowTicker {
  time = 0;
  readonly queue: Array<{ due: number; callback: () => void; id: number }> = [];
  #next = 0;

  now(): number {
    return this.time;
  }

  schedule(callback: () => void, delayMs: number): () => void {
    const id = (this.#next += 1);
    this.queue.push({ due: this.time + delayMs, callback, id });
    return () => {
      const at = this.queue.findIndex((entry) => entry.id === id);
      if (at >= 0) this.queue.splice(at, 1);
    };
  }

  /** Advances the clock, firing due callbacks in order. */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      this.queue.sort((a, b) => a.due - b.due || a.id - b.id);
      const next = this.queue[0];
      if (!next || next.due > target) break;
      this.queue.shift();
      this.time = next.due;
      next.callback();
    }
    this.time = target;
  }
}

function replay(events: FlowRunEvent[], count: number): string {
  const state = new FlowRunState(graph);
  for (let index = 0; index < count; index += 1) state.apply(events[index]!);
  return serialize(state.run);
}

function serialize(run: ReturnType<FlowRunState['snapshot']>): string {
  return JSON.stringify({
    status: run.status,
    lastSeq: run.lastSeq,
    applied: run.applied,
    nodes: [...run.nodes].map(([id, node]) => [
      id,
      node.status,
      node.attempts,
      node.startedAt,
      node.endedAt,
    ]),
    edges: [...run.edges].map(([id, edge]) => [id, edge.status]),
  });
}

describe('FlowRunPlayer', () => {
  it('seeks through snapshots to the same state as a replay', () => {
    const events = trace();
    const player = new FlowRunPlayer(graph, { trace: events, snapshotInterval: 4 });
    expect(player.length).toBe(events.length);
    expect(player.index).toBe(0);
    expect(player.mode).toBe('trace');
    player.seek(events.length);
    expect(player.snapshotCount).toBe(1 + Math.floor(events.length / 4));
    for (const target of [9, 3, 11, 0, 13, 5, events.length]) {
      player.seek(target);
      expect(player.index).toBe(target);
      expect(serialize(player.state)).toBe(replay(events, target));
    }
    player.dispose();
  });

  it('steps forward and back and clamps at both ends', () => {
    const events = trace();
    const player = new FlowRunPlayer(graph, { trace: events });
    const seen: number[] = [];
    player.subscribe((instance) => seen.push(instance.index));
    expect(player.back()).toBe(false);
    expect(player.step()).toBe(true);
    expect(player.state.status).toBe('running');
    expect(player.step()).toBe(true);
    expect(player.state.nodes.get('n0')!.status).toBe('running');
    expect(player.back()).toBe(true);
    expect(player.state.nodes.get('n0')!.status).toBe('idle');
    player.toEnd();
    expect(player.index).toBe(events.length);
    expect(player.step()).toBe(false);
    player.toStart();
    expect(player.index).toBe(0);
    expect(seen).toEqual([1, 2, 1, events.length, 0]);
    player.seek(99);
    expect(player.index).toBe(events.length);
    player.dispose();
  });

  it('thins snapshots past the cap', () => {
    const events = trace();
    const player = new FlowRunPlayer(graph, {
      trace: events,
      snapshotInterval: 1,
      maxSnapshots: 4,
    });
    player.toEnd();
    expect(player.snapshotCount).toBeLessThanOrEqual(4);
    for (const target of [7, 2, 12]) {
      player.seek(target);
      expect(serialize(player.state)).toBe(replay(events, target));
    }
    player.dispose();
  });

  it('plays with the trace timing scaled by the speed and stops at the end', () => {
    const events = trace();
    const ticker = new FakeTicker();
    const player = new FlowRunPlayer(graph, { trace: events, ticker });
    player.play(2);
    expect(player.playing).toBe(true);
    expect(player.speed).toBe(2);
    expect(player.index).toBe(0);
    ticker.advance(0);
    expect(player.index).toBe(1);
    ticker.advance(49);
    expect(player.index).toBe(1);
    ticker.advance(1);
    expect(player.index).toBe(2);
    ticker.advance(50 * 5);
    expect(player.index).toBe(7);
    player.pause();
    expect(player.playing).toBe(false);
    ticker.advance(1000);
    expect(player.index).toBe(7);
    player.play(1);
    ticker.advance(100 * (events.length - 7));
    expect(player.index).toBe(events.length);
    expect(player.playing).toBe(false);
    expect(ticker.queue).toEqual([]);
    player.dispose();
  });

  it('caps long gaps at maxStepDelay', () => {
    const events: FlowRunEvent[] = [
      { type: 'run_started', at: 0 },
      { type: 'node_started', nodeId: 'n0', at: 100_000 },
    ];
    const ticker = new FakeTicker();
    const player = new FlowRunPlayer(graph, { trace: events, ticker, maxStepDelay: 500 });
    player.play();
    ticker.advance(0);
    expect(player.index).toBe(1);
    ticker.advance(500);
    expect(player.index).toBe(2);
    player.dispose();
  });

  it('follows live pushes at the end and keeps a seeked position otherwise', () => {
    const ticker = new FakeTicker();
    const player = new FlowRunPlayer(graph, { ticker });
    expect(player.length).toBe(0);
    player.push({ type: 'run_started', at: 0, seq: 1 });
    expect(player.mode).toBe('live');
    expect(player.index).toBe(1);
    expect(player.state.status).toBe('running');
    player.push({ type: 'node_started', nodeId: 'n0', at: 10, seq: 2 });
    expect(player.state.nodes.get('n0')!.status).toBe('running');
    player.back();
    expect(player.index).toBe(1);
    player.push({ type: 'node_completed', nodeId: 'n0', at: 20, seq: 3 });
    expect(player.index).toBe(1);
    expect(player.length).toBe(3);
    expect(player.state.nodes.get('n0')!.status).toBe('idle');
    player.follow = true;
    expect(player.index).toBe(3);
    expect(player.state.nodes.get('n0')!.status).toBe('success');
    const silent = new FlowRunPlayer(graph, { ticker, follow: false });
    silent.push({ type: 'run_started', at: 0 });
    expect(silent.index).toBe(0);
    silent.toEnd();
    expect(silent.state.status).toBe('running');
    silent.dispose();
    player.dispose();
  });

  it('keeps playing through pushed events in live mode', () => {
    const ticker = new FakeTicker();
    const player = new FlowRunPlayer(graph, { ticker });
    player.push({ type: 'run_started', at: 0 });
    player.play();
    expect(player.playing).toBe(true);
    player.push({ type: 'node_started', nodeId: 'n0', at: 100 });
    expect(player.index).toBe(1);
    ticker.advance(100);
    expect(player.index).toBe(2);
    expect(player.playing).toBe(true);
    player.dispose();
    expect(ticker.queue).toEqual([]);
  });

  it('replaces the trace and resets', () => {
    const player = new FlowRunPlayer(graph, { trace: trace() });
    player.toEnd();
    player.setTrace(trace(false).slice(0, 3));
    expect(player.mode).toBe('trace');
    expect(player.index).toBe(0);
    expect(player.length).toBe(3);
    expect(player.state.status).toBe('idle');
    player.toEnd();
    expect(player.state.nodes.get('n0')!.status).toBe('success');
    player.dispose();
  });

  it('throws without a ticker when playing outside a timer environment', () => {
    const player = new FlowRunPlayer(graph, { trace: trace() });
    expect(() => player.play()).not.toThrow();
    player.pause();
    player.dispose();
  });
});
