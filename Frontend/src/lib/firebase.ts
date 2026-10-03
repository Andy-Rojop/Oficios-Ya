import { FirebaseError, getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';

/**
 * Las variables NEXT_PUBLIC_* deben leerse con acceso literal para que Next.js
 * las incluya en el bundle del navegador.
 */
function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'La verificación por SMS no está configurada. Completa las variables NEXT_PUBLIC_FIREBASE_* en Frontend/.env.local.',
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  auth.languageCode = 'es';
  return auth;
}

const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';
let recaptchaVerifier: RecaptchaVerifier | null = null;

function clearRecaptcha(): void {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
  document.getElementById(RECAPTCHA_CONTAINER_ID)?.remove();
}

function createRecaptcha(auth: Auth): RecaptchaVerifier {
  clearRecaptcha();
  // reCAPTCHA necesita un contenedor propio y limpio en cada intento.
  const container = document.createElement('div');
  container.id = RECAPTCHA_CONTAINER_ID;
  document.body.appendChild(container);

  recaptchaVerifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
  return recaptchaVerifier;
}

/** Envía el SMS con el código. `phone` debe estar en E.164 (+502XXXXXXXX). */
export async function startPhoneOtp(phone: string): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const verifier = createRecaptcha(auth);

  try {
    return await signInWithPhoneNumber(auth, phone, verifier);
  } catch (error) {
    clearRecaptcha();
    throw error;
  }
}

/** Confirma el código SMS y devuelve el ID token de Firebase para enviarlo al backend. */
export async function confirmOtp(
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<string> {
  const credential = await confirmationResult.confirm(code.trim());
  return credential.user.getIdToken();
}

/** Cierra la sesión de Firebase: la sesión real de OficiosYa vive en las cookies del backend. */
export async function signOutFirebase(): Promise<void> {
  clearRecaptcha();
  if (!isFirebaseConfigured()) {
    return;
  }
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // no bloquea el flujo si Firebase ya estaba cerrado
  }
}

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'El número de teléfono no es válido.',
  'auth/missing-phone-number': 'Ingresa tu número de teléfono.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/quota-exceeded': 'Se alcanzó el límite de SMS por hoy. Inténtalo más tarde.',
  'auth/invalid-verification-code': 'El código es incorrecto. Revísalo e inténtalo de nuevo.',
  'auth/missing-verification-code': 'Ingresa el código que recibiste por SMS.',
  'auth/code-expired': 'El código venció. Solicita uno nuevo.',
  'auth/captcha-check-failed': 'No se pudo verificar que eres una persona. Recarga la página.',
  'auth/invalid-app-credential':
    'No se pudo verificar la aplicación. Recarga la página e inténtalo de nuevo.',
  'auth/operation-not-allowed': 'La verificación por teléfono no está habilitada para esta región.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
};

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    // En desarrollo mostramos el código de Firebase para diagnosticar (Phone Auth, billing, reCAPTCHA).
    const mapped = FIREBASE_ERROR_MESSAGES[error.code];
    if (mapped) return mapped;
    if (process.env.NODE_ENV !== 'production') {
      return `Error Firebase (${error.code}): ${error.message}`;
    }
    return 'No se pudo completar la verificación por SMS. Inténtalo de nuevo.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
