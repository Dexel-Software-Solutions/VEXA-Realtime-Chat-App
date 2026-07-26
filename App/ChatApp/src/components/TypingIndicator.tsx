import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface TypingIndicatorProps {
  name?: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -4,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 150);
    const anim3 = createBounce(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {name ? `${name} is typing` : 'typing'}
      </Text>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary, transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    marginRight: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
