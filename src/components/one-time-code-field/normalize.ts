export type CodeValidation = 'numeric' | 'alphabetic' | 'alphanumeric' | 'predicate';
export interface CodePolicy {
  length: number;
  validationType: CodeValidation;
  characterPredicate?: ((character: string) => boolean) | undefined;
  normalizeValue?: ((value: string) => string) | undefined;
}
/** Code-point normalization; the actual editor continues to use native UTF-16 selection offsets. */
export function normalizeCode(value: string, policy: CodePolicy): string {
  const accepts = (character: string) => {
    if (/\s/u.test(character)) return false;
    if (policy.validationType === 'predicate')
      return policy.characterPredicate?.(character) ?? false;
    return (
      policy.validationType === 'numeric'
        ? /^[0-9]$/u
        : policy.validationType === 'alphabetic'
          ? /^\p{L}$/u
          : /^[0-9\p{L}]$/u
    ).test(character);
  };
  const filter = (text: string) => [...text].filter(accepts).join('');
  const initial = filter(String(value ?? ''));
  return [...filter(policy.normalizeValue ? policy.normalizeValue(initial) : initial)]
    .slice(0, Math.max(0, policy.length))
    .join('');
}
export function codeOffset(value: string, position: number): number {
  return [...value].slice(0, position).join('').length;
}
