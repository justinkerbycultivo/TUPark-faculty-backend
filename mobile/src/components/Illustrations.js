import React from 'react';
import Svg, { Rect, Circle, Path, Line, G } from 'react-native-svg';
import { useThemeColors } from '../context/ThemeContext';

// Small, minimal line illustrations for empty states. Drawn with the theme
// colors so they work in light and dark mode.

// A car beside a parking bay: "nothing parked / no session".
export function ParkingIllustration({ size = 120 }) {
  const { colors } = useThemeColors();
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 120 84" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x="4" y="60" width="112" height="3" rx="1.5" fill={colors.border} />
      <Rect x="14" y="30" width="38" height="30" rx="4" fill="none" stroke={colors.border} strokeWidth="2" />
      <Line x1="20" y1="60" x2="20" y2="54" stroke={colors.border} strokeWidth="2" />
      <Circle cx="33" cy="45" r="9" fill={colors.primarySoft} />
      <Path d="M29 51 V39 H34 a4 4 0 0 1 0 8 H29" fill="none" stroke={colors.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <G>
        <Path d="M66 56 v-9 a3 3 0 0 1 3 -3 h4 l5 -7 h16 l5 7 h4 a3 3 0 0 1 3 3 v9 z" fill={colors.surfaceAlt} stroke={colors.textMuted} strokeWidth="2" strokeLinejoin="round" />
        <Circle cx="78" cy="58" r="4.5" fill={colors.surface} stroke={colors.textMuted} strokeWidth="2" />
        <Circle cx="102" cy="58" r="4.5" fill={colors.surface} stroke={colors.textMuted} strokeWidth="2" />
      </G>
    </Svg>
  );
}

// An empty tray: "nothing here yet".
export function EmptyListIllustration({ size = 120 }) {
  const { colors } = useThemeColors();
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 120 84" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x="20" y="22" width="80" height="44" rx="8" fill={colors.surfaceAlt} stroke={colors.border} strokeWidth="2" />
      <Path d="M20 48 h26 a6 6 0 0 0 6 6 h16 a6 6 0 0 0 6 -6 h26" fill="none" stroke={colors.border} strokeWidth="2" strokeLinejoin="round" />
      <Circle cx="60" cy="14" r="3" fill={colors.primarySoft} />
      <Circle cx="44" cy="10" r="2" fill={colors.primarySoft} />
      <Circle cx="76" cy="10" r="2" fill={colors.primarySoft} />
    </Svg>
  );
}

// A QR frame: "scan to begin".
export function ScanIllustration({ size = 120 }) {
  const { colors } = useThemeColors();
  const c = colors.primary;
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 120 84" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M36 14 h-10 a4 4 0 0 0 -4 4 v10 M84 14 h10 a4 4 0 0 1 4 4 v10 M36 70 h-10 a4 4 0 0 1 -4 -4 v-10 M84 70 h10 a4 4 0 0 0 4 -4 v-10" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <Rect x="40" y="28" width="14" height="14" rx="2" fill={colors.primarySoft} stroke={c} strokeWidth="2" />
      <Rect x="66" y="28" width="14" height="14" rx="2" fill={colors.primarySoft} stroke={c} strokeWidth="2" />
      <Rect x="40" y="48" width="14" height="14" rx="2" fill={colors.primarySoft} stroke={c} strokeWidth="2" />
      <Rect x="66" y="48" width="6" height="6" fill={c} />
      <Rect x="74" y="56" width="6" height="6" fill={c} />
    </Svg>
  );
}
