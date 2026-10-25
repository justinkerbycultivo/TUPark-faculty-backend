const express = require('express');
const router = express.Router();

const CampusNode = require('../models/CampusNode');
const CampusEdge = require('../models/CampusEdge');
const ParkingArea = require('../models/ParkingArea');
const { dijkstra } = require('../utils/pathfinding');

// GET /api/navigation/nodes — public (visitors need this without an account).
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await CampusNode.find();
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/navigation/edges — public.
router.get('/edges', async (req, res) => {
  try {
    const edges = await CampusEdge.find();
    res.json(edges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/navigation/route?from=<nodeKey>&to=<areaId>
// Server-side Dijkstra from a chosen entrance node to the area_entrance
// node linked to the given ParkingArea. Never fabricates a route: if the
// area has no linked node, or no path exists, returns a clear error.
router.get('/route', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'Provide both "from" (a node key) and "to" (a ParkingArea id).' });
    }

    const startNode = await CampusNode.findOne({ key: String(from).toUpperCase() });
    if (!startNode) {
      return res.status(404).json({ error: `Unknown starting point "${from}".` });
    }

    const area = await ParkingArea.findById(to);
    if (!area) {
      return res.status(404).json({ error: 'Parking area not found.' });
    }

    const destinationNode = await CampusNode.findOne({ areaRef: area._id, type: 'area_entrance' });
    if (!destinationNode) {
      return res.status(404).json({
        error: `No route data configured for "${area.name}" yet. An administrator needs to add a campus node for this area.`,
      });
    }

    const nodes = await CampusNode.find();
    const edges = await CampusEdge.find();

    const result = dijkstra(nodes, edges, startNode._id, destinationNode._id);
    if (!result) {
      return res.status(404).json({
        error: `No walkable route is currently configured between "${startNode.label}" and "${area.name}".`,
      });
    }

    res.json({
      area: { id: area._id, name: area.name, code: area.code },
      totalDistance: result.totalDistance,
      steps: result.path.map((hop, i) => ({
        node: { key: hop.node.key, label: hop.node.label, type: hop.node.type, x: hop.node.x, y: hop.node.y },
        instructions: i === 0 ? `Start at ${hop.node.label}.` : hop.instructions || `Continue to ${hop.node.label}.`,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
