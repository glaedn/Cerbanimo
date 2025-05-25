# Cerbanimo Platform 🚀

## 🌟 Overview / Concept

Cerbanimo is a decentralized collaboration and project management platform designed with a captivating space-game aesthetic. Our core mission is to empower individuals and communities by providing tools that facilitate transparent, equitable, and engaging project execution.

The platform aims to redefine project management by:
*   **Decentralization:** Shifting away from central points of control to distribute authority and ownership.
*   **Stakeholder Equalization:** Creating a level playing field where all contributors have a voice and can earn reputation based on their work.
*   **Gamification:** Integrating game-like elements such as XP, leveling, and skill progression to make collaboration more engaging and rewarding.
*   **Reputation by Story:** Utilizing a "StoryNode" system where task histories and contributions build a verifiable and narrative-driven reputation for users.

## ✨ Key Features

Cerbanimo offers a suite of powerful features to enhance collaboration and project management:

*   **Project Graph Visualization:** Interactive, D3.js-based dependency maps that allow users to visualize project structures, task relationships, and progress in an intuitive graph format. (Derived from `ProjectVisualizer.jsx` and D3.js in tech stack)
*   **Task Lifecycle Management:** A clear and structured flow for tasks:
    *   **Claim:** Users can claim available tasks relevant to their skills.
    *   **Submit:** Upon completion, users submit tasks with proof of work.
    *   **Review & Approve:** Submitted tasks are reviewed (by project owners or designated reviewers) and then approved, triggering rewards and reputation updates. (Based on functions like `acceptTask`, `submitTask`, `approveTask`, `processReview` in `taskController.js`)
*   **XP, Leveling, and Skill-Based Progression:** Users earn Experience Points (XP) for completed tasks, allowing them to level up in specific skills. This progression unlocks new opportunities and signifies expertise within the platform. (Based on `approveTask` and `calculateLevel` in `taskController.js`)
*   **StoryNode System:** A comprehensive record-keeping mechanism where each completed task and its associated contributions (reflections, proof-of-work) are logged as "StoryNodes." These nodes form a rich history of a user's work and contribute to their overall reputation. (Derived from `models/story_nodes.js` and `storyChronicles` references)
*   **Chronicle Timeline:** A personal portfolio for each user, showcasing their completed tasks, StoryNodes, skill progression, and overall contributions. This serves as a verifiable track record and social proof of their capabilities and impact. (Derived from `ChronicleTimeline.jsx` and `UserPortfolio.jsx`)
*   **Resource Inventory & Civic Mode (Future Phases):** Planned features to introduce resource management within communities and a "Civic Mode" to tackle real-world challenges, extending the platform's collaborative capabilities.

## 🛠️ Tech Stack

Cerbanimo leverages a modern and robust technology stack:

*   **Frontend:**
    *   React (v18+) with JSX
    *   Material-UI (MUI v5+) for component library and styling
    *   Emotion for styling within JSX
    *   D3.js for complex data visualizations (e.g., project graphs)
    *   Redux Toolkit for state management
    *   React Router (v6+) for navigation
    *   Axios for HTTP requests
    *   Socket.io-client for real-time communication

*   **Backend:**
    *   Node.js with Express.js framework
    *   PostgreSQL as the primary database (with `pg` module)
    *   JSON Web Tokens (JWT) for authentication, integrated with Auth0
    *   Socket.io for real-time communication
    *   Multer for handling file uploads

*   **Styling:**
    *   Primarily MUI components with JSS/Emotion.
    *   Custom CSS for specific styling needs.
    *   (Note: Tailwind CSS is not currently used.)

*   **Deployment:**
    *   Target: Render
    *   Utilizes Docker for containerization and deployment (as suggested by `.github/workflows/bpushdocker.yml` and `renderdeploy.yml`).

*   **Future Integrations (Planned):**
    *   Blockchain technologies
    *   Smart contracts
    *   Recursive Proof-of-Work (PoW) concepts

## 💾 Database Schema (Current State)

The Cerbanimo platform uses a PostgreSQL database. Below is a summary of the key tables and their structures.

**Key Tables:**

*   **`users`**: Stores user account information.
    *   `id`: SERIAL PRIMARY KEY
    *   `username`: VARCHAR(50) UNIQUE NOT NULL
    *   `email`: VARCHAR(100) UNIQUE NOT NULL
    *   `password_hash`: TEXT NOT NULL (Note: Authentication is primarily handled by Auth0; this field might be for direct credential storage if implemented alongside Auth0 or for a different auth strategy.)
    *   `cotokens`: INTEGER (Collaboration Tokens earned by the user)
    *   `experience`: INTEGER[] (Array of completed task IDs, serving as a log)
    *   `token_ledger`: JSONB[] (Array of objects logging token transactions)
    *   `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

*   **`projects`**: Contains details about collaborative projects.
    *   `id`: INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (PRIMARY KEY)
    *   `name`: VARCHAR(100) NOT NULL
    *   `description`: TEXT
    *   `creator_id`: INTEGER (FK referencing `users.id`)
    *   `community_id`: INTEGER (FK referencing `communities.id`, ON DELETE SET NULL)
    *   `tags`: TEXT[]
    *   `token_pool`: INTEGER (Total tokens allocated to the project)
    *   `used_tokens`: INTEGER (Tokens spent on completed tasks)
    *   `reserved_tokens`: INTEGER (Tokens allocated to active/pending tasks)
    *   `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    *   `community_votes`: JSONB (Stores user votes if project is associated with a community)

*   **`tasks`**: Defines individual tasks within projects.
    *   `id`: INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (PRIMARY KEY)
    *   `name`: VARCHAR(100) NOT NULL
    *   `description`: TEXT
    *   `project_id`: INTEGER (FK referencing `projects.id`)
    *   `creator_id`: INTEGER (FK referencing `users.id`)
    *   `skill_id`: INTEGER (FK referencing `skills.id`)
    *   `assigned_user_ids`: INTEGER[] (Array of `users.id` assigned to the task. This is the primary way task assignments are handled.)
    *   `status`: `task_status` ENUM (Values: 'inactive-unassigned', 'inactive-assigned', 'active-unassigned', 'active-assigned', 'urgent-unassigned', 'urgent-assigned', 'submitted', 'completed')
    *   `reward_tokens`: INTEGER (Tokens awarded upon task completion, also used as XP)
    *   `dependencies`: INTEGER[] (Array of `tasks.id` that this task depends on)
    *   `proof_of_work_links`: TEXT[] (Array of URLs or text submitted as proof)
    *   `reflection`: TEXT (User's reflection upon task submission)
    *   `reviewer_ids`: INTEGER[] (Array of `users.id` assigned to review a submitted task)
    *   `approvals`: INTEGER[] (Array of `users.id` who approved the submission)
    *   `rejections`: INTEGER[] (Array of `users.id` who rejected the submission)
    *   `task_type`: VARCHAR(50) (e.g., 'project_task', 'resource_pickup')
    *   `related_resource_id`: INTEGER (FK referencing `resources.id`)
    *   `related_need_id`: INTEGER (FK referencing `needs.id`)
    *   `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    *   `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    *   `submitted_at`: TIMESTAMP

*   **`skills`**: Manages skills and user progression in those skills.
    *   `id`: SERIAL PRIMARY KEY
    *   `name`: VARCHAR UNIQUE NOT NULL
    *   `category`: VARCHAR
    *   `unlocked_users`: JSONB (Array of objects: `{ "user_id": INTEGER, "experience": INTEGER, "level": INTEGER }`. Tracks each user's progress in this skill.)

*   **`story_nodes`**: Logs completed tasks as narrative entries for user chronicles.
    *   `id`: SERIAL PRIMARY KEY
    *   `task_id`: INTEGER (FK referencing `tasks.id`)
    *   `user_id`: INTEGER (FK referencing `users.id` - the user who completed the task)
    *   `reflection`: TEXT
    *   `media_urls`: TEXT[] (Links to proof of work)
    *   `tags`: TEXT[] (Skills or keywords related to the task)
    *   `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

*   **`communities`**: Information about communities on the platform.
    *   (Schema inferred - likely `id` SERIAL PRIMARY KEY, `name` VARCHAR, `description` TEXT, `creator_id` INTEGER, etc.)

*   **`notifications`**: Stores user notifications.
    *   `id`: SERIAL PRIMARY KEY
    *   `user_id`: INTEGER (FK referencing `users.id`)
    *   `message`: TEXT
    *   `type`: VARCHAR (e.g., 'task', 'level_up')
    *   `task_id`: INTEGER (Optional, FK referencing `tasks.id`)
    *   `read`: BOOLEAN DEFAULT false
    *   `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

*   **Other tables** like `resources`, `needs`, `endorsements`, `badges`, `user_badges`, `token_transactions` exist to support various platform functionalities. Their detailed schemas can be explored in the `models/` directory.

**Relationships and Key Fields:**
*   Foreign Keys enforce relationships (e.g., `tasks.project_id` -> `projects.id`).
*   Arrays are used for one-to-many or many-to-many denormalized relationships (e.g., `tasks.assigned_user_ids`, `tasks.dependencies`).
*   The `user_tasks` join table found in `models/users.js` appears to be an alternative or older way of representing user-task assignments, with `tasks.assigned_user_ids` being the more integrated approach in current controller logic.

**XP and Level Formula:**
User level within a specific skill is calculated using the following formula, where `exp` is the total experience points accumulated for that skill:
```javascript
level = Math.floor(Math.sqrt(exp / 40)) + 1;
```

**Skill Unlocks and Matching:**
*   When a user completes a task, the `reward_tokens` from that task are added to their `experience` for the task's associated `skill_id`.
*   This update occurs within the `unlocked_users` JSONB array in the `skills` table. Each entry in this array is an object: `{ "user_id": <id>, "experience": <total_xp_for_skill>, "level": <calculated_level_for_skill> }`.
*   If a user completes their first task for a skill, a new object for that user is added to the `unlocked_users` array.
*   This system allows the platform to match users to relevant tasks based on the skills they've "unlocked" and their proficiency level in them.

## 📡 API Overview

Cerbanimo exposes a RESTful API for frontend communication and potentially for third-party integrations in the future.

**API Structure:**

The API is organized around major resources like projects, tasks, users (profile), skills, etc. Standard HTTP methods are used (GET, POST, PUT, DELETE).

**Authentication:**

*   API endpoints are secured using **token-based authentication (JWT)**.
*   Cerbanimo integrates with **Auth0** for identity management. Clients must obtain a JWT from Auth0 and send it as a Bearer token in the `Authorization` header of their requests to secured endpoints.
*   The backend verifies these tokens using the `express-oauth2-jwt-bearer` middleware, configured with the appropriate Auth0 audience and issuer URL.

**Sample Endpoints:**

Below are some representative examples of API endpoints. (Note: This is not an exhaustive list.)

*   **Auth:**
    *   `/auth/token` (or similar, typically handled by Auth0 SDK on frontend, backend verifies resulting JWT)
*   **Users/Profile:**
    *   `GET /profile`: Fetches the profile of the authenticated user.
    *   `PUT /profile`: Updates the profile of the authenticated user.
    *   `GET /profile/public/:userId`: Fetches a public version of a user's profile.
*   **Projects:**
    *   `GET /projects`: Lists projects (potentially with filters).
    *   `POST /projects`: Creates a new project.
    *   `GET /projects/:id`: Fetches details for a specific project.
    *   `PUT /projects/:id`: Updates a specific project.
*   **Tasks:**
    *   `GET /tasks?projectId=:id`: Fetches tasks for a given project.
    *   `GET /tasks/relevant`: Fetches tasks relevant to the user's skills.
    *   `POST /tasks`: Creates a new task within a project.
    *   `GET /tasks/:id`: Fetches details for a specific task.
    *   `PUT /tasks/:id`: Updates a specific task.
    *   `POST /tasks/:taskId/accept`: Allows a user to claim/accept a task.
    *   `POST /tasks/:taskId/submit`: Submits a completed task for approval (includes `proof_of_work_links`, `reflection`).
    *   `POST /tasks/:taskId/review?action=<approve|reject>`: Allows an assigned reviewer to vote on a submitted task. (Task approval might also be direct via a different endpoint for project owners).
    *   `POST /tasks/:taskId/drop`: Allows a user to drop an assigned task.
*   **Skills:**
    *   `GET /skills/all`: Fetches all available skills.
    *   `GET /skills?category=:categoryName`: Fetches skills by category.
*   **Story Chronicles / StoryNodes:**
    *   `POST /storyChronicles/story-node`: Creates a new story node (typically triggered internally after task approval).
    *   `GET /storyChronicles/user/:userId`: Fetches the story chronicle for a specific user.
*   **Notifications:**
    *   `GET /notifications`: Fetches notifications for the authenticated user.
    *   `POST /notifications/:id/read`: Marks a notification as read.

Error responses generally follow standard HTTP status codes (e.g., 400 for bad requests, 401 for unauthorized, 404 for not found, 500 for server errors) and include a JSON body with an `error` message.

## 👨‍💻 Dev Environment Setup

Follow these steps to set up and run the Cerbanimo platform locally for development.

**Prerequisites:**

*   **Node.js:** Version 18.x or later is recommended. You can use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.
*   **PostgreSQL:** A running PostgreSQL instance (version 12+ recommended). You can install it locally or use a Docker container.
*   **Git:** For cloning the repository.

**Environment Variables:**

You'll need to configure environment variables for both the frontend and backend.

*   **Backend (`backend/.env`):**
    Create a file named `.env` in the `backend/` directory with the following variables:
    ```env
    # PostgreSQL connection string
    POSTGRES_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME

    # Port for the backend server
    PORT=4000

    # Auth0 Configuration (replace with your Auth0 application details)
    AUTH0_AUDIENCE=your_auth0_api_audience
    AUTH0_ISSUER_BASE_URL=https://your_auth0_domain.auth0.com/
    ```

*   **Frontend (`src/.env` or root `.env` depending on Vite config):**
    Vite uses `.env` files in the root directory by default. Environment variables exposed to the client **must** be prefixed with `VITE_`.
    Create a file named `.env` in the project root with the following (if your frontend needs them):
    ```env
    # Example: API base URL for the frontend to connect to the backend
    VITE_API_BASE_URL=http://localhost:4000

    # Example: Auth0 details for the frontend SDK
    VITE_AUTH0_DOMAIN=your_auth0_domain.auth0.com
    VITE_AUTH0_CLIENT_ID=your_auth0_frontend_client_id
    VITE_AUTH0_AUDIENCE=your_auth0_api_audience
    ```
    *Note: Verify which frontend variables are actively used by checking `src/config/` or similar files and `import.meta.env` usage.*

**Setup Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd cerbanimo
    ```

2.  **Install Frontend Dependencies:**
    (In the project root directory)
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Set up PostgreSQL Database:**
    *   Ensure your PostgreSQL server is running.
    *   Create a database (e.g., `cerbanimo_dev`).
    *   Update the `POSTGRES_URL` in `backend/.env` with your database connection details.

5.  **Initialize Database Schema:**
    The platform attempts to create tables if they don't exist upon backend startup (see `backend/server.js` and `models/*.js`).
    *   The table creation logic within the model files (`createUserTable`, `createProjectTable`, etc.) and the `initializeDatabase` function in `backend/server.js` (though parts of it might be commented out) are responsible for this.
    *   Ensure these scripts are correctly configured if you need to auto-initialize the schema.
    *   **Note on Seeding:** Specific data seeding scripts (e.g., for initial skills, test users) were not explicitly found in the repository. If you need seed data, you might need to:
        *   Create custom SQL scripts.
        *   Add temporary code to `backend/server.js` to insert data after tables are created.
        *   Manually insert data using a PostgreSQL client.

6.  **Run the Backend Server:**
    (From the project root directory)
    ```bash
    node backend/server.js
    ```
    Alternatively, if a start script is added to `backend/package.json` (e.g., `"start": "node server.js"`), you can run `npm start` from within the `backend` directory. The server typically runs on `http://localhost:4000`.

7.  **Run the Frontend Development Server:**
    (From the project root directory, in a new terminal)
    ```bash
    npm run dev
    ```
    The frontend is typically served on `http://localhost:3000` or another port specified by Vite.

Once both servers are running, you should be able to access the Cerbanimo platform in your browser.

## 🤝 Contribution Guidelines

We welcome contributions to Cerbanimo! Here's how you can help:

**Code Formatting:**

*   This project uses ESLint to enforce code style and quality. You can find the configuration in `eslint.config.js`.
*   Before committing, please run the linter to catch any issues:
    ```bash
    npm run lint
    ```
*   Ensure your code adheres to the established patterns and styles found in the existing codebase.

**Finding Tasks & Suggesting Features:**

*   **Task Management:** We aim to manage tasks directly within the Cerbanimo platform itself once it reaches a stable operational state. Keep an eye on the project boards there!
*   **Feature Suggestions:** Ideas for new features or enhancements can also be proposed through the platform's designated channels (e.g., a specific project or forum for platform development).
*   **Bug Reports:** Please report bugs by creating an issue in the GitHub repository, providing as much detail as possible (steps to reproduce, environment, expected vs. actual behavior).

**Pull Requests:**

*   Before starting work on a major feature, please discuss it with the maintainers by opening an issue.
*   Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name` or `fix/your-bug-fix`.
*   Commit your changes with clear and descriptive messages.
*   Push your branch to your fork and submit a pull request to the main repository.
*   Ensure your PR includes a summary of the changes and links any relevant issues.

**Further Information:**

For more detailed contribution processes, coding standards, and community guidelines, we may establish a separate `CONTRIBUTING.md` file in the future. For now, please adhere to the guidelines above.

## 🗺️ Vision Roadmap

Cerbanimo is an evolving platform with a long-term vision to revolutionize decentralized collaboration.

**Currently Implemented:**

*   **Core Project & Task Management:** Creation, tracking, and visualization of projects and tasks.
*   **Task Lifecycle:** Support for task claiming, submission, and an approval/review workflow.
*   **XP, Leveling & Skill System:** Users can earn XP, level up in skills, and get matched to tasks based on their skill profiles. The `skills.unlocked_users` system is functional.
*   **StoryNode System:** Basic implementation for logging completed tasks and contributions to user chronicles.
*   **Chronicle Timeline:** Initial version of user portfolios for showcasing work and reputation.
*   **Token-based Authentication:** Secure access using Auth0 and JWTs.
*   **Real-time Notifications:** Basic notifications for key events using Socket.io.

**Active Development & Near-Term Goals:**

*   **Refinement of Core Features:** Continuously improving the UI/UX for project management, task handling, and user profiles.
*   **Enhanced Project Visualization:** Adding more features and interactivity to the D3.js based project graphs.
*   **Robustness and Scalability:** Strengthening the backend infrastructure and optimizing database queries.
*   **Expanded Gamification:** Introducing more diverse rewards, badges, and collaborative game mechanics.
*   **Community Features:** Developing more tools for community creation, governance, and interaction.

**Future Modules & Long-Term Vision:**

*   **Civic Mode:** A dedicated mode or set of features enabling communities to use Cerbanimo for tackling real-world local or global challenges, potentially integrating with resource and needs matching.
*   **Advanced Resource & Needs Management:** Comprehensive modules for listing, discovering, and matching resources and needs within and between communities.
*   **Federation Layer:** Enabling interoperability and collaboration between independent Cerbanimo communities or instances.
*   **Cross-Community Coalitions:** Tools to form alliances and joint ventures between different communities for larger scale projects.
*   **Blockchain Integration:** Exploring the integration of blockchain technologies for enhanced transparency, decentralized identity, and value exchange (e.g., tokenomics, smart contracts for task agreements).
*   **Recursive Proof-of-Work (PoW):** Investigating novel PoW mechanisms that could apply to the validation and value assessment of complex, multi-stage tasks.
*   **AI-Assisted Project Management:** Leveraging AI for features like automated task generation, risk assessment, and intelligent resource allocation.

## 📜 License and Contact Info
