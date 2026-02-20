export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  project_id: number;
  assignee_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
