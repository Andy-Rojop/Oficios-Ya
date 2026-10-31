'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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
};

/**
 * Barra inferior fija para pulgar (solo con sesión, solo en viewport móvil portrait).
 * En hilo de chat / landscape se oculta.
 */
export function SiteBottomNav() {
  const pathname = usePathname();
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: chatApi.listConversations,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  useChatEvent<ConversationSummary>(CHAT_EVENTS.CONVERSATION_UPDATED, (summary) => {
    queryClient.setQueryData<ConversationSummary[]>(CHAT_QUERY_KEYS.conversations, (current) =>
      upsertConversation(current, summary),
    );
  });

  // No invalidar al (re)conectar aquí: InboxView ya hace un sync y este efecto
  // duplicado + socket inestable en Safari provocaba parpadeo “Cargando…”.

  // AppShell ya evita montarlo en login; doble guarda por si se usa solo.
  if (!user || isChatThreadPath(pathname)) return null;
  if (
    pathname.startsWith('/ingresar') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/roles')
  ) {
    return null;
  }

  const workerChrome = user.activeMode === 'WORKER';
  const links = linksForMode(user.activeMode);
  const unreadMessages = (conversations.data ?? []).reduce(
    (sum, item) => sum + (item.unreadCount ?? 0),
    0,
  );

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        // Oculta en landscape y desktop: en horizontal tapaba Teléfono/Sesión (QA).
        'fixed inset-x-0 bottom-0 z-40 border-t landscape:hidden md:hidden',
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
          const showBadge = link.icon === 'messages' && unreadMessages > 0;
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
