---
'@tweakpad/ui': patch
---

Tree view groups in markup mode now behave like records mode:

- Groups in `default-expanded` appear at full height on first render, as documented, instead of sliding open.
- Pressing a row runs the group's enter and exit motion, so a collapse animates instead of hiding at once.
- A settled open group follows its content's height without animating when that height changes; the measured extent only drives the enter and exit transitions.
