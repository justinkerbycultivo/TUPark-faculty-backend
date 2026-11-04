import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { getCaptcha, registerUser } from '../../api/api';
import { extractErrorMessage, isValidEmail, isValidStudentId, isValidContactNumber, isValidPlateNumber, isValidPassword } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import VehicleTypePicker from '../../components/VehicleTypePicker';
import Card from '../../components/ui/Card';

const TERMS_SECTIONS = [
  {
    heading: '1. Proper Use',
    body: 'TUPark is provided solely to manage parking access at TUP Cavite. You agree to use the app only for its intended purpose — registering your vehicle, scanning in/out, reserving a space (faculty), and reporting genuine violations — and not to attempt to interfere with, disrupt, or misuse the system.',
  },
  {
    heading: '2. Parking Rules',
    body: 'You must park only in the space assigned to you at entry, follow all posted campus parking rules and lane markings, and comply with the instructions of security guards and campus administrators at all times.',
  },
  {
    heading: '3. Account Responsibility',
    body: 'You are responsible for keeping your login credentials and QR code confidential. Your QR code is unique to you and must only be used for your own vehicle entry and exit — sharing it with another person may result in account suspension.',
  },
  {
    heading: '4. Vehicle Information',
    body: 'You agree to provide accurate and truthful information about yourself and your vehicle (plate number and vehicle type) at registration, and to keep this information up to date. Providing false vehicle information may result in denied entry or account review.',
  },
  {
    heading: '5. Violation Reporting',
    body: 'Any user may report a suspected parking violation through the app. Reports are reviewed by campus administrators, who may change a report\'s status (Pending, Under Review, Resolved, Rejected) based on their findings.',
  },
  {
    heading: '6. Misuse',
    body: 'Attempting to forge, duplicate, or tamper with QR codes, submitting false violation reports, or circumventing the entry/exit scanning process is strictly prohibited and may result in account suspension or referral to campus authorities.',
  },
  {
    heading: '7. Privacy',
    body: 'Your personal data (name, student ID, contact information, vehicle details, and verification photos) is collected and used only for campus parking management — verifying identity at entry/exit, tracking space occupancy, and reviewing reported violations. It is not sold or shared outside the university administration.',
  },
  {
    heading: '8. Administrator Authority',
    body: 'Campus administrators may review, update, or revoke access to this system, manage parking area configuration, review submitted photos and violation reports, and take any action necessary to maintain fair and orderly campus parking.',
  },
];

export default function RegisterScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  const [accountType, setAccountType] = useState(null); // 'student' | 'guard'
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleTypeOther, setVehicleTypeOther] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(true);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptchaId(data.captchaId);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not load the CAPTCHA. Pull to refresh and try again.'));
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const isGuard = accountType === 'guard';

  function validate() {
    const next = {};
    if (!surname.trim()) next.surname = 'Surname is required.';
    if (!givenName.trim()) next.givenName = 'Given name is required.';
    if (!accountType) next.accountType = 'Choose an account type.';
    if (isGuard) {
      if (!/^[A-Za-z0-9-]{3,20}$/.test(studentId.trim())) next.studentId = 'Use 3-20 letters, numbers or dashes.';
    } else if (!isValidStudentId(studentId)) {
      next.studentId = 'Format must be 0000-0000 (4 digits, dash, 4-6 digits).';
    }
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!isValidContactNumber(contactNumber)) next.contactNumber = 'Must be 11 digits starting with 09 (e.g. 09171234567).';
    if (!isGuard) {
      if (!isValidPlateNumber(plateNumber)) next.plateNumber = 'Enter a valid plate number (3-10 letters/numbers).';
      if (!vehicleType) next.vehicleType = 'Select a vehicle type.';
      if (vehicleType === 'other' && !vehicleTypeOther.trim()) next.vehicleTypeOther = 'Please specify your vehicle type.';
    }
    if (!isValidPassword(password)) next.password = 'At least 8 characters, with letters and numbers.';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    if (!captchaAnswer.trim()) next.captchaAnswer = 'Answer the CAPTCHA.';
    if (!agreedToTerms) next.terms = 'You must agree to the Terms and Conditions.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (submittingRef.current) return;
    setFormError('');
    setSuccessMessage('');
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await registerUser({
        accountType,
        surname: surname.trim(),
        givenName: givenName.trim(),
        middleName: middleName.trim(),
        studentId: studentId.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        password,
        ...(isGuard
          ? {}
          : {
              plateNumber: plateNumber.trim(),
              vehicleType,
              vehicleTypeOther: vehicleType === 'other' ? vehicleTypeOther.trim() : '',
            }),
        agreedToTerms,
        captchaId,
        captchaAnswer: captchaAnswer.trim(),
      });
      setSuccessMessage(
        res?.pendingApproval
          ? 'Guard registration submitted. Your account is pending admin approval. You can log in once it is approved.'
          : 'Account created successfully. You can now log in.'
      );
      setTimeout(() => navigation.navigate('Login'), res?.pendingApproval ? 3500 : 1200);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Registration failed. Please try again.'));
      loadCaptcha();
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <ScreenContainer>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.xs }}>
        Create Your Account
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg }}>
        Pick an account type, then fill in your details.
      </Text>

      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold, marginBottom: spacing.sm }}>
        Choose Your Account Type
      </Text>
      {[
        { key: 'student', icon: 'school-outline', title: 'Student Account', body: 'Register as a student to access parking reservations and other student features.' },
        { key: 'guard', icon: 'shield-account-outline', title: 'Guard Account', body: 'Register as an authorized campus guard to manage parking operations. Requires admin approval.' },
      ].map((opt) => {
        const selected = accountType === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => { setAccountType(opt.key); setErrors({}); setFormError(''); }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selected ? colors.primarySoft : colors.surface,
              borderWidth: 2,
              borderColor: selected ? colors.primary : colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            <MaterialCommunityIcons name={opt.icon} size={30} color={selected ? colors.primary : colors.textMuted} style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>{opt.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{opt.body}</Text>
            </View>
            <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        );
      })}
      {!!errors.accountType && (
        <Text style={{ color: colors.error, fontSize: fontSizes.xs, marginBottom: spacing.sm }}>{errors.accountType}</Text>
      )}
      <View style={{ height: spacing.md }} />

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

      {!!accountType && (<>
      <Input label="Surname" value={surname} onChangeText={setSurname} placeholder="Dela Cruz" error={errors.surname} />
      <Input label="Given Name" value={givenName} onChangeText={setGivenName} placeholder="Juan" error={errors.givenName} />
      <Input label="Middle Name (optional)" value={middleName} onChangeText={setMiddleName} placeholder="Santos" />
      <Input
        label={isGuard ? 'Guard ID / Employee ID' : 'Student ID'}
        value={studentId}
        onChangeText={setStudentId}
        placeholder={isGuard ? 'G-0001' : '2021-0001'}
        autoCapitalize="none"
        error={errors.studentId}
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="juan.delacruz@tup.edu.ph"
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label="Contact Number"
        value={contactNumber}
        onChangeText={setContactNumber}
        placeholder="09171234567"
        keyboardType="phone-pad"
        error={errors.contactNumber}
      />
      {!isGuard && (<>
      <Input
        label="Plate Number"
        value={plateNumber}
        onChangeText={setPlateNumber}
        placeholder="ABC-1234"
        autoCapitalize="characters"
        error={errors.plateNumber}
      />

      <VehicleTypePicker
        value={vehicleType}
        onChange={setVehicleType}
        otherValue={vehicleTypeOther}
        onOtherChange={setVehicleTypeOther}
        error={errors.vehicleType}
        otherError={errors.vehicleTypeOther}
      />
      </>)}

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters, letters + numbers"
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirmPassword}
      />

      {/* CAPTCHA */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginBottom: spacing.xs }}>
          Security Check
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={{ flex: 1, color: colors.primary, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
            {captchaLoading ? 'Loading question...' : captchaQuestion}
          </Text>
          <TouchableOpacity
            onPress={loadCaptcha}
            accessibilityLabel="Refresh CAPTCHA"
            accessibilityRole="button"
            style={{ padding: spacing.xs }}
          >
            <MaterialCommunityIcons name="refresh" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <Input
          value={captchaAnswer}
          onChangeText={setCaptchaAnswer}
          placeholder="Your answer"
          keyboardType="number-pad"
          error={errors.captchaAnswer}
          containerStyle={{ marginBottom: 0 }}
        />
      </Card>

      {/* Terms & Conditions */}
      <TouchableOpacity
        onPress={() => setAgreedToTerms((a) => !a)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreedToTerms }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: agreedToTerms ? colors.primary : colors.border,
            backgroundColor: agreedToTerms ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
            marginTop: 2,
          }}
        >
          {agreedToTerms && <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />}
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm }}>
          I agree to the{' '}
          <Text style={{ color: colors.primary, fontWeight: fontWeights.bold }} onPress={() => setTermsVisible(true)}>
            Terms and Conditions
          </Text>
        </Text>
      </TouchableOpacity>
      {!!errors.terms && (
        <Text style={{ color: colors.error, fontSize: fontSizes.xs, marginTop: -spacing.sm, marginBottom: spacing.md }}>
          {errors.terms}
        </Text>
      )}

      <Button title={isGuard ? 'Submit Guard Request' : 'Create Account'} onPress={handleRegister} loading={loading} />
      </>)}

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Already have an account? <Text style={{ color: colors.primary, fontWeight: fontWeights.bold }}>Log In</Text>
        </Text>
      </TouchableOpacity>

      <Modal visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <ScreenContainer>
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.xs }}>
            Terms and Conditions
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg }}>
            TUPark — Technological University of the Philippines, Cavite Campus
          </Text>
          {TERMS_SECTIONS.map((section) => (
            <View key={section.heading} style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: fontWeights.bold, marginBottom: 4 }}>
                {section.heading}
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 21 }}>{section.body}</Text>
            </View>
          ))}
          <Button
            title="Close"
            onPress={() => setTermsVisible(false)}
            style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
            variant="secondary"
          />
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
