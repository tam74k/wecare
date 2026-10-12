import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

function localLibSqlPlugin(): Plugin {
  let dbClient: any = null;

  return {
    name: 'local-libsql-server',
    configureServer(server) {
      const dbPath = path.resolve(__dirname, 'wecare.db');
      dbClient = createClient({
        url: `file:${dbPath}`
      });

      server.middlewares.use('/api/libsql/execute', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ message: 'Method Not Allowed' }));
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { sql, args } = JSON.parse(body || '{}');
            const cleanArgs = (args || []).map((a: any) => (a === undefined ? null : a));
            const result = await dbClient.execute({ sql, args: cleanArgs });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ rows: result.rows }));
          } catch (err: any) {
            console.error('[libSQL Local Server Error]:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: err.message || 'Database error' }));
          }
        });
      });

      server.middlewares.use('/api/libsql/batch', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ message: 'Method Not Allowed' }));
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { statements } = JSON.parse(body || '{}');
            const cleanStatements = (statements || []).map((st: any) => {
              if (typeof st === 'string') return st;
              return {
                sql: st.sql,
                args: (st.args || []).map((a: any) => (a === undefined ? null : a))
              };
            });
            await dbClient.batch(cleanStatements, 'write');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err: any) {
            console.error('[libSQL Local Batch Error]:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: err.message || 'Database batch error' }));
          }
        });
      });

      server.middlewares.use('/api/libsql/backup', (req, res) => {
        if (fs.existsSync(dbPath)) {
          res.setHeader('Content-Disposition', 'attachment; filename="wecare_backup.db"');
          res.setHeader('Content-Type', 'application/octet-stream');
          fs.createReadStream(dbPath).pipe(res);
        } else {
          res.statusCode = 404;
          res.end('Database file not found');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localLibSqlPlugin()],
  server: {
    port: 5173,
    host: true
  }
});
