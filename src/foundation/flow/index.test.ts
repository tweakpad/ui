import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FlowModel as FlowModelType } from './model/model.js';

// The flow engine is DOM-free (Widgets §6.3 Engine): no Lit, no globals, no events. This guard
// scans every non-test source under the folder and smoke-tests the public barrel.

const root = new URL('./', import.meta.url).pathname;

function sources(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}

const files = sources('.');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');

const FORBIDDEN: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /from\s+['"]lit(?:\/|['"])/, label: 'imports lit' },
  {
    pattern: /(?<![\w.$#])(?:document|window|navigator|globalThis)\.[A-Za-z_$]/,
    label: 'reads a DOM global',
  },
  { pattern: /new\s+(?:CustomEvent|Event)\s*\(/, label: 'constructs an Event' },
  { pattern: /\bdispatchEvent\s*\(/, label: 'dispatches an Event' },
  { pattern: /from\s+['"](?:\.\.\/)+services\.js['"]/, label: 'imports the Scheduler' },
  {
    pattern: /\b(?:requestAnimationFrame|setTimeout|setInterval)\s*\(/,
    label: 'schedules on a global timer',
  },
];

describe('flow engine sources', () => {
  it('stay free of DOM, Lit and event runtime usage', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = read(file);
      for (const { pattern, label } of FORBIDDEN) {
        const match = pattern.exec(text);
        if (match) offenders.push(`${file}: ${label} (${match[0].trim()})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('name HTMLElement/Window only in type positions of renderer.ts', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = read(file);
      for (const match of text.matchAll(/\b(HTMLElement|Window|Element)\b/g)) {
        if (!file.endsWith('renderer.ts')) {
          offenders.push(`${file}: ${match[1]}`);
          continue;
        }
        const before = text.slice(Math.max(0, match.index - 12), match.index);
        const after = text.slice(match.index + match[0].length, match.index + match[0].length + 2);
        if (/new\s+$|instanceof\s+$/.test(before) || after.startsWith('(') || after.startsWith('.'))
          offenders.push(`${file}: runtime use of ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('carry the xyflow attribution where upstream code is ported', () => {
    const attribution =
      /Adapted from xyflow packages\/[\w/.-]+ at 3d35b5731 \(MIT; see LICENSE\.xyflow\)\./;
    const ported = [
      'geometry.ts',
      'viewport.ts',
      'edges/paths.ts',
      'edges/endpoints.ts',
      'edges/markers.ts',
      'model/changes.ts',
      'model/indices.ts',
      'model/queries.ts',
    ];
    for (const file of ported) expect(read(file), file).toMatch(attribution);
    // Any file that claims an adaptation must cite a path and the pinned revision.
    for (const file of files) {
      const text = read(file);
      for (const line of text.split('\n')) {
        if (/Adapted from xyflow/.test(line))
          expect(line, `${file}: ${line.trim()}`).toMatch(attribution);
      }
    }
    expect(existsSync(join(root, 'LICENSE.xyflow'))).toBe(true);
  });
});

const CORE_SYMBOLS = [
  'FLOW_DOCUMENT_VERSION',
  'DEFAULT_NODE_SIZE_BY_SHAPE',
  'DEFAULT_EDGE_KIND',
  'DEFAULT_ROUTER_OPTIONS',
  'DEFAULT_LAYOUT_OPTIONS',
  'DEFAULT_ZOOM_LIMITS',
  'edgeKindOptions',
  'clampPointToExtent',
  'unionRects',
  'snapPoint',
  'SpatialIndex',
  'screenToFlow',
  'flowToScreen',
  'visibleRect',
  'viewportForBounds',
  'zoomToPoint',
  'zoomBy',
  'panBy',
  'centerOn',
  'clampViewport',
  'wheelZoomFactor',
  'autoPanVelocity',
  'interpolateViewport',
  'viewportsEqual',
  'buildIndices',
  'applyFlowChanges',
  'invertFlowChanges',
  'squashFlowChanges',
  'pruneNoopChanges',
  'expandRemoveCascade',
  'FlowHistory',
  'runBeforeHooks',
  'runAfterHooks',
  'topologicalOrder',
  'hasCycle',
  'wouldCreateCycle',
  'reachable',
  'connectedComponents',
  'nodesBounds',
  'nodeZ',
  'edgeZ',
  'validateConnection',
  'validateDocument',
  'serializeFlowDocument',
  'parseFlowDocument',
  'migrateFlowDocument',
  'normalizeNodeOrder',
  'FlowModel',
  'bezierPath',
  'straightPath',
  'smoothStepPath',
  'stepPath',
  'orthogonalPath',
  'flattenBezier',
  'pathBounds',
  'resolveEndpoint',
  'defaultPortGeometry',
  'resolveSide',
  'fallbackSide',
  'pointAlongPath',
  'labelAnchor',
  'longestSegmentAnchor',
  'markerId',
  'collectMarkers',
  'markerGeometry',
  'distanceToSegment',
  'distanceToPolyline',
  'hitTestPath',
] as const;

const OPTIONAL_SYMBOLS: Record<string, readonly string[]> = {
  router: ['OrthogonalRouter', 'createRoutingPlanner'],
  layout: [
    'LayeredLayoutEngine',
    'flowLayoutRequest',
    'layoutFlow',
    'alignNodes',
    'distributeNodes',
    'snapNodesToGrid',
  ],
  run: ['FlowRunState', 'flowRunGraph', 'FlowRunPlayer'],
};

const extrasPresent = Object.keys(OPTIONAL_SYMBOLS).every((folder) =>
  existsSync(join(root, folder, 'index.ts')),
);

describe('flow engine barrel', () => {
  it(
    'exports the engine core' +
      (extrasPresent ? ' and the router, layout and run modules' : ' (router/layout/run pending)'),
    async () => {
      const api: Record<string, unknown> = extrasPresent
        ? await import('./index.js')
        : Object.assign(
            {},
            await import('./defaults.js'),
            await import('./geometry.js'),
            await import('./spatial-index.js'),
            await import('./viewport.js'),
            await import('./model/indices.js'),
            await import('./model/changes.js'),
            await import('./model/history.js'),
            await import('./model/hooks.js'),
            await import('./model/queries.js'),
            await import('./model/validation.js'),
            await import('./model/serialization.js'),
            await import('./model/model.js'),
            await import('./edges/index.js'),
            await import('./renderer.js'),
          );
      const missing = CORE_SYMBOLS.filter((name) => api[name] === undefined);
      expect(missing).toEqual([]);
      if (extrasPresent) {
        const extras = Object.values(OPTIONAL_SYMBOLS)
          .flat()
          .filter((name) => api[name] === undefined);
        expect(extras).toEqual([]);
      }
      const model = new (api.FlowModel as typeof FlowModelType)({
        document: {
          version: 1,
          nodes: [
            {
              id: 'a',
              type: 't',
              position: { x: 0, y: 0 },
              size: { width: 100, height: 40 },
              data: {},
            },
            {
              id: 'b',
              type: 't',
              position: { x: 300, y: 0 },
              size: { width: 100, height: 40 },
              data: {},
            },
          ],
          edges: [{ id: 'e', source: 'a', target: 'b' }],
        },
      });
      expect(model.endpoints('e')?.source.side).toBe('right');
    },
  );
});
