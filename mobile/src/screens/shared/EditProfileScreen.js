import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Avatar from '../../components/Avatar';
import { Text } from '../../components/ui/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import VehicleTypePicker from '../../components/VehicleTypePicker';
import { updateProfile } from '../../api/api';
import { extractErrorMessage, isValidContactNumber, isValidPlateNumber } from '../../utils/validators';

const NAME_RE = /^[A-Za-zÀ-ÿ.'\- ]{1,60}$/;

export default function EditProfileScreen({ navigation }) {
  const { colors, spacing, fontSizes, fontWeights, radius } = useThemeColors();
  const { user, refreshUser } = useAuth();
  const canEditVehicle = user?.role === 'student' || user?.role === 'faculty';

  const [surname, setSurname] = useState(user?.surname || '');
  const [givenName, setGivenName] = useState(user?.givenName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [plateNumber, setPlateNumber] = useState(user?.vehicle?.plateNumber || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicle?.vehicleType || '');
  const [vehicleTypeOther, setVehicleTypeOther] = useState(user?.vehicle?.vehicleTypeOther || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  if (!user) return null;

  async function pickPhoto(fromCamera) {
    setFormError('');
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setFormError(fromCamera ? 'Camera permission is needed to take a photo.' : 'Photo library permission is needed to choose a picture.');
        return;
      }
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (result.canceled || !result.assets || !result.assets[0]) return;
      // Shrink to 256x256 JPEG so it stays small (a few tens of KB).
      const out = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!out.base64) throw new Error('no data');
      setAvatar(`data:image/jpeg;base64,${out.base64}`);
      setSuccess('');
    } catch (err) {
      setFormError('Could not use that picture. Please try another one.');
    }
  }

  function choosePhoto() {
    Alert.alert('Profile picture', 'Choose a source', [
      { text: 'Take photo', onPress: () => pickPhoto(true) },
      { text: 'Choose from gallery', onPress: () => pickPhoto(false) },
      ...(avatar ? [{ text: 'Remove picture', style: 'destructive', onPress: () => setAvatar('') }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function save() {
    if (busy.current) return;
    setFormError('');
    setSuccess('');
    const e = {};
    if (!NAME_RE.test(surname.trim())) e.surname = 'Enter your surname.';
    if (!NAME_RE.test(givenName.trim())) e.givenName = 'Enter your given name.';
    if (middleName.trim() && !NAME_RE.test(middleName.trim())) e.middleName = 'Enter a valid middle name.';
    if (!isValidContactNumber(contactNumber)) e.contactNumber = 'Use an 11-digit number starting with 09.';
    if (canEditVehicle) {
      if (!isValidPlateNumber(plateNumber)) e.plateNumber = 'Enter a valid plate number.';
      if (!vehicleType) e.vehicleType = 'Select a vehicle type.';
      if (vehicleType === 'other' && !vehicleTypeOther.trim()) e.vehicleTypeOther = 'Describe your vehicle.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = { surname, givenName, middleName, contactNumber };
    if (avatar !== (user.avatar || '')) payload.avatar = avatar;
    if (canEditVehicle) Object.assign(payload, { plateNumber, vehicleType, vehicleTypeOther });

    busy.current = true;
    setLoading(true);
    try {
      const res = await updateProfile(payload);
      await refreshUser(res.user); // updates the saved session so every screen shows the new details
      setSuccess(res.message || 'Profile updated.');
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      {!!formError && (
        <View style={{ backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>{formError}</Text>
        </View>
      )}
      {!!success && (
        <View style={{ backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.success, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>{success}</Text>
        </View>
      )}

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <TouchableOpacity onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Change profile picture">
          <Avatar user={{ ...user, avatar }} size={96} />
        </TouchableOpacity>
        <TouchableOpacity onPress={choosePhoto} style={{ marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>
            {avatar ? 'Change photo' : 'Add photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <Input label="Surname" value={surname} onChangeText={setSurname} autoCapitalize="words" error={errors.surname} />
      <Input label="Given name" value={givenName} onChangeText={setGivenName} autoCapitalize="words" error={errors.givenName} />
      <Input label="Middle name (optional)" value={middleName} onChangeText={setMiddleName} autoCapitalize="words" error={errors.middleName} />
      <Input label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" maxLength={11} error={errors.contactNumber} />
      <Input label="Email (cannot be changed)" value={user.email} editable={false} />
      <Input label={user.role === 'student' ? 'Student ID (cannot be changed)' : 'Account ID (cannot be changed)'} value={user.studentId} editable={false} />

      {canEditVehicle && (
        <>
          <Input label="Plate number" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" error={errors.plateNumber} />
          <VehicleTypePicker
            value={vehicleType}
            onChange={setVehicleType}
            otherValue={vehicleTypeOther}
            onOtherChange={setVehicleTypeOther}
            error={errors.vehicleType}
            otherError={errors.vehicleTypeOther}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginBottom: spacing.md }}>
            Vehicle details can't be changed while your vehicle is parked.
          </Text>
        </>
      )}

      <Button title="Save Changes" onPress={save} loading={loading} />
    </ScreenContainer>
  );
}
