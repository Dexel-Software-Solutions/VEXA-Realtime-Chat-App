/**
 * @file ProfileScreen.tsx
 * @description Settings and profile customization screen including name updates, profile image picker, password forms, and theme selection.
 * @author Demiyan Dissanayake
 * @copyright VEXA Chat App 2026. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Avatar from '../components/Avatar';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Colors from '../constants/Colors';
import { RootStackParamList, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getMyProfile, updateProfile, changePassword } from '../services/authService';
import { ApiError } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, token, login, logout } = useAuth();
  const { colors, theme, setTheme, isDark } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  // Profile data from backend
  const [profile, setProfile] = useState<(User & { messageCount: number }) | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const handlePickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need media library permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

      setUpdatingAvatar(true);
      try {
        if (!token || !user) return;
        const updatedUser = await updateProfile(token, undefined, base64Image);
        await login(token, updatedUser);
        setProfile(prev => prev ? { ...prev, avatar: updatedUser.avatar } : null);
        Alert.alert('Success', 'Profile picture updated successfully.');
      } catch (err) {
        Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to update profile picture.');
      } finally {
        setUpdatingAvatar(false);
      }
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert('Remove Profile Picture', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUpdatingAvatar(true);
          try {
            if (!token || !user) return;
            const updatedUser = await updateProfile(token, undefined, null);
            await login(token, updatedUser);
            setProfile(prev => prev ? { ...prev, avatar: null } : null);
            Alert.alert('Success', 'Profile picture removed.');
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to remove profile picture.');
          } finally {
            setUpdatingAvatar(false);
          }
        },
      },
    ]);
  };

  const loadProfile = async () => {
    if (!token) return;
    try {
      setLoadingProfile(true);
      const data = await getMyProfile(token);
      setProfile(data);
      setEditedName(data.name);
    } catch (err) {
      console.warn('Failed to load profile details:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (!token || !user) return;
    if (!editedName.trim() || editedName.trim().length < 3) {
      Alert.alert('Validation Error', 'Name must be at least 3 characters.');
      return;
    }

    setSavingName(true);
    try {
      const updatedUser = await updateProfile(token, editedName.trim());
      // Update global AuthContext user
      await login(token, updatedUser);
      setProfile(prev => prev ? { ...prev, name: updatedUser.name } : null);
      setIsEditingName(false);
      Alert.alert('Success', 'Profile name updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <Avatar name={user?.name || '?'} size={96} isOnline={true} avatar={user?.avatar} />
            {updatingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.avatarActionsRow}>
            <TouchableOpacity style={[styles.avatarActionBtn, { backgroundColor: colors.primaryLight }]} onPress={handlePickImage} disabled={updatingAvatar}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.avatarActionBtnText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
            {!!user?.avatar && (
              <TouchableOpacity style={[styles.avatarActionBtn, styles.avatarActionBtnRemove]} onPress={handleRemoveImage} disabled={updatingAvatar}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.avatarActionBtnText, { color: colors.error }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                maxLength={50}
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.editActionButton} disabled={savingName}>
                {savingName ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="checkmark" size={22} color={colors.success} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsEditingName(false); setEditedName(user?.name || ''); }} style={styles.editActionButton}>
                <Ionicons name="close" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
              <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editButton}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>

          {/* User Details & Stats Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="finger-print-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>User ID</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>#{user?.id}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Member Since</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {loadingProfile ? 'Loading...' : formatJoinedDate(profile?.createdAt)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Messages Sent</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {loadingProfile ? 'Loading...' : profile?.messageCount ?? 0}
              </Text>
            </View>
          </View>

          {/* Theme Selection Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
            <View style={styles.themeHeaderRow}>
              <Ionicons name="color-palette-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { fontWeight: '700', color: colors.textPrimary, marginLeft: 10 }]}>App Theme</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.themeOptionsRow}>
              <TouchableOpacity
                style={[
                  styles.themeOptionBtn,
                  { backgroundColor: theme === 'light' ? colors.primaryLight : (isDark ? '#334155' : '#F1F5F9'), borderColor: theme === 'light' ? colors.primary : 'transparent' }
                ]}
                onPress={() => setTheme('light')}
              >
                <Ionicons name="sunny-outline" size={16} color={theme === 'light' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeOptionBtnText, { color: theme === 'light' ? colors.primary : colors.textSecondary }]}>Light Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOptionBtn,
                  { backgroundColor: theme === 'dark' ? colors.primaryLight : (isDark ? '#334155' : '#F1F5F9'), borderColor: theme === 'dark' ? colors.primary : 'transparent' }
                ]}
                onPress={() => setTheme('dark')}
              >
                <Ionicons name="moon-outline" size={16} color={theme === 'dark' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeOptionBtnText, { color: theme === 'dark' ? colors.primary : colors.textSecondary }]}>Dark Mode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Change Password Toggle */}
          <TouchableOpacity
            style={[styles.changePasswordHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Text style={[styles.changePasswordText, { color: colors.textPrimary }]}>Change Password</Text>
            <Ionicons
              name={showPasswordForm ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={[styles.passwordForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {!!passwordError && <Text style={[styles.passwordErrorText, { color: colors.error }]}>{passwordError}</Text>}
              <CustomInput
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                isPassword
                icon="lock-closed-outline"
              />
              <CustomInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                isPassword
                icon="lock-closed-outline"
              />
              <CustomInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                icon="lock-closed-outline"
              />
              <CustomButton
                title="Update Password"
                onPress={handleChangePassword}
                loading={changingPassword}
                style={styles.savePasswordButton}
              />
            </View>
          )}

          <CustomButton
            title="Log Out"
            variant="outline"
            onPress={handleLogout}
            loading={loggingOut}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    minWidth: 150,
    textAlign: 'center',
  },
  editActionButton: {
    marginLeft: 10,
    padding: 6,
  },
  email: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    marginLeft: 10,
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  changePasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  passwordForm: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordErrorText: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  savePasswordButton: {
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 32,
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  avatarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  avatarActionBtnRemove: {
    backgroundColor: '#FEE2E2',
  },
  avatarActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    gap: 12,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  themeOptionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
