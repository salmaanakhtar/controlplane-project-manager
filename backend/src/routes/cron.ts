import { Router, Request, Response } from 'express';
import cronService from '../services/cron.js';

const router = Router();

// Get cron jobs
router.get('/cron', async (req: Request, res: Response): Promise<void> => {
  try {
    const includeAll = req.query.all === 'true';
    const jobs = await cronService.getJobs(includeAll);
    res.json({
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Error in /api/cron:', error);
    res.status(500).json({ error: 'Failed to fetch cron jobs' });
  }
});

// Get cron run history
router.get('/cron/runs', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const runs = await cronService.getCronRuns(limit);
    res.json({
      count: runs.length,
      runs
    });
  } catch (error) {
    console.error('Error in /api/cron/runs:', error);
    res.status(500).json({ error: 'Failed to fetch cron runs' });
  }
});

// Get cron scheduler status
router.get('/cron/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await cronService.getCronStatus();
    res.json(status);
  } catch (error) {
    console.error('Error in /api/cron/status:', error);
    res.status(500).json({ error: 'Failed to fetch cron status' });
  }
});

export default router;
