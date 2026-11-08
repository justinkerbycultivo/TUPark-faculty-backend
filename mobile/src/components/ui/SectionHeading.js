import React from 'react';
import { View } from 'react-native';
import { Text } from './Typography';
import { useThemeColors } from '../../context/ThemeContext';

export default function SectionHeading({ title, subtitle, right, style }) {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}
