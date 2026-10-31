export type TpColorInput = import('../../../../src/components/color-input/index.js').TpColorInput;
const built = location.search.includes('built');
const library = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
export const { TpColorInput } = library;
