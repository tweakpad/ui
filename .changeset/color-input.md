---
'@tweakpad/ui': minor
---

Color input (`tp-color-input`) chooses a color with the browser's own color picker and submits it with its form. By default it is a color chip in an outline swatch that opens the picker on a press, Enter or Space. `variant="inline"` makes it one compact row with the label at the start and, at the end, the chip and the color as text: type any CSS color and press Enter, or leave the text, to apply it, and text that is no color goes back to the current one. `show-swatch` and `show-value` choose what the row shows, `format` sets the notation (hex, rgb, hsl, hwb, hsv, lab, oklab, oklch or cmyk), `alpha` keeps transparency, and `picker="none"` turns the chip into a button for another picker to open. It joins a Field for its label, help text and errors, and works with `required`, `disabled`, `readonly` and form reset. React and Vue get a `ColorInput` binding.
