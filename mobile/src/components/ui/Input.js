import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, TextInput } from './Typography';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';

export default function Input({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline = false,
  editable = true,
  rightElement,
  containerStyle,
  ...rest
}) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {!!label && (
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.semibold,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: error ? colors.error : colors.border,
          borderRadius: radius.md,
          backgroundColor: editable ? colors.surface : colors.surfaceAlt,
          paddingHorizontal: spacing.sm + 2,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPasswordField && hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          editable={editable}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSizes.md,
            paddingVertical: multiline ? spacing.sm : spacing.sm + 2,
            minHeight: multiline ? 90 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          {...rest}
        />
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {!isPasswordField && rightElement}
      </View>
      {!!error && (
        <Text style={{ color: colors.error, fontSize: fontSizes.xs, marginTop: 4, fontWeight: fontWeights.medium }}>
          {error}
        </Text>
      )}
    </View>
  );
}
