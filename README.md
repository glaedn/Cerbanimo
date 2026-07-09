# Cerbanimo

A coordination platform for collaborative projects, civic communities, and collective action — built with a space-game aesthetic and a civic backbone.

Cerbanimo turns projects, tasks, skills, resources, and reputation into a living system where contribution leaves a verifiable trail.

## What Cerbanimo is

Cerbanimo is a full-stack coordination platform organized around four modes of engagement: **Orbit** (personal identity and skill progression), **Missions** (project and task coordination), **Commons** (community infrastructure and resource exchange), and **Signals** (governance, impact tracking, and civic intelligence). It includes a React frontend, an Express/PostgreSQL backend, Auth0-based authentication, Socket.io notifications, pg-boss for background job queues, and a layered AI system of named agents and intelligence engines.

## The four modes

### Orbit
The personal command center. Users manage their profile, skill constellation with XP progression, interest library, narrative identity, and chronicle of completed work. Includes a Coordinator HUD for operators and a narrative hub that surfaces contribution history as a structured story.

### Missions
Project and task coordination. Users create projects, claim tasks, submit and review work, track dependencies, and visualize project graphs. The task lifecycle covers claiming, submitting, reviewing, approving, and dropping. The Visualizer renders dependency-aware project graphs with task-level drill-down.

### Commons
Community infrastructure. Guilds, constellations, and communities are the primary collective units. The Commons also includes a resource and needs board, a marketplace with discovery feed, geo-proximity search, and logistics coordination, plus a needs-matching system that connects resources to declared community needs.

### Signals
Civic intelligence and governance. Each community can run a governance chamber with proposals, voting, and a civic constitution. Dispute courts, mediation spaces, civic simulators, delegation maps, a federation atlas for inter-community relationships, and an impact atlas for outcome tracking are all part of the Signals mode. The Civic Kernel Console provides a summary view across all civic activity.

## AI and agent layer

Cerbanimo includes a named-agent architecture backed by the Gemini and OpenAI APIs:

- **ConstitutionalAgent** — enforces community constitution rules on governance events
- **GovernanceAgent** — assists with proposal drafting, quorum logic, and vote resolution
- **FederationAgent** — coordinates cross-community relationships and treaties
- **CommunityAgent** — surfaces community health signals and member onboarding guidance
- **MissionAgent** — supports project scoping, task decomposition, and progress tracking
- **NeedAgent** — identifies unmet needs and proposes matching pathways
- **CoordinationAgent** — provides real-time coordination intelligence to individual users
- **UserGrowthAgent** — tracks skill progression and suggests next-step opportunities
- **DispatchAgent** — routes coordination events to the appropriate agent or service

A separate intelligence layer operates alongside the agents and includes: ContextEngine, CoordinationEngine, FrictionDetectionEngine, GuidanceEngine, NarrativeInferenceEngine, OpportunityEngine, RelevanceEngine, and TrustInferenceEngine. These power the `/intelligence/pulse` endpoint, which returns a personalized coordination summary for the authenticated user.

## Token and treasury system

Cerbanimo includes a token infrastructure covering:

- Community token wallets and ledger entries
- Token bridging, vesting, and decay schedules
- A treasury system for community-level fund allocation
- Skill bounties fundable with community tokens
- An exchange route and marketplace engine for resource-backed value flows
- Escrow and rewards logic tied to task completion

## What is implemented now

- **Projects and tasks** with dependency-aware graph visualization and full task lifecycle
- **Skill-based task routing** and XP progression
- **User portfolios, story nodes, and chronicles** for narrative reputation
- **Communities, guilds, and constellations** with health scoring and lifecycle management
- **Resources, needs, matching, and exchange** for non-task value flows
- **Marketplace** with discovery feed, geo-proximity (deck.gl + MapLibre), and logistics coordination
- **Impact tracking** via ImpactGraphService and stamped impact receipts
- **Verification module** for trust-backed claim validation
- **Task evidence and review bridge** for immutable evidence bundles, manifest v2 validation, manual validation review, peer Blessings, and PM Ritual Seal acceptance records
- **Game Master Mode API** for durable quest profiles, party assembly, narrative preferences, project invites, character callings, launch previews, and project chronicles for Kamiya
- **Services marketplace** for offering work as reusable services
- **Governance chamber** with proposals, voting, constitution management, civic simulation, mediation, and delegation
- **Dispute court** for structured conflict resolution
- **Federation atlas** for cross-community relationships
- **Real-time notifications** via Socket.io
- **Onboarding and profile flows** including interest and skill setup
- **Ambient audio layer** using Tone.js with scene-based routing
- **Mobile task views** and a mobile dashboard with bottom navigation
- **Admin dashboard** for platform-level operations
- **Discord integration** for community coordination
- **File storage** via Backblaze B2
- **Background job queues** via pg-boss

## Product surfaces

The repository includes frontend pages and components for:

- Orbit: profile, skill constellation, skill library, interest library, narrative hub, coordinator HUD, chronicle
- Missions: project pages, project creation, task browser, task review, project visualizer
- Commons: communities, community hub, community creation, guilds dashboard, guild hub, constellation hub, resources, needs, marketplace (feed, map, logistics)
- Signals: civic kernel console, governance chamber, constitution explorer, civic simulator, mediation space, delegation map, dispute court, impact atlas, federation atlas, activity map
- Global: onboarding, notifications, public portfolio, admin dashboard, mobile views

## Backend architecture

The backend is an Express application on PostgreSQL (via `pg`), with Auth0 JWT authentication on protected routes, Socket.io for live notifications, and pg-boss for durable background job queues. Background workers handle guild syncing, reward adjustment, scoring across projects and constellations, and agent-driven tasks. The AI gateway is an abstraction layer over Gemini and OpenAI that all agents and intelligence services consume.

### Backend route surface

authentication, profiles, projects, tasks, skills, rewards, notifications, communities, story chronicles, endorsements, resources, needs, matching, exchange, impact, services, onboarding, guilds, constellations, verification, story engine, governance, federation, civic kernel, treasury, wallets, bounties, solidarity, spatial operations, crisis, discord configuration, integrations, intelligence, admin, narrative

## Tech stack

### Frontend
- React 18 / Vite
- React Router v6
- Redux Toolkit + Zustand
- MUI v6 + Emotion
- D3.js
- deck.gl + MapLibre GL (geo visualization)
- React Force Graph (graph visualization)
- Socket.io client
- Axios / TanStack Query
- Framer Motion
- Tone.js (ambient audio)
- React Markdown

### Backend
- Node.js / Express
- PostgreSQL / NeonDB (`pg`)
- Auth0 / JWT
- Socket.io
- pg-boss (background job queues)
- Gemini API (`@google/generative-ai`)
- OpenAI SDK
- Multer / Backblaze B2 (file storage)
- Discord.js
- ethers.js (crypto infrastructure)
- node-cron

## Database model, at a glance

The data model centers on users, projects, tasks, skills, story nodes, chronicles, communities, guilds, constellations, resources, needs, notifications, and token ledger entries. It uses arrays and JSONB fields for flexible relationships including task dependencies, assigned users, proof-of-work links, skill progress records, and governance state.

## Local development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Auth0 application credentials
- Gemini API key (and optionally OpenAI API key) for AI-assisted features

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
OPENAI_API_KEY=your_openai_api_key
AUTH0_DOMAIN=your_auth0_domain
AUTH0_AUDIENCE=your_auth0_audience
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

The Vite app runs on `http://localhost:3000` and the API runs on `http://localhost:4000` by default.

## Available scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run test:e2e
```

## Deployment

The repository includes Render configuration for a split deployment: a Node backend service and a static Vite frontend. The config publishes the frontend from `dist` and routes the app to the backend through `VITE_BACKEND_URL`.

## Roadmap

Near-term priorities include stronger community tooling, richer task intelligence surfacing through the coordination pulse, more resilient governance flows, and deeper resource and impact matching.

Longer-term directions include:

- token economy with community swap markets and skill bounty pools
- federation between communities with treaty enforcement
- cross-community coalitions and solidarity mechanics
- civic mode for real-world coordination
- blockchain-backed value exchange (ethers.js groundwork is in place)
- advanced reputation and proof systems
- expanded AI-assisted project orchestration

## Contributing

Pull requests are welcome. Keep changes aligned with the current architecture, run linting before opening a PR, and include reproduction steps when reporting bugs.

## License

This project is licensed under the BSD 3-Clause License.
