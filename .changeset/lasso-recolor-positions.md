---
"@vitessce/utils": patch
"@vitessce/gl": patch
"@vitessce/sets-utils": patch
"@vitessce/scatterplot-embedding": patch
"@vitessce/scatterplot-gating": patch
---

Color lasso selections faster on large datasets. The selection layer records the positions its hit test found, so the new set is color-encoded without looking up every selected ID in the observation index again. The embedding and gating scatterplots also keep their loading indicator up until the new colors are shown, instead of clearing it while the previous colors are still on screen.
