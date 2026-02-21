import { Router, Request, Response } from 'express';
import sessionsService from '../services/sessions.js';

const router = Router();

// Get all sessions
router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const activeMinutes = req.query.active ? parseInt(req.query.active as string) : undefined;
    const sessions = await sessionsService.getSessions(activeMinutes);
    res.json(sessions);
  } catch (error) {
    console.error('Error in /api/sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get active sessions (last N minutes)
router.get('/sessions/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const sessions = await sessionsService.getActiveSessions(minutes);
    res.json({
      count: sessions.length,
      activeMinutes: minutes,
      sessions
    });
  } catch (error) {
    console.error('Error in /api/sessions/active:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

export default router;
