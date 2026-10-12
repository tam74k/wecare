import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port and Host Configuration (Default to 3000 for Docker/Easypanel, or process.env.PORT)
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Database Path Resolution (Supports persistent volume mount e.g. /app/data or custom DB_PATH)
const rootDbPath = path.resolve(__dirname, 'wecare.db');
const dataDirPath = process.env.DATA_DIR || (fs.existsSync(path.resolve(__dirname, 'data')) ? path.resolve(__dirname, 'data') : null);

let dbPath = rootDbPath;
if (process.env.DB_PATH) {
  dbPath = path.resolve(process.env.DB_PATH);
} else if (dataDirPath) {
  dbPath = path.resolve(dataDirPath, 'wecare.db');
}

// Ensure target database directory exists
const targetDir = path.dirname(dbPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// If using persistent volume and target db does not exist yet, copy initial seed db if available
if (dbPath !== rootDbPath && !fs.existsSync(dbPath) && fs.existsSync(rootDbPath)) {
  try {
    fs.copyFileSync(rootDbPath, dbPath);
    console.log(`[libSQL] Initialized persistent database from ${rootDbPath} to ${dbPath}`);
  } catch (copyErr) {
    console.error('[libSQL] Failed to copy seed database to volume:', copyErr.message);
  }
}

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
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // 1. Healthcheck / System Status
  if (url.pathname === '/api/health' || url.pathname === '/api/libsql/status') {
    const exists = fs.existsSync(dbPath);
    let size = 0;
    if (exists) {
      try {
        size = fs.statSync(dbPath).size;
      } catch {}
    }
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok',
      port: PORT,
      database: {
        path: dbPath,
        exists,
        sizeBytes: size
      }
    }));
  }

  // 2. API: Execute single SQL query
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

  // 3. API: Execute batch SQL queries
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

  // 4. API: Download database backup
  if (url.pathname === '/api/libsql/backup' && req.method === 'GET') {
    if (fs.existsSync(dbPath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="wecare_backup.db"');
      res.setHeader('Content-Type', 'application/octet-stream');
      fs.createReadStream(dbPath).pipe(res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Database file not found' }));
    }
    return;
  }

  // 5. Static Frontend Files & Single Page App (SPA) Routing
  const distDir = path.resolve(__dirname, 'dist');
  let requestedPath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(distDir, requestedPath);
  const ext = path.extname(url.pathname);

  // If specific asset file exists (css, js, images, etc.)
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // If request has an asset file extension but file not found -> return 404
  if (ext && ext !== '.html') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Asset Not Found');
    return;
  }

  // SPA navigation fallback -> serve index.html
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Frontend dist not found. Please run "npm run build" first.');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`WeCare System running on http://${HOST}:${PORT}`);
  console.log(`libSQL database active at: ${dbPath} (exists: ${fs.existsSync(dbPath)})`);
});
