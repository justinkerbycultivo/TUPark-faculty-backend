import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../context/ThemeContext';
import { VEHICLE_TYPES } from '../utils/vehicleTypes';
import Input from './ui/Input';

// Clean grid/chip selector for the 8 backend vehicle types. Reveals a free
// text field for "Other" and reports it back via onOtherChange.
export default function VehicleTypePicker({ value, onChange, otherValue, onOtherChange, error, otherError }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginBottom: spacing.xs }}>
        Vehicle Type
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {VEHICLE_TYPES.map((type) => {
          const selected = value === type.key;
          return (
            <TouchableOpacity
              key={type.key}
              onPress={() => onChange(type.key)}
              accessibilityRole="button"
              accessibilityLabel={type.label}
              accessibilityState={{ selected }}
              style={{
                width: '31%',
                margin: '1.16%',
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name={type.icon}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
              <Text
                numberOfLines={2}
                style={{
                  marginTop: 4,
                  textAlign: 'center',
                  fontSize: fontSizes.xs,
                  fontWeight: selected ? fontWeights.bold : fontWeights.medium,
                  color: selected ? colors.primary : colors.text,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!error && (
        <Text style={{ color: colors.error, fontSize: fontSizes.xs, marginTop: 4, fontWeight: fontWeights.medium }}>
          {error}
        </Text>
      )}

      {value === 'other' && (
        <Input
          label="Please specify your vehicle type"
          value={otherValue}
          onChangeText={onOtherChange}
          placeholder="e.g. Golf cart"
          error={otherError}
          containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }}
        />
      )}
    </View>
  );
}
