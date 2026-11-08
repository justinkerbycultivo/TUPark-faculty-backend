const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const { requireRole } = require('../middleware/auth');

const CampusNode = require('../models/CampusNode');
const CampusEdge = require('../models/CampusEdge');
const ParkingArea = require('../models/ParkingArea');

const MAP_WIDTH = 3204;
const MAP_HEIGHT = 2034;

const VALID_TYPES = [
  'entrance',
  'intersection',
  'area_entrance',
];

const VALID_DIRECTIONS = [
  'entry',
  'exit',
  'both',
];

router.use(requireRole('admin'));

function normalizeGraph(body) {
  const errors = [];
  const nodes = [];
  const edges = [];

  if (
    !body ||
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges)
  ) {
    return {
      errors: ['Both nodes and edges must be arrays.'],
      nodes,
      edges,
    };
  }

  if (body.nodes.length === 0) {
    errors.push('At least one node is required.');
  }

  if (body.nodes.length > 100 || body.edges.length > 300) {
    errors.push('The proposed graph exceeds the allowed size.');
  }

  const nodeKeys = new Set();

  for (let i = 0; i < body.nodes.length; i += 1) {
    const item = body.nodes[i];
    const label = `nodes[${i}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label} must be an object.`);
      continue;
    }

    const key = String(item.key || '').trim().toUpperCase();
    const nodeLabel = String(item.label || '').trim();
    const direction = item.direction || 'both';
    const areaCode = String(item.areaCode || '').trim().toUpperCase();

    if (!/^[A-Z0-9_]+$/.test(key)) {
      errors.push(`${label}.key is invalid.`);
      continue;
    }

    if (nodeKeys.has(key)) {
      errors.push(`Duplicate node key: ${key}.`);
      continue;
    }

    nodeKeys.add(key);

    if (!nodeLabel) {
      errors.push(`${label}.label is required.`);
    }

    if (!VALID_TYPES.includes(item.type)) {
      errors.push(`${label}.type is invalid.`);
    }

    if (!VALID_DIRECTIONS.includes(direction)) {
      errors.push(`${label}.direction is invalid.`);
    }

    if (
      typeof item.x !== 'number' ||
      !Number.isFinite(item.x) ||
      item.x < 0 ||
      item.x > MAP_WIDTH
    ) {
      errors.push(`${label}.x must be between 0 and ${MAP_WIDTH}.`);
    }

    if (
      typeof item.y !== 'number' ||
      !Number.isFinite(item.y) ||
      item.y < 0 ||
      item.y > MAP_HEIGHT
    ) {
      errors.push(`${label}.y must be between 0 and ${MAP_HEIGHT}.`);
    }

    if (item.type === 'area_entrance' && !areaCode) {
      errors.push(`${label}.areaCode is required.`);
    }

    nodes.push({
      key,
      label: nodeLabel,
      type: item.type,
      direction,
      areaCode,
      x: item.x,
      y: item.y,
    });
  }

  const nodeMap = new Map(nodes.map((node) => [node.key, node]));

  const requiredNodes = [
    {
      key: 'CAMPUS_ENTRY',
      type: 'entrance',
      directions: ['entry', 'both'],
    },
    {
      key: 'CAMPUS_EXIT',
      type: 'entrance',
      directions: ['exit', 'both'],
    },
    {
      key: 'MGL_ENTRY',
      type: 'area_entrance',
      directions: ['entry', 'both'],
    },
    {
      key: 'MGL_EXIT',
      type: 'area_entrance',
      directions: ['exit', 'both'],
    },
  ];

  for (const required of requiredNodes) {
    const node = nodeMap.get(required.key);

    if (!node) {
      errors.push(`Required node ${required.key} is missing.`);
      continue;
    }

    if (node.type !== required.type) {
      errors.push(`${required.key} must have type "${required.type}".`);
    }

    if (!required.directions.includes(node.direction)) {
      errors.push(`${required.key} has an invalid direction.`);
    }
  }

  for (const key of ['MGL_ENTRY', 'MGL_EXIT']) {
    const node = nodeMap.get(key);

    if (
      node &&
      node.type === 'area_entrance' &&
      node.areaCode !== 'MGL'
    ) {
      errors.push(`${key} must reference parking area code MGL.`);
    }
  }

  const edgePairs = new Set();

  for (let i = 0; i < body.edges.length; i += 1) {
    const item = body.edges[i];
    const label = `edges[${i}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label} must be an object.`);
      continue;
    }

    const from = String(item.from || '').trim().toUpperCase();
    const to = String(item.to || '').trim().toUpperCase();

    if (!nodeMap.has(from)) {
      errors.push(`${label}.from references unknown node: ${from}.`);
    }

    if (!nodeMap.has(to)) {
      errors.push(`${label}.to references unknown node: ${to}.`);
    }

    if (from && to && from === to) {
      errors.push(`${label} cannot connect a node to itself.`);
    }

    if (
      typeof item.distance !== 'number' ||
      !Number.isFinite(item.distance) ||
      item.distance <= 0
    ) {
      errors.push(`${label}.distance must be a positive number.`);
    }

    if (typeof item.bidirectional !== 'boolean') {
      errors.push(`${label}.bidirectional must be true or false.`);
    }

    if (
      item.instructions !== undefined &&
      typeof item.instructions !== 'string'
    ) {
      errors.push(`${label}.instructions must be a string.`);
    }

    const pair = `${from}::${to}`;

    if (from && to && edgePairs.has(pair)) {
      errors.push(`Duplicate directed edge: ${from} -> ${to}.`);
    } else if (from && to) {
      edgePairs.add(pair);
    }

    edges.push({
      from,
      to,
      distance: item.distance,
      bidirectional: item.bidirectional,
      instructions: item.instructions || '',
    });
  }

  return { errors, nodes, edges };
}

function hasPath(startKey, destinationKey, nodes, edges) {
  const adjacency = new Map();

  nodes.forEach((node) => {
    adjacency.set(node.key, []);
  });

  edges.forEach((edge) => {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) {
      return;
    }

    adjacency.get(edge.from).push(edge.to);

    if (edge.bidirectional === true) {
      adjacency.get(edge.to).push(edge.from);
    }
  });

  const visited = new Set([startKey]);
  const queue = [startKey];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === destinationKey) {
      return true;
    }

    for (const next of adjacency.get(current) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

async function validateCompleteGraph(body) {
  const result = normalizeGraph(body);
  const { errors, nodes, edges } = result;

  let mglArea = null;

  if (errors.length === 0) {
    mglArea = await ParkingArea.findOne({
      code: 'MGL',
      isActive: true,
    });

    if (!mglArea) {
      errors.push('No active MGL parking area exists.');
    }
  }

  if (errors.length === 0) {
    for (const node of nodes) {
      if (node.type !== 'area_entrance') {
        continue;
      }

      const area = await ParkingArea.findOne({
        code: node.areaCode,
        isActive: true,
      });

      if (!area) {
        errors.push(
          `${node.key} references an inactive or unknown parking area: ${node.areaCode}.`
        );
      }
    }
  }

  let entryConnected = false;
  let exitConnected = false;

  if (errors.length === 0) {
    entryConnected = hasPath(
      'CAMPUS_ENTRY',
      'MGL_ENTRY',
      nodes,
      edges
    );

    exitConnected = hasPath(
      'MGL_EXIT',
      'CAMPUS_EXIT',
      nodes,
      edges
    );

    if (!entryConnected) {
      errors.push(
        'No directed entry path exists from CAMPUS_ENTRY to MGL_ENTRY.'
      );
    }

    if (!exitConnected) {
      errors.push(
        'No directed exit path exists from MGL_EXIT to CAMPUS_EXIT.'
      );
    }
  }

  return {
    ...result,
    mglArea,
    entryConnected,
    exitConnected,
  };
}

// GET /api/admin/navigation/status
// Read-only status check.
router.get('/status', async (req, res) => {
  try {
    const [nodes, edges, parkingAreas] = await Promise.all([
      CampusNode.find().sort({ key: 1 }),
      CampusEdge.find().populate('from to').sort({ createdAt: 1 }),
      ParkingArea.find({ isActive: true }).select('name code capacity'),
    ]);

    return res.json({
      map: {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
      },
      counts: {
        nodes: nodes.length,
        edges: edges.length,
      },
      parkingAreas,
      nodes,
      edges,
    });
  } catch (error) {
    console.error('Admin navigation status error:', error);

    return res.status(500).json({
      message: 'Unable to retrieve navigation configuration.',
    });
  }
});

// POST /api/admin/navigation/validate
// Dry-run validation only. Never saves proposed data.
router.post('/validate', async (req, res) => {
  try {
    const result = await validateCompleteGraph(req.body);

    return res.status(result.errors.length ? 400 : 200).json({
      valid: result.errors.length === 0,
      dryRun: true,
      saved: false,
      summary: {
        proposedNodes: result.nodes.length,
        proposedEdges: result.edges.length,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        entryConnected: result.entryConnected,
        exitConnected: result.exitConnected,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error('Admin navigation validation error:', error);

    return res.status(500).json({
      valid: false,
      dryRun: true,
      saved: false,
      message: 'Unable to validate the proposed navigation graph.',
    });
  }
});

// POST /api/admin/navigation/setup
// Saves a complete graph only when the navigation collections are empty.
// Requires an explicit confirmation phrase in the request body.
router.post('/setup', async (req, res) => {
  let session;

  try {
    if (req.body?.confirmation !== 'SAVE_TUPARK_NAVIGATION') {
      return res.status(400).json({
        saved: false,
        message: 'Explicit setup confirmation is required.',
      });
    }

    const result = await validateCompleteGraph(req.body);

    if (result.errors.length > 0) {
      return res.status(400).json({
        saved: false,
        valid: false,
        errors: result.errors,
      });
    }

    session = await CampusNode.db.startSession();

    await session.withTransaction(async () => {
      const [existingNodes, existingEdges] = await Promise.all([
        CampusNode.countDocuments({}).session(session),
        CampusEdge.countDocuments({}).session(session),
      ]);

      if (existingNodes > 0 || existingEdges > 0) {
        const error = new Error(
          'Navigation records already exist. Setup refused; no records were changed.'
        );
        error.code = 'NAVIGATION_ALREADY_CONFIGURED';
        throw error;
      }

      const areaCodes = [
        ...new Set(
          result.nodes
            .filter((node) => node.type === 'area_entrance')
            .map((node) => node.areaCode)
        ),
      ];

      const areas = await ParkingArea.find({
        code: { $in: areaCodes },
        isActive: true,
      }).session(session);

      const areaMap = new Map(
        areas.map((area) => [area.code, area._id])
      );

      const nodeOperations = result.nodes.map((node) => ({
        insertOne: {
          document: {
            key: node.key,
            label: node.label,
            type: node.type,
            direction: node.direction,
            areaRef:
              node.type === 'area_entrance'
                ? areaMap.get(node.areaCode)
                : null,
            x: node.x,
            y: node.y,
          },
        },
      }));

      if (nodeOperations.length > 0) {
        await CampusNode.bulkWrite(nodeOperations, { session });
      }

      const savedNodes = await CampusNode.find({})
        .session(session)
        .select('_id key');

      const nodeIdMap = new Map(
        savedNodes.map((node) => [node.key, node._id])
      );

      const edgeOperations = result.edges.map((edge) => {
        const fromId = nodeIdMap.get(edge.from);
        const toId = nodeIdMap.get(edge.to);

        if (!fromId || !toId) {
          throw new Error(
            `Unable to resolve edge endpoints: ${edge.from} -> ${edge.to}.`
          );
        }

        return {
          insertOne: {
            document: {
              from: fromId,
              to: toId,
              distance: edge.distance,
              bidirectional: edge.bidirectional,
              instructions: edge.instructions,
            },
          },
        };
      });

      if (edgeOperations.length > 0) {
        await CampusEdge.bulkWrite(edgeOperations, { session });
      }
    });

    const [nodeCount, edgeCount] = await Promise.all([
      CampusNode.countDocuments({}),
      CampusEdge.countDocuments({}),
    ]);

    return res.status(201).json({
      saved: true,
      message: 'Campus navigation graph saved successfully.',
      counts: {
        nodes: nodeCount,
        edges: edgeCount,
      },
      routes: {
        entryConnected: result.entryConnected,
        exitConnected: result.exitConnected,
      },
    });
  } catch (error) {
    if (error.code === 'NAVIGATION_ALREADY_CONFIGURED') {
      return res.status(409).json({
        saved: false,
        message: error.message,
      });
    }

    console.error('Admin navigation setup error:', error);

    return res.status(500).json({
      saved: false,
      message: 'Unable to save the campus navigation graph.',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;
