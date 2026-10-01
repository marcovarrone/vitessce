---
"@vitessce/scatterplot-embedding": patch
"@vitessce/scatterplot-gating": patch
---

Recolor scatterplots once after a lasso selection. The new selection's sets, selection and colors are now deferred together, so the view no longer re-encodes every observation first with the new sets and the previous selection.
