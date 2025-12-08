# LoopGuard

**Radiology Follow-up Tracking System**

A HIPAA-oriented full-stack application for tracking radiology follow-up recommendations, built with Clean Architecture principles and SOLID design patterns.

---

## Overview

LoopGuard helps radiologists and coordinators manage follow-up imaging recommendations to ensure patients don't fall through the cracks. Key features:

- **Radiologist Panel**: Create follow-up recommendations while reading studies
- **Coordinator Worklist**: Track, filter, and update follow-up statuses
- **Admin Metrics**: Compliance dashboards with completion/overdue rates
- **Audit Trail**: HIPAA-aligned logging of all PHI access

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│                   (FastAPI Routers, Schemas)                    │
├─────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                          │
│                  (Use Cases / Services)                         │
├─────────────────────────────────────────────────────────────────┤
│                       DOMAIN LAYER                              │
│            (Entities, Value Objects, Interfaces)                │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│      (SQLAlchemy, Supabase Auth, Audit Logger)                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Roles

| Role | Permissions |
|------|-------------|
| **RADIOLOGIST** | Create follow-ups, view own patients |
| **COORDINATOR** | Manage worklist, update statuses |
| **ADMIN** | Full access, view metrics and audit logs |

---

## Tech Stack

### Backend
- **Python 3.11+** with type hints
- **FastAPI** - Async web framework
- **SQLAlchemy 2.0** - Async ORM
- **Pydantic 2** - Validation and settings
- **PostgreSQL** - Database
- **Supabase Auth** - JWT authentication

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **React Router** - Navigation
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts
- **@supabase/supabase-js** - Auth client

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Supabase project (for authentication)

### 1. Clone and Configure

```bash
cd loopguard

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit .env files with your Supabase credentials
```

### 2. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Services will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Run Migrations (First Time)

```bash
# Enter backend container
docker-compose exec backend bash

# Run Alembic migrations
alembic upgrade head
```

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/link` | Link Supabase user to LoopGuard |
| GET | `/api/auth/me` | Get current user info |

### Follow-ups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/followups` | Create follow-up recommendation |
| GET | `/api/followups/worklist` | Get filtered worklist |
| GET | `/api/followups/{id}` | Get specific follow-up |
| PATCH | `/api/followups/{id}/status` | Update follow-up status |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/followups` | Get compliance metrics (Admin only) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

---

## Environment Variables

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_JWT_SECRET` | JWT secret for verification | Yes |
| `CORS_ORIGINS` | Allowed CORS origins | No |
| `ENVIRONMENT` | development/staging/production | No |

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `VITE_API_BASE_URL` | Backend API URL | No |

---

## Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Settings > API to get:
   - Project URL (`SUPABASE_URL`)
   - `anon` public key (`SUPABASE_ANON_KEY`)
   - JWT Secret (`SUPABASE_JWT_SECRET`)
3. Enable Email/Password auth in Authentication > Providers

---

## Production Deployment

### Backend (AWS ECS / Docker Host)

```bash
# Build production image
docker build -t loopguard-api ./backend

# Run with production settings
docker run -d \
  -e DATABASE_URL="postgresql://..." \
  -e SUPABASE_URL="https://..." \
  -e SUPABASE_JWT_SECRET="..." \
  -e ENVIRONMENT=production \
  -p 8000:8000 \
  loopguard-api
```

### Frontend (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard.

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm run type-check
npm run lint
```

---

## Project Structure

```
loopguard/
├── backend/
│   ├── app/
│   │   ├── domain/           # Entities, value objects, interfaces
│   │   ├── application/      # Use cases / services
│   │   ├── infrastructure/   # DB, auth, repositories
│   │   └── presentation/     # API routes, schemas
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # Page components
│   │   ├── supabase/         # Supabase client
│   │   └── types/            # TypeScript types
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## HIPAA Alignment

LoopGuard includes several HIPAA-inspired safeguards:

- **Audit Logging**: All PHI access is logged with user, timestamp, and IP
- **Role-Based Access**: Users see only data relevant to their role
- **Append-Only Audit**: Audit logs cannot be modified or deleted
- **JWT Authentication**: Secure, stateless authentication via Supabase
- **Encryption in Transit**: HTTPS required in production

**Note**: For full HIPAA compliance, additional measures are required (BAA with Supabase, encryption at rest, etc.).

---

## License

MIT License

---

*Part of the AstraHealth mono-repo - See also: [Myndra](../Myndra/README_Myndra.md)*
