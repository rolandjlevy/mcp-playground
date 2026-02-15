# MCP Playground

This project combines a simple MCP-style server with a chat loop that can call the server's tools through an LLM. See the [demo here](https://mcp-playground-eight.vercel.app)

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

## Deployment to Vercel

### Deploy the Express Server

1. **Install Vercel CLI** (if not already installed):

   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:

   ```bash
   vercel
   ```

   Follow the prompts to link your project or create a new one.

3. **Set Environment Variables in Vercel**:
   - Go to your Vercel dashboard: https://vercel.com/your-username/mcp-playground/settings/environment-variables
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Select all environments (Production, Preview, Development)

4. **Redeploy** if needed:
   ```bash
   vercel --prod
   ```

### Run Chat Client Against Production

Once deployed, update your local `.env` file:

```bash
OPENAI_API_KEY=your_api_key_here
MCP_SERVER_URL=https://mcp-playground-eight.vercel.app
```

Then run the chat client locally:

```bash
node chat.js
```

The chat client will now connect to your deployed Vercel server instead of localhost.

### Important Notes for Vercel

- Vercel runs Express apps as serverless functions
- The `tasks.json` file won't persist between deployments (use a database for production)
- Each request spawns a new serverless instance
- Consider using Vercel KV, Postgres, or another database for persistent storage
