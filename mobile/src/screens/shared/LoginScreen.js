import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function LoginScreen({ navigation }) {
  const { colors, spacing, fontSizes, fontWeights, radius } = useThemeColors();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedSecondsLeft, setLockedSecondsLeft] = useState(0);
  const submittingRef = useRef(false);

  // Countdown ticker while the account is locked out, per the backend's
  // lockedForSeconds (423 response). Never fabricated — only set from a
  // real backend value.
  useEffect(() => {
    if (lockedSecondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setLockedSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedSecondsLeft]);

  function validate() {
    const next = {};
    if (!identifier.trim()) next.identifier = 'Enter your email or Student ID.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleLogin() {
    if (submittingRef.current || lockedSecondsLeft > 0) return; // prevent double-submit / locked submit
    setFormError('');
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      // AppNavigator reacts to AuthContext's `user` becoming non-null and
      // switches to the role-appropriate tab navigator automatically.
    } catch (err) {
      setFormError(err.message);
      if (err.lockedForSeconds) {
        setLockedSecondsLeft(err.lockedForSeconds);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.xl,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <MaterialCommunityIcons name="parking" size={40} color={colors.onPrimary} />
        </View>
        <Text style={{ color: colors.text, fontSize: fontSizes.xxl, fontWeight: fontWeights.bold }}>TUPark</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 }}>
          TUP Cavite Campus Parking Management
        </Text>
      </View>

      {!!formError && (
        <View
          style={{
            backgroundColor: colors.errorBg,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.error, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>
            {lockedSecondsLeft > 0
              ? `Account temporarily locked. Try again in ${lockedSecondsLeft}s.`
              : formError}
          </Text>
        </View>
      )}

      <Input
        label="Email or Student ID"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="juan@tup.edu.ph or 2021-0001"
        autoCapitalize="none"
        error={errors.identifier}
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={{ alignSelf: 'flex-end', marginBottom: spacing.xs, paddingVertical: spacing.xs }}
        accessibilityRole="button"
        accessibilityLabel="Forgot password"
      >
        <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Forgot Password?</Text>
      </TouchableOpacity>

      <Button
        title={lockedSecondsLeft > 0 ? `Locked (${lockedSecondsLeft}s)` : 'Log In'}
        onPress={handleLogin}
        loading={loading}
        disabled={lockedSecondsLeft > 0}
        style={{ marginTop: spacing.sm }}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={{ marginTop: spacing.lg, alignItems: 'center' }}
        accessibilityRole="button"
      >
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Don't have an account? <Text style={{ color: colors.primary, fontWeight: fontWeights.bold }}>Register</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
