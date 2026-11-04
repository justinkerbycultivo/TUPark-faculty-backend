import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getActiveTransactions, getReservations, getAnnouncements } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';

// Faculty dashboard: shows an active parking transaction if one exists,
// otherwise an active reservation (with cancel/QR shortcuts), otherwise a
// prompt to reserve a space from the Reservations tab.
export default function FacultyDashboardScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [activeTransaction, setActiveTransaction] = useState(null);
  const [activeReservation, setActiveReservation] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      try {
        const [transactions, reservations, allAnnouncements] = await Promise.all([
          getActiveTransactions(),
          getReservations(),
          getAnnouncements(),
        ]);
        const myTransaction = transactions.find((t) => t.user === user.id || t.user?._id === user.id) || null;
        const myReservation = reservations.find((r) => r.status === 'ACTIVE') || null;
        setActiveTransaction(myTransaction);
        setActiveReservation(myReservation);
        setAnnouncements(allAnnouncements.slice(0, 3));
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load your dashboard.'));
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={() => load(true)}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Welcome back,</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.lg }}>
        {user?.givenName || user?.formattedName}
      </Text>

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      <SectionHeading title="Where Am I Parked?" />
      {activeTransaction ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>
                {activeTransaction.area?.name}
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, marginTop: 2 }}>
                {activeTransaction.spaces?.map((s) => s.code).join(', ') || '—'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                {vehicleTypeLabel(activeTransaction.vehicleType, activeTransaction.vehicleTypeOther)} · {activeTransaction.plateNumber}
              </Text>
            </View>
            <StatusBadge label="Active" tone="mine" />
          </View>
          <Button
            title="Navigate to My Parking Slot"
            onPress={() => navigation.navigate('Navigation')}
            style={{ marginTop: spacing.md }}
            icon={<MaterialCommunityIcons name="map-marker-path" size={18} color={colors.onPrimary} />}
          />
        </Card>
      ) : activeReservation ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.mineBg, borderColor: colors.mine }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mine, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>
                Reserved — not yet parked
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginTop: 2 }}>
                {activeReservation.space?.code} · {activeReservation.area?.name}
              </Text>
            </View>
            <StatusBadge label="Reserved" tone="mine" />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.sm }}>
            Show your QR code to a guard at entry to claim this reservation, or manage it from the Reservations tab.
          </Text>
          <Button
            title="Go to Reservations"
            variant="secondary"
            onPress={() => navigation.getParent()?.navigate('ReservationsTab')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.lg }}>
          <EmptyState
            icon="car-off"
            title="No active parking session"
            message="You have no active parking session or reservation. Reserve a space from the Reservations tab, or scan in at a campus entrance."
          />
        </Card>
      )}

      <SectionHeading title="Quick Links" style={{ marginTop: spacing.sm }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: spacing.lg }}>
        <QuickLink icon="qrcode" label="My QR Code" onPress={() => navigation.navigate('MyQRCode')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <QuickLink icon="calendar-check-outline" label="Reservations" onPress={() => navigation.getParent()?.navigate('ReservationsTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <QuickLink icon="alert-octagon-outline" label="Report Violation" onPress={() => navigation.navigate('ReportViolation')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <QuickLink icon="bullhorn-outline" label="Announcements" onPress={() => navigation.navigate('Announcements')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>

      <SectionHeading
        title="Recent Announcements"
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
            <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>See all</Text>
          </TouchableOpacity>
        }
      />
      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon="bullhorn-outline" title="No announcements" message="Nothing posted yet." />
        </Card>
      ) : (
        announcements.map((a) => (
          <Card key={a._id} style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>{a.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{a.area?.name}</Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.xs }} numberOfLines={2}>
              {a.reason}
            </Text>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

function QuickLink({ icon, label, onPress, colors, radius, spacing, fontSizes, fontWeights }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: '48%',
        margin: '1%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.sm,
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: fontWeights.medium, marginTop: spacing.xs, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
