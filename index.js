import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Load manifest once at startup
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'));

const TASKS_FILE = './tasks.json';

// Utility to read tasks
const readTasks = () => {
  if (!fs.existsSync(TASKS_FILE)) {
    // If file doesn't exist, initialize with empty array
    fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  return JSON.parse(fs.readFileSync(TASKS_FILE));
};

// Utility to write tasks
const writeTasks = (tasks) => {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

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

// MCP Tool: Create Task
app.post('/tools/create-task', (req, res) => {
  const { title } = req.body;
  const tasks = readTasks();
  const newTask = { id: Date.now(), title, done: false };
  tasks.push(newTask);
  writeTasks(tasks);
  res.json({ success: true, task: newTask });
});

// MCP Tool: List Tasks
app.get('/tools/list-tasks', (req, res) => {
  const tasks = readTasks();
  res.json({ tasks });
});

// MCP Tool: Mark Complete
app.post('/tools/mark-complete', (req, res) => {
  const { id } = req.body;
  const idNum = Number(id); // normalize id to number
  if (isNaN(idNum)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid task ID',
    });
  }
  const tasks = readTasks().map((task) =>
    task.id === idNum ? { ...task, done: true } : task,
  );
  writeTasks(tasks);
  res.status(200).json({ success: true });
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
  res.send(
    `MCP Server is running. 
    endpoints: 
    <ul>
    <li><a href="/tools/create-task">/tools/create-task</a></li>
    <li><a href="/tools/list-tasks">/tools/list-tasks</a></li>
    <li><a href="/tools/mark-complete">/tools/mark-complete</a></li>
    <li><a href="/resources/user-profile">/resources/user-profile</a></li>
    </ul>`,
  );
});

app.listen(3000, () => {
  console.log('✅ MCP Task Manager running on http://localhost:3000');
});
