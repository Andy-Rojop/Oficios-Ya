import type { Prisma } from '../generated/prisma/client';

type ConversationDb = Pick<Prisma.TransactionClient, 'conversation'>;

export interface PairConversation {
  id: string;
  requestId: string | null;
}

const SELECT = { id: true, requestId: true } as const;

/** Busca la conversación de la pareja (una sola, aunque el rol esté invertido). */
export function findPairConversation(
  db: ConversationDb,
  userA: string,
  userB: string,
): Promise<PairConversation | null> {
  return db.conversation.findFirst({
    where: {
      OR: [
        { clientId: userA, workerId: userB },
        { clientId: userB, workerId: userA },
      ],
    },
    select: SELECT,
  });
}

/**
 * Devuelve la conversación cliente↔trabajador, creándola si no existe.
 * Maneja la carrera con el @@unique(clientId, workerId) (P2002).
 */
export async function ensurePairConversation(
  db: ConversationDb,
  clientId: string,
  workerId: string,
): Promise<PairConversation> {
  const existing = await findPairConversation(db, clientId, workerId);
  if (existing) return existing;
  try {
    return await db.conversation.create({ data: { clientId, workerId }, select: SELECT });
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const raced = await findPairConversation(db, clientId, workerId);
    if (!raced) throw error;
    return raced;
  }
}
