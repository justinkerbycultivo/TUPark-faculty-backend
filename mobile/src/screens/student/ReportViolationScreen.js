import React, { useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { reportViolation } from '../../api/api';
import { extractErrorMessage, isValidPlateNumber } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function ReportViolationScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const { user } = useAuth();

  const [plateNumber, setPlateNumber] = useState('');
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
  }

  function validate() {
    const next = {};
    if (!isValidPlateNumber(plateNumber)) next.plateNumber = 'Enter a valid plate number.';
    if (!description.trim()) next.description = 'Describe the violation.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setFormError('');
    setSuccessMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      await reportViolation({
        reportedBy: user?.id || null,
        plateNumber: plateNumber.trim(),
        description: description.trim(),
        photoBase64,
      });
      setSuccessMessage('Violation reported. Campus administrators will review it.');
      setPlateNumber('');
      setDescription('');
      setPhotoBase64(null);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not submit this report.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.xs }}>
        Report a Violation
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg }}>
        Flag a parking violation for campus admins to review.
      </Text>

      {!!formError && (
        <View style={{ backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{formError}</Text>
        </View>
      )}
      {!!successMessage && (
        <View style={{ backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.success, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{successMessage}</Text>
        </View>
      )}

      <Input
        label="Plate Number"
        value={plateNumber}
        onChangeText={setPlateNumber}
        placeholder="ABC-1234"
        autoCapitalize="characters"
        error={errors.plateNumber}
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe what happened (e.g. blocking a fire lane, double-parked)"
        multiline
        error={errors.description}
      />

      <Card style={{ marginBottom: spacing.md, alignItems: 'center' }}>
        {photoBase64 ? (
          <Image source={{ uri: photoBase64 }} style={{ width: '100%', height: 180, borderRadius: radius.md }} resizeMode="cover" />
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.sm }}>
            Optional: attach a photo of the violation
          </Text>
        )}
        <Button
          title={photoBase64 ? 'Retake Photo' : 'Attach Photo'}
          variant="secondary"
          onPress={pickPhoto}
          style={{ marginTop: spacing.sm }}
          icon={<MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />}
        />
      </Card>

      <Button title="Submit Report" onPress={handleSubmit} loading={loading} />
    </ScreenContainer>
  );
}
