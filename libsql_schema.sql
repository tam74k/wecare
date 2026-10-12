-- ==============================================================================
-- هيكل وتصميم قاعدة بيانات نظام وي كير (WeCare) بالكامل على libSQL / Turso
-- متوافق 100% مع معايير SQLite / libSQL
-- يضم جميع الجداول، العلاقات، الفهارس والقيود
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. جدول الإعدادات العامة (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري',
    institution_name TEXT,
    logo_url TEXT DEFAULT 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=150&auto=format&fit=crop&q=80',
    country TEXT NOT NULL DEFAULT 'مصر',
    currency_symbol TEXT NOT NULL DEFAULT 'ج.م',
    currency_code TEXT NOT NULL DEFAULT 'EGP',
    dial_code TEXT NOT NULL DEFAULT '20',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. جدول مناطق التغطية والكمبوندات (coverage_areas)
CREATE TABLE IF NOT EXISTS coverage_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'الشيخ زايد / 6 أكتوبر',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. جدول الموظفين (employees)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    hire_date TEXT NOT NULL DEFAULT (date('now')),
    national_id_image_url TEXT,
    id_card_image_url TEXT,
    role TEXT NOT NULL DEFAULT 'worker', -- 'admin', 'supervisor', 'worker'
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. جدول الصلاحيات العامة والوظيفية (permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role TEXT, -- 'admin', 'supervisor', 'worker'
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    page_module TEXT, -- 'all', 'dashboard', 'customers', etc.
    action TEXT, -- 'create', 'read', 'update', 'delete', 'approve'
    page_key TEXT,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_read INTEGER NOT NULL DEFAULT 1,
    can_update INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جدول الصلاحيات المخصصة لكل موظف (employee_permissions) كـ view أو جدول
CREATE TABLE IF NOT EXISTS employee_permissions (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_read INTEGER NOT NULL DEFAULT 1,
    can_update INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    UNIQUE(employee_id, page_key)
);

-- 5. جدول الحضور والغياب اليومي (attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'leave'
    check_in TEXT,
    check_out TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(employee_id, date)
);

-- 6. جدول العملاء (customers)
CREATE TABLE IF NOT EXISTS customers (
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
);

-- 7. جدول المركبات (vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
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
);

-- 8. جدول تصنيفات الباقات (categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. جدول الباقات (packages)
CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'semi_annual', 'annual'
    level TEXT,
    duration_days INTEGER NOT NULL DEFAULT 30,
    weekly_visits_count INTEGER NOT NULL DEFAULT 1, -- عدد الزيارات في الأسبوع الواحد (مثلاً: 3، 5، 7)
    weekly_services_plan TEXT DEFAULT '[]', -- مصفوفة الخدمات الأسبوعية المتتابعة بتنسيق JSON
    base_visits_count INTEGER NOT NULL DEFAULT 4,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. جدول التسعير المرن للباقات حسب المنطقة (package_area_pricing)
CREATE TABLE IF NOT EXISTS package_area_pricing (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES coverage_areas(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(package_id, area_id)
);

-- 11. جدول الخزائن (treasuries)
CREATE TABLE IF NOT EXISTS treasuries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'sub', -- 'main', 'sub', 'payment_method'
    payment_method_id TEXT,
    balance REAL NOT NULL DEFAULT 0.00,
    is_deletable INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. جدول طرق الدفع (payment_methods)
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    treasury_id TEXT REFERENCES treasuries(id) ON DELETE SET NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. جدول الاشتراكات (subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    area_id TEXT NOT NULL REFERENCES coverage_areas(id) ON DELETE RESTRICT,
    assigned_worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'archived', 'cancelled', 'paused'
    preferred_day_of_week TEXT NOT NULL,
    selected_days TEXT DEFAULT '[]', -- أيام الزيارة الأسبوعية المختارة للعميل بتنسيق JSON
    preferred_time_from TEXT,
    preferred_time_to TEXT,
    start_date TEXT NOT NULL DEFAULT (date('now')),
    end_date TEXT NOT NULL,
    total_price REAL NOT NULL,
    notes TEXT,
    payment_status TEXT DEFAULT 'unpaid', -- 'paid', 'unpaid', 'pending'
    payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    paid_at TEXT,
    approved_at TEXT,
    approved_by TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. جدول الزيارات المجدولة (visits)
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    assigned_worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    scheduled_date TEXT NOT NULL,
    scheduled_time_from TEXT,
    scheduled_time_to TEXT,
    service_type TEXT, -- نوع الخدمة المحددة بدقة لتلك الزيارة (غسيل، فوطة 1، فوطة 2...)
    day_of_week TEXT, -- اسم اليوم (الأحد، الثلاثاء، الخميس...)
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'
    postponed_from_date TEXT,
    postponed_reason TEXT,
    notes TEXT,
    rating REAL,
    rating_comment TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. جدول حركات الخزينة (treasury_transactions)
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id TEXT PRIMARY KEY,
    treasury_id TEXT NOT NULL REFERENCES treasuries(id) ON DELETE RESTRICT,
    related_treasury_id TEXT REFERENCES treasuries(id) ON DELETE SET NULL,
    related_payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'deposit', -- 'deposit', 'withdrawal', 'transfer'
    transaction_type TEXT,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'النظام الإداري',
    performed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. جدول أصناف المخزون (inventory_items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'قطعة',
    current_stock REAL NOT NULL DEFAULT 0,
    min_alert_threshold REAL NOT NULL DEFAULT 5,
    unit_cost REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. جدول حركات المخزون (inventory_transactions)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'worker_issuance', 'addition_purchase', 'adjustment'
    quantity REAL NOT NULL,
    worker_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    invoice_ref TEXT,
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'أمين المخزن',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. جدول المعدات والأجهزة (equipment)
CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    condition TEXT NOT NULL DEFAULT 'ممتازة',
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_date TEXT NOT NULL DEFAULT (date('now')),
    purchase_price REAL NOT NULL DEFAULT 0,
    depreciation_rate REAL NOT NULL DEFAULT 10.00,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==============================================================================
-- الفهارس لتحسين سرعة الاستعلامات (Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_area ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_visits_subscription ON visits(subscription_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_date ON visits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_visits_worker ON visits(worker_id);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_treasury ON treasury_transactions(treasury_id);
