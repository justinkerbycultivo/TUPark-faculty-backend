import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { setInterEnabled } from './src/components/ui/Typography';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeColors } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function StatusBarForTheme() {
  const { mode } = useThemeColors();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (fontError) setInterEnabled(false); // fall back to the system font rather than block the app
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B1538' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBarForTheme />
          <ErrorBoundary title="TUPark hit an error">
            <AppNavigator />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
