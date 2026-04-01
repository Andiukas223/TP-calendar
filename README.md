# Maintenance Calendar

A self-hosted planned maintenance scheduling app. Define recurring tasks (oil changes, inspections, filter replacements, etc.) and the system auto-generates a calendar of upcoming events — 3 years into the future.

## Architecture

```
maintenance-calendar/
├── backend/          # Node.js + Express REST API, SQLite database
├── frontend/         # Single-page HTML app (Tailwind + FullCalendar + Alpine.js)
├── docker-compose.yml
├── start.sh          # Start all services
└── stop.sh           # Stop all services
```

| Service  | URL                    | Description              |
|----------|------------------------|--------------------------|
| Frontend | http://localhost:8080  | Web UI (calendar + tasks) |
| Backend  | http://localhost:3000  | REST API                  |

## Requirements

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick Start

```bash
./start.sh    # build images and start
./stop.sh     # stop and remove containers
```

Data is persisted in `./data/maintenance.db` (SQLite). Stopping and restarting does **not** delete your data.

## Features

- **Tasks** — define a maintenance item with name, category, location, recurrence interval (days), and preferred time.
- **Auto-scheduling** — on startup (and after each task create/complete), future events are generated up to 3 years ahead.
- **Calendar view** — month/week/list views powered by FullCalendar. Color-coded by status.
- **Event management** — mark events as done, skip, or reschedule. Add notes per event.
- **Upcoming widget** — next 10 pending events shown on the Tasks tab.

## API Reference

Base URL: `http://localhost:3000/api`

### Health

| Method | Path           | Description       |
|--------|----------------|-------------------|
| GET    | `/health`      | Service liveness  |

### Tasks

| Method | Path         | Description                              |
|--------|--------------|------------------------------------------|
| GET    | `/tasks`     | List all tasks (ordered by name)         |
| POST   | `/tasks`     | Create a task (auto-generates events)    |
| PUT    | `/tasks/:id` | Update task fields                       |
| DELETE | `/tasks/:id` | Delete task (cascades to events)         |

**POST /tasks body:**
```json
{
  "name": "Oil Change",
  "description": "Engine oil + filter",
  "category": "Vehicle",
  "periodicity_days": 180,
  "place": "Garage",
  "preferred_time": "09:00"
}
```

### Events

| Method | Path               | Description                              |
|--------|--------------------|------------------------------------------|
| GET    | `/events`          | List events (filterable, see below)      |
| GET    | `/events/upcoming` | Next 10 pending events from today        |
| PUT    | `/events/:id`      | Update event (status, notes, date, time) |
| DELETE | `/events/:id`      | Delete a single event                    |

**GET /events query params:**

| Param     | Example        | Description               |
|-----------|----------------|---------------------------|
| `start`   | `2026-01-01`   | Filter from date          |
| `end`     | `2026-12-31`   | Filter to date            |
| `status`  | `pending`      | `pending`, `done`, `skip` |
| `place`   | `Garage`       | Filter by location        |
| `task_id` | `3`            | Filter by task            |

**PUT /events/:id body:**
```json
{
  "status": "done",
  "notes": "Completed, used Mobil 1 5W-40",
  "scheduled_date": "2026-04-01",
  "scheduled_time": "10:00"
}
```

## Database

SQLite file at `./data/maintenance.db` (mounted into the backend container).

**Tables:**

`tasks` — recurring maintenance definitions
```
id, name, description, category, periodicity_days,
place, preferred_time, created_at
```

`events` — individual scheduled occurrences
```
id, task_id, task_name, scheduled_date, scheduled_time,
place, status, notes, completed_at, created_at
```

Events are auto-generated in a rolling window: today → 3 years ahead. Completing an event triggers a check to ensure future events remain scheduled.

## Configuration

Environment variables for the backend (set in `docker-compose.yml`):

| Variable   | Default                  | Description           |
|------------|--------------------------|-----------------------|
| `PORT`     | `3000`                   | API listen port       |
| `DB_PATH`  | `/app/data/maintenance.db` | SQLite file path    |
