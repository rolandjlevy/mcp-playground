// agent.js — a minimal MCP client + AI agent loop
import fetch from 'node-fetch'; // install with: npm install node-fetch
import OpenAI from 'openai'; // install with: npm install openai
import dotenv from 'dotenv';
dotenv.config();

// 1. Load the manifest from your MCP server
async function loadManifest() {
  const res = await fetch('http://localhost:3000/mcp/manifest');
  if (!res.ok) throw new Error('Failed to fetch manifest');
  return res.json();
}

// 2. Call a tool by POSTing to its endpoint
async function callTool(toolName, input) {
  const url = `http://localhost:3000/tools/${toolName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Tool call failed: ${toolName}`);
  return res.json();
}

// 3. Run a simple agent loop
async function runAgent() {
  const manifest = await loadManifest();
  console.log(
    '📜 Discovered tools:',
    manifest.tools.map((t) => t.name),
  );

  // Example: create a task
  const created = await callTool('create-task', {
    title: 'Finish MCP workshop',
  });
  console.log('✅ Created task:', created);

  // Example: list tasks
  const listRes = await fetch('http://localhost:3000/tools/list-tasks');
  const tasks = await listRes.json();
  console.log('📋 Current tasks:', tasks);

  // Example: mark the created task complete
  const taskId = created.task.id;
  const marked = await callTool('mark-complete', { id: String(taskId) });
  console.log('🔒 Marked complete:', marked);

  // (Optional) Ask an LLM to reason about what to do next
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an AI agent that can call MCP tools.',
      },
      { role: 'user', content: 'What tasks do I have?' },
    ],
  });
  console.log('🤖 LLM says:', response.choices[0].message.content);
}

runAgent().catch((err) => console.error(err));
