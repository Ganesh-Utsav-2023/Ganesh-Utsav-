import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { seedInitialData } from './src/server/db.ts';
import { initWebSocket } from './src/server/websocket.ts';
import authRoutes from './src/server/routes/auth.ts';
import slotRoutes from './src/server/routes/slots.ts';
import bookingRoutes from './src/server/routes/bookings.ts';
import reportRoutes from './src/server/routes/reports.ts';
import userRoutes from './src/server/routes/users.ts';
import activityRoutes from './src/server/routes/activity.ts';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Initialize SQLite seed data
  await seedInitialData();

  // Attach WebSockets
  initWebSocket(server);

  // Body parser
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/slots', slotRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/activity', activityRoutes);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ganesh Aarti Booking Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
