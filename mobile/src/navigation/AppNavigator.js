import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../components/ui/Typography';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Auth
import LoginScreen from '../screens/shared/LoginScreen';
import RegisterScreen from '../screens/shared/RegisterScreen';

// Shared
import ProfileScreen from '../screens/shared/ProfileScreen';
import NavigationScreenBase from '../screens/shared/NavigationScreen';
import ForgotPasswordScreen from '../screens/shared/ForgotPasswordScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';
import { withErrorBoundary } from '../components/ErrorBoundary';
import AnnouncementsScreen from '../screens/shared/AnnouncementsScreen';

// Student
import DashboardScreen from '../screens/student/DashboardScreen';
import ParkingMapScreenBase from '../screens/student/ParkingMapScreen';
import MyQRCodeScreen from '../screens/student/MyQRCodeScreen';
import MyParkingHistoryScreen from '../screens/student/MyParkingHistoryScreen';
import ReportViolationScreen from '../screens/student/ReportViolationScreen';

// Faculty
import FacultyDashboardScreen from '../screens/faculty/FacultyDashboardScreen';
import FacultyReservationsScreen from '../screens/faculty/ReservationsScreen';

// Guard
import GuardDashboardScreen from '../screens/guard/GuardDashboardScreen';
import ScanQRScreen from '../screens/guard/ScanQRScreen';
import VisitorsScreen from '../screens/guard/VisitorsScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ParkingAreasScreen from '../screens/admin/ParkingAreasScreen';
import AdminVehiclesScreen from '../screens/admin/AdminVehiclesScreen';
import AdminHistoryScreen from '../screens/admin/AdminHistoryScreen';
import AdminMoreScreen from '../screens/admin/AdminMoreScreen';
import AdminGuardRequestsScreen from '../screens/admin/AdminGuardRequestsScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminVisitorsScreen from '../screens/admin/AdminVisitorsScreen';
import AdminPhotosScreen from '../screens/admin/AdminPhotosScreen';
import AdminViolationsScreen from '../screens/admin/AdminViolationsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';

// Render errors on these two screens show a recoverable message instead of closing the app.
const NavigationScreen = withErrorBoundary(NavigationScreenBase, 'Navigation unavailable');
const ParkingMapScreen = withErrorBoundary(ParkingMapScreenBase, 'Parking map unavailable');

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function useStackScreenOptions() {
  const { colors, fontWeights } = useThemeColors();
  return {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.onPrimary,
    headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
    contentStyle: { backgroundColor: colors.background },
  };
}

// ---------------------------------------------------------------------------
// Auth stack (logged out)
// ---------------------------------------------------------------------------
function AuthStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------
function StudentHomeStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'TUPark' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ title: 'My QR Code' }} />
      <Stack.Screen name="MyParkingHistory" component={MyParkingHistoryScreen} options={{ title: 'Parking History' }} />
      <Stack.Screen name="ReportViolation" component={ReportViolationScreen} options={{ title: 'Report a Violation' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
    </Stack.Navigator>
  );
}

function StudentParkingStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ParkingMap" component={ParkingMapScreen} options={{ title: 'Parking Map' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
    </Stack.Navigator>
  );
}

function ActivityMenuScreen({ navigation }) {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();
  const items = [
    { key: 'MyParkingHistory', icon: 'history', label: 'Parking History', subtitle: 'Your past and current sessions' },
    { key: 'ReportViolation', icon: 'alert-octagon-outline', label: 'Report a Violation', subtitle: 'Flag a parking issue' },
    { key: 'Announcements', icon: 'bullhorn-outline', label: 'Announcements', subtitle: 'Campus parking notices' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.md }}>
        Activity
      </Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => navigation.navigate(item.key)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <MaterialCommunityIcons name={item.icon} size={24} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{item.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>{item.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StudentActivityStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ActivityMenu" component={ActivityMenuScreen} options={{ title: 'Activity' }} />
      <Stack.Screen name="MyParkingHistory" component={MyParkingHistoryScreen} options={{ title: 'Parking History' }} />
      <Stack.Screen name="ReportViolation" component={ReportViolationScreen} options={{ title: 'Report a Violation' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
    </Stack.Navigator>
  );
}

function StudentProfileStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ title: 'My QR Code' }} />
    </Stack.Navigator>
  );
}

function tabIcon(name) {
  return ({ color, size }) => <MaterialCommunityIcons name={name} size={size} color={color} />;
}

function useTabScreenOptions() {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 60 + insets.bottom,
      elevation: 0,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  };
}

function StudentTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={StudentHomeStack}
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline'), tabBarAccessibilityLabel: 'Home tab' }}
      />
      <Tab.Screen
        name="ParkingTab"
        component={StudentParkingStack}
        options={{ title: 'Parking', tabBarIcon: tabIcon('parking'), tabBarAccessibilityLabel: 'Parking map tab' }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={StudentActivityStack}
        options={{ title: 'Activity', tabBarIcon: tabIcon('clipboard-text-outline'), tabBarAccessibilityLabel: 'Activity tab' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={StudentProfileStack}
        options={{ title: 'Profile', tabBarIcon: tabIcon('account-circle-outline'), tabBarAccessibilityLabel: 'Profile tab' }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------
function FacultyHomeStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardHome" component={FacultyDashboardScreen} options={{ title: 'TUPark' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ title: 'My QR Code' }} />
      <Stack.Screen name="ReportViolation" component={ReportViolationScreen} options={{ title: 'Report a Violation' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
    </Stack.Navigator>
  );
}

function FacultyParkingStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ParkingMap" component={ParkingMapScreen} options={{ title: 'Parking Map' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
    </Stack.Navigator>
  );
}

function FacultyReservationsStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ReservationsHome" component={FacultyReservationsScreen} options={{ title: 'Reservations' }} />
    </Stack.Navigator>
  );
}

function FacultyProfileStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ title: 'My QR Code' }} />
    </Stack.Navigator>
  );
}

function FacultyTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="HomeTab" component={FacultyHomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tab.Screen name="ParkingTab" component={FacultyParkingStack} options={{ title: 'Parking', tabBarIcon: tabIcon('parking') }} />
      <Tab.Screen
        name="ReservationsTab"
        component={FacultyReservationsStack}
        options={{ title: 'Reservations', tabBarIcon: tabIcon('calendar-check-outline') }}
      />
      <Tab.Screen name="ProfileTab" component={FacultyProfileStack} options={{ title: 'Profile', tabBarIcon: tabIcon('account-circle-outline') }} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------
function GuardDashboardStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardHome" component={GuardDashboardScreen} options={{ title: 'TUPark Guard' }} />
    </Stack.Navigator>
  );
}

function GuardScanStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ScanQRHome" component={ScanQRScreen} options={{ title: 'Scan QR' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
    </Stack.Navigator>
  );
}

function GuardVisitorsStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="VisitorsHome" component={VisitorsScreen} options={{ title: 'Visitors' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigate' }} />
    </Stack.Navigator>
  );
}

function GuardProfileStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    </Stack.Navigator>
  );
}

function GuardTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="DashboardTab" component={GuardDashboardStack} options={{ title: 'Dashboard', tabBarIcon: tabIcon('view-dashboard-outline') }} />
      <Tab.Screen name="ScanQRTab" component={GuardScanStack} options={{ title: 'Scan QR', tabBarIcon: tabIcon('qrcode-scan') }} />
      <Tab.Screen name="VisitorsTab" component={GuardVisitorsStack} options={{ title: 'Visitors', tabBarIcon: tabIcon('account-tie-outline') }} />
      <Tab.Screen name="ProfileTab" component={GuardProfileStack} options={{ title: 'Profile', tabBarIcon: tabIcon('account-circle-outline') }} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
function AdminDashboardStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="DashboardHome" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    </Stack.Navigator>
  );
}

function AdminParkingAreasStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ParkingAreasHome" component={ParkingAreasScreen} options={{ title: 'Parking Areas' }} />
    </Stack.Navigator>
  );
}

function AdminVehiclesStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="VehiclesHome" component={AdminVehiclesScreen} options={{ title: 'Vehicles' }} />
    </Stack.Navigator>
  );
}

function AdminHistoryStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HistoryHome" component={AdminHistoryScreen} options={{ title: 'History' }} />
    </Stack.Navigator>
  );
}

function AdminMoreStack() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MoreHome" component={AdminMoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="GuardRequests" component={AdminGuardRequestsScreen} options={{ title: 'Guard Requests' }} />
      <Stack.Screen name="Students" component={AdminStudentsScreen} options={{ title: 'Students' }} />
      <Stack.Screen name="Visitors" component={AdminVisitorsScreen} options={{ title: 'Visitors' }} />
      <Stack.Screen name="Photos" component={AdminPhotosScreen} options={{ title: 'Parking Photos' }} />
      <Stack.Screen name="Violations" component={AdminViolationsScreen} options={{ title: 'Violations' }} />
      <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="AdminReservations" component={AdminReservationsScreen} options={{ title: 'Reservations' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="DashboardTab" component={AdminDashboardStack} options={{ title: 'Dashboard', tabBarIcon: tabIcon('view-dashboard-outline') }} />
      <Tab.Screen name="ParkingAreasTab" component={AdminParkingAreasStack} options={{ title: 'Areas', tabBarIcon: tabIcon('office-building-marker-outline') }} />
      <Tab.Screen name="VehiclesTab" component={AdminVehiclesStack} options={{ title: 'Vehicles', tabBarIcon: tabIcon('car-multiple') }} />
      <Tab.Screen name="HistoryTab" component={AdminHistoryStack} options={{ title: 'History', tabBarIcon: tabIcon('history') }} />
      <Tab.Screen name="MoreTab" component={AdminMoreStack} options={{ title: 'More', tabBarIcon: tabIcon('dots-horizontal-circle-outline') }} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Role switch + root
// ---------------------------------------------------------------------------
function RoleTabs() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'faculty':
      return <FacultyTabs />;
    case 'guard':
      return <GuardTabs />;
    case 'admin':
      return <AdminTabs />;
    case 'student':
    default:
      return <StudentTabs />;
  }
}

export default function AppNavigator() {
  const { colors } = useThemeColors();
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>Loading TUPark...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="RoleTabs" component={RoleTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
