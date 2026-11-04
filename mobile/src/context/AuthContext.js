import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, setCurrentUserId } from '../api/api';
import { extractErrorMessage } from '../utils/validators';

const SESSION_KEY = 'userSession';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed);
          setCurrentUserId(parsed?.id || null);
        }
      } catch (err) {
        // Corrupted/unavailable storage — fall back to logged out.
        console.warn('Failed to restore session:', err?.message);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier, password) => {
    try {
      const data = await loginUser({ identifier, password });
      const nextUser = data.user;
      setUser(nextUser);
      setCurrentUserId(nextUser.id);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
      return nextUser;
    } catch (error) {
      // Surface the exact backend message (404 / 401 / 423) to the caller,
      // plus the lockout countdown (423) so the UI can show a live timer.
      const wrapped = new Error(extractErrorMessage(error, 'Unable to log in right now.'));
      wrapped.lockedForSeconds = error?.response?.data?.lockedForSeconds || null;
      wrapped.status = error?.response?.status || null;
      throw wrapped;
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setCurrentUserId(null);
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.warn('Failed to clear session:', err?.message);
    }
  }, []);

  const refreshUser = useCallback(async (nextUser) => {
    setUser(nextUser);
    setCurrentUserId(nextUser?.id || null);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    } catch (err) {
      console.warn('Failed to persist session:', err?.message);
    }
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, refreshUser }),
    [user, initializing, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
