import type { EmojiRecord } from './types.js';

/** Fallback for `--tp-font-emoji`: the platform color emoji faces. */
export const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Twemoji Mozilla', 'Android Emoji', EmojiSymbols, sans-serif";

/** Highest Emoji version the platform draws, and whether it draws country flags. */
export interface EmojiSupport {
  readonly version: number;
  readonly flags: boolean;
}

const SIZE = 2;
const FLAG_SAMPLE = '🇪🇺';
const probes = new WeakMap<
  Document,
  { context: CanvasRenderingContext2D | null; results: Map<string, boolean> }
>();

/**
 * Whether the platform draws an emoji as one color glyph: a sequence drawn as several glyphs is
 * too wide, and a monochrome glyph changes with the fill color.
 */
export function isEmojiSupported(
  emoji: string,
  document: Document,
  font: string = EMOJI_FONT_STACK,
): boolean {
  let probe = probes.get(document);
  if (!probe) {
    let context: CanvasRenderingContext2D | null;
    try {
      context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
    } catch {
      context = null;
    }
    probe = { context, results: new Map() };
    probes.set(document, probe);
  }
  const key = `${font}\u0000${emoji}`;
  const known = probe.results.get(key);
  if (known !== undefined) return known;
  const context = probe.context;
  if (!context) return false;
  context.canvas.width = SIZE;
  context.canvas.height = SIZE;
  context.font = `${SIZE}px ${font}`;
  context.textBaseline = 'middle';
  let supported = context.measureText(emoji).width < SIZE * 2;
  if (supported) {
    context.fillStyle = '#00f';
    context.fillText(emoji, 0, 0);
    const blue = context.getImageData(0, 0, SIZE, SIZE).data;
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = '#f00';
    context.fillText(emoji, 0, 0);
    const red = context.getImageData(0, 0, SIZE, SIZE).data;
    for (let index = 0; index < SIZE * SIZE * 4; index += 4)
      if (
        blue[index] !== red[index] ||
        blue[index + 1] !== red[index + 1] ||
        blue[index + 2] !== red[index + 2]
      ) {
        supported = false;
        break;
      }
  }
  probe.results.set(key, supported);
  return supported;
}

/**
 * Probes the first emoji of each version, newest first; the first drawn version is the highest
 * supported one. Without any drawn sample, every version is kept.
 */
export function detectEmojiSupport(
  emojis: readonly Pick<EmojiRecord, 'emoji' | 'version'>[],
  document: Document,
  font: string = EMOJI_FONT_STACK,
): EmojiSupport {
  const samples = new Map<number, string>();
  for (const record of emojis) {
    const version = record.version ?? 1;
    if (!samples.has(version)) samples.set(version, record.emoji);
  }
  const versions = [...samples.keys()].sort((a, b) => b - a);
  const flags = isEmojiSupported(FLAG_SAMPLE, document, font);
  for (const version of versions)
    if (isEmojiSupported(samples.get(version)!, document, font)) return { version, flags };
  return { version: versions[0] ?? Infinity, flags };
}

/** The records a platform draws: none newer than `version`, flags only when supported. */
export function filterSupported<T extends Pick<EmojiRecord, 'version' | 'flag'>>(
  emojis: readonly T[],
  support: EmojiSupport,
): T[] {
  return emojis.filter(
    (record) => (record.version ?? 1) <= support.version && (!record.flag || support.flags),
  );
}
