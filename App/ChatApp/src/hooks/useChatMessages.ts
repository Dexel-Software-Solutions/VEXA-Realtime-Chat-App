/**
 * hooks/useChatMessages.ts
 * Custom hook managing chat state, pagination, reactions, and real-time socket events.
 */

import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { getMessages, sendMessage, markMessagesAsRead } from '../services/chatService';
import { Socket } from 'socket.io-client';

export function useChatMessages(token: string | null, chatId: number, socket: Socket | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const fetchInitialMessages = useCallback(async () => {
    if (!token || !chatId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getMessages(token, chatId, 30);
      setMessages(data);
      setHasMore(data.length === 30);
      markMessagesAsRead(token, chatId).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [token, chatId]);

  const fetchOlderMessages = useCallback(async () => {
    if (!token || !chatId || loadingMore || !hasMore || messages.length === 0) return;
    const oldestId = messages[0].id;
    setLoadingMore(true);
    try {
      const olderData = await getMessages(token, chatId, 30, oldestId);
      if (olderData.length < 30) {
        setHasMore(false);
      }
      setMessages((prev) => [...olderData, ...prev]);
    } catch (err) {
      console.warn('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [token, chatId, loadingMore, hasMore, messages]);

  useEffect(() => {
    fetchInitialMessages();

    if (!socket || !chatId) return;

    socket.emit('join_chat', { chatId });

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.chatId === chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (token) {
          markMessagesAsRead(token, chatId).catch(() => {});
        }
      }
    };

    const handleUserTyping = ({ chatId: tid, isTyping }: { chatId: number; isTyping: boolean }) => {
      if (tid === chatId) {
        setIsOtherTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ chatId: tid }: { chatId: number }) => {
      if (tid === chatId) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    const handleMessageReaction = ({ messageId, reactions }: { messageId: number; reactions: string | null }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: number }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, message: null, image: null, reactions: null } : m)));
    };

    const handleChatCleared = ({ chatId: tid }: { chatId: number }) => {
      if (tid === chatId) {
        setMessages([]);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('chat_cleared', handleChatCleared);

    return () => {
      socket.emit('leave_chat', { chatId });
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('chat_cleared', handleChatCleared);
    };
  }, [socket, chatId, token, fetchInitialMessages]);

  const sendNewMessage = async (text: string | null, imageUri?: string | null) => {
    if (!token || !chatId) return;
    try {
      const sentMsg = await sendMessage(token, chatId, text, imageUri);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
    } catch (err: any) {
      throw err;
    }
  };

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    isOtherTyping,
    fetchOlderMessages,
    sendNewMessage,
    refetch: fetchInitialMessages,
    setMessages,
  };
}
