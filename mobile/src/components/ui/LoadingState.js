import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './Typography';
import { useThemeColors } from '../../context/ThemeContext';

export default function LoadingState({ message = 'Loading...', fullScreen = true }) {
  const { colors, spacing, fontSizes } = useThemeColors();
  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        paddingVertical: fullScreen ? 0 : spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fullScreen ? colors.background : 'transparent',
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.sm }}>{message}</Text>
    </View>
  );
}
