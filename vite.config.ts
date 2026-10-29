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

      // Ensure critical table columns exist
      (async () => {
        const migrations = [
          'ALTER TABLE vehicles ADD COLUMN brand TEXT',
          'ALTER TABLE vehicles ADD COLUMN model TEXT',
          'ALTER TABLE vehicles ADD COLUMN year TEXT',
          'ALTER TABLE vehicles ADD COLUMN license_plate TEXT',
          'ALTER TABLE vehicles ADD COLUMN body_type TEXT',
          'ALTER TABLE vehicles ADD COLUMN letters TEXT',
          'ALTER TABLE vehicles ADD COLUMN digits TEXT',
          'CREATE TABLE IF NOT EXISTS vehicle_colors (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, hex TEXT, created_at TEXT)',
          'ALTER TABLE employees ADD COLUMN salary REAL DEFAULT 0.0',
          'ALTER TABLE employees ADD COLUMN criminal_record_image_url TEXT',
          'ALTER TABLE employees ADD COLUMN personal_image_url TEXT',
          'ALTER TABLE attendance ADD COLUMN is_paid_leave INTEGER DEFAULT 0',
          'ALTER TABLE attendance ADD COLUMN leave_type TEXT',
          'ALTER TABLE attendance ADD COLUMN deduction_amount REAL DEFAULT 0.0',
          'ALTER TABLE attendance ADD COLUMN daily_salary REAL DEFAULT 0.0'
        ];
        for (const m of migrations) {
          try { await dbClient.execute(m); } catch (e) {}
        }
      })();

      server.middlewares.use('/api/initial-data', async (req, res) => {
        try {
          const [
            settingsRes,
            coverageAreasRes,
            employeesRes,
            attendanceRes,
            customersRes,
            vehiclesRes,
            categoriesRes,
            packagesRes,
            pricingRes,
            subscriptionsRes,
            visitsRes,
            treasuriesRes,
            paymentMethodsRes,
            treasuryTransactionsRes,
            inventoryItemsRes,
            inventoryTransactionsRes,
            equipmentRes,
            suppliersRes,
            supplierTransactionsRes,
            purchaseOrdersRes,
            advertisementsRes,
            notificationsRes,
            expenseCategoriesRes,
            expensesRes,
            salaryPaymentsRes,
            rfqRes
          ] = await Promise.all([
            dbClient.execute('SELECT * FROM system_settings LIMIT 1'),
            dbClient.execute('SELECT * FROM coverage_areas ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM employees ORDER BY full_name ASC'),
            dbClient.execute('SELECT * FROM attendance ORDER BY date DESC, created_at DESC'),
            dbClient.execute('SELECT * FROM customers ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM vehicles ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM categories ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM packages ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM package_area_pricing'),
            dbClient.execute('SELECT * FROM subscriptions ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM visits ORDER BY scheduled_date ASC, created_at DESC'),
            dbClient.execute('SELECT * FROM treasuries ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM payment_methods ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM treasury_transactions ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM inventory_items ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM inventory_transactions ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM equipment ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM suppliers ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM supplier_transactions ORDER BY date DESC, created_at DESC'),
            dbClient.execute('SELECT * FROM purchase_orders ORDER BY order_date DESC, created_at DESC'),
            dbClient.execute('SELECT * FROM advertisements ORDER BY created_at DESC'),
            dbClient.execute('SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 50'),
            dbClient.execute('SELECT * FROM expense_categories ORDER BY name ASC'),
            dbClient.execute('SELECT * FROM expenses ORDER BY date DESC, created_at DESC'),
            dbClient.execute('SELECT * FROM salary_payments ORDER BY payment_date DESC, created_at DESC'),
            dbClient.execute('SELECT * FROM price_quotation_requests ORDER BY created_at DESC')
          ]);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            settings: settingsRes.rows,
            coverageAreas: coverageAreasRes.rows,
            employees: employeesRes.rows,
            attendance: attendanceRes.rows,
            customers: customersRes.rows,
            vehicles: vehiclesRes.rows,
            categories: categoriesRes.rows,
            packages: packagesRes.rows,
            packagePricing: pricingRes.rows,
            subscriptions: subscriptionsRes.rows,
            visits: visitsRes.rows,
            treasuries: treasuriesRes.rows,
            paymentMethods: paymentMethodsRes.rows,
            treasuryTransactions: treasuryTransactionsRes.rows,
            inventoryItems: inventoryItemsRes.rows,
            inventoryTransactions: inventoryTransactionsRes.rows,
            equipment: equipmentRes.rows,
            suppliers: suppliersRes.rows,
            supplierTransactions: supplierTransactionsRes.rows,
            purchaseOrders: purchaseOrdersRes.rows,
            advertisements: advertisementsRes.rows,
            notifications: notificationsRes.rows,
            expenseCategories: expenseCategoriesRes.rows,
            expenses: expensesRes.rows,
            salaryPayments: salaryPaymentsRes.rows,
            priceQuotationRequests: rfqRes.rows
          }));
        } catch (err: any) {
          console.error('[libSQL Initial Data Error]:', err.message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: err.message || 'Error fetching initial data' }));
        }
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
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            return 'vendor';
          }
        }
      }
    }
  }
});
