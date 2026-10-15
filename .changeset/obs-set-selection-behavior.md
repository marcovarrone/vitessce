---
"@vitessce/constants-internal": patch
"@vitessce/heatmap": patch
"@vitessce/obs-sets-manager": patch
"@vitessce/scatterplot-embedding": patch
"@vitessce/scatterplot-gating": patch
"@vitessce/spatial": patch
"@vitessce/spatial-beta": patch
"@vitessce/statistical-plots": patch
---

Route every obs set selection through `createObsSetActions`. A lasso that selects no obs (including a lasso that misses a spatialBeta layer) now clears that selection instead of creating an empty "Selection N" set. Selecting sets in the heatmap, set sizes, set composition and treemap views now switches to set coloring, and the heatmap no longer writes the invalid `obsColorEncoding` value `'cellSelection'`. The obsSetSizes and obsSetCompositionBarPlot views now use the `obsColorEncoding` coordination type.
