import type { LayoutGraph } from './graph.js';
import type { Layering } from './layering.js';

/**
 * The layered graph the ordering and coordinate passes work on: real nodes plus one dummy per
 * layer an edge spans, connected by unit-length edges. Chains remember the dummies of each
 * original edge so bend points can be read back.
 */
export interface LayeredGraph {
  count: number;
  realCount: number;
  layer: Int32Array;
  /** Members per layer; the ordering pass permutes these. */
  layers: number[][];
  width: Float64Array;
  height: Float64Array;
  isDummy: Uint8Array;
  edgeSource: Int32Array;
  edgeTarget: Int32Array;
  edgeWeight: Float64Array;
  sourceFraction: Float64Array;
  targetFraction: Float64Array;
  /** Original edge index per unit edge. */
  edgeOrigin: Int32Array;
  out: number[][];
  in: number[][];
  /** Dummy chains per original edge index, source to target. */
  chains: Map<number, number[]>;
  dummies: number;
  /** Original edges that received no dummies because of the cap. */
  skipped: number[];
}

export function insertDummies(
  graph: LayoutGraph,
  layering: Layering,
  maxDummies = 20000,
): LayeredGraph {
  const layer: number[] = Array.from(layering.layer);
  const width: number[] = Array.from(graph.width);
  const height: number[] = Array.from(graph.height);
  const isDummy: number[] = new Array(graph.count).fill(0);
  const edgeSource: number[] = [];
  const edgeTarget: number[] = [];
  const edgeWeight: number[] = [];
  const sourceFraction: number[] = [];
  const targetFraction: number[] = [];
  const edgeOrigin: number[] = [];
  const chains = new Map<number, number[]>();
  const skipped: number[] = [];
  let dummies = 0;
  const unit = (
    source: number,
    target: number,
    weight: number,
    sf: number,
    tf: number,
    origin: number,
  ): void => {
    edgeSource.push(source);
    edgeTarget.push(target);
    edgeWeight.push(weight);
    sourceFraction.push(sf);
    targetFraction.push(tf);
    edgeOrigin.push(origin);
  };
  for (const edge of graph.edges) {
    const span = layer[edge.target]! - layer[edge.source]!;
    if (span <= 0) continue;
    if (span === 1) {
      unit(
        edge.source,
        edge.target,
        edge.weight,
        edge.sourceFraction,
        edge.targetFraction,
        edge.index,
      );
      continue;
    }
    if (dummies + span - 1 > maxDummies) {
      skipped.push(edge.index);
      continue;
    }
    const chain: number[] = [];
    let previous = edge.source;
    for (let step = 1; step < span; step += 1) {
      const dummy = layer.length;
      layer.push(layer[edge.source]! + step);
      width.push(0);
      height.push(0);
      isDummy.push(1);
      chain.push(dummy);
      dummies += 1;
      unit(previous, dummy, edge.weight, step === 1 ? edge.sourceFraction : 0, 0, edge.index);
      previous = dummy;
    }
    unit(previous, edge.target, edge.weight, 0, edge.targetFraction, edge.index);
    chains.set(edge.index, chain);
  }
  const count = layer.length;
  const layers: number[][] = Array.from({ length: layering.count }, () => []);
  for (let node = 0; node < count; node += 1) layers[layer[node]!]!.push(node);
  const out: number[][] = Array.from({ length: count }, () => []);
  const incoming: number[][] = Array.from({ length: count }, () => []);
  for (let edge = 0; edge < edgeSource.length; edge += 1) {
    out[edgeSource[edge]!]!.push(edge);
    incoming[edgeTarget[edge]!]!.push(edge);
  }
  return {
    count,
    realCount: graph.count,
    layer: Int32Array.from(layer),
    layers,
    width: Float64Array.from(width),
    height: Float64Array.from(height),
    isDummy: Uint8Array.from(isDummy),
    edgeSource: Int32Array.from(edgeSource),
    edgeTarget: Int32Array.from(edgeTarget),
    edgeWeight: Float64Array.from(edgeWeight),
    sourceFraction: Float64Array.from(sourceFraction),
    targetFraction: Float64Array.from(targetFraction),
    edgeOrigin: Int32Array.from(edgeOrigin),
    out,
    in: incoming,
    chains,
    dummies,
    skipped,
  };
}

/** The dummy chain of an original edge as node indices, or an empty list. */
export function extractBendPoints(layered: LayeredGraph, originalEdge: number): number[] {
  return layered.chains.get(originalEdge) ?? [];
}
