const { createClient } = require('@libsql/client');

async function seed() {
  const db = createClient({ url: 'file:wecare.db' });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      group_name TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      price_type TEXT NOT NULL DEFAULT 'fixed',
      kind TEXT NOT NULL DEFAULT 'car',
      options TEXT DEFAULT '[]',
      airport_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS service_bookings (
      id TEXT PRIMARY KEY,
      booking_number TEXT UNIQUE,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      vehicle_id TEXT,
      location_address TEXT,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      selected_option TEXT,
      notes TEXT,
      price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      assigned_worker_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const defaultServices = [
    {
      id: 'srv-full',
      category: 'car',
      group_name: 'غسيل وعناية',
      name: 'غسيل برة وجوة خاص',
      description: 'غسيل كامل من الخارج والداخل بعناية فائقة وتجفيف كامل',
      price: 150,
      price_type: 'fixed',
      kind: 'car',
      display_order: 1
    },
    {
      id: 'srv-chem',
      category: 'car',
      group_name: 'غسيل وعناية',
      name: 'غسيل كيماوي',
      description: 'تنظيف عميق وشامل للفرش والأرضيات والسقف وإزالة البقع',
      price: 350,
      price_type: 'fixed',
      kind: 'car',
      display_order: 2
    },
    {
      id: 'srv-steam',
      category: 'car',
      group_name: 'غسيل وعناية',
      name: 'التعقيم بالبخار',
      description: 'تعقيم الفرش ومجاري التكييف وقتل البكتيريا وإزالة الروائح الكريهة',
      price: 200,
      price_type: 'fixed',
      kind: 'car',
      display_order: 3
    },
    {
      id: 'srv-polish',
      category: 'car',
      group_name: 'غسيل وعناية',
      name: 'التلميع الماسي',
      description: 'تلميع احترافي يمنح طلاء السيارة لمعاناً كريستالياً وطبقة حماية',
      price: 350,
      price_type: 'fixed',
      kind: 'car',
      display_order: 4
    },
    {
      id: 'srv-oil',
      category: 'car',
      group_name: 'صيانة',
      name: 'تغيير زيت تحت البيت',
      description: 'الفني بيغيّر الزيت والفلتر عند مكان سيارتك في الكمبوند',
      price: 120,
      price_type: 'fixed',
      kind: 'oil',
      options: JSON.stringify([['mobil', 'موبيل 5000'], ['power', 'باور'], ['total', 'توتال'], ['own', 'عندي الزيت']]),
      display_order: 5
    },
    {
      id: 'srv-cai',
      category: 'car',
      group_name: 'توصيل وإيجار',
      name: 'توصيل مطار القاهرة',
      description: 'من باب العمارة إلى مطار القاهرة أو العكس بسيارة مريحة ومكيفة',
      price: 1000,
      price_type: 'fixed',
      kind: 'airport',
      airport_name: 'مطار القاهرة',
      options: JSON.stringify([['to', 'توصيل للمطار'], ['from', 'استقبال من المطار']]),
      display_order: 6
    },
    {
      id: 'srv-sph',
      category: 'car',
      group_name: 'توصيل وإيجار',
      name: 'توصيل مطار سفنكس',
      description: 'من باب العمارة إلى مطار سفنكس الدولي أو العكس',
      price: 600,
      price_type: 'fixed',
      kind: 'airport',
      airport_name: 'مطار سفنكس',
      options: JSON.stringify([['to', 'توصيل للمطار'], ['from', 'استقبال من المطار']]),
      display_order: 7
    },
    {
      id: 'srv-rentd',
      category: 'car',
      group_name: 'توصيل وإيجار',
      name: 'إيجار سيارة بسائق',
      description: 'سيارة حديثة مع سائق محترف للمشاوير الخاصة أو لأيام متعددة',
      price: 0,
      price_type: 'custom',
      kind: 'rental',
      options: JSON.stringify([['half', 'نص يوم'], ['day', 'يوم كامل'], ['more', 'أكتر من يوم']]),
      display_order: 8
    },
    {
      id: 'srv-rent',
      category: 'car',
      group_name: 'توصيل وإيجار',
      name: 'إيجار سيارة بدون سائق',
      description: 'استلم السيارة وقود بنفسك بأفضل الأسعار وتأمين شامل',
      price: 0,
      price_type: 'custom',
      kind: 'rental',
      options: JSON.stringify([['half', 'نص يوم'], ['day', 'يوم كامل'], ['more', 'أكتر من يوم']]),
      display_order: 9
    },
    {
      id: 'srv-garden',
      category: 'building',
      group_name: 'تنظيف',
      name: 'تنظيف الحديقة',
      description: 'تنظيف الحديقة وإزالة أوراق الشجر والمخلفات وتنسيق المكان',
      price: 250,
      price_type: 'fixed',
      kind: 'place',
      display_order: 10
    },
    {
      id: 'srv-entry',
      category: 'building',
      group_name: 'تنظيف',
      name: 'غسيل المدخل',
      description: 'غسيل كامل وشامل لمدخل العمارة أو مدخل الفيلا وإزالة الأتربة',
      price: 200,
      price_type: 'fixed',
      kind: 'place',
      display_order: 11
    },
    {
      id: 'srv-garage',
      category: 'building',
      group_name: 'تنظيف',
      name: 'تنظيف الجراجات',
      description: 'غسيل أرضيات الجراجات وإزالة بقع الزيوت والشحوم والأتربة المتراكمة',
      price: 300,
      price_type: 'fixed',
      kind: 'place',
      display_order: 12
    },
    {
      id: 'srv-tap',
      category: 'building',
      group_name: 'تركيبات',
      name: 'إضافة نقطة مياه بالجراج',
      description: 'تمديد وتركيب نقطة مياه إضافية بمحبس احترافي داخل الجراج',
      price: 400,
      price_type: 'fixed',
      kind: 'place',
      display_order: 13
    }
  ];

  for (const s of defaultServices) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO services (id, category, group_name, name, description, price, price_type, kind, options, airport_name, is_active, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`,
      args: [s.id, s.category, s.group_name, s.name, s.description, s.price, s.price_type, s.kind, s.options || '[]', s.airport_name || null, s.display_order]
    });
  }

  console.log('Services and bookings tables created and seeded successfully!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
