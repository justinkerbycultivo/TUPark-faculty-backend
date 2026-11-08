
import React, { useState, useRef } from 'react';
import { View } from 'react-native';

import { Text } from '../../components/ui/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

import { changePassword } from '../../api/api';
import {
  isValidPassword,
  extractErrorMessage,
} from '../../utils/validators';

export default function ChangePasswordScreen() {
  const { colors, spacing, fontSizes, fontWeights, radius } =
    useThemeColors();

  const { logout } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const busy = useRef(false);

  async function submit() {
    if (busy.current) return;

    setFormError('');
    setSuccess('');

    const e = {};

    if (!current) {
      e.current = 'Enter your current password.';
    }

    if (!isValidPassword(next)) {
      e.next = 'At least 8 characters with a letter and a number.';
    } else if (next === current) {
      e.next = 'New password must be different from the current one.';
    }

    if (confirm !== next) {
      e.confirm = 'Passwords do not match.';
    }

    setErrors(e);

    if (Object.keys(e).length) return;

    busy.current = true;
    setLoading(true);

    try {
      const res = await changePassword({
        currentPassword: current,
        newPassword: next,
      });

      setSuccess(
        res.message || 'Password changed successfully.'
      );

      setCurrent('');
      setNext('');
      setConfirm('');

      // The backend increments tokenVersion after a password change.
      // The existing JWT is therefore no longer valid.
      // Logging out returns the app to the authentication flow.
      await logout();
    } catch (err) {
      setFormError(
        extractErrorMessage(err, 'Unable to change password right now.')
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          marginBottom: spacing.lg,
        }}
      >
        Enter your current password to set a new one.
      </Text>

      {!!formError && (
        <View
          style={{
            backgroundColor: colors.errorBg,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.error,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.medium,
            }}
          >
            {formError}
          </Text>
        </View>
      )}

      {!!success && (
        <View
          style={{
            backgroundColor: colors.successBg,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.success,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.medium,
            }}
          >
            {success}
          </Text>
        </View>
      )}

      <Input
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        error={errors.current}
      />

      <Input
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoCapitalize="none"
        error={errors.next}
      />

      <Input
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirm}
      />

      <Button
        title="Change Password"
        onPress={submit}
        loading={loading}
      />
    </ScreenContainer>
  );
}
