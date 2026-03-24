import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth.js';
import { profileRoutes } from './modules/auth/profile.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { dashboardRoutes } from './modules/reports/dashboard.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { goalsRoutes } from './modules/goals/goals.routes.js';
import { privacyRoutes } from './modules/privacy/privacy.routes.js';
import { logChatRoutes } from './modules/log/log-chat.routes.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(authPlugin);

  // Routes
  await fastify.register(profileRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(reportsRoutes);
  await fastify.register(goalsRoutes);
  await fastify.register(privacyRoutes);
  await fastify.register(logChatRoutes);

  fastify.get('/api/health-check', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
}

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export { buildServer };
