import type { ActiveMode } from '@/lib/auth';

export interface NavLink {
  href: string;
  label: string;
  shortLabel?: string;
  /** Clave de icono para la barra inferior. */
  icon: 'home' | 'search' | 'messages' | 'requests' | 'account' | 'panel';
}

export const GUEST_LINKS: NavLink[] = [
  { href: '/ingresar', label: 'Iniciar sesión', shortLabel: 'Entrar', icon: 'account' },
  { href: '/registro', label: 'Registrarse', icon: 'account' },
];

/** Enlaces de cliente: descubrir oficios y gestionar pedidos. */
export const CLIENT_LINKS: NavLink[] = [
  { href: '/buscar', label: 'Buscar', icon: 'search' },
  { href: '/mensajes', label: 'Mensajes', icon: 'messages' },
  { href: '/solicitudes', label: 'Mis solicitudes', shortLabel: 'Solicitudes', icon: 'requests' },
  { href: '/cuenta', label: 'Cuenta', icon: 'account' },
];

/** Modo Trabajador: panel y gestión. La búsqueda de oficios es del modo Cliente. */
export const WORKER_LINKS: NavLink[] = [
  { href: '/panel', label: 'Panel', icon: 'panel' },
  { href: '/mensajes', label: 'Mensajes', icon: 'messages' },
  { href: '/solicitudes', label: 'Mis solicitudes', shortLabel: 'Solicitudes', icon: 'requests' },
  { href: '/cuenta', label: 'Cuenta', icon: 'account' },
];

export function linksForMode(mode: ActiveMode | undefined): NavLink[] {
  return mode === 'WORKER' ? WORKER_LINKS : CLIENT_LINKS;
}

/** Conversación abierta: conviene ocultar la barra inferior para ganar altura. */
export function isChatThreadPath(pathname: string): boolean {
  return /^\/mensajes\/[^/]+/.test(pathname);
}
