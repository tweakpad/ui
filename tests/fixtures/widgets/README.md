# Widget fixtures

One folder per widget, mirroring `tests/fixtures/components/<component>/`:
`tests/fixtures/widgets/<widget>/index.html` with a `fixture.ts` (or `.js`) beside it, an
optional `api.ts` with assertion helpers, and a `README.md` listing the Chrome DevTools MCP
steps. Fixtures are served by `npm run dev` and driven only through Chrome DevTools MCP.

Bootstrap: with `?built` in the URL the fixture loads `/dist/styles.css` and
`/dist/register/widgets.js`; otherwise it loads `/src/styles.css` and `/src/register/widgets.ts`.
A fixture that composes foundational components also loads `/dist/register.js` or
`/src/register.ts`, since `register/widgets` never defines a component. Keep fixtures outside
`src/`, Storybook discovery and package exports.
