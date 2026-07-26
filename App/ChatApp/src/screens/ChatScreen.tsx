/**
 * @file ChatScreen.tsx
 * @description Enterprise real-time conversation screen with WebSockets, media uploading,
 * AI Smart Quick Replies, Live Emoji Reactions, message pagination, and dark/light themes.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import MessageBubble from '../components/MessageBubble';
import Avatar from '../components/Avatar';
import DateSeparator from '../components/DateSeparator';
import TypingIndicator from '../components/TypingIndicator';
import { RootStackParamList, Message } from '../types';
import {
  clearChatHistory,
  deleteMessagesBatch,
  uploadMediaFile,
} from '../services/chatService';
import { API_BASE_URL } from '../constants/Config';
import { validateMessage } from '../utils/validation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import { useChatMessages } from '../hooks/useChatMessages';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
type ListItem = { type: 'message'; message: Message } | { type: 'date'; date: string };

const formatLastSeen = (lastSeenStr: string | null | undefined): string => {
  if (!lastSeenStr) return 'offline';
  const date = new Date(lastSeenStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'online';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export default function ChatScreen({ route, navigation }: Props) {
  const { chatId, chatName, otherUserId, otherUserAvatar, isOnline: initialOnline, lastSeen: initialLastSeen } = route.params;
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const { socket } = useSocket();

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    isOtherTyping,
    fetchOlderMessages,
    sendNewMessage,
    setMessages,
  } = useChatMessages(token, chatId, socket);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(initialOnline || false);
  const [lastSeen, setLastSeen] = useState(initialLastSeen || null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const lastTypingTimeRef = useRef<number>(0);

  useEffect(() => {
    if (messages.length === 0 || !token) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.senderId !== user?.id && lastMsg.message) {
      fetch(`${API_BASE_URL}/ai/smart-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lastMessage: lastMsg.message }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setAiSuggestions(json.data);
          }
        })
        .catch(() => {});
    } else {
      setAiSuggestions([]);
    }
  }, [messages, token, user?.id]);

  useEffect(() => {
    if (!socket) return;
    const handlePresence = ({ userId: uid, isOnline: online, lastSeen: ls }: any) => {
      if (uid === otherUserId) {
        setIsOnline(online);
        if (ls) setLastSeen(ls);
      }
    };
    socket.on('user_presence', handlePresence);
    return () => {
      socket.off('user_presence', handlePresence);
    };
  }, [socket, otherUserId]);

  const handlePickImage = async () => {
    if (!token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library access is required to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSending(true);
      try {
        const uploadedUrl = await uploadMediaFile(token, result.assets[0].uri);
        await sendNewMessage(null, uploadedUrl);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to send image.');
      } finally {
        setSending(false);
      }
    }
  };

  const handleReact = async (messageId: number, emoji: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      // Reaction error
    }
  };

  const handleTypingChange = (text: string) => {
    setDraft(text);
    if (!socket) return;

    const now = Date.now();
    if (now - lastTypingTimeRef.current > 2000) {
      lastTypingTimeRef.current = now;
      socket.emit('typing_start', { chatId });
      setTimeout(() => {
        socket.emit('typing_stop', { chatId });
      }, 3000);
    }
  };

  const handleSend = async (customText?: string | any) => {
    const textToSend = typeof customText === 'string' ? customText : draft;
    const errorMsg = validateMessage(textToSend);
    if (errorMsg && textToSend.trim().length > 0) {
      Alert.alert('Invalid Message', errorMsg);
      return;
    }
    if (!textToSend.trim()) return;

    setDraft('');
    setAiSuggestions([]);
    setSending(true);

    if (socket) {
      socket.emit('typing_stop', { chatId });
    }

    try {
      await sendNewMessage(textToSend, null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const listItems: ListItem[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      listItems.push({ type: 'date', date: msgDate });
    }
    listItems.push({ type: 'message', message: msg });
  });

  const toggleSelectMessage = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleLongPress = (msg: Message) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([msg.id]);
    }
  };

  const handleBatchDelete = async () => {
    if (!token || selectedIds.length === 0) return;
    Alert.alert('Delete Messages', `Delete ${selectedIds.length} selected message(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessagesBatch(token, selectedIds);
            setMessages((prev) => prev.map((m) => (selectedIds.includes(m.id) ? { ...m, isDeleted: true, message: null, image: null, audio: null, reactions: null } : m)));
            setIsSelectionMode(false);
            setSelectedIds([]);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete messages.');
          }
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    if (!token) return;
    setShowMenu(false);
    Alert.alert('Clear History', 'Are you sure you want to clear all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearChatHistory(token, chatId);
            setMessages([]);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to clear chat.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {isSelectionMode ? (
          <View style={styles.headerSelectionRow}>
            <TouchableOpacity
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedIds([]);
              }}
              style={styles.headerIconButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerSelectionTitle, { color: colors.text }]}>{selectedIds.length} selected</Text>
            <TouchableOpacity onPress={handleBatchDelete} style={styles.headerIconButton}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerMainRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerUserInfo}>
              <Avatar name={chatName} avatar={otherUserAvatar} size={40} isOnline={isOnline} />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                  {chatName}
                </Text>
                <Text style={[styles.headerStatus, { color: isOnline ? colors.primary : colors.subtext }]}>
                  {isOnline ? 'Online' : formatLastSeen(lastSeen)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.headerIconButton}>
              <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleClearHistory}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message List */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item, index) => (item.type === 'date' ? `date-${item.date}` : `msg-${item.message.id}`)}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity onPress={fetchOlderMessages} style={styles.loadOlderButton} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.loadOlderText, { color: colors.primary }]}>Load Older Messages</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return <DateSeparator date={item.date} />;
              }
              const isMine = item.message.senderId === user?.id;
              const isSelected = selectedIds.includes(item.message.id);

              return (
                <MessageBubble
                  message={item.message}
                  isMine={isMine}
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode}
                  onPress={() => isSelectionMode && toggleSelectMessage(item.message.id)}
                  onLongPress={() => handleLongPress(item.message)}
                  onReact={(emoji) => handleReact(item.message.id, emoji)}
                />
              );
            }}
          />
        )}

        {isOtherTyping && <TypingIndicator name={chatName} />}

        {/* AI Smart Quick Reply Bar */}
        {aiSuggestions.length > 0 && !draft.trim() && (
          <View style={styles.aiQuickReplyRow}>
            <View style={styles.aiHeaderTag}>
              <Ionicons name="sparkles" size={12} color="#3B82F6" />
              <Text style={styles.aiTagText}>AI Suggestions</Text>
            </View>
            <FlatList
              horizontal
              data={aiSuggestions}
              keyExtractor={(item, index) => `ai-sug-${index}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.aiChip} onPress={() => handleSend(item)}>
                  <Text style={styles.aiChipText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input Bar - Lifted significantly higher up (paddingBottom: 32) */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handlePickImage} style={styles.attachButton} disabled={sending}>
            <Ionicons name="image-outline" size={24} color={colors.subtext} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.subtext}
            value={draft}
            onChangeText={handleTypingChange}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={(!draft.trim() && !sending) || sending}
            style={[
              styles.sendButton,
              { backgroundColor: draft.trim() ? colors.primary : colors.border },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTextContainer: { marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 12, marginTop: 2 },
  headerSelectionTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginLeft: 12 },
  headerIconButton: { padding: 8 },
  keyboardContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadOlderButton: { padding: 12, alignItems: 'center' },
  loadOlderText: { fontSize: 13, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32, // Lifted significantly higher up (32px / 40px)
    marginBottom: 8,
    borderTopWidth: 1,
  },
  attachButton: { padding: 8 },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiQuickReplyRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  aiHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  aiChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  aiChipText: { fontSize: 12, color: '#60A5FA', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuContainer: { marginTop: 60, marginRight: 16, borderRadius: 12, borderWidth: 1, elevation: 5, paddingVertical: 6, minWidth: 160 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { marginLeft: 10, fontSize: 14, fontWeight: '600' },
});
