import { api } from './api';

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

export async function getSession(): Promise<AdminSession | null> {
  try {
    return await api.get<AdminSession>('/auth/me');
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  return api.post<AdminSession>('/auth/login', { email, password });
}

export async function logout() {
  return api.post('/auth/logout');
}
