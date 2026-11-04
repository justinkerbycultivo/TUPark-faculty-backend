import React, { useState, useCallback } from 'react';
import { FlatList, View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getReservations } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { formatUserName, formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_TONE = { ACTIVE: 'mine', FULFILLED: 'success', CANCELLED: 'neutral' };

// Read-only admin view of every faculty/admin reservation (admin sees all,
// per GET /reservations' role-based filter on the backend).
export default function AdminReservationsScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getReservations();
      setReservations(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load reservations.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading reservations..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Faculty Reservations" subtitle={`${reservations.length} reservation(s)`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="calendar-blank-outline" title="No reservations yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
                  {item.user ? formatUserName(item.user) : 'Unknown'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.area?.name} — {item.space?.code}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <StatusBadge label={item.status} tone={STATUS_TONE[item.status] || 'neutral'} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
