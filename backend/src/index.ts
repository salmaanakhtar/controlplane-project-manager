import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import healthRoutes from './routes/health.js';
import githubRoutes from './routes/github.js';
import prometheusRoutes from './routes/prometheus.js';
import sessionsRoutes from './routes/sessions.js';
import cronRoutes from './routes/cron.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/ready', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', githubRoutes);
app.use('/api', prometheusRoutes);
app.use('/api', sessionsRoutes);
app.use('/api', cronRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    const port = parseInt(process.env.PORT || '3001', 10);
    app.listen(port, '127.0.0.1', () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
      console.log('Health check: GET /health');
      console.log('Ready check: GET /ready');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
