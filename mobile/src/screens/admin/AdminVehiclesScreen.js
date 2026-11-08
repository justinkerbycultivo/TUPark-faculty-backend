import React, { useState, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getAdminVehicles } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminVehiclesScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getAdminVehicles();
      setVehicles(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load registered vehicles.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading vehicles..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Registered Vehicles" subtitle={`${vehicles.length} vehicle(s) on file`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(item, i) => `${item.plateNumber}-${i}`}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="car-outline" title="No registered vehicles yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>{item.plateNumber}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.owner} · {item.studentId}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {vehicleTypeLabel(item.vehicleType, item.vehicleTypeOther)}
                </Text>
              </View>
              <StatusBadge label={item.status} tone={item.status === 'Parked' ? 'mine' : 'neutral'} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
