import React from 'react';
import { View } from 'react-native';
import { Text } from './Typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';

// tone: 'success' | 'warning' | 'error' | 'mine' | 'neutral' | 'info'
// Every status carries BOTH a color and a text label (+ optional icon) —
// never color alone, per the accessibility requirement.
const TONE_ICON = {
  success: 'check-circle',
  warning: 'alert-circle',
  error: 'close-circle',
  mine: 'map-marker-account',
  info: 'information',
  neutral: 'circle-outline',
};

export default function StatusBadge({ label, tone = 'neutral', style, compact = false }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  const toneColors = {
    success: { fg: colors.success, bg: colors.successBg },
    warning: { fg: colors.warning, bg: colors.warningBg },
    error: { fg: colors.error, bg: colors.errorBg },
    mine: { fg: colors.mine, bg: colors.mineBg },
    info: { fg: colors.navy, bg: colors.surfaceAlt },
    neutral: { fg: colors.textMuted, bg: colors.surfaceAlt },
  };
  const t = toneColors[tone] || toneColors.neutral;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: t.bg,
          borderRadius: radius.pill,
          paddingVertical: compact ? 2 : spacing.xs,
          paddingHorizontal: compact ? spacing.xs : spacing.sm + 2,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={TONE_ICON[tone] || TONE_ICON.neutral} size={compact ? 12 : 14} color={t.fg} />
      <Text
        style={{
          color: t.fg,
          fontSize: compact ? fontSizes.xs : fontSizes.sm,
          fontWeight: fontWeights.semibold,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
