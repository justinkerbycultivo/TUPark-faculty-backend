import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAreas, getAreaSpaces, getStudentTransactions, asArray } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ParkingSpaceGrid from '../../components/ParkingSpaceGrid';

const AUTO_REFRESH_MS = 15000;

export default function ParkingMapScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [areaList, transactions] = await Promise.all([
        getAreas(),
        user?.id ? getStudentTransactions(user.id) : Promise.resolve([]),
      ]);
      const safeAreas = asArray(areaList);
      setAreas(safeAreas);
      const active = asArray(transactions).find((t) => t && t.status === 'ACTIVE') || null;
      setActiveTransaction(active);
      const defaultAreaId = active?.area?._id || safeAreas[0]?._id || null;
      setSelectedAreaId(defaultAreaId);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load parking areas.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadSpaces = useCallback(async (areaId, silent = false) => {
    if (!areaId) return;
    if (!silent) setSpacesLoading(true);
    try {
      const data = await getAreaSpaces(areaId);
      setSpaces(asArray(data));
    } catch (err) {
      if (!silent) setError(extractErrorMessage(err, 'Could not load this area’s spaces.'));
    } finally {
      if (!silent) setSpacesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    if (selectedAreaId) loadSpaces(selectedAreaId);
  }, [selectedAreaId, loadSpaces]);

  useFocusEffect(
    useCallback(() => {
      intervalRef.current = setInterval(() => {
        if (selectedAreaId) loadSpaces(selectedAreaId, true);
      }, AUTO_REFRESH_MS);
      return () => clearInterval(intervalRef.current);
    }, [selectedAreaId, loadSpaces])
  );

  const selectedArea = areas.find((a) => a._id === selectedAreaId);
  const mySpaceIds =
    activeTransaction && activeTransaction.area?._id === selectedAreaId
      ? (Array.isArray(activeTransaction.spaces) ? activeTransaction.spaces : []).map((s) => s && s._id).filter(Boolean)
      : [];

  if (loading) return <LoadingState message="Loading parking areas..." />;

  return (
    <ScreenContainer>
      <SectionHeading title="Parking Map" subtitle="Live space availability by area" />

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      {activeTransaction && (
        <Button
          title="Navigate to My Parking Slot"
          onPress={() => navigation.navigate('Navigation')}
          style={{ marginBottom: spacing.md }}
          icon={<MaterialCommunityIcons name="map-marker-path" size={18} color={colors.onPrimary} />}
        />
      )}

      {areas.length === 0 ? (
        <EmptyState icon="map-marker-off-outline" title="No parking areas yet" message="Check back once an admin sets up parking areas." />
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
                    {area.name} {area.isActive === false ? '(inactive)' : ''}
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
                mySpaceIds={mySpaceIds}
                capacity={selectedArea?.capacity}
                occupied={selectedArea?.occupied}
                remaining={selectedArea?.remaining}
              />
            )}
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}
