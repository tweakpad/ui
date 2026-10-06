import type { PresentationDictionary } from '../../resolver.js';
import { controlFieldAppearance, surfaceAppearance } from '../shared/surface.js';

export const inputCoreAppearance: PresentationDictionary = { input: controlFieldAppearance };
export const textAreaCoreAppearance: PresentationDictionary = {
  'text-area': controlFieldAppearance,
};
export const toastCoreAppearance: PresentationDictionary = {
  'toast-close': controlFieldAppearance,
  'toast-toast': surfaceAppearance,
};
export const attachmentCoreAppearance: PresentationDictionary = {
  'attachment-root': surfaceAppearance,
};
export const selectCoreAppearance: PresentationDictionary = {
  'select-content': surfaceAppearance,
};
