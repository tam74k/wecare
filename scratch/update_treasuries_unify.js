import { createClient } from '@libsql/client';

async function updateDb() {
  const client = createClient({ url: 'file:wecare.db' });

  // Update treasuries names
  await client.execute("UPDATE treasuries SET name = 'الخزينة الرئيسية' WHERE id = 'main-treasury' OR type = 'main'");
  await client.execute("UPDATE treasuries SET name = 'الكاش' WHERE id = 't_kfsniulq' OR name = 'خزينة كاش' OR name = 'كاش'");
  await client.execute("UPDATE treasuries SET name = 'الفيزا' WHERE id = 't_40oeazn8' OR name = 'خزينة فيزا' OR name = 'فيزا'");
  await client.execute("UPDATE treasuries SET name = 'انستاباي' WHERE id = 't_3ne9nwye' OR name = 'خزينة انستاباي'");
  await client.execute("UPDATE treasuries SET name = 'فودافون' WHERE id = 't_msgjmbd7' OR name = 'خزينة فودافون كاش' OR name = 'فودافون كاش'");

  // Update payment methods names
  await client.execute("UPDATE payment_methods SET name = 'الكاش' WHERE name IN ('كاش', 'خزينة كاش')");
  await client.execute("UPDATE payment_methods SET name = 'الفيزا' WHERE name IN ('فيزا', 'خزينة فيزا')");
  await client.execute("UPDATE payment_methods SET name = 'انستاباي' WHERE name IN ('انستاباي', 'خزينة انستاباي')");
  await client.execute("UPDATE payment_methods SET name = 'فودافون' WHERE name IN ('فودافون', 'فودافون كاش', 'خزينة فودافون كاش')");

  // Ensure is_deletable is 0 for main and cash, 1 for others
  await client.execute("UPDATE treasuries SET is_deletable = 0 WHERE id = 'main-treasury' OR name = 'الخزينة الرئيسية' OR name = 'الكاش'");
  await client.execute("UPDATE treasuries SET is_deletable = 1 WHERE name NOT IN ('الخزينة الرئيسية', 'الكاش') AND type != 'main'");

  const t = await client.execute('SELECT id, name, type, payment_method_id, balance, is_deletable FROM treasuries');
  console.log('TREASURIES NOW:');
  console.table(t.rows);

  const pm = await client.execute('SELECT id, name, treasury_id, is_active FROM payment_methods');
  console.log('PAYMENT METHODS NOW:');
  console.table(pm.rows);
}

updateDb().catch(console.error);
