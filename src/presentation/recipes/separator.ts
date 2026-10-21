import type { PresentationDictionary } from '../resolver.js';
import { dividerLine } from './shared/divider.js';

export const separatorAppearance: PresentationDictionary = {
  separator: [{ selector: '&', declarations: dividerLine }],
};
