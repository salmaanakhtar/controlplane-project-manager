import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { AuthRequest, PaginatedResponse, Task } from '../types/index.js';

const router = Router();

interface TaskBody {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  assignee_id?: number;
}

// List tasks for a project
router.get('/projects/:projectId/tasks', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const projectIdParam = req.params.projectId;
    const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;
    const queryParams = req.query;
    const page = String(queryParams.page || '1');
    const limit = String(queryParams.limit || '10');
    const status = queryParams.status ? String(queryParams.status) : undefined;
    const search = queryParams.search ? String(queryParams.search) : undefined;
    const assignee_id = queryParams.assignee_id ? String(queryParams.assignee_id) : undefined;
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Verify project exists
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    let query = 'SELECT id, title, description, status, project_id, assignee_id, created_at, updated_at FROM tasks WHERE project_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE project_id = $1';
    const params: (string | number)[] = [projectId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assignee_id) {
      query += ` AND assignee_id = $${paramIndex}`;
      countQuery += ` AND assignee_id = $${paramIndex}`;
      params.push(assignee_id);
      paramIndex++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      countQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(limitNum, offset);

    const [tasksResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, paramIndex - 1)),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<Task> = {
      data: tasksResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };

    res.json(response);
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/projects/:projectId/tasks', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const projectId = req.params.projectId;
    const { title, description, status, assignee_id } = req.body as TaskBody;

    if (!title) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    // Verify project exists
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Verify assignee exists if provided
    if (assignee_id) {
      const assigneeCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [assignee_id]
      );
      if (assigneeCheck.rows.length === 0) {
        res.status(400).json({ error: 'Assignee not found' });
        return;
      }
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, project_id, assignee_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description || null, status || 'todo', projectId, assignee_id || null]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID
router.get('/tasks/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      'SELECT id, title, description, status, project_id, assignee_id, created_at, updated_at FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/tasks/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { title, description, status, assignee_id } = req.body as TaskBody;

    // Check if task exists
    const checkResult = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Verify assignee exists if provided
    if (assignee_id !== undefined) {
      if (assignee_id !== null) {
        const assigneeCheck = await pool.query(
          'SELECT id FROM users WHERE id = $1',
          [assignee_id]
        );
        if (assigneeCheck.rows.length === 0) {
          res.status(400).json({ error: 'Assignee not found' });
          return;
        }
      }
    }

    const result = await pool.query(
      `UPDATE tasks SET 
        title = COALESCE($1, title), 
        description = COALESCE($2, description), 
        status = COALESCE($3, status), 
        assignee_id = $4, 
        updated_at = NOW() 
      WHERE id = $5 RETURNING *`,
      [title, description, status, assignee_id, id]
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/tasks/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    // Check if task exists
    const checkResult = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
