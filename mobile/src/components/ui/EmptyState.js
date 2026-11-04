import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';

export default function EmptyState({ icon = 'information-outline', title, message, children }) {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <MaterialCommunityIcons name={icon} size={40} color={colors.textMuted} />
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
            lineHeight: 19,
          }}
        >
          {message}
        </Text>
      )}
      {children}
    </View>
  );
}
