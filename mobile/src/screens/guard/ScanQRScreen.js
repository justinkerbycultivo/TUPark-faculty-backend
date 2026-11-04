import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { guardScan, guardExit } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import { vehicleTypeLabel } from '../../utils/vehicleTypes';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';

export default function ScanQRScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState('entry'); // 'entry' | 'exit'
  const [cameraActive, setCameraActive] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message, transaction }
  const [scannedLock, setScannedLock] = useState(false);

  const handleToken = useCallback(
    async (token) => {
      if (!token || submitting) return;
      setSubmitting(true);
      setResult(null);
      try {
        // Try as a QR token first; fall back to a raw Student ID if it
        // looks like one (contains a dash, matches 0000-0000 shape loosely).
        const looksLikeStudentId = /^\d{4}-\d{4,6}$/.test(token.trim());
        const payload = looksLikeStudentId ? { studentId: token.trim() } : { qrToken: token.trim() };

        if (mode === 'entry') {
          const transaction = await guardScan(payload);
          setResult({ ok: true, transaction });
        } else {
          const transaction = await guardExit(payload);
          setResult({ ok: true, transaction, exited: true });
        }
      } catch (err) {
        setResult({ ok: false, message: extractErrorMessage(err, 'Scan failed.') });
      } finally {
        setSubmitting(false);
      }
    },
    [mode, submitting]
  );

  function handleBarcodeScanned({ data }) {
    if (scannedLock) return;
    setScannedLock(true);
    handleToken(data).finally(() => setTimeout(() => setScannedLock(false), 1500));
  }

  function resetResult() {
    setResult(null);
    setManualValue('');
  }

  return (
    <ScreenContainer>
      <SectionHeading title="Scan QR" subtitle="Scan a student/faculty QR code for entry or exit" />

      {/* Entry / Exit toggle */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.md, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.primary }}>
        {['entry', 'exit'].map((m) => {
          const selected = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                setMode(m);
                resetResult();
              }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                backgroundColor: selected ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ color: selected ? colors.onPrimary : colors.primary, fontWeight: fontWeights.bold, fontSize: fontSizes.sm }}>
                {m === 'entry' ? 'ENTRY' : 'EXIT'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!result && (
        <>
          <Card style={{ marginBottom: spacing.md }}>
            {!permission?.granted ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <MaterialCommunityIcons name="camera-off-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginVertical: spacing.sm, textAlign: 'center' }}>
                  Camera access is needed to scan QR codes.
                </Text>
                <Button title="Grant Camera Permission" variant="secondary" onPress={requestPermission} />
              </View>
            ) : !cameraActive ? (
              <Button
                title="Open Camera Scanner"
                onPress={() => setCameraActive(true)}
                icon={<MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.onPrimary} />}
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: '100%', height: 280, borderRadius: radius.md, overflow: 'hidden' }}>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={submitting ? undefined : handleBarcodeScanned}
                  />
                </View>
                <Button title="Close Camera" variant="ghost" onPress={() => setCameraActive(false)} style={{ marginTop: spacing.sm }} />
              </View>
            )}
          </Card>

          <Card>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginBottom: spacing.sm }}>
              Manual Entry (fallback)
            </Text>
            <Input
              placeholder="Paste QR token or type Student ID (0000-0000)"
              value={manualValue}
              onChangeText={setManualValue}
              autoCapitalize="none"
              containerStyle={{ marginBottom: spacing.sm }}
            />
            <Button
              title={mode === 'entry' ? 'Process Entry' : 'Process Exit'}
              onPress={() => handleToken(manualValue)}
              loading={submitting}
              disabled={!manualValue.trim()}
            />
          </Card>
        </>
      )}

      {!!result && (
        <Card
          style={{
            backgroundColor: result.ok ? colors.successBg : colors.errorBg,
            borderColor: result.ok ? colors.success : colors.error,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <MaterialCommunityIcons
              name={result.ok ? 'check-circle' : 'close-circle'}
              size={28}
              color={result.ok ? colors.success : colors.error}
            />
            <Text
              style={{
                color: result.ok ? colors.success : colors.error,
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.bold,
                marginLeft: spacing.sm,
              }}
            >
              {result.ok ? (result.exited ? 'Exit Recorded' : 'Entry Recorded') : 'Scan Failed'}
            </Text>
          </View>

          {result.ok ? (
            <>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.semibold }}>
                {result.transaction.area?.name} — {result.transaction.spaces?.map((s) => s.code).join(', ') || '—'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 }}>
                {result.transaction.plateNumber} ·{' '}
                {vehicleTypeLabel(result.transaction.vehicleType, result.transaction.vehicleTypeOther)}
              </Text>
              {!result.exited && (
                <Button
                  title="Navigate (show route to driver)"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('Navigation', {
                      areaId: result.transaction.area?._id,
                      areaName: result.transaction.area?.name,
                    })
                  }
                  style={{ marginTop: spacing.md }}
                  icon={<MaterialCommunityIcons name="map-marker-path" size={18} color={colors.primary} />}
                />
              )}
            </>
          ) : (
            <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{result.message}</Text>
          )}

          <Button title="Scan Another" onPress={resetResult} style={{ marginTop: spacing.md }} />
        </Card>
      )}
    </ScreenContainer>
  );
}
