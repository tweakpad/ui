let sequence = 0;

export function createId(prefix = 'tp'): string {
  sequence += 1;
  return `${prefix}-${sequence.toString(36)}`;
}

export function resetIdSequenceForTests(): void {
  sequence = 0;
}
