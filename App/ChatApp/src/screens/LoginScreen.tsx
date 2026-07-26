/**
 * @file LoginScreen.tsx
 * @description Authentication screen allowing existing users to securely sign in.
 * @author Demiyan Dissanayake
 * @copyright VEXA Chat App 2026. All rights reserved.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Colors from '../constants/Colors';
import { RootStackParamList } from '../types';
import { validateLoginForm } from '../utils/validation';
import { loginUser } from '../services/authService';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setServerError('');
    const { isValid, errors: validationErrors } = validateLoginForm(email, password);
    setErrors(validationErrors);
    if (!isValid) return;

    setLoading(true);
    try {
      const session = await loginUser(email, password);
      await login(session.token, session.user);
      // Navigation is handled automatically by AppNavigator once `user` is set.
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/ico.png')}
              style={styles.logoImage}
            />
            <Text style={[styles.title, { color: colors.textPrimary, marginTop: 16 }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue chatting</Text>
          </View>

          {!!serverError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{serverError}</Text>
            </View>
          )}

          <CustomInput
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
            icon="mail-outline"
          />

          <CustomInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
            error={errors.password}
            icon="lock-closed-outline"
          />

          <CustomButton title="Log In" onPress={handleLogin} loading={loading} style={styles.button} />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={[styles.registerTextBold, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerTextBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
