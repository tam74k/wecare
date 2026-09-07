-- ==============================================================================
-- وثيقة وهندسة قاعدة بيانات نظام وي كير (WeCare) لإدارة خدمات الغسيل المتنقل والعقاري
-- قاعدة البيانات: Supabase (PostgreSQL)
-- جميع الحقوق والسياسات RLS، الدوال التلقائية لتوليد الزيارات والأرشفة
-- ==============================================================================

-- تفعيل ملحق UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول إعدادات التطبيق في سوبابيز (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'وي كير لخدمات الغسيل الراقي',
    logo_url TEXT DEFAULT 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=150&auto=format&fit=crop&q=80',
    country VARCHAR(100) NOT NULL DEFAULT 'مصر',
    currency_symbol VARCHAR(20) NOT NULL DEFAULT 'ج.م',
    currency_code VARCHAR(10) NOT NULL DEFAULT 'EGP',
    dial_code VARCHAR(10) NOT NULL DEFAULT '20',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول مناطق التغطية والكمبوندات (Coverage Areas)
CREATE TABLE IF NOT EXISTS coverage_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'الشيخ زايد / 6 أكتوبر',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول الموظفين (Employees)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    national_id VARCHAR(14) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    national_id_image_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'worker', -- 'admin', 'supervisor', 'worker'
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول الصلاحيات الدقيقة للموظفين (Employee RBAC Permissions)
CREATE TABLE IF NOT EXISTS employee_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    page_key VARCHAR(50) NOT NULL, -- 'dashboard', 'customers', 'subscriptions', 'calendar', 'finance', 'inventory', 'employees', 'reports', 'settings'
    can_create BOOLEAN DEFAULT false NOT NULL,
    can_read BOOLEAN DEFAULT true NOT NULL,
    can_update BOOLEAN DEFAULT false NOT NULL,
    can_delete BOOLEAN DEFAULT false NOT NULL,
    can_approve BOOLEAN DEFAULT false NOT NULL,
    UNIQUE(employee_id, page_key)
);

-- 5. جدول الحضور والغياب اليومي (Attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'leave'
    check_in TIME,
    check_out TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, date)
);

-- 6. جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- فريد وغير قابل للتكرار UNIQUE
    area_id UUID REFERENCES coverage_areas(id) ON DELETE SET NULL,
    building_number VARCHAR(50) NOT NULL,
    block_number VARCHAR(50) NOT NULL, -- A, B, C...
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. جدول المركبات (Vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(100) NOT NULL, -- مثل: سيدان، SUV، هاتشباك
    color VARCHAR(50) NOT NULL,
    plate_number VARCHAR(50) NOT NULL,
    vehicle_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. جدول تصنيفات الباقات (Package Categories)
CREATE TABLE IF NOT EXISTS package_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- سيارات، عمارات، إلخ
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. جدول الباقات (Packages)
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES package_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'semi_annual', 'annual'
    duration_days INTEGER NOT NULL DEFAULT 30,
    base_visits_count INTEGER NOT NULL DEFAULT 4,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. جدول التسعير المرن للباقات حسب المنطقة (Package Pricing)
CREATE TABLE IF NOT EXISTS package_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    area_id UUID REFERENCES coverage_areas(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(package_id, area_id)
);

-- 11. جدول الاشتراكات (Subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL, -- اختياري لباقات العمارات
    package_id UUID REFERENCES packages(id) ON DELETE RESTRICT,
    area_id UUID REFERENCES coverage_areas(id) ON DELETE RESTRICT,
    assigned_worker_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'archived', 'cancelled'
    preferred_day_of_week VARCHAR(50) NOT NULL, -- 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
    preferred_time_from TIME NOT NULL,
    preferred_time_to TIME NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. جدول الزيارات المجدولة (Visits)
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    assigned_worker_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time_from TIME NOT NULL,
    scheduled_time_to TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'
    postponed_from_date DATE,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. جدول الخزائن (Treasuries)
CREATE TABLE IF NOT EXISTS treasuries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'sub', -- 'main', 'sub'
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_deletable BOOLEAN DEFAULT true NOT NULL, -- الخزينة الرئيسية غير قابلة للحذف
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. جدول طرق الدفع (Payment Methods)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- كاش، فيزا، فودافون كاش...
    treasury_id UUID REFERENCES treasuries(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. جدول حركات الخزينة (Treasury Transactions)
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treasury_id UUID REFERENCES treasuries(id) ON DELETE RESTRICT,
    related_treasury_id UUID REFERENCES treasuries(id) ON DELETE SET NULL, -- في حالة التحويل
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'transfer'
    amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL DEFAULT 'النظام الإداري',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. جدول أصناف المخزون الاستهلاكية (Inventory Items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'قطعة', -- لتر، قطعة، كرتونة
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_alert_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. جدول حركات المخزون (Inventory Transactions)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'worker_issuance', 'addition_purchase', 'adjustment'
    quantity NUMERIC(12, 2) NOT NULL,
    worker_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    invoice_ref VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(255) NOT NULL DEFAULT 'أمين المخزن',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. جدول المعدات والأجهزة (Equipment)
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'ممتازة', -- ممتازة، جيدة، تحتاج صيانة، تالفة
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    depreciation_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- نسبة مئوية سنوية
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- دوال قاعدة البيانات التلقائية (PL/pgSQL Functions)
-- ==============================================================================

-- دالة تحويل الاسم العربي لليوم إلى رقم اليوم في PostgreSQL (0: الأحد, 1: الإثنين, ..., 6: السبت)
CREATE OR REPLACE FUNCTION get_day_number_from_arabic(arabic_day VARCHAR)
RETURNS INT AS $$
BEGIN
    RETURN CASE arabic_day
        WHEN 'الأحد' THEN 0
        WHEN 'الإثنين' THEN 1
        WHEN 'الاثنين' THEN 1
        WHEN 'الثلاثاء' THEN 2
        WHEN 'الأربعاء' THEN 3
        WHEN 'الاربعاء' THEN 3
        WHEN 'الخميس' THEN 4
        WHEN 'الجمعة' THEN 5
        WHEN 'السبت' THEN 6
        ELSE 6
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- دالة توليد الزيارات المستقبلية تلقائياً عند اعتماد الاشتراك (Generate Visits)
CREATE OR REPLACE FUNCTION generate_subscription_visits(p_subscription_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sub RECORD;
    v_target_day_num INT;
    v_current_date DATE;
    v_visit_count INT := 0;
    v_max_visits INT;
    v_interval_days INT := 7;
BEGIN
    -- جلب تفاصيل الاشتراك والباقة
    SELECT s.*, p.base_visits_count, p.duration_days
    INTO v_sub
    FROM subscriptions s
    JOIN packages p ON s.package_id = p.id
    WHERE s.id = p_subscription_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription % not found', p_subscription_id;
    END IF;

    v_max_visits := v_sub.base_visits_count;
    v_target_day_num := get_day_number_from_arabic(v_sub.preferred_day_of_week);

    -- العثور على أول تاريخ يوافق اليوم المفضل بدءاً من تاريخ البداية
    v_current_date := v_sub.start_date;
    WHILE EXTRACT(DOW FROM v_current_date) <> v_target_day_num LOOP
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    -- إذا كانت الباقة شهرية و 4 زيارات فإن الفترة أسبوعية، وإذا كانت أكثر نحسب الفاصل
    IF v_max_visits > 0 THEN
        WHILE v_visit_count < v_max_visits AND v_current_date <= v_sub.end_date LOOP
            INSERT INTO visits (
                subscription_id,
                customer_id,
                assigned_worker_id,
                scheduled_date,
                scheduled_time_from,
                scheduled_time_to,
                status
            ) VALUES (
                v_sub.id,
                v_sub.customer_id,
                v_sub.assigned_worker_id,
                v_current_date,
                v_sub.preferred_time_from,
                v_sub.preferred_time_to,
                'scheduled'
            );

            v_visit_count := v_visit_count + 1;
            v_current_date := v_current_date + INTERVAL '7 days';
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة الأرشفة التلقائية للاشتراكات المنتهية لأكثر من 10 أيام
CREATE OR REPLACE FUNCTION archive_expired_subscriptions()
RETURNS INT AS $$
DECLARE
    v_archived_count INT;
BEGIN
    UPDATE subscriptions
    SET status = 'archived',
        archived_at = now()
    WHERE status = 'expired'
      AND end_date < CURRENT_DATE - INTERVAL '10 days';

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- تفعيل RLS على كافة الجداول
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- سياسات RLS العامة للوصول الموثوق
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS allow_all_authenticated ON %I', t);
        EXECUTE format('CREATE POLICY allow_all_authenticated ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- ==============================================================================
-- البيانات التأسيسية الإلزامية لتشغيل النظام (Baseline Configuration Only)
-- لا توجد بيانات وهمية غير ضرورية، فقط الإعدادات والخزينة الرئيسية الأساسية
-- ==============================================================================

-- 1. الإعدادات العامة الأساسية (جدول system_settings)
INSERT INTO system_settings (id, company_name, country, currency_symbol, currency_code, dial_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري', 'مصر', 'ج.م', 'EGP', '20')
ON CONFLICT (id) DO NOTHING;

-- 2. الخزينة الرئيسية الأساسية (ثابتة وغير قابلة للحذف)
INSERT INTO treasuries (id, name, type, balance, is_deletable)
VALUES ('00000000-0000-0000-0000-000000000002', 'الخزينة الرئيسية للمؤسسة', 'main', 0.00, false)
ON CONFLICT (id) DO NOTHING;

-- 3. خزينة فرعية للكاش
INSERT INTO treasuries (id, name, type, balance, is_deletable)
VALUES ('00000000-0000-0000-0000-000000000003', 'خزينة التحصيل النقدي (كاش)', 'sub', 0.00, true)
ON CONFLICT (id) DO NOTHING;

-- 4. طرق الدفع الأساسية
INSERT INTO payment_methods (id, name, treasury_id, is_active)
VALUES ('00000000-0000-0000-0000-000000000004', 'نقدي (كاش)', '00000000-0000-0000-0000-000000000003', true)
ON CONFLICT (id) DO NOTHING;

-- 5. التصنيفات الأساسية
INSERT INTO package_categories (id, name, description, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000005', 'غسيل وتلميع السيارات المتنقل', 'خدمات غسيل وتشميع وتلميع السيارات أمام العمارات والفيلات', true),
    ('00000000-0000-0000-0000-000000000006', 'غسيل ونظافة العمارات السكنية', 'غسيل المداخل والسلالم والأسطح والحدائق للعمارات بالكمبوندات', true)
ON CONFLICT (id) DO NOTHING;

-- 6. إنشاء وتأمين مخزن الملفات (Storage Bucket) باسم carwash-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('carwash-assets', 'carwash-assets', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول إلى الملفات (قراءة عامة، إضافة وحذف)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "Public Access carwash-assets" ON storage.objects;
        CREATE POLICY "Public Access carwash-assets" ON storage.objects FOR SELECT USING (bucket_id = 'carwash-assets');

        DROP POLICY IF EXISTS "Upload carwash-assets" ON storage.objects;
        CREATE POLICY "Upload carwash-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'carwash-assets');

        DROP POLICY IF EXISTS "Update carwash-assets" ON storage.objects;
        CREATE POLICY "Update carwash-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'carwash-assets');

        DROP POLICY IF EXISTS "Delete carwash-assets" ON storage.objects;
        CREATE POLICY "Delete carwash-assets" ON storage.objects FOR DELETE USING (bucket_id = 'carwash-assets');
    END IF;
END $$;

