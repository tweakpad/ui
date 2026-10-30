---
'@tweakpad/ui': minor
---

Glow border (`tp-mo-glow-border`) and Segment border (`tp-mo-segment-border`) open the Motion › Surface group. Each replaces the border of the surface it wraps, such as a Card, Button, Input or Select, with a drawn one at the same place, radius and width, and the surface keeps its size, focus ring and behavior. Glow border colors the line from a list of colors spread around it, turning white-hot where its light is closest, with a bloom and an optional wash; its light follows the pointer, a point or a moving element, or the glow runs on its own as evenly spaced comets, a turning sweep, a breathing pulse or a passing glint, and fades take a duration, an easing and a delay before fading out. Segment border draws its `tp-mo-border-segment` children over the line: pieces that move through their own states on hover, on focus or once in view, each with its own timing and an optional exit path, as a plain line or a glow. One `trigger` decides when each plays.
