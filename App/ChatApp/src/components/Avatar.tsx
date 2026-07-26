import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AvatarProps {
  name: string;
  size?: number;
  isOnline?: boolean;
  avatar?: string | null;
  imageUri?: string | null; // Alias for avatar
}

export default function Avatar({ name, size = 48, isOnline, avatar, imageUri }: AvatarProps) {
  const { colors } = useTheme();
  const dotSize = Math.max(size * 0.25, 10);
  const uri = avatar || imageUri;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <Image
          source={require('../../assets/Profile.png')}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
      )}

      {isOnline !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: isOnline ? colors.online : colors.offline,
              borderWidth: 2,
              borderColor: colors.surface,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    resizeMode: 'cover',
    backgroundColor: '#E2E8F0',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
