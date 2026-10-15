import { cn } from '@/lib/utils';

const AVATAR_COLORS = ['#1e3a5f', '#1f6b4a', '#6b3f2a', '#3d4f7c', '#0f5f6b', '#5c3d6e'];

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

/** Inicial en círculo, como la lista de chats. El color sale del nombre para que no se repita. */
export function ChatAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: colorFor(name) }}
    >
      {initial}
    </span>
  );
}
