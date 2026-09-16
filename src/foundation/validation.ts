import type { ValidityStateFlags } from './types.js';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  flags?: ValidityStateFlags;
}

export type ValidatorResult = ValidationResult | string | readonly string[] | null | undefined;

export type Validator<T> = (
  value: T,
  signal: AbortSignal,
) => ValidatorResult | Promise<ValidatorResult>;

export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'failed' | 'cancelled';

export interface FieldValidationResult {
  identity: string;
  status: Exclude<ValidationStatus, 'pending' | 'cancelled'>;
  valid: boolean;
  errors: readonly string[];
  flags?: ValidityStateFlags;
}

export interface ValidationSnapshot {
  generation: number;
  status: Exclude<ValidationStatus, 'pending'>;
  fieldResults: readonly FieldValidationResult[];
}

export class ValidationRun {
  readonly generation: number;
  readonly #controller = new AbortController();
  readonly #completion: Promise<ValidationSnapshot>;
  #resolveCompletion!: (snapshot: ValidationSnapshot) => void;
  #status: ValidationStatus = 'pending';
  #fieldResults: readonly FieldValidationResult[] = [];
  #settled = false;

  constructor(generation: number) {
    this.generation = generation;
    this.#completion = new Promise((resolve) => {
      this.#resolveCompletion = resolve;
    });
  }

  get status(): ValidationStatus {
    return this.#status;
  }

  get fieldResults(): readonly FieldValidationResult[] {
    return this.#fieldResults;
  }

  get completion(): Promise<ValidationSnapshot> {
    return this.#completion;
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  cancel(): void {
    if (this.#settled) return;
    this.#controller.abort();
    this.settle('cancelled', []);
  }

  settle(
    status: ValidationSnapshot['status'],
    fieldResults: readonly FieldValidationResult[],
  ): void {
    if (this.#settled) return;
    this.#settled = true;
    this.#status = status;
    this.#fieldResults = Object.freeze([...fieldResults]);
    this.#resolveCompletion({
      generation: this.generation,
      status,
      fieldResults: this.#fieldResults,
    });
  }
}

export class ValidationController<T> {
  readonly #validators: readonly Validator<T>[];
  #generation = 0;
  #current: ValidationRun | null = null;

  constructor(validators: readonly Validator<T>[] = []) {
    this.#validators = validators;
  }

  validate(value: T, identity = 'field'): ValidationRun {
    this.#current?.cancel();
    const run = new ValidationRun(++this.#generation);
    this.#current = run;
    void this.#execute(run, value, identity);
    return run;
  }

  cancel(): void {
    this.#current?.cancel();
  }

  async #execute(run: ValidationRun, value: T, identity: string): Promise<void> {
    const results: ValidationResult[] = [];
    try {
      for (const validator of this.#validators) {
        const raw = await validator(value, run.signal);
        if (run.signal.aborted) return;
        results.push(normalizeValidatorResult(raw));
      }
    } catch (error) {
      if (run.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Validation failed.';
      const fieldResult: FieldValidationResult = {
        identity,
        status: 'failed',
        valid: false,
        errors: [message],
      };
      run.settle('failed', [fieldResult]);
      return;
    }

    const aggregate = aggregateValidity(results);
    const errors = aggregate.message ? aggregate.message.split('\n') : [];
    const fieldResult: FieldValidationResult = {
      identity,
      status: aggregate.valid ? 'valid' : 'invalid',
      valid: aggregate.valid,
      errors,
      ...(aggregate.flags ? { flags: aggregate.flags } : {}),
    };
    run.settle(aggregate.valid ? 'valid' : 'invalid', [fieldResult]);
  }
}

function normalizeValidatorResult(result: ValidatorResult): ValidationResult {
  if (result == null) return { valid: true };
  if (typeof result === 'string') return { valid: false, message: result };
  if (Array.isArray(result)) {
    if (!result.every((message) => typeof message === 'string'))
      throw new TypeError('A validator returned a malformed error list.');
    return { valid: result.length === 0, message: result.join('\n') };
  }
  if (typeof result === 'object' && 'valid' in result && typeof result.valid === 'boolean')
    return result as ValidationResult;
  throw new TypeError('A validator returned a malformed result.');
}

export function aggregateValidity(results: readonly ValidationResult[]): ValidationResult {
  const invalid = results.filter((result) => !result.valid);
  if (invalid.length === 0) return { valid: true };
  const flags = Object.assign({}, ...invalid.map((result) => result.flags ?? {}));
  return {
    valid: false,
    message: invalid
      .flatMap((result) => result.message?.split('\n') ?? [])
      .filter(Boolean)
      .join('\n'),
    ...(Object.keys(flags).length ? { flags } : {}),
  };
}
