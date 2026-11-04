import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getActiveTransactions } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';

export default function GuardDashboardScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getActiveTransactions();
      setActiveTransactions(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load live parking data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const studentCount = activeTransactions.filter((t) => t.subjectType === 'student').length;
  const visitorCount = activeTransactions.filter((t) => t.subjectType === 'visitor').length;

  if (loading) return <LoadingState message="Loading guard dashboard..." />;

  return (
    <ScreenContainer refreshing={false} onRefresh={load}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Signed in as</Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.lg }}>
        {user?.formattedName}
      </Text>

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      <SectionHeading title="Currently On Campus" />
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <StatCard icon="account-group-outline" label="Total Parked" value={activeTransactions.length} color={colors.primary} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <StatCard icon="school-outline" label="Students/Faculty" value={studentCount} color={colors.navy} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <StatCard icon="account-tie-outline" label="Visitors" value={visitorCount} color={colors.accentGold} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>

      <SectionHeading title="Quick Actions" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        <ActionTile icon="qrcode-scan" label="Scan Entry / Exit" onPress={() => navigation.getParent()?.navigate('ScanQRTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <ActionTile icon="account-plus-outline" label="Visitor Ticket" onPress={() => navigation.getParent()?.navigate('VisitorsTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <ActionTile icon="account-circle-outline" label="My Profile" onPress={() => navigation.getParent()?.navigate('ProfileTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>
    </ScreenContainer>
  );
}

function StatCard({ icon, label, value, color, colors, radius, spacing, fontSizes, fontWeights }) {
  return (
    <Card style={{ flex: 1, marginRight: spacing.sm, alignItems: 'center', paddingVertical: spacing.md }}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginTop: spacing.xs }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

function ActionTile({ icon, label, onPress, colors, radius, spacing, fontSizes, fontWeights }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: '48%',
        margin: '1%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={28} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: fontWeights.medium, marginTop: spacing.xs, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
