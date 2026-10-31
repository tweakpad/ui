import { describe, expect, it } from 'vitest';
import type { KeyShortcut } from '../../foundation/key-bindings.js';
import { createMediaMessages } from '../../foundation/media/messages.js';
import type { MediaState } from '../../foundation/media/state.js';
import { templateMarkup } from '../../template-markup.test.js';
import type { MediaButtonContext } from './button-state.js';
import { DEFAULT_MEDIA_STATE } from './context.js';
import {
  MEDIA_LAYOUT_CONTROLS,
  mediaLayoutSlice,
  mediaLayoutTooltip,
  mediaVideoLayoutVariant,
  parseMediaLayoutHide,
  type MediaLayoutTooltipControl,
} from './layout-state.js';
import { TpMediaAudioLayout, TpMediaVideoLayout } from './layouts.js';
import { mediaPopupScopeBrand } from './context.js';

const state = (patch: Partial<MediaState> = {}): MediaState => ({
  ...DEFAULT_MEDIA_STATE,
  ...patch,
});
const context: MediaButtonContext = {
  messages: createMediaMessages(),
  locale: 'en',
  capability: () => 'available',
};

describe('layout hide tokens (Library mp-l-layouts; V-66)', () => {
  it('parses a space- or comma-separated list of built-in controls', () => {
    const { hidden, unknown } = parseMediaLayoutHide('pip remote,  Fullscreen');
    expect([...hidden].sort()).toEqual(['fullscreen', 'pip', 'remote']);
    expect(unknown).toEqual([]);
    expect(parseMediaLayoutHide(null).hidden.size).toBe(0);
  });

  it('reports unknown tokens once and ignores them', () => {
    const { hidden, unknown } = parseMediaLayoutHide('pip chapters chapters');
    expect([...hidden]).toEqual(['pip']);
    expect(unknown).toEqual(['chapters']);
  });

  it('covers every built-in control of both layouts', () => {
    expect(MEDIA_LAYOUT_CONTROLS).toEqual([
      'play',
      'seek',
      'volume',
      'current-time',
      'time-slider',
      'remaining-time',
      'captions',
      'settings',
      'live',
      'remote',
      'pip',
      'fullscreen',
    ]);
  });
});

describe('video layout variant (automatic from the stream type)', () => {
  it('is on-demand, live, or live with DVR', () => {
    expect(mediaVideoLayoutVariant({ streamType: 'on-demand', dvr: false })).toBe('on-demand');
    expect(mediaVideoLayoutVariant({ streamType: 'unknown', dvr: false })).toBe('on-demand');
    expect(mediaVideoLayoutVariant({ streamType: 'live', dvr: false })).toBe('live');
    expect(mediaVideoLayoutVariant({ streamType: 'live', dvr: true })).toBe('live-dvr');
  });
});

describe('layout tooltips (visual label and Kbd of each button)', () => {
  it('shows the button’s state-dependent name and its published binding', () => {
    expect(mediaLayoutTooltip('play', state({ paused: true }), context, 10)).toEqual({
      label: 'Play',
      shortcut: { action: 'toggle-paused' },
    });
    expect(mediaLayoutTooltip('play', state({ paused: false }), context, 10).label).toBe('Pause');
    expect(mediaLayoutTooltip('play', state({ ended: true }), context, 10).label).toBe('Replay');
    expect(mediaLayoutTooltip('fullscreen', state({ fullscreen: true }), context, 10).label).toBe(
      'Exit fullscreen',
    );
    expect(mediaLayoutTooltip('captions', state(), context, 10).label).toBe('Enable captions');
    expect(mediaLayoutTooltip('settings', state(), context, 10)).toEqual({ label: 'Settings' });
  });

  it('labels seek buttons with the absolute step in each direction', () => {
    expect(mediaLayoutTooltip('seek-backward', state(), context, 15).label).toBe(
      'Seek backward 15 seconds',
    );
    expect(mediaLayoutTooltip('seek-forward', state(), context, -15).label).toBe(
      'Seek forward 15 seconds',
    );
  });

  it('follows localized messages', () => {
    const french = { ...context, messages: createMediaMessages({ play: 'Lecture' }) };
    expect(mediaLayoutTooltip('play', state({ paused: true }), french, 10).label).toBe('Lecture');
  });

  it('re-renders on label-relevant state only (not on time updates)', () => {
    const before = mediaLayoutSlice(state({ currentTime: 1 }));
    const after = mediaLayoutSlice(state({ currentTime: 2 }));
    expect(after).toEqual(before);
    expect(mediaLayoutSlice(state({ paused: false }))).not.toEqual(before);
  });
});

customElements.define('tp-media-video-layout-unit', class extends TpMediaVideoLayout {});
customElements.define('tp-media-audio-layout-unit', class extends TpMediaAudioLayout {});

let published: KeyShortcut | undefined;
class HintLayout extends TpMediaVideoLayout {
  override shortcut(): KeyShortcut | undefined {
    return published;
  }
  tooltip(control: MediaLayoutTooltipControl): unknown {
    return this.tooltipContent(control);
  }
}
customElements.define('tp-media-video-layout-hint-unit', HintLayout);

describe('layout elements', () => {
  it('have the documented defaults and are popup scopes for the player', () => {
    for (const tag of ['tp-media-video-layout-unit', 'tp-media-audio-layout-unit']) {
      const layout = new (customElements.get(tag)!)() as TpMediaVideoLayout;
      expect(layout.hide).toBe('');
      expect(layout.seekButtons).toBe(false);
      expect(layout[mediaPopupScopeBrand]).toBe(true);
      expect(layout.tooltipProvider.openDelay).toBe(600);
      expect(layout.tooltipProvider.restTimeout).toBe(400);
    }
  });
});

describe('layout tooltip Kbd elements', () => {
  it('shows the published binding of a layout tooltip as Kbd elements (`mp-kb-publish`)', () => {
    const layout = new HintLayout();
    const label = (text: string) =>
      `<span data-media-tooltip-label style="display: inline-flex; align-items: center; gap: var(--tp-space-2)">${text}`;
    published = { aria: 'k Space', display: 'K', keys: ['K'] };
    expect(templateMarkup(layout.tooltip('play'))).toBe(
      `${label('Play')}<tp-kbd value=K></tp-kbd></span>`,
    );
    published = { aria: 'Shift+p', display: 'Shift+P', keys: ['Shift', 'P'] };
    expect(templateMarkup(layout.tooltip('play'))).toBe(
      `${label('Play')}<tp-kbd-group><tp-kbd value=Shift></tp-kbd><tp-kbd value=P></tp-kbd></tp-kbd-group></span>`,
    );
    expect(templateMarkup(layout.tooltip('settings'))).toBe(`${label('Settings')}</span>`);
    published = undefined;
    expect(templateMarkup(layout.tooltip('play'))).toBe(`${label('Play')}</span>`);
    published = { aria: '', display: '', keys: [] };
    expect(templateMarkup(layout.tooltip('fullscreen'))).toBe(
      `${label('Enter fullscreen')}</span>`,
    );
  });
});
