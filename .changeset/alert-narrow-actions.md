---
'@tweakpad/ui': patch
---

An Alert narrower than 30rem moves its actions to their own row under the text, lined up with it and spaced from it by the same gap as the icon. Before, the actions kept their column and squeezed the title and description down to a word per line. The Alert is now an inline-size container at full width, as a responsive Field is.
