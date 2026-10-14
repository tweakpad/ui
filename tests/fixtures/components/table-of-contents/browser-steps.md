# Table of contents checks (Chrome DevTools MCP)

Serve the repository with Vite (`npx vite --port 5199`) and open
`/tests/fixtures/components/table-of-contents/`. `?page=` selects the page (see the top of
`fixture.ts`); `?package` loads the built package after `npm run build`. Take snapshots with
`filePath` and grep them: the article text makes them long.

1. On `?page=end`, run
   `await (await import('/tests/fixtures/components/table-of-contents/api.ts')).verifyTableOfContents()`
   through MCP evaluation on a fresh load and expect every assertion message back (no thrown
   error): defaults and reflection, names, hidden marks, one mark per top-level item, mark states
   while navigating (a subsection highlights its top-level mark), a fixed strip size, membership
   and depth changes, the card covering the strip from its outer edge and centered, the indicator
   in the card, the indicator token on the current mark, and a runtime variant switch both ways.
2. Real pointer: hover the trigger and wait 300 ms; the card opens over the strip and stays open
   while the pointer rests. Move the pointer off the card: it closes. Click a link in the card: the
   page scrolls, the URL records the fragment, `tp-value-change` reports `link-press`, the card
   closes and focus returns to the trigger without a focus ring.
3. Real keyboard: Tab to the trigger (the card stays closed), press Enter: the card opens and the
   current link has focus with a visible ring. Escape closes it and returns focus to the trigger.
   A mouse press on the trigger opens the card and focuses the current link without a ring.
4. Placement: `?page=start` (side `inline-end`), `?page=start-flip` (default side, flips) and
   `?page=rtl` cover the strip from the left edge; `?page=end` from the right edge. Compare the card
   and strip rectangles after `setOpen(true)`.
5. `?page=long#chapter-30`: the strip is limited to 10rem, its 36 rows shrink to 4 px and every line
   stays visible. Open the card: it is capped at the viewport and scrolled so Chapter 30 shows.
6. Inspect the accessibility tree closed and open (verbose snapshot): `navigation "On this page"`,
   `button "On this page"` with expanded state, no mark nodes, `dialog "On this page"` holding a
   `list` of `listitem`s with links. Inject `/node_modules/axe-core/axe.min.js` and run it with the
   card closed and open: no violations.
7. Inspect screenshots in light and dark schemes: inactive lines in the border color, an active
   line in the muted foreground, the current line in the primary color; the card shows the title,
   rail, indicator and indented links of the list variant. Set `motion-policy="reduce"` on the
   table of contents: the card opens without animation and the lines change color at once.
8. `?page=list`: the list variant is unchanged. `?page=switch`: the Switch variant button toggles
   between both variants while the current item and indicator stay correct.
9. `/tests/fixtures/components/standalone/?component=TpTableOfContents`: only the table of contents,
   its items, Popover and Button are defined, and the compact card opens styled.
