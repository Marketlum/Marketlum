import { api, ApiError } from './api-client';
import type { UserResponse, LoginInput } from '@marketlum/shared';

export async function login(input: LoginInput): Promise<UserResponse> {
  return api.post<UserResponse>('/auth/login', input);
}

export async function logout(): Promise<void> {
  return api.post('/auth/logout');
}

export async function getMe(): Promise<UserResponse | null> {
  try {
    return await api.get<UserResponse>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
