import { api, ApiError } from './api-client';
import type { AuthMeResponse, UserResponse, LoginInput } from '@marketlum/shared';

export async function login(input: LoginInput): Promise<UserResponse> {
  return api.post<UserResponse>('/auth/login', input);
}

export async function logout(): Promise<void> {
  return api.post('/auth/logout');
}

export async function getMe(): Promise<AuthMeResponse | null> {
  try {
    return await api.get<AuthMeResponse>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
