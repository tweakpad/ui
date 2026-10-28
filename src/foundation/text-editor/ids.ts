/**
 * Block identifiers of the text editor (uwg-te-req-content-7).
 *
 * Every block of the block tree carries ten random lowercase letters and digits, unique within
 * the document. An imported identifier of 1 to 64 letters, digits, hyphens or underscores is
 * kept: the first of duplicates keeps it, and later duplicates and invalid identifiers are
 * replaced. These helpers only plan identifiers; the caller applies them and reports one
 * `text-editor-block-id` diagnostic when a repair replaced any (uwg-te-req-evt-5).
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const BLOCK_ID_LENGTH = 10;
/** Bytes from this multiple of the alphabet size up are drawn again, so no character is favored. */
const BYTE_LIMIT = 256 - (256 % ALPHABET.length);
const VALID_BLOCK_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Attempts with a caller's generator before a repair falls back to random identifiers. */
const GENERATOR_ATTEMPTS = 100;

/** Ten random characters of `[a-z0-9]` from `crypto.getRandomValues`, each equally likely. */
export function createBlockId(): string {
  const bytes = new Uint8Array(16);
  let id = '';
  while (id.length < BLOCK_ID_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= BYTE_LIMIT) continue;
      id += ALPHABET.charAt(byte % ALPHABET.length);
      if (id.length === BLOCK_ID_LENGTH) break;
    }
  }
  return id;
}

/** Whether an identifier is kept on import: 1 to 64 of `[A-Za-z0-9_-]`. */
export function isValidBlockId(id: string): boolean {
  return VALID_BLOCK_ID.test(id);
}

export interface BlockIdRepair {
  /** One identifier per input position, all of them valid and distinct. */
  readonly ids: string[];
  /** How many carried identifiers were replaced because they were invalid or duplicates. */
  readonly replaced: number;
}

/**
 * Plans the identifiers of the blocks of one document, in document order. `null` marks a block
 * that carries no identifier: it receives a fresh one without counting as a replacement. A valid
 * identifier is kept by its first holder; later holders and invalid identifiers receive fresh
 * ones from `create`, which never repeat an identifier the plan keeps or hands out.
 */
export function planIdRepair(
  ids: readonly (string | null)[],
  create: () => string = createBlockId,
): BlockIdRepair {
  const taken = new Set<string>();
  // Reserve every kept identifier first, so a fresh one never takes an identifier kept later.
  const kept = ids.map((id) => {
    if (id === null || !isValidBlockId(id) || taken.has(id)) return false;
    taken.add(id);
    return true;
  });
  let replaced = 0;
  const repaired = ids.map((id, index) => {
    if (id !== null && kept[index]) return id;
    if (id !== null) replaced += 1;
    return freshBlockId(taken, create);
  });
  return { ids: repaired, replaced };
}

/**
 * Identifiers for the `count` blocks that a conversion makes of the blocks holding `previous`,
 * such as a list toggle: the blocks take the previous identifiers in order, so N blocks turned
 * into one keep the first identifier and one block turned into N keeps it on the first. Blocks
 * beyond the previous ones, and positions whose previous identifier is invalid or repeated,
 * receive fresh identifiers from `create` that no previous identifier holds.
 */
export function reassignIdsByOrder(
  previous: readonly string[],
  count: number,
  create: () => string = createBlockId,
): string[] {
  const taken = new Set(previous);
  const used = new Set<string>();
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = previous[index];
    if (id !== undefined && isValidBlockId(id) && !used.has(id)) {
      used.add(id);
      ids.push(id);
    } else ids.push(freshBlockId(taken, create));
  }
  return ids;
}

/**
 * An identifier from `create` that `taken` lacks, which then joins `taken`; after
 * `GENERATOR_ATTEMPTS` identifiers that `taken` holds, random ones from `createBlockId` follow.
 */
export function freshBlockId(taken: Set<string>, create: () => string = createBlockId): string {
  let id = create();
  // A generator that keeps returning taken identifiers falls back to random ones.
  for (let attempt = 1; taken.has(id); attempt += 1)
    id = attempt < GENERATOR_ATTEMPTS ? create() : createBlockId();
  taken.add(id);
  return id;
}
