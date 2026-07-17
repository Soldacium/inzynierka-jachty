import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';
import type { AppContext } from '../app-context.js';
import { env } from '../config/env.js';
import { User } from '../database/entities.js';
import { requireConversationParticipant } from '../modules/messages/message.access.js';

export function attachSocketServer(server: HttpServer, context: AppContext): Server {
  const io = new Server(server, { cors: { origin: env.CORS_ORIGINS, credentials: false } });
  io.use(async (socket, next) => {
    try {
      const token = z.string().min(1).parse(socket.handshake.auth.token);
      const auth = await context.tokenService.verifyAccessToken(token);
      const user = await context.dataSource.getRepository(User).findOneBy({ id: auth.id });
      if (!user || user.isBlocked) throw new Error('Inactive user');
      socket.data.auth = auth;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });
  io.on('connection', (socket) => {
    socket.on('scope:join', async (payload: unknown, acknowledge?: (result: unknown) => void) => {
      try {
        const scope = z.discriminatedUnion('type', [
          z.object({ type: z.literal('alerts') }),
          z.object({ type: z.literal('traffic') }),
          z.object({ type: z.literal('port'), id: z.uuid() }),
          z.object({ type: z.literal('conversation'), id: z.uuid() }),
        ]).parse(payload);
        let room: string;
        if (scope.type === 'conversation') {
          await requireConversationParticipant(context, scope.id, socket.data.auth.id);
          room = `conversation:${scope.id}`;
        } else if (scope.type === 'port') room = `port:${scope.id}`;
        else if (scope.type === 'traffic') room = 'traffic:global';
        else room = 'alerts';
        await socket.join(room);
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, error: 'SCOPE_ACCESS_DENIED' });
      }
    });
    socket.on('scope:leave', async (room: unknown) => {
      if (typeof room === 'string' && [...socket.rooms].includes(room)) await socket.leave(room);
    });
  });
  context.io = io;
  return io;
}
