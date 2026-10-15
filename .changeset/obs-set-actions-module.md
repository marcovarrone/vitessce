---
"@vitessce/sets-utils": patch
---

Replace `setObsSelection` with `createObsSetActions(values, setters)`, whose `selectObs` and `selectSets` actions own creating selection sets under "My Selections" (without mutating the previous tree), clearing the selection on empty input, and switching to set coloring. `getNextNumberedNodeName` no longer treats "Selection 10" as using the name "Selection 1".
