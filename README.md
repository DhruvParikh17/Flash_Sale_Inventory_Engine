Flash Sale Inventory Engine:

Key Benchmarks:
Throughput: 7,500 request per second under heavy load (200 virtual users)
Latency: around 26ms average HTTP response time
Accuracy: Exactly 1,000 accepted orders committed, remaining requests (around 73,900) rejected safely 

Build:
API Layer (Fastify): High-performance asynchronous HTTP server.
Atomic Inventory Decanting (Redis + Lua): Evaluates and decrements stock in memory via atomic Lua scripts to eliminate race conditions.
Async Batch Persistence (Node Worker): Dequeues accepted orders from Redis and commits them to PostgreSQL in chunked SQL transactions, avoiding database write bottlenecks.

Quick start:
1. Install dependencies
npm install
2. Start containers
docker run -d --name redis-flash -p 6379:6379 redis:alpine
docker run -d --name postgres-flash -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:alpine
3. Initialize DB & Seed Redis (1,000 units)
docker exec -it postgres-flash psql -U postgres -c "CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, user_id VARCHAR(100), quantity INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
docker exec -it redis-flash redis-cli SET inventory:hoodie 1000
4. Start Server & Worker
npm start        # Terminal 1
node worker.js   # Terminal 2
5. Run Load Test
k6 run loadtest.js
