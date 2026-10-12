import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5173;
const dbPath = path.resolve(__dirname, 'wecare.db');

console.log('Connecting to local libSQL database:', dbPath);
const db = createClient({
  url: `file:${dbPath}`
});

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // 1. API: Execute single SQL
  if (url.pathname === '/api/libsql/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { sql, args } = JSON.parse(body || '{}');
        const cleanArgs = (args || []).map(a => (a === undefined ? null : a));
        const result = await db.execute({ sql, args: cleanArgs });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ rows: result.rows }));
      } catch (err) {
        console.error('[API Execute Error]:', err.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: err.message || 'Database error' }));
      }
    });
    return;
  }

  // 2. API: Execute batch SQL
  if (url.pathname === '/api/libsql/batch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { statements } = JSON.parse(body || '{}');
        const cleanStatements = (statements || []).map(st => {
          if (typeof st === 'string') return st;
          return {
            sql: st.sql,
            args: (st.args || []).map(a => (a === undefined ? null : a))
          };
        });
        await db.batch(cleanStatements, 'write');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('[API Batch Error]:', err.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: err.message || 'Database batch error' }));
      }
    });
    return;
  }

  // 3. API: Download database backup
  if (url.pathname === '/api/libsql/backup' && req.method === 'GET') {
    if (fs.existsSync(dbPath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="wecare_backup.db"');
      res.setHeader('Content-Type', 'application/octet-stream');
      fs.createReadStream(dbPath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('Database file not found');
    }
    return;
  }

  // 4. Static frontend files (dist folder if built, otherwise index.html)
  const distDir = path.resolve(__dirname, 'dist');
  let filePath = path.join(distDir, url.pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Frontend dist not found. Please run npm run build first.');
  }
});

server.listen(PORT, () => {
  console.log(`WeCare System running on http://localhost:${PORT}`);
  console.log(`Local libSQL database active: ${dbPath}`);
});
