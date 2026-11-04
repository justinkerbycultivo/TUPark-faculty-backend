import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/ui/Button';
import SectionHeading from '../../components/ui/SectionHeading';

const MENU = [
  { key: 'GuardRequests', icon: 'shield-account-outline', label: 'Guard Requests', subtitle: 'Approve or reject guard registrations' },
  { key: 'Students', icon: 'school-outline', label: 'Students', subtitle: 'Registered student accounts' },
  { key: 'Visitors', icon: 'account-tie-outline', label: 'Visitors', subtitle: 'Visitor parking tickets' },
  { key: 'Photos', icon: 'camera-outline', label: 'Parking Photos', subtitle: 'Verification photos submitted' },
  { key: 'Violations', icon: 'alert-octagon-outline', label: 'Violations', subtitle: 'Reported parking violations' },
  { key: 'AdminAnnouncements', icon: 'bullhorn-outline', label: 'Announcements', subtitle: 'Post & review campus notices' },
  { key: 'AdminReservations', icon: 'calendar-check-outline', label: 'Reservations', subtitle: 'Faculty reservation records' },
  { key: 'Profile', icon: 'account-circle-outline', label: 'Profile', subtitle: 'Your account & preferences' },
];

export default function AdminMoreScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { logout } = useAuth();

  return (
    <ScreenContainer>
      <SectionHeading title="More" subtitle="Everything else in TUPark admin" />
      {MENU.map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => navigation.navigate(item.key)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm,
            }}
          >
            <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{item.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{item.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}

      <Button title="Log Out" variant="destructive" onPress={logout} style={{ marginTop: spacing.md }} />
    </ScreenContainer>
  );
}
