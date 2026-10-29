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

// Configure SQLite Pragmas and run server-side schema migrations on startup
async function initServerDatabase(database) {
  try {
    await database.execute('PRAGMA journal_mode = WAL;');
    await database.execute('PRAGMA busy_timeout = 10000;');
    await database.execute('PRAGMA synchronous = NORMAL;');
    await database.execute('PRAGMA foreign_keys = ON;');
    console.log('[libSQL] Pragmas configured (WAL mode, busy_timeout=10000ms, foreign_keys=ON)');
  } catch (pragmaErr) {
    console.error('[libSQL] Pragma setup warning:', pragmaErr.message);
  }

  const serverMigrations = [
    `ALTER TABLE vehicles ADD COLUMN brand TEXT`,
    `ALTER TABLE vehicles ADD COLUMN model TEXT`,
    `ALTER TABLE vehicles ADD COLUMN year TEXT`,
    `ALTER TABLE vehicles ADD COLUMN license_plate TEXT`,
    `ALTER TABLE packages ADD COLUMN weekly_visits_count INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE packages ADD COLUMN weekly_services_plan TEXT DEFAULT '[]'`,
    `ALTER TABLE subscriptions ADD COLUMN selected_days TEXT DEFAULT '[]'`,
    `ALTER TABLE visits ADD COLUMN service_type TEXT`,
    `ALTER TABLE visits ADD COLUMN day_of_week TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE inventory_items ADD COLUMN barcode TEXT`,
    `ALTER TABLE equipment ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE system_settings ADD COLUMN whatsapp_instance TEXT`,
    `ALTER TABLE system_settings ADD COLUMN whatsapp_api_key TEXT`,
    `ALTER TABLE system_settings ADD COLUMN vodafone_cash_number TEXT`,
    `ALTER TABLE system_settings ADD COLUMN instapay_handle TEXT`,
    `ALTER TABLE system_settings ADD COLUMN store_name TEXT`,
    `ALTER TABLE system_settings ADD COLUMN google_drive_folder_url TEXT`,
    `ALTER TABLE system_settings ADD COLUMN google_drive_folder_name TEXT`,
    `ALTER TABLE visits ADD COLUMN rating REAL`,
    `ALTER TABLE visits ADD COLUMN rating_comment TEXT`,
    `ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'active'`,
    `ALTER TABLE visits ADD COLUMN customer_id TEXT`,
    `ALTER TABLE visits ADD COLUMN assigned_worker_id TEXT`,
    `ALTER TABLE visits ADD COLUMN scheduled_time_from TEXT`,
    `ALTER TABLE visits ADD COLUMN scheduled_time_to TEXT`,
    `ALTER TABLE visits ADD COLUMN postponed_from_date TEXT`,
    `ALTER TABLE visits ADD COLUMN postponed_reason TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN paid_at TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN approved_at TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN approved_by TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN archived_at TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN worker_id TEXT`,
    `ALTER TABLE packages ADD COLUMN tier TEXT NOT NULL DEFAULT 'monthly'`,
    `ALTER TABLE packages ADD COLUMN level TEXT`,
    `ALTER TABLE packages ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30`,
    `ALTER TABLE packages ADD COLUMN base_visits_count INTEGER NOT NULL DEFAULT 4`,
    `ALTER TABLE payment_methods ADD COLUMN treasury_id TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN related_treasury_id TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN transaction_type TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN reason TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN created_by TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN category TEXT`,
    `ALTER TABLE treasury_transactions ADD COLUMN payment_method TEXT`,
    `ALTER TABLE employees ADD COLUMN criminal_record_image_url TEXT`,
    `ALTER TABLE employees ADD COLUMN personal_image_url TEXT`,
    `CREATE TABLE IF NOT EXISTS system_notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      reference_id TEXT,
      customer_id TEXT,
      rating REAL,
      rating_comment TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS store_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      discount_price REAL,
      image_url TEXT NOT NULL,
      is_limited_quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      stock_quantity INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS store_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      delivery_address TEXT,
      payment_method TEXT NOT NULL DEFAULT 'vodafone_cash',
      transfer_receipt_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      items TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE inventory_items ADD COLUMN item_code TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN category TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN brand TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN usage_location TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN opening_stock REAL NOT NULL DEFAULT 0.0`,
    `ALTER TABLE inventory_items ADD COLUMN current_stock REAL NOT NULL DEFAULT 0.0`,
    `ALTER TABLE inventory_items ADD COLUMN min_alert_threshold REAL NOT NULL DEFAULT 5.0`,
    `ALTER TABLE inventory_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0.0`,
    `ALTER TABLE inventory_items ADD COLUMN notes TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN status TEXT DEFAULT 'متوفر'`,
    `ALTER TABLE inventory_items ADD COLUMN supplier_id TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN supplier_name TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN supplier_phone TEXT`,
    `CREATE TABLE IF NOT EXISTS inventory_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      order_date TEXT NOT NULL DEFAULT (date('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      items TEXT NOT NULL DEFAULT '[]',
      total_amount REAL NOT NULL DEFAULT 0.0,
      converted_invoice_number TEXT,
      converted_at TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'مسؤول المشتريات',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      barcode TEXT,
      unit TEXT NOT NULL DEFAULT 'قطعة',
      quantity_requested REAL NOT NULL DEFAULT 1.0,
      quantity_received REAL DEFAULT 0.0,
      unit_price REAL NOT NULL DEFAULT 0.0,
      total_price REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      voucher_number TEXT,
      category_id TEXT NOT NULL,
      category_name TEXT,
      amount REAL NOT NULL,
      treasury_id TEXT NOT NULL,
      payment_method_id TEXT,
      payment_method_name TEXT,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      recipient TEXT,
      invoice_ref TEXT,
      attachment_url TEXT,
      created_by TEXT NOT NULL DEFAULT 'المسؤول المالي',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE employees ADD COLUMN salary REAL DEFAULT 0.0`,
    `CREATE TABLE IF NOT EXISTS salary_payments (
      id TEXT PRIMARY KEY,
      voucher_number TEXT,
      employee_id TEXT NOT NULL,
      employee_name TEXT,
      employee_role TEXT,
      employee_phone TEXT,
      month_year TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0.0,
      bonuses REAL NOT NULL DEFAULT 0.0,
      bonus_reason TEXT,
      deductions REAL NOT NULL DEFAULT 0.0,
      deduction_reason TEXT,
      net_salary REAL NOT NULL DEFAULT 0.0,
      treasury_id TEXT NOT NULL,
      treasury_name TEXT,
      payment_method_id TEXT,
      payment_method_name TEXT,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'المسؤول المالي',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE inventory_items ADD COLUMN purchase_unit TEXT DEFAULT 'قطعة'`,
    `ALTER TABLE inventory_items ADD COLUMN pieces_per_unit REAL DEFAULT 1.0`,
    `ALTER TABLE inventory_items ADD COLUMN piece_unit TEXT DEFAULT 'قطعة'`,
    `ALTER TABLE store_products ADD COLUMN purchase_unit TEXT DEFAULT 'قطعة'`,
    `ALTER TABLE store_products ADD COLUMN pieces_per_unit REAL DEFAULT 1.0`,
    `ALTER TABLE store_products ADD COLUMN piece_unit TEXT DEFAULT 'قطعة'`,
    `ALTER TABLE store_products ADD COLUMN inventory_item_id TEXT`,
    `ALTER TABLE purchase_orders ADD COLUMN rfq_id TEXT`,
    `ALTER TABLE purchase_orders ADD COLUMN rfq_number TEXT`,
    `CREATE TABLE IF NOT EXISTS price_quotation_requests (
      id TEXT PRIMARY KEY,
      rfq_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT,
      supplier_phone TEXT,
      date TEXT NOT NULL DEFAULT (date('now')),
      rfq_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      items TEXT NOT NULL DEFAULT '[]',
      total_amount REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      created_by TEXT NOT NULL DEFAULT 'مسؤول المشتريات',
      converted_po_id TEXT,
      converted_po_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE price_quotation_requests ADD COLUMN rfq_date TEXT`,
    `ALTER TABLE price_quotation_requests ADD COLUMN date TEXT`,
    `ALTER TABLE price_quotation_requests ADD COLUMN converted_at TEXT`,
    `ALTER TABLE attendance ADD COLUMN is_paid_leave INTEGER DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN leave_type TEXT`,
    `ALTER TABLE attendance ADD COLUMN deduction_amount REAL DEFAULT 0.0`,
    `ALTER TABLE attendance ADD COLUMN daily_salary REAL DEFAULT 0.0`,
    `ALTER TABLE packages ADD COLUMN image_url TEXT`,
    `CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'car',
      group_name TEXT NOT NULL DEFAULT 'خدمات',
      sub_category TEXT DEFAULT 'wash',
      name TEXT NOT NULL,
      description TEXT,
      includes TEXT DEFAULT '[]',
      icon_type TEXT DEFAULT 'spark',
      duration_minutes INTEGER DEFAULT 45,
      popular INTEGER DEFAULT 0,
      tile_bg TEXT DEFAULT '#E3F2EF',
      tile_fg TEXT DEFAULT '#0B7F72',
      price REAL NOT NULL DEFAULT 0.0,
      price_type TEXT DEFAULT 'fixed',
      kind TEXT DEFAULT 'car',
      options TEXT DEFAULT '[]',
      airport_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE services ADD COLUMN image_url TEXT`,
    `CREATE TABLE IF NOT EXISTS service_bookings (
      id TEXT PRIMARY KEY,
      booking_number TEXT,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_ids TEXT DEFAULT '[]',
      services_summary TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      vehicle_id TEXT,
      location_address TEXT,
      booking_date TEXT,
      booking_time TEXT,
      selected_option TEXT,
      oil_type TEXT,
      notes TEXT,
      price REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      assigned_worker_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ];

  for (const statement of serverMigrations) {
    try {
      await database.execute(statement);
    } catch {
      // Ignored: column/table already exists
    }
  }
  console.log('[libSQL] Server migrations executed successfully.');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
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

  // 1.5. API: Fast initial data loading (All core tables in a single lightning-fast request)
  if ((url.pathname === '/api/initial-data' || url.pathname === '/api/libsql/initial-data') && (req.method === 'GET' || req.method === 'POST')) {
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
        db.execute('SELECT * FROM system_settings LIMIT 1'),
        db.execute('SELECT * FROM coverage_areas ORDER BY name ASC'),
        db.execute('SELECT * FROM employees ORDER BY full_name ASC'),
        db.execute('SELECT * FROM attendance ORDER BY date DESC, created_at DESC'),
        db.execute('SELECT * FROM customers ORDER BY created_at DESC'),
        db.execute('SELECT * FROM vehicles ORDER BY created_at DESC'),
        db.execute('SELECT * FROM categories ORDER BY name ASC'),
        db.execute('SELECT * FROM packages ORDER BY name ASC'),
        db.execute('SELECT * FROM package_area_pricing'),
        db.execute('SELECT * FROM subscriptions ORDER BY created_at DESC'),
        db.execute('SELECT * FROM visits ORDER BY scheduled_date ASC, created_at DESC'),
        db.execute('SELECT * FROM treasuries ORDER BY name ASC'),
        db.execute('SELECT * FROM payment_methods ORDER BY name ASC'),
        db.execute('SELECT * FROM treasury_transactions ORDER BY created_at DESC'),
        db.execute('SELECT * FROM inventory_items ORDER BY name ASC'),
        db.execute('SELECT * FROM inventory_transactions ORDER BY created_at DESC'),
        db.execute('SELECT * FROM equipment ORDER BY name ASC'),
        db.execute('SELECT * FROM suppliers ORDER BY name ASC'),
        db.execute('SELECT * FROM supplier_transactions ORDER BY date DESC, created_at DESC'),
        db.execute('SELECT * FROM purchase_orders ORDER BY order_date DESC, created_at DESC'),
        db.execute('SELECT * FROM advertisements ORDER BY created_at DESC'),
        db.execute('SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 50'),
        db.execute('SELECT * FROM expense_categories ORDER BY name ASC'),
        db.execute('SELECT * FROM expenses ORDER BY date DESC, created_at DESC'),
        db.execute('SELECT * FROM salary_payments ORDER BY payment_date DESC, created_at DESC'),
        db.execute('SELECT * FROM price_quotation_requests ORDER BY created_at DESC')
      ]);

      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
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
    } catch (err) {
      console.error('[API initial-data error]:', err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: err.message || 'Error loading initial data' }));
    }
  }

  // 2. API: Execute single SQL query
  if (url.pathname === '/api/libsql/execute' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', async () => {
      let sql = '';
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        const parsed = JSON.parse(body || '{}');
        sql = parsed.sql || '';
        const cleanArgs = (parsed.args || []).map(a => (a === undefined ? null : a));
        const result = await db.execute({ sql, args: cleanArgs });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ rows: result.rows }));
      } catch (err) {
        const msg = err.message || '';
        // If this is an ALTER TABLE migration attempting to add an already existing column
        if (
          msg.includes('duplicate column name') ||
          msg.includes('already exists') ||
          (typeof sql === 'string' && sql.trim().toUpperCase().startsWith('ALTER TABLE') && msg.includes('duplicate'))
        ) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ rows: [], ignored: true, message: msg }));
        }

        console.error('[API Execute Error]:', msg, 'SQL:', (typeof sql === 'string' ? sql.slice(0, 150) : ''));
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: msg || 'Database error' }));
      }
    });
    return;
  }

  // 3. API: Execute batch SQL queries
  if (url.pathname === '/api/libsql/batch' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
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
        const msg = err.message || '';
        if (msg.includes('duplicate column name') || msg.includes('already exists')) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: true, ignored: true, message: msg }));
        }
        console.error('[API Batch Error]:', msg);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: msg || 'Database batch error' }));
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
    if (url.pathname === '/sw.js') {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (url.pathname.startsWith('/assets/')) {
      // Vite hashed assets are immutable and should be cached aggressively
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
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

  // SPA navigation fallback -> serve index.html (always revalidate so updates are detected immediately)
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Frontend dist not found. Please run "npm run build" first.');
  }
});

server.listen(PORT, HOST, async () => {
  console.log(`WeCare System running on http://${HOST}:${PORT}`);
  console.log(`libSQL database active at: ${dbPath} (exists: ${fs.existsSync(dbPath)})`);
  try {
    await initServerDatabase(db);
  } catch (err) {
    console.error('[libSQL] Server database initialization warning:', err.message);
  }
});
