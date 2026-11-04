import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getAdminUsers, deleteAdminUser } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import { formatUserName } from '../../utils/format';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function AdminStudentsScreen() {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load students.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      Alert.alert('Could not delete', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState message="Loading students..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Students" subtitle={`${users.length} registered`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="account-off-outline" title="No students registered yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
              {formatUserName(item)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
              {item.studentId} · {item.email}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
              {item.contactNumber}
            </Text>
            {!!item.vehicle?.plateNumber && (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                {item.vehicle.plateNumber} · {vehicleTypeLabel(item.vehicle.vehicleType, item.vehicle.vehicleTypeOther)}
              </Text>
            )}
            <Button
              title="Delete Account"
              variant="destructive"
              fullWidth={false}
              onPress={() => setDeleteTarget(item)}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
            />
          </Card>
        )}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete this account?"
        message={deleteTarget ? `This permanently deletes ${formatUserName(deleteTarget)}'s account. This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </View>
  );
}
