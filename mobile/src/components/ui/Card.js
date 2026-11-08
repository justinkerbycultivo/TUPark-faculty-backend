import React from 'react';
import { View } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';

export default function Card({ children, style, padded = true }) {
  const { colors, spacing, radius } = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? spacing.md : 0,
          shadowColor: colors.shadow,
          shadowOpacity: colors.mode === 'dark' ? 0 : 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: colors.mode === 'dark' ? 0 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
