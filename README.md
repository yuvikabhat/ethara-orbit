# Ethara — Team Task Manager

> **College Project Submission**
> Full-Stack Web Application | Role-Based Team Task Management System

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Assignment Requirements & Coverage](#2-assignment-requirements--coverage)
3. [Tech Stack](#3-tech-stack)
4. [Features Implemented](#4-features-implemented)
5. [Database Schema](#5-database-schema)
6. [API / Data Access Layer](#6-api--data-access-layer)
7. [Role-Based Access Control](#7-role-based-access-control)
8. [Project Structure](#8-project-structure)
9. [Environment Variables](#9-environment-variables)
10. [How to Run Locally](#10-how-to-run-locally)
11. [Deployment](#11-deployment)
12. [Deviations from Original Assignment Spec](#12-deviations-from-original-assignment-spec)
13. [Known Limitations](#13-known-limitations)

---

## 1. Project Overview

**Ethara** is a full-stack team task management web application built for the college assignment
*"Team Task Manager (Full-Stack)"*. The application allows users to create projects, invite team
members, assign tasks with priorities and due dates, and track progress through a live dashboard
with charts.

The project covers all required functional areas — Authentication, Project/Team management,
Task tracking, Dashboard analytics, and Role-Based Access Control (Admin / Member).

---

## 2. Assignment Requirements & Coverage

| Requirement | Status | Notes |
|---|---|---|
| Authentication (Signup / Login) | ✅ Implemented | Email + password via Supabase Auth |
| Project management | ✅ Implemented | Create, view, delete projects |
| Team management | ✅ Implemented | Invite members, view team list |
| Task creation & assignment | ✅ Implemented | Title, description, priority, due date, assignee |
| Task status tracking | ✅ Implemented | Kanban columns: Todo → In Progress → Review → Done |
| Dashboard (tasks, status, overdue) | ✅ Implemented | KPI cards, bar chart, pie chart, upcoming tasks |
| REST APIs + Database | ✅ Implemented | Supabase (PostgreSQL) — see deviations note |
| Proper validations | ✅ Implemented | Zod schemas on all forms; server-side RLS |
| Relational data model | ✅ Implemented | Profiles, projects, tasks, user_roles, project_members |
| Role-Based Access Control | ✅ Implemented | Admin / Member roles, enforced on server via RLS |

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI library |
| TanStack Start | 1.167 | SSR framework (file-based routing) |
| TanStack Router | 1.x | Type-safe client routing |
| TanStack Query | 5.x | Server state & caching |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI | latest | Accessible component primitives |
| React Hook Form + Zod | 5.x / 3.x | Form management & validation |
| Recharts | 2.x | Dashboard charts |
| date-fns | 4.x | Date formatting & comparison |

### Backend / Infrastructure
| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Database + Auth + Row-Level Security |
| Nitro (node-server) | SSR server adapter (production) |
| Railway | Cloud deployment platform |
| Node.js 22 | Runtime |

---

## 4. Features Implemented

### 4.1 Authentication
- **Signup** — Full name, email, password (min 8 chars). First registered user becomes Admin automatically.
- **Login** — Email + password; JWT session managed by Supabase client.
- **Forgot / Reset password** — Email-based magic link flow.
- **Email confirmation** — If Supabase project has confirmation enabled, users are directed to check email before accessing the dashboard.
- **Persistent sessions** — Session stored in browser local storage; restored on page reload.

### 4.2 Projects
- Create a project with title and optional description.
- View all projects belonging to the user's workspace.
- See per-project task completion percentage on the dashboard.
- Delete projects (Admin only).

### 4.3 Team Management
- View all workspace members with their roles.
- See which tasks are assigned to each member.
- Role badge (Admin / Member) shown per user.

### 4.4 Task Management
- Create tasks with: title, description, project, assignee, status, priority (Low / Medium / High / Urgent), and due date.
- Kanban board view with drag-friendly column layout (Todo / In Progress / Review / Completed).
- Edit task status inline.
- Delete tasks.
- Filter tasks by status using tabs.

### 4.5 Dashboard
- **KPI Cards** — Total projects, total tasks, completed tasks, overdue tasks, team size, productivity %.
- **Bar Chart** — Per-project task completion (done vs total).
- **Pie Chart** — Task distribution by status.
- **My Tasks** — Tasks assigned to the logged-in user that are still open.
- **Upcoming Deadlines** — Tasks sorted by nearest due date.

### 4.6 Settings
- View and edit user profile (full name, email).
- Toggle light / dark theme.

---

## 5. Database Schema

All tables are in Supabase (PostgreSQL). Row-Level Security (RLS) is enabled on all tables.

```
profiles
  id          uuid  PK  (references auth.users)
  full_name   text
  email       text
  avatar_url  text
  created_at  timestamptz

user_roles
  id          uuid  PK
  user_id     uuid  FK → profiles.id
  role        text  CHECK (role IN ('admin','member'))

projects
  id          uuid  PK
  title       text  NOT NULL
  description text
  owner_id    uuid  FK → profiles.id
  created_at  timestamptz

project_members
  id          uuid  PK
  project_id  uuid  FK → projects.id
  user_id     uuid  FK → profiles.id
  role        text

tasks
  id           uuid  PK
  title        text  NOT NULL
  description  text
  project_id   uuid  FK → projects.id
  assigned_to  uuid  FK → profiles.id
  status       text  CHECK (status IN ('todo','in_progress','review','completed'))
  priority     text  CHECK (priority IN ('low','medium','high','urgent'))
  due_date     date
  created_by   uuid  FK → profiles.id
  created_at   timestamptz
  updated_at   timestamptz
```

**Relationships:**
- One project → many tasks (1:N)
- One project → many project_members (1:N)
- One user → many tasks (assigned, 1:N)
- One user → one role entry in user_roles (1:1)

---

## 6. API / Data Access Layer

This project uses **Supabase's auto-generated REST API and JavaScript SDK** rather than a custom
hand-written REST server. Every data operation goes through the `@supabase/supabase-js` client,
which calls PostgREST endpoints under the hood.

### Client-side queries (via TanStack Query hooks)

```ts
// src/hooks/useData.ts

// Fetch all projects
supabase.from("projects").select("*").order("created_at", { ascending: false })

// Fetch all tasks with assignee profile
supabase.from("tasks").select("*, assignee:profiles!tasks_assigned_to_fkey(id,full_name,email)")

// Create a task
supabase.from("tasks").insert({ title, project_id, assigned_to, status, priority, due_date })

// Update task status
supabase.from("tasks").update({ status }).eq("id", taskId)

// Delete a task
supabase.from("tasks").delete().eq("id", taskId)
```

### Server-side middleware

`src/integrations/supabase/auth-middleware.ts` — TanStack Start middleware that reads the
`Authorization: Bearer <token>` header and creates a server-side Supabase client with the user's
JWT, ensuring authenticated server-rendered responses.

### Security: Row-Level Security (RLS)

All access control is enforced at the PostgreSQL level via RLS policies in Supabase.  
Even if the frontend JavaScript were bypassed, the database rejects unauthorized queries.

---

## 7. Role-Based Access Control

| Action | Admin | Member |
|---|---|---|
| View dashboard | ✅ | ✅ |
| Create projects | ✅ | ✅ |
| Delete projects | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Delete any task | ✅ | ❌ (own only) |
| View team members | ✅ | ✅ |
| Manage roles | ✅ | ❌ |

Roles are stored in the `user_roles` table and fetched in `AuthContext` (`src/lib/auth-context.tsx`).
The `isAdmin` flag is exposed throughout the app via the `useAuth()` hook. The first user to sign up
into a Supabase project is automatically assigned the `admin` role via a database trigger.

---

## 8. Project Structure

```
ethara-orbit/
├── src/
│   ├── routes/               # File-based routing (TanStack Router)
│   │   ├── __root.tsx        # Root layout: providers, <head>, <Scripts>
│   │   ├── index.tsx         # Landing page (redirects to /dashboard if logged in)
│   │   ├── login.tsx         # Login form
│   │   ├── signup.tsx        # Signup form
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── _app.tsx          # Authenticated layout: Sidebar + TopBar + auth guard
│   │   └── _app/
│   │       ├── dashboard.tsx # Main dashboard with KPIs & charts
│   │       ├── projects.tsx  # Project list & creation
│   │       ├── tasks.tsx     # Kanban task board
│   │       ├── team.tsx      # Team member list
│   │       └── settings.tsx  # Profile & preferences
│   ├── components/
│   │   ├── ui/               # Radix-based component library (Button, Input, Dialog, etc.)
│   │   ├── auth/             # AuthShell (split-screen login/signup layout)
│   │   ├── Badges.tsx        # StatusBadge, PriorityBadge
│   │   ├── Logo.tsx          # App logo component
│   │   └── ThemeToggle.tsx   # Dark/light toggle
│   ├── hooks/
│   │   └── useData.ts        # TanStack Query hooks for projects, tasks, members
│   ├── lib/
│   │   ├── auth-context.tsx  # AuthProvider & useAuth hook (session, profile, role)
│   │   ├── theme-context.tsx # ThemeProvider
│   │   └── utils.ts          # cn() helper
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Browser Supabase client
│   │       ├── client.server.ts  # Server admin client (service role key)
│   │       ├── auth-middleware.ts # TanStack Start server middleware
│   │       └── types.ts          # Auto-generated DB types
│   └── styles.css            # Global Tailwind + CSS variables (dark-by-default theme)
├── .env.example              # Required environment variable template
├── vite.config.ts            # Vite + TanStack Start + Nitro config
├── package.json
├── railway.json              # Railway deployment config
├── nixpacks.toml             # Node 22 build environment
└── tsconfig.json
```

---

## 9. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project values.

```env
# Required — Supabase project URL
SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"

# Required — Supabase anon/publishable key (safe to expose in browser)
SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"

# Required — Supabase project ID (used for type generation)
VITE_SUPABASE_PROJECT_ID="<project-ref>"

# Optional — only needed for admin server-side operations
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

---

## 10. How to Run Locally

### Prerequisites
- Node.js >= 22
- A Supabase project (free tier works)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yuvikabhat/ethara-orbit.git
cd ethara-orbit

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and keys

# 4. Start development server
npm run dev
# Opens at http://localhost:3000
```

### Build for production

```bash
npm run build          # Generates .output/server/index.mjs
npm run start          # Runs the production server
```

---

## 11. Deployment

The application is configured for **Railway** deployment.

1. Push the repository to GitHub.
2. Create a new Railway project → "Deploy from GitHub repo".
3. Add all environment variables from `.env.example` in the Railway dashboard.
4. Railway auto-detects `railway.json` and runs:
   - **Build:** `npm ci && npm run build`
   - **Start:** `node .output/server/index.mjs`
5. Railway assigns a public URL automatically.

The app uses **nixpacks** with Node.js 22 as specified in `nixpacks.toml`.

---

## 12. Deviations from Original Assignment Spec

The original assignment asks for "REST APIs + Database (SQL/NoSQL)". This project fulfils the
intent of that requirement but uses a different approach than a hand-written REST server:

### What was done differently

| Aspect | Original Spec Expectation | What This Project Does | Why |
|---|---|---|---|
| Backend API | Custom REST server (Express / Flask / Spring Boot) | Supabase PostgREST auto-generated REST API | Supabase exposes a full, production-grade REST API automatically from the PostgreSQL schema. Every table supports `GET`, `POST`, `PATCH`, `DELETE` via HTTP. No custom routes needed for standard CRUD. |
| Database | SQL or NoSQL database | PostgreSQL (via Supabase) | PostgreSQL is a relational SQL database — fully satisfies the requirement. |
| Authentication | Custom JWT or session auth | Supabase Auth (JWT-based) | Supabase Auth issues standard JWTs and handles token refresh, just like a custom auth system would. |
| Framework | Typically SPA (React/Vue) + separate backend | TanStack Start (SSR) | TanStack Start is a full-stack React SSR framework. It renders pages on the server and ships hydrated HTML to the client — a step beyond a typical SPA. |
| Hosting | Usually local / any cloud | Railway (production cloud) | The app is deployable and runs live, not just locally. |

### Why this approach is valid

- The **Supabase REST API** satisfies "REST APIs" — the database is accessible via standard HTTP
  methods with proper authentication headers and JSON responses.
- **PostgreSQL with enforced schemas, foreign keys, and constraints** satisfies "proper validations
  & relationships" — at the database level, not just in JavaScript.
- **Row-Level Security (RLS)** in PostgreSQL satisfies "role-based access control" at the most
  secure possible layer — directly in the database engine.
- **Zod schemas** on every form add client-side + server boundary validation.

---

## 13. Known Limitations

- Search bar in the top navigation is **UI-only** (not wired to a query yet).
- Notification bell shows no data (UI placeholder).
- File/image attachments on tasks are not implemented.
- Real-time updates require a page refresh (Supabase Realtime subscriptions not added yet).
- Project invites are membership-based — no email invite link system.

---

*Built with TanStack Start, Supabase, and Tailwind CSS.*
