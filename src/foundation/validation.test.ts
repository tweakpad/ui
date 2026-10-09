import { describe, expect, it } from 'vitest';
import { ValidationController, aggregateValidity } from './validation.js';

describe('ValidationRun', () => {
  it('publishes a pending run and its terminal snapshot', async () => {
    const controller = new ValidationController<string>([
      (value) => ({ valid: value.length > 0, message: 'Required', flags: { valueMissing: true } }),
      (value) => ({ valid: value.length >= 3, message: 'Too short', flags: { tooShort: true } }),
    ]);
    const run = controller.validate('a', 'name');
    expect(run.status).toBe('pending');
    await expect(run.completion).resolves.toMatchObject({
      generation: 1,
      status: 'invalid',
      fieldResults: [{ identity: 'name', valid: false, errors: ['Too short'] }],
    });
  });

  it('settles a superseded run as cancelled', async () => {
    let release: (() => void) | undefined;
    const controller = new ValidationController<string>([
      async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return null;
      },
    ]);
    const first = controller.validate('first');
    const second = controller.validate('second');
    await expect(first.completion).resolves.toMatchObject({ status: 'cancelled' });
    release?.();
    controller.cancel();
    await expect(second.completion).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('aggregates messages and validity flags', () => {
    expect(
      aggregateValidity([
        { valid: false, message: 'Required', flags: { valueMissing: true } },
        { valid: false, message: 'Bad input', flags: { badInput: true } },
      ]),
    ).toEqual({
      valid: false,
      message: 'Required\nBad input',
      flags: { valueMissing: true, badInput: true },
    });
  });
});
