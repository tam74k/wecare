import { createClient, Client } from '@libsql/client/web';

// استخراج مفاتيح الاتصال مع libSQL / Turso
const env = ((import.meta as any).env || {}) as Record<string, string | undefined>;

export const libSqlUrl =
  env.VITE_LIBSQL_URL ||
  env.NEXT_PUBLIC_LIBSQL_URL ||
  env.TURSO_DATABASE_URL ||
  '';

export const libSqlAuthToken =
  env.VITE_LIBSQL_AUTH_TOKEN ||
  env.NEXT_PUBLIC_LIBSQL_AUTH_TOKEN ||
  env.TURSO_AUTH_TOKEN ||
  '';

// التحقق من تفعيل وضبط libSQL - مفعل دائماً الآن (محلياً عبر wecare.db وسحابياً إن وُجد رابط Turso)
export const isTursoRemote = Boolean(
  libSqlUrl &&
  (libSqlUrl.startsWith('libsql://') || libSqlUrl.startsWith('https://') || libSqlUrl.startsWith('http://'))
);

export const isLibSqlConfigured = true;

// العميل الأساسي لـ libSQL (يدعم النمط المحلي المباشر عبر wecare.db والنمط السحابي عبر Turso)
export const libSqlClient: Client | any = isTursoRemote
  ? createClient({
      url: libSqlUrl,
      authToken: libSqlAuthToken || undefined,
    })
  : {
      execute: async (stmt: any) => {
        const sql = typeof stmt === 'string' ? stmt : stmt.sql;
        const args = typeof stmt === 'string' ? [] : stmt.args || [];
        const rows = await executeSql(sql, args);
        return { rows };
      },
      batch: async (statements: any[], _mode?: string) => {
        await executeBatch(statements);
        return [];
      }
    };

/**
 * دالة مساعدة لتنفيذ استعلام SQL واحد بأمان وإرجاع الصفوف ككائنات
 */
export async function executeSql<T = any>(
  sql: string,
  args: any[] = []
): Promise<T[]> {
  const cleanArgs = (args || []).map((a) => (a === undefined ? null : a));

  // إذا تم ضبط رابط Turso السحابي
  if (isTursoRemote && libSqlClient) {
    const result = await libSqlClient.execute({ sql, args: cleanArgs });
    return (result.rows as unknown) as T[];
  }

  // الوضع المحلي الأساسي المباشر عبر قاعدة بيانات wecare.db
  const res = await fetch('/api/libsql/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, args: cleanArgs })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'فشل تنفيذ استعلام قاعدة البيانات المحلية');
  }

  const data = await res.json();
  return (data.rows as unknown) as T[];
}

/**
 * دالة لتنفيذ مجموعة استعلامات دفعة واحدة (Batch / Transaction)
 */
export async function executeBatch(
  statements: Array<{ sql: string; args?: any[] } | string>
): Promise<void> {
  const cleanStatements = statements.map((st) => {
    if (typeof st === 'string') return st;
    return {
      sql: st.sql,
      args: (st.args || []).map((a) => (a === undefined ? null : a))
    };
  });

  // إذا تم ضبط رابط Turso السحابي
  if (isTursoRemote && libSqlClient) {
    await libSqlClient.batch(cleanStatements, 'write');
    return;
  }

  // الوضع المحلي الأساسي المباشر عبر قاعدة بيانات wecare.db
  const res = await fetch('/api/libsql/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: cleanStatements })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'فشل تنفيذ مجموعة الاستعلامات المحلية');
  }
}

/**
 * فحص الاتصال بقاعدة بيانات libSQL
 */
export async function testLibSqlConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await executeSql('SELECT 1 as test');
    if (res.length > 0) {
      return {
        ok: true,
        message: isTursoRemote
          ? 'الاتصال بقاعدة بيانات libSQL السحابية (Turso) يعمل بنجاح 100%'
          : 'قاعدة بيانات libSQL المحلية (wecare.db) متصلة وتعمل بنجاح 100%'
      };
    }
    return { ok: false, message: 'استجابة غير متوقعة من libSQL' };
  } catch (e: any) {
    return { ok: false, message: `فشل الاتصال بـ libSQL: ${e?.message || e}` };
  }
}

/**
 * قائمة جمل إنشاء الجداول والفهارس في libSQL
 */
export const LIBSQL_TABLE_STATEMENTS: string[] = [
  // 1. الإعدادات
  `CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري',
    institution_name TEXT,
    logo_url TEXT,
    country TEXT NOT NULL DEFAULT 'مصر',
    currency_symbol TEXT NOT NULL DEFAULT 'ج.م',
    currency_code TEXT NOT NULL DEFAULT 'EGP',
    dial_code TEXT NOT NULL DEFAULT '20',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 2. مناطق التغطية
  `CREATE TABLE IF NOT EXISTS coverage_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'الشيخ زايد / 6 أكتوبر',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 3. الموظفين
  `CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    hire_date TEXT NOT NULL DEFAULT (date('now')),
    national_id_image_url TEXT,
    id_card_image_url TEXT,
    role TEXT NOT NULL DEFAULT 'worker',
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 4. الصلاحيات
  `CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role TEXT,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    page_module TEXT,
    action TEXT,
    page_key TEXT,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_read INTEGER NOT NULL DEFAULT 1,
    can_update INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS employee_permissions (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_read INTEGER NOT NULL DEFAULT 1,
    can_update INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    UNIQUE(employee_id, page_key)
  )`,

  // 5. الحضور
  `CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'present',
    check_in TEXT,
    check_out TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(employee_id, date)
  )`,

  // 6. العملاء
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    full_name TEXT,
    mobile TEXT,
    phone TEXT UNIQUE,
    area_id TEXT REFERENCES coverage_areas(id) ON DELETE SET NULL,
    building_number TEXT NOT NULL DEFAULT '',
    block TEXT NOT NULL DEFAULT '',
    block_number TEXT,
    detailed_address TEXT,
    location_url TEXT,
    username TEXT UNIQUE,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 7. السيارات
  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT,
    vehicle_type TEXT,
    color TEXT NOT NULL,
    license_plate TEXT,
    plate_number TEXT,
    image_url TEXT,
    vehicle_image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 8. التصنيفات
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 9. الباقات
  `CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'monthly',
    level TEXT,
    duration_days INTEGER NOT NULL DEFAULT 30,
    weekly_visits_count INTEGER NOT NULL DEFAULT 1,
    weekly_services_plan TEXT DEFAULT '[]',
    base_visits_count INTEGER NOT NULL DEFAULT 4,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 10. التسعير حسب المنطقة
  `CREATE TABLE IF NOT EXISTS package_area_pricing (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES coverage_areas(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_id, area_id)
  )`,

  // 11. الخزائن
  `CREATE TABLE IF NOT EXISTS treasuries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'sub',
    payment_method_id TEXT,
    balance REAL NOT NULL DEFAULT 0.00,
    is_deletable INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 12. طرق الدفع
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    treasury_id TEXT REFERENCES treasuries(id) ON DELETE SET NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 13. الاشتراكات
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    area_id TEXT NOT NULL REFERENCES coverage_areas(id) ON DELETE RESTRICT,
    assigned_worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    preferred_day_of_week TEXT NOT NULL,
    selected_days TEXT DEFAULT '[]',
    preferred_time_from TEXT,
    preferred_time_to TEXT,
    start_date TEXT NOT NULL DEFAULT (date('now')),
    end_date TEXT NOT NULL,
    total_price REAL NOT NULL,
    notes TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    paid_at TEXT,
    approved_at TEXT,
    approved_by TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 14. الزيارات
  `CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    assigned_worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    scheduled_date TEXT NOT NULL,
    scheduled_time_from TEXT,
    scheduled_time_to TEXT,
    service_type TEXT,
    day_of_week TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    postponed_from_date TEXT,
    postponed_reason TEXT,
    notes TEXT,
    rating REAL,
    rating_comment TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 15. حركات الخزينة
  `CREATE TABLE IF NOT EXISTS treasury_transactions (
    id TEXT PRIMARY KEY,
    treasury_id TEXT NOT NULL REFERENCES treasuries(id) ON DELETE RESTRICT,
    related_treasury_id TEXT REFERENCES treasuries(id) ON DELETE SET NULL,
    related_payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'deposit',
    transaction_type TEXT,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'النظام الإداري',
    performed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 16. المخزون
  `CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'قطعة',
    current_stock REAL NOT NULL DEFAULT 0,
    min_alert_threshold REAL NOT NULL DEFAULT 5,
    unit_cost REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 17. حركات المخزون
  `CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    invoice_ref TEXT,
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'أمين المخزن',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 18. المعدات والأجهزة
  `CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    condition TEXT NOT NULL DEFAULT 'ممتازة',
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_date TEXT NOT NULL DEFAULT (date('now')),
    purchase_price REAL NOT NULL DEFAULT 0,
    depreciation_rate REAL NOT NULL DEFAULT 10.00,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 19. الموردين (Suppliers)
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    opening_balance REAL NOT NULL DEFAULT 0.0,
    current_balance REAL NOT NULL DEFAULT 0.0,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 20. حركات ودفعات الموردين (Supplier Transactions & Payments)
  `CREATE TABLE IF NOT EXISTS supplier_transactions (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'purchase', 'payment', 'return', 'opening_balance'
    amount REAL NOT NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    invoice_number TEXT,
    treasury_id TEXT REFERENCES treasuries(id) ON DELETE SET NULL,
    payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'الإدارة',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 21. أوامر التوريد (Purchase Orders)
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    order_date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'converted', 'cancelled'
    items TEXT NOT NULL DEFAULT '[]',
    total_amount REAL NOT NULL DEFAULT 0.0,
    converted_invoice_number TEXT,
    converted_at TEXT,
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'مسؤول المشتريات',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 22. بنود أمر التوريد (Purchase Order Items - Normalized)
  `CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    barcode TEXT,
    unit TEXT NOT NULL DEFAULT 'قطعة',
    quantity_requested REAL NOT NULL DEFAULT 1.0,
    quantity_received REAL DEFAULT 0.0,
    unit_price REAL DEFAULT 0.0,
    total_price REAL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // الفهارس
  `CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_subscription ON visits(subscription_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_scheduled_date ON visits(scheduled_date)`,
  `CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier ON supplier_transactions(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_supplier_tx_date ON supplier_transactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date)`,
  `CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`
];

import { LIBSQL_SEED_STATEMENTS } from './libsqlSeed';

/**
 * دالة زرع البيانات التأسيسية والحالية في قاعدة libSQL
 */
export async function seedLibSqlDatabase(): Promise<boolean> {
  if (!libSqlClient) return false;
  try {
    for (const statement of LIBSQL_SEED_STATEMENTS) {
      await libSqlClient.execute(statement);
    }
    return true;
  } catch (err) {
    console.error('Failed to seed libSQL database:', err);
    return false;
  }
}

/**
 * تهيئة جداول libSQL تلقائياً مع زرع البيانات إن كانت فارغة
 */
let isInitialized = false;

export async function initLibSqlSchema(): Promise<boolean> {
  if (!libSqlClient || isInitialized) return true;
  try {
    for (const statement of LIBSQL_TABLE_STATEMENTS) {
      await libSqlClient.execute(statement);
    }

    // الترحيل التلقائي للأعمدة الجديدة (Migrations الآمنة)
    const migrations = [
      `ALTER TABLE packages ADD COLUMN weekly_visits_count INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE packages ADD COLUMN weekly_services_plan TEXT DEFAULT '[]'`,
      `ALTER TABLE subscriptions ADD COLUMN selected_days TEXT DEFAULT '[]'`,
      `ALTER TABLE visits ADD COLUMN service_type TEXT`,
      `ALTER TABLE visits ADD COLUMN day_of_week TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE inventory_items ADD COLUMN barcode TEXT`,
      `ALTER TABLE equipment ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE purchase_orders ADD COLUMN items TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE purchase_orders ADD COLUMN total_amount REAL NOT NULL DEFAULT 0.0`,
      `ALTER TABLE purchase_orders ADD COLUMN converted_invoice_number TEXT`,
      `ALTER TABLE purchase_orders ADD COLUMN converted_at TEXT`
    ];
    for (const mig of migrations) {
      try {
        await libSqlClient.execute(mig);
      } catch {
        // تم تجاوز الخطأ إن كان العمود مضافاً مسبقاً
      }
    }

    isInitialized = true;

    // فحص ما إذا كانت الجداول فارغة لزرع البيانات التأسيسية فوراً
    try {
      const check = await libSqlClient.execute('SELECT COUNT(*) as cnt FROM coverage_areas');
      const count = Number((check.rows[0] as any)?.cnt || 0);
      if (count === 0) {
        console.log('جاري تهيئة وزرع البيانات في قاعدة libSQL لأول مرة...');
        await seedLibSqlDatabase();
      }
    } catch (seedErr) {
      console.warn('تنبيه أثناء التحقق من زرع البيانات في libSQL:', seedErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to initialize libSQL schema:', err);
    return false;
  }
}

