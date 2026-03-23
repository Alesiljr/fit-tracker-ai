import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem não pode estar vazia').max(2000, 'Mensagem muito longa (máx. 2000 caracteres)'),
  sessionId: z.string().uuid('ID de sessão inválido').optional(),
});

export const aiFeedbackSchema = z.object({
  messageId: z.string().uuid('ID de mensagem inválido'),
  feedback: z.enum(['liked', 'rejected'], {
    errorMap: () => ({ message: 'Feedback deve ser "liked" ou "rejected"' }),
  }),
  rejectionType: z.enum(['hard', 'deferred']).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type AiFeedbackInput = z.infer<typeof aiFeedbackSchema>;
