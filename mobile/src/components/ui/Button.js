import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { useThemeColors } from '../../context/ThemeContext';

// variant: 'primary' | 'secondary' | 'destructive' | 'ghost'
export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon = null,
  style,
  accessibilityLabel,
  fullWidth = true,
}) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary, textColor: colors.onPrimary },
    secondary: { backgroundColor: 'transparent', borderColor: colors.primary, textColor: colors.primary },
    destructive: { backgroundColor: colors.error, borderColor: colors.error, textColor: '#FFFFFF' },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent', textColor: colors.primary },
  };
  const v = variantStyles[variant] || variantStyles.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        {
          backgroundColor: v.backgroundColor,
          borderColor: v.borderColor,
          borderRadius: radius.md,
          minHeight: 48,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon}
          <Text
            style={{
              color: v.textColor,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              marginLeft: icon ? spacing.xs : 0,
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
