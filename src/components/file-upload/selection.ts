import { acceptsFile, type NormalizedAccept } from './accept.js';
import type {
  FileError,
  FileErrorCode,
  FileValidationError,
  FileValidationResult,
  FileValidator,
} from './types.js';

/** One incoming entry: a file, or a folder that cannot be selected. */
export interface FileCandidate {
  readonly file: File;
  readonly relativePath: string;
  readonly directory: boolean;
}

export interface SelectionLimits {
  readonly accept: NormalizedAccept;
  readonly multiple: boolean;
  /** Maximum count; `Infinity` is unbounded. Ignored without multiple selection. */
  readonly maxFiles: number;
  readonly maxFileSize: number | null;
  readonly minFileSize: number | null;
  readonly maxTotalSize: number | null;
  readonly allowDuplicates: boolean;
  readonly directory: boolean;
}

export interface SelectionDecision {
  readonly candidate: FileCandidate;
  readonly accepted: boolean;
  readonly errors: readonly FileError[];
  readonly meta: Readonly<Record<string, unknown>>;
  readonly description: string;
  /** The file was removed while its batch validated; it is neither accepted nor rejected. */
  readonly excluded: boolean;
}

export interface SelectionOptions {
  readonly validator?: FileValidator | undefined;
  readonly signal: AbortSignal;
  /** Localized text of a built-in rejection. */
  readonly errorText: (code: FileErrorCode, candidate: FileCandidate) => string;
  /** Files removed while the batch runs (Foundation `fup-validator`): skipped and not counted. */
  readonly excluded?: (index: number) => boolean;
}

export interface SelectionResult {
  readonly decisions: readonly SelectionDecision[];
  /** Without multiple selection, an accepted file replaces the current value. */
  readonly replaces: boolean;
}

/** Identity used for duplicate detection: name, byte size and last-modified time. */
export function fileKey(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

export interface NormalizedValidation {
  readonly errors: readonly FileError[];
  readonly meta: Readonly<Record<string, unknown>>;
  readonly description: string;
}

function validationError(value: unknown): FileError | null {
  if (typeof value === 'string') return value ? { code: 'file-invalid', message: value } : null;
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { message?: unknown }).message === 'string'
  ) {
    const { code, message } = value as { code?: unknown; message: string };
    if (!message) return null;
    if (code !== undefined && typeof code !== 'string') throw new TypeError('Malformed error code');
    return { code: code || 'file-invalid', message };
  }
  throw new TypeError('Malformed validation error');
}

function validationErrors(value: unknown): FileError[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(validationError).filter((error): error is FileError => error !== null);
}

/**
 * Normalizes a file validator result. A malformed result throws, which the pipeline reports as
 * `validation-failed` (Foundation `fup-validator`).
 */
export function normalizeValidation(result: FileValidationResult): NormalizedValidation {
  if (result == null) return { errors: [], meta: {}, description: '' };
  if (typeof result === 'string' || Array.isArray(result))
    return { errors: validationErrors(result), meta: {}, description: '' };
  if (typeof result !== 'object') throw new TypeError('Malformed validation result');
  if (typeof (result as { message?: unknown }).message === 'string')
    return { errors: validationErrors(result), meta: {}, description: '' };
  const record = result as {
    errors?: FileValidationError | readonly FileValidationError[] | null;
    meta?: unknown;
    description?: unknown;
  };
  if (!('errors' in record || 'meta' in record || 'description' in record))
    throw new TypeError('Malformed validation result');
  if (record.meta != null && (typeof record.meta !== 'object' || Array.isArray(record.meta)))
    throw new TypeError('Malformed validation metadata');
  if (record.description != null && typeof record.description !== 'string')
    throw new TypeError('Malformed validation description');
  return {
    errors: validationErrors(record.errors),
    meta: Object.freeze({ ...((record.meta as Record<string, unknown>) ?? {}) }),
    description: record.description ?? '',
  };
}

function aborted(signal: AbortSignal): never {
  throw signal.reason ?? new DOMException('The batch was aborted.', 'AbortError');
}

/**
 * Runs one batch through the File upload validation pipeline (Foundation `fup-pipeline`):
 * folders, built-in type/size/duplicate checks, the Consumer validator in order, then count
 * and total-size limits. Rejects with the signal reason when the batch is aborted.
 */
export async function selectFiles(
  candidates: readonly FileCandidate[],
  current: readonly File[],
  limits: SelectionLimits,
  options: SelectionOptions,
): Promise<SelectionResult> {
  const { signal } = options;
  if (signal.aborted) aborted(signal);
  const replaces = !limits.multiple;
  const baseline = replaces ? [] : current;
  const seen = new Set(baseline.map(fileKey));
  const error = (code: FileErrorCode, candidate: FileCandidate): FileError => ({
    code,
    message: options.errorText(code, candidate),
  });
  type Draft = {
    candidate: FileCandidate;
    errors: FileError[];
    meta: Readonly<Record<string, unknown>>;
    description: string;
  };
  const drafts: Draft[] = candidates.map((candidate) => ({
    candidate,
    errors: [],
    meta: {},
    description: '',
  }));

  for (const draft of drafts) {
    const { candidate } = draft;
    if (candidate.directory) {
      if (!limits.directory) draft.errors.push(error('folder-not-allowed', candidate));
      continue;
    }
    const { file } = candidate;
    if (!acceptsFile(limits.accept, file)) draft.errors.push(error('file-invalid-type', candidate));
    if (limits.maxFileSize != null && file.size > limits.maxFileSize)
      draft.errors.push(error('file-too-large', candidate));
    if (limits.minFileSize != null && file.size < limits.minFileSize)
      draft.errors.push(error('file-too-small', candidate));
    if (!limits.allowDuplicates) {
      const key = fileKey(file);
      if (seen.has(key)) draft.errors.push(error('file-exists', candidate));
      else if (!draft.errors.length) seen.add(key);
    }
  }

  const excluded = (index: number) => options.excluded?.(index) ?? false;
  const passed: File[] = [];
  for (const [index, draft] of drafts.entries()) {
    if (draft.errors.length || draft.candidate.directory || excluded(index)) continue;
    if (options.validator) {
      let outcome: NormalizedValidation;
      try {
        outcome = normalizeValidation(
          await options.validator(draft.candidate.file, {
            value: baseline,
            accepted: [...passed],
            index,
            signal,
            relativePath: draft.candidate.relativePath,
          }),
        );
      } catch (cause) {
        if (signal.aborted) aborted(signal);
        void cause;
        outcome = {
          errors: [error('validation-failed', draft.candidate)],
          meta: {},
          description: '',
        };
      }
      if (signal.aborted) aborted(signal);
      if (excluded(index)) continue;
      draft.errors.push(...outcome.errors);
      draft.meta = outcome.meta;
      draft.description = outcome.description;
      if (draft.errors.length) continue;
    }
    passed.push(draft.candidate.file);
  }

  const slots = replaces ? 1 : Math.max(0, limits.maxFiles - baseline.length);
  let total = baseline.reduce((sum, file) => sum + file.size, 0);
  let count = 0;
  const decisions = drafts.map((draft, index): SelectionDecision => {
    if (excluded(index))
      return Object.freeze({
        candidate: draft.candidate,
        accepted: false,
        errors: Object.freeze([]),
        meta: {},
        description: '',
        excluded: true,
      });
    const ok = !draft.errors.length && !draft.candidate.directory;
    if (ok) {
      if (count >= slots) draft.errors.push(error('too-many-files', draft.candidate));
      else if (
        limits.maxTotalSize != null &&
        total + draft.candidate.file.size > limits.maxTotalSize
      )
        draft.errors.push(error('total-too-large', draft.candidate));
      else {
        count += 1;
        total += draft.candidate.file.size;
      }
    }
    const accepted = !draft.errors.length && !draft.candidate.directory;
    return Object.freeze({
      candidate: draft.candidate,
      accepted,
      errors: Object.freeze([...draft.errors]),
      meta: draft.meta,
      description: draft.description,
      excluded: false,
    });
  });
  return { decisions, replaces: replaces && count > 0 };
}
