import { createClient } from '@libsql/client';

async function sync() {
  const client = createClient({ url: 'file:wecare.db' });
  try {
    await client.execute(`
      INSERT OR IGNORE INTO categories (id, name, description, is_active, created_at)
      SELECT id, name, description, is_active, created_at FROM package_categories
    `);
    await client.execute(`
      INSERT OR IGNORE INTO package_area_pricing (id, package_id, area_id, price, created_at)
      SELECT id, package_id, area_id, price, created_at FROM package_pricing
    `);
    await client.execute(`
      INSERT OR IGNORE INTO treasuries (id, name, type, balance, is_deletable, created_at)
      SELECT id, name, 'main', balance, 0, updated_at FROM treasury
    `);

    const triggers = [
      `CREATE TRIGGER IF NOT EXISTS trg_cats_ins AFTER INSERT ON categories
       BEGIN
         INSERT OR REPLACE INTO package_categories (id, name, description, is_active, created_at)
         VALUES (new.id, new.name, new.description, new.is_active, new.created_at);
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_cats_upd AFTER UPDATE ON categories
       BEGIN
         UPDATE package_categories SET name = new.name, description = new.description, is_active = new.is_active WHERE id = new.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_cats_del AFTER DELETE ON categories
       BEGIN
         DELETE FROM package_categories WHERE id = old.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_pricing_ins AFTER INSERT ON package_area_pricing
       BEGIN
         INSERT OR REPLACE INTO package_pricing (id, package_id, area_id, price, created_at)
         VALUES (new.id, new.package_id, new.area_id, new.price, new.created_at);
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_pricing_upd AFTER UPDATE ON package_area_pricing
       BEGIN
         UPDATE package_pricing SET price = new.price WHERE id = new.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_pricing_del AFTER DELETE ON package_area_pricing
       BEGIN
         DELETE FROM package_pricing WHERE id = old.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_treasury_ins AFTER INSERT ON treasuries
       BEGIN
         INSERT OR REPLACE INTO treasury (id, name, balance, updated_at)
         VALUES (new.id, new.name, new.balance, new.created_at);
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_treasury_upd AFTER UPDATE ON treasuries
       BEGIN
         UPDATE treasury SET name = new.name, balance = new.balance, updated_at = datetime('now') WHERE id = new.id;
       END`,
      `CREATE TRIGGER IF NOT EXISTS trg_treasury_del AFTER DELETE ON treasuries
       BEGIN
         DELETE FROM treasury WHERE id = old.id;
       END`
    ];

    for (const t of triggers) {
      await client.execute(t);
    }

    console.log('Sync and triggers completed successfully.');
  } catch (err) {
    console.error('Sync error:', err);
  }
}

sync();
