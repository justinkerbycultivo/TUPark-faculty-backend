import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAdminOverview } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import { formatUserName } from '../../utils/format';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminDashboardScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminOverview();
      setOverview(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load the admin overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading dashboard..." />;

  if (error) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="Couldn't load dashboard" message={error} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshing={false} onRefresh={load}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Signed in as</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.lg }}>
        {user?.formattedName}
      </Text>

      <SectionHeading title="Campus Parking" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: spacing.lg }}>
        <Stat icon="office-building-marker-outline" label="Active Areas" value={`${overview.activeAreaCount}/${overview.totalAreaCount}`} color={colors.navy} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="car-multiple" label="Total Capacity" value={overview.totalCapacity} color={colors.primary} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="car" label="Occupied Slots" value={overview.occupiedSlots} color={colors.error} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="parking" label="Remaining Slots" value={overview.remainingSlots} color={colors.success} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>

      <SectionHeading title="Community" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: spacing.lg }}>
        <Stat icon="school-outline" label="Registered Students" value={overview.studentCount} color={colors.navy} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="steering" label="Active Transactions" value={overview.activeTransactionCount} color={colors.mine} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="camera-outline" label="Photos Submitted" value={overview.photosSubmittedCount} color={colors.accentGold} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="alert-octagon-outline" label="Pending Violations" value={overview.pendingViolationsCount} color={colors.warning} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat icon="account-tie-outline" label="Visitor Tickets Today" value={overview.visitorTicketsToday} color={colors.primary} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>

      <SectionHeading title="Vehicle Type Breakdown (Active)" />
      <Card style={{ marginBottom: spacing.lg }}>
        {Object.keys(overview.vehicleTypeCounts || {}).length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>No active transactions right now.</Text>
        ) : (
          Object.entries(overview.vehicleTypeCounts).map(([key, count]) => (
            <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>{vehicleTypeLabel(key)}</Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>{count}</Text>
            </View>
          ))
        )}
      </Card>

      <SectionHeading title="Recent Entries" />
      <Card style={{ marginBottom: spacing.lg }}>
        {overview.recentEntries.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>No entries yet.</Text>
        ) : (
          overview.recentEntries.slice(0, 5).map((t) => (
            <View key={t._id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>
                {t.plateNumber} — {t.area?.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {t.user ? formatUserName(t.user) : t.visitorTicket?.visitorName || 'Visitor'}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

function Stat({ icon, label, value, color, colors, radius, spacing, fontSizes, fontWeights }) {
  return (
    <View
      style={{
        width: '48%',
        margin: '1%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.sm,
      }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
    </View>
  );
}
