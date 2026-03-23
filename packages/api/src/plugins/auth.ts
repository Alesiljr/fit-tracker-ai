import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`Missing Supabase config: URL=${!!url}, KEY=${!!key}`);
  }
  return { url, key };
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  const { url, key } = getSupabaseConfig();
  const supabase = createClient(url, key);

  fastify.decorate('supabase', supabase);

  fastify.decorateRequest('userId', '');

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/api/health-check') return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      reply.code(401).send({ error: 'Token inválido ou expirado' });
      return;
    }

    request.userId = data.user.id;
  });
}

export default fp(authPlugin, {
  name: 'auth',
});
