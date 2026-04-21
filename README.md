# Cerbanimo Platform 🚀

## 🌟 Overview / Concept

Cerbanimo is a decentralized collaboration and project management platform designed with a captivating space-game aesthetic. Our core mission is to empower individuals and communities by providing tools that facilitate transparent, equitable, and engaging project execution.

The platform aims to redefine project management by:
*   **Decentralization:** Shifting away from central points of control to distribute authority and ownership.
*   **Stakeholder Equalization:** Creating a level playing field where all contributors have a voice and can earn reputation based on their work.
*   **Gamification:** Integrating game-like elements such as XP, leveling, and skill progression to make collaboration more engaging and rewarding.
*   **Guilds & Constellations:** Organized structures for specialized skill groups (Guilds) and multi-community project alliances (Constellations).
*   **Reputation by Story:** Utilizing a "StoryNode" system where task histories and contributions build a verifiable and narrative-driven reputation for users.

## ✨ Key Features

Cerbanimo offers a suite of powerful features to enhance collaboration and project management:

*   **Project Graph Visualization:** Interactive, D3.js-based dependency maps that allow users to visualize project structures, task relationships, and progress in an intuitive graph format.
*   **Guilds & Skill Mastery:** Skill-specific hubs where users can level up, track collective metrics, and find relevant tasks. Guilds represent specialized domains like "Neural Engineering" or "Galactic Logistics."
*   **Constellations:** Dynamic alliances formed between communities and projects to achieve shared large-scale objectives. Supports cross-community resource pledges and joint task management.
*   **Impact Atlas:** A global visualization of how tasks and projects contribute to real-world outcomes. The Impact Graph traces the lineage of contribution from individual actions to overarching goals.
*   **Services Marketplace:** Enables project creators to designate their projects as "Services," allowing others to purchase and instantiate project templates using Galactic Credits (cotokens).
*   **Task Lifecycle Management:** A structured flow for tasks (Claim -> Submit -> Review -> Approve), triggering rewards and reputation updates.
*   **XP, Leveling, and Skill-Based Progression:** Users earn Experience Points (XP) for completed tasks, unlocking new opportunities and signifying expertise within the platform.
*   **StoryNode & Chronicle:** Every contribution is logged as a "StoryNode," forming a rich narrative-driven portfolio (Chronicle) for each user.
*   **Mobile HUD (Rezzler):** A mobile-optimized interface featuring a streamlined dashboard and specialized task management views for on-the-go collaboration.

## 🛠️ Tech Stack

Cerbanimo leverages a modern and robust technology stack:

*   **Frontend:**
    *   React (v18+)
    *   Material-UI (MUI v6) for components
    *   Framer Motion for smooth UI transitions and animations
    *   D3.js & React-Force-Graph for complex data visualizations
    *   Redux Toolkit for state management
    *   Lucide React for iconography

*   **Backend:**
    *   Node.js & Express.js
    *   PostgreSQL (with `pg` module) for relational data
    *   Socket.io for real-time notifications and updates
    *   Gemini AI (Google Generative AI) for intelligent task routing and project health scoring
    *   Auth0 for secure identity management

*   **Testing & Tooling:**
    *   Vitest for backend unit and integration testing
    *   Playwright for end-to-end testing
    *   Vite for extremely fast frontend builds

## 💾 Database Schema (Core Tables)

### V1 Foundations
*   **`users`**: Account info, `cotokens` (Galactic Credits), and `token_ledger`.
*   **`projects`**: Project metadata, `is_service` status, and `token_pool`.
*   **`tasks`**: Task details, `status`, `dependencies`, and `reward_tokens`.
*   **`skills`**: Skill definitions and the `unlocked_users` progress array.
*   **`story_nodes`**: Narrative logs of completed tasks.

### V2 Impact & Coordination
*   **`outcomes`**: Plain-language statements of intended real-world effects.
*   **`impact_nodes` / `impact_edges`**: The graph structure connecting tasks, projects, and outcomes.
*   **`guilds`**: Skill-based organization metadata.
*   **`guild_memberships`**: Links users to guilds with roles (Apprentice to Mentor).
*   **`constellations`**: Metadata for multi-entity alliances and shared objectives.
*   **`constellation_members`**: Tracks which projects or communities are part of a constellation.

## 📡 API Overview

The API is structured around resources like `/projects`, `/tasks`, `/guilds_v2`, `/constellations_v2`, and `/impact_v2`.

*   **Authentication:** All secured routes require a JWT from Auth0.
*   **Intelligence:** Background workers automatically calculate `priority_score` for tasks and `health_score` for projects using the Gemini AI service.
*   **Marketplace:** `POST /services/:projectId/purchase` handles cloning project templates for buyers.

## 👨‍💻 Dev Environment Setup

### Prerequisites
*   **Node.js:** v18+
*   **PostgreSQL:** Local or hosted (e.g., Neon)
*   **Auth0 Account:** For authentication configuration

### Environment Variables
**Backend (`backend/.env`):**
```env
POSTGRES_URL=your_postgres_url
PORT=4000
AUTH0_AUDIENCE=your_audience
AUTH0_ISSUER_BASE_URL=your_issuer_url
GEMINI_API_KEY=your_google_ai_key
BACKEND_URL=http://localhost:4000
```

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_client_id
```

### Installation & Run
1. `npm install` (Root & Backend)
2. `node backend/server.js` (Start Backend)
3. `npm run dev` (Start Frontend)

## 🤝 Contribution Guidelines

*   **Linting:** `npm run lint` before committing.
*   **Testing:** Run `npx vitest` in the `backend` directory for logic changes.
*   **Workflow:** Branch from `main`, use descriptive names like `feature/new-guild-view`.

## 🗺️ Vision Roadmap

*   **[Active] Impact Tracing:** Refining the connection between granular tasks and high-level outcomes.
*   **[Active] AI-Assisted Governance:** Using LLMs to assist in reviewing task submissions and resolving disputes.
*   **[Planned] Civic Mode:** Tools for physical-world community coordination and resource management.
*   **[Planned] DAO Integration:** Transitioning community governance to on-chain smart contracts.
