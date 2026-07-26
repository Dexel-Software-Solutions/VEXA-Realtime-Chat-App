import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function CustomInput({
  label,
  error,
  isPassword = false,
  icon,
  ...textInputProps
}: CustomInputProps) {
  const { colors } = useTheme();
  const [secure, setSecure] = useState(isPassword);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.surface, borderColor: colors.border },
          error ? { borderColor: colors.error } : null,
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure}
          autoCapitalize="none"
          {...textInputProps}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setSecure(!secure)} hitSlop={8}>
            <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
