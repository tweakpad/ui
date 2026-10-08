/**
 * Script and direction facts for Text motion (Foundation §18.19 `tm-segmentation`).
 */

/** Scripts whose letters join or reorder when shaped; splitting them below words breaks them. */
const JOINED =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Mongolian}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Tibetan}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Lao}\p{Script=Thai}\p{Script=Javanese}\p{Script=Balinese}]/u;

/** Whether `text` contains a script that must not be split into characters. */
export function isJoinedScript(text: string): boolean {
  return JOINED.test(text);
}

const RTL =
  /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]/u;
const STRONG = /\p{L}/u;

/** The direction of the first strongly directional character, or null for neutral text. */
export function strongDirection(text: string): 'ltr' | 'rtl' | null {
  for (const character of text) {
    if (RTL.test(character)) return 'rtl';
    if (STRONG.test(character)) return 'ltr';
  }
  return null;
}
