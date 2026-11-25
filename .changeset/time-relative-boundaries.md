---
'@tweakpad/ui': patch
---

`tp-time` in relative mode reads "last month" and "last year" (or "next month", "next year") for values exactly 30 or 365 days away, which used to read "now".
