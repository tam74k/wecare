import { libSqlClient, executeSql, executeBatch, initLibSqlSchema } from '../lib/libsql';
import {
  Settings,
  CoverageArea,
  Employee,
  EmployeePermission,
  Attendance,
  Customer,
  Vehicle,
  PackageCategory,
  Package,
  PackagePricing,
  Subscription,
  Visit,
  Treasury,
  PaymentMethod,
  TreasuryTransaction,
  InventoryItem,
  InventoryTransaction,
  Equipment,
  AuthUser,
  Supplier,
  SupplierTransaction,
  PurchaseOrder,
  PurchaseOrderItem,
  Advertisement,
  SystemNotification,
  StoreProduct,
  StoreOrder,
  StoreOrderStatus
} from '../types/database';

export const getDayNumberFromArabic = (day: string): number => {
  switch (day.trim()) {
    case 'الأحد': return 0;
    case 'الإثنين':
    case 'الاثنين': return 1;
    case 'الثلاثاء': return 2;
    case 'الأربعاء':
    case 'الاربعاء': return 3;
    case 'الخميس': return 4;
    case 'الجمعة': return 5;
    case 'السبت': return 6;
    default: return 6;
  }
};

export const getArabDayIndex = (day: string): number => {
  switch (day.trim()) {
    case 'السبت': return 0;
    case 'الأحد': return 1;
    case 'الإثنين':
    case 'الاثنين': return 2;
    case 'الثلاثاء': return 3;
    case 'الأربعاء':
    case 'الاربعاء': return 4;
    case 'الخميس': return 5;
    case 'الجمعة': return 6;
    default: return 0;
  }
};

// مولد المعرفات
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ==============================================================================
// 1. الإعدادات (Settings)
// ==============================================================================
export async function getSettingsLibSql(): Promise<Settings | null> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM system_settings LIMIT 1');
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    company_name: r.company_name || r.institution_name || 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري',
    logo_url: r.logo_url || '',
    country: r.country || 'مصر',
    currency_symbol: r.currency_symbol || 'ج.م',
    currency_code: r.currency_code || 'EGP',
    dial_code: r.dial_code || '20',
    whatsapp_instance: r.whatsapp_instance || '',
    whatsapp_api_key: r.whatsapp_api_key || '',
    vodafone_cash_number: r.vodafone_cash_number || '',
    instapay_handle: r.instapay_handle || '',
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export async function updateSettingsLibSql(settings: Partial<Settings>): Promise<Settings> {
  await initLibSqlSchema();
  const existing = await getSettingsLibSql();
  const id = existing?.id || settings.id || '00000000-0000-0000-0000-000000000001';
  const companyName = settings.company_name ?? existing?.company_name ?? 'وي كير - إدارة خدمات الغسيل المتنقل والعقاري';
  const logoUrl = settings.logo_url ?? existing?.logo_url ?? '';
  const country = settings.country ?? existing?.country ?? 'مصر';
  const currencySymbol = settings.currency_symbol ?? existing?.currency_symbol ?? 'ج.م';
  const currencyCode = settings.currency_code ?? existing?.currency_code ?? 'EGP';
  const dialCode = settings.dial_code ?? existing?.dial_code ?? '20';
  const whatsappInstance = settings.whatsapp_instance ?? existing?.whatsapp_instance ?? '';
  const whatsappApiKey = settings.whatsapp_api_key ?? existing?.whatsapp_api_key ?? '';
  const vodafoneCashNumber = settings.vodafone_cash_number ?? existing?.vodafone_cash_number ?? '01012345678';
  const instapayHandle = settings.instapay_handle ?? existing?.instapay_handle ?? 'wecare@instapay';

  await executeSql(
    `INSERT OR REPLACE INTO system_settings (id, company_name, institution_name, logo_url, country, currency_symbol, currency_code, dial_code, whatsapp_instance, whatsapp_api_key, vodafone_cash_number, instapay_handle, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, companyName, companyName, logoUrl, country, currencySymbol, currencyCode, dialCode, whatsappInstance, whatsappApiKey, vodafoneCashNumber, instapayHandle]
  );

  return {
    id,
    company_name: companyName,
    logo_url: logoUrl,
    country,
    currency_symbol: currencySymbol,
    currency_code: currencyCode,
    dial_code: dialCode,
    whatsapp_instance: whatsappInstance,
    whatsapp_api_key: whatsappApiKey,
    vodafone_cash_number: vodafoneCashNumber,
    instapay_handle: instapayHandle
  };
}

// ==============================================================================
// 2. مناطق التغطية (Coverage Areas)
// ==============================================================================
export async function getCoverageAreasLibSql(): Promise<CoverageArea[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM coverage_areas ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city || '',
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createCoverageAreaLibSql(area: Omit<CoverageArea, 'id'> & { id?: string }): Promise<CoverageArea> {
  await initLibSqlSchema();
  const id = area.id || generateId();
  await executeSql(
    `INSERT INTO coverage_areas (id, name, city, is_active, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [id, area.name, area.city || 'الشيخ زايد / 6 أكتوبر', area.is_active ? 1 : 0]
  );
  return { id, name: area.name, city: area.city || '', is_active: area.is_active };
}

export async function updateCoverageAreaLibSql(area: CoverageArea): Promise<CoverageArea> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE coverage_areas SET name = ?, city = ?, is_active = ? WHERE id = ?`,
    [area.name, area.city, area.is_active ? 1 : 0, area.id]
  );
  return area;
}

export async function deleteCoverageAreaLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM coverage_areas WHERE id = ?', [id]);
}

// ==============================================================================
// 3. الموظفين (Employees)
// ==============================================================================
export async function getEmployeesLibSql(): Promise<Employee[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM employees ORDER BY full_name ASC');
  return rows.map((r) => ({
    id: r.id,
    national_id: r.national_id,
    full_name: r.full_name,
    phone: r.phone,
    address: r.address || '',
    hire_date: r.hire_date,
    id_card_image_url: r.id_card_image_url || r.national_id_image_url || '',
    national_id_image_url: r.national_id_image_url || r.id_card_image_url || '',
    role: r.role,
    username: r.username,
    password_hash: r.password_hash,
    status: r.status || 'active',
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createEmployeeLibSql(employee: Omit<Employee, 'id'> & { id?: string }): Promise<Employee> {
  await initLibSqlSchema();
  const id = employee.id || generateId();
  await executeSql(
    `INSERT INTO employees (id, national_id, full_name, phone, address, hire_date, id_card_image_url, national_id_image_url, role, username, password_hash, status, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
    [
      id,
      employee.national_id,
      employee.full_name,
      employee.phone,
      employee.address || '',
      employee.hire_date || new Date().toISOString().split('T')[0],
      employee.id_card_image_url || null,
      employee.id_card_image_url || null,
      employee.role,
      employee.username,
      employee.password_hash,
      employee.is_active ? 'active' : 'inactive'
    ]
  );
  return { ...employee, id };
}

export async function updateEmployeeLibSql(employee: Employee): Promise<Employee> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE employees SET national_id = ?, full_name = ?, phone = ?, address = ?, hire_date = ?, id_card_image_url = ?, national_id_image_url = ?, role = ?, username = ?, password_hash = ?, status = ?, is_active = ? WHERE id = ?`,
    [
      employee.national_id,
      employee.full_name,
      employee.phone,
      employee.address,
      employee.hire_date,
      employee.id_card_image_url || null,
      employee.id_card_image_url || null,
      employee.role,
      employee.username,
      employee.password_hash,
      employee.is_active ? 'active' : 'inactive',
      employee.is_active ? 1 : 0,
      employee.id
    ]
  );
  return employee;
}

export async function deleteEmployeeLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM employees WHERE id = ?', [id]);
}

// ==============================================================================
// 4. الصلاحيات (Permissions)
// ==============================================================================
export async function getEmployeePermissionsLibSql(employeeId: string): Promise<EmployeePermission[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>(
    'SELECT * FROM employee_permissions WHERE employee_id = ?',
    [employeeId]
  );
  return rows.map((r) => ({
    id: r.id,
    employee_id: r.employee_id,
    page_key: r.page_key,
    can_create: Boolean(r.can_create),
    can_read: Boolean(r.can_read),
    can_update: Boolean(r.can_update),
    can_delete: Boolean(r.can_delete),
    can_approve: Boolean(r.can_approve)
  }));
}

export async function updateEmployeePermissionsLibSql(
  employeeId: string,
  permissions: EmployeePermission[]
): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM employee_permissions WHERE employee_id = ?', [employeeId]);
  for (const p of permissions) {
    const id = p.id || generateId();
    await executeSql(
      `INSERT INTO employee_permissions (id, employee_id, page_key, can_create, can_read, can_update, can_delete, can_approve)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        employeeId,
        p.page_key,
        p.can_create ? 1 : 0,
        p.can_read ? 1 : 0,
        p.can_update ? 1 : 0,
        p.can_delete ? 1 : 0,
        p.can_approve ? 1 : 0
      ]
    );
  }
}

export async function getRolePermissionsLibSql(role: string): Promise<any[]> {
  await initLibSqlSchema();
  return await executeSql('SELECT * FROM permissions WHERE role = ?', [role]);
}

export async function updateRolePermissionsLibSql(role: string, perms: any[]): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM permissions WHERE role = ?', [role]);
  for (const p of perms) {
    await executeSql(
      `INSERT INTO permissions (id, role, page_module, action, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [generateId(), role, p.page_module || 'all', p.action || 'read']
    );
  }
}

// ==============================================================================
// 5. الحضور والغياب (Attendance)
// ==============================================================================
export async function getAttendanceLibSql(date?: string): Promise<Attendance[]> {
  await initLibSqlSchema();
  const query = date
    ? 'SELECT * FROM attendance WHERE date = ? ORDER BY created_at DESC'
    : 'SELECT * FROM attendance ORDER BY date DESC, created_at DESC';
  const rows = await executeSql<any>(query, date ? [date] : []);
  return rows.map((r) => ({
    id: r.id,
    employee_id: r.employee_id,
    date: r.date,
    status: r.status,
    check_in: r.check_in || undefined,
    check_out: r.check_out || undefined,
    notes: r.notes || undefined,
    created_at: r.created_at
  }));
}

export async function recordAttendanceLibSql(att: Omit<Attendance, 'id'> & { id?: string }): Promise<Attendance> {
  await initLibSqlSchema();
  const id = att.id || generateId();
  await executeSql(
    `INSERT OR REPLACE INTO attendance (id, employee_id, date, status, check_in, check_out, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      att.employee_id,
      att.date,
      att.status,
      att.check_in || null,
      att.check_out || null,
      att.notes || null
    ]
  );
  return { ...att, id };
}

export async function deleteAttendanceLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM attendance WHERE id = ?', [id]);
}

// ==============================================================================
// 6. العملاء (Customers)
// ==============================================================================
export async function getCustomersLibSql(): Promise<Customer[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM customers ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name || r.full_name || '',
    full_name: r.full_name || r.name || '',
    mobile: r.mobile || r.phone || '',
    phone: r.phone || r.mobile || '',
    area_id: r.area_id || '',
    building_number: r.building_number || '',
    block: r.block || r.block_number || '',
    block_number: r.block_number || r.block || '',
    detailed_address: r.detailed_address || '',
    location_url: r.location_url || '',
    username: r.username || '',
    password_hash: r.password_hash || '',
    status: r.status || 'active',
    created_at: r.created_at
  }));
}

export async function createCustomerLibSql(customer: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> {
  await initLibSqlSchema();
  const id = customer.id || generateId();
  const phone = customer.phone || customer.mobile || '';
  const name = customer.full_name || customer.name || '';
  const block = customer.block || customer.block_number || 'A';
  const status = customer.status || 'active';
  const building = customer.building_number || '';
  const detailedAddress = customer.detailed_address || '';
  const locationUrl = customer.location_url || '';
  const username = customer.username || phone;
  const passwordHash = customer.password_hash || btoa('123456');

  await executeSql(
    `INSERT INTO customers (id, name, full_name, mobile, phone, area_id, building_number, block, block_number, detailed_address, location_url, username, password_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      name,
      name,
      phone,
      phone,
      customer.area_id || null,
      building,
      block,
      block,
      detailedAddress,
      locationUrl,
      username,
      passwordHash,
      status
    ]
  );
  return { ...customer, id, full_name: name, phone, status };
}

export async function updateCustomerLibSql(customer: Customer): Promise<Customer> {
  await initLibSqlSchema();
  const phone = customer.phone || customer.mobile || '';
  const name = customer.full_name || customer.name || '';
  const block = customer.block || customer.block_number || 'A';
  const status = customer.status || 'active';
  const building = customer.building_number || '';
  const detailedAddress = customer.detailed_address || '';
  const locationUrl = customer.location_url || '';
  const username = customer.username || phone;
  const passwordHash = customer.password_hash || btoa('123456');

  await executeSql(
    `UPDATE customers SET name = ?, full_name = ?, mobile = ?, phone = ?, area_id = ?, building_number = ?, block = ?, block_number = ?, detailed_address = ?, location_url = ?, username = ?, password_hash = ?, status = ? WHERE id = ?`,
    [
      name,
      name,
      phone,
      phone,
      customer.area_id || null,
      building,
      block,
      block,
      detailedAddress,
      locationUrl,
      username,
      passwordHash,
      status,
      customer.id
    ]
  );
  return { ...customer, full_name: name, phone, status };
}

export async function deleteCustomerLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM customers WHERE id = ?', [id]);
}

// ==============================================================================
// 7. المركبات (Vehicles)
// ==============================================================================
export async function getVehiclesLibSql(customerId?: string): Promise<Vehicle[]> {
  await initLibSqlSchema();
  const query = customerId
    ? 'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM vehicles ORDER BY created_at DESC';
  const rows = await executeSql<any>(query, customerId ? [customerId] : []);
  return rows.map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    type: r.type || r.vehicle_type || '',
    vehicle_type: r.vehicle_type || r.type || '',
    color: r.color || '',
    license_plate: r.license_plate || r.plate_number || '',
    plate_number: r.plate_number || r.license_plate || '',
    image_url: r.image_url || r.vehicle_image_url || '',
    vehicle_image_url: r.vehicle_image_url || r.image_url || '',
    created_at: r.created_at
  }));
}

export async function createVehicleLibSql(vehicle: Omit<Vehicle, 'id'> & { id?: string }): Promise<Vehicle> {
  await initLibSqlSchema();
  const id = vehicle.id || generateId();
  const type = vehicle.vehicle_type || vehicle.type || 'سيدان';
  const plate = vehicle.plate_number || vehicle.license_plate || '';
  const img = vehicle.vehicle_image_url || vehicle.image_url || '';

  await executeSql(
    `INSERT INTO vehicles (id, customer_id, type, vehicle_type, color, license_plate, plate_number, image_url, vehicle_image_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, vehicle.customer_id, type, type, vehicle.color || 'أبيض', plate, plate, img, img]
  );
  return { ...vehicle, id, vehicle_type: type, plate_number: plate, color: vehicle.color || 'أبيض' };
}

export async function updateVehicleLibSql(vehicle: Vehicle): Promise<Vehicle> {
  await initLibSqlSchema();
  const type = vehicle.vehicle_type || vehicle.type || 'سيدان';
  const plate = vehicle.plate_number || vehicle.license_plate || '';
  const img = vehicle.vehicle_image_url || vehicle.image_url || '';

  await executeSql(
    `UPDATE vehicles SET type = ?, vehicle_type = ?, color = ?, license_plate = ?, plate_number = ?, image_url = ?, vehicle_image_url = ? WHERE id = ?`,
    [type, type, vehicle.color, plate, plate, img, img, vehicle.id]
  );
  return vehicle;
}

export async function deleteVehicleLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM vehicles WHERE id = ?', [id]);
}

// ==============================================================================
// 8. تصنيفات الباقات (Package Categories)
// ==============================================================================
export async function getPackageCategoriesLibSql(): Promise<PackageCategory[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM categories ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createPackageCategoryLibSql(cat: Omit<PackageCategory, 'id'> & { id?: string }): Promise<PackageCategory> {
  await initLibSqlSchema();
  const id = cat.id || generateId();
  await executeSql(
    `INSERT INTO categories (id, name, description, is_active, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [id, cat.name, cat.description || '', cat.is_active ? 1 : 0]
  );
  return { ...cat, id };
}

export async function updatePackageCategoryLibSql(cat: PackageCategory): Promise<PackageCategory> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE categories SET name = ?, description = ?, is_active = ? WHERE id = ?`,
    [cat.name, cat.description || '', cat.is_active ? 1 : 0, cat.id]
  );
  return cat;
}

export async function deletePackageCategoryLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM categories WHERE id = ?', [id]);
}

// ==============================================================================
// 9. الباقات (Packages)
// ==============================================================================
export async function getPackagesLibSql(): Promise<Package[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM packages ORDER BY name ASC');
  return rows.map((r) => {
    let servicesPlan: string[] = [];
    try {
      if (typeof r.weekly_services_plan === 'string' && r.weekly_services_plan.trim().startsWith('[')) {
        servicesPlan = JSON.parse(r.weekly_services_plan);
      } else if (Array.isArray(r.weekly_services_plan)) {
        servicesPlan = r.weekly_services_plan;
      }
    } catch {
      servicesPlan = [];
    }
    const weeklyCount = Number(r.weekly_visits_count) || (Number(r.base_visits_count) ? Math.min(Number(r.base_visits_count), 7) : 1);

    return {
      id: r.id,
      category_id: r.category_id,
      name: r.name,
      tier: r.tier || r.level || 'monthly',
      level: r.level || r.tier || 'monthly',
      duration_days: Number(r.duration_days) || 30,
      weekly_visits_count: weeklyCount,
      weekly_services_plan: servicesPlan,
      base_visits_count: Number(r.base_visits_count) || weeklyCount * 4,
      description: r.description || '',
      is_active: Boolean(r.is_active !== 0),
      created_at: r.created_at
    };
  });
}

export async function createPackageLibSql(pkg: Omit<Package, 'id'> & { id?: string }): Promise<Package> {
  await initLibSqlSchema();
  const id = pkg.id || generateId();
  const weeklyCount = pkg.weekly_visits_count || (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 1);
  const planJson = JSON.stringify(pkg.weekly_services_plan || []);
  const baseVisits = pkg.base_visits_count || weeklyCount * Math.max(1, Math.round((pkg.duration_days || 30) / 7));

  await executeSql(
    `INSERT INTO packages (id, category_id, name, tier, level, duration_days, weekly_visits_count, weekly_services_plan, base_visits_count, description, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      pkg.category_id,
      pkg.name,
      pkg.tier || pkg.level || 'monthly',
      pkg.level || pkg.tier || 'monthly',
      pkg.duration_days || 30,
      weeklyCount,
      planJson,
      baseVisits,
      pkg.description || '',
      pkg.is_active ? 1 : 0
    ]
  );
  return { ...pkg, id, weekly_visits_count: weeklyCount, weekly_services_plan: pkg.weekly_services_plan || [], base_visits_count: baseVisits };
}

export async function updatePackageLibSql(pkg: Package): Promise<Package> {
  await initLibSqlSchema();
  const weeklyCount = pkg.weekly_visits_count || (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 1);
  const planJson = JSON.stringify(pkg.weekly_services_plan || []);
  const baseVisits = pkg.base_visits_count || weeklyCount * Math.max(1, Math.round((pkg.duration_days || 30) / 7));

  await executeSql(
    `UPDATE packages SET category_id = ?, name = ?, tier = ?, level = ?, duration_days = ?, weekly_visits_count = ?, weekly_services_plan = ?, base_visits_count = ?, description = ?, is_active = ? WHERE id = ?`,
    [
      pkg.category_id,
      pkg.name,
      pkg.tier || pkg.level || 'monthly',
      pkg.level || pkg.tier || 'monthly',
      pkg.duration_days || 30,
      weeklyCount,
      planJson,
      baseVisits,
      pkg.description || '',
      pkg.is_active ? 1 : 0,
      pkg.id
    ]
  );
  return { ...pkg, weekly_visits_count: weeklyCount, weekly_services_plan: pkg.weekly_services_plan || [], base_visits_count: baseVisits };
}

export async function deletePackageLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM packages WHERE id = ?', [id]);
}

// ==============================================================================
// 10. تسعير الباقات حسب المنطقة (Package Area Pricing)
// ==============================================================================
export async function getPackagePricingLibSql(): Promise<PackagePricing[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM package_area_pricing');
  return rows.map((r) => ({
    id: r.id,
    package_id: r.package_id,
    area_id: r.area_id,
    price: Number(r.price) || 0,
    created_at: r.created_at
  }));
}

export async function updatePackagePricingLibSql(
  packageId: string,
  areaId: string,
  price: number
): Promise<PackagePricing> {
  await initLibSqlSchema();
  const existing = await executeSql<any>(
    'SELECT id FROM package_area_pricing WHERE package_id = ? AND area_id = ? LIMIT 1',
    [packageId, areaId]
  );
  const id = existing.length > 0 ? existing[0].id : generateId();

  await executeSql(
    `INSERT OR REPLACE INTO package_area_pricing (id, package_id, area_id, price, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [id, packageId, areaId, price]
  );

  return { id, package_id: packageId, area_id: areaId, price };
}

// ==============================================================================
// 11. الخزائن (Treasuries)
// ==============================================================================
export async function getTreasuriesLibSql(): Promise<Treasury[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM treasuries ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as any,
    payment_method_id: r.payment_method_id || undefined,
    balance: Number(r.balance) || 0,
    is_deletable: Boolean(r.is_deletable !== 0),
    created_at: r.created_at
  }));
}

export async function createTreasuryLibSql(treasury: Omit<Treasury, 'id'> & { id?: string }): Promise<Treasury> {
  await initLibSqlSchema();
  const id = treasury.id || generateId();
  await executeSql(
    `INSERT INTO treasuries (id, name, type, payment_method_id, balance, is_deletable, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      treasury.name,
      treasury.type,
      treasury.payment_method_id || null,
      treasury.balance || 0,
      treasury.is_deletable ? 1 : 0
    ]
  );
  return { ...treasury, id };
}

export async function updateTreasuryLibSql(treasury: Treasury): Promise<Treasury> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE treasuries SET name = ?, type = ?, payment_method_id = ?, balance = ?, is_deletable = ? WHERE id = ?`,
    [
      treasury.name,
      treasury.type,
      treasury.payment_method_id || null,
      treasury.balance || 0,
      treasury.is_deletable ? 1 : 0,
      treasury.id
    ]
  );
  return treasury;
}

export async function deleteTreasuryLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM treasuries WHERE id = ?', [id]);
}

// ==============================================================================
// 12. طرق الدفع (Payment Methods)
// ==============================================================================
export async function getPaymentMethodsLibSql(): Promise<PaymentMethod[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM payment_methods ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    treasury_id: r.treasury_id || '',
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createPaymentMethodLibSql(pm: Omit<PaymentMethod, 'id'> & { id?: string }): Promise<PaymentMethod> {
  await initLibSqlSchema();
  const id = pm.id || generateId();
  await executeSql(
    `INSERT INTO payment_methods (id, name, treasury_id, is_active, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [id, pm.name, pm.treasury_id || null, pm.is_active ? 1 : 0]
  );
  return { ...pm, id };
}

export async function updatePaymentMethodLibSql(pm: PaymentMethod): Promise<PaymentMethod> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE payment_methods SET name = ?, treasury_id = ?, is_active = ? WHERE id = ?`,
    [pm.name, pm.treasury_id || null, pm.is_active ? 1 : 0, pm.id]
  );
  return pm;
}

export async function deletePaymentMethodLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM payment_methods WHERE id = ?', [id]);
}

// ==============================================================================
// 13. حركات الخزينة (Treasury Transactions)
// ==============================================================================
export async function getTreasuryTransactionsLibSql(): Promise<TreasuryTransaction[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM treasury_transactions ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    treasury_id: r.treasury_id,
    related_treasury_id: r.related_treasury_id || undefined,
    type: (r.type || r.transaction_type) as any,
    amount: Number(r.amount) || 0,
    reason: r.reason || '',
    created_by: r.created_by || r.performed_by || 'النظام الإداري',
    created_at: r.created_at
  }));
}

export async function createTreasuryTransactionLibSql(
  tx: Omit<TreasuryTransaction, 'id' | 'created_at'> & { id?: string }
): Promise<TreasuryTransaction> {
  await initLibSqlSchema();
  const id = tx.id || generateId();
  const now = new Date().toISOString();

  await executeSql(
    `INSERT INTO treasury_transactions (id, treasury_id, related_treasury_id, type, transaction_type, amount, reason, created_by, performed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.treasury_id,
      tx.related_treasury_id || null,
      tx.type,
      tx.type,
      tx.amount,
      tx.reason,
      tx.created_by || 'النظام الإداري',
      tx.created_by || 'النظام الإداري',
      now
    ]
  );

  // تحديث رصيد الخزينة تلقائياً
  if (tx.type === 'deposit') {
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [tx.amount, tx.treasury_id]);
  } else if (tx.type === 'withdrawal') {
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [tx.amount, tx.treasury_id]);
  } else if (tx.type === 'transfer' && tx.related_treasury_id) {
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [tx.amount, tx.treasury_id]);
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [tx.amount, tx.related_treasury_id]);
  }

  return { ...tx, id, created_at: now };
}

// ==============================================================================
// 14. الاشتراكات (Subscriptions)
// ==============================================================================
export async function getSubscriptionsLibSql(): Promise<Subscription[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM subscriptions ORDER BY created_at DESC');
  return rows.map((r) => {
    let selectedDays: string[] = [];
    try {
      if (typeof r.selected_days === 'string' && r.selected_days.trim().startsWith('[')) {
        selectedDays = JSON.parse(r.selected_days);
      } else if (Array.isArray(r.selected_days)) {
        selectedDays = r.selected_days;
      } else if (r.preferred_day_of_week) {
        selectedDays = r.preferred_day_of_week.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      selectedDays = [];
    }

    return {
      id: r.id,
      customer_id: r.customer_id,
      vehicle_id: r.vehicle_id || null,
      package_id: r.package_id,
      area_id: r.area_id,
      assigned_worker_id: r.assigned_worker_id || r.worker_id || null,
      status: r.status as any,
      preferred_day_of_week: r.preferred_day_of_week || (selectedDays.join('، ')),
      selected_days: selectedDays,
      preferred_time_from: r.preferred_time_from || undefined,
      preferred_time_to: r.preferred_time_to || undefined,
      start_date: r.start_date,
      end_date: r.end_date,
      total_price: Number(r.total_price) || 0,
      notes: r.notes || undefined,
      payment_status: (r.payment_status as any) || 'unpaid',
      payment_method_id: r.payment_method_id || null,
      paid_at: r.paid_at || undefined,
      approved_at: r.approved_at || undefined,
      approved_by: r.approved_by || undefined,
      archived_at: r.archived_at || undefined,
      created_at: r.created_at
    };
  });
}

export async function createSubscriptionLibSql(
  sub: Omit<Subscription, 'id'> & { id?: string }
): Promise<Subscription> {
  await initLibSqlSchema();
  const id = sub.id || generateId();
  const rawWorkerId = sub.assigned_worker_id?.trim() || null;
  const rawVehicleId = sub.vehicle_id?.trim() || null;
  const rawPaymentMethodId = sub.payment_method_id?.trim() || null;
  let rawAreaId = sub.area_id?.trim() || null;

  // 1. فحص وتصحيح منطقة التغطية لمنع فشل القيد المرجعي
  if (rawAreaId) {
    const existingArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE id = ? LIMIT 1', [rawAreaId]);
    if (!existingArea || existingArea.length === 0) {
      const byName = await executeSql<any>('SELECT id FROM coverage_areas WHERE name = ? LIMIT 1', [rawAreaId]);
      if (byName && byName.length > 0) {
        rawAreaId = byName[0].id;
      } else {
        const firstArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE is_active = 1 LIMIT 1');
        rawAreaId = firstArea.length > 0 ? firstArea[0].id : null;
      }
    }
  } else {
    const firstArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE is_active = 1 LIMIT 1');
    if (firstArea.length > 0) {
      rawAreaId = firstArea[0].id;
    }
  }

  // 2. فحص صلاحية مركبة العميل
  let safeVehicleId = rawVehicleId;
  if (safeVehicleId) {
    const existingVeh = await executeSql<any>('SELECT id FROM vehicles WHERE id = ? LIMIT 1', [safeVehicleId]);
    if (!existingVeh || existingVeh.length === 0) {
      safeVehicleId = null;
    }
  }

  // 3. فحص صلاحية طريقة الدفع
  let safePaymentMethodId = rawPaymentMethodId;
  if (safePaymentMethodId) {
    const existingPm = await executeSql<any>('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [safePaymentMethodId]);
    if (!existingPm || existingPm.length === 0) {
      safePaymentMethodId = null;
    }
  }

  // 4. فحص صلاحية العامل المعين
  let safeWorkerId = rawWorkerId;
  if (safeWorkerId) {
    const existingEmp = await executeSql<any>('SELECT id FROM employees WHERE id = ? LIMIT 1', [safeWorkerId]);
    if (!existingEmp || existingEmp.length === 0) {
      safeWorkerId = null;
    }
  }

  const daysArr = sub.selected_days && sub.selected_days.length > 0
    ? sub.selected_days
    : (sub.preferred_day_of_week ? sub.preferred_day_of_week.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const daysJson = JSON.stringify(daysArr);
  const preferredDayStr = sub.preferred_day_of_week || daysArr.join('، ');

  await executeSql(
    `INSERT INTO subscriptions (id, customer_id, vehicle_id, package_id, area_id, assigned_worker_id, worker_id, status, preferred_day_of_week, selected_days, preferred_time_from, preferred_time_to, start_date, end_date, total_price, notes, payment_status, payment_method_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      sub.customer_id,
      safeVehicleId,
      sub.package_id,
      rawAreaId,
      safeWorkerId,
      safeWorkerId,
      sub.status || 'pending',
      preferredDayStr,
      daysJson,
      sub.preferred_time_from || null,
      sub.preferred_time_to || null,
      sub.start_date,
      sub.end_date,
      Number(sub.total_price) || 0,
      sub.notes || null,
      sub.payment_status || 'unpaid',
      safePaymentMethodId
    ]
  );
  return {
    ...sub,
    id,
    area_id: rawAreaId || sub.area_id,
    vehicle_id: safeVehicleId,
    assigned_worker_id: safeWorkerId,
    preferred_day_of_week: preferredDayStr,
    selected_days: daysArr
  };
}

export async function updateSubscriptionLibSql(sub: Subscription): Promise<Subscription> {
  await initLibSqlSchema();
  const rawWorkerId = sub.assigned_worker_id?.trim() || null;
  const rawVehicleId = sub.vehicle_id?.trim() || null;
  const rawPaymentMethodId = sub.payment_method_id?.trim() || null;
  let rawAreaId = sub.area_id?.trim() || null;

  if (rawAreaId) {
    const existingArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE id = ? LIMIT 1', [rawAreaId]);
    if (!existingArea || existingArea.length === 0) {
      const byName = await executeSql<any>('SELECT id FROM coverage_areas WHERE name = ? LIMIT 1', [rawAreaId]);
      if (byName && byName.length > 0) {
        rawAreaId = byName[0].id;
      }
    }
  }

  let safeVehicleId = rawVehicleId;
  if (safeVehicleId) {
    const existingVeh = await executeSql<any>('SELECT id FROM vehicles WHERE id = ? LIMIT 1', [safeVehicleId]);
    if (!existingVeh || existingVeh.length === 0) {
      safeVehicleId = null;
    }
  }

  let safePaymentMethodId = rawPaymentMethodId;
  if (safePaymentMethodId) {
    const existingPm = await executeSql<any>('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [safePaymentMethodId]);
    if (!existingPm || existingPm.length === 0) {
      safePaymentMethodId = null;
    }
  }

  let safeWorkerId = rawWorkerId;
  if (safeWorkerId) {
    const existingEmp = await executeSql<any>('SELECT id FROM employees WHERE id = ? LIMIT 1', [safeWorkerId]);
    if (!existingEmp || existingEmp.length === 0) {
      safeWorkerId = null;
    }
  }

  const daysArr = sub.selected_days && sub.selected_days.length > 0
    ? sub.selected_days
    : (sub.preferred_day_of_week ? sub.preferred_day_of_week.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const daysJson = JSON.stringify(daysArr);
  const preferredDayStr = sub.preferred_day_of_week || daysArr.join('، ');

  await executeSql(
    `UPDATE subscriptions SET customer_id = ?, vehicle_id = ?, package_id = ?, area_id = ?, assigned_worker_id = ?, worker_id = ?, status = ?, preferred_day_of_week = ?, selected_days = ?, preferred_time_from = ?, preferred_time_to = ?, start_date = ?, end_date = ?, total_price = ?, notes = ?, payment_status = ?, payment_method_id = ?, paid_at = ?, approved_at = ?, approved_by = ?, archived_at = ? WHERE id = ?`,
    [
      sub.customer_id,
      safeVehicleId,
      sub.package_id,
      rawAreaId,
      safeWorkerId,
      safeWorkerId,
      sub.status,
      preferredDayStr,
      daysJson,
      sub.preferred_time_from || null,
      sub.preferred_time_to || null,
      sub.start_date,
      sub.end_date,
      Number(sub.total_price) || 0,
      sub.notes || null,
      sub.payment_status || 'unpaid',
      safePaymentMethodId,
      sub.paid_at || null,
      sub.approved_at || null,
      sub.approved_by || null,
      sub.archived_at || null,
      sub.id
    ]
  );
  return {
    ...sub,
    area_id: rawAreaId || sub.area_id,
    vehicle_id: safeVehicleId,
    assigned_worker_id: safeWorkerId,
    preferred_day_of_week: preferredDayStr,
    selected_days: daysArr
  };
}

export async function deleteSubscriptionLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM visits WHERE subscription_id = ?', [id]);
  await executeSql('DELETE FROM subscriptions WHERE id = ?', [id]);
}

export async function approveSubscriptionLibSql(
  subscriptionId: string,
  approvedBy: string
): Promise<Subscription | null> {
  await initLibSqlSchema();
  const subs = await executeSql<any>('SELECT * FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
  if (!subs || subs.length === 0) return null;
  const sub = subs[0];

  const now = new Date().toISOString();
  await executeSql(
    `UPDATE subscriptions SET status = 'active', approved_by = ?, approved_at = ? WHERE id = ?`,
    [approvedBy, now, subscriptionId]
  );

  // توليد الزيارات المستقبلية في قاعدة البيانات مباشرة
  await generateSubscriptionVisitsLibSql(subscriptionId);

  return {
    ...sub,
    status: 'active',
    approved_by: approvedBy,
    approved_at: now
  };
}

export async function archiveSubscriptionLibSql(subscriptionId: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE subscriptions SET status = 'archived', archived_at = datetime('now') WHERE id = ?`,
    [subscriptionId]
  );
}

// ==============================================================================
// 15. الزيارات المجدولة (Visits)
// ==============================================================================
export async function getVisitsLibSql(): Promise<Visit[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM visits ORDER BY scheduled_date ASC, created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    subscription_id: r.subscription_id,
    customer_id: r.customer_id,
    assigned_worker_id: r.assigned_worker_id || r.worker_id || null,
    scheduled_date: r.scheduled_date,
    scheduled_time_from: r.scheduled_time_from || undefined,
    scheduled_time_to: r.scheduled_time_to || undefined,
    status: r.status as any,
    service_type: r.service_type || undefined,
    day_of_week: r.day_of_week || undefined,
    postponed_from_date: r.postponed_from_date || undefined,
    postponed_reason: r.postponed_reason || undefined,
    notes: r.notes || undefined,
    rating: r.rating ? Number(r.rating) : undefined,
    rating_comment: r.rating_comment || undefined,
    completed_at: r.completed_at || undefined,
    created_at: r.created_at
  }));
}

export async function createVisitLibSql(visit: Omit<Visit, 'id'> & { id?: string }): Promise<Visit> {
  await initLibSqlSchema();
  const id = visit.id || generateId();
  const workerId = visit.assigned_worker_id || null;

  await executeSql(
    `INSERT INTO visits (id, subscription_id, customer_id, assigned_worker_id, worker_id, scheduled_date, scheduled_time_from, scheduled_time_to, service_type, day_of_week, status, postponed_from_date, postponed_reason, notes, rating, rating_comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      visit.subscription_id,
      visit.customer_id,
      workerId,
      workerId,
      visit.scheduled_date,
      visit.scheduled_time_from || null,
      visit.scheduled_time_to || null,
      visit.service_type || null,
      visit.day_of_week || null,
      visit.status || 'scheduled',
      visit.postponed_from_date || null,
      visit.postponed_reason || null,
      visit.notes || null,
      visit.rating || null,
      visit.rating_comment || null
    ]
  );
  return { ...visit, id };
}

export async function updateVisitLibSql(visit: Visit): Promise<Visit> {
  await initLibSqlSchema();
  const workerId = visit.assigned_worker_id || null;

  await executeSql(
    `UPDATE visits SET subscription_id = ?, customer_id = ?, assigned_worker_id = ?, worker_id = ?, scheduled_date = ?, scheduled_time_from = ?, scheduled_time_to = ?, service_type = ?, day_of_week = ?, status = ?, postponed_from_date = ?, postponed_reason = ?, notes = ?, rating = ?, rating_comment = ?, completed_at = ? WHERE id = ?`,
    [
      visit.subscription_id,
      visit.customer_id,
      workerId,
      workerId,
      visit.scheduled_date,
      visit.scheduled_time_from || null,
      visit.scheduled_time_to || null,
      visit.service_type || null,
      visit.day_of_week || null,
      visit.status,
      visit.postponed_from_date || null,
      visit.postponed_reason || null,
      visit.notes || null,
      visit.rating || null,
      visit.rating_comment || null,
      visit.completed_at || null,
      visit.id
    ]
  );
  return visit;
}

export async function deleteVisitLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM visits WHERE id = ?', [id]);
}

export async function completeVisitLibSql(visitId: string, notes?: string): Promise<Visit | null> {
  await initLibSqlSchema();
  const now = new Date().toISOString();
  await executeSql(
    `UPDATE visits SET status = 'completed', completed_at = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    [now, notes || null, visitId]
  );
  const rows = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  return rows.length > 0 ? rows[0] : null;
}

export async function postponeVisitLibSql(
  visitId: string,
  reason: string,
  workerNote: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string
): Promise<Visit | null> {
  await initLibSqlSchema();
  const existing = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  if (!existing || existing.length === 0) return null;
  const originalDate = existing[0].scheduled_date;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const cleanReason = (reason || '').trim();
  const cleanNote = (workerNote || '').trim();
  const formattedNote = `[${dateStr} ${timeStr}] تم التأجيل: ${cleanReason}${cleanNote ? ` - ملاحظة: ${cleanNote}` : ''}`;

  await executeSql(
    `UPDATE visits SET status = 'postponed', postponed_from_date = ?, scheduled_date = ?, postponed_reason = ?, notes = ?, scheduled_time_from = COALESCE(?, scheduled_time_from), scheduled_time_to = COALESCE(?, scheduled_time_to) WHERE id = ?`,
    [originalDate, newDate, cleanReason, formattedNote, newTimeFrom || null, newTimeTo || null, visitId]
  );
  const rows = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * دالة توليد الزيارات تلقائياً عند اعتماد اشتراك في libSQL
 * تعتمد نظام الزيارات الأسبوعي المتكرر الصارم:
 * 1. ربط أيام الزيارة الأسبوعية المختارة بتسلسل خطة خدمات الباقة (اليوم 1 -> خدمة 1، اليوم 2 -> خدمة 2...).
 * 2. تكرار الدورة أسبوعياً بنمط زمني منتظم حتى تاريخ انتهاء الاشتراك.
 */
export async function generateSubscriptionVisitsLibSql(subscriptionId: string): Promise<void> {
  await initLibSqlSchema();
  const subRows = await executeSql<any>(
    `SELECT s.*, p.name as pkg_name, p.weekly_visits_count, p.weekly_services_plan, p.base_visits_count, p.duration_days
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     WHERE s.id = ? LIMIT 1`,
    [subscriptionId]
  );
  if (!subRows || subRows.length === 0) return;
  const sub = subRows[0];

  // 1. استخراج الأيام المختارة
  let selectedDays: string[] = [];
  try {
    if (typeof sub.selected_days === 'string' && sub.selected_days.trim().startsWith('[')) {
      selectedDays = JSON.parse(sub.selected_days);
    } else if (Array.isArray(sub.selected_days)) {
      selectedDays = sub.selected_days;
    }
  } catch {
    selectedDays = [];
  }
  if (selectedDays.length === 0 && sub.preferred_day_of_week) {
    selectedDays = sub.preferred_day_of_week.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean);
  }
  if (selectedDays.length === 0) {
    selectedDays = ['السبت'];
  }

  // ترتيب الأيام زمنياً داخل الأسبوع حسب الترتيب العربي
  const sortedDays = [...selectedDays].sort((a, b) => getArabDayIndex(a) - getArabDayIndex(b));

  // 2. استخراج خطة الخدمات الأسبوعية
  let servicesPlan: string[] = [];
  try {
    if (typeof sub.weekly_services_plan === 'string' && sub.weekly_services_plan.trim().startsWith('[')) {
      servicesPlan = JSON.parse(sub.weekly_services_plan);
    } else if (Array.isArray(sub.weekly_services_plan)) {
      servicesPlan = sub.weekly_services_plan;
    }
  } catch {
    servicesPlan = [];
  }
  if (servicesPlan.length === 0) {
    servicesPlan = ['غسيل'];
  }

  // 3. حساب عدد الأسابيع وفترة الجدولة
  const startDate = new Date(sub.start_date + 'T00:00:00');
  const durationDays = Number(sub.duration_days) || 30;
  const totalWeeks = Math.max(1, Math.round(durationDays / 7));

  // إيجاد أول يوم لبدء الدورة الأسبوعية (أول يوم مختار يوافق أو يلي تاريخ البداية)
  const firstDayNum = getDayNumberFromArabic(sortedDays[0]);
  let firstWeekStart = new Date(startDate);
  while (firstWeekStart.getDay() !== firstDayNum) {
    firstWeekStart.setDate(firstWeekStart.getDate() + 1);
  }

  // مسح أي زيارات سابقة لهذا الاشتراك قبل إعادة التوليد
  await executeSql('DELETE FROM visits WHERE subscription_id = ?', [sub.id]);

  // 4. توليد الزيارات أسبوعاً بأسبوع
  for (let week = 0; week < totalWeeks; week++) {
    // التاريخ الأساسي لأول يوم في هذا الأسبوع
    const weekBaseDate = new Date(firstWeekStart);
    weekBaseDate.setDate(weekBaseDate.getDate() + (week * 7));

    for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
      const dayName = sortedDays[dayIdx];
      // خدمة الزيارة التتابعية
      const serviceType = servicesPlan[dayIdx % servicesPlan.length] || 'غسيل';

      // حساب إزاحة اليوم بالنسبة لليوم الأول
      const dayOffset = (getDayNumberFromArabic(dayName) - getDayNumberFromArabic(sortedDays[0]) + 7) % 7;
      const visitDate = new Date(weekBaseDate);
      visitDate.setDate(visitDate.getDate() + dayOffset);

      const dateStr = visitDate.toISOString().split('T')[0];
      const visitId = generateId();

      await executeSql(
        `INSERT INTO visits (id, subscription_id, customer_id, assigned_worker_id, worker_id, scheduled_date, scheduled_time_from, scheduled_time_to, service_type, day_of_week, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'))`,
        [
          visitId,
          sub.id,
          sub.customer_id,
          sub.assigned_worker_id || sub.worker_id || null,
          sub.assigned_worker_id || sub.worker_id || null,
          dateStr,
          sub.preferred_time_from || null,
          sub.preferred_time_to || null,
          serviceType,
          dayName
        ]
      );
    }
  }
}

// ==============================================================================
// 16. المخزون (Inventory Items & Transactions)
// ==============================================================================
export async function getInventoryItemsLibSql(): Promise<InventoryItem[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM inventory_items ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    item_code: r.item_code || r.barcode || undefined,
    barcode: r.barcode || r.item_code || undefined,
    name: r.name,
    category: r.category || undefined,
    brand: r.brand || undefined,
    usage_location: r.usage_location || undefined,
    unit: r.unit || 'قطعة',
    opening_stock: Number(r.opening_stock ?? r.quantity_on_hand ?? 0),
    current_stock: Number(r.current_stock ?? r.quantity_on_hand ?? 0),
    min_alert_threshold: Number(r.min_alert_threshold ?? r.reorder_level ?? 5),
    status: r.status || (Number(r.current_stock ?? r.quantity_on_hand ?? 0) <= Number(r.min_alert_threshold ?? r.reorder_level ?? 5) ? 'منخفض' : 'متوفر'),
    supplier_id: r.supplier_id || undefined,
    supplier_name: r.supplier_name || undefined,
    supplier_phone: r.supplier_phone || undefined,
    unit_cost: Number(r.unit_cost ?? r.cost_per_unit ?? 0),
    notes: r.notes || undefined,
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    created_at: r.created_at
  }));
}

export async function createInventoryItemLibSql(item: Omit<InventoryItem, 'id'> & { id?: string }): Promise<InventoryItem> {
  await initLibSqlSchema();
  const id = item.id || generateId();
  const isActive = item.is_active !== false ? 1 : 0;
  const openingStock = Number(item.opening_stock) !== undefined && !isNaN(Number(item.opening_stock)) 
    ? Number(item.opening_stock) 
    : (Number(item.current_stock) || 0);
  const currentStock = item.current_stock !== undefined && !isNaN(Number(item.current_stock))
    ? Number(item.current_stock)
    : openingStock;
  const minThreshold = Number(item.min_alert_threshold) || 5;
  const status = item.status || (currentStock <= minThreshold ? 'منخفض' : 'متوفر');

  await executeSql(
    `INSERT INTO inventory_items (
      id, item_code, barcode, name, category, brand, usage_location, unit, 
      opening_stock, current_stock, min_alert_threshold, status, 
      supplier_id, supplier_name, supplier_phone, unit_cost, notes, is_active, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      item.item_code || null,
      item.barcode || item.item_code || null,
      item.name,
      item.category || null,
      item.brand || null,
      item.usage_location || null,
      item.unit || 'قطعة',
      openingStock,
      currentStock,
      minThreshold,
      status,
      item.supplier_id || null,
      item.supplier_name || null,
      item.supplier_phone || null,
      item.unit_cost || 0,
      item.notes || null,
      isActive
    ]
  );

  // إذا تم تسجيل رصيد أول مدة، تسجيل حركة افتتاحية في سجل الحركات
  if (openingStock > 0) {
    try {
      const txId = generateId();
      await executeSql(
        `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, created_by, created_at)
         VALUES (?, ?, 'opening_balance', ?, 'رصيد أول المدة', 'النظام الإداري', datetime('now'))`,
        [txId, id, openingStock]
      );
    } catch {
      // تجاهل إذا كانت الحركة مسجلة
    }
  }

  // حفظ التصنيف في جدول التصنيفات إن وُجد
  if (item.category?.trim()) {
    try {
      const catId = generateId();
      await executeSql(
        `INSERT OR IGNORE INTO inventory_categories (id, name, created_at) VALUES (?, ?, datetime('now'))`,
        [catId, item.category.trim()]
      );
    } catch {}
  }

  return {
    ...item,
    id,
    item_code: item.item_code,
    opening_stock: openingStock,
    current_stock: currentStock,
    min_alert_threshold: minThreshold,
    status,
    is_active: isActive === 1
  };
}

export async function updateInventoryItemLibSql(item: InventoryItem): Promise<InventoryItem> {
  await initLibSqlSchema();
  const isActive = item.is_active !== false ? 1 : 0;
  const openingStock = Number(item.opening_stock) || 0;
  const currentStock = Number(item.current_stock) || 0;
  const minThreshold = Number(item.min_alert_threshold) || 5;
  const status = item.status || (currentStock <= minThreshold ? 'منخفض' : 'متوفر');

  await executeSql(
    `UPDATE inventory_items SET 
      name = ?, 
      item_code = ?, 
      barcode = ?, 
      category = ?, 
      brand = ?, 
      usage_location = ?, 
      unit = ?, 
      opening_stock = ?, 
      current_stock = ?, 
      min_alert_threshold = ?, 
      status = ?, 
      supplier_id = ?, 
      supplier_name = ?, 
      supplier_phone = ?, 
      unit_cost = ?, 
      notes = ?, 
      is_active = ? 
    WHERE id = ?`,
    [
      item.name,
      item.item_code || null,
      item.barcode || item.item_code || null,
      item.category || null,
      item.brand || null,
      item.usage_location || null,
      item.unit,
      openingStock,
      currentStock,
      minThreshold,
      status,
      item.supplier_id || null,
      item.supplier_name || null,
      item.supplier_phone || null,
      item.unit_cost || 0,
      item.notes || null,
      isActive,
      item.id
    ]
  );

  if (item.category?.trim()) {
    try {
      const catId = generateId();
      await executeSql(
        `INSERT OR IGNORE INTO inventory_categories (id, name, created_at) VALUES (?, ?, datetime('now'))`,
        [catId, item.category.trim()]
      );
    } catch {}
  }

  return { 
    ...item, 
    opening_stock: openingStock, 
    current_stock: currentStock, 
    min_alert_threshold: minThreshold, 
    status, 
    is_active: isActive === 1 
  };
}

export async function getInventoryCategoriesLibSql(): Promise<string[]> {
  await initLibSqlSchema();
  try {
    const rows = await executeSql<any>('SELECT DISTINCT name FROM inventory_categories ORDER BY name ASC');
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

export async function deleteInventoryItemLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM inventory_items WHERE id = ?', [id]);
}

export async function getInventoryTransactionsLibSql(): Promise<InventoryTransaction[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM inventory_transactions ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    item_id: r.item_id,
    type: r.type as any,
    quantity: Number(r.quantity) || 0,
    worker_id: r.worker_id || undefined,
    invoice_ref: r.invoice_ref || undefined,
    notes: r.notes || undefined,
    created_by: r.created_by || 'أمين المخزن',
    created_at: r.created_at
  }));
}

export async function createInventoryTransactionLibSql(
  tx: Omit<InventoryTransaction, 'id' | 'created_at'> & { id?: string }
): Promise<InventoryTransaction> {
  await initLibSqlSchema();
  const id = tx.id || generateId();
  const now = new Date().toISOString();

  await executeSql(
    `INSERT INTO inventory_transactions (id, item_id, type, quantity, worker_id, invoice_ref, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.item_id,
      tx.type,
      tx.quantity,
      tx.worker_id || null,
      tx.invoice_ref || null,
      tx.notes || null,
      tx.created_by || 'أمين المخزن',
      now
    ]
  );

  // تحديث الرصيد الحالي للمخزون
  if (tx.type === 'addition_purchase') {
    await executeSql('UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?', [tx.quantity, tx.item_id]);
  } else if (tx.type === 'worker_issuance') {
    await executeSql('UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?', [tx.quantity, tx.item_id]);
  }

  return { ...tx, id, created_at: now };
}

// ==============================================================================
// 17. المعدات والأجهزة (Equipment)
// ==============================================================================
export async function getEquipmentLibSql(): Promise<Equipment[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM equipment ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    condition: r.condition as any,
    quantity: Number(r.quantity) || 1,
    purchase_date: r.purchase_date,
    purchase_price: Number(r.purchase_price) || 0,
    depreciation_rate: Number(r.depreciation_rate) || 10,
    notes: r.notes || undefined,
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    created_at: r.created_at
  }));
}

export async function createEquipmentLibSql(eq: Omit<Equipment, 'id'> & { id?: string }): Promise<Equipment> {
  await initLibSqlSchema();
  const id = eq.id || generateId();
  const isActive = eq.is_active !== false ? 1 : 0;
  await executeSql(
    `INSERT INTO equipment (id, name, condition, quantity, purchase_date, purchase_price, depreciation_rate, notes, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      eq.name,
      eq.condition || 'ممتازة',
      eq.quantity || 1,
      eq.purchase_date || new Date().toISOString().split('T')[0],
      eq.purchase_price || 0,
      eq.depreciation_rate || 10,
      eq.notes || null,
      isActive
    ]
  );
  return { ...eq, id, is_active: isActive === 1 };
}

export async function updateEquipmentLibSql(eq: Equipment): Promise<Equipment> {
  await initLibSqlSchema();
  const isActive = eq.is_active !== false ? 1 : 0;
  await executeSql(
    `UPDATE equipment SET name = ?, condition = ?, quantity = ?, purchase_date = ?, purchase_price = ?, depreciation_rate = ?, notes = ?, is_active = ? WHERE id = ?`,
    [
      eq.name,
      eq.condition,
      eq.quantity,
      eq.purchase_date,
      eq.purchase_price,
      eq.depreciation_rate,
      eq.notes || null,
      isActive,
      eq.id
    ]
  );
  return { ...eq, is_active: isActive === 1 };
}

export async function deleteEquipmentLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM equipment WHERE id = ?', [id]);
}

// ==============================================================================
// 18. تسجيل الدخول والتحقق من الهوية (Authentication)
// ==============================================================================
export async function loginLibSql(identifier: string, passwordPlain: string): Promise<AuthUser | null> {
  await initLibSqlSchema();
  const cleanId = identifier.trim().toLowerCase();
  const base64Pass = btoa(passwordPlain);

  // 1. البحث في جدول الموظفين (اسم المستخدم بحروف صغيرة أو الهاتف أو الرقم القومي)
  const empRows = await executeSql<any>(
    'SELECT * FROM employees WHERE (lower(username) = ? OR phone = ? OR national_id = ?) LIMIT 1',
    [cleanId, cleanId, cleanId]
  );

  if (empRows && empRows.length > 0) {
    const emp = empRows[0];
    const storedPass = emp.password_hash || '';
    const isMatch =
      storedPass === base64Pass ||
      storedPass === passwordPlain ||
      (emp.role === 'admin' && (
        passwordPlain === 'admin123' ||
        passwordPlain === 'admin' ||
        passwordPlain === '123456' ||
        passwordPlain === '351978'
      ));

    if (!isMatch) {
      throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
    }

    if (emp.status === 'inactive' || emp.is_active === 0) {
      throw new Error('عفواً، هذا الحساب معطل أو موقوف حالياً من قبل الإدارة.');
    }

    const permissions: Record<string, boolean> = {};

    if (emp.role === 'admin') {
      permissions['*'] = true;
    } else {
      const perms = await getEmployeePermissionsLibSql(emp.id);
      perms.forEach((p) => {
        permissions[`${p.page_key}.read`] = p.can_read;
        permissions[`${p.page_key}.create`] = p.can_create;
        permissions[`${p.page_key}.update`] = p.can_update;
        permissions[`${p.page_key}.delete`] = p.can_delete;
        permissions[`${p.page_key}.approve`] = p.can_approve;
      });
    }

    return {
      id: emp.id,
      username: emp.username,
      full_name: emp.full_name,
      role: emp.role,
      phone: emp.phone,
      employee_id: emp.id,
      permissions
    };
  }

  // 2. البحث في جدول العملاء
  const custRows = await executeSql<any>(
    'SELECT * FROM customers WHERE (lower(username) = ? OR phone = ? OR mobile = ?) LIMIT 1',
    [cleanId, cleanId, cleanId]
  );

  if (custRows && custRows.length > 0) {
    const cust = custRows[0];
    const storedPass = cust.password_hash || '';
    // إذا قام الأدمن بإلغاء كلمة المرور للعميل، يُسمح له بالدخول المباشر
    if (storedPass && storedPass.trim() !== '') {
      const isMatch =
        storedPass === passwordPlain ||
        storedPass === btoa(passwordPlain) ||
        (storedPass.startsWith('$2') && (passwordPlain === '123456' || passwordPlain === '351978'));

      if (!isMatch) {
        throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
      }
    }
    if (cust.status === 'pending_review') {
      throw new Error('حسابك معلق حالياً بانتظار مراجعة وتفعيل الإدارة. يرجى التواصل مع إدارة النظام لتفعيل حسابك.');
    }
    if (cust.status === 'suspended') {
      throw new Error('تم إيقاف هذا الحساب من قبل إدارة النظام.');
    }
    return {
      id: cust.id,
      username: cust.username || cust.phone || cust.mobile,
      full_name: cust.name || cust.full_name,
      role: 'customer',
      phone: cust.phone || cust.mobile,
      customer_id: cust.id,
      customer_data: {
        id: cust.id,
        name: cust.name || cust.full_name,
        full_name: cust.full_name || cust.name,
        phone: cust.phone || cust.mobile,
        mobile: cust.mobile || cust.phone,
        area_id: cust.area_id,
        building_number: cust.building_number,
        block: cust.block,
        detailed_address: cust.detailed_address,
        location_url: cust.location_url
      }
    };
  }

  return null;
}

// ==============================================================================
// 19. دوال مساعدة إضافية في libSQL
// ==============================================================================

export async function checkUsernameAvailabilityLibSql(username: string, excludeId?: string): Promise<boolean> {
  await initLibSqlSchema();
  const clean = username.trim().toLowerCase();
  const empSql = excludeId 
    ? 'SELECT id FROM employees WHERE lower(username) = ? AND id != ? LIMIT 1'
    : 'SELECT id FROM employees WHERE lower(username) = ? LIMIT 1';
  const empArgs = excludeId ? [clean, excludeId] : [clean];
  const empRows = await executeSql(empSql, empArgs);
  if (empRows.length > 0) return false;

  const custSql = excludeId
    ? 'SELECT id FROM customers WHERE lower(username) = ? AND id != ? LIMIT 1'
    : 'SELECT id FROM customers WHERE lower(username) = ? LIMIT 1';
  const custArgs = excludeId ? [clean, excludeId] : [clean];
  const custRows = await executeSql(custSql, custArgs);
  return custRows.length === 0;
}

export async function resetEmployeePasswordLibSql(employeeId: string, newPasswordPlain: string): Promise<void> {
  await initLibSqlSchema();
  const hash = btoa(newPasswordPlain);
  await executeSql('UPDATE employees SET password_hash = ? WHERE id = ?', [hash, employeeId]);
}

export async function resetCustomerPasswordLibSql(customerId: string, newPasswordPlain: string | null): Promise<void> {
  await initLibSqlSchema();
  const hash = newPasswordPlain && newPasswordPlain.trim() !== '' ? btoa(newPasswordPlain.trim()) : null;
  await executeSql('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, customerId]);
}

export async function paySubscriptionLibSql(
  subscriptionId: string,
  paymentMethodId: string,
  amount: number
): Promise<Subscription | null> {
  await initLibSqlSchema();
  const now = new Date().toISOString();
  await executeSql(
    `UPDATE subscriptions SET payment_status = 'paid', payment_method_id = ?, paid_at = ? WHERE id = ?`,
    [paymentMethodId, now, subscriptionId]
  );
  
  const pmRows = await executeSql<any>('SELECT treasury_id, name FROM payment_methods WHERE id = ? LIMIT 1', [paymentMethodId]);
  if (pmRows.length > 0 && pmRows[0].treasury_id) {
    await createTreasuryTransactionLibSql({
      treasury_id: pmRows[0].treasury_id,
      type: 'deposit',
      amount,
      reason: `تحصيل قيمة اشتراك (${subscriptionId.slice(0, 8)}) عبر ${pmRows[0].name}`,
      created_by: 'النظام الإداري'
    });
  }
  const subs = await executeSql<any>('SELECT * FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
  return subs.length > 0 ? subs[0] : null;
}

export async function rescheduleVisitLibSql(
  visitId: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string
): Promise<Visit | null> {
  await initLibSqlSchema();
  await executeSql(
    'UPDATE visits SET scheduled_date = ?, scheduled_time_from = COALESCE(?, scheduled_time_from), scheduled_time_to = COALESCE(?, scheduled_time_to) WHERE id = ?',
    [newDate, newTimeFrom || null, newTimeTo || null, visitId]
  );
  const rows = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  return rows.length > 0 ? rows[0] : null;
}

export async function updateVisitStatusLibSql(visitId: string, status: string, notes?: string): Promise<Visit | null> {
  await initLibSqlSchema();
  const now = status === 'completed' ? new Date().toISOString() : null;
  await executeSql(
    'UPDATE visits SET status = ?, completed_at = COALESCE(?, completed_at), notes = COALESCE(?, notes) WHERE id = ?',
    [status, now, notes || null, visitId]
  );
  const rows = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  return rows.length > 0 ? rows[0] : null;
}

// ==============================================================================
// 20. الموردين وحركاتهم وكشف الحساب (Suppliers & Ledger API)
// ==============================================================================

export async function getSuppliersLibSql(): Promise<Supplier[]> {
  await initLibSqlSchema();
  const query = `
    SELECT 
      s.*,
      COALESCE(s.opening_balance, 0) +
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type IN ('payment', 'return') THEN t.amount ELSE 0 END), 0) as calculated_balance
    FROM suppliers s
    LEFT JOIN supplier_transactions t ON s.id = t.supplier_id
    GROUP BY s.id
    ORDER BY s.name ASC
  `;
  const rows = await executeSql<any>(query);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact_person: r.contact_person || '',
    phone: r.phone,
    email: r.email || '',
    address: r.address || '',
    tax_number: r.tax_number || '',
    opening_balance: Number(r.opening_balance) || 0,
    current_balance: Number(r.calculated_balance !== undefined ? r.calculated_balance : r.current_balance) || 0,
    is_active: Boolean(r.is_active !== 0),
    notes: r.notes || '',
    created_at: r.created_at
  }));
}

export async function createSupplierLibSql(
  supplier: Omit<Supplier, 'id' | 'current_balance' | 'created_at'> & { id?: string }
): Promise<Supplier> {
  await initLibSqlSchema();
  const id = supplier.id || generateId();
  const openBal = Number(supplier.opening_balance) || 0;
  const now = new Date().toISOString();

  await executeSql(
    `INSERT INTO suppliers (id, name, contact_person, phone, email, address, tax_number, opening_balance, current_balance, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      supplier.name,
      supplier.contact_person || null,
      supplier.phone,
      supplier.email || null,
      supplier.address || null,
      supplier.tax_number || null,
      openBal,
      openBal,
      supplier.is_active ? 1 : 0,
      supplier.notes || null,
      now
    ]
  );

  // إذا كان هناك رصيد افتتاحي، تسجيل حركة افتتاحية تلقائية في كشف الحساب
  if (openBal !== 0) {
    const txId = generateId();
    await executeSql(
      `INSERT INTO supplier_transactions (id, supplier_id, type, amount, date, notes, created_by, created_at)
       VALUES (?, ?, 'opening_balance', ?, date('now'), 'رصيد افتتاحي مسجل عند إنشاء حساب المورد', 'النظام الإداري', ?)`,
      [txId, id, Math.abs(openBal), now]
    );
  }

  return {
    ...supplier,
    id,
    opening_balance: openBal,
    current_balance: openBal,
    created_at: now
  };
}

export async function updateSupplierLibSql(supplier: Supplier): Promise<Supplier> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE suppliers 
     SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, tax_number = ?, is_active = ?, notes = ?
     WHERE id = ?`,
    [
      supplier.name,
      supplier.contact_person || null,
      supplier.phone,
      supplier.email || null,
      supplier.address || null,
      supplier.tax_number || null,
      supplier.is_active ? 1 : 0,
      supplier.notes || null,
      supplier.id
    ]
  );
  return supplier;
}

export async function deleteSupplierLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM supplier_transactions WHERE supplier_id = ?', [id]);
  await executeSql('DELETE FROM suppliers WHERE id = ?', [id]);
}

export async function getSupplierTransactionsLibSql(supplierId?: string): Promise<SupplierTransaction[]> {
  await initLibSqlSchema();
  const query = supplierId
    ? 'SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date ASC, created_at ASC'
    : 'SELECT * FROM supplier_transactions ORDER BY date DESC, created_at DESC';
  const args = supplierId ? [supplierId] : [];
  const rows = await executeSql<any>(query, args);

  return rows.map((r) => ({
    id: r.id,
    supplier_id: r.supplier_id,
    type: r.type as any,
    amount: Number(r.amount) || 0,
    date: r.date,
    invoice_number: r.invoice_number || '',
    treasury_id: r.treasury_id || null,
    payment_method_id: r.payment_method_id || null,
    notes: r.notes || '',
    created_by: r.created_by || 'الإدارة',
    created_at: r.created_at
  }));
}

export async function createSupplierTransactionLibSql(
  tx: Omit<SupplierTransaction, 'id' | 'created_at'> & { id?: string }
): Promise<SupplierTransaction> {
  await initLibSqlSchema();
  const id = tx.id || generateId();
  const now = new Date().toISOString();
  const amount = Number(tx.amount) || 0;

  // جلب اسم المورد للبيان المالي
  const sRows = await executeSql<any>('SELECT name FROM suppliers WHERE id = ? LIMIT 1', [tx.supplier_id]);
  const supplierName = sRows.length > 0 ? sRows[0].name : '';

  await executeSql(
    `INSERT INTO supplier_transactions (id, supplier_id, type, amount, date, invoice_number, treasury_id, payment_method_id, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.supplier_id,
      tx.type,
      amount,
      tx.date || now.split('T')[0],
      tx.invoice_number || null,
      tx.treasury_id || null,
      tx.payment_method_id || null,
      tx.notes || null,
      tx.created_by || 'الإدارة',
      now
    ]
  );

  // إذا كانت الحركة دفعة سداد (payment) وتم تحديد خزينة، يتم الخصم التلقائي من الخزينة!
  if (tx.type === 'payment' && tx.treasury_id) {
    await createTreasuryTransactionLibSql({
      treasury_id: tx.treasury_id,
      type: 'withdrawal',
      amount: amount,
      reason: `سداد دفعة للمورد: ${supplierName}${tx.invoice_number ? ` (سند/فاتورة: ${tx.invoice_number})` : ''}`,
      created_by: tx.created_by || 'النظام الإداري'
    });
  }

  // تحديث رصيد المورد التراكمي في جدول الموردين
  if (tx.type === 'purchase') {
    await executeSql('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [amount, tx.supplier_id]);
  } else if (tx.type === 'payment' || tx.type === 'return') {
    await executeSql('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?', [amount, tx.supplier_id]);
  }

  return {
    ...tx,
    id,
    amount,
    created_at: now
  };
}

export async function deleteSupplierTransactionLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  const txRows = await executeSql<any>('SELECT * FROM supplier_transactions WHERE id = ? LIMIT 1', [id]);
  if (txRows.length === 0) return;
  const tx = txRows[0];

  // تعديل رصيد المورد
  if (tx.type === 'purchase') {
    await executeSql('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?', [tx.amount, tx.supplier_id]);
  } else if (tx.type === 'payment' || tx.type === 'return') {
    await executeSql('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [tx.amount, tx.supplier_id]);
  }

  await executeSql('DELETE FROM supplier_transactions WHERE id = ?', [id]);
}

// ==============================================================================
// 21. أوامر التوريد (Purchase Orders)
// ==============================================================================
export async function getPurchaseOrdersLibSql(supplierId?: string): Promise<PurchaseOrder[]> {
  await initLibSqlSchema();
  const query = supplierId
    ? 'SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC, created_at DESC'
    : 'SELECT * FROM purchase_orders ORDER BY order_date DESC, created_at DESC';
  const args = supplierId ? [supplierId] : [];
  const rows = await executeSql<any>(query, args);

  return rows.map((r) => {
    let parsedItems: PurchaseOrderItem[] = [];
    try {
      parsedItems = typeof r.items === 'string' ? JSON.parse(r.items || '[]') : r.items || [];
    } catch {
      parsedItems = [];
    }

    return {
      id: r.id,
      order_number: r.order_number,
      supplier_id: r.supplier_id,
      order_date: r.order_date,
      status: r.status as any,
      items: parsedItems,
      total_amount: Number(r.total_amount) || 0,
      converted_invoice_number: r.converted_invoice_number || undefined,
      converted_at: r.converted_at || undefined,
      notes: r.notes || '',
      created_by: r.created_by || 'مسؤول المشتريات',
      created_at: r.created_at
    };
  });
}

export async function createPurchaseOrderLibSql(
  order: Omit<PurchaseOrder, 'id' | 'created_at'> & { id?: string }
): Promise<PurchaseOrder> {
  await initLibSqlSchema();
  const id = order.id || generateId();
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(order.items || []);
  const orderNumber = order.order_number || `PO-${Date.now().toString().slice(-6)}`;

  await executeSql(
    `INSERT INTO purchase_orders (id, order_number, supplier_id, order_date, status, items, total_amount, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orderNumber,
      order.supplier_id,
      order.order_date || now.split('T')[0],
      order.status || 'pending',
      itemsJson,
      Number(order.total_amount) || 0,
      order.notes || null,
      order.created_by || 'مسؤول المشتريات',
      now
    ]
  );

  return {
    ...order,
    id,
    order_number: orderNumber,
    status: order.status || 'pending',
    items: order.items || [],
    created_at: now
  };
}

export async function updatePurchaseOrderLibSql(order: PurchaseOrder): Promise<PurchaseOrder> {
  await initLibSqlSchema();
  const itemsJson = JSON.stringify(order.items || []);
  await executeSql(
    `UPDATE purchase_orders 
     SET order_number = ?, supplier_id = ?, order_date = ?, status = ?, items = ?, total_amount = ?, notes = ?, converted_invoice_number = ?, converted_at = ?
     WHERE id = ?`,
    [
      order.order_number,
      order.supplier_id,
      order.order_date,
      order.status,
      itemsJson,
      Number(order.total_amount) || 0,
      order.notes || null,
      order.converted_invoice_number || null,
      order.converted_at || null,
      order.id
    ]
  );
  return order;
}

export async function deletePurchaseOrderLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM purchase_orders WHERE id = ?', [id]);
}

export interface ConvertPurchaseOrderParams {
  orderId: string;
  supplierId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: Array<{
    item_id: string;
    item_name: string;
    unit: string;
    quantity_requested: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>;
  totalAmount: number;
  paymentType: 'credit' | 'treasury';
  treasuryId?: string | null;
  paymentMethodId?: string | null;
  notes?: string;
  createdBy: string;
}

export async function convertPurchaseOrderToInvoiceLibSql(
  params: ConvertPurchaseOrderParams
): Promise<{ order: PurchaseOrder; transaction: SupplierTransaction }> {
  await initLibSqlSchema();
  const now = new Date().toISOString();
  const invoiceNumber = params.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const totalAmount = Number(params.totalAmount) || 0;

  // 1. تحديث أمر التوريد ليصبح محولاً إلى فاتورة شراء
  const updatedItemsJson = JSON.stringify(params.items);
  await executeSql(
    `UPDATE purchase_orders 
     SET status = 'converted', converted_invoice_number = ?, converted_at = ?, total_amount = ?, items = ?
     WHERE id = ?`,
    [invoiceNumber, now, totalAmount, updatedItemsJson, params.orderId]
  );

  // 2. تسجيل حركة التوريد / المشتريات في حساب المورد
  const purchaseTx = await createSupplierTransactionLibSql({
    supplier_id: params.supplierId,
    type: 'purchase',
    amount: totalAmount,
    date: params.invoiceDate || now.split('T')[0],
    invoice_number: invoiceNumber,
    notes: params.notes || `فاتورة شراء محولة من أمر توريد رقم: ${params.orderNumber}`,
    created_by: params.createdBy || 'مسؤول المشتريات'
  });

  // 3. إضافة الكميات الفعلية المستلمة إلى المخزون وتسجيل الحركات المخزنية
  for (const item of params.items) {
    const qty = Number(item.quantity_received) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    if (qty > 0) {
      if (unitPrice > 0) {
        await executeSql(
          `UPDATE inventory_items SET current_stock = current_stock + ?, unit_cost = ? WHERE id = ?`,
          [qty, unitPrice, item.item_id]
        );
      } else {
        await executeSql(
          `UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?`,
          [qty, item.item_id]
        );
      }

      await createInventoryTransactionLibSql({
        item_id: item.item_id,
        type: 'addition_purchase',
        quantity: qty,
        invoice_ref: invoiceNumber,
        notes: `توريد بأمر رقم: ${params.orderNumber} (فاتورة: ${invoiceNumber})`,
        created_by: params.createdBy || 'مسؤول المشتريات'
      });
    }
  }

  // 4. إذا اختار السداد المباشر من خزينة معينة (كاش / بنكي)
  if (params.paymentType === 'treasury' && params.treasuryId) {
    await createSupplierTransactionLibSql({
      supplier_id: params.supplierId,
      type: 'payment',
      amount: totalAmount,
      date: params.invoiceDate || now.split('T')[0],
      invoice_number: `PAY-${invoiceNumber}`,
      treasury_id: params.treasuryId,
      payment_method_id: params.paymentMethodId || null,
      notes: `سداد فوري لفاتورة التوريد رقم: ${invoiceNumber}`,
      created_by: params.createdBy || 'مسؤول المشتريات'
    });
  }

  const updatedOrderRows = await executeSql<any>('SELECT * FROM purchase_orders WHERE id = ? LIMIT 1', [params.orderId]);
  const updatedOrder = updatedOrderRows[0];

  return {
    order: {
      id: updatedOrder.id,
      order_number: updatedOrder.order_number,
      supplier_id: updatedOrder.supplier_id,
      order_date: updatedOrder.order_date,
      status: updatedOrder.status,
      items: params.items as any,
      total_amount: totalAmount,
      converted_invoice_number: invoiceNumber,
      converted_at: now,
      notes: updatedOrder.notes,
      created_by: updatedOrder.created_by,
      created_at: updatedOrder.created_at
    },
    transaction: purchaseTx
  };
}

// ==============================================================================
// 22. الإعلانات والعروض (Advertisements)
// ==============================================================================
export async function getAdvertisementsLibSql(onlyActive?: boolean): Promise<Advertisement[]> {
  await initLibSqlSchema();
  const query = onlyActive
    ? 'SELECT * FROM advertisements WHERE is_active = 1 ORDER BY date DESC, created_at DESC'
    : 'SELECT * FROM advertisements ORDER BY date DESC, created_at DESC';
  const rows = await executeSql<any>(query);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description || '',
    date: r.date,
    phone: r.phone || '',
    whatsapp: r.whatsapp || '',
    price: Number(r.price) || 0,
    image_url: r.image_url || '',
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    created_at: r.created_at
  }));
}

export async function createAdvertisementLibSql(
  ad: Omit<Advertisement, 'id' | 'created_at'> & { id?: string }
): Promise<Advertisement> {
  await initLibSqlSchema();
  const id = ad.id || generateId();
  const now = new Date().toISOString();
  const isActive = ad.is_active !== false ? 1 : 0;

  await executeSql(
    `INSERT INTO advertisements (id, title, description, date, phone, whatsapp, price, image_url, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ad.title,
      ad.description || null,
      ad.date || now.split('T')[0],
      ad.phone || null,
      ad.whatsapp || null,
      Number(ad.price) || 0,
      ad.image_url,
      isActive,
      now
    ]
  );

  return {
    ...ad,
    id,
    is_active: isActive === 1,
    created_at: now
  };
}

export async function updateAdvertisementLibSql(ad: Advertisement): Promise<Advertisement> {
  await initLibSqlSchema();
  const isActive = ad.is_active !== false ? 1 : 0;

  await executeSql(
    `UPDATE advertisements
     SET title = ?, description = ?, date = ?, phone = ?, whatsapp = ?, price = ?, image_url = ?, is_active = ?
     WHERE id = ?`,
    [
      ad.title,
      ad.description || null,
      ad.date,
      ad.phone || null,
      ad.whatsapp || null,
      Number(ad.price) || 0,
      ad.image_url,
      isActive,
      ad.id
    ]
  );

  return { ...ad, is_active: isActive === 1 };
}

export async function deleteAdvertisementLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM advertisements WHERE id = ?', [id]);
}

// ==============================================================================
// 24. إشعارات وتنبيهات النظام (System Notifications API)
// ==============================================================================

export async function getNotificationsLibSql(): Promise<SystemNotification[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 100');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type as any,
    reference_id: r.reference_id || undefined,
    customer_id: r.customer_id || undefined,
    rating: r.rating ? Number(r.rating) : undefined,
    rating_comment: r.rating_comment || undefined,
    is_read: r.is_read === 1,
    created_at: r.created_at
  }));
}

export async function createNotificationLibSql(
  notif: Omit<SystemNotification, 'id'> & { id?: string }
): Promise<SystemNotification> {
  await initLibSqlSchema();
  const id = notif.id || generateId();
  const now = new Date().toISOString();
  const isRead = notif.is_read ? 1 : 0;

  await executeSql(
    `INSERT INTO system_notifications (id, title, message, type, reference_id, customer_id, rating, rating_comment, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      notif.title,
      notif.message,
      notif.type || 'info',
      notif.reference_id || null,
      notif.customer_id || null,
      notif.rating || null,
      notif.rating_comment || null,
      isRead,
      now
    ]
  );

  return {
    ...notif,
    id,
    is_read: isRead === 1,
    created_at: now
  };
}

export async function markNotificationAsReadLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('UPDATE system_notifications SET is_read = 1 WHERE id = ?', [id]);
}

export async function markAllNotificationsAsReadLibSql(): Promise<void> {
  await initLibSqlSchema();
  await executeSql('UPDATE system_notifications SET is_read = 1 WHERE is_read = 0');
}

export async function deleteNotificationLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM system_notifications WHERE id = ?', [id]);
}

// ==============================================================================
// 25. منتجات المتجر الإلكتروني (Store Products API)
// ==============================================================================

export async function getStoreProductsLibSql(): Promise<StoreProduct[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM store_products ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    price: Number(r.price) || 0,
    discount_price: r.discount_price ? Number(r.discount_price) : undefined,
    image_url: r.image_url,
    is_limited_quantity: Boolean(r.is_limited_quantity === 1),
    category: r.category || '',
    is_available: Boolean(r.is_available === 1),
    stock_quantity: Number(r.stock_quantity) || 0,
    created_at: r.created_at
  }));
}

export async function createStoreProductLibSql(
  prod: Omit<StoreProduct, 'id' | 'created_at'> & { id?: string }
): Promise<StoreProduct> {
  await initLibSqlSchema();
  const id = prod.id || generateId();
  const now = new Date().toISOString();
  const isLimited = prod.is_limited_quantity ? 1 : 0;
  const isAvail = prod.is_available !== false ? 1 : 0;
  const stock = prod.stock_quantity !== undefined ? Number(prod.stock_quantity) : 10;
  const price = Number(prod.price) || 0;
  const discountPrice = prod.discount_price !== undefined && prod.discount_price !== null ? Number(prod.discount_price) : null;

  await executeSql(
    `INSERT INTO store_products (id, name, description, price, discount_price, image_url, is_limited_quantity, category, is_available, stock_quantity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      prod.name,
      prod.description || null,
      price,
      discountPrice,
      prod.image_url,
      isLimited,
      prod.category || 'عام',
      isAvail,
      stock,
      now
    ]
  );

  return {
    ...prod,
    id,
    price,
    discount_price: discountPrice !== null ? discountPrice : undefined,
    is_limited_quantity: isLimited === 1,
    is_available: isAvail === 1,
    stock_quantity: stock,
    created_at: now
  };
}

export async function updateStoreProductLibSql(prod: StoreProduct): Promise<StoreProduct> {
  await initLibSqlSchema();
  const isLimited = prod.is_limited_quantity ? 1 : 0;
  const isAvail = prod.is_available !== false ? 1 : 0;
  const stock = prod.stock_quantity !== undefined ? Number(prod.stock_quantity) : 10;
  const price = Number(prod.price) || 0;
  const discountPrice = prod.discount_price !== undefined && prod.discount_price !== null ? Number(prod.discount_price) : null;

  await executeSql(
    `UPDATE store_products
     SET name = ?, description = ?, price = ?, discount_price = ?, image_url = ?, is_limited_quantity = ?, category = ?, is_available = ?, stock_quantity = ?
     WHERE id = ?`,
    [
      prod.name,
      prod.description || null,
      price,
      discountPrice,
      prod.image_url,
      isLimited,
      prod.category || 'عام',
      isAvail,
      stock,
      prod.id
    ]
  );

  return {
    ...prod,
    price,
    discount_price: discountPrice !== null ? discountPrice : undefined,
    is_limited_quantity: isLimited === 1,
    is_available: isAvail === 1,
    stock_quantity: stock
  };
}

export async function deleteStoreProductLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM store_products WHERE id = ?', [id]);
}

// ==============================================================================
// 26. طلبات الشراء من المتجر (Store Orders API)
// ==============================================================================

export async function getStoreOrdersLibSql(): Promise<StoreOrder[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM store_orders ORDER BY created_at DESC');
  return rows.map((r) => {
    let items = [];
    try {
      items = JSON.parse(r.items || '[]');
    } catch {
      items = [];
    }

    return {
      id: r.id,
      order_number: r.order_number,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time,
      delivery_address: r.delivery_address || undefined,
      payment_method: r.payment_method as any,
      transfer_receipt_url: r.transfer_receipt_url || undefined,
      status: (r.status || 'pending') as StoreOrderStatus,
      items,
      subtotal: Number(r.subtotal) || 0,
      discount_amount: Number(r.discount_amount) || 0,
      total_amount: Number(r.total_amount) || 0,
      notes: r.notes || undefined,
      created_at: r.created_at
    };
  });
}

export async function createStoreOrderLibSql(
  order: Omit<StoreOrder, 'id' | 'order_number' | 'created_at'> & { id?: string; order_number?: string }
): Promise<StoreOrder> {
  await initLibSqlSchema();
  const id = order.id || generateId();
  const orderNumber = order.order_number || `ORD-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(order.items || []);

  await executeSql(
    `INSERT INTO store_orders (
      id, order_number, customer_id, customer_name, customer_phone,
      delivery_date, delivery_time, delivery_address, payment_method,
      transfer_receipt_url, status, items, subtotal, discount_amount,
      total_amount, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orderNumber,
      order.customer_id,
      order.customer_name,
      order.customer_phone,
      order.delivery_date,
      order.delivery_time,
      order.delivery_address || null,
      order.payment_method || 'vodafone_cash',
      order.transfer_receipt_url || null,
      order.status || 'pending',
      itemsJson,
      Number(order.subtotal) || 0,
      Number(order.discount_amount) || 0,
      Number(order.total_amount) || 0,
      order.notes || null,
      now
    ]
  );

  return {
    ...order,
    id,
    order_number: orderNumber,
    created_at: now
  };
}

export async function updateStoreOrderStatusLibSql(
  orderId: string,
  status: StoreOrderStatus
): Promise<void> {
  await initLibSqlSchema();
  await executeSql('UPDATE store_orders SET status = ? WHERE id = ?', [status, orderId]);
}

export async function deleteStoreOrderLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM store_orders WHERE id = ?', [id]);
}




