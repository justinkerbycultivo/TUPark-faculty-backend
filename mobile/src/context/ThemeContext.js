import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, spacing, radius, fontSizes, fontWeights } from '../theme';

const THEME_KEY = 'themeMode';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
          setMode(saved);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err?.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next).catch((err) =>
        console.warn('Failed to persist theme preference:', err?.message)
      );
      return next;
    });
  }, []);

  const setThemeMode = useCallback((next) => {
    setMode(next);
    AsyncStorage.setItem(THEME_KEY, next).catch((err) =>
      console.warn('Failed to persist theme preference:', err?.message)
    );
  }, []);

  const colors = palettes[mode] || palettes.light;

  const value = useMemo(
    () => ({ mode, colors, toggleTheme, setThemeMode, loaded, spacing, radius, fontSizes, fontWeights }),
    [mode, colors, toggleTheme, setThemeMode, loaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeColors() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeColors must be used within a ThemeProvider');
  return ctx;
}
