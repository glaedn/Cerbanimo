# Cerbanimo

A decentralized collaboration platform with a space-game skin and a civic backbone.
Cerbanimo turns projects, tasks, skills, resources, and reputation into a living constellation where contribution leaves a trail, not a rumor.

## What Cerbanimo is

Cerbanimo is a full-stack collaboration system for building projects with shared ownership, skill-based task routing, narrative reputation, and real-time coordination. The current codebase includes a React frontend, an Express and PostgreSQL backend, Auth0-based authentication, Socket.io notifications, and a growing set of roadmap-oriented services for guilds, constellations, resources, impact, verification, and story generation.

## Core ideas

- **Decentralized coordination**: projects are designed to be governed by contributors, communities, and shared structures rather than a single control tower.
- **Stakeholder equalization**: work, approval, and reputation are tied to contribution.
- **Gamified progress**: users earn tokens, XP, levels, and skill unlocks.
- **Reputation by story**: completed work becomes Chronicle and StoryNode data that can be surfaced as a portfolio of proof.

## What is implemented now

Cerbanimo already supports a broad operational surface:

- **Projects and tasks** with dependency-aware visualization.
- **Task lifecycle** flows for claiming, submitting, reviewing, approving, and dropping work.
- **Skill-based matching** and XP progression.
- **User portfolios and chronicles** for narrative reputation.
- **Communities, guilds, and constellations** as higher-order coordination layers.
- **Resources, needs, matching, and exchange** for value beyond tasks.
- **Impact and verification modules** for tracking outcomes and trust.
- **Services marketplace logic** for offering project work as reusable services.
- **Real-time notifications** through Socket.io.
- **Onboarding and profile flows** for user setup and public identity.
- **Mobile-oriented views** and specialized HUD-style interfaces for the space-game experience.

## Product surfaces in the repo

The repository already contains frontend pages and components for:

- project visualization and task editing
- user portfolios and public profiles
- community and guild dashboards
- constellation and impact views
- resource and need management
- onboarding, notifications, and mobile task views
- HUD-style panels, activity maps, and skill galaxy exploration

## Backend architecture

The backend is an Express app mounted on PostgreSQL via `pg`, with Auth0 JWT checks on protected routes and Socket.io for live user notifications. It also includes scheduled background workers for tasks such as guild syncing, reward adjustment, and scoring across projects, guilds, and constellations.

The backend route surface currently includes modules for:

- authentication
- profiles
- projects
- tasks
- skills
- rewards
- notifications
- communities
- story chronicles
- endorsements
- resources and needs
- matching and exchange
- impact
- services
- onboarding
- guilds, constellations, verification, and story engine v2 routes

## Tech stack

### Frontend
- React 18
- Vite
- React Router
- Redux Toolkit
- MUI
- Emotion
- D3.js
- Socket.io client
- Axios
- Framer Motion
- React Markdown and supporting UI libraries

### Backend
- Node.js
- Express
- PostgreSQL
- `pg`
- Auth0 / JWT verification
- Socket.io
- Multer
- Node cron
- Generative AI integrations for task and story generation

### Styling and motion
- MUI components
- Custom CSS
- Animation helpers and motion libraries for a polished, game-like feel

## Database model, at a glance

Cerbanimo’s data model centers on users, projects, tasks, skills, story nodes, chronicles, communities, resources, needs, notifications, and token transactions. The platform also uses arrays and JSONB fields in several places to support flexible relationships, such as task dependencies, assigned users, proof-of-work links, and skill progress records.

## Local development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Auth0 application credentials
- A Gemini API key for AI-assisted features

### Install

```bash
npm install
cd backend && npm install
```

### Environment variables

Root `.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

`backend/.env`:

```env
PORT=4000
DATABASE_URL=your_database_url
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
GEMINI_API_KEY=your_gemini_api_key
```

### Run locally

Start the backend:

```bash
node backend/server.js
```

Start the frontend:

```bash
npm run dev
```

By default, the Vite app runs on `http://localhost:3000` and the API runs on `http://localhost:4000`.

## Available scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run test:e2e
```

## Deployment

The repository includes Render configuration for a split deployment:

- a Node backend service
- a static Vite frontend

The current config is set up to publish the frontend from `dist` and point the app at the backend through `VITE_BACKEND_URL`.

## Roadmap

Cerbanimo is moving toward a larger civic operating system for collaborative work. The near-term path includes stronger community tooling, richer task intelligence, more resilient governance flows, and deeper resource and impact matching.

Longer-term directions include:

- federation between communities
- cross-community coalitions
- civic mode for real-world coordination
- blockchain-backed value exchange
- advanced reputation and proof systems
- AI-assisted project orchestration

## Contributing

Pull requests are welcome. Please keep changes aligned with the current architecture, run linting before opening a PR, and include reproduction steps when reporting bugs.

## License

This project is licensed under the BSD 3-Clause License.
