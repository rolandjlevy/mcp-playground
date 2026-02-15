// Vercel serverless function entry point
// This imports and exports the Express app from the root index.js
import app from '../index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix static path for Vercel serverless environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line no-unused-vars
const publicPath = path.join(__dirname, '..', 'public');

export default app;
