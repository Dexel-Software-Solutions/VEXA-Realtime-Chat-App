/**
 * types/index.ts
 * Shared TypeScript interfaces used throughout the Chat Application.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Chat {
  id: number;
  otherUserId: number;
  otherUserName: string;
  otherUserEmail?: string | null;
  otherUserAvatar?: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderName?: string;
  message: string | null;
  image?: string | null;
  audio?: string | null;
  reactions?: string | null;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  isDeleted?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ChatList: undefined;
  Chat: {
    chatId: number;
    chatName: string;
    otherUserId: number;
    otherUserAvatar?: string | null;
    email?: string | null;
    isOnline?: boolean;
    lastSeen?: string | null;
  };
  Profile: undefined;
  NewChat: undefined;
};
