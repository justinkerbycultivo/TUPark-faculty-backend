import React, { useState, useCallback } from 'react';
import { FlatList, View, Image } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../../context/ThemeContext';
import { getAdminPhotos } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { formatUserName, formatDateTime } from '../../utils/format';
import Card from '../../components/ui/Card';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminPhotosScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getAdminPhotos();
      setPhotos(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load submitted photos.'));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingState message="Loading photos..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <SectionHeading title="Verification Photos" subtitle={`${photos.length} submitted`} />
        {!!error && (
          <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
          </Card>
        )}
      </View>
      <FlatList
        data={photos}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 }}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="camera-off-outline" title="No photos submitted yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            {!!item.photoBase64 && (
              <Image
                source={{ uri: item.photoBase64 }}
                style={{ width: '100%', height: 180, borderRadius: radius.md, marginBottom: spacing.sm }}
                resizeMode="cover"
              />
            )}
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold }}>
              {item.plateNumber} · {item.area?.name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
              {item.user ? formatUserName(item.user) : 'Visitor'} · Submitted {formatDateTime(item.photoSubmittedAt)}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
