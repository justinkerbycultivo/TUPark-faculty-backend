const mongoose = require('mongoose');

// A walkable edge between two CampusNodes, used by the Dijkstra pathfinder
// in utils/pathfinding.js. `distance` is an arbitrary relative unit, not a
// real measured distance.
const campusEdgeSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampusNode',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampusNode',
      required: true,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    bidirectional: {
      type: Boolean,
      default: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CampusEdge', campusEdgeSchema);
