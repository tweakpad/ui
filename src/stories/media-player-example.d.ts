import type { MediaTracksAdapter } from '../foundation/media/target.js';
export function createMockTracksAdapter(): MediaTracksAdapter;
export function simulateLiveWindow(video: HTMLVideoElement, windowSeconds?: number): () => void;
export function setupMediaPlayerExample(root: HTMLElement): () => void;
