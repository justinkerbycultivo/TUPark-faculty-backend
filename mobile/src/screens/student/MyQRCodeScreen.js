import React from 'react';
import { View } from 'react-native';
import { Text } from '../../components/ui/Typography';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function MyQRCodeScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  return (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, textAlign: 'center', marginBottom: spacing.xs }}>
        My QR Code
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.lg }}>
        Show this to the guard at campus entry/exit.
      </Text>

      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        {user?.qrToken ? (
          <QRCode value={user.qrToken} size={220} color={colors.text} backgroundColor={colors.surface} />
        ) : (
          <EmptyState icon="qrcode-remove" title="No QR code" message="Your account doesn't have a QR token yet." />
        )}
        {!!user?.qrToken && (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.md, textAlign: 'center' }} selectable>
            {user.formattedName} · {user.studentId}
          </Text>
        )}
      </Card>
    </ScreenContainer>
  );
}
