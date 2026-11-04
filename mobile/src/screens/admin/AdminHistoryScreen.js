import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getActiveTransactions, getAllTransactions, adminCheckout } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import { formatUserName, formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Combines "Active Parking" (with a checkout action) and full read-only
// history in one tab, selected by a segmented control, per the client spec
// ("AdminActiveParking: checkout button" + "AdminHistory: read-only").
export default function AdminHistoryScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();

  const [tab, setTab] = useState('active'); // 'active' | 'all'
  const [active, setActive] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [activeData, allData] = await Promise.all([getActiveTransactions(), getAllTransactions()]);
      setActive(activeData);
      setAll(allData);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load parking history.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCheckout() {
    if (!checkoutTarget) return;
    setCheckingOut(true);
    try {
      await adminCheckout(checkoutTarget._id);
      setCheckoutTarget(null);
      await load();
    } catch (err) {
      Alert.alert('Checkout failed', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) return <LoadingState message="Loading parking history..." />;

  const data = tab === 'active' ? active : all;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Parking History" subtitle="Live active sessions and full campus history" />
        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          <SegTab label={`Active (${active.length})`} active={tab === 'active'} onPress={() => setTab('active')} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
          <SegTab label="All History" active={tab === 'all'} onPress={() => setTab('all')} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        </View>
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={
          <EmptyState icon="history" title={tab === 'active' ? 'No one is currently parked' : 'No history yet'} />
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
                  {item.plateNumber} · {vehicleTypeLabel(item.vehicleType, item.vehicleTypeOther)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.user ? formatUserName(item.user) : item.visitorTicket?.visitorName || 'Visitor'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.area?.name} — {item.spaces?.map((s) => s.code).join(', ') || '—'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  In: {formatDateTime(item.entryTime)}{item.exitTime ? ` · Out: ${formatDateTime(item.exitTime)}` : ''}
                </Text>
              </View>
              <StatusBadge label={item.status === 'ACTIVE' ? 'Active' : 'Completed'} tone={item.status === 'ACTIVE' ? 'mine' : 'neutral'} />
            </View>
            {item.status === 'ACTIVE' && (
              <Button
                title="Checkout (end session)"
                variant="destructive"
                onPress={() => setCheckoutTarget(item)}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </Card>
        )}
      />

      <ConfirmDialog
        visible={!!checkoutTarget}
        title="Check out this vehicle?"
        message={checkoutTarget ? `This will end the active session for ${checkoutTarget.plateNumber} and free its space.` : ''}
        confirmLabel="Check Out"
        destructive
        onConfirm={handleCheckout}
        onCancel={() => setCheckoutTarget(null)}
        loading={checkingOut}
      />
    </View>
  );
}

function SegTab({ label, active, onPress, colors, spacing, fontSizes, fontWeights }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.textMuted, fontWeight: active ? fontWeights.bold : fontWeights.medium, fontSize: fontSizes.sm }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
