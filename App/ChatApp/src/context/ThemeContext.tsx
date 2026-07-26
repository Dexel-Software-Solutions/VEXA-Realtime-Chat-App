/**
 * @file ThemeContext.tsx
 * @description Global theme provider managing state persistency and system appearance preferences.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  card: string; // Alias for surface
  textPrimary: string;
  text: string; // Alias for textPrimary
  textSecondary: string;
  subtext: string; // Alias for textSecondary
  textMuted: string;
  textOnPrimary: string;
  border: string;
  inputBackground: string; // Alias for background/input
  success: string;
  error: string;
  danger: string; // Alias for error
  warning: string;
  bubbleSent: string;
  bubbleReceived: string;
  bubbleSentText: string;
  bubbleReceivedText: string;
  online: string;
  offline: string;
}

const LightColors: ThemeColors = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  secondary: '#06B6D4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1E293B',
  text: '#1E293B',
  textSecondary: '#64748B',
  subtext: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  border: '#E2E8F0',
  inputBackground: '#F1F5F9',
  success: '#16A34A',
  error: '#DC2626',
  danger: '#DC2626',
  warning: '#F59E0B',
  bubbleSent: '#4F46E5',
  bubbleReceived: '#E2E8F0',
  bubbleSentText: '#FFFFFF',
  bubbleReceivedText: '#1E293B',
  online: '#22C55E',
  offline: '#94A3B8',
};

const DarkColors: ThemeColors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#312E81',
  secondary: '#06B6D4',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  textPrimary: '#F8FAFC',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  subtext: '#94A3B8',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',
  border: '#334155',
  inputBackground: '#1E293B',
  success: '#22C55E',
  error: '#EF4444',
  danger: '#EF4444',
  warning: '#F59E0B',
  bubbleSent: '#6366F1',
  bubbleReceived: '#334155',
  bubbleSentText: '#FFFFFF',
  bubbleReceivedText: '#F8FAFC',
  online: '#22C55E',
  offline: '#64748B',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: ThemeType) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
      setThemeState(newTheme);
    } catch (err) {
      console.warn('Failed to save theme:', err);
    }
  };

  const colors = theme === 'dark' ? DarkColors : LightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
