export type TpProgress = import('../../../../src/components/progress/index.js').TpProgress;
const built = location.pathname.endsWith('/package.html');
const library = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
export const { TpProgress, defaultPresentationDictionary, setPresentationDictionary } = library;
