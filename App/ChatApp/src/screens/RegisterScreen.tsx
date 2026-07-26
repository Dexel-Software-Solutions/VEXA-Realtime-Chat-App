/**
 * @file RegisterScreen.tsx
 * @description Authentication screen allowing new users to create accounts.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Colors from '../constants/Colors';
import { RootStackParamList } from '../types';
import { validateRegisterForm } from '../utils/validation';
import { registerUser } from '../services/authService';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setServerError('');
    const { isValid, errors: validationErrors } = validateRegisterForm(
      name,
      email,
      password,
      confirmPassword
    );
    setErrors(validationErrors);
    if (!isValid) return;

    setLoading(true);
    try {
      const session = await registerUser(name, email, password);
      await login(session.token, session.user);
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to start chatting with friends</Text>
          </View>

          {!!serverError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{serverError}</Text>
            </View>
          )}

          <CustomInput
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
            icon="person-outline"
          />

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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
            error={errors.password}
            icon="lock-closed-outline"
          />

          <CustomInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            error={errors.confirmPassword}
            icon="lock-closed-outline"
          />

          <CustomButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={[styles.loginTextBold, { color: colors.primary }]}>Log In</Text>
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
  },
  backButton: {
    marginBottom: 8,
  },
  logoContainer: {
    marginBottom: 24,
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
  loginLink: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginTextBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
