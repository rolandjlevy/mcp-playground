# Vercel Deployment Configuration

## Framework Settings Configuration

When deploying to Vercel via the dashboard (https://vercel.com/roland-levys-projects/mcp-playground/settings/build-and-deployment#framework-settings), use these settings:

### Framework Preset

**Select:** `Other` (or leave as detected)

This is a custom Express.js application, not using a standard framework like Next.js or Create React App.

---

### Build & Development Settings

#### Build Command

```bash
# Leave empty or use:
npm install
```

**Explanation:** No build step needed - this is a Node.js runtime application, not a static site.

#### Output Directory

```
.
```

**Explanation:** Use root directory (`.`) since the Express app serves everything dynamically.

#### Install Command

```bash
npm install
```

**Explanation:** Default npm install (auto-detected).

#### Development Command

```bash
npm run dev
```

**Explanation:** Uses nodemon for hot-reloading during development.

---

### Root Directory

```
./
```

**Explanation:** Project root contains all necessary files.

---

### Node.js Version

```
20.x
```

**Explanation:** Use Node.js 20 or later (supports ES modules).

---

## Environment Variables

Add these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable Name    | Value                    | Environments                     |
| ---------------- | ------------------------ | -------------------------------- |
| `OPENAI_API_KEY` | `sk-proj-...` (your key) | Production, Preview, Development |
| `NODE_ENV`       | `production`             | Production                       |

---

## File Structure Required for Deployment

Ensure these files are in your repository:

- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` - Dependencies and scripts
- ✅ `index.js` - Main Express server (exports default app)
- ✅ `manifest.json` - MCP tool definitions
- ✅ `public/` - Static assets (served by Express)
- ✅ `tasks.json` - Task data (⚠️ won't persist; use DB for production)

---

## Important Notes for Vercel Serverless

### ⚠️ Limitations

1. **No Persistent File Storage**: `tasks.json` resets between deployments
   - **Solution**: Use Vercel KV, Postgres, or external database

2. **Cold Starts**: First request may be slower as function initializes

3. **Serverless Functions**: Each request spawns a new instance
   - Shared state won't work across requests
   - Use external storage for persistence

4. **Execution Limits**:
   - Max execution time: 10 seconds (Hobby) / 60 seconds (Pro)
   - Max payload size: 4.5MB

### ✅ Best Practices

1. **Use Environment Variables** for all secrets
2. **Add Database** for production (Vercel Postgres/KV)
3. **Enable Caching** where appropriate
4. **Monitor Logs** in Vercel dashboard

---

## Testing Your Deployment

### 1. Test the Manifest Endpoint

```bash
curl https://mcp-playground.vercel.app/mcp/manifest | jq .
```

### 2. Test Creating a Task

```bash
curl -X POST https://mcp-playground.vercel.app/tools/create-task \
  -H "Content-Type: application/json" \
  -d '{"title":"Test from production"}'
```

### 3. Test Listing Tasks

```bash
curl https://mcp-playground.vercel.app/tools/list-tasks | jq .
```

### 4. Connect Chat Client

Update your local `.env`:

```bash
MCP_SERVER_URL=https://mcp-playground.vercel.app
OPENAI_API_KEY=your-key-here
```

Then run:

```bash
node chat.js
```

---

## Dashboard Settings Summary

When you visit https://vercel.com/roland-levys-projects/mcp-playground/settings/build-and-deployment#framework-settings:

| Setting             | Value                      |
| ------------------- | -------------------------- |
| Framework Preset    | `Other`                    |
| Build Command       | _(empty)_ or `npm install` |
| Output Directory    | `.`                        |
| Install Command     | `npm install`              |
| Development Command | `npm run dev`              |
| Root Directory      | `./`                       |
| Node.js Version     | `20.x`                     |

---

## Quick Deploy Checklist

- [ ] Push latest code to GitHub
- [ ] Go to Vercel dashboard
- [ ] Import `rolandjlevy/mcp-playground` repository
- [ ] Configure framework settings as above
- [ ] Add `OPENAI_API_KEY` environment variable
- [ ] Deploy
- [ ] Test endpoints
- [ ] Update local `.env` with production URL
- [ ] Run `node chat.js` to connect

---

## Troubleshooting

### Error: "Cannot find module"

- Ensure all dependencies are in `package.json` (not devDependencies)
- Check that `"type": "module"` is set for ES modules

### Error: "Function execution timed out"

- Check function timeout settings in `vercel.json`
- Optimize slow operations
- Consider increasing timeout (Pro plan)

### Tasks not persisting

- This is expected behavior on Vercel serverless
- Implement a database solution (see below)

### Database Migration Guide

For production persistence, replace file operations with:

- **Vercel KV** (Redis): Fast key-value store
- **Vercel Postgres**: Full SQL database
- **MongoDB Atlas**: NoSQL option
- **Supabase**: PostgreSQL with real-time features

---

## Further Reading

- [Vercel Node.js Functions](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel KV Storage](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
