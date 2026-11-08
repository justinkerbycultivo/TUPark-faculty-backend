import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui/Typography';
import { useThemeColors } from '../context/ThemeContext';

// Shows the user's profile picture, or their initial on a maroon circle.
export default function Avatar({ user, size = 44, style }) {
  const { colors, fontWeights } = useThemeColors();
  const letter = ((user && (user.givenName || user.formattedName)) || '?').charAt(0).toUpperCase();
  const base = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' };
  return (
    <View style={[base, style]} accessibilityLabel="Profile picture">
      {user && user.avatar ? (
        <Image source={{ uri: user.avatar }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: colors.onPrimary, fontSize: size * 0.4, fontWeight: fontWeights.bold }}>{letter}</Text>
      )}
    </View>
  );
}
