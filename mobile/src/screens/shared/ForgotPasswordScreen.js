import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { forgotPassword, resetPassword } from '../../api/api';
import { isValidEmail, isValidPassword, extractErrorMessage } from '../../utils/validators';

// Step 1: request a 6-digit code by email. Step 2: enter the code and a new password.
export default function ForgotPasswordScreen({ navigation }) {
  const { colors, spacing, fontSizes, fontWeights, radius } = useThemeColors();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const busy = useRef(false);

  async function requestCode() {
    if (busy.current) return;
    setFormError('');
    if (!isValidEmail(email)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    busy.current = true;
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setMessage(
        res.emailConfigured === false
          ? `${res.message} (Email sending is not set up on the server yet, so no email will arrive until an administrator configures it.)`
          : res.message
      );
      setStep(2);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function submitReset() {
    if (busy.current) return;
    setFormError('');
    const next = {};
    if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the 6-digit code.';
    if (!isValidPassword(newPassword)) next.newPassword = 'At least 8 characters with a letter and a number.';
    if (confirm !== newPassword) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    busy.current = true;
    setLoading(true);
    try {
      await resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      setDone(true);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (done) {
    return (
      <ScreenContainer contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Text style={{ color: colors.success, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.sm }}>
          Password updated
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg }}>
          You can now log in with your new password.
        </Text>
        <Button title="Back to Log In" onPress={() => navigation.navigate('Login')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.xs }}>
        {step === 1 ? 'Forgot your password?' : 'Enter your reset code'}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg }}>
        {step === 1
          ? 'Enter the email you registered with and we will send a 6-digit code.'
          : message}
      </Text>

      {!!formError && (
        <View style={{ backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>{formError}</Text>
        </View>
      )}

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={step === 1}
        error={errors.email}
      />

      {step === 1 ? (
        <Button title="Send Reset Code" onPress={requestCode} loading={loading} />
      ) : (
        <>
          <Input
            label="6-digit code"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            error={errors.code}
          />
          <Input label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" error={errors.newPassword} />
          <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" error={errors.confirm} />
          <Button title="Reset Password" onPress={submitReset} loading={loading} />
          <TouchableOpacity onPress={() => { setStep(1); setCode(''); setErrors({}); setFormError(''); }} style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Send a new code</Text>
          </TouchableOpacity>
        </>
      )}
    </ScreenContainer>
  );
}
