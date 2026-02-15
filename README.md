# MCP Playground

This project combines a simple MCP-style server with a chat loop that can call the server's tools through an LLM.

## How it works

- The MCP server is an Express app that exposes tool endpoints and a manifest.
- The manifest lists available tools and schemas at `http://localhost:3000/mcp/manifest`.
- The chat loop loads the manifest at startup, passes the tool schemas to the LLM, and executes tool calls against the server.
- Tool results are sent back to the LLM so it can respond with the outcome.

## Project structure

- `index.js`: MCP server with tool routes and a manifest endpoint.
- `manifest.json`: Tool and resource definitions (schemas and descriptions).
- `chat.js`: Interactive chat loop that calls MCP tools via the LLM.
- `agent.js`: Minimal MCP client script with example calls.
- `tasks.json`: Data store for task items.

## Prerequisites

- Node.js 18+ recommended
- An OpenAI API key in the `OPENAI_API_KEY` environment variable

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_api_key_here
```

## Run the MCP server

```bash
npm run dev
```

This starts the server at `http://localhost:3000`.

## Run the chat client

In a separate terminal:

```bash
node chat.js
```

## Example prompts

- "List all my tasks"
- "Create a task called Buy milk"
- "Mark task 123456 complete"

## Notes

- `list-tasks` is a GET endpoint in the server, while `create-task` and `mark-complete` are POST endpoints.
- If you change `manifest.json`, restart the chat client to reload tools.
