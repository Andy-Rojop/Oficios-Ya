/**
 * Stub de firebase-admin (app/auth) solo para pruebas unitarias: el paquete real arrastra
 * dependencias ESM (jose) que Jest no puede cargar por require() en Node < 24.9.
 * OtpService se sustituye por un fake en los tests, así que nunca se llama a estas funciones.
 */
export type App = { name: string };

export const cert = (): never => {
  throw new Error('firebase-admin stub: no disponible en tests unitarios');
};
export const getApps = (): App[] => [];
export const initializeApp = (): never => {
  throw new Error('firebase-admin stub: no disponible en tests unitarios');
};
export const getAuth = (): never => {
  throw new Error('firebase-admin stub: no disponible en tests unitarios');
};
