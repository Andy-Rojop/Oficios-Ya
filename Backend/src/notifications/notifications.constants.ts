/** Tipos de notificación (campo libre `Notification.type`; el frontend los usa para el ícono/etiqueta). */
export const NotificationType = {
  REQUEST_NEW: 'REQUEST_NEW',
  REQUEST_STATUS: 'REQUEST_STATUS',
  REVIEW_NEW: 'REVIEW_NEW',
  REVIEW_REPLY: 'REVIEW_REPLY',
  IDENTITY_DECISION: 'IDENTITY_DECISION',
  REPORT_UPDATE: 'REPORT_UPDATE',
} as const;

/** Evento Socket.IO (namespace `/chat`, sala `user:{id}`) que avisa de una notificación nueva. */
export const NOTIFICATION_NEW_EVENT = 'notification:new';

export const NOTIFICATIONS_DEFAULT_LIMIT = 20;
export const NOTIFICATIONS_MAX_LIMIT = 50;
