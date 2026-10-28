/**
 * A tracks adapter mock. A streaming engine (HLS, DASH) would supply these lists; here three
 * renditions and two audio tracks only record the selection, so choosing a quality or audio
 * track updates the menus and state but does not change the sample video.
 */
export function createMockTracksAdapter() {
  const { EventTarget: Target, Event: TargetEvent } = globalThis;
  const renditionList = new Target();
  const renditions = [
    { id: '1080p', width: 1920, height: 1080, bitrate: 6_000_000 },
    { id: '720p', width: 1280, height: 720, bitrate: 3_000_000 },
    { id: '360p', width: 640, height: 360, bitrate: 800_000 },
  ];
  let selectedIndex = -1;
  let activeIndex = 1;
  renditions.forEach((rendition, index) => {
    Object.defineProperty(rendition, 'active', { get: () => index === activeIndex });
    renditionList[index] = rendition;
  });
  Object.defineProperties(renditionList, {
    length: { value: renditions.length },
    selectedIndex: {
      get: () => selectedIndex,
      set(index) {
        selectedIndex = index;
        // Adaptive selection keeps the last decoded rendition active.
        if (index >= 0) activeIndex = index;
        renditionList.dispatchEvent(new TargetEvent('change'));
        renditionList.dispatchEvent(new TargetEvent('activechange'));
      },
    },
  });

  const audioList = new Target();
  const tracks = [
    { id: 'main', kind: 'main', label: 'English', language: 'en', enabled: true },
    { id: 'commentary', kind: 'commentary', label: 'Commentary', language: 'en', enabled: false },
  ];
  tracks.forEach((track, index) => {
    let enabled = track.enabled;
    Object.defineProperty(track, 'enabled', {
      get: () => enabled,
      set(value) {
        if (enabled === value) return;
        enabled = value;
        audioList.dispatchEvent(new TargetEvent('change'));
      },
    });
    audioList[index] = track;
  });
  Object.defineProperty(audioList, 'length', { value: tracks.length });

  return { videoRenditions: renditionList, audioTracks: audioList };
}

/**
 * Simulates a live stream with a DVR window on a looping on-demand clip by giving the media
 * element the live members of the media target contract (`streamType`, `targetLiveWindow`,
 * `liveEdgeStart`). It is a demonstration only: real live media reports these itself (or through
 * an engine's custom media element). Call before the player attaches the media.
 */
export function simulateLiveWindow(video, windowSeconds = 20) {
  const end = () => (video.seekable.length ? video.seekable.end(video.seekable.length - 1) : 0);
  Object.defineProperties(video, {
    streamType: { configurable: true, get: () => 'live' },
    targetLiveWindow: { configurable: true, get: () => windowSeconds },
    liveEdgeStart: { configurable: true, get: () => Math.max(0, end() - 3) },
  });
  return () => {
    delete video.streamType;
    delete video.targetLiveWindow;
    delete video.liveEdgeStart;
  };
}

/**
 * Mounts one Media player usage example inside `root` (`[data-example]` selects the mode):
 *
 * - `tracks`: assigns the mock tracks adapter, so the settings menu offers Quality and Audio.
 * - `live`: inserts a looping clip that simulates a live stream with a DVR window (labelled in
 *   the example), so the video layout switches to its live variant.
 *
 * Returns the cleanup.
 */
export function setupMediaPlayerExample(root) {
  const container = root.matches('[data-example]')
    ? root
    : (root.querySelector('[data-example]') ?? root);
  const player = container.querySelector('tp-media-player');
  if (!player) return () => {};
  if (container.dataset.example === 'tracks') {
    player.mediaAdapter = createMockTracksAdapter();
    return () => {
      player.mediaAdapter = null;
    };
  }
  if (container.dataset.example === 'live') {
    const video = root.ownerDocument.createElement('video');
    video.src = container.dataset.src ?? '';
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.width = 1280;
    video.height = 720;
    const restore = simulateLiveWindow(video, 20);
    // The player discovers the media after the live members exist.
    player.prepend(video);
    return () => {
      video.remove();
      restore();
    };
  }
  return () => {};
}
