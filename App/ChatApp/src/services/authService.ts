/**
 * services/authService.ts
 * Authentication & session API client methods.
 */

import { apiRequest } from './api';
import { AuthSession, User } from '../types';

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<AuthSession> => {
  return apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: { name: name.trim(), email: email.trim().toLowerCase(), password },
  });
};

export const loginUser = async (email: string, password: string): Promise<AuthSession> => {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
};

export const logoutUser = async (token: string): Promise<void> => {
  return apiRequest<void>('/auth/logout', { method: 'POST', token });
};

export const getMyProfile = async (token: string): Promise<User & { messageCount: number }> => {
  return apiRequest<User & { messageCount: number }>('/auth/me', { method: 'GET', token });
};

export const updateProfile = async (token: string, name?: string, avatar?: string | null): Promise<User> => {
  return apiRequest<User>('/auth/profile', { method: 'PUT', token, body: { name, avatar } });
};

export const changePassword = async (
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  return apiRequest<void>('/auth/password', {
    method: 'PUT',
    token,
    body: { currentPassword, newPassword },
  });
};
