'use client';

import {
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isChatThreadPath, linksForMode, type NavLink } from '@/components/layout/nav-links';
import { useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

const ICONS: Record<NavLink['icon'], LucideIcon> = {
  home: Search,
  search: Search,
  messages: MessageSquare,
  requests: ClipboardList,
  account: UserRound,
  panel: LayoutDashboard,
};

/**
 * Barra inferior fija para pulgar (solo con sesión, solo en viewport móvil).
 * En hilo de chat se oculta para dejar espacio al teclado.
 */
export function SiteBottomNav() {
  const pathname = usePathname();
  const { data: user } = useMe();

  if (!user || isChatThreadPath(pathname)) return null;

  const workerChrome = user.activeMode === 'WORKER';
  const links = linksForMode(user.activeMode);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
        workerChrome
          ? 'border-[#1e3a5f]/40 bg-[#1e3a5f] text-white'
          : 'border-border bg-surface text-foreground',
      )}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {links.map((link) => {
          const Icon = workerChrome && link.icon === 'panel' ? Briefcase : ICONS[link.icon];
          const active =
            pathname === link.href ||
            (link.href !== '/' && pathname.startsWith(`${link.href}/`));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-semibold tracking-wide transition',
                  workerChrome
                    ? active
                      ? 'text-white'
                      : 'text-white/55'
                    : active
                      ? 'text-accent'
                      : 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    active && (workerChrome ? 'bg-white/15' : 'bg-accent-soft'),
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate">{link.shortLabel ?? link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
