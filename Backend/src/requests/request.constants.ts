export const REQUEST_DESCRIPTION_MIN_LENGTH = 10;
export const REQUEST_DESCRIPTION_MAX_LENGTH = 1000;
export const QUOTE_SCOPE_MIN_LENGTH = 5;
export const QUOTE_SCOPE_MAX_LENGTH = 1000;
/** Decimal(10,2): hasta 99,999,999.99 */
export const QUOTE_AMOUNT_MAX = 99_999_999.99;
export const REQUESTS_LIST_MAX = 100;
/** Se tolera una fecha deseada de "hoy" aunque ya haya pasado la hora (zona horaria). */
export const DESIRED_DATE_GRACE_MS = 24 * 60 * 60 * 1000;
