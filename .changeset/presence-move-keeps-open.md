---
'@tweakpad/ui': patch
---

An open region that is moved in the document, such as a Tree view section carried into the next page by a client-side router, stays open instead of replaying its entry. Before, the move collapsed every open Tree view group for a frame and slid it open again, and a scrolled container around the tree lost its scroll position. The change is in the shared presence lifecycle, so other open presence regions also keep their state when moved. A region moved while it is still opening or closing starts that transition again, as before.
