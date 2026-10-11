import type { FileAcceptInput } from './types.js';

/** A normalized accept list (Foundation File upload `fup-accept`). */
export interface NormalizedAccept {
  /** Lower-case extension tokens with their leading period, such as `.sql.gz`. */
  readonly extensions: readonly string[];
  /** Lower-case exact media types without parameters. */
  readonly mediaTypes: readonly string[];
  /** Lower-case top-level types of `type/*` wildcards. */
  readonly wildcards: readonly string[];
  /** True when the list accepts every file. */
  readonly any: boolean;
  /** Token order for the native attribute and hint labels. */
  readonly tokens: readonly string[];
}

const EMPTY: NormalizedAccept = Object.freeze({
  extensions: [],
  mediaTypes: [],
  wildcards: [],
  any: true,
  tokens: [],
});

function tokensOf(input: FileAcceptInput): string[] {
  if (input == null) return [];
  if (typeof input === 'string') return input.split(',');
  if (Array.isArray(input)) return input.flatMap((token: string) => String(token).split(','));
  return Object.entries(input as Record<string, readonly string[]>).flatMap(
    ([type, extensions]) => [type, ...(extensions ?? [])],
  );
}

/** Normalizes host accept text, a token list or a media-type record. Invalid tokens are dropped. */
export function normalizeAccept(input: FileAcceptInput): NormalizedAccept {
  const tokens: string[] = [];
  const extensions: string[] = [];
  const mediaTypes: string[] = [];
  const wildcards: string[] = [];
  let any = false;
  for (const raw of tokensOf(input)) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    if (token === '*' || token === '*/*') {
      any = true;
      continue;
    }
    if (token.startsWith('.') && token.length > 1) {
      if (!extensions.includes(token)) extensions.push(token);
    } else if (/^[a-z0-9!#$&^_.+-]+\/\*$/.test(token)) {
      const top = token.slice(0, -2);
      if (!wildcards.includes(top)) wildcards.push(top);
    } else if (/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(token)) {
      if (!mediaTypes.includes(token)) mediaTypes.push(token);
    } else continue;
    if (!tokens.includes(token)) tokens.push(token);
  }
  if (any || !tokens.length) return EMPTY;
  return Object.freeze({ extensions, mediaTypes, wildcards, any: false, tokens });
}

/** The media type without parameters, in lower case. */
export function baseMediaType(type: string): string {
  return type.split(';')[0]!.trim().toLowerCase();
}

/** Whether a media type alone satisfies the list (no extension check). */
export function acceptsMediaType(accept: NormalizedAccept, type: string): boolean {
  if (accept.any) return true;
  const base = baseMediaType(type);
  if (!base) return false;
  return accept.mediaTypes.includes(base) || accept.wildcards.includes(base.split('/')[0]!);
}

/** Whether a file name and media type match the list. */
export function acceptsFile(
  accept: NormalizedAccept,
  file: { readonly name: string; readonly type: string },
): boolean {
  if (accept.any) return true;
  const name = file.name.toLowerCase();
  if (accept.extensions.some((extension) => name.endsWith(extension) && name !== extension))
    return true;
  return acceptsMediaType(accept, file.type);
}

/** The native `accept` attribute value. */
export function nativeAccept(accept: NormalizedAccept): string {
  return accept.tokens.join(',');
}

const MEDIA_LABELS: Readonly<Record<string, string>> = {
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/x-zip-compressed': 'ZIP',
  'application/gzip': 'GZ',
  'image/jpeg': 'JPG',
  'image/svg+xml': 'SVG',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'audio/mpeg': 'MP3',
};

/** Hint label of one token: `.pdf` → `PDF`, `image/png` → `PNG`, `image/*` → wildcard. */
export function acceptTokenLabel(token: string, wildcard: (type: string) => string): string {
  if (token.startsWith('.')) return token.slice(1).toUpperCase();
  if (token.endsWith('/*')) return wildcard(token.slice(0, -2));
  const known = MEDIA_LABELS[token];
  if (known) return known;
  const subtype = token.split('/')[1] ?? token;
  return subtype
    .replace(/^(x-|vnd\.)/, '')
    .replace(/\+(xml|json|zip)$/, '')
    .toUpperCase();
}

/** Deduplicated hint labels in token order. */
export function acceptLabels(
  accept: NormalizedAccept,
  wildcard: (type: string) => string,
): string[] {
  const labels: string[] = [];
  for (const token of accept.tokens) {
    const label = acceptTokenLabel(token, wildcard);
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}
