import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { getAreas, getAreaSpaces, getReservations, createReservation, cancelReservation } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ParkingSpaceGrid from '../../components/ParkingSpaceGrid';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ReservationsScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [myReservation, setMyReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmSpace, setConfirmSpace] = useState(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [areaList, reservations] = await Promise.all([getAreas(), getReservations()]);
      setAreas(areaList);
      const active = reservations.find((r) => r.status === 'ACTIVE') || null;
      setMyReservation(active);
      setSelectedAreaId((prev) => prev || active?.area?._id || areaList[0]?._id || null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load reservations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpaces = useCallback(async (areaId) => {
    if (!areaId) return;
    setSpacesLoading(true);
    try {
      const data = await getAreaSpaces(areaId);
      setSpaces(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load this area’s spaces.'));
    } finally {
      setSpacesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    if (selectedAreaId) loadSpaces(selectedAreaId);
  }, [selectedAreaId, loadSpaces]);

  async function handleConfirmReserve() {
    if (!confirmSpace) return;
    setReserving(true);
    try {
      await createReservation({ spaceId: confirmSpace._id });
      setConfirmSpace(null);
      await loadAll();
      await loadSpaces(selectedAreaId);
    } catch (err) {
      // Backend may reply 403 "Students are not allowed..." for a student
      // account that somehow reaches this screen — surface it plainly.
      Alert.alert('Reservation failed', extractErrorMessage(err, 'Could not reserve this space.'));
      setConfirmSpace(null);
    } finally {
      setReserving(false);
    }
  }

  async function handleCancel() {
    if (!myReservation) return;
    setCancelling(true);
    try {
      await cancelReservation(myReservation._id);
      setConfirmCancelVisible(false);
      await loadAll();
      await loadSpaces(selectedAreaId);
    } catch (err) {
      Alert.alert('Could not cancel', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <LoadingState message="Loading reservations..." />;

  return (
    <ScreenContainer>
      <SectionHeading title="Reservations" subtitle="Reserve a specific parking space in advance" />

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      {myReservation ? (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.mineBg, borderColor: colors.mine }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mine, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold }}>Your active reservation</Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, marginTop: 2 }}>
                {myReservation.space?.code} · {myReservation.area?.name}
              </Text>
            </View>
            <StatusBadge label="Reserved" tone="mine" />
          </View>
          <Button
            title="Cancel Reservation"
            variant="destructive"
            onPress={() => setConfirmCancelVisible(true)}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            You have no active reservation. Tap an available space below to reserve it.
          </Text>
        </Card>
      )}

      {areas.length === 0 ? (
        <EmptyState icon="map-marker-off-outline" title="No parking areas yet" />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: spacing.md }}>
            {areas.map((area) => {
              const selected = area._id === selectedAreaId;
              return (
                <TouchableOpacity
                  key={area._id}
                  onPress={() => setSelectedAreaId(area._id)}
                  style={{
                    margin: 4,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                  }}
                >
                  <Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>
                    {area.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card>
            {spacesLoading ? (
              <LoadingState message="Loading spaces..." fullScreen={false} />
            ) : (
              <ParkingSpaceGrid
                spaces={spaces}
                mySpaceIds={myReservation && myReservation.area?._id === selectedAreaId ? [myReservation.space?._id] : []}
                onSpacePress={!myReservation ? (space) => setConfirmSpace(space) : undefined}
              />
            )}
          </Card>
          {!myReservation && (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.sm, textAlign: 'center' }}>
              Tap a green (available) space to reserve it.
            </Text>
          )}
        </>
      )}

      <ConfirmDialog
        visible={!!confirmSpace}
        title="Reserve this space?"
        message={confirmSpace ? `Reserve space ${confirmSpace.code}?` : ''}
        confirmLabel="Reserve"
        onConfirm={handleConfirmReserve}
        onCancel={() => setConfirmSpace(null)}
        loading={reserving}
      />
      <ConfirmDialog
        visible={confirmCancelVisible}
        title="Cancel reservation?"
        message="This will free up the space for other faculty."
        confirmLabel="Cancel Reservation"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancelVisible(false)}
        loading={cancelling}
      />
    </ScreenContainer>
  );
}
