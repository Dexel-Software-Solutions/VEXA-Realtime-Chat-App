/**
 * @file AuthContext.tsx
 * @description Provides authentication state (current user + token) with server-side token revocation on logout.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { User } from '../types';
import { saveSession, getSession, clearSession } from '../utils/storage';
import { logoutUser } from '../services/authService';
import Colors from '../constants/Colors';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      const startTime = Date.now();
      try {
        const session = await getSession();
        if (session) {
          setUser(session.user);
          setToken(session.token);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(1500 - elapsedTime, 0);
        setTimeout(() => {
          setIsLoading(false);
        }, remainingTime);
      }
    };
    restoreSession();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await saveSession({ token: newToken, user: newUser });
  };

  const logout = async () => {
    if (token) {
      logoutUser(token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    await clearSession();
  };

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoContainer}>
          <Image
            source={require('../../assets/ico.png')}
            style={styles.splashLogoImage}
          />
          <Text style={styles.splashAppName}>VEXA</Text>
        </View>

        <View style={styles.splashFooter}>
          <Text style={styles.splashFooterFrom}>from</Text>
          <Text style={styles.splashFooterBrand}>DEXEL</Text>
        </View>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoContainer: {
    alignItems: 'center',
  },
  splashLogoImage: {
    width: 100,
    height: 100,
    borderRadius: 22,
    resizeMode: 'cover',
  },
  splashAppName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  splashFooterFrom: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  splashFooterBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
    marginTop: 4,
  },
});
