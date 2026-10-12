---
'@tweakpad/ui': minor
---

Add `tp-cursor` and `tp-cursor-zone`: a decorative custom pointer that hides the native cursor for mouse and pen users and trails the pointer with a spring (stiffness, damping, mass, rest thresholds, published position and velocity) in the top layer, with zones that declare a named state, cloned template content, scoped `--tp-cursor-*` appearance, native passthrough, center or bounds attraction and physics overrides. Reduced motion keeps the cursor and snaps it; touch never engages it. Adds the Foundation `SpringFollower2D` and `FrameLoop`, and the shared `--tp-cursor-hidden` style query in the element base styles.
