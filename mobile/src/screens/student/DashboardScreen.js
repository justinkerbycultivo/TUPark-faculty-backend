import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getStudentTransactions, getAnnouncements, getAreas, asArray } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { formatDateTime } from '../../utils/format';
import { vehicleTypeLabel, vehicleTypeIcon } from '../../utils/vehicleTypes';
import ScreenContainer from '../../components/ScreenContainer';
import Avatar from '../../components/Avatar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';

function initials(user) {
  return `${(user?.givenName || '?')[0] || ''}${(user?.surname || '')[0] || ''}`.toUpperCase();
}

export default function DashboardScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      try {
        const [tx, ann, areaList] = await Promise.all([
          getStudentTransactions(user.id),
          getAnnouncements(),
          getAreas(),
        ]);
        setTransactions(asArray(tx));
        setAnnouncements(asArray(ann).slice(0, 3));
        setAreas(asArray(areaList));
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

  const active = transactions.find((t) => t && t.status === 'ACTIVE') || null;
  const recent = transactions.filter((t) => t && t.status !== 'ACTIVE').slice(0, 3);
  const activeAreas = areas.filter((a) => a && a.isActive !== false);
  const totalCapacity = activeAreas.reduce((n, a) => n + (a.capacity || 0), 0);
  const totalOccupied = activeAreas.reduce((n, a) => n + (a.occupied || 0), 0);
  const totalRemaining = activeAreas.reduce((n, a) => n + (a.remaining || 0), 0);

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={() => load(true)}>
      {/* Greeting */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Welcome back,</Text>
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>
            {user?.givenName || user?.formattedName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('ProfileTab')}
          accessibilityRole="button"
          accessibilityLabel="Open my profile"
>
          <Avatar user={user} size={44} />
        </TouchableOpacity>
      </View>

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      {/* Active session */}
      {active ? (
        <View style={{ backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFFCC', fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>YOU ARE PARKED</Text>
            <StatusBadge label="Active" tone="success" compact />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: fontWeights.bold, marginTop: spacing.xs }}>
            {(Array.isArray(active.spaces) ? active.spaces : []).map((s) => s && s.code).filter(Boolean).join(', ') || '—'}
          </Text>
          <Text style={{ color: '#FFFFFFE6', fontSize: fontSizes.sm }}>{active.area?.name || 'Assigned area'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <MaterialCommunityIcons name={vehicleTypeIcon(active.vehicleType)} size={16} color="#FFFFFFE6" />
            <Text style={{ color: '#FFFFFFE6', fontSize: fontSizes.xs, marginLeft: 6 }}>
              {vehicleTypeLabel(active.vehicleType, active.vehicleTypeOther)} · {active.plateNumber} · since {formatDateTime(active.entryTime)}
            </Text>
          </View>
          {active.photoStatus === 'pending' && (
            <Text style={{ color: '#FFE08A', fontSize: fontSizes.xs, marginTop: spacing.sm }}>
              A verification photo is still pending. Submit one from Activity.
            </Text>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Navigation')}
            accessibilityRole="button"
            accessibilityLabel="Navigate to my parking slot"
            style={{ marginTop: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
          >
            <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: fontWeights.bold, fontSize: fontSizes.md, marginLeft: 8 }}>Navigate to My Parking Slot</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          <EmptyState
            icon="car-off"
            title="No active parking session"
            message="Show your QR code to the guard at the gate and your space is assigned automatically."
          >
            <Button
              title="Show My QR Code"
              onPress={() => navigation.navigate('MyQRCode')}
              style={{ marginTop: spacing.md }}
              fullWidth={false}
              icon={<MaterialCommunityIcons name="qrcode" size={18} color={colors.onPrimary} />}
            />
          </EmptyState>
        </Card>
      )}

      {/* Availability */}
      <SectionHeading
        title="Parking Availability"
        right={
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('ParkingTab')}>
            <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Open map</Text>
          </TouchableOpacity>
        }
      />
      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        <Stat label="Available" value={totalRemaining} color={colors.success} colors={colors} spacing={spacing} radius={radius} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat label="Occupied" value={totalOccupied} color={colors.error} colors={colors} spacing={spacing} radius={radius} fontSizes={fontSizes} fontWeights={fontWeights} />
        <Stat label="Areas open" value={activeAreas.length} color={colors.navy} colors={colors} spacing={spacing} radius={radius} fontSizes={fontSizes} fontWeights={fontWeights} last />
      </View>
      {activeAreas.length === 0 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <EmptyState icon="map-marker-off-outline" title="No parking areas yet" message="An administrator has not set up any parking areas." />
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          {activeAreas.slice(0, 4).map((a, i) => {
            const pct = a.capacity ? Math.min(100, Math.round(((a.occupied || 0) / a.capacity) * 100)) : 0;
            const tone = pct >= 90 ? colors.error : pct >= 70 ? colors.warning : colors.success;
            return (
              <View key={a._id} style={{ marginTop: i === 0 ? 0 : spacing.sm + 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{a.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{a.remaining ?? 0} of {a.capacity} free</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 8, backgroundColor: tone, borderRadius: 4 }} />
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Vehicle */}
      {!!user?.vehicle?.plateNumber && (
        <>
          <SectionHeading title="My Vehicle" />
          <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm + 4 }}>
              <MaterialCommunityIcons name={vehicleTypeIcon(user.vehicle.vehicleType)} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>{user.vehicle.plateNumber}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{vehicleTypeLabel(user.vehicle.vehicleType, user.vehicle.vehicleTypeOther)}</Text>
            </View>
          </Card>
        </>
      )}

      {/* Quick links */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <QuickLink icon="qrcode" label="My QR" onPress={() => navigation.navigate('MyQRCode')} {...{ colors, radius, spacing, fontSizes, fontWeights }} />
        <QuickLink icon="history" label="History" onPress={() => navigation.navigate('MyParkingHistory')} {...{ colors, radius, spacing, fontSizes, fontWeights }} />
        <QuickLink icon="alert-octagon-outline" label="Report" onPress={() => navigation.navigate('ReportViolation')} {...{ colors, radius, spacing, fontSizes, fontWeights }} />
        <QuickLink icon="bullhorn-outline" label="News" onPress={() => navigation.navigate('Announcements')} {...{ colors, radius, spacing, fontSizes, fontWeights }} last />
      </View>

      {/* Recent activity */}
      <SectionHeading
        title="Recent Activity"
        right={
          <TouchableOpacity onPress={() => navigation.navigate('MyParkingHistory')}>
            <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>See all</Text>
          </TouchableOpacity>
        }
      />
      {recent.length === 0 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <EmptyState icon="history" title="No parking history yet" message="Completed parking sessions show up here." />
        </Card>
      ) : (
        <Card padded={false} style={{ marginBottom: spacing.md }}>
          {recent.map((t, i) => (
            <View
              key={t._id}
              style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.success} style={{ marginRight: spacing.sm + 4 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{t.area?.name || 'Parking'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{t.plateNumber} · {formatDateTime(t.entryTime)}</Text>
              </View>
              <StatusBadge label="Completed" tone="neutral" compact />
            </View>
          ))}
        </Card>
      )}

      {/* Announcements */}
      <SectionHeading title="Announcements" />
      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon="bullhorn-outline" title="No announcements" message="Campus parking notices will appear here." />
        </Card>
      ) : (
        announcements.map((a) => (
          <Card key={a._id} style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>{a.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{a.area?.name}</Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.xs }} numberOfLines={2}>{a.reason}</Text>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

function Stat({ label, value, color, colors, spacing, radius, fontSizes, fontWeights, last }) {
  return (
    <View
      style={{
        flex: 1,
        marginRight: last ? 0 : spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.sm + 4,
      }}
    >
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
    </View>
  );
}

function QuickLink({ icon, label, onPress, colors, radius, spacing, fontSizes, fontWeights, last }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        marginRight: last ? 0 : spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingVertical: spacing.sm + 4,
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: fontWeights.medium, marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );
}
