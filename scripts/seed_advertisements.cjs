const { createClient } = require('@libsql/client');

async function seed() {
  const client = createClient({ url: 'file:wecare.db' });
  await client.execute(`
    CREATE TABLE IF NOT EXISTS advertisements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      price REAL,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  const ads = [
    {
      id: 'ad-1-steam-clean',
      title: 'التعقيم الشامل بالبخار',
      description: 'الفرش والسقف ومجاري التكييف بتقنية البخار النفاث لقتل البكتيريا وإعادة سيارتك كأنها جديدة.',
      date: new Date().toISOString().split('T')[0],
      phone: '01277417480',
      whatsapp: '201277417480',
      price: 200,
      image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80',
      is_active: 1
    },
    {
      id: 'ad-2-diamond-polish',
      title: 'باقة التلميع الماسي',
      description: 'لمعان يدوم وحماية للطلاء من الخدوش والعوامل الجوية مع طبقة سيراميك نانو واقية.',
      date: new Date().toISOString().split('T')[0],
      phone: '01277417480',
      whatsapp: '201277417480',
      price: 350,
      image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80',
      is_active: 1
    },
    {
      id: 'ad-3-carrier-ac',
      title: 'تكييف كاريير 2.25 حصان انفرتر',
      description: 'بدلاً من 49,000 ج.م - موفر للطاقة بضمان معتمد وتوصيل وتركيب مجاني.',
      date: new Date().toISOString().split('T')[0],
      phone: '01277417480',
      whatsapp: '201277417480',
      price: 44190,
      image_url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=600&q=80',
      is_active: 1
    },
    {
      id: 'ad-4-apartment-sale',
      title: 'شقة للبيع على بوابة 1',
      description: '160 م² · تشطيب سوبر لوكس · 3 غرف و2 حمام بموقع متميز وإطلالة مفتوحة.',
      date: new Date().toISOString().split('T')[0],
      phone: '01277417480',
      whatsapp: '201277417480',
      price: 5000000,
      image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80',
      is_active: 1
    }
  ];

  for (const ad of ads) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO advertisements (id, title, description, date, phone, whatsapp, price, image_url, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [ad.id, ad.title, ad.description, ad.date, ad.phone, ad.whatsapp, ad.price, ad.image_url, ad.is_active]
    });
  }

  const res = await client.execute('SELECT id, title, price, is_active FROM advertisements');
  console.log('Successfully seeded ads in wecare.db, count:', res.rows.length);
  console.log(res.rows);
}

seed().catch(console.error);
