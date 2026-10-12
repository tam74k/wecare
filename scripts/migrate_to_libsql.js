import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'wecare.db');

console.log('Target database path:', dbPath);

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = createClient({
  url: `file:${dbPath}`
});

async function executeSafe(sql, args = []) {
  const cleanArgs = args.map(a => (a === undefined || a === null ? null : a));
  return db.execute({ sql, args: cleanArgs });
}

const supabaseUrl = 'https://ipfcmayvwdblwnnxhbhb.supabase.co/rest/v1';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZmNtYXl2d2RibHdubnhoYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjQxMTgsImV4cCI6MjEwNDE0MDExOH0.IOBMEkfE_JvfMMM7hVMiBgDNYF2skDER4NHKhLpf1d0';
const headers = { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey };

async function fetchSupabaseTable(tableName) {
  try {
    const res = await fetch(`${supabaseUrl}/${tableName}?select=*`, { headers });
    if (!res.ok) {
      console.warn(`[Supabase] Table ${tableName} HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    console.log(`[Supabase] Fetched ${data.length} records from ${tableName}`);
    return data;
  } catch (err) {
    console.warn(`[Supabase] Error fetching ${tableName}:`, err.message);
    return [];
  }
}

// 1. All table schemas
const tableStatements = [
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

  `CREATE TABLE IF NOT EXISTS coverage_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'الشيخ زايد / 6 أكتوبر',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
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

  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    full_name TEXT,
    mobile TEXT,
    phone TEXT UNIQUE,
    area_id TEXT REFERENCES coverage_areas(id) ON DELETE SET NULL,
    building_number TEXT NOT NULL DEFAULT '',
    block TEXT NOT NULL DEFAULT 'A',
    block_number TEXT NOT NULL DEFAULT 'A',
    detailed_address TEXT NOT NULL DEFAULT '',
    location_url TEXT,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '123456',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'سيارة',
    vehicle_type TEXT NOT NULL DEFAULT 'سيارة',
    color TEXT NOT NULL DEFAULT '',
    plate_number TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    vehicle_image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS package_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES package_categories(id) ON DELETE SET NULL,
    base_price REAL NOT NULL DEFAULT 0,
    base_visits_count INTEGER NOT NULL DEFAULT 1,
    weekly_visits_count INTEGER NOT NULL DEFAULT 1,
    weekly_services_plan TEXT DEFAULT '[]',
    is_building INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS package_tiers (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    visits_count INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS package_pricing (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES coverage_areas(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_id, area_id)
  )`,

  `CREATE TABLE IF NOT EXISTS treasury (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'الخزينة الرئيسية',
    balance REAL NOT NULL DEFAULT 0.0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    package_id TEXT NOT NULL REFERENCES packages(id),
    area_id TEXT REFERENCES coverage_areas(id) ON DELETE SET NULL,
    assigned_worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    preferred_day_of_week TEXT NOT NULL DEFAULT 'السبت',
    preferred_time_from TEXT,
    preferred_time_to TEXT,
    selected_days TEXT DEFAULT '[]',
    total_price REAL NOT NULL DEFAULT 0.0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    payment_date TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT,
    day_of_week TEXT,
    service_type TEXT,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    rating INTEGER,
    feedback TEXT,
    completed_at TEXT,
    canceled_at TEXT,
    postponement_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS treasury_transactions (
    id TEXT PRIMARY KEY,
    treasury_id TEXT NOT NULL REFERENCES treasury(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    description TEXT,
    performed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'consumable',
    unit TEXT NOT NULL DEFAULT 'قطعة',
    quantity_on_hand REAL NOT NULL DEFAULT 0,
    cost_per_unit REAL NOT NULL DEFAULT 0,
    reorder_level REAL NOT NULL DEFAULT 5,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'working',
    assigned_to TEXT REFERENCES employees(id) ON DELETE SET NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`
];

async function migrate() {
  console.log('1. Executing table creation statements...');
  for (const stmt of tableStatements) {
    await db.execute(stmt);
  }
  console.log('Tables created successfully.');

  console.log('2. Inserting base seed data (categories, treasury)...');
  const baseSeeds = [
    `INSERT OR IGNORE INTO treasury (id, name, balance, updated_at) VALUES ('main-treasury', 'الخزينة النقدية الرئيسية', 0.0, datetime('now'))`,
    `INSERT OR IGNORE INTO package_categories (id, name, description, is_active) VALUES ('cat-cars', 'غسيل وتلميع المركبات', 'خدمات الغسيل الدوري والداخلي لسيارات الملاك والكمبوندات', 1)`,
    `INSERT OR IGNORE INTO package_categories (id, name, description, is_active) VALUES ('cat-buildings', 'غسيل ونظافة العمارات', 'خدمات النظافة الأسبوعية لمداخل ودرج وواجهات العمارات السكنية', 1)`
  ];
  for (const s of baseSeeds) {
    await db.execute(s);
  }

  console.log('3. Fetching and syncing real data from Supabase...');
  
  // 3.1 system_settings
  const settings = await fetchSupabaseTable('system_settings');
  for (const s of settings) {
    await executeSafe(
      `INSERT OR REPLACE INTO system_settings (id, company_name, institution_name, logo_url, country, currency_symbol, currency_code, dial_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.company_name || 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري',
        s.institution_name || null,
        s.logo_url || null,
        s.country || 'مصر',
        s.currency_symbol || 'ج.م',
        s.currency_code || 'EGP',
        s.dial_code || '20',
        s.created_at || new Date().toISOString(),
        s.updated_at || new Date().toISOString()
      ]
    );
  }

  // 3.2 coverage_areas
  const areas = await fetchSupabaseTable('coverage_areas');
  for (const a of areas) {
    await executeSafe(
      `INSERT OR REPLACE INTO coverage_areas (id, name, city, is_active, created_at) VALUES (?, ?, ?, ?, ?)`,
      [a.id, a.name, a.city || 'الشيخ زايد / 6 أكتوبر', a.is_active ? 1 : 1, a.created_at || new Date().toISOString()]
    );
  }

  // 3.3 employees
  const employees = await fetchSupabaseTable('employees');
  for (const e of employees) {
    await executeSafe(
      `INSERT OR REPLACE INTO employees (id, national_id, full_name, phone, address, hire_date, role, username, password_hash, status, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        e.national_id || ('2900000000000' + Math.floor(Math.random() * 900)),
        e.full_name,
        e.phone || e.mobile || '',
        e.address || '',
        e.hire_date || '2026-01-01',
        e.role || 'worker',
        e.username || e.phone,
        e.password_hash || '123456',
        e.status || 'active',
        e.is_active !== undefined ? (e.is_active ? 1 : 0) : 1,
        e.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.4 customers
  const customers = await fetchSupabaseTable('customers');
  for (const c of customers) {
    await executeSafe(
      `INSERT OR REPLACE INTO customers (id, name, full_name, mobile, phone, area_id, building_number, block, block_number, detailed_address, location_url, username, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.full_name || c.name,
        c.full_name || c.name,
        c.phone || c.mobile,
        c.phone || c.mobile,
        c.area_id || null,
        c.building_number || '',
        c.block_number || c.block || '',
        c.block_number || c.block || '',
        c.detailed_address || '',
        c.location_url || '',
        c.username || c.phone || '',
        c.password_hash || '123456',
        c.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.5 vehicles
  const vehicles = await fetchSupabaseTable('vehicles');
  for (const v of vehicles) {
    await executeSafe(
      `INSERT OR REPLACE INTO vehicles (id, customer_id, type, vehicle_type, color, plate_number, image_url, vehicle_image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id,
        v.customer_id,
        v.vehicle_type || v.type || 'سيارة',
        v.vehicle_type || v.type || 'سيارة',
        v.color || '',
        v.plate_number || '',
        v.image_url || v.vehicle_image_url || null,
        v.vehicle_image_url || v.image_url || null,
        v.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.5.1 package_categories (from Supabase 'categories' table)
  const categories = await fetchSupabaseTable('categories');
  for (const cat of categories) {
    await executeSafe(
      `INSERT OR REPLACE INTO package_categories (id, name, description, is_active, created_at) VALUES (?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.description || null, 1, cat.created_at || new Date().toISOString()]
    );
  }

  // 3.6 packages
  const packages = await fetchSupabaseTable('packages');
  for (const p of packages) {
    const weeklyVisits = p.weekly_visits_count || p.base_visits_count || 1;
    let servicesPlan = p.weekly_services_plan || '[]';
    if (typeof servicesPlan !== 'string') {
      servicesPlan = JSON.stringify(servicesPlan);
    }
    await executeSafe(
      `INSERT OR REPLACE INTO packages (id, name, description, category_id, base_price, base_visits_count, weekly_visits_count, weekly_services_plan, is_building, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.name,
        p.description || '',
        p.category_id || (p.is_building ? 'cat-buildings' : 'cat-cars'),
        p.base_price || 0,
        p.base_visits_count || weeklyVisits,
        weeklyVisits,
        servicesPlan,
        p.is_building ? 1 : 0,
        p.is_active !== false ? 1 : 0,
        p.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.6.1 package_pricing (from Supabase 'package_area_pricing' table)
  const areaPricing = await fetchSupabaseTable('package_area_pricing');
  for (const ap of areaPricing) {
    await executeSafe(
      `INSERT OR REPLACE INTO package_pricing (id, package_id, area_id, price, created_at) VALUES (?, ?, ?, ?, ?)`,
      [ap.id, ap.package_id, ap.area_id, ap.price || 0, ap.created_at || new Date().toISOString()]
    );
  }

  // 3.7 subscriptions
  const subscriptions = await fetchSupabaseTable('subscriptions');
  for (const s of subscriptions) {
    let selDays = s.selected_days || '[]';
    if (typeof selDays !== 'string') {
      selDays = JSON.stringify(selDays);
    }
    await executeSafe(
      `INSERT OR REPLACE INTO subscriptions (id, customer_id, vehicle_id, package_id, area_id, assigned_worker_id, start_date, end_date, preferred_day_of_week, preferred_time_from, preferred_time_to, selected_days, total_price, payment_status, payment_method_id, payment_date, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.customer_id,
        s.vehicle_id || null,
        s.package_id,
        s.area_id || null,
        s.assigned_worker_id || null,
        s.start_date,
        s.end_date,
        s.preferred_day_of_week || 'السبت',
        s.preferred_time_from || null,
        s.preferred_time_to || null,
        selDays,
        s.total_price || 0,
        s.payment_status || 'unpaid',
        s.payment_method_id || null,
        s.payment_date || null,
        s.notes || null,
        s.status || 'active',
        s.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.8 visits
  const visits = await fetchSupabaseTable('visits');
  for (const v of visits) {
    await executeSafe(
      `INSERT OR REPLACE INTO visits (id, subscription_id, scheduled_date, scheduled_time, day_of_week, service_type, worker_id, status, notes, rating, feedback, completed_at, canceled_at, postponement_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id,
        v.subscription_id,
        v.scheduled_date,
        v.scheduled_time || null,
        v.day_of_week || null,
        v.service_type || 'غسيل',
        v.worker_id || null,
        v.status || 'pending',
        v.notes || null,
        v.rating || null,
        v.feedback || null,
        v.completed_at || null,
        v.canceled_at || null,
        v.postponement_reason || null,
        v.created_at || new Date().toISOString()
      ]
    );
  }

  // 3.9 payment_methods
  const paymentMethods = await fetchSupabaseTable('payment_methods');
  for (const pm of paymentMethods) {
    await executeSafe(
      `INSERT OR REPLACE INTO payment_methods (id, name, type, is_active, created_at) VALUES (?, ?, ?, ?, ?)`,
      [pm.id, pm.name, pm.type || 'cash', pm.is_active ? 1 : 1, pm.created_at || new Date().toISOString()]
    );
  }

  console.log('\n=============================================');
  console.log('Migration verification counts in wecare.db:');
  const counts = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM system_settings'),
    db.execute('SELECT COUNT(*) as c FROM coverage_areas'),
    db.execute('SELECT COUNT(*) as c FROM employees'),
    db.execute('SELECT COUNT(*) as c FROM customers'),
    db.execute('SELECT COUNT(*) as c FROM vehicles'),
    db.execute('SELECT COUNT(*) as c FROM package_categories'),
    db.execute('SELECT COUNT(*) as c FROM packages'),
    db.execute('SELECT COUNT(*) as c FROM subscriptions'),
    db.execute('SELECT COUNT(*) as c FROM visits'),
    db.execute('SELECT COUNT(*) as c FROM payment_methods'),
    db.execute('SELECT COUNT(*) as c FROM treasury')
  ]);

  console.log('system_settings:    ', counts[0].rows[0].c);
  console.log('coverage_areas:     ', counts[1].rows[0].c);
  console.log('employees:          ', counts[2].rows[0].c);
  console.log('customers:          ', counts[3].rows[0].c);
  console.log('vehicles:           ', counts[4].rows[0].c);
  console.log('package_categories: ', counts[5].rows[0].c);
  console.log('packages:           ', counts[6].rows[0].c);
  console.log('subscriptions:      ', counts[7].rows[0].c);
  console.log('visits:             ', counts[8].rows[0].c);
  console.log('payment_methods:    ', counts[9].rows[0].c);
  console.log('treasury:           ', counts[10].rows[0].c);
  console.log('=============================================');

  console.log('\nSUCCESS! All real data migrated into wecare.db successfully!');
}

migrate().catch(console.error);
