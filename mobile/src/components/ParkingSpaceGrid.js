import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../context/ThemeContext';

// Renders a ParkingArea's spaces (from GET /areas/:id/spaces) as a
// responsive, wrapping grid. Status colors always carry a label via the
// legend, and "mine" uses a distinct teal accent that never gets confused
// with occupied-red or reserved-amber.
//
// props:
//  - spaces: ParkingSpace[]
//  - mySpaceIds: string[] — ids of spaces belonging to the viewer's own
//    active transaction/reservation, rendered with the "mine" accent
//  - onSpacePress(space) — optional tap handler (e.g. to reserve)
//  - capacity / occupied / remaining — optional header counts; derived from
//    `spaces` when not provided
export default function ParkingSpaceGrid({ spaces = [], mySpaceIds = [], onSpacePress, capacity, occupied, remaining }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const mineSet = new Set(mySpaceIds.map(String));

  const totalCapacity = capacity ?? spaces.length;
  const occupiedCount = occupied ?? spaces.filter((s) => s.status === 'occupied').length;
  const reservedCount = spaces.filter((s) => s.status === 'reserved').length;
  const remainingCount = remaining ?? Math.max(totalCapacity - occupiedCount - reservedCount, 0);

  const legendItems = [
    { tone: 'available', label: 'Available', color: colors.success },
    { tone: 'occupied', label: 'Occupied', color: colors.error },
    { tone: 'reserved', label: 'Reserved', color: colors.warning },
    { tone: 'mine', label: 'Mine', color: colors.mine },
  ];

  function colorFor(space) {
    if (mineSet.has(String(space._id))) return colors.mine;
    if (space.status === 'occupied') return colors.error;
    if (space.status === 'reserved') return colors.warning;
    return colors.success;
  }

  function iconFor(space) {
    if (mineSet.has(String(space._id))) return 'map-marker-account';
    if (space.status === 'occupied') return 'close';
    if (space.status === 'reserved') return 'clock-outline';
    return 'check';
  }

  return (
    <View>
      {/* Counts header */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        <CountPill label="Capacity" value={totalCapacity} color={colors.navy} colors={colors} />
        <CountPill label="Available" value={remainingCount} color={colors.success} colors={colors} />
        <CountPill label="Occupied" value={occupiedCount} color={colors.error} colors={colors} />
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
        {legendItems.map((item) => (
          <View key={item.tone} style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginBottom: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.color, marginRight: 5 }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: fontWeights.medium }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {spaces.map((space) => {
          const color = colorFor(space);
          const mine = mineSet.has(String(space._id));
          const clickable = !!onSpacePress && space.status === 'available';
          return (
            <TouchableOpacity
              key={space._id}
              disabled={!clickable}
              onPress={() => onSpacePress && onSpacePress(space)}
              accessibilityLabel={`Space ${space.code}, ${mine ? 'assigned to you' : space.status}`}
              style={{
                width: 72,
                height: 60,
                margin: 4,
                borderRadius: radius.sm,
                borderWidth: mine ? 2 : 1,
                borderColor: mine ? colors.mine : color,
                backgroundColor: mine ? colors.mineBg : `${color}1A`,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: clickable || mine || space.status !== 'available' ? 1 : 0.85,
              }}
            >
              <MaterialCommunityIcons name={iconFor(space)} size={14} color={color} />
              <Text style={{ color, fontSize: fontSizes.xs, fontWeight: fontWeights.bold, marginTop: 2 }}>
                {space.code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CountPill({ label, value, color, colors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
