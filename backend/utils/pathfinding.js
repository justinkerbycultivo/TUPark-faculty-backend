// Simple Dijkstra shortest-path implementation over the campus navigation
// graph (CampusNode / CampusEdge), using edge `distance` as the weight.

// nodes: array of CampusNode docs (plain objects with _id, key, label, ...)
// edges: array of CampusEdge docs (plain objects with from, to, distance, bidirectional, instructions)
// startId / endId: Mongo ObjectId (or string) of the start/end CampusNode
//
// Returns an ordered array of { node, instructions } hops from start to end
// (inclusive of both ends; instructions on the start hop is null), or null
// if no path exists.
function dijkstra(nodes, edges, startId, endId) {
  const startKey = String(startId);
  const endKey = String(endId);

  const nodeById = new Map(nodes.map((n) => [String(n._id), n]));
  if (!nodeById.has(startKey) || !nodeById.has(endKey)) return null;

  const adjacency = new Map();
  for (const node of nodes) adjacency.set(String(node._id), []);

  for (const edge of edges) {
    const fromKey = String(edge.from);
    const toKey = String(edge.to);
    if (!adjacency.has(fromKey) || !adjacency.has(toKey)) continue;
    adjacency.get(fromKey).push({ to: toKey, distance: edge.distance, instructions: edge.instructions });
    if (edge.bidirectional) {
      adjacency.get(toKey).push({ to: fromKey, distance: edge.distance, instructions: edge.instructions });
    }
  }

  const dist = new Map();
  const prev = new Map(); // nodeKey -> { fromKey, instructions }
  const visited = new Set();

  for (const key of adjacency.keys()) dist.set(key, Infinity);
  dist.set(startKey, 0);

  while (visited.size < adjacency.size) {
    let currentKey = null;
    let currentDist = Infinity;
    for (const [key, d] of dist.entries()) {
      if (!visited.has(key) && d < currentDist) {
        currentDist = d;
        currentKey = key;
      }
    }
    if (currentKey === null) break; // remaining nodes unreachable
    if (currentKey === endKey) break;

    visited.add(currentKey);
    const neighbors = adjacency.get(currentKey) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      const candidate = currentDist + neighbor.distance;
      if (candidate < dist.get(neighbor.to)) {
        dist.set(neighbor.to, candidate);
        prev.set(neighbor.to, { fromKey: currentKey, instructions: neighbor.instructions });
      }
    }
  }

  if (dist.get(endKey) === undefined || dist.get(endKey) === Infinity) return null;

  // Reconstruct path.
  const path = [];
  let cursorKey = endKey;
  while (cursorKey !== undefined) {
    const entry = prev.get(cursorKey);
    path.unshift({
      node: nodeById.get(cursorKey),
      instructions: entry ? entry.instructions : null,
    });
    if (cursorKey === startKey) break;
    cursorKey = entry ? entry.fromKey : undefined;
  }

  if (!path.length || String(path[0].node._id) !== startKey) return null;

  return { totalDistance: dist.get(endKey), path };
}

module.exports = { dijkstra };
