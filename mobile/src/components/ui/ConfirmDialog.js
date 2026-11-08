import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text } from './Typography';
import { useThemeColors } from '../../context/ThemeContext';
import Button from './Button';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, marginBottom: spacing.xs }}>
            {title}
          </Text>
          {!!message && (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg, lineHeight: 20 }}>
              {message}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button
              title={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              fullWidth={false}
              style={{ marginRight: spacing.sm }}
            />
            <Button
              title={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
