import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Image, Alert } from 'react-native';
import { Text } from '../../components/ui/Typography';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getStudentTransactions, submitParkingPhoto } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyParkingHistoryScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      try {
        const data = await getStudentTransactions(user.id);
        setTransactions(data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load your parking history.'));
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmitPhoto(transactionId) {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to submit a verification photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.5,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setSubmittingId(transactionId);
      const base64Payload = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await submitParkingPhoto(transactionId, base64Payload);
      await load();
    } catch (err) {
      Alert.alert('Could not submit photo', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) return <LoadingState message="Loading your parking history..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={
          error ? (
            <EmptyState icon="alert-circle-outline" title="Couldn't load" message={error} />
          ) : (
            <EmptyState icon="history" title="No parking history yet" message="Your entries will appear here after you scan in." />
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
                  {item.area?.name || 'Unknown area'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {item.spaces?.map((s) => s.code).join(', ') || '—'} · {vehicleTypeLabel(item.vehicleType, item.vehicleTypeOther)}
                </Text>
              </View>
              <StatusBadge
                label={item.status === 'ACTIVE' ? 'Active' : 'Completed'}
                tone={item.status === 'ACTIVE' ? 'mine' : 'neutral'}
              />
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Entry: {formatDateTime(item.entryTime)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Exit: {item.exitTime ? formatDateTime(item.exitTime) : 'Still parked'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
              <StatusBadge
                label={item.photoStatus === 'submitted' ? 'Photo submitted' : 'Photo pending'}
                tone={item.photoStatus === 'submitted' ? 'success' : 'warning'}
                compact
              />
            </View>

            {item.photoStatus === 'pending' && (
              <Button
                title="Submit Verification Photo"
                variant="secondary"
                onPress={() => handleSubmitPhoto(item._id)}
                loading={submittingId === item._id}
                style={{ marginTop: spacing.sm }}
                icon={<MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />}
              />
            )}

            {item.photoStatus === 'submitted' && !!item.photoBase64 && (
              <Image
                source={{ uri: item.photoBase64 }}
                style={{ width: '100%', height: 160, borderRadius: radius.md, marginTop: spacing.sm }}
                resizeMode="cover"
              />
            )}
          </Card>
        )}
      />
    </View>
  );
}
