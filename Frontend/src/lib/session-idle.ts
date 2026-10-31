/** Aviso tras 15 min sin actividad; cierre a los 18 min si no confirma. */
export const SESSION_IDLE_WARN_MS = 15 * 60 * 1000;
export const SESSION_IDLE_LOGOUT_MS = 18 * 60 * 1000;

/** Clave compartida entre pestañas (última actividad del usuario). */
export const SESSION_IDLE_STORAGE_KEY = 'oficiosya:last-activity';
