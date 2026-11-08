
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  loginUser,
  getCurrentUser,
  setAuthToken,
} from '../api/api';

import { extractErrorMessage } from '../utils/validators';

const SESSION_KEY = 'userSession';
const TOKEN_KEY = 'userAuthToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // -------------------------------------------------------------------------
  // Restore and validate the saved JWT session when the app starts.
  // -------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        if (!token) {
          setAuthToken(null);
          await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }

        // Attach the saved JWT before requesting the current user.
        setAuthToken(token);

        try {
          const data = await getCurrentUser();
          const restoredUser = data?.user;

          if (!restoredUser?.id) {
            throw new Error('Invalid session response from server.');
          }

          if (!mounted) return;

          setUser(restoredUser);

          await AsyncStorage.setItem(
            SESSION_KEY,
            JSON.stringify(restoredUser)
          );
        } catch (error) {
          const status = error?.response?.status;

          if (status === 401 || status === 403) {
            // Invalid, expired, revoked, or unauthorized session.
            setAuthToken(null);
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await AsyncStorage.removeItem(SESSION_KEY);
          } else {
            // Network/server issue: retain the token and cached profile.
            // The backend will still validate the token on protected requests.
            console.warn(
              'Unable to validate saved session:',
              error?.message
            );

            const cachedUser = await AsyncStorage.getItem(SESSION_KEY);

            if (mounted && cachedUser) {
              try {
                setUser(JSON.parse(cachedUser));
              } catch {
                setUser(null);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to restore session:', error?.message);
        setAuthToken(null);

        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await AsyncStorage.removeItem(SESSION_KEY);
        } catch (storageError) {
          console.warn(
            'Failed to clear invalid session:',
            storageError?.message
          );
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  const login = useCallback(async (identifier, password) => {
    try {
      const data = await loginUser({
        identifier,
        email: identifier,
        password,
      });

      const token = data?.token;
      const nextUser = data?.user;

      if (!token || !nextUser?.id) {
        throw new Error('The server returned an incomplete login response.');
      }

      // Store the JWT securely before allowing authenticated API requests.
      await SecureStore.setItemAsync(TOKEN_KEY, token);

      // Make the JWT available to the Axios request interceptor.
      setAuthToken(token);

      setUser(nextUser);

      await AsyncStorage.setItem(
        SESSION_KEY,
        JSON.stringify(nextUser)
      );

      return nextUser;
    } catch (error) {
      const wrapped = new Error(
        extractErrorMessage(error, 'Unable to log in right now.')
      );

      wrapped.lockedForSeconds =
        error?.response?.data?.lockedForSeconds || null;

      wrapped.status = error?.response?.status || null;

      throw wrapped;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const logout = useCallback(async () => {
    // Remove the in-memory token immediately.
    setAuthToken(null);
    setUser(null);

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear session:', error?.message);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Update the user profile without replacing the JWT.
  // -------------------------------------------------------------------------

  const refreshUser = useCallback(async (nextUser) => {
    setUser(nextUser);

    try {
      if (nextUser) {
        await AsyncStorage.setItem(
          SESSION_KEY,
          JSON.stringify(nextUser)
        );
      } else {
        await AsyncStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist session:', error?.message);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      logout,
      refreshUser,
    }),
    [user, initializing, login, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return ctx;
}
