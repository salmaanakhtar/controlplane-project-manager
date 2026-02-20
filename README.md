# ControlPlane Project Manager

A comprehensive project management application with control plane functionality for managing projects, tasks, teams, and resources.

## Overview

ControlPlane Project Manager is a full-stack web application designed to help teams organize, track, and manage their projects efficiently. It provides a centralized platform for project planning, task assignment, progress tracking, and team collaboration.

## Tech Stack

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Language:** TypeScript
- **State Management:** React Query / Context API
- **UI Library:** Component library (to be determined)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (recommended)
- **Authentication:** JWT-based auth

### DevOps
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Project Structure

```
controlplane-project-manager/
├── frontend/          # React/Vite/TypeScript frontend application
├── backend/          # Node/Express/TypeScript API server
├── docker/           # Docker configurations
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── docs/             # Documentation
└── .github/          # GitHub Actions workflows
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (for local development)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/salmaanakhtar/controlplane-project-manager.git
   cd controlplane-project-manager
   ```

2. **Start with Docker Compose:**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Or run individually:**

   **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API Documentation Outline

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update task status

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add team member

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **CI Pipeline** (on pull requests)
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Unit tests
   - Build verification

2. **CD Pipeline** (on merge to main)
   - Build Docker images
   - Push to container registry
   - Deploy to staging/production

### Environment Variables

Required environment variables for CI/CD:
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `GITHUB_TOKEN`

## Branching Strategy

This project follows a Git Flow workflow:

- **main** - Production-ready code
- **develop** - Integration branch
- **feature/*** - Feature branches
- **bugfix/*** - Bug fix branches
- **hotfix/*** - Emergency production fixes

All contributions must be made through Pull Requests. Direct pushes to `main` are prohibited.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a Pull Request
4. Wait for code review and CI checks
5. Merge after approval

## License

MIT License - see LICENSE file for details
