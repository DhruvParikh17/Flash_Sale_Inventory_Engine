import Redis from 'ioredis';
import pg from 'pg';

const { Pool } = pg;

// Connect to Redis and PostgreSQL
const redis = new Redis({ host: 'localhost', port: 6379 });
const pgPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

const BATCH_SIZE = 50; // Process in batches of 50
const POLL_INTERVAL_MS = 1000; // Check Redis queue every 1 second

async function processOrders() {
  try {
    // 1. Fetch up to BATCH_SIZE items from the Redis list 'orders_queue'
    const pipeline = redis.pipeline();
    for (let i = 0; i < BATCH_SIZE; i++) {
      pipeline.lpop('orders_queue');
    }
    const results = await pipeline.exec();

    // Extract valid raw JSON payloads
    const rawOrders = results
      .map(([err, res]) => res)
      .filter((item) => item !== null);

    if (rawOrders.length === 0) {
      return; // No orders in queue, wait for next tick
    }

    // 2. Parse JSON string payloads
    const orders = rawOrders.map((raw) => JSON.parse(raw));

    // 3. Perform a single batch SQL insert into PostgreSQL
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // Construct parameterized SQL query for batch insert
      const valueTuples = [];
      const queryParams = [];

      orders.forEach((order, index) => {
        const offset = index * 2;
        valueTuples.push(`($${offset + 1}, $${offset + 2})`);
        queryParams.push(order.user_id, parseInt(order.quantity, 10));
      });

      const insertQuery = `
        INSERT INTO orders (user_id, quantity)
        VALUES ${valueTuples.join(', ')}
      `;

      await client.query(insertQuery, queryParams);
      await client.query('COMMIT');

      console.log(`✅ [Worker] Batch committed ${orders.length} orders to PostgreSQL database!`);
    } catch (dbErr) {
      await client.query('ROLLBACK');
      console.error('❌ [Worker] Database Batch Insert Error:', dbErr);

      // Requeue failed items back into Redis to prevent data loss
      const rePushPipeline = redis.pipeline();
      rawOrders.forEach((raw) => rePushPipeline.rpush('orders_queue', raw));
      await rePushPipeline.exec();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ [Worker] Processing error:', err);
  }
}

// Start polling queue on loop
console.log('🔄 Background Batch Worker started. Polling Redis orders_queue...');
setInterval(processOrders, POLL_INTERVAL_MS);