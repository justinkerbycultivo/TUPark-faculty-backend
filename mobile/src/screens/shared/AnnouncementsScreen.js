import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { getAnnouncements } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AnnouncementsScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load announcements.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading announcements..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={
          error ? (
            <EmptyState icon="alert-circle-outline" title="Couldn't load" message={error} />
          ) : (
            <EmptyState icon="bullhorn-outline" title="No announcements" message="Check back later for parking area notices." />
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold, flex: 1 }}>
                {item.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, marginBottom: spacing.xs }}>
              {item.area?.name || 'Unknown area'}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginBottom: spacing.xs }}>{item.reason}</Text>
            {!!item.requiredAction && (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontStyle: 'italic' }}>
                Required action: {item.requiredAction}
              </Text>
            )}
            {!!item.affectedPlateNumbers?.length && (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs }}>
                Affected plates: {item.affectedPlateNumbers.join(', ')}
              </Text>
            )}
          </Card>
        )}
      />
    </View>
  );
}
