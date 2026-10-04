import { interactiveMarkupExample } from './documentation-examples.js';
import { setupBreadcrumbExample } from './breadcrumb-example.js';
import setupSource from './breadcrumb-example.js?raw';

const ancestors =
  '<a href="#documentation" close-on-click>Documentation</a><a href="#themes" close-on-click>Themes</a><a href="#repository" close-on-click>Repository</a>';
const trigger =
  '<tp-button slot="trigger" variant="ghost" size="icon-sm" aria-label="Show omitted ancestors" data-ancestor-trigger></tp-button>';
const menu = `<tp-menu label="Ancestor pages" placement="block-end start">${trigger}${ancestors}</tp-menu>`;
function example(title: string, id: string, content: string, description?: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="display:grid;gap:var(--tp-space-4)">${content}<output aria-live="polite"></output></div>`,
    setupBreadcrumbExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupBreadcrumbExample(document.getElementById('${id}'));`,
    description,
  );
}
export const breadcrumbExamples = [
  example(
    'Collapsed ancestors',
    'breadcrumb-collapsed',
    `<tp-breadcrumb label="Collapsed documentation trail"><a href="#home">Home</a>${menu}<a href="#components">Components</a><span>Breadcrumb</span></tp-breadcrumb>`,
    'A named Button opens the existing Menu to reveal omitted ancestor destinations.',
  ),
  example(
    'Ancestor menu',
    'breadcrumb-ancestor-menu',
    `<tp-breadcrumb label="Component documentation trail" separator="/"><a href="#home">Home</a><tp-menu label="Component sections" placement="block-end start"><tp-button slot="trigger" variant="ghost" size="sm">Components<tp-icon slot="icon-end" data-ancestor-chevron></tp-icon></tp-button>${ancestors}</tp-menu><span>Breadcrumb</span></tp-breadcrumb>`,
    'A named ancestor can open its own section menu, with the shared chevron and custom separators.',
  ),
  example(
    'Consumer-owned links and decorative ellipsis',
    'breadcrumb-links',
    '<tp-breadcrumb label="Consumer-owned documentation trail"><a href="#home" data-route>Home</a><tp-icon data-breadcrumb-ellipsis aria-hidden="true" data-ellipsis></tp-icon><a href="#components" data-route>Components</a><span>Breadcrumb</span></tp-breadcrumb>',
    'Original anchors keep their destinations and authored listeners. The decorative ellipsis is not an action.',
  ),
  example(
    'Custom separator',
    'breadcrumb-separator',
    '<tp-breadcrumb label="Project file trail" separator="/"><a href="#workspace">Workspace</a><a href="#project">Project</a><span>README.md</span></tp-breadcrumb>',
    'The separator accepts decorative text; the public separator rendering contract also accepts composed content.',
  ),
  example(
    'Responsive ancestor navigation',
    'breadcrumb-responsive',
    `<tp-breadcrumb label="Responsive documentation trail"><a href="#home">Home</a><span data-responsive-ancestors>${menu}<tp-drawer label="Navigate to" description="Select an ancestor page to navigate to." hidden>${trigger}<div style="display:grid;gap:var(--tp-space-2)">${ancestors}</div><tp-button slot="close" variant="outline">Close</tp-button></tp-drawer></span><a href="#data-fetching">Data fetching</a><span>Caching and revalidating</span></tp-breadcrumb>`,
    'The application chooses Menu above 48rem and Drawer below it. Breadcrumb keeps the same hierarchy; each surface retains its own focus and dismissal behavior.',
  ),
];
