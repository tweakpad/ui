---
'@tweakpad/ui': patch
---

A Text split or Image reveal that would start during a same-document view transition now waits for it to finish, standalone or in a group. Before, a client-side router's transition showed the first part of the reveal under its snapshots and the rest on the live page, so it looked like it played twice. Skipped and failed transitions release the reveal too. Immediate reveals (reduced motion, no intersection support) and browsers without `document.activeViewTransition` behave as before.
