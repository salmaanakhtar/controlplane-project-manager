import { Router, Request, Response } from 'express';
import githubService from '../services/github.js';

const router = Router();

// Get repository info
router.get('/github/repo', async (req: Request, res: Response): Promise<void> => {
  try {
    const repoInfo = await githubService.getRepoInfo();
    
    if (!repoInfo) {
      res.status(500).json({ error: 'Failed to fetch repository info' });
      return;
    }

    res.json(repoInfo);
  } catch (error) {
    console.error('Error in /api/github/repo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent pull requests
router.get('/github/prs', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const prs = await githubService.getRecentPRs(limit);
    res.json({
      count: prs.length,
      prs
    });
  } catch (error) {
    console.error('Error in /api/github/prs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent commits
router.get('/github/commits', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const commits = await githubService.getRecentCommits(limit);
    res.json({
      count: commits.length,
      commits
    });
  } catch (error) {
    console.error('Error in /api/github/commits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get deployments
router.get('/github/deployments', async (req: Request, res: Response): Promise<void> => {
  try {
    const deployments = await githubService.getDeployments();
    res.json({
      count: deployments.length,
      deployments
    });
  } catch (error) {
    console.error('Error in /api/github/deployments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
