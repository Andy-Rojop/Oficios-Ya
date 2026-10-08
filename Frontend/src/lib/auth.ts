'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from './api-client';
import { connectChatSocket, disconnectChatSocket } from './socket';

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

/**
 * Actualiza `me` e invalida datos que dependen del modo/sesión
 * (solicitudes, chat, panel trabajador, avisos) y reinicia el socket.
 */
export async function applyAuthenticatedUser(
  queryClient: QueryClient,
  user: UserDto,
  options?: { reconnectSocket?: boolean },
): Promise<void> {
  queryClient.setQueryData(ME_QUERY_KEY, user);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['requests'] }),
    queryClient.invalidateQueries({ queryKey: ['chat'] }),
    queryClient.invalidateQueries({ queryKey: ['workers'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ]);
  if (options?.reconnectSocket !== false) {
    disconnectChatSocket();
    connectChatSocket();
  }
}

/**
 * Cambia CLIENT ↔ WORKER, refresca cachés y (por defecto) navega al home del modo.
 */
export function useSwitchMode(options?: { navigate?: boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const shouldNavigate = options?.navigate !== false;

  return useMutation({
    mutationFn: switchMode,
    onSuccess: async (updated) => {
      await applyAuthenticatedUser(queryClient, updated);
      if (shouldNavigate) {
        router.replace(homePathForMode(updated.activeMode));
      }
    },
  });
}

/** Cierra sesión, limpia caché y vuelve a la home pública (`/`). */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      disconnectChatSocket();
      queryClient.setQueryData(ME_QUERY_KEY, undefined);
      await queryClient.clear();
      // Hard reload a invitado aunque falle la API (la cookie puede quedar; el clear del backend ayuda).
      window.location.replace('/');
    },
  });
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

/** Home del módulo según el modo activo. */
export function homePathForMode(mode: ActiveMode): string {
  return mode === 'WORKER' ? '/panel' : '/';
}

/**
 * Destino tras login/registro.
 * Respeta `next` solo si encaja con el modo; si no, manda al módulo correcto
 * (cliente → `/`, trabajador → `/panel`).
 */
export function resolvePostAuthPath(options: {
  activeMode: ActiveMode;
  requestedMode?: ActiveMode | null;
  next?: string | null;
}): string {
  const mode = options.requestedMode ?? options.activeMode;
  const home = homePathForMode(mode);
  const next = options.next ? safeNextPath(options.next, home) : home;

  if (mode === 'WORKER') {
    if (next === '/' || next.startsWith('/buscar') || next.startsWith('/registro')) {
      return home;
    }
    return next;
  }

  // Cliente: nunca al panel de trabajador
  if (next === '/panel' || next.startsWith('/panel/')) {
    return home;
  }
  return next;
}
