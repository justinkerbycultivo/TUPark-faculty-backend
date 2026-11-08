import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './ui/Typography';
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
export default function ParkingSpaceGrid({ spaces = [], mySpaceIds = [], selectedIds = [], onSpacePress, capacity, occupied, remaining }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const mineSet = new Set(mySpaceIds.map(String));
  const selectedSet = new Set(selectedIds.map(String));
  const isUnavailable = (sp) => !['available', 'occupied', 'reserved'].includes(sp.status);

  const totalCapacity = capacity ?? spaces.length;
  const occupiedCount = occupied ?? spaces.filter((s) => s.status === 'occupied').length;
  const reservedCount = spaces.filter((s) => s.status === 'reserved').length;
  const remainingCount = remaining ?? spaces.filter((s) => s.status === 'available').length;

  const legendItems = [
    { tone: 'available', label: 'Available', color: colors.success },
    { tone: 'occupied', label: 'Occupied', color: colors.error },
    { tone: 'reserved', label: 'Reserved', color: colors.warning },
    { tone: 'selected', label: 'Selected', color: colors.selected },
    { tone: 'unavailable', label: 'Unavailable', color: colors.unavailable },
    { tone: 'mine', label: 'Mine', color: colors.mine },
  ];

  function colorFor(space) {
    if (mineSet.has(String(space._id))) return colors.mine;
    if (selectedSet.has(String(space._id))) return colors.selected;
    if (isUnavailable(space)) return colors.unavailable;
    if (space.status === 'occupied') return colors.error;
    if (space.status === 'reserved') return colors.warning;
    return colors.success;
  }

  function iconFor(space) {
    if (mineSet.has(String(space._id))) return 'map-marker-account';
    if (selectedSet.has(String(space._id))) return 'check-circle';
    if (isUnavailable(space)) return 'cancel';
    if (space.status === 'occupied') return 'car';
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
          const selected = selectedSet.has(String(space._id));
          const clickable = !!onSpacePress && space.status === 'available';
          return (
            <TouchableOpacity
              key={space._id}
              disabled={!clickable}
              onPress={() => onSpacePress && onSpacePress(space)}
              accessibilityLabel={`Space ${space.code}, ${mine ? 'assigned to you' : selected ? 'selected' : space.status}`}
              style={{
                width: 68,
                height: 58,
                margin: 4,
                borderRadius: radius.md,
                borderWidth: mine || selected ? 2 : 1,
                borderColor: mine || selected ? color : `${color}66`,
                backgroundColor: mine ? colors.mineBg : selected ? colors.selectedBg : isUnavailable(space) ? colors.unavailableBg : `${color}14`,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 1,
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
