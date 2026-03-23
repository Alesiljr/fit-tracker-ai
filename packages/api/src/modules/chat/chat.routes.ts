import { FastifyInstance } from 'fastify';
import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { chatSessions, chatMessages, userBoundaries } from '../../db/schema.js';
import { chatMessageSchema, aiFeedbackSchema } from '@fittracker/shared';

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat/message — Send message to AI chat
  fastify.post('/api/chat/message', async (request, reply) => {
    const result = chatMessageSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { message, sessionId } = result.data;
    const userId = request.userId;

    let activeSessionId = sessionId;

    // If no sessionId, create new session
    if (!activeSessionId) {
      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId,
          title: message.substring(0, 100),
          messageCount: 0,
        })
        .returning();
      activeSessionId = newSession.id;
    } else {
      // Verify session belongs to user
      const session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.id, activeSessionId),
          eq(chatSessions.userId, userId),
        ),
      });
      if (!session) {
        return reply.code(404).send({ error: 'Sessão não encontrada' });
      }
    }

    // Save user message
    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: activeSessionId,
        userId,
        role: 'user',
        content: message,
      })
      .returning();

    // Placeholder AI response (actual Claude integration will come later)
    const aiResponseContent =
      'Obrigado pela sua mensagem! A integração com IA será configurada em breve. ' +
      'Por enquanto, registre suas refeições, exercícios e métricas de saúde para que eu possa te ajudar melhor quando estiver totalmente ativo.';

    // Save AI response
    const [aiMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: activeSessionId,
        userId,
        role: 'assistant',
        content: aiResponseContent,
      })
      .returning();

    // Update session message count and updatedAt
    await db
      .update(chatSessions)
      .set({
        messageCount: await db.query.chatMessages
          .findMany({
            where: eq(chatMessages.sessionId, activeSessionId),
          })
          .then((msgs) => msgs.length),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, activeSessionId));

    return {
      messageId: aiMessage.id,
      sessionId: activeSessionId,
      response: aiResponseContent,
    };
  });

  // GET /api/chat/history — Get all sessions for user
  fastify.get('/api/chat/history', async (request) => {
    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.userId, request.userId),
      orderBy: [desc(chatSessions.updatedAt)],
    });

    return sessions;
  });

  // GET /api/chat/history/:sessionId — Get messages for a session
  fastify.get('/api/chat/history/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    // Verify session belongs to user
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, request.userId),
      ),
    });

    if (!session) {
      return reply.code(404).send({ error: 'Sessão não encontrada' });
    }

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: [asc(chatMessages.createdAt)],
    });

    return { session, messages };
  });

  // POST /api/ai/feedback — Submit feedback on AI message
  fastify.post('/api/ai/feedback', async (request, reply) => {
    const result = aiFeedbackSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.errors[0].message });
    }

    const { messageId, feedback, rejectionType } = result.data;
    const userId = request.userId;

    // Verify message exists and belongs to user
    const message = await db.query.chatMessages.findFirst({
      where: and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, 'assistant'),
      ),
    });

    if (!message) {
      return reply.code(404).send({ error: 'Mensagem não encontrada' });
    }

    // Update message metadata with feedback
    await db
      .update(chatMessages)
      .set({
        metadata: { feedback, rejectionType },
      })
      .where(eq(chatMessages.id, messageId));

    // If rejected, create a boundary
    if (feedback === 'rejected' && rejectionType) {
      const boundaryValues: {
        userId: string;
        boundaryType: 'hard' | 'deferred';
        category: 'suggestion';
        item: string;
        itemNormalized: string;
        sourceMessageId: string;
        isActive: boolean;
        expiresAt?: Date;
      } = {
        userId,
        boundaryType: rejectionType,
        category: 'suggestion',
        item: message.content.substring(0, 200),
        itemNormalized: message.content.substring(0, 200).toLowerCase().trim(),
        sourceMessageId: messageId,
        isActive: true,
      };

      if (rejectionType === 'deferred') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        boundaryValues.expiresAt = expiresAt;
      }

      await db.insert(userBoundaries).values(boundaryValues);
    }

    return { success: true };
  });

  // GET /api/ai/boundaries — Get all active boundaries for user
  fastify.get('/api/ai/boundaries', async (request) => {
    const boundaries = await db.query.userBoundaries.findMany({
      where: and(
        eq(userBoundaries.userId, request.userId),
        eq(userBoundaries.isActive, true),
      ),
    });

    return boundaries;
  });

  // DELETE /api/ai/boundaries/:id — Deactivate a boundary
  fastify.delete('/api/ai/boundaries/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [updated] = await db
      .update(userBoundaries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userBoundaries.id, id),
          eq(userBoundaries.userId, request.userId),
        ),
      )
      .returning();

    if (!updated) {
      return reply.code(404).send({ error: 'Limite não encontrado' });
    }

    return { success: true };
  });
}
