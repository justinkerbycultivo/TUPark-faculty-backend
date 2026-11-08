import React, { useState, useCallback } from 'react';
import { FlatList, View, Alert } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getGuardRequests, approveGuard, rejectGuard } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import { TouchableOpacity } from 'react-native';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];
const TONE = { pending: 'warning', approved: 'success', rejected: 'error' };

export default function AdminGuardRequestsScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const [filter, setFilter] = useState('pending');
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (status) => {
    setLoading(true);
    setError('');
    try {
      const data = await getGuardRequests(status);
      setGuards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load guard requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter])
  );

  function decide(guard, action) {
    const approve = action === 'approve';
    Alert.alert(
      approve ? 'Approve guard?' : 'Reject guard?',
      `${guard.formattedName} (${guard.email})` +
        (approve ? '\n\nThey will be able to log in and use guard features.' : '\n\nThey will not be able to log in as a guard.'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusyId(guard._id);
            try {
              await (approve ? approveGuard(guard._id) : rejectGuard(guard._id));
              await load(filter);
            } catch (err) {
              Alert.alert('Could not update', extractErrorMessage(err));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Guard Requests" subtitle="Approve or reject guard registrations" />
        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          {FILTERS.map((f) => {
            const selected = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  marginRight: spacing.sm,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                }}
              >
                <Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!error && <Text style={{ color: colors.error, fontSize: fontSizes.sm, marginBottom: spacing.sm }}>{error}</Text>}
      </View>

      {loading ? (
        <LoadingState message="Loading guard requests..." />
      ) : (
        <FlatList
          data={guards}
          keyExtractor={(g) => String(g._id)}
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="shield-account-outline" title={`No ${filter} guard accounts`} message="Nothing to show here." />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>{item.formattedName}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{item.email}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>ID: {item.studentId} · {item.contactNumber}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Requested {formatDateTime(item.createdAt)}</Text>
                </View>
                <StatusBadge label={item.approvalStatus} tone={TONE[item.approvalStatus] || 'info'} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                {item.approvalStatus !== 'approved' && (
                  <Button
                    title="Approve"
                    onPress={() => decide(item, 'approve')}
                    loading={busyId === item._id}
                    fullWidth={false}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                )}
                {item.approvalStatus !== 'rejected' && (
                  <Button
                    title="Reject"
                    variant="destructive"
                    onPress={() => decide(item, 'reject')}
                    disabled={busyId === item._id}
                    fullWidth={false}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
