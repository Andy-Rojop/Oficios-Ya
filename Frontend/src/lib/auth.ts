'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './api-client';

export type ActiveMode = 'CLIENT' | 'WORKER';
export type UserRole = 'USER' | 'ADMIN' | 'MUNICIPAL';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

/** Igual a UserResponseDto del backend (las fechas llegan como ISO string). */
export interface UserDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  activeMode: ActiveMode;
  status: AccountStatus;
  zoneId: string | null;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export interface RegisterInput {
  firebaseIdToken: string;
  name: string;
  password: string;
  zoneId: string;
  email?: string;
  acceptTerms: true;
  startAsWorker?: boolean;
}

export interface ResetPasswordInput {
  firebaseIdToken: string;
  newPassword: string;
}

export interface ChangePhoneInput {
  firebaseIdToken: string;
  currentPassword: string;
}

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function fetchMe(): Promise<UserDto> {
  return apiFetch<UserDto>('/auth/me');
}

export function login(input: LoginInput): Promise<UserDto> {
  return apiFetch<UserDto>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function register(input: RegisterInput): Promise<UserDto> {
  return apiFetch<UserDto>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
}

export function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function changePhone(input: ChangePhoneInput): Promise<UserDto> {
  return apiFetch<UserDto>('/auth/phone/change', { method: 'POST', body: JSON.stringify(input) });
}

export function switchMode(mode: ActiveMode): Promise<UserDto> {
  // El DTO del backend usa la clave `mode`.
  return apiFetch<UserDto>('/users/me/mode', { method: 'PATCH', body: JSON.stringify({ mode }) });
}

export function updateEmail(email: string | null): Promise<UserDto> {
  return apiFetch<UserDto>('/users/me/email', { method: 'PATCH', body: JSON.stringify({ email }) });
}

/** Usuario autenticado; `data` es undefined (error 401) si no hay sesión. */
export function useMe() {
  return useQuery<UserDto, Error>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });
}

/** Guarda el usuario devuelto por login/register/etc. en la caché de TanStack Query. */
export function useSetMe() {
  const queryClient = useQueryClient();
  return (user: UserDto) => queryClient.setQueryData(ME_QUERY_KEY, user);
}

/** Cierra sesión en el backend. Quien lo use debe vaciar la caché de TanStack Query. */
export function useLogout() {
  return useMutation({ mutationFn: logout });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

/** Mensaje legible en español para mostrar en formularios. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

/** Solo permite redirigir a rutas internas (evita open redirect). */
export function safeNextPath(next: string | null | undefined, fallback = '/panel'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
