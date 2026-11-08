import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Switch } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import ScreenContainer from '../../components/ScreenContainer';
import Avatar from '../../components/Avatar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SectionHeading from '../../components/ui/SectionHeading';

const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  guard: 'Security Guard',
  admin: 'Administrator',
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, fontSizes, fontWeights, mode, toggleTheme } = useThemeColors();
  const { user, logout } = useAuth();

  if (!user) return null;

  const hasVehicle = !!user.vehicle?.plateNumber;

  return (
    <ScreenContainer>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Avatar user={user} size={84} style={{ marginBottom: spacing.sm }} />
        <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, textAlign: 'center' }}>
          {user.formattedName}
        </Text>
        <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginTop: 2 }}>
          {ROLE_LABELS[user.role] || user.role}
        </Text>
      </View>

      <SectionHeading title="Account Details" />
      <Card style={{ marginBottom: spacing.md }}>
        <InfoRow icon="card-account-details-outline" label={user.role === 'student' ? 'Student ID' : 'Account ID'} value={user.studentId} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <InfoRow icon="email-outline" label="Email" value={user.email} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <InfoRow icon="phone-outline" label="Contact Number" value={user.contactNumber} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} last />
      </Card>

      {hasVehicle && (
        <>
          <SectionHeading title="Vehicle" />
          <Card style={{ marginBottom: spacing.md }}>
            <InfoRow icon="numeric" label="Plate Number" value={user.vehicle.plateNumber} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
            <InfoRow
              icon="motorbike"
              label="Vehicle Type"
              value={vehicleTypeLabel(user.vehicle.vehicleType, user.vehicle.vehicleTypeOther)}
              colors={colors}
              spacing={spacing}
              fontSizes={fontSizes}
              fontWeights={fontWeights}
              last
            />
          </Card>
        </>
      )}

      <SectionHeading title="Preferences" />
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.medium, marginLeft: spacing.sm }}>
              Dark Mode
            </Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleTheme}
            accessibilityLabel="Toggle dark mode"
            trackColor={{ false: colors.grayLight, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Button
        title="Edit Profile"
        onPress={() => navigation.navigate('EditProfile')}
        style={{ marginBottom: spacing.md }}
      />
      <Button
        title="Change Password"
        variant="secondary"
        onPress={() => navigation.navigate('ChangePassword')}
        style={{ marginBottom: spacing.md }}
      />
      <Button title="Log Out" variant="destructive" onPress={logout} />
    </ScreenContainer>
  );
}

function InfoRow({ icon, label, value, colors, spacing, fontSizes, fontWeights, last }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: last ? 0 : spacing.sm,
        marginBottom: last ? 0 : spacing.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={colors.textMuted} style={{ width: 26 }} />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{value || '—'}</Text>
    </View>
  );
}
