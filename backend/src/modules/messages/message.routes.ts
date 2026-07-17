import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../app-context.js';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { Conversation, ConversationParticipant, Message, Port, PortManager } from '../../database/entities.js';
import { requireConversationParticipant } from './message.access.js';

export function messageRouter(context: AppContext): Router {
  const router = Router();
  router.get('/', asyncHandler(async (request, response) => {
    const items = await context.dataSource.getRepository(Conversation).createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant', 'participant.user_id = :userId', { userId: request.auth!.id })
      .leftJoinAndSelect('conversation.port', 'port')
      .orderBy('conversation.updated_at', 'DESC').limit(100).getMany();
    response.json({ items });
  }));
  router.post('/', asyncHandler(async (request, response) => {
    const { portId } = z.object({ portId: z.uuid() }).parse(request.body);
    if (!(await context.dataSource.getRepository(Port).exists({ where: { id: portId } }))) throw new AppError(404, 'PORT_NOT_FOUND', 'Port was not found.');
    const existing = await context.dataSource.getRepository(Conversation).createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'participant', 'participant.user_id = :userId', { userId: request.auth!.id })
      .where('conversation.port_id = :portId', { portId }).getOne();
    if (existing) return response.json(existing);

    const conversation = await context.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Conversation).save({ portId });
      const managers = await manager.getRepository(PortManager).find({ where: { portId } });
      const participantIds = new Set([request.auth!.id, ...managers.map((item) => item.userId)]);
      await manager.getRepository(ConversationParticipant).save([...participantIds].map((userId) => ({ conversationId: saved.id, userId })));
      return saved;
    });
    response.status(201).json(conversation);
  }));
  router.get('/:id/messages', asyncHandler(async (request, response) => {
    const conversationId = z.uuid().parse(request.params.id);
    await requireConversationParticipant(context, conversationId, request.auth!.id);
    const query = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(request.query);
    const builder = context.dataSource.getRepository(Message).createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .orderBy('message.created_at', 'DESC').limit(query.limit);
    if (query.before) builder.andWhere('message.created_at < :before', { before: query.before });
    response.json({ items: (await builder.getMany()).reverse() });
  }));
  router.post('/:id/messages', asyncHandler(async (request, response) => {
    const conversationId = z.uuid().parse(request.params.id);
    await requireConversationParticipant(context, conversationId, request.auth!.id);
    const { body } = z.object({ body: z.string().trim().min(1).max(10_000) }).parse(request.body);
    const message = await context.dataSource.getRepository(Message).save({ conversationId, senderId: request.auth!.id, body });
    await context.dataSource.getRepository(Conversation).update({ id: conversationId }, { updatedAt: new Date() });
    context.emitToRoom(`conversation:${conversationId}`, 'message:created', message);
    response.status(201).json(message);
  }));
  router.post('/:id/read', asyncHandler(async (request, response) => {
    const conversationId = z.uuid().parse(request.params.id);
    const participant = await requireConversationParticipant(context, conversationId, request.auth!.id);
    participant.lastReadAt = new Date();
    await context.dataSource.getRepository(ConversationParticipant).save(participant);
    response.status(204).send();
  }));
  return router;
}
