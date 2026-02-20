import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: string };
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'controlplane_pm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

// Database pool
const pool = new Pool(DB_CONFIG);

// Initialize DB
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

// Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
    [email, hash, name]
  );
  res.json(result.rows[0]);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid' });
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/auth/me', authMiddleware, async (req: any, res) => {
>>>>>>> origin/feature/devops
});

app.get('/api/auth/me', authMiddleware, async (req: any, res) => {
  const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
});

// Projects
app.get('/api/projects', authMiddleware, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const result = await pool.query(
    'SELECT * FROM projects WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [`%${search}%`, limit, offset]
  );
  res.json(result.rows);
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const result = await pool.query(
    'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [name, description, req.user!.id]
  );
  res.json(result.rows[0]);
});

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const result = await pool.query(
    'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, description, req.params.id]
  );
  res.json(result.rows[0]);
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Tasks
app.get('/api/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let query = 'SELECT * FROM tasks WHERE project_id = $1';
  const params: any[] = [req.params.projectId];
  
  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }
  if (search) {
    query += params.length === 2 ? ' AND title ILIKE $3' : ' AND title ILIKE $2';
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  res.json(result.rows);
});

app.post('/api/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  const { title, description, status = 'todo', assignee_id } = req.body;
  const result = await pool.query(
    'INSERT INTO tasks (title, description, status, project_id, assignee_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, description, status, req.params.projectId, assignee_id]
  );
  res.json(result.rows[0]);
});

app.get('/api/tasks/:id', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { title, description, status, assignee_id } = req.body;
  const result = await pool.query(
    'UPDATE tasks SET title = $1, description = $2, status = $3, assignee_id = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [title, description, status, assignee_id, req.params.id]
  );
  res.json(result.rows[0]);
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

// Start
const PORT = parseInt(process.env.PORT || '3001', 10);
initDB().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Backend running on port ${PORT}`);
  });
}).catch(console.error);
