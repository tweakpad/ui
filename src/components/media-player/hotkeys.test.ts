import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIA_STATE } from './context.js';
import {
  DEFAULT_MEDIA_HOTKEYS,
  defaultMediaActionValue,
  mediaInputInactive,
  resolveMediaHotkeys,
} from './hotkeys.js';
import { DEFAULT_MEDIA_GESTURES, resolveMediaGestures } from './gestures.js';

const config = { seekStep: 10, volumeStep: 0.05 };
const resolve = (options: Partial<Parameters<typeof resolveMediaHotkeys>[0]> = {}) =>
  resolveMediaHotkeys({ defaults: true, config, platform: 'windows', ...options });
const byKeys = (specs: ReturnType<typeof resolve>['specs']) =>
  Object.fromEntries(specs.map((spec) => [spec.keys, [spec.action, spec.value, spec.source]]));

describe('media default key map (sec-1920; contract proposal §3.7; V-43/V-47)', () => {
  it('registers the exact default map with root steps', () => {
    const { specs, problems } = resolve();
    expect(problems).toEqual([]);
    expect(specs).toHaveLength(DEFAULT_MEDIA_HOTKEYS.length);
    const map = byKeys(specs);
    expect(map).toMatchObject({
      Space: ['toggle-paused', undefined, 'default'],
      k: ['toggle-paused', undefined, 'default'],
      m: ['toggle-muted', undefined, 'default'],
      ArrowRight: ['seek-by', 10, 'default'],
      l: ['seek-by', 10, 'default'],
      ArrowLeft: ['seek-by', -10, 'default'],
      j: ['seek-by', -10, 'default'],
      ArrowUp: ['step-volume', 0.05, 'default'],
      ArrowDown: ['step-volume', -0.05, 'default'],
      Home: ['seek-to-percent', 0, 'default'],
      End: ['seek-to-percent', 100, 'default'],
      '>': ['step-playback-rate', 1, 'default'],
      '<': ['step-playback-rate', -1, 'default'],
      f: ['toggle-fullscreen', undefined, 'default'],
      c: ['toggle-captions', undefined, 'default'],
      i: ['toggle-picture-in-picture', undefined, 'default'],
    });
    for (let digit = 0; digit <= 9; digit++)
      expect(map[String(digit)]).toEqual(['seek-to-percent', digit * 10, 'default']);
  });

  it('follows seek-step and volume-step', () => {
    const map = byKeys(resolve({ config: { seekStep: 5, volumeStep: 0.1 } }).specs);
    expect(map.ArrowLeft?.[1]).toBe(-5);
    expect(map.l?.[1]).toBe(5);
    expect(map.ArrowUp?.[1]).toBe(0.1);
  });

  it('repeats step actions but never toggle actions', () => {
    const specs = resolve().specs;
    expect(specs.find((spec) => spec.keys === 'ArrowRight')?.repeat).toBe(true);
    expect(specs.find((spec) => spec.keys === 'ArrowUp')?.repeat).toBe(true);
    expect(specs.filter((spec) => spec.action.startsWith('toggle-')).every((s) => !s.repeat)).toBe(
      true,
    );
  });

  it('hotkeys="none" removes defaults but keeps authored bindings', () => {
    const { specs } = resolve({
      defaults: false,
      authored: [{ keys: 'p', action: 'toggle-paused' }],
    });
    expect(specs).toEqual([
      { keys: 'p', action: 'toggle-paused', value: undefined, repeat: false, source: 'authored' },
    ]);
  });
});

describe('tp-media-hotkey resolution (Library mp-l-bindings; V-44)', () => {
  it('a disabled authored binding suppresses only the default with the same keys', () => {
    const map = byKeys(
      resolve({ authored: [{ keys: 'k', action: 'toggle-paused', disabled: true }] }).specs,
    );
    expect(map.k).toBeUndefined();
    expect(map.Space).toEqual(['toggle-paused', undefined, 'default']);
  });

  it('an enabled authored binding overrides the default for its keys and comes first', () => {
    const { specs } = resolve({ authored: [{ keys: 'ArrowRight', action: 'seek-by', value: 30 }] });
    expect(specs[0]).toMatchObject({ keys: 'ArrowRight', value: 30, source: 'authored' });
    expect(specs.filter((spec) => spec.keys === 'ArrowRight')).toHaveLength(1);
    expect(byKeys(specs).l).toEqual(['seek-by', 10, 'default']);
  });

  it('a range pattern suppresses every digit and modifiers keep defaults distinct', () => {
    const map = byKeys(
      resolve({
        authored: [
          { keys: '0-9', action: 'seek-to-percent', disabled: true },
          { keys: 'Shift+f', action: 'toggle-picture-in-picture' },
        ],
      }).specs,
    );
    for (let digit = 0; digit <= 9; digit++) expect(map[String(digit)]).toBeUndefined();
    expect(map.f).toEqual(['toggle-fullscreen', undefined, 'default']);
    expect(map['Shift+f']).toEqual(['toggle-picture-in-picture', undefined, 'authored']);
  });

  it('authored values default from the action and the root steps', () => {
    const { specs } = resolve({
      defaults: false,
      config: { seekStep: 15, volumeStep: 0.2 },
      authored: [
        { keys: 'n', action: 'seek-by' },
        { keys: 'u', action: 'step-volume', value: null },
        { keys: 'r', action: 'step-playback-rate' },
      ],
    });
    expect(specs.map((spec) => spec.value)).toEqual([15, 0.2, 1]);
  });

  it('reports invalid patterns and unknown actions without registering them', () => {
    const { specs, problems } = resolve({
      defaults: false,
      authored: [
        { keys: 'Hyper+x', action: 'toggle-paused' },
        { keys: 'x', action: 'explode' },
        { keys: '', action: 'toggle-paused' },
      ],
    });
    expect(specs).toEqual([]);
    expect(problems.map((problem) => problem.keys)).toEqual(['Hyper+x', 'x', '']);
  });

  it('defaultMediaActionValue covers step actions only', () => {
    expect(defaultMediaActionValue('seek-by', config)).toBe(10);
    expect(defaultMediaActionValue('step-volume', config)).toBe(0.05);
    expect(defaultMediaActionValue('step-playback-rate', config)).toBe(1);
    expect(defaultMediaActionValue('toggle-paused', config)).toBeUndefined();
  });
});

describe('live restrictions for key and gesture inputs (mp-f-live)', () => {
  const live = { ...DEFAULT_MEDIA_STATE, streamType: 'live' as const, dvr: false };
  it('seek inputs are inactive live without DVR; rate inputs whenever live', () => {
    expect(mediaInputInactive('seek-by', live)).toBe(true);
    expect(mediaInputInactive('seek-to-percent', live)).toBe(true);
    expect(mediaInputInactive('seek-by', { ...live, dvr: true })).toBe(false);
    expect(mediaInputInactive('step-playback-rate', { ...live, dvr: true })).toBe(true);
    expect(mediaInputInactive('toggle-paused', live)).toBe(false);
    expect(mediaInputInactive('seek-by', DEFAULT_MEDIA_STATE)).toBe(false);
    expect(mediaInputInactive('step-playback-rate', DEFAULT_MEDIA_STATE)).toBe(false);
  });
});

describe('media default gesture set (sec-1921; contract proposal §3.8; V-45)', () => {
  it('registers the default video set with seek-step values', () => {
    const { specs } = resolveMediaGestures({ defaults: true, config: { ...config, seekStep: 5 } });
    expect(specs).toHaveLength(DEFAULT_MEDIA_GESTURES.length);
    expect(
      specs.map(({ type, pointer, region, action, value }) => [
        type,
        pointer,
        region,
        action,
        value,
      ]),
    ).toEqual([
      ['tap', 'mouse', undefined, 'toggle-paused', undefined],
      ['tap', 'touch', undefined, 'toggle-controls', undefined],
      ['doubletap', undefined, 'left', 'seek-by', -5],
      ['doubletap', undefined, 'right', 'seek-by', 5],
      ['doubletap', undefined, 'center', 'toggle-fullscreen', undefined],
    ]);
  });

  it('gestures="none" keeps only authored gestures', () => {
    const { specs } = resolveMediaGestures({
      defaults: false,
      config,
      authored: [{ type: 'doubletap', action: 'toggle-fullscreen' }],
    });
    expect(specs).toEqual([
      {
        type: 'doubletap',
        action: 'toggle-fullscreen',
        value: undefined,
        disabled: false,
        source: 'authored',
      },
    ]);
  });

  it('an authored gesture replaces the default with the same type, pointer and region', () => {
    const { specs } = resolveMediaGestures({
      defaults: true,
      config,
      authored: [
        { type: 'tap', pointer: 'mouse', action: 'toggle-paused', disabled: true },
        { type: 'doubletap', region: 'right', action: 'seek-by', value: 30 },
      ],
    });
    expect(specs.filter((spec) => spec.type === 'tap' && spec.pointer === 'mouse')).toEqual([
      expect.objectContaining({ disabled: true, source: 'authored' }),
    ]);
    expect(specs.filter((spec) => spec.region === 'right')).toEqual([
      expect.objectContaining({ value: 30, source: 'authored' }),
    ]);
    expect(specs[0]?.source).toBe('authored');
  });

  it('reports invalid authored gestures', () => {
    const { specs, problems } = resolveMediaGestures({
      defaults: false,
      config,
      authored: [
        { type: 'swipe', action: 'toggle-paused' },
        { type: 'tap', pointer: 'stylus', action: 'toggle-paused' },
        { type: 'tap', region: 'top', action: 'toggle-paused' },
        { type: 'tap', action: 'nope' },
      ],
    });
    expect(specs).toEqual([]);
    expect(problems).toHaveLength(4);
  });
});
