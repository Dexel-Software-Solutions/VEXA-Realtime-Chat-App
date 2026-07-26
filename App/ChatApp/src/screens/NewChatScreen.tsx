/**
 * @file NewChatScreen.tsx
 * @description Screen displaying added contacts (added by email) to initiate conversations.
 * @author Demiyan Dissanayake
 * @copyright VEXA Chat App 2026. All rights reserved.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import Avatar from '../components/Avatar';
import SearchBar from '../components/SearchBar';
import Colors from '../constants/Colors';
import { RootStackParamList, User } from '../types';
import { getAllUsers, startOrGetChat } from '../services/chatService';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'NewChat'>;

export default function NewChatScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const data = await getAllUsers(token);
        setUsers(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load contacts.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSelectUser = async (otherUser: User) => {
    if (!token) return;
    setStartingId(otherUser.id);
    try {
      const chat = await startOrGetChat(token, otherUser.id);
      navigation.replace('Chat', {
        chatId: chat.id,
        chatName: otherUser.name,
        otherUserId: otherUser.id,
        otherUserAvatar: otherUser.avatar,
        email: otherUser.email,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start chat.');
    } finally {
      setStartingId(null);
    }
  };

  const filteredUsers = searchQuery.trim()
    ? users.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query)
        );
      })
    : users;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Contacts</Text>
        <View style={{ width: 24 }} />
      </View>

      {!loading && !error && users.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search added contacts..."
        />
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="person-add-outline" size={54} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No added contacts yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Tap the "+ Add Contact" button on the Home screen to add someone by email!
          </Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching contacts found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userRow, { backgroundColor: colors.surface }]}
              onPress={() => handleSelectUser(item)}
              disabled={startingId !== null}
            >
              <Avatar name={item.name} size={46} avatar={item.avatar} isOnline={item.isOnline} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{item.email}</Text>
              </View>
              {startingId === item.id && <ActivityIndicator color={colors.primary} />}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        />
      )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    color: Colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 74,
  },
});
