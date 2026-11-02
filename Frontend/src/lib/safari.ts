/**
 * Detección ligera de WebKit “problemático” para OficiosYa:
 * Safari en Mac + cualquier navegador en iPhone/iPad (todos usan WebKit).
 */
export function isSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iP(hone|od|ad)/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const macSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|CriOS|FxiOS|OPiOS/i.test(ua);
  return iOS || macSafari;
}
