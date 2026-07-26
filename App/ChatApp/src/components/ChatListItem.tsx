import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';
import { Chat } from '../types';

interface ChatListItemProps {
  chat: Chat;
  onPress: () => void;
  onLongPress?: () => void;
}

const formatTime = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export default function ChatListItem({ chat, onPress, onLongPress }: ChatListItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
    >
      <Avatar name={chat.otherUserName} size={52} isOnline={chat.isOnline} avatar={chat.otherUserAvatar} />
      <View style={styles.textContainer}>
        <View style={styles.topLine}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {chat.otherUserName}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime(chat.lastMessageAt)}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {chat.lastMessage || 'Say hello 👋'}
          </Text>
          {!!chat.unreadCount && chat.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.textOnPrimary }]}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
