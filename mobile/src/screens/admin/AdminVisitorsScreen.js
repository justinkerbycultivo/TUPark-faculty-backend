import React, { useState, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getAdminVisitors } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import { formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_TONE = { ACTIVE: 'mine', COMPLETED: 'neutral', EXPIRED: 'warning' };

export default function AdminVisitorsScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getAdminVisitors();
      setTickets(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load visitor tickets.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading visitors..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Visitor Tickets" subtitle={`${tickets.length} ticket(s)`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="account-tie-outline" title="No visitor tickets yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
                  #{item.ticketNumber} · {item.visitorName}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.plateNumber} · {vehicleTypeLabel(item.vehicleType, item.vehicleTypeOther)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.area?.name} · In: {formatDateTime(item.entryTime)}
                  {item.exitTime ? ` · Out: ${formatDateTime(item.exitTime)}` : ''}
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
