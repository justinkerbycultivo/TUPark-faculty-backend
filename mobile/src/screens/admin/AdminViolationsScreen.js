import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getViolations, updateViolationStatus } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { formatUserName, formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

const STATUSES = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
const STATUS_TONE = { Pending: 'warning', 'Under Review': 'info', Resolved: 'success', Rejected: 'error' };

export default function AdminViolationsScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getViolations();
      setReports(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load violation reports.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStatusChange(report, status) {
    if (report.status === status) return;
    setUpdatingId(report._id);
    try {
      await updateViolationStatus(report._id, status);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update status.'));
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <LoadingState message="Loading violation reports..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Violation Reports" subtitle={`${reports.length} report(s)`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="alert-octagon-outline" title="No violations reported" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
                  {item.plateNumber}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  Reported by {item.reportedBy ? formatUserName(item.reportedBy) : 'Anonymous'} · {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <StatusBadge label={item.status} tone={STATUS_TONE[item.status] || 'neutral'} />
            </View>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.sm }}>{item.description}</Text>
            {!!item.photoBase64 && (
              <Image
                source={{ uri: item.photoBase64 }}
                style={{ width: '100%', height: 160, borderRadius: radius.md, marginTop: spacing.sm }}
                resizeMode="cover"
              />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, marginHorizontal: -3 }}>
              {STATUSES.map((status) => {
                const selected = item.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    disabled={updatingId === item._id}
                    onPress={() => handleStatusChange(item, status)}
                    style={{
                      margin: 3,
                      paddingVertical: 6,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.pill,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surface,
                      opacity: updatingId === item._id ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.textMuted, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}
      />
    </View>
  );
}
