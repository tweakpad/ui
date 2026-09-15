import type { ValidityStateFlags } from './types.js';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  flags?: ValidityStateFlags;
}

export type Validator<T> = (
  value: T,
  signal: AbortSignal,
) => ValidationResult | Promise<ValidationResult>;

export class ValidationRun<T> {
  readonly #validators: readonly Validator<T>[];
  #controller: AbortController | null = null;
  #generation = 0;

  constructor(validators: readonly Validator<T>[]) {
    this.#validators = validators;
  }

  async validate(value: T): Promise<ValidationResult> {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    const generation = ++this.#generation;
    for (const validator of this.#validators) {
      const result = await validator(value, controller.signal);
      if (controller.signal.aborted || generation !== this.#generation)
        throw new DOMException('Validation superseded', 'AbortError');
      if (!result.valid) return result;
    }
    return { valid: true };
  }

  abort(): void {
    this.#controller?.abort();
  }
}

export function aggregateValidity(results: readonly ValidationResult[]): ValidationResult {
  const invalid = results.filter((result) => !result.valid);
  if (invalid.length === 0) return { valid: true };
  const flags = Object.assign({}, ...invalid.map((result) => result.flags ?? {}));
  return {
    valid: false,
    message: invalid
      .map((result) => result.message)
      .filter(Boolean)
      .join('\n'),
    ...(Object.keys(flags).length ? { flags } : {}),
  };
}
