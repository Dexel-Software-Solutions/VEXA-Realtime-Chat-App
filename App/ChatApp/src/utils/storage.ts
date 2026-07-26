/**
 * utils/storage.ts
 * Wraps AsyncStorage so the rest of the app never touches raw keys directly.
 * Used to persist the logged-in user's session (token + profile) on the device,
 * so the user does not have to log in again every time the app is opened.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession } from '../types';

const SESSION_KEY = '@chatapp_session';

export const saveSession = async (session: AuthSession): Promise<void> => {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to AsyncStorage:', error);
    throw new Error('Could not save your session locally.');
  }
};

export const getSession = async (): Promise<AuthSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch (error) {
    console.error('Failed to read session from AsyncStorage:', error);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session from AsyncStorage:', error);
  }
};
