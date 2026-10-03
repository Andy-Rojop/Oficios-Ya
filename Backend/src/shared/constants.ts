/** Límites de negocio compartidos (SRS / RN). Mantener alineado con Frontend/src/lib/shared. */
export const LIMITS = {
  REVIEW_COMMENT_MAX: 500,
  UPLOAD_MAX_MB_DEFAULT: 5,
  IMAGE_MAX_DIMENSION_PX: 1600,
  LOGIN_MAX_FAILED_ATTEMPTS: 5,
  OTP_PER_PHONE_PER_HOUR: 5,
  JWT_ACCESS_TTL_DEFAULT: '15m',
  JWT_REFRESH_TTL_DEFAULT: '7d',
  BCRYPT_COST: 12,
  CHAT_MESSAGE_DELIVERY_TARGET_MS: 3000,
} as const;

export const GUATEMALA_PHONE_COUNTRY = 'GT' as const;
export const GUATEMALA_PHONE_PREFIX = '+502' as const;
