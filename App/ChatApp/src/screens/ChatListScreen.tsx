/**
 * @file ChatListScreen.tsx
 * @description Real-time Chat List screen showing active conversations, search filter,
 * add contact by email modal, and live socket status updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ChatListItem from '../components/ChatListItem';
import Avatar from '../components/Avatar';
import SearchBar from '../components/SearchBar';
import Colors from '../constants/Colors';
import { RootStackParamList, Chat } from '../types';
import { getMyChats, deleteChat, startChatByEmail } from '../services/chatService';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { colors, isDark } = useTheme();
  const { socket } = useSocket();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchChats = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      try {
        if (isRefresh) setRefreshing(true);
        setError('');
        const data = await getMyChats(token);
        setChats(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load chats.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  useEffect(() => {
    if (!socket) return;

    const handleChatUpdated = ({ chatId, lastMessage, lastMessageAt, senderId }: any) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            const isMe = senderId === user?.id;
            const currentUnread = c.unreadCount || 0;
            return {
              ...c,
              lastMessage,
              lastMessageAt,
              unreadCount: isMe ? currentUnread : currentUnread + 1,
            };
          }
          return c;
        })
      );
    };

    const handlePresence = ({ userId, isOnline, lastSeen }: any) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.otherUserId === userId) {
            return { ...c, isOnline, lastSeen };
          }
          return c;
        })
      );
    };

    socket.on('chat_updated', handleChatUpdated);
    socket.on('user_presence', handlePresence);

    return () => {
      socket.off('chat_updated', handleChatUpdated);
      socket.off('user_presence', handlePresence);
    };
  }, [socket, user]);

  const handleDeleteChat = (chat: Chat) => {
    Alert.alert('Delete Chat', `Are you sure you want to delete chat with ${chat.otherUserName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          try {
            await deleteChat(token, chat.id);
            setChats((prev) => prev.filter((c) => c.id !== chat.id));
          } catch (err) {
            Alert.alert('Error', 'Could not delete chat.');
          }
        },
      },
    ]);
  };

  const handleAddContactSubmit = async () => {
    if (!contactEmail.trim() || !token) return;
    setAddingContact(true);
    try {
      const newChat = await startChatByEmail(token, contactEmail.trim());
      setShowAddContact(false);
      setContactEmail('');
      navigation.navigate('Chat', {
        chatId: newChat.id,
        chatName: newChat.otherUserName,
        otherUserId: newChat.otherUserId,
        otherUserAvatar: newChat.otherUserAvatar,
        isOnline: newChat.isOnline || false,
        lastSeen: newChat.lastSeen || null,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add contact.');
    } finally {
      setAddingContact(false);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.otherUserEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <Avatar name={user?.name || 'User'} avatar={user?.avatar} size={42} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowAddContact(true)} style={styles.actionIconButton}>
            <Ionicons name="person-add-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.actionIconButton}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('Profile');
              }}
            >
              <Ionicons name="person-outline" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('NewChat');
              }}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>New Conversation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Contact Modal */}
      <Modal visible={showAddContact} transparent animationType="slide" onRequestClose={() => setShowAddContact(false)}>
        <View style={styles.centerModalOverlay}>
          <View style={[styles.addContactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Contact</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              Enter the user's email address to start chatting.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              placeholder="e.g. user@example.com"
              placeholderTextColor={colors.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
              value={contactEmail}
              onChangeText={setContactEmail}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAddContact(false)}>
                <Text style={{ color: colors.subtext, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, { backgroundColor: colors.primary }]}
                onPress={handleAddContactSubmit}
                disabled={addingContact}
              >
                {addingContact ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Start Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Search Bar */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery('')} />

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => `chat-${item.id}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchChats(true)} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={() =>
                navigation.navigate('Chat', {
                  chatId: item.id,
                  chatName: item.otherUserName,
                  otherUserId: item.otherUserId,
                  otherUserAvatar: item.otherUserAvatar,
                  isOnline: item.isOnline,
                  lastSeen: item.lastSeen,
                })
              }
              onLongPress={() => handleDeleteChat(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.subtext} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
                Tap the plus button to start a new chat!
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button - Lifted significantly higher up (bottom: 80) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  profileButton: { marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionIconButton: { padding: 8, marginLeft: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  fab: {
    position: 'absolute',
    bottom: 80, // Lifted significantly higher up to bottom: 80
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuContainer: { marginTop: 65, marginRight: 16, borderRadius: 12, borderWidth: 1, elevation: 5, paddingVertical: 6, minWidth: 180 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { marginLeft: 12, fontSize: 14, fontWeight: '600' },
  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  addContactCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  modalInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 20 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  modalCancelButton: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  modalSubmitButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
});
