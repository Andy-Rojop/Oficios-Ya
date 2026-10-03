export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** El refresh token solo viaja a las rutas de auth. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Minutos de bloqueo tras LOGIN_MAX_FAILED_ATTEMPTS intentos fallidos. */
export const LOGIN_LOCK_MINUTES = 15;
