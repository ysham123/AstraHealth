# LoopGuard

LoopGuard is a course prototype for tracking radiology follow-up recommendations.
The intended workflow connects a recommendation to a due date, an assigned
coordinator, and a record of status changes. It explores how unfinished follow-up
work could remain visible after a report is written.

## Repository guide

The backend uses Python, FastAPI, SQLAlchemy, and PostgreSQL. Domain objects define
recommendations and workflow rules; application services coordinate operations;
repository interfaces separate those operations from storage. Supabase provides
authentication. The frontend uses React, TypeScript, and Vite.

Useful starting points:

- [Follow-up model](backend/app/domain/entities/followup.py): due dates and states.
- [Worklist service](backend/app/application/services/list_worklist_service.py):
  filters, assignment, due dates, and overdue information.
- [Status-update service](backend/app/application/services/update_followup_status_service.py):
  transition checks, action records, and an audit call.
- [Active frontend routes](frontend/src/App.tsx): the current dashboard and pages.

The repository includes earlier page variants that are not mounted by `App.tsx`.
Some API handlers use services and others access storage directly. In particular,
the POST follow-up handler bypasses the separate creation service. Role checks
and audit logging are therefore not uniformly enforced across the API.

## Local development with Docker

Install Docker with Compose and create a Supabase project with email/password
authentication. Use synthetic data when evaluating this prototype.

From the `loopguard` directory:

```sh
cp backend/.env.example backend/.env
# Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_JWT_SECRET in backend/.env.
docker compose --env-file backend/.env up --build -d
docker compose --env-file backend/.env exec backend python create_tables.py
```

The `--env-file` argument supplies Compose's variable interpolation; putting a
file in `backend/` alone does not do that. Compose supplies the local database
URL and frontend variables. The defaults expose development services locally and
are not deployment settings.

Open the frontend at `http://localhost:5173` and API docs at
`http://localhost:8000/docs`. The `/health` and `/ready` endpoints return status
responses; `/ready` does not check database connectivity.

`create_tables.py` creates missing tables from the models using the asyncpg
driver. It does not migrate existing schemas. Although Alembic is listed as a
dependency, this repository does not include an Alembic migration configuration
or revision history. An empty database also has no example studies or reports;
those records must exist before creating a follow-up through the corresponding
API operation.

## Running services without Docker

With a local PostgreSQL instance, copy and configure the backend environment
file, including `DATABASE_URL`, then run from `backend/`:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python create_tables.py
uvicorn app.main:app --reload --port 8000
```

In a separate terminal, from `frontend/`:

```sh
cp .env.example .env.local
# Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_API_BASE_URL.
npm ci
npm run dev
```

Use `http://localhost:8000/api` for the frontend API base URL. Features beyond
follow-up tracking may require additional configuration in their own handlers.

## Checks and limits

Run `python -m pytest tests/test_domain.py -q` from `backend/` for the domain
tests. They cover due dates, terminal states, role helpers, and interval parsing;
they do not validate every API route or database transaction. Completed and
cancelled items are terminal. Due dates currently approximate a month as 30 days.

From `frontend/`, `npm run type-check` and `npm run build` check TypeScript and the
production bundle. The existing lint script needs an ESLint configuration before
it can be treated as a repository check.

This is a prototype with no claimed hospital deployment or measured clinical
outcome. Authentication, role helpers, and audit-related code do not establish
HIPAA compliance. Production use would require further access-control, logging,
data-handling, deployment, and operational work beyond this course project.
