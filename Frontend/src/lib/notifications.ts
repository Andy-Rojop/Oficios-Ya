import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
}

export const NOTIFICATION_QUERY_KEY = ['notifications'] as const;

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiFetch<NotificationsPage>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markRead: (id: string) =>
    apiFetch<NotificationDto>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiFetch<{ updated: number }>('/notifications/read-all', { method: 'PATCH' }),
};

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEY,
    queryFn: () => notificationsApi.list(),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY }),
  });
}
