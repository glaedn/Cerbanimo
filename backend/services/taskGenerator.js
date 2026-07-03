// services/taskGenerator.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

function getGeminiModel(envName) {
  return genAI.getGenerativeModel({
    model: process.env[envName] || DEFAULT_GEMINI_MODEL,
  });
}

async function generateContentWithTimeout(model, payload) {
  const timeoutMs = Number.parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || "60000", 10);
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([model.generateContent(payload), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Shared JSON parsing helper
export const parseLLMJsonResponse = (text) => {
  // Look for the start of the JSON object or array
  let jsonStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");

  if (jsonStart === -1 || (arrayStart !== -1 && arrayStart < jsonStart)) {
    jsonStart = arrayStart;
  }

  if (jsonStart === -1) {
    throw new Error("No JSON object/array found in response");
  }

  // Look for the end of the JSON object or array
  let jsonEnd = -1;
  if (text.charAt(jsonStart) === "{") {
    jsonEnd = text.lastIndexOf("}");
  } else if (text.charAt(jsonStart) === "[") {
    jsonEnd = text.lastIndexOf("]");
  }

  if (jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error("Valid JSON object/array end not found in response");
  }

  const jsonString = text.slice(jsonStart, jsonEnd + 1);

  // Clean the string of any non-printable characters, but preserve whitespace
  const cleanJsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

  return JSON.parse(cleanJsonString);
};

const parseLLMTasksResponse = (text) => {
  const data = parseLLMJsonResponse(text);
  if (!data.tasks || !Array.isArray(data.tasks)) {
    throw new Error("Tasks array missing or invalid in LLM response");
  }
  return data.tasks;
};

export const normalizeTaskImpactWeights = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const parsedWeights = tasks.map((task) => {
    const parsed = Number(task.impact_weight);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });
  const total = parsedWeights.reduce((sum, weight) => sum + weight, 0);
  const baseWeights = total > 0
    ? parsedWeights.map((weight) => (weight / total) * 100)
    : tasks.map((task) => {
      const reward = Number(task.reward_tokens);
      return Number.isFinite(reward) && reward > 0 ? reward : 1;
    });
  const baseTotal = baseWeights.reduce((sum, weight) => sum + weight, 0) || tasks.length;

  let roundedWeights = baseWeights.map((weight) => Math.floor((weight / baseTotal) * 100));
  let remainder = 100 - roundedWeights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  while (remainder > 0 && roundedWeights.length > 0) {
    roundedWeights[cursor % roundedWeights.length] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return tasks.map((task, index) => ({
    ...task,
    impact_label: task.impact_label || task.impact_statement || `Contributes to the project outcome through: ${task.name}`,
    impact_weight: roundedWeights[index],
  }));
};

export const TASK_AUTOMATION_CLASSIFICATION_PROMPT = `
Task automation classification is eligibility only. It never grants capability, authorization, confirmation, execution, or validation permission.

For every task, include these fields:
- "automation_classification": exactly one of "human_driven", "assisted_automation", "fully_automatable".
- "automation_confidence": number from 0 to 1.
- "automation_rationale": one short user-safe sentence. Do not include hidden reasoning or chain-of-thought.
- "required_human_inputs": array. Use [] unless the task is assisted_automation.
- "automation_requirements": object with optional arrays "capabilities", "tools", "externalServices", "permissions", "expectedArtifacts", optional number "estimatedDurationMinutes", and "networkAccess" as "none", "restricted", or "required".
- "validation_requirements": array of objects with "requirementId", "description", "proofTypes", and "checks".

Classification rules:
- Use "human_driven" when work requires physical presence, local delivery, direct interpersonal care, governance decisions, conflict mediation, legal/medical/safety-critical judgment, money or token commitments, secrets without approved references, public communication without approval, or unspecified account access.
- Use "assisted_automation" when automation can help but a person must supply inputs, select authorization, provide repository/source/audience/acceptance criteria, or review before external effects. Assisted tasks must include at least one required_human_inputs item.
- Use "fully_automatable" only for bounded digital work with no missing human inputs, at least one capability requirement, and at least one expected artifact. Do not invent credentials, account access, repository availability, or installed tools.
Allowed required_human_inputs inputType values: text, long_text, number, boolean, date, url, repository, file, choice, secret_reference, approval.
`;

export const generateProjectIdea = async (skills, interests, primeDirective = "") => {
  const skillsString = JSON.stringify(skills);
  const interestsString = JSON.stringify(interests);

  const userPrompt = `
    Context Parameters Provided:
    Skills: ${skillsString}
    Interests: ${interestsString}
    Prime Directive (User motivations/goals): ${primeDirective}

    Instructions for AI Generation:
    Using the provided skills and interests, generate a unique project name that reflects this synergy.
    Then create a descriptive project plan whose scope utilizes those skills towards advancing those interests as much as possible.
    Try to limit the scope to mostly needing only the skills the user has listed.
    Format your response as JSON with keys Name and Description.
  `;

  //const systemPrompt = "You are a helpful assistant that generates project ideas.";

  try {
    const model = getGeminiModel("GEMINI_PROJECT_PLAN_MODEL");
    const result = await generateContentWithTimeout(model, userPrompt);
    const response = await result.response;
    const responseText = response.text();

    const data = parseLLMJsonResponse(responseText);
    if (!data.Name || !data.Description) {
      throw new Error("LLM response missing Name or Description for project idea.");
    }
    return data;
  } catch (error) {
    console.error("Error generating project idea:", error);
    throw new Error(`Failed to generate project idea: ${error.message}`);
  }
};

export const autoGenerateSubtasks = async (
  tasks,
  projectName,
  projectDescription,
  tags,
  creator_id
) => {
  const formattedTasks = tasks
    .map((task, index) => {
      return `Task ${index + 1}:
Name: ${task.name}
Description: ${task.description}
Related Skill: ${task.skill_name || "None"}`;
    })
    .join("\n\n");

  const userPrompt = `
For each task below, return a **JSON object** containing deconstructed, granular subtasks.

Tasks to granularize:

${formattedTasks}

Here are the rules:
- All IDs (project IDs, task IDs) must be **unique, sequential integers starting at 1**.
- Maintain **relationships**: 
  - "project_id" in tasks must match the corresponding project's new ID.
  - "skill_name" should be the name of a skill. Use existing common ones or create highly descriptive new ones if needed.
  - "dependencies" in tasks must reference the correct **new task IDs**.
- Output data in **JSON format**, with **one array per table** (projects, tasks).

Example skills you can use or be inspired by:
- Web Development
- Graphic Design
- Project Management
- Public Speaking
- Data Analysis
- Social Media Marketing
- Research
- Conflict Resolution

Skill Level Guidelines:
The platform uses a skill level system where 10 XP equals 1 hour of labor.
Examples of total labor required to reach a specific level:
- Level 1: 0 hours (Start)
- Level 10: 324 hours (approx. 3240 XP)
- Level 20: 1444 hours (approx. 14440 XP)

Assign a "skill_level" to each task based on the complexity and the expertise required. 0 is for entry-level tasks.

Input:

Projects
[
  { "name": "${projectName}", "description": "${projectDescription}", "tags": ["${tags}"], "creator_id": "${creator_id}" }
]

Expected Output Format:

{
  "projects": [
    { "id": 1, "name": "${projectName}", "description": "${projectDescription}", "tags": ["tag1", "tag2"], "creator_id": ${creator_id} } 
  ],
  "tasks": [
    {
      "id": 1,
      "name": "Subtask Name",
      "description": "Detailed description of subtask",
      "project_id": 1,
      "skill_name": "Skill Name",
      "skill_level": 1,
      "resource_requirements": ["Equipment A", "Space B"],
      "dependencies": [],
      "reward_tokens": 80
    },
    { "id": 2, "name": "Another Subtask", "description": "Description", "project_id": 1, "skill_name": "Skill Name", "skill_level": 2, "dependencies": [1], "reward_tokens": 120 }
  ]
}


Notes:

ONLY return the JSON object described.
Dependencies are the IDs of the tasks that must be completed before this task can be started. There can be multiple.
Include "resource_requirements" (array of strings) for each task if labor alone is not sufficient.
`;
  //const systemPrompt = "You are an expert project manager and task engineer.";

  try {
    const model = getGeminiModel("GEMINI_TASK_GRAPH_MODEL");

    // Maximize the capability of the call with targeted configuration
    const generationConfig = {
      responseMimeType: "application/json", // Hard-forces valid JSON schema focus
      temperature: 0.55,                    // Slightly lower for less generic, more precise details                // Open up the ceiling so it doesn't rush to finish the array

      thinkingConfig: {
        thinkingLevel: 'MEDIUM'             // Escalates reasoning to track your complex ID/dependency graph
      }
    };

    const result = await generateContentWithTimeout(model, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: generationConfig
    });

    const response = await result.response;
    const text = response.text();
    console.log("LLM response:", text);

    // Attempt to safely parse JSON from LLM output
    const data = parseLLMJsonResponse(text);
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error("Tasks array missing or invalid in LLM response");
    }
    return data;
  } catch (err) {
    console.error("Failed to parse LLM response for subtasks:", err);
    throw new Error("Failed to parse tasks from LLM output for subtasks");
  }
};

export const NEED_PROMPT = `
Your objective is to take the given need description and intended outcome and output the tasks and dependencies necessary to fulfill this complex need.
You will generate output for the following database tables: projects and tasks.

The "project" in this case is a hidden coordination structure for the need.

Rules:
- All IDs (project IDs, task IDs) must be unique integers starting at 1.
- "project_id" in tasks must match the corresponding project's new ID.
- "skill_name" in tasks must be the name of a skill.
- "dependencies" in tasks must reference the correct new task IDs.
- Timeline Awareness: Distribute tasks logically.
- Output data in JSON format, with one array per table (projects, tasks).
- For every task, include:
  - "impact_label": how this task helps fulfill the need.
  - "impact_weight": integer 0-100.
  - "is_local": boolean (true if the task requires physical presence/local routing, false otherwise).
- The sum of all task impact_weight values must equal 100.
- Reward Scaling: Assign base reward tokens (50-150 range). Note: these will be scaled later.
${TASK_AUTOMATION_CLASSIFICATION_PROMPT}
`;

export const autogeneratePlan = async (
  projectName,
  projectDescription,
  tags,
  creator_id,
  project_due_date = null,
  outcomeStatement = '',
  context = 'project_generation'
)  => {
  const now = new Date().toISOString();
  let userPrompt = '';

  userPrompt =  ` 
  Current Date/Time: ${now}
  Project Name: ${projectName}
  Initial Description: ${projectDescription}
  Interest tags: ${tags}
  Required Before: ${project_due_date || 'None provided'}
  Intended Outcome: ${outcomeStatement || 'None provided'}
  
  Your objective is to act as an elite Strategic Project Architect.
  Generate a comprehensive, robust, and deep textual project plan in Markdown format.

  The plan must include:
  1. Executive Summary: High-level overview of the strategic approach.
  2. Phased Roadmap: Break down the project into logical phases (e.g., Research, Development, Launch, Optimization).
  3. Risk Mitigation: Identify potential bottlenecks and how to navigate them.
  4. Success Metrics: Clear KPIs beyond just "completion".

  Maximize depth and tactical detail. This plan will serve as the foundation for granular task generation.
  `
  try {
    const model = getGeminiModel("GEMINI_PROJECT_PLAN_MODEL");

    // Maximize the capability of the call with targeted configuration
    const generationConfig = {
      temperature: 0.55,                    // Slightly lower for less generic, more precise details
      maxOutputTokens: 2048,                 // Open up the ceiling so it doesn't rush to finish the plan
    };

    const result = await generateContentWithTimeout(model, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: generationConfig
    });
    const response = await result.response;
    const responseText = response.text();

    // The LLM's output is the robust textual project plan
    const projectPlan = responseText;
    console.log(`Generated project plan for "${projectName}":\n${projectPlan}`);

    // Call autoGenerateTasks with the new plan as context, passing all other variables
    const taskData = await autoGenerateTasks(
      projectName,
      projectPlan,
      tags,
      creator_id,
      project_due_date,
      outcomeStatement,
      context
    );

    return {
      ...taskData,
      projectPlan: projectPlan
    };
  } catch (error) {
    console.error("Error generating tasks:", error);
    throw new Error(`Failed to generate tasks: ${error.message}`);
  }
};

export const autoGenerateTasks = async (
  projectName,
  projectDescription,
  tags,
  creator_id,
  project_due_date = null,
  outcomeStatement = '',
  context = 'project_generation'
) => {
  const now = new Date().toISOString();
  let userPrompt = '';

  if (context === 'need_fulfillment') {
    userPrompt = `
${NEED_PROMPT}

Current Date/Time: ${now}
Need Title: ${projectName}
Description: ${projectDescription}
Required Before: ${project_due_date || 'None provided'}
Intended Outcome: ${outcomeStatement || 'None provided'}

Expected Output Format:
{
  "projects": [
    { "id": 1, "name": "${projectName}", "description": "${projectDescription}", "tags": ["${tags}"], "creator_id": ${creator_id}, "due_date": "${project_due_date || ''}" }
  ],
  "tasks": [
    { "id": 1, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 1, "dependencies": [], "reward_tokens": 80, "start_date": "${now}", "due_date": "${project_due_date || ''}", "impact_label": "...", "impact_weight": 50, "is_local": true }
  ]
}
`;
  } else {
    userPrompt = `
Your objective is to take the provided Project Name, Intended Outcome, and the Strategic Project Plan below, and deconstruct them into a highly granular, execution-ready task graph.

Strategic Project Plan:
${projectDescription}

Current Date/Time: ${now}
Intended Outcome: ${outcomeStatement || 'None provided'}

Here are the rules for task generation:
- All IDs (project IDs, task IDs) must be **unique integers starting at 1**.
- Maintain **relationships**: 
  - "project_id" in tasks must match the corresponding project's new ID.
  - "skill_name" in tasks must be the name of a skill. You can use existing common ones or freely generate new ones that fit. This is REQUIRED for every task.
  - "dependencies" in tasks must reference the correct **new task IDs**.
- **Timeline Awareness**: Distribute tasks across time so the project completes by the due date.
  - Assign each task a logical start_date and due_date based on dependencies.
  - The project starts TODAY (${now}).
  - Use ISO 8601 format for dates (YYYY-MM-DDTHH:mm:ssZ).
  - If no project due date is provided, distribute tasks over a reasonable 30-day window starting from today.
  - Ensure task dates are sequential and respect dependencies (a task cannot start before its dependencies are finished).
- Output data in **JSON format**, with **one array per table** (projects, tasks).
- For every task, include:
  - "impact_label": one concise sentence explaining how that task contributes to the intended outcome.
  - "impact_weight": an integer from 0 to 100 representing that task's share of the total project impact.
  - "is_local": boolean (true if the task requires physical presence or local routing, false if it can be done globally/remotely).
- The sum of all task impact_weight values for this project must equal exactly 100.
${TASK_AUTOMATION_CLASSIFICATION_PROMPT}

Example skills you can use or be inspired by:
- Web Development
- Graphic Design
- Project Management
- Public Speaking
- Data Analysis
- Social Media Marketing
- Research
- Conflict Resolution

Skill Level Guidelines:
The platform uses a skill level system where 10 XP equals 1 hour of labor.
Examples of total labor required to reach a specific level:
- Level 1: 0 hours (Start)
- Level 10: 324 hours (approx. 3240 XP)
- Level 20: 1444 hours (approx. 14440 XP)

Assign a "skill_level" to each task based on the complexity and the expertise required. 0 is for entry-level tasks.

Input:

Projects
[
  { "name": "${projectName}", "description": "${projectDescription}", "tags": ["${tags}"], "creator_id": "${creator_id}", "due_date": "${project_due_date || 'None provided'}" }
]

Expected Output Format:

{
  "projects": [
    { "id": 1, "name": "${projectName}", "description": "${projectDescription}", "tags": ["tag1", "tag2"], "creator_id": ${creator_id}, "due_date": "${project_due_date || ''}" }
  ],
  "tasks": [
    { "id": 1, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 1, "dependencies": [], "reward_tokens": 80, "start_date": "2025-01-01T09:00:00Z", "due_date": "2025-01-05T17:00:00Z", "impact_label": "This task establishes the baseline needed to reach the outcome.", "impact_weight": 30, "is_local": false, "automation_classification": "human_driven", "automation_confidence": 0.7, "automation_rationale": "This task requires a person to make accountable decisions.", "required_human_inputs": [], "automation_requirements": {}, "validation_requirements": [] },
    { "id": 2, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 2, "dependencies": [1], "reward_tokens": 120, "start_date": "2025-01-06T09:00:00Z", "due_date": "2025-01-10T17:00:00Z", "impact_label": "This task delivers the main user-facing change tied to the outcome.", "impact_weight": 45, "is_local": false, "automation_classification": "assisted_automation", "automation_confidence": 0.7, "automation_rationale": "Kamiya can help after repository and acceptance criteria are supplied.", "required_human_inputs": [{ "key": "repository", "label": "Repository", "description": "Repository to work in.", "inputType": "repository", "required": true, "sensitive": false }], "automation_requirements": { "capabilities": ["github.generate_pull_request"], "tools": ["git"], "externalServices": ["github"], "permissions": ["repository:read"], "expectedArtifacts": ["pull-request-draft"], "networkAccess": "restricted" }, "validation_requirements": [{ "requirementId": "review", "description": "Human review before external effects.", "proofTypes": ["review_note"], "checks": ["human_approval"] }] },
    { "id": 3, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 1, "dependencies": [1,2], "reward_tokens": 60, "start_date": "2025-01-11T09:00:00Z", "due_date": "2025-01-15T17:00:00Z", "impact_label": "This task verifies and stabilizes the outcome.", "impact_weight": 25, "is_local": false, "automation_classification": "fully_automatable", "automation_confidence": 0.8, "automation_rationale": "The task is bounded digital verification with explicit output.", "required_human_inputs": [], "automation_requirements": { "capabilities": ["github.run_quality_checks"], "tools": ["git", "npm"], "externalServices": ["github"], "permissions": ["repository:read", "checks:run"], "expectedArtifacts": ["quality-check-report"], "networkAccess": "restricted" }, "validation_requirements": [{ "requirementId": "checks", "description": "Command result is captured.", "proofTypes": ["automation_log", "command_result"], "checks": ["exit_code_recorded"] }] }
  ]
}


Notes:

ONLY return the JSON object described.
Dependencies are the IDs of the tasks that must be completed before this task can be started. There can be multiple.
`;
  }
  //const systemPrompt = "You are an expert Project Manager AI.";

  try {
    const model = getGeminiModel("GEMINI_TASK_GRAPH_MODEL");

    // Maximize the capability of the call with targeted configuration
    const generationConfig = {
      responseMimeType: "application/json", // Hard-forces valid JSON schema focus
      temperature: 0.55,                    // Slightly lower for less generic, more precise details
      maxOutputTokens: 4096,                // Open up the ceiling so it doesn't rush to finish the array
    };

    const result = await generateContentWithTimeout(model, {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: generationConfig
    });
    const response = await result.response;
    const responseText = response.text();

    const data = parseLLMJsonResponse(responseText);
    if (data.tasks && Array.isArray(data.tasks)) {
      data.tasks = normalizeTaskImpactWeights(data.tasks);
    }
    return data;
  } catch (error) {
    console.error("Error generating tasks:", error);
    throw new Error(`Failed to generate tasks: ${error.message}`);
  }
};

export const analyzeResume = async (resumeText) => {
  const now = new Date().toISOString();
  const userPrompt = `
    Analyze this user's resume for skills.
    /*
    Analyze durations worked. Presume part time unless listed. For instance, if the user was a web developer for a large firm, that user probably did 8-10 hours of web development per week, but also 3-6 hours of conference calls and 5-8 hours of general office work, whereas a cashier working part time consistently works 10-15 hours of customer service and money handling. Derive skill names and hours worked from this thought process, and award the user 10 times the amount of hours in skill xp (so 100 hours of labor becomes 1000 hours of skill xp).
    */

    Today's Date: ${now}

    Output the results in json, using this formula:
    {"skills": [{"name": "Skill Name", "xp": 0}]}

    Resume: ${resumeText}
  `;

  try {
    const model = getGeminiModel("GEMINI_PROJECT_PLAN_MODEL");
    const result = await generateContentWithTimeout(model, userPrompt);
    const response = await result.response;
    const responseText = response.text();

    const data = parseLLMJsonResponse(responseText);
    if (!data.skills || !Array.isArray(data.skills)) {
      throw new Error("LLM response missing skills array for resume analysis.");
    }
    return data;
  } catch (error) {
    console.error("Error analyzing resume:", error);
    throw new Error(`Failed to analyze resume: ${error.message}`);
  }
};
