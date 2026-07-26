/**
 * services/chatService.ts
 * Enterprise API client methods for chat operations, messaging, and media uploading.
 */

import { apiRequest } from './api';
import { Chat, Message, User } from '../types';
import { API_BASE_URL } from '../constants/Config';

export const getMyChats = async (token: string): Promise<Chat[]> => {
  return apiRequest<Chat[]>('/chats', { method: 'GET', token });
};

export const getAllUsers = async (token: string): Promise<User[]> => {
  return apiRequest<User[]>('/chats/users', { method: 'GET', token });
};

export const startOrGetChat = async (token: string, otherUserId: number): Promise<Chat> => {
  return apiRequest<Chat>('/chats/start', {
    method: 'POST',
    token,
    body: { otherUserId },
  });
};

export const startChatByEmail = async (token: string, email: string): Promise<Chat> => {
  return apiRequest<Chat>('/chats/start-by-email', {
    method: 'POST',
    token,
    body: { email },
  });
};

export interface GetMessagesResponse {
  data: Message[];
  hasMore: boolean;
}

export const getMessages = async (
  token: string,
  chatId: number,
  limit = 30,
  beforeId?: number | null
): Promise<Message[]> => {
  let url = `/messages/${chatId}?limit=${limit}`;
  if (beforeId) {
    url += `&beforeId=${beforeId}`;
  }
  return apiRequest<Message[]>(url, { method: 'GET', token });
};

export const sendMessage = async (
  token: string,
  chatId: number,
  message: string | null,
  image?: string | null
): Promise<Message> => {
  return apiRequest<Message>(`/messages/${chatId}`, {
    method: 'POST',
    token,
    body: { message: message ? message.trim() : null, image },
  });
};

export const uploadMediaFile = async (token: string, fileUri: string): Promise<string> => {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/messages/upload-media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Media upload failed');
  }

  return json.data.url;
};

export const deleteChat = async (token: string, chatId: number): Promise<void> => {
  return apiRequest<void>(`/chats/${chatId}`, { method: 'DELETE', token });
};

export const setTyping = async (token: string, chatId: number): Promise<void> => {
  return apiRequest<void>(`/chats/${chatId}/typing`, { method: 'POST', token });
};

export const getTypingStatus = async (token: string, chatId: number): Promise<{ isTyping: boolean }> => {
  return apiRequest<{ isTyping: boolean }>(`/chats/${chatId}/typing`, { method: 'GET', token });
};

export const markMessagesAsRead = async (token: string, chatId: number): Promise<void> => {
  return apiRequest<void>(`/messages/${chatId}/read`, { method: 'PUT', token });
};

export const deleteMessage = async (token: string, messageId: number): Promise<void> => {
  return apiRequest<void>(`/messages/delete/${messageId}`, { method: 'DELETE', token });
};

export const clearChatHistory = async (token: string, chatId: number): Promise<void> => {
  return apiRequest<void>(`/messages/clear/${chatId}`, { method: 'DELETE', token });
};

export const deleteMessagesBatch = async (token: string, messageIds: number[]): Promise<void> => {
  return apiRequest<void>(`/messages/delete-batch`, {
    method: 'POST',
    token,
    body: { messageIds },
  });
};
