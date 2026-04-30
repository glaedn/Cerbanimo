// services/taskGenerator.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

export const generateProjectIdea = async (skills, interests) => {
  const skillsString = JSON.stringify(skills);
  const interestsString = JSON.stringify(interests);

  const userPrompt = `
    Context Parameters Provided:
    Skills: ${skillsString}
    Interests: ${interestsString}

    Instructions for AI Generation:
    Using the provided skills and interests, generate a unique project name that reflects this synergy.
    Then create a descriptive project plan whose scope utilizes those skills towards advancing those interests as much as possible.
    Try to limit the scope to mostly needing only the skills the user has listed.
    Format your response as JSON with keys Name and Description.
  `;

  //const systemPrompt = "You are a helpful assistant that generates project ideas.";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemma-3-27b-it",
      //systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
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
    const model = genAI.getGenerativeModel({
      model: "gemma-3-27b-it",
      //systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
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
  console.error("Failed to parse LLM response for subtasks:", text);
  throw new Error("Failed to parse tasks from LLM output for subtasks");
 }
};

export const autoGenerateTasks = async (
  projectName,
  projectDescription,
  tags,
  creator_id,
  project_due_date = null
) => {
  const userPrompt = `
Your objective is to take the given project name and description and output the tasks and dependencies necessary to complete the project. You will generate output for the following database tables: projects and tasks.

Here are the rules:
- All IDs (project IDs, task IDs) must be **unique integers starting at 1**.
- Maintain **relationships**: 
  - "project_id" in tasks must match the corresponding project's new ID.
  - "skill_name" in tasks must be the name of a skill. You can use existing common ones or freely generate new ones that fit.
  - "dependencies" in tasks must reference the correct **new task IDs**.
- **Timeline Awareness**: Distribute tasks across time so the project completes by the due date. Assign each task a logical start and end date based on dependencies. Use ISO 8601 format for dates (YYYY-MM-DDTHH:mm:ssZ). If no project due date is provided, use a reasonable 30-day window starting from today.
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
  { "name": "${projectName}", "description": "${projectDescription}", "tags": ["${tags}"], "creator_id": "${creator_id}", "due_date": "${project_due_date || 'None provided'}" }
]

Expected Output Format:

{
  "projects": [
    { "id": 1, "name": "${projectName}", "description": "${projectDescription}", "tags": ["tag1", "tag2"], "creator_id": ${creator_id}, "due_date": "${project_due_date || ''}" }
  ],
  "tasks": [
    { "id": 1, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 1, "dependencies": [], "reward_tokens": 80, "start_date": "2025-01-01T09:00:00Z", "due_date": "2025-01-05T17:00:00Z" },
    { "id": 2, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 2, "dependencies": [1], "reward_tokens": 120, "start_date": "2025-01-06T09:00:00Z", "due_date": "2025-01-10T17:00:00Z" },
    { "id": 3, "name": "Task Name", "description": "Task Desc", "project_id": 1, "skill_name": "Skill Name", "skill_level": 1, "dependencies": [1,2], "reward_tokens": 60, "start_date": "2025-01-11T09:00:00Z", "due_date": "2025-01-15T17:00:00Z" }
  ]
}


Notes:

ONLY return the JSON object described.
Dependencies are the IDs of the tasks that must be completed before this task can be started. There can be multiple.
`;
  //const systemPrompt = "You are an expert Project Manager AI.";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemma-3-27b-it",
      //systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const responseText = response.text();

    return parseLLMJsonResponse(responseText);
  } catch (error) {
    console.error("Error generating tasks:", error);
    throw new Error(`Failed to generate tasks: ${error.message}`);
  }
};
