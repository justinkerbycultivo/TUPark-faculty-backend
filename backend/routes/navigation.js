const express = require('express');
const router = express.Router();

const CampusNode = require('../models/CampusNode');
const CampusEdge = require('../models/CampusEdge');
const ParkingArea = require('../models/ParkingArea');
const { dijkstra } = require('../utils/pathfinding');

const ALLOWED_ENTRY_DIRECTIONS = ['entry', 'both'];
const ALLOWED_EXIT_DIRECTIONS = ['exit', 'both'];

// GET /api/navigation/nodes
// Public: visitors may need campus navigation without an account.
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await CampusNode.find();
    return res.json(nodes);
  } catch (err) {
    console.error('Get navigation nodes error:', err);
    return res.status(500).json({
      message: 'Unable to retrieve navigation nodes.',
    });
  }
});

// GET /api/navigation/edges
// Public.
router.get('/edges', async (req, res) => {
  try {
    const edges = await CampusEdge.find();
    return res.json(edges);
  } catch (err) {
    console.error('Get navigation edges error:', err);
    return res.status(500).json({
      message: 'Unable to retrieve navigation edges.',
    });
  }
});

// Shared route response builder.
async function buildRoute(startNode, destinationNode, area, res) {
  const nodes = await CampusNode.find();
  const edges = await CampusEdge.find();

  const result = dijkstra(
    nodes,
    edges,
    startNode._id,
    destinationNode._id
  );

  if (!result) {
    return res.status(404).json({
      error: `No walkable route is currently configured between "${startNode.label}" and "${destinationNode.label}".`,
    });
  }

  return res.json({
    area: {
      id: area._id,
      name: area.name,
      code: area.code,
    },
    totalDistance: result.totalDistance,
    steps: result.path.map((hop, index) => ({
      node: {
        key: hop.node.key,
        label: hop.node.label,
        type: hop.node.type,
        x: hop.node.x,
        y: hop.node.y,
      },
      instructions:
        index === 0
          ? `Start at ${hop.node.label}.`
          : hop.instructions || `Continue to ${hop.node.label}.`,
    })),
  });
}

// GET /api/navigation/route?from=<nodeKey>&to=<areaId>
//
// ENTRY:
// Campus entrance -> parking area entry node.
router.get('/route', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message:
          'Provide both "from" (a starting node key) and "to" (a ParkingArea id).',
      });
    }

    const startNode = await CampusNode.findOne({
      key: String(from).trim().toUpperCase(),
    });

    if (!startNode) {
      return res.status(404).json({
        error: `Unknown starting point "${from}".`,
      });
    }

    if (
      startNode.type !== 'entrance' ||
      !ALLOWED_ENTRY_DIRECTIONS.includes(
        startNode.direction || 'both'
      )
    ) {
      return res.status(400).json({
        error: 'The selected starting point is not an allowed campus entry.',
      });
    }

    const area = await ParkingArea.findById(to);

    if (!area || !area.isActive) {
      return res.status(404).json({
        error: 'Active parking area not found.',
      });
    }

    const preferredEntryKey =
      `${String(area.code).toUpperCase()}_ENTRY`;

    let destinationNode = await CampusNode.findOne({
      areaRef: area._id,
      type: 'area_entrance',
      key: preferredEntryKey,
      direction: { $in: ALLOWED_ENTRY_DIRECTIONS },
    });

    if (!destinationNode) {
      destinationNode = await CampusNode.findOne({
        areaRef: area._id,
        type: 'area_entrance',
        direction: { $in: ALLOWED_ENTRY_DIRECTIONS },
      });
    }

    if (!destinationNode) {
      return res.status(404).json({
        error: `No valid entry route data configured for "${area.name}" yet.`,
      });
    }

    return await buildRoute(
      startNode,
      destinationNode,
      area,
      res
    );
  } catch (err) {
    console.error('Entry navigation error:', err);

    return res.status(500).json({
      message: 'Unable to calculate the entry route.',
    });
  }
});

// GET /api/navigation/exit-route?area=<areaId>
//
// EXIT:
// Parking area exit node -> campus vehicle exit.
//
// This route is independent from the entry route.
router.get('/exit-route', async (req, res) => {
  try {
    const { area } = req.query;

    if (!area) {
      return res.status(400).json({
        message: 'Provide "area" (a ParkingArea id).',
      });
    }

    if (!/^[a-fA-F0-9]{24}$/.test(String(area))) {
      return res.status(400).json({
        message: 'Invalid parking area ID.',
      });
    }

    const parkingArea = await ParkingArea.findOne({
      _id: area,
      isActive: true,
    });

    if (!parkingArea) {
      return res.status(404).json({
        error: 'Active parking area not found.',
      });
    }

    const exitNodeKey =
      `${String(parkingArea.code).toUpperCase()}_EXIT`;

    const startNode = await CampusNode.findOne({
      key: exitNodeKey,
      type: 'area_entrance',
      areaRef: parkingArea._id,
      direction: { $in: ALLOWED_EXIT_DIRECTIONS },
    });

    if (!startNode) {
      return res.status(404).json({
        error: `No valid parking exit node configured for "${parkingArea.name}" yet.`,
      });
    }

    const destinationNode = await CampusNode.findOne({
      key: 'CAMPUS_EXIT',
      type: 'entrance',
      direction: { $in: ALLOWED_EXIT_DIRECTIONS },
    });

    if (!destinationNode) {
      return res.status(404).json({
        error: 'The campus vehicle exit node has not been configured yet.',
      });
    }

    return await buildRoute(
      startNode,
      destinationNode,
      parkingArea,
      res
    );
  } catch (err) {
    console.error('Exit navigation error:', err);

    return res.status(500).json({
      message: 'Unable to calculate the exit route.',
    });
  }
});

module.exports = router;
