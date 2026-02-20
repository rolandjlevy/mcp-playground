# MCP Task Studio

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

📘 **For detailed deployment instructions and framework settings, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)**

### Quick Deploy

1. **Install Vercel CLI** (if not already installed):

   ```bash
   npm i -g vercel
   ```

2. **Deploy**:

   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in [Vercel dashboard](https://vercel.com/roland-levys-projects/mcp-playground/settings/environment-variables):
   - `OPENAI_API_KEY`: Your OpenAI API key

4. **Configure Framework Settings** (see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for details):
   - Framework Preset: `Other`
   - Build Command: _(empty)_
   - Output Directory: `.`
   - Install Command: `npm install`
   - Development Command: `npm run dev`

### Run Chat Client Against Production

Update your local `.env`:

```bash
OPENAI_API_KEY=your_api_key_here
MCP_SERVER_URL=https://your-app.vercel.app
```

Run the chat client:

```bash
node chat.js
```

### ⚠️ Important for Vercel

- `tasks.json` won't persist (use a database for production)
- See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for full configuration and troubleshooting
