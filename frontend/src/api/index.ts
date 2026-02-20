import axios from 'axios';
import type { User, Project, Task, PaginatedResponse } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  me: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const projectsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Project>> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },
  get: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description: string }): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  update: async (id: string, data: { name?: string; description?: string }): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

export const tasksApi = {
  list: async (projectId: string, params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<PaginatedResponse<Task>> => {
    const response = await api.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  },
  get: async (id: string): Promise<Task> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  create: async (projectId: string, data: { title: string; description: string; status?: string; assigneeId?: string }): Promise<Task> => {
    const response = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },
  update: async (id: string, data: { title?: string; description?: string; status?: string; assigneeId?: string }): Promise<Task> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};

export default api;
