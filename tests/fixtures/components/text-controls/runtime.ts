export type TpInput = import('../../../../src/components/input/index.js').TpInput;
export type TpTextArea = import('../../../../src/components/text-area/index.js').TpTextArea;
export type TpField = import('../../../../src/components/field/index.js').TpField;
export type TpIcon = import('../../../../src/components/icon/icon.js').TpIcon;

const built = location.pathname.endsWith('/package.html');
const libraryPath = built ? '/dist/index.js' : '/src/index.ts';
const registrationPath = built ? '/dist/register.js' : '/src/register.ts';
const iconPath = built ? '/dist/icons/plus.js' : '/src/icons/plus.ts';
const library = await import(/* @vite-ignore */ libraryPath);
await import(/* @vite-ignore */ registrationPath);
const icons = await import(/* @vite-ignore */ iconPath);
export const {
  TpInput,
  TpTextArea,
  TpField,
  TpForm,
  preventComponentHandling,
  defaultPresentationDictionary,
  setPresentationDictionary,
} = library;
export const plusIcon = icons.plusIcon;
