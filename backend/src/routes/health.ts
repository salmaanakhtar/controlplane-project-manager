import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

// Basic health check
router.get('/health', (req: Request, res: Response): void => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check with database connectivity
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      res.status(503).json({ 
        status: 'not ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({ 
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      database: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
