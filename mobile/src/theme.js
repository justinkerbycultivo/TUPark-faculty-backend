// Centralized design tokens for the TUPark mobile app.
//
// Palette: deep university red as primary, white as secondary, with
// charcoal / navy / neutral gray as supporting colors and a subtle gold
// used sparingly as an accent (active tab indicator, highlights).
// Status colors always carry a text label/icon alongside color — never
// color alone — per the accessibility requirement.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  pill: 999,
};

// Inter faces are loaded in App.js; ui/Typography maps fontWeight to them.
export const fonts = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const lightColors = {
  mode: 'light',
  primary: '#8B1538',
  primaryDark: '#6B0F2A',
  primarySoft: '#F6E3E8',
  secondary: '#FFFFFF',
  charcoal: '#2B2B2E',
  navy: '#1B2A4A',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  text: '#202124',
  textMuted: '#737780',
  border: '#E6E8EC',
  accentGold: '#B8860B',
  onPrimary: '#FFFFFF',
  success: '#1E8A4C',
  successBg: '#E3F3E9',
  warning: '#B8700A',
  warningBg: '#FBEFD9',
  error: '#C62828',
  errorBg: '#FBE3E3',
  mine: '#0B8C8C',
  mineBg: '#DFF4F4',
  selected: '#1B2A4A',
  selectedBg: '#E4E9F4',
  unavailable: '#9AA0A8',
  unavailableBg: '#ECEEF1',
  shadow: '#000000',
};

const darkColors = {
  mode: 'dark',
  primary: '#D14E70',
  primaryDark: '#A8324F',
  primarySoft: '#3A1E26',
  secondary: '#1C1A1B',
  charcoal: '#ECEAEB',
  navy: '#9FB1D8',
  gray: '#A6A0A3',
  grayLight: '#3A373A',
  background: '#121113',
  surface: '#1D1B1D',
  surfaceAlt: '#262327',
  text: '#F3F0F1',
  textMuted: '#A9A2A6',
  border: '#36323686',
  accentGold: '#E3BE5C',
  onPrimary: '#FFFFFF',
  success: '#43C277',
  successBg: '#133622',
  warning: '#E0A83E',
  warningBg: '#3A2D10',
  error: '#E2645F',
  errorBg: '#3C1818',
  mine: '#35D6D6',
  mineBg: '#113333',
  selected: '#9FB1D8',
  selectedBg: '#1E2740',
  unavailable: '#7C828B',
  unavailableBg: '#26282C',
  shadow: '#000000',
};

export const palettes = { light: lightColors, dark: darkColors };

export default { spacing, radius, fonts, fontSizes, fontWeights, palettes };
