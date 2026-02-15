import readline from 'readline';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

// Chat client that interacts with the MCP server and calls tools based on the manifest configuration.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'Missing OPENAI_API_KEY. Set it in your environment or .env file.',
  );
}

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load the manifest from the MCP server
async function loadManifest() {
  const res = await fetch('http://localhost:3000/mcp/manifest');
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status}`);
  }
  return res.json();
}

// Convert manifest tools to OpenAI function format
function toOpenAITools(manifest) {
  return (manifest.tools || []).map((tool) => {
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

// Call a tool on the MCP server
async function callTool(toolName, input, toolMeta) {
  const url = `http://localhost:3000/tools/${toolName}`;
  const inputSchema = toolMeta ? toolMeta.inputSchema : null;
  const isNullInput = inputSchema === null || inputSchema?.type === 'null';
  const method = isNullInput ? 'GET' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(input ?? {}) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tool call failed: ${toolName} :: ${errorText}`);
  }
  return res.json();
}

// Main chat loop that interacts with the user, calls tools, and displays responses.
async function chatLoop() {
  const manifest = await loadManifest();
  const tools = toOpenAITools(manifest);
  const toolIndex = new Map(
    (manifest.tools || []).map((tool) => [tool.name, tool]),
  );

  const messages = [
    {
      role: 'system',
      content: 'You are an AI agent that can call MCP tools.',
    },
  ];

  while (true) {
    const userInput = await new Promise((resolve) =>
      rl.question('You: ', resolve),
    );

    if (userInput.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      process.exit(0);
    }

    messages.push({ role: 'user', content: userInput });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
    });

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {};
        const toolResult = await callTool(
          toolName,
          toolArgs,
          toolIndex.get(toolName),
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      const followUp = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
      });

      const finalMessage = followUp.choices[0].message;
      messages.push(finalMessage);
      console.log('🤖 Agent:', finalMessage.content);
      continue;
    }

    console.log('🤖 Agent:', assistantMessage.content);
  }
}

chatLoop();
