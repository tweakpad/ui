import type { FileEntry } from '../../foundation/file-explorer/types.js';

// The archive of the fictional Ridgeline Observatory: night logs, plate scans, spectra and
// timelapses, generated the same on every load.

const DAY = 86_400_000;
const START = Date.UTC(2026, 10, 15, 6, 0);

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** A small star field as an SVG data URL: the thumbnail of a plate scan or a timelapse. */
export function starField(seed: number, hue: number): string {
  const next = random(seed);
  const stars = Array.from({ length: 28 }, () => {
    const x = Math.round(next() * 160);
    const y = Math.round(next() * 120);
    const r = (next() * 1.4 + 0.3).toFixed(2);
    return `<circle cx='${x}' cy='${y}' r='${r}' fill='white' opacity='${(0.5 + next() * 0.5).toFixed(2)}'/>`;
  }).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 120'><defs><radialGradient id='g' cx='0.35' cy='0.4' r='0.9'><stop offset='0' stop-color='hsl(${hue} 55% 32%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360} 60% 8%)'/></radialGradient></defs><rect width='160' height='120' fill='url(#g)'/>${stars}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const observers = ['M. Ortega', 'K. Lindqvist', 'A. Osei', 'R. Varga', 'T. Nakamura'];
const telescopes = ['North dome 60 cm', 'South dome 40 cm', 'Wide-field camera'];

export interface ArchiveOptions {
  /** Extra plate scans, to fill a folder with many entries. */
  readonly extraPlates?: number;
}

/** The archive's entries, folders and files, with metadata for application columns. */
export function observatoryArchive(options: ArchiveOptions = {}): FileEntry[] {
  const next = random(29);
  const entries: FileEntry[] = [];
  const folder = (
    id: string,
    name: string,
    parentId: string | null,
    extra: Partial<FileEntry> = {},
  ) =>
    entries.push({
      id,
      name,
      kind: 'folder',
      parentId,
      modified: new Date(START - next() * 40 * DAY),
      ...extra,
    });
  const file = (
    id: string,
    name: string,
    parentId: string,
    size: number,
    type: string,
    extra: Partial<FileEntry> = {},
  ) =>
    entries.push({
      id,
      name,
      kind: 'file',
      parentId,
      size,
      type,
      modified: new Date(START - next() * 60 * DAY),
      metadata: {
        observer: observers[Math.floor(next() * observers.length)],
        telescope: telescopes[Math.floor(next() * telescopes.length)],
      },
      ...extra,
    });

  folder('logs', 'Night logs', null);
  folder('plates', 'Plate scans', null);
  folder('spectra', 'Spectra', null);
  folder('timelapses', 'Timelapses', null);
  folder('manuals', 'Instrument manuals', null, {
    permissions: { write: false, rename: false, move: false, delete: false },
  });
  folder('outreach', 'Outreach', null);
  file('readme', 'Read me first.md', 'logs', 2_400, 'text/markdown');
  entries.push({
    id: 'cache',
    name: '.calibration-cache',
    kind: 'file',
    parentId: null,
    size: 48_000_000,
    hidden: true,
    modified: new Date(START - 2 * DAY),
  });

  for (const [index, month] of ['August', 'September', 'October', 'November'].entries()) {
    const id = `logs-${index}`;
    folder(id, `${month} 2026`, 'logs');
    for (let night = 1; night <= 6; night++)
      file(
        `${id}-${night}`,
        `night-${String(night * 4).padStart(2, '0')}.log`,
        id,
        4_000 + Math.round(next() * 60_000),
        'text/plain',
      );
  }

  const targets = [
    'M31 Andromeda',
    'M42 Orion nebula',
    'NGC 7000',
    'M13 cluster',
    'M57 ring',
    'IC 434',
    'M81 pair',
    'NGC 891',
  ];
  folder('plates-calibration', 'Calibration frames', 'plates', { hidden: false });
  for (let frame = 1; frame <= 8; frame++)
    file(
      `dark-${frame}`,
      `dark-frame-${frame}.fits`,
      'plates-calibration',
      32_000_000,
      'image/fits',
      {
        metadata: { exposure: 30 * frame, telescope: telescopes[0] },
      },
    );
  const plates = targets.length + (options.extraPlates ?? 0);
  for (let index = 0; index < plates; index++) {
    const target = targets[index % targets.length]!;
    const series = Math.floor(index / targets.length);
    const name = `${target}${series ? ` ${series + 1}` : ''}.tif`;
    file(
      `plate-${index}`,
      name,
      'plates',
      18_000_000 + Math.round(next() * 90_000_000),
      'image/tiff',
      {
        thumbnail: starField(index + 3, Math.round(next() * 360)),
        metadata: {
          observer: observers[index % observers.length],
          telescope: telescopes[index % telescopes.length],
          exposure: 60 + Math.round(next() * 540),
        },
      },
    );
  }

  for (const [index, star] of [
    'Vega',
    'Arcturus',
    'Betelgeuse',
    'Sirius',
    'Capella',
    'Deneb',
  ].entries())
    file(
      `spectrum-${index}`,
      `${star.toLowerCase()}-spectrum.csv`,
      'spectra',
      120_000 + Math.round(next() * 900_000),
      'text/csv',
    );
  file('spectra-pipeline', 'reduce-spectra.py', 'spectra', 8_200, 'text/x-python');
  file('spectra-archive', 'raw-2025.zip', 'spectra', 640_000_000, 'application/zip');

  for (const [index, night] of ['Perseids peak', 'Lunar eclipse', 'Milky Way core'].entries())
    file(
      `timelapse-${index}`,
      `${night}.mp4`,
      'timelapses',
      900_000_000 + Math.round(next() * 1_400_000_000),
      'video/mp4',
      {
        thumbnail: starField(index + 40, 220 + index * 40),
      },
    );

  file('manual-camera', 'Camera control.pdf', 'manuals', 4_800_000, 'application/pdf');
  file('manual-mount', 'Mount alignment.pdf', 'manuals', 2_100_000, 'application/pdf');
  file('outreach-talk', 'Public night talk.pdf', 'outreach', 12_400_000, 'application/pdf');
  file('outreach-audio', 'Night sounds.m4a', 'outreach', 28_000_000, 'audio/mp4');
  return entries;
}
