import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '../../components/ui/Typography';
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
    <ScreenContainer padded={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ height: 250, backgroundColor: colors.primary }}>
        <Image
          source={require('../../../assets/campus-hero.jpg')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel="Aerial view of TUP Cavite campus with students forming the letters TUPC"
        />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(139,21,56,0.35)' }} />
        <View style={{ position: 'absolute', left: spacing.md, bottom: spacing.lg + spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm + 4,
            }}
          >
            <MaterialCommunityIcons name="parking" size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: fontSizes.xxl, fontWeight: fontWeights.bold }}>TUPark</Text>
            <Text style={{ color: '#FFFFFF', fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>TUP Cavite Campus Parking</Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          marginTop: -spacing.lg,
          backgroundColor: colors.background,
          borderTopLeftRadius: radius.xl + 6,
          borderTopRightRadius: radius.xl + 6,
          padding: spacing.md,
          paddingTop: spacing.lg,
        }}
      >
        <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Welcome back</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg, marginTop: 2 }}>
          Log in to find, reserve and manage your parking.
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
    </View>
    </ScreenContainer>
  );
}
