import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { createVisitorEntry, visitorExit } from '../../api/api';
import { extractErrorMessage, isValidPlateNumber } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeading from '../../components/ui/SectionHeading';
import VehicleTypePicker from '../../components/VehicleTypePicker';

export default function VisitorsScreen({ navigation }) {
  const { colors, spacing, fontSizes, fontWeights } = useThemeColors();
  const [mode, setMode] = useState('new'); // 'new' | 'exit'

  // New ticket form
  const [visitorName, setVisitorName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleTypeOther, setVehicleTypeOther] = useState('');
  const [errors, setErrors] = useState({});

  // Exit form
  const [ticketNumber, setTicketNumber] = useState('');

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function resetAll() {
    setVisitorName('');
    setContactNumber('');
    setPlateNumber('');
    setVehicleType('');
    setVehicleTypeOther('');
    setTicketNumber('');
    setErrors({});
    setFormError('');
    setResult(null);
  }

  function validateNew() {
    const next = {};
    if (!visitorName.trim()) next.visitorName = 'Visitor name is required.';
    if (!isValidPlateNumber(plateNumber)) next.plateNumber = 'Enter a valid plate number.';
    if (!vehicleType) next.vehicleType = 'Select a vehicle type.';
    if (vehicleType === 'other' && !vehicleTypeOther.trim()) next.vehicleTypeOther = 'Please specify the vehicle type.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreateTicket() {
    setFormError('');
    setResult(null);
    if (!validateNew()) return;
    setLoading(true);
    try {
      const data = await createVisitorEntry({
        visitorName: visitorName.trim(),
        contactNumber: contactNumber.trim(),
        plateNumber: plateNumber.trim(),
        vehicleType,
        vehicleTypeOther: vehicleType === 'other' ? vehicleTypeOther.trim() : '',
      });
      setResult({ ok: true, ticket: data.ticket, transaction: data.transaction });
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not issue a visitor ticket.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVisitorExit() {
    setFormError('');
    setResult(null);
    if (!ticketNumber.trim()) {
      setErrors({ ticketNumber: 'Enter the ticket number.' });
      return;
    }
    setLoading(true);
    try {
      const data = await visitorExit({ ticketNumber: ticketNumber.trim() });
      setResult({ ok: true, exited: true, ticket: data.ticket, transaction: data.transaction });
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not process visitor exit.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <SectionHeading title="Visitors" subtitle="Issue or close a visitor parking ticket" />

      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <ModeTab label="New Ticket" active={mode === 'new'} onPress={() => { setMode('new'); resetAll(); }} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
        <ModeTab label="Visitor Exit" active={mode === 'exit'} onPress={() => { setMode('exit'); resetAll(); }} colors={colors} spacing={spacing} fontSizes={fontSizes} fontWeights={fontWeights} />
      </View>

      {!!formError && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{formError}</Text>
        </Card>
      )}

      {!result && mode === 'new' && (
        <Card>
          <Input label="Visitor Name" value={visitorName} onChangeText={setVisitorName} placeholder="Juan Dela Cruz" error={errors.visitorName} />
          <Input label="Contact Number (optional)" value={contactNumber} onChangeText={setContactNumber} placeholder="09171234567" keyboardType="phone-pad" />
          <Input label="Plate Number" value={plateNumber} onChangeText={setPlateNumber} placeholder="ABC-1234" autoCapitalize="characters" error={errors.plateNumber} />
          <VehicleTypePicker
            value={vehicleType}
            onChange={setVehicleType}
            otherValue={vehicleTypeOther}
            onOtherChange={setVehicleTypeOther}
            error={errors.vehicleType}
            otherError={errors.vehicleTypeOther}
          />
          <Button title="Issue Ticket & Park Vehicle" onPress={handleCreateTicket} loading={loading} />
        </Card>
      )}

      {!result && mode === 'exit' && (
        <Card>
          <Input label="Ticket Number" value={ticketNumber} onChangeText={setTicketNumber} placeholder="e.g. VT-20261010-001" autoCapitalize="characters" error={errors.ticketNumber} />
          <Button title="Process Visitor Exit" onPress={handleVisitorExit} loading={loading} />
        </Card>
      )}

      {!!result && (
        <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: fontSizes.lg, fontWeight: fontWeights.bold, marginLeft: spacing.sm }}>
              {result.exited ? 'Visitor Exit Recorded' : 'Ticket Issued'}
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
            Ticket #{result.ticket.ticketNumber}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 }}>
            {result.ticket.visitorName} · {result.ticket.plateNumber} ·{' '}
            {vehicleTypeLabel(result.ticket.vehicleType, result.ticket.vehicleTypeOther)}
          </Text>
          {!!result.transaction?.area && (
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.xs, fontWeight: fontWeights.semibold }}>
              Assigned: {result.ticket.area?.name || result.transaction.area?.name} —{' '}
              {result.transaction.spaces?.map((s) => s.code).join(', ')}
            </Text>
          )}

          {!result.exited && (
            <Button
              title="Navigate (show route to visitor)"
              variant="secondary"
              onPress={() =>
                navigation.navigate('Navigation', {
                  areaId: result.ticket.area?._id || result.transaction?.area?._id || result.transaction?.area,
                  areaName: result.ticket.area?.name,
                })
              }
              style={{ marginTop: spacing.md }}
              icon={<MaterialCommunityIcons name="map-marker-path" size={18} color={colors.primary} />}
            />
          )}

          <Button title="Done" onPress={resetAll} style={{ marginTop: spacing.sm }} />
        </Card>
      )}
    </ScreenContainer>
  );
}

function ModeTab({ label, active, onPress, colors, spacing, fontSizes, fontWeights }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.textMuted, fontWeight: active ? fontWeights.bold : fontWeights.medium, fontSize: fontSizes.sm }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
