---
"@vitessce/gl": patch
"@vitessce/scatterplot": patch
---

Speed up lasso selection in the embedding scatterplot at millions of points. The selection layer can scan every point instead of first building a quadtree (which took about half a second on the first lasso), and tests points against the lasso with an edge index, so the cost no longer grows with the number of lasso vertices. The scatterplot also passes its fill, outline and selection values to deck.gl as typed arrays, instead of deck.gl calling an accessor and normalizing the result for every point after each selection.
