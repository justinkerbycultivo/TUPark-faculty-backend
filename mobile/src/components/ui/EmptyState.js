import React from 'react';
import { View } from 'react-native';
import { Text } from './Typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { ParkingIllustration, EmptyListIllustration, ScanIllustration } from '../Illustrations';

// illustration: 'parking' | 'list' | 'scan' | null. When omitted, parking-
// and vehicle-related icons get the parking drawing and everything else the
// empty-tray drawing. Pass illustration={null} to use just the icon.
const PARKING_ICONS = ['car-off', 'car', 'parking', 'car-outline', 'motorbike', 'map-marker-off'];

export default function EmptyState({ icon = 'information-outline', title, message, illustration, children }) {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const kind = illustration === undefined ? (PARKING_ICONS.includes(icon) ? 'parking' : 'list') : illustration;
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg }}>
      {kind === 'parking' && <ParkingIllustration />}
      {kind === 'scan' && <ScanIllustration />}
      {kind === 'list' && <EmptyListIllustration />}
      {!kind && <MaterialCommunityIcons name={icon} size={40} color={colors.textMuted} />}
      {!!title && (
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.md,
            fontWeight: fontWeights.semibold,
            marginTop: spacing.sm,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      )}
      {!!message && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.sm,
            marginTop: spacing.xs,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      )}
      {children}
    </View>
  );
}
