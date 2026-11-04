import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getCampusNodes, getCampusRoute, getStudentTransactions, asArray } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import CampusSchematicMap from '../../components/CampusSchematicMap';

// Reused by: student/faculty "Navigate to My Parking Slot" (derives areaId
// from their own active transaction when no param is given) AND the
// guard/visitor result screen, which passes areaId + areaName directly so a
// visitor never needs an account to get directions.
export default function NavigationScreen({ route }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const paramAreaId = route?.params?.areaId || null;
  const paramAreaName = route?.params?.areaName || null;

  const [resolvingArea, setResolvingArea] = useState(!paramAreaId);
  const [areaId, setAreaId] = useState(paramAreaId);
  const [areaName, setAreaName] = useState(paramAreaName);
  const [resolveError, setResolveError] = useState('');

  const [entrances, setEntrances] = useState([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [selectedEntranceKey, setSelectedEntranceKey] = useState(null);

  const [route_, setRoute_] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Resolve areaId from the logged-in user's active transaction when not
  // passed explicitly (student/faculty flow).
  useEffect(() => {
    if (paramAreaId || !user?.id) {
      setResolvingArea(false);
      return;
    }
    (async () => {
      try {
        const transactions = await getStudentTransactions(user.id);
        const active = asArray(transactions).find((t) => t && t.status === 'ACTIVE');
        if (!active) {
          setResolveError("You don't have an active parking transaction right now, so there's no slot to navigate to.");
        } else {
          setAreaId(active.area?._id || active.area);
          setAreaName(active.area?.name || '');
        }
      } catch (err) {
        setResolveError(extractErrorMessage(err, 'Could not look up your active parking transaction.'));
      } finally {
        setResolvingArea(false);
      }
    })();
  }, [paramAreaId, user?.id]);

  useEffect(() => {
    (async () => {
      setLoadingNodes(true);
      try {
        const nodes = await getCampusNodes();
        const onlyEntrances = asArray(nodes).filter((n) => n && n.type === 'entrance' && n.key);
        setEntrances(onlyEntrances);
        if (onlyEntrances.length) setSelectedEntranceKey(onlyEntrances[0].key);
      } catch (err) {
        setRouteError(extractErrorMessage(err, 'Could not load campus entrances.'));
      } finally {
        setLoadingNodes(false);
      }
    })();
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!selectedEntranceKey || !areaId) return;
    setLoadingRoute(true);
    setRouteError('');
    setRoute_(null);
    setCurrentStepIndex(0);
    try {
      const data = await getCampusRoute(selectedEntranceKey, areaId);
      if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
        setRouteError('The server returned incomplete route data. Ask an administrator to check the campus map setup.');
      } else {
        setRoute_({ ...data, steps: data.steps.filter((st) => st && st.node) });
      }
    } catch (err) {
      // Never fabricate a route client-side — surface the backend's exact message.
      setRouteError(extractErrorMessage(err, 'No route could be found.'));
    } finally {
      setLoadingRoute(false);
    }
  }, [selectedEntranceKey, areaId]);

  if (resolvingArea || loadingNodes) {
    return <LoadingState message="Loading navigation..." />;
  }

  if (resolveError) {
    return (
      <ScreenContainer>
        <EmptyState icon="map-marker-off" title="No destination yet" message={resolveError} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeading title="Campus Navigation" subtitle={areaName ? `Destination: ${areaName}` : 'Schematic walking directions'} />

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginBottom: spacing.sm }}>
          Choose your starting entrance
        </Text>
        {entrances.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>No campus entrances are configured yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {entrances.map((node) => {
              const selected = node.key === selectedEntranceKey;
              return (
                <TouchableOpacity
                  key={node.key}
                  onPress={() => setSelectedEntranceKey(node.key)}
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
                    {node.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Button
          title="Get Directions"
          onPress={fetchRoute}
          loading={loadingRoute}
          disabled={!selectedEntranceKey || !areaId}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {!!routeError && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.errorBg, borderColor: colors.errorBg }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>{routeError}</Text>
        </Card>
      )}

      {!!route_ && (
        <>
          <CampusSchematicMap steps={route_.steps} />

          <SectionHeading title="Step-by-step directions" style={{ marginTop: spacing.lg }} />
          <Card>
            {route_.steps.map((step, i) => {
              const isCurrent = i === currentStepIndex;
              const isDestination = i === route_.steps.length - 1;
              return (
                <View
                  key={`${step.node.key}-${i}`}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: spacing.sm,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    opacity: isCurrent ? 1 : 0.55,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: isDestination ? colors.mine : isCurrent ? colors.primary : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.sm,
                    }}
                  >
                    {isDestination ? (
                      <MaterialCommunityIcons name="flag-checkered" size={14} color="#fff" />
                    ) : (
                      <Text style={{ color: isCurrent ? '#fff' : colors.textMuted, fontSize: fontSizes.xs, fontWeight: fontWeights.bold }}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: isCurrent ? fontWeights.bold : fontWeights.regular }}>
                      {step.node.label}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{step.instructions}</Text>
                  </View>
                </View>
              );
            })}
          </Card>

          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <Button
              title="Previous"
              variant="secondary"
              onPress={() => setCurrentStepIndex((i) => Math.max(i - 1, 0))}
              disabled={currentStepIndex === 0}
              fullWidth={false}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              title="Next"
              onPress={() => setCurrentStepIndex((i) => Math.min(i + 1, route_.steps.length - 1))}
              disabled={currentStepIndex >= route_.steps.length - 1}
              fullWidth={false}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}
