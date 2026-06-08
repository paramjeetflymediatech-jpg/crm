const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const cron = require('node-cron');

// Load environment variables
require('dotenv').config();

const { syncDatabase } = require('./src/models');
const { setIo } = require('./src/socket/socketServer');
const { runDailyFollowUpCron, runHourlyOverdueCron } = require('./src/cron/cronJobs');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const expressApp = express();
  const server = http.createServer(expressApp);

  // 1. Initialize Socket.IO Server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Register Socket.IO server globally
  setIo(io);

  // 2. Setup Redis Scaling Adapter (Optional)
  if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
      subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO successfully clustered via Redis Pub/Sub.');
    } catch (err) {
      console.error('Failed to configure Redis clustering, falling back to memory socket adapter:', err.message);
    }
  } else {
    console.log('Socket.IO running with local memory adapter.');
  }

  // 3. Socket.IO Connection Events (Multi-Tenant Room Isolation)
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Allow users to join a company-specific notification channel
    socket.on('join_company', (companyId) => {
      if (companyId) {
        const roomName = `company_${companyId}`;
        socket.join(roomName);
        console.log(`[Socket] Client ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // 4. Database Sync & Seeding
  console.log('Synchronizing database models...');
  await syncDatabase();

  // 5. Cron Jobs
  // Run Daily Follow-up checks at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    await runDailyFollowUpCron();
  });

  // Run Hourly Overdue Task checks
  cron.schedule('0 * * * *', async () => {
    await runHourlyOverdueCron();
  });

  console.log('Cron schedulers started.');

  // 6. Delegate routing to Next.js handler
  expressApp.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> App running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`> Listening at http://localhost:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
