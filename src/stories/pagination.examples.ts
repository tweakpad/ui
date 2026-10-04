import { interactiveMarkupExample } from './documentation-examples.js';
import { setupPaginationExample } from './pagination-example.js';
import setupSource from './pagination-example.js?raw';

function example(title: string, id: string, content: string, description?: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="display:grid;gap:var(--tp-space-4)">${content}<output aria-live="polite"></output></div>`,
    setupPaginationExample,
    `${setupSource}\nsetupPaginationExample(document.getElementById('${id}'));`,
    description,
  );
}

export const paginationExamples = [
  example(
    'Simple',
    'pagination-simple',
    '<tp-pagination label="Numbered results pages" page="2" pages="5" data-numbered-only></tp-pagination>',
    'Numbered destination links without previous and next controls. This example routes in place.',
  ),
  example(
    'Rows per page',
    'pagination-rows',
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--tp-space-4);flex-wrap:wrap">
  <tp-field label="Rows per page" orientation="horizontal"><tp-select default-value="25"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></tp-select></tp-field>
  <tp-pagination label="Results by page size" page="1" pages="20" data-directions-only></tp-pagination>
</div>`,
    'Select and Pagination compose independently; changing the page size resets the page. Direction labels compact on small screens.',
  ),
];
