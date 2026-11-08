const mongoose = require('mongoose');

// A node in the schematic (non-GPS) campus navigation graph.
// x/y are 2D layout coordinates used only for drawing the campus map.
// They are NOT surveyed GPS positions.

const campusNodeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ['entrance', 'intersection', 'area_entrance'],
      required: true,
    },

    // Controls whether this node can be used for entry, exit, or both.
    // Existing nodes without this field default to "both".
    direction: {
      type: String,
      enum: ['entry', 'exit', 'both'],
      default: 'both',
      required: true,
    },

    areaRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      default: null,
    },

    x: {
      type: Number,
      required: true,
    },

    y: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CampusNode', campusNodeSchema);
