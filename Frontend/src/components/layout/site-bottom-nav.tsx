'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Search,
  Shield,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isChatThreadPath, linksForUser, type NavLink } from '@/components/layout/nav-links';
import { isStaffRole, useMe } from '@/lib/auth';
import {
  CHAT_QUERY_KEYS,
  chatApi,
  upsertConversation,
  type ConversationSummary,
} from '@/lib/chat';
import { CHAT_EVENTS } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useChatEvent } from '@/components/chat/use-chat-socket';

const ICONS: Record<NavLink['icon'], LucideIcon> = {
  home: Search,
  search: Search,
  messages: MessageSquare,
  requests: ClipboardList,
  account: UserRound,
  panel: LayoutDashboard,
  admin: Shield,
};

/**
 * Barra inferior fija para pulgar (solo con sesión, solo en viewport móvil portrait).
 * En hilo de chat / landscape / admin se oculta.
 */
export function SiteBottomNav() {
  const pathname = usePathname();
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const staff = isStaffRole(user?.role);

  const conversations = useQuery({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: chatApi.listConversations,
    enabled: Boolean(user) && !staff,
    staleTime: 30_000,
  });

  useChatEvent<ConversationSummary>(CHAT_EVENTS.CONVERSATION_UPDATED, (summary) => {
    if (staff) return;
    queryClient.setQueryData<ConversationSummary[]>(CHAT_QUERY_KEYS.conversations, (current) =>
      upsertConversation(current, summary),
    );
  });

  // AppShell ya evita montarlo en login; doble guarda por si se usa solo.
  if (!user || isChatThreadPath(pathname)) return null;
  if (
    pathname.startsWith('/ingresar') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/roles') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  const previewWorker = staff && pathname.startsWith('/panel');
  const workerChrome = (!staff && user.activeMode === 'WORKER') || previewWorker;
  const links = linksForUser(user);
  const unreadMessages = staff
    ? 0
    : (conversations.data ?? []).reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        // Oculta en landscape y desktop: en horizontal tapaba Teléfono/Sesión (QA).
        'fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-2 landscape:hidden md:hidden',
        'pb-[max(1.75rem,env(safe-area-inset-bottom))]',
        workerChrome
          ? 'border-[#1e3a5f]/40 bg-[#1e3a5f] text-white'
          : 'border-border bg-surface text-foreground',
      )}
    >
      <ul
        className={cn(
          'mx-auto grid max-w-lg',
          staff ? 'grid-cols-3' : 'grid-cols-4',
        )}
      >
        {links.map((link) => {
          const Icon =
            workerChrome && link.icon === 'panel' ? Briefcase : ICONS[link.icon];
          const active =
            link.href === '/admin'
              ? pathname === '/admin' || pathname.startsWith('/admin/')
              : pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(`${link.href}/`));
          const showBadge = !staff && link.icon === 'messages' && unreadMessages > 0;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  showBadge
                    ? `${link.label}, ${unreadMessages} sin leer`
                    : undefined
                }
                className={cn(
                  'flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold tracking-wide transition',
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
                    'relative flex h-8 w-8 items-center justify-center rounded-xl',
                    active && (workerChrome ? 'bg-white/15' : 'bg-accent-soft'),
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {showBadge ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  ) : null}
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
