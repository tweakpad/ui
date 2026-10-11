/** Multiplies two elements of GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1 (0x11D). */
export function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let bit = 7; bit >= 0; bit--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> bit) & 1) * x;
  }
  return z & 0xff;
}

/**
 * Coefficients of the generator polynomial of `degree`, highest power first and without the
 * leading 1: the product of (x − α^i) for i in 0..degree − 1 with α = 2.
 */
export function rsGenerator(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let index = 0; index < degree; index++) {
    for (let term = 0; term < result.length; term++) {
      result[term] = gfMultiply(result[term]!, root);
      if (term + 1 < result.length) result[term]! ^= result[term + 1]!;
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** Error correction codewords: the remainder of data × x^degree divided by the generator. */
export function rsRemainder(data: readonly number[], generator: readonly number[]): number[] {
  const result: number[] = new Array(generator.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    generator.forEach((coefficient, index) => {
      result[index]! ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}
