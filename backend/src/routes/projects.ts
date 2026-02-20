import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { AuthRequest, PaginatedResponse, Project } from '../types/index.js';

const router = Router();

interface ProjectBody {
  name: string;
  description?: string;
}

interface ListProjectsQuery {
  page?: string;
  limit?: string;
  search?: string;
}

// List projects with pagination
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const queryParams = req.query;
    const page = String(queryParams.page || '1');
    const limit = String(queryParams.limit || '10');
    const search = queryParams.search ? String(queryParams.search) : undefined;
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT id, name, description, owner_id, created_at, updated_at FROM projects';
    let countQuery = 'SELECT COUNT(*) FROM projects';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push('(name ILIKE $1 OR description ILIKE $1)');
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limitNum, offset);

    const [projectsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, search ? [`%${search}%`] : []),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<Project> = {
      data: projectsResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };

    res.json(response);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { name, description } = req.body as ProjectBody;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, authReq.user!.id]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      'SELECT id, name, description, owner_id, created_at, updated_at FROM projects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const id = req.params.id;
    const { name, description } = req.body as ProjectBody;

    // Check if project exists and user is owner or admin
    const checkResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = checkResult.rows[0];
    if (project.owner_id !== authReq.user!.id && authReq.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this project' });
      return;
    }

    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const id = req.params.id;

    // Check if project exists and user is owner or admin
    const checkResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = checkResult.rows[0];
    if (project.owner_id !== authReq.user!.id && authReq.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this project' });
      return;
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
