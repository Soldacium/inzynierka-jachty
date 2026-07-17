import type { AppContext } from '../../app-context.js';
import { AppError } from '../../common/errors.js';
import { ConversationParticipant } from '../../database/entities.js';

export async function requireConversationParticipant(context: AppContext, conversationId: string, userId: string) {
  const participant = await context.dataSource.getRepository(ConversationParticipant).findOne({ where: { conversationId, userId } });
  if (!participant) throw new AppError(403, 'CONVERSATION_ACCESS_DENIED', 'You are not a participant of this conversation.');
  return participant;
}
