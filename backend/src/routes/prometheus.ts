import { Router, Request, Response } from 'express';
import prometheusService from '../services/prometheus.js';

const router = Router();

// Get system metrics (CPU, memory, containers)
router.get('/prometheus', async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await prometheusService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error in /api/prometheus:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get CPU metrics
router.get('/prometheus/cpu', async (req: Request, res: Response): Promise<void> => {
  try {
    const cpu = await prometheusService.getCPUMetrics();
    res.json({
      cpu,
      unit: 'cores',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/prometheus/cpu:', error);
    res.status(500).json({ error: 'Failed to fetch CPU metrics' });
  }
});

// Get memory metrics
router.get('/prometheus/memory', async (req: Request, res: Response): Promise<void> => {
  try {
    const memory = await prometheusService.getMemoryMetrics();
    res.json({
      ...memory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/prometheus/memory:', error);
    res.status(500).json({ error: 'Failed to fetch memory metrics' });
  }
});

// Get container metrics
router.get('/prometheus/containers', async (req: Request, res: Response): Promise<void> => {
  try {
    const containers = await prometheusService.getContainerMetrics();
    res.json({
      count: containers.length,
      containers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/prometheus/containers:', error);
    res.status(500).json({ error: 'Failed to fetch container metrics' });
  }
});

export default router;
