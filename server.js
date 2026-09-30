import Fastify from 'fastify';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const fastify = Fastify({ logger: true });
const redis = new Redis({ host: 'localhost', port: 6379 });

// Load Lua script
const luaScript = fs.readFileSync(path.join(process.cwd(), 'decantInventory.lua'), 'utf8');
fastify.get('/', async (request, reply) => {
  return { status: 'ok', message: 'Flash Sale Engine is running!' };
});
fastify.post('/api/orders', async (request, reply) => {
  const { userId, quantity = 1 } = request.body || {};

  if (!userId) {
    return reply.status(400).send({ error: 'userId is required' });
  }

  const timestamp = Date.now().toString();

  try {
    const result = await redis.eval(
      luaScript,
      2,
      'inventory:hoodie',
      'orders_queue',
      userId,
      quantity.toString(),
      timestamp
    );

    if (result === 0) {
      return reply.status(400).send({ error: 'Flash Sale Sold Out!' });
    }

    return reply.status(201).send({ status: 'Order Accepted & Queued' });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('🚀 Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();