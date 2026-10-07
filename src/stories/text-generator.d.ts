export declare function generateParagraphs(
  seed: number,
  count: number,
  options?: { sentences?: [number, number]; length?: [number, number] },
): string[];
export declare function fillGeneratedText(root: ParentNode, seed?: number): void;
