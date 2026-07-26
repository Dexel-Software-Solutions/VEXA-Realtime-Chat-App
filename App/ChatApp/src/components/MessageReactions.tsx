/**
 * components/MessageReactions.tsx
 * Interactive Emoji Reaction Bar for Chat Messages.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  reactions?: string | null;
  currentUserId?: number;
  onReact: (emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢'];

export default function MessageReactions({ reactions, currentUserId, onReact }: Props) {
  let parsedReactions: Record<string, string> = {};
  try {
    if (reactions) parsedReactions = JSON.parse(reactions);
  } catch (e) {
    parsedReactions = {};
  }

  // Count reaction occurrences: e.g. { "👍": 2, "❤️": 1 }
  const counts: Record<string, number> = {};
  let userSelectedEmoji = '';

  Object.entries(parsedReactions).forEach(([uid, emoji]) => {
    counts[emoji] = (counts[emoji] || 0) + 1;
    if (Number(uid) === currentUserId) {
      userSelectedEmoji = emoji;
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        {EMOJIS.map((emoji) => {
          const isSelected = userSelectedEmoji === emoji;
          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => onReact(emoji)}
              style={[styles.emojiButton, isSelected && styles.selectedEmojiButton]}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Render active reaction pill badges */}
      {Object.keys(counts).length > 0 && (
        <View style={styles.badgeRow}>
          {Object.entries(counts).map(([emoji, count]) => (
            <View key={emoji} style={styles.badge}>
              <Text style={styles.badgeEmoji}>{emoji}</Text>
              {count > 1 && <Text style={styles.badgeCount}>{count}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  pickerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedEmojiButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  emojiText: { fontSize: 16 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeEmoji: { fontSize: 12 },
  badgeCount: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginLeft: 4 },
});
