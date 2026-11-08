import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Typography';
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
      setActiveTransactions(Array.isArray(data) ? data : []);
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

      <TouchableOpacity
        onPress={() => navigation.getParent()?.navigate('ScanQRTab')}
        accessibilityRole="button"
        accessibilityLabel="Scan QR for entry or exit"
        activeOpacity={0.9}
        style={{ backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', minHeight: 110 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: fontSizes.xl, fontWeight: fontWeights.bold }}>Scan QR</Text>
          <Text style={{ color: '#FFFFFFCC', fontSize: fontSizes.sm, marginTop: 2 }}>Verify vehicle · record entry or exit</Text>
        </View>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="qrcode-scan" size={32} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <ActionTile icon="account-plus-outline" label="Visitor Ticket" onPress={() => navigation.getParent()?.navigate('VisitorsTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <ActionTile icon="account-circle-outline" label="My Profile" onPress={() => navigation.getParent()?.navigate('ProfileTab')} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} last />
      </View>

      <SectionHeading title="Currently On Campus" />
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <StatCard icon="car-multiple" label="Total Parked" value={activeTransactions.length} color={colors.primary} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <StatCard icon="school-outline" label="Students/Faculty" value={studentCount} color={colors.navy} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <StatCard icon="account-tie-outline" label="Visitors" value={visitorCount} color={colors.accentGold} colors={colors} radius={radius} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
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

function ActionTile({ icon, label, onPress, colors, radius, spacing, fontSizes, fontWeights, last }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        marginRight: last ? 0 : spacing.sm,
        flexDirection: 'row',
        minHeight: 56,
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.sm,
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: fontWeights.medium, marginLeft: spacing.sm, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
