import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Text } from '../../components/ui/Typography';

import { useFocusEffect } from '@react-navigation/native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import {
  getAreas,
  getAreaSpaces,
  getReservations,
  createReservation,
  cancelReservation,
} from '../../api/api';

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

function slotsFor(vehicleType) {
  const twoSlotVehicles = ['car', 'tricycle', 'other'];

  return twoSlotVehicles.includes(vehicleType) ? 2 : 1;
}

function getReservationSpaces(reservation) {
  if (!reservation) return [];

  if (
    Array.isArray(reservation.spaces) &&
    reservation.spaces.length > 0
  ) {
    return reservation.spaces.filter(Boolean);
  }

  return reservation.space ? [reservation.space] : [];
}

export default function ReservationsScreen() {
  const {
    colors,
    spacing,
    radius,
    fontSizes,
    fontWeights,
  } = useThemeColors();

  const { user } = useAuth();

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

  const vehicleType = user?.vehicle?.vehicleType;
  const requiredSlots = slotsFor(vehicleType);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [areaList, reservations] = await Promise.all([
        getAreas(),
        getReservations(),
      ]);

      setAreas(areaList);

      const active =
        reservations.find((reservation) => reservation.status === 'ACTIVE') ||
        null;

      setMyReservation(active);

      setSelectedAreaId(
        (previous) =>
          previous ||
          active?.area?._id ||
          areaList[0]?._id ||
          null
      );
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          'Could not load reservations.'
        )
      );
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
      setError(
        extractErrorMessage(
          err,
          'Could not load this area’s spaces.'
        )
      );
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
    if (selectedAreaId) {
      loadSpaces(selectedAreaId);
    }
  }, [selectedAreaId, loadSpaces]);

  function getSpacesForSelection(startSpace) {
    if (!startSpace) return [];

    const startIndex = spaces.findIndex(
      (space) => String(space._id) === String(startSpace._id)
    );

    if (startIndex < 0) return [];

    const selected = spaces.slice(
      startIndex,
      startIndex + requiredSlots
    );

    if (selected.length !== requiredSlots) {
      return [];
    }

    for (let i = 0; i < selected.length; i += 1) {
      if (
        selected[i].index !== startSpace.index + i ||
        selected[i].status !== 'available'
      ) {
        return [];
      }
    }

    return selected;
  }

  function handleSelectSpace(space) {
    if (!vehicleType) {
      Alert.alert(
        'Vehicle not registered',
        'Please register your vehicle and vehicle type in your profile before making a reservation.'
      );

      return;
    }

    const selected = getSpacesForSelection(space);

    if (selected.length !== requiredSlots) {
      Alert.alert(
        'Not enough consecutive spaces',
        requiredSlots === 1
          ? 'This parking space is not available.'
          : `Your vehicle requires ${requiredSlots} consecutive available spaces. Please select another starting space.`
      );

      return;
    }

    setConfirmSpace(space);
  }

  async function handleConfirmReserve() {
    if (!confirmSpace) return;

    setReserving(true);

    try {
      await createReservation({
        spaceId: confirmSpace._id,
      });

      setConfirmSpace(null);

      await loadAll();
      await loadSpaces(selectedAreaId);
    } catch (err) {
      Alert.alert(
        'Reservation failed',
        extractErrorMessage(
          err,
          'Could not reserve the selected spaces.'
        )
      );

      setConfirmSpace(null);
      await loadSpaces(selectedAreaId);
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
      Alert.alert(
        'Could not cancel',
        extractErrorMessage(
          err,
          'Please try again.'
        )
      );
    } finally {
      setCancelling(false);
    }
  }

  const reservedSpaces = getReservationSpaces(myReservation);

  const mySpaceIds =
    myReservation &&
    myReservation.area?._id === selectedAreaId
      ? reservedSpaces.map((space) => space._id)
      : [];

  const previewSpaces = confirmSpace
    ? getSpacesForSelection(confirmSpace)
    : [];

  const previewCodes = previewSpaces
    .map((space) => space.code)
    .join(', ');

  if (loading) {
    return <LoadingState message="Loading reservations..." />;
  }

  return (
    <ScreenContainer>
      <SectionHeading
        title="Reservations"
        subtitle="Reserve consecutive parking spaces in advance"
      />

      {!!error && (
        <Card
          style={{
            backgroundColor: colors.errorBg,
            borderColor: colors.errorBg,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.error,
              fontSize: fontSizes.sm,
            }}
          >
            {error}
          </Text>
        </Card>
      )}

      {myReservation ? (
        <Card
          style={{
            marginBottom: spacing.lg,
            backgroundColor: colors.mineBg,
            borderColor: colors.mine,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.mine,
                  fontSize: fontSizes.xs,
                  fontWeight: fontWeights.semibold,
                }}
              >
                Your active reservation
              </Text>

              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSizes.lg,
                  fontWeight: fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {reservedSpaces.map((space) => space.code).join(', ')}
              </Text>

              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.sm,
                  marginTop: spacing.xs,
                }}
              >
                {myReservation.area?.name}
              </Text>

              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.xs,
                  marginTop: 4,
                }}
              >
                {reservedSpaces.length} parking space(s) reserved
              </Text>
            </View>

            <StatusBadge
              label="Reserved"
              tone="mine"
            />
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
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.sm,
            }}
          >
            You have no active reservation. Tap an available starting
            space below. The system will automatically select the
            consecutive spaces required by your vehicle.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.md,
            }}
          >
            <MaterialCommunityIcons
              name="car-multiple"
              size={20}
              color={colors.primary}
            />

            <Text
              style={{
                color: colors.primary,
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.semibold,
                marginLeft: spacing.sm,
              }}
            >
              {vehicleType
                ? `${requiredSlots} space(s) required for your ${vehicleType.replace(/_/g, ' ')}`
                : 'Register your vehicle before reserving'}
            </Text>
          </View>
        </Card>
      )}

      {areas.length === 0 ? (
        <EmptyState
          icon="map-marker-off-outline"
          title="No parking areas yet"
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: -4,
              marginBottom: spacing.md,
            }}
          >
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
                    borderColor: selected
                      ? colors.primary
                      : colors.border,
                    backgroundColor: selected
                      ? colors.primarySoft
                      : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.primary
                        : colors.text,
                      fontSize: fontSizes.sm,
                      fontWeight: fontWeights.medium,
                    }}
                  >
                    {area.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card>
            {spacesLoading ? (
              <LoadingState
                message="Loading spaces..."
                fullScreen={false}
              />
            ) : (
              <ParkingSpaceGrid
                spaces={spaces}
                mySpaceIds={mySpaceIds}
                selectedIds={previewSpaces.map((space) => space._id)}
                onSpacePress={
                  !myReservation
                    ? handleSelectSpace
                    : undefined
                }
              />
            )}
          </Card>

          {!myReservation && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                marginTop: spacing.sm,
                textAlign: 'center',
              }}
            >
              Tap a green available space to choose your starting
              position. Consecutive spaces will be selected automatically.
            </Text>
          )}
        </>
      )}

      <ConfirmDialog
        visible={!!confirmSpace}
        title="Confirm reservation?"
        message={
          confirmSpace
            ? `Reserve space(s) ${previewCodes} in this parking area?`
            : ''
        }
        confirmLabel="Reserve"
        onConfirm={handleConfirmReserve}
        onCancel={() => setConfirmSpace(null)}
        loading={reserving}
      />

      <ConfirmDialog
        visible={confirmCancelVisible}
        title="Cancel reservation?"
        message="All parking spaces included in this reservation will be released for other users."
        confirmLabel="Cancel Reservation"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancelVisible(false)}
        loading={cancelling}
      />
    </ScreenContainer>
  );
}