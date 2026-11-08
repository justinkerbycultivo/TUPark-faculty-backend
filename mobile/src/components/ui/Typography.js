import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';

// Drop-in replacements for React Native's Text and TextInput that render in
// Inter. React Native needs a different font family per weight, so the
// fontWeight in each style is translated to the matching Inter face.
// If the fonts fail to load, setInterEnabled(false) falls back to the system font.
let interEnabled = true;
export function setInterEnabled(value) {
  interEnabled = !!value;
}

const FACES = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
};

function faceFor(weight) {
  if (weight === 'bold') return FACES[700];
  const n = parseInt(weight, 10);
  if (!Number.isFinite(n) || n <= 400) return FACES[400];
  if (n <= 500) return FACES[500];
  if (n <= 600) return FACES[600];
  return FACES[700];
}

function interStyle(style) {
  if (!interEnabled) return style;
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style;
  return { ...flat, fontFamily: faceFor(flat.fontWeight), fontWeight: 'normal' };
}

export function Text({ style, ...rest }) {
  return <RNText {...rest} style={interStyle(style)} />;
}

export const TextInput = React.forwardRef(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={interStyle(style)} />;
});
