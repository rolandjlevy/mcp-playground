/**
 * Express.js MCP (Model Context Protocol) Task Manager Server
 *
 * A RESTful API server that provides task management functionality with MCP-compliant tools and resources. Tasks are persisted to a JSON file (tasks.json).
 *
 * @description
 * - Loads a manifest configuration from manifest.json at startup
 * - Provides MCP tools for creating, listing, and marking tasks as complete
 * - Provides MCP resources like user profile information
 * - Serves an HTML form for interactive task creation
 * - Stores all tasks in a local tasks.json file
 *
 * @requires express - Web framework for Node.js
 * @requires fs - File system module for reading/writing JSON files
 * @requires dotenv - Environment variable loader
 *
 * Server runs on http://localhost:3000
 *
 * @example
 * // Start the server
 * node index.js
 *
 * // Fetch the MCP manifest configuration
 * curl http://localhost:3000/mcp/manifest | jq .
 *
 * // Create a new task
 * curl -X POST http://localhost:3000/tools/create-task \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Buy groceries"}'
 *
 * // List all tasks
 * curl http://localhost:3000/tools/list-tasks | jq .
 */

import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load manifest once at startup - use absolute path for Vercel
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Use /tmp directory in Vercel serverless environment (writable)
// Note: /tmp data is ephemeral and won't persist between cold starts
const TASKS_FILE =
  process.env.NODE_ENV === 'production' ? '/tmp/tasks.json' : './tasks.json';

const openAiKey = process.env.OPENAI_API_KEY;
const client = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null;
const TIMEOUT_MS = 5000;

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    }),
  ]);

// Utility to read tasks
const readTasks = () => {
  try {
    if (!fs.existsSync(TASKS_FILE)) {
      // If file doesn't exist, initialize with empty array
      fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading tasks:', error);
    return [];
  }
};

// Utility to write tasks
const writeTasks = (tasks) => {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error writing tasks:', error);
    throw new Error(
      'Failed to save tasks. Tasks are ephemeral in serverless environment.',
    );
  }
};

// Task operations used by tool routes and the chat API
const createTask = (title) => {
  const tasks = readTasks();
  const newTask = { id: Date.now(), title, done: false };
  tasks.push(newTask);
  writeTasks(tasks);
  return { success: true, task: newTask };
};

// List all tasks
const listTasks = () => {
  const tasks = readTasks();
  return { tasks };
};

// Mark a task as complete by ID
export const markCompleteById = (id) => {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) {
    return { success: false, error: 'Invalid task ID' };
  }
  const tasks = readTasks().map((task) =>
    task.id === idNum ? { ...task, done: true } : task,
  );
  writeTasks(tasks);
  return { success: true };
};

// Mark a task as complete by ID or rough title match
const markCompleteByIdOrTitle = (idOrTitle) => {
  // If it's a number (or numeric string), treat as ID
  const idNum = Number(idOrTitle);
  if (
    !Number.isNaN(idNum) &&
    idOrTitle !== '' &&
    idOrTitle !== null &&
    idOrTitle !== undefined
  ) {
    const tasks = readTasks().map((task) =>
      task.id === idNum ? { ...task, done: true } : task,
    );
    writeTasks(tasks);
    return { success: true };
  }

  // Otherwise, attempt rough title match (case-insensitive substring)
  const titleQuery =
    typeof idOrTitle === 'string' ? idOrTitle.trim().toLowerCase() : '';
  if (!titleQuery) {
    return { success: false, error: 'Invalid task ID or missing title' };
  }

  let matched = false;
  const tasks = readTasks().map((task) => {
    const taskTitle = String(task.title || '').toLowerCase();
    if (!matched && taskTitle.includes(titleQuery)) {
      matched = true;
      return { ...task, done: true };
    }
    return task;
  });

  if (!matched) {
    return { success: false, error: 'No task title matched' };
  }

  writeTasks(tasks);
  return { success: true };
};

// Update a task's title by ID

const updateTask = ({ id, title, done }) => {
  const idNum = Number(id);
  if (Number.isNaN(idNum) || (!title && done === undefined)) {
    return {
      success: false,
      error: 'Invalid task ID or missing title/done status',
    };
  }
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (done !== undefined) updates.done = done;

  const tasks = readTasks().map((task) =>
    task.id === idNum ? { ...task, ...updates } : task,
  );
  writeTasks(tasks);
  return { success: true };
};

// Convert manifest tools to OpenAI function format
function toOpenAITools(manifestConfig) {
  return (manifestConfig.tools || []).map((tool) => {
    const params =
      tool.inputSchema && tool.inputSchema !== null
        ? tool.inputSchema
        : { type: 'object', properties: {} };

    if (params.type !== 'object') {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || '',
          parameters: { type: 'object', properties: {} },
        },
      };
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: params,
      },
    };
  });
}

// Execute a tool call from the assistant message
const executeTool = (toolName, input) => {
  console.log(`🔧 Executing tool: ${toolName} with input:`, input);
  switch (toolName) {
    case 'create-task':
      return createTask(input?.title);
    case 'list-tasks':
      return listTasks();
    case 'mark-complete': {
      const idOrTitle =
        input?.id ?? input?.title ?? input?.name ?? input?.task ?? input?.query;
      return markCompleteByIdOrTitle(idOrTitle);
    }
    case 'update-task':
      return updateTask({
        id: input?.id,
        title: input?.title,
        done: input?.done,
      });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
};

// MCP Tool: Create Task (display HTML form)
app.get('/tools/create-task', (req, res) => {
  res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Create Task</title>
        </head>
        <body>
          <h1>Create Task</h1>
          <form method="POST" action="/tools/create-task">
            <label for="title">Task Title:</label>
            <input type="text" id="title" name="title" required />
            <button type="submit">Create</button>
          </form>
          <a href="/">Home</a>
        </body>
      </html>
    `);
});

// MCP Tool: Create Task (handle form submission)
app.post('/tools/create-task', (req, res) => {
  try {
    const { title } = req.body;
    const result = createTask(title);
    res.json(result);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'Tasks in Vercel are stored in /tmp and reset on each cold start. Consider using a database for persistence.',
    });
  }
});

// MCP Tool: List Tasks
app.get('/tools/list-tasks', (req, res) => {
  res.json(listTasks());
});

// MCP Tool: Mark Complete
app.post('/tools/mark-complete', (req, res) => {
  const { id, title } = req.body;
  const result = markCompleteByIdOrTitle(id ?? title);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(200).json(result);
});

// MCP Tool: update a single task by id with new title
app.post('/tools/update-task', (req, res) => {
  const { id, title, done } = req.body;
  const result = updateTask({ id, title, done });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.status(200).json(result);
});

// Chat API for the browser UI
app.post('/chat', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        error: 'Missing OPENAI_API_KEY. Add it to .env and restart the server.',
      });
    }

    const { message, messages } = req.body || {};
    const convo = Array.isArray(messages) ? [...messages] : [];

    if (message) {
      const lastEntry = convo[convo.length - 1];
      const alreadyAdded =
        lastEntry?.role === 'user' && lastEntry?.content === message;
      if (!alreadyAdded) {
        convo.push({ role: 'user', content: message });
      }
    }

    if (!convo.some((entry) => entry.role === 'system')) {
      convo.unshift({
        role: 'system',
        content: 'You are an AI agent that can call MCP tools.',
      });
    }

    const tools = toOpenAITools(manifest);

    const response = await withTimeout(
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: convo,
        tools,
      }),
      'OpenAI chat completion',
    ).catch((error) => {
      console.error('Error during chat completion:', error);
      throw error;
    });

    const assistantMessage = response.choices[0].message;
    convo.push(assistantMessage);

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {};
        const toolResult = executeTool(toolName, toolArgs);

        convo.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      const followUp = await withTimeout(
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: convo,
        }),
        'OpenAI follow-up completion',
      ).catch((error) => {
        console.error('Error during follow-up completion:', error);
        throw error;
      });

      const finalMessage = followUp.choices[0].message;
      convo.push(finalMessage);

      return res.json({ message: finalMessage, messages: convo });
    }

    return res.json({ message: assistantMessage, messages: convo });
  } catch (error) {
    console.error('Error in /chat:', error);
    const status = Number(error?.status || error?.statusCode) || 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    return res
      .status(safeStatus)
      .json({ error: error?.message || 'Chat request failed' });
  }
});

// MCP Resource: User Profile
app.get('/resources/user-profile', (req, res) => {
  res.json({
    id: 'user-001',
    name: 'Roland',
    role: 'AI Engineer',
  });
});

// Run with: curl http://localhost:3000/mcp/manifest | jq .
app.get('/mcp/manifest', (req, res) => {
  res.json(manifest);
});

// home

app.get('/', (req, res) => {
  res.sendFile('./index.html', { root: __dirname });
});

// Export the Express app for Vercel serverless
export default app;

// Only start the server if running locally (not in Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('✅ MCP Task Manager running on http://localhost:3000');
  });
}
