const { createClient } = require('@libsql/client');

async function migrate() {
  const db = createClient({ url: 'file:wecare.db' });

  // Add columns to services if not exist
  const newServiceCols = [
    { name: 'sub_category', type: "TEXT DEFAULT 'wash'" },
    { name: 'includes', type: "TEXT DEFAULT '[]'" },
    { name: 'icon_type', type: "TEXT DEFAULT 'spark'" },
    { name: 'duration_minutes', type: "INTEGER DEFAULT 45" },
    { name: 'popular', type: "INTEGER DEFAULT 0" },
    { name: 'tile_bg', type: "TEXT DEFAULT '#E3F2EF'" },
    { name: 'tile_fg', type: "TEXT DEFAULT '#0B7F72'" }
  ];

  for (const col of newServiceCols) {
    try {
      await db.execute(`ALTER TABLE services ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Added column ${col.name} to services`);
    } catch (e) {
      // Column might already exist
    }
  }

  // Add columns to service_bookings if not exist
  const newBookingCols = [
    { name: 'service_ids', type: "TEXT DEFAULT '[]'" },
    { name: 'services_summary', type: "TEXT" },
    { name: 'oil_type', type: "TEXT" }
  ];

  for (const col of newBookingCols) {
    try {
      await db.execute(`ALTER TABLE service_bookings ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Added column ${col.name} to service_bookings`);
    } catch (e) {
      // Column might already exist
    }
  }

  // Update care services with detailed items matching B-Care.dc.html
  const updates = [
    {
      id: 'srv-full',
      sub_category: 'wash',
      icon_type: 'spark',
      tile_bg: '#E3F2EF',
      tile_fg: '#0B7F72',
      price: 150,
      duration_minutes: 40,
      popular: 0,
      includes: JSON.stringify(['الهيكل الخارجي', 'الزجاج والجنوط', 'المقصورة الداخلية'])
    },
    {
      id: 'srv-chem',
      sub_category: 'wash',
      icon_type: 'spark',
      tile_bg: '#EAF1F6',
      tile_fg: '#1F6FB2',
      price: 350,
      duration_minutes: 90,
      popular: 0,
      includes: JSON.stringify(['تنظيف عميق للفرش', 'السقف والدواسات', 'إزالة البقع الصعبة'])
    },
    {
      id: 'srv-oil',
      sub_category: 'maint',
      icon_type: 'drop',
      tile_bg: '#FEF3C7',
      tile_fg: '#92400E',
      price: 120,
      duration_minutes: 30,
      popular: 0,
      includes: JSON.stringify(['زيت من المتجر أو زيتك', 'عند باب العمارة', 'فحص السوائل'])
    },
    {
      id: 'srv-steam',
      sub_category: 'shine',
      icon_type: 'steam',
      tile_bg: '#E3F2EF',
      tile_fg: '#0B7F72',
      price: 200,
      duration_minutes: 45,
      popular: 1,
      includes: JSON.stringify(['الفرش بالكامل', 'السقف والأبواب', 'مجاري التكييف'])
    },
    {
      id: 'srv-polish',
      sub_category: 'shine',
      icon_type: 'gem',
      tile_bg: '#F1EEE8',
      tile_fg: '#8A6A2E',
      price: 350,
      duration_minutes: 60,
      popular: 0,
      includes: JSON.stringify(['تلميع الطلاء', 'حماية تدوم طويلاً', 'تنظيف المقصورة بالبخار'])
    }
  ];

  for (const u of updates) {
    await db.execute({
      sql: `UPDATE services SET 
              sub_category = ?, 
              icon_type = ?, 
              tile_bg = ?, 
              tile_fg = ?, 
              price = ?, 
              duration_minutes = ?, 
              popular = ?, 
              includes = ? 
            WHERE id = ?`,
      args: [u.sub_category, u.icon_type, u.tile_bg, u.tile_fg, u.price, u.duration_minutes, u.popular, u.includes, u.id]
    });
  }

  console.log('Services schema enhanced and seeded with B-Care detailed services successfully!');
}

migrate().catch(console.error);
