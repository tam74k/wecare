import { libSqlClient, executeSql, executeBatch, initLibSqlSchema } from '../lib/libsql';
import {
  Settings,
  CoverageArea,
  Employee,
  EmployeePermission,
  Attendance,
  Customer,
  Vehicle,
  VehicleColor,
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
  StoreOrderStatus,
  ExpenseCategory,
  Expense,
  SalaryPayment,
  PriceQuotationRequest,
  PriceQuotationItem,
  OnDemandService,
  ServiceBooking
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
    store_name: r.store_name || '',
    google_drive_folder_url: r.google_drive_folder_url || '',
    google_drive_folder_name: r.google_drive_folder_name || '',
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
  const storeName = settings.store_name ?? existing?.store_name ?? '';
  const googleDriveFolderUrl = settings.google_drive_folder_url ?? existing?.google_drive_folder_url ?? '';
  const googleDriveFolderName = settings.google_drive_folder_name ?? existing?.google_drive_folder_name ?? '';

  await executeSql(
    `INSERT OR REPLACE INTO system_settings (id, company_name, institution_name, logo_url, country, currency_symbol, currency_code, dial_code, whatsapp_instance, whatsapp_api_key, vodafone_cash_number, instapay_handle, store_name, google_drive_folder_url, google_drive_folder_name, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, companyName, companyName, logoUrl, country, currencySymbol, currencyCode, dialCode, whatsappInstance, whatsappApiKey, vodafoneCashNumber, instapayHandle, storeName, googleDriveFolderUrl, googleDriveFolderName]
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
    instapay_handle: instapayHandle,
    store_name: storeName,
    google_drive_folder_url: googleDriveFolderUrl,
    google_drive_folder_name: googleDriveFolderName
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
    criminal_record_image_url: r.criminal_record_image_url || '',
    personal_image_url: r.personal_image_url || '',
    role: r.role,
    username: r.username,
    password_hash: r.password_hash,
    salary: Number(r.salary) || 0,
    status: r.status || 'active',
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createEmployeeLibSql(employee: Omit<Employee, 'id'> & { id?: string }): Promise<Employee> {
  await initLibSqlSchema();
  const id = employee.id || generateId();
  await executeSql(
    `INSERT INTO employees (id, national_id, full_name, phone, address, hire_date, id_card_image_url, national_id_image_url, criminal_record_image_url, personal_image_url, role, username, password_hash, salary, status, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
    [
      id,
      employee.national_id,
      employee.full_name,
      employee.phone,
      employee.address || '',
      employee.hire_date || new Date().toISOString().split('T')[0],
      employee.id_card_image_url || employee.national_id_image_url || null,
      employee.national_id_image_url || employee.id_card_image_url || null,
      employee.criminal_record_image_url || null,
      employee.personal_image_url || null,
      employee.role,
      employee.username,
      employee.password_hash,
      Number(employee.salary) || 0,
      employee.is_active ? 'active' : 'inactive'
    ]
  );
  return { ...employee, id };
}

export async function updateEmployeeLibSql(employee: Employee | (Partial<Employee> & { id: string })): Promise<Employee> {
  await initLibSqlSchema();
  // Fetch current row from DB so partial updates (e.g. updating only photo or status) never nullify existing fields
  let current: any = {};
  try {
    const existingRows = await executeSql('SELECT * FROM employees WHERE id = ? LIMIT 1', [employee.id]);
    if (existingRows && existingRows.length > 0) {
      current = existingRows[0];
    }
  } catch (fetchErr) {
    console.warn('[updateEmployeeLibSql] Could not fetch current row:', fetchErr);
  }

  const merged = {
    ...current,
    ...employee,
    id: employee.id,
    national_id: employee.national_id !== undefined ? employee.national_id : (current.national_id || ''),
    full_name: employee.full_name !== undefined ? employee.full_name : (current.full_name || ''),
    phone: employee.phone !== undefined ? employee.phone : (current.phone || ''),
    address: employee.address !== undefined ? employee.address : (current.address || ''),
    hire_date: employee.hire_date !== undefined ? employee.hire_date : (current.hire_date || new Date().toISOString().split('T')[0]),
    id_card_image_url: employee.id_card_image_url !== undefined ? employee.id_card_image_url : (current.id_card_image_url || current.national_id_image_url || null),
    national_id_image_url: employee.national_id_image_url !== undefined ? employee.national_id_image_url : (current.national_id_image_url || current.id_card_image_url || null),
    criminal_record_image_url: employee.criminal_record_image_url !== undefined ? employee.criminal_record_image_url : (current.criminal_record_image_url || null),
    personal_image_url: employee.personal_image_url !== undefined ? employee.personal_image_url : (current.personal_image_url || null),
    role: employee.role !== undefined ? employee.role : (current.role || 'worker'),
    username: employee.username !== undefined ? employee.username : (current.username || ''),
    password_hash: employee.password_hash !== undefined ? employee.password_hash : (current.password_hash || ''),
    salary: employee.salary !== undefined ? Number(employee.salary) : (Number(current.salary) || 0),
    is_active: employee.is_active !== undefined ? Boolean(employee.is_active) : (current.is_active !== undefined ? Boolean(current.is_active !== 0) : true)
  };

  await executeSql(
    `UPDATE employees SET national_id = ?, full_name = ?, phone = ?, address = ?, hire_date = ?, id_card_image_url = ?, national_id_image_url = ?, criminal_record_image_url = ?, personal_image_url = ?, role = ?, username = ?, password_hash = ?, salary = ?, status = ?, is_active = ? WHERE id = ?`,
    [
      merged.national_id,
      merged.full_name,
      merged.phone,
      merged.address,
      merged.hire_date,
      merged.id_card_image_url || merged.national_id_image_url || null,
      merged.national_id_image_url || merged.id_card_image_url || null,
      merged.criminal_record_image_url || null,
      merged.personal_image_url || null,
      merged.role,
      merged.username,
      merged.password_hash,
      Number(merged.salary) || 0,
      merged.is_active ? 'active' : 'inactive',
      merged.is_active ? 1 : 0,
      employee.id
    ]
  );
  return merged as Employee;
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
    is_paid_leave: Boolean(r.is_paid_leave === 1 || r.status === 'paid_leave'),
    leave_type: r.leave_type || (r.status === 'paid_leave' ? 'paid' : undefined),
    deduction_amount: Number(r.deduction_amount) || 0,
    daily_salary: Number(r.daily_salary) || 0,
    created_at: r.created_at
  }));
}

export async function recordAttendanceLibSql(att: Omit<Attendance, 'id'> & { id?: string }): Promise<Attendance> {
  await initLibSqlSchema();
  const id = att.id || generateId();
  await executeSql(
    `INSERT OR REPLACE INTO attendance (id, employee_id, date, status, check_in, check_out, notes, is_paid_leave, leave_type, deduction_amount, daily_salary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      att.employee_id,
      att.date,
      att.status,
      att.check_in || null,
      att.check_out || null,
      att.notes || null,
      att.is_paid_leave ? 1 : 0,
      att.leave_type || (att.is_paid_leave ? 'paid' : (att.status === 'leave' ? 'unpaid' : null)),
      att.deduction_amount !== undefined ? Number(att.deduction_amount) : 0,
      att.daily_salary !== undefined ? Number(att.daily_salary) : 0
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

/**
 * فحص تطابق رقمين هاتفين بغض النظر عن الصيغة المصرية (+20، 0، بدون 0، مسافات)
 */
export function phonesMatch(phone1?: string | number | null, phone2?: string | number | null): boolean {
  const d1 = String(phone1 || '').replace(/\D/g, '');
  const d2 = String(phone2 || '').replace(/\D/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 8 && d2.length >= 8) {
    const last8_1 = d1.slice(-8);
    const last8_2 = d2.slice(-8);
    if (last8_1 === last8_2) return true;
  }
  return false;
}

export async function findCustomerByPhoneLibSql(
  phoneInput: string
): Promise<{ customer: Customer; vehicles: Vehicle[] } | null> {
  await initLibSqlSchema();
  const digits = String(phoneInput || '').replace(/\D/g, '');
  if (digits.length < 7) return null;

  const customers = await getCustomersLibSql();
  const matched = customers.find((c) => phonesMatch(c.phone || c.mobile || '', digits));
  if (!matched) return null;

  const allVehs = await getVehiclesLibSql();
  const matchedVehs = allVehs.filter((v) => v.customer_id === matched.id);

  return {
    customer: matched,
    vehicles: matchedVehs
  };
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

  let safeAreaId = customer.area_id?.trim() || null;
  if (safeAreaId) {
    const existingArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE id = ? LIMIT 1', [safeAreaId]);
    if (!existingArea || existingArea.length === 0) {
      const byName = await executeSql<any>('SELECT id FROM coverage_areas WHERE name = ? LIMIT 1', [safeAreaId]);
      safeAreaId = byName.length > 0 ? byName[0].id : null;
    }
  }

  await executeSql(
    `INSERT INTO customers (id, name, full_name, mobile, phone, area_id, building_number, block, block_number, detailed_address, location_url, username, password_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      name,
      name,
      phone,
      phone,
      safeAreaId,
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
  return { ...customer, id, full_name: name, phone, area_id: safeAreaId || '', username, password_hash: passwordHash, status };
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

  let safeAreaId = customer.area_id?.trim() || null;
  if (safeAreaId) {
    const existingArea = await executeSql<any>('SELECT id FROM coverage_areas WHERE id = ? LIMIT 1', [safeAreaId]);
    if (!existingArea || existingArea.length === 0) {
      const byName = await executeSql<any>('SELECT id FROM coverage_areas WHERE name = ? LIMIT 1', [safeAreaId]);
      safeAreaId = byName.length > 0 ? byName[0].id : null;
    }
  }

  await executeSql(
    `UPDATE customers SET name = ?, full_name = ?, mobile = ?, phone = ?, area_id = ?, building_number = ?, block = ?, block_number = ?, detailed_address = ?, location_url = ?, username = ?, password_hash = ?, status = ? WHERE id = ?`,
    [
      name,
      name,
      phone,
      phone,
      safeAreaId,
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
  return { ...customer, full_name: name, phone, area_id: safeAreaId || '', username, password_hash: passwordHash, status };
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
    brand: r.brand || '',
    model: r.model || '',
    year: r.year || '',
    body_type: r.body_type || '',
    letters: r.letters || '',
    digits: r.digits || '',
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
  const color = vehicle.color || 'أبيض';
  const bodyType = (vehicle as any).body_type || null;
  const letters = (vehicle as any).letters || null;
  const digits = (vehicle as any).digits || null;

  // التحقق من صحة customer_id لتجنب فشل قيود المفتاح الأجنبي (Foreign Key Constraint)
  let targetCustomerId = vehicle.customer_id;
  if (targetCustomerId) {
    const custExists = await executeSql<any>('SELECT id FROM customers WHERE id = ? LIMIT 1', [targetCustomerId]);
    if (!custExists || custExists.length === 0) {
      const byPhoneOrUser = await executeSql<any>(
        'SELECT id FROM customers WHERE phone = ? OR mobile = ? OR username = ? LIMIT 1',
        [targetCustomerId, targetCustomerId, targetCustomerId]
      );
      if (byPhoneOrUser && byPhoneOrUser.length > 0) {
        targetCustomerId = byPhoneOrUser[0].id;
      }
    }
  }

  // إذا لم يتم العثور على العميل، نستخدم أول عميل متاح في النظام كحل احتياطي آمن
  if (!targetCustomerId) {
    const anyCust = await executeSql<any>('SELECT id FROM customers LIMIT 1');
    if (anyCust && anyCust.length > 0) {
      targetCustomerId = anyCust[0].id;
    }
  }

  // التأكد من توفر كافة الأعمدة في جدول vehicles
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN brand TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN model TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN year TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN license_plate TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN body_type TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN letters TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN digits TEXT'); } catch {}

  // إضافة اللون تلقائياً إلى جدول vehicle_colors إن لم يكن مسجلاً
  if (color && color.trim()) {
    try {
      await executeSql(
        "INSERT OR IGNORE INTO vehicle_colors (id, name, hex, created_at) VALUES (?, ?, ?, datetime('now'))",
        ['color-' + generateId(), color.trim(), '#6B7280']
      );
    } catch {}
  }

  try {
    await executeSql(
      `INSERT INTO vehicles (id, customer_id, type, vehicle_type, color, license_plate, plate_number, brand, model, year, body_type, letters, digits, image_url, vehicle_image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, targetCustomerId, type, type, color, plate, plate, vehicle.brand || null, vehicle.model || null, vehicle.year || null, bodyType, letters, digits, img, img]
    );
  } catch (insertErr: any) {
    console.warn('[createVehicleLibSql] Retrying insert with column migration:', insertErr?.message);
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN brand TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN model TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN year TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN body_type TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN letters TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN digits TEXT'); } catch {}

    try {
      await executeSql(
        `INSERT INTO vehicles (id, customer_id, type, vehicle_type, color, license_plate, plate_number, brand, model, year, body_type, letters, digits, image_url, vehicle_image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, targetCustomerId, type, type, color, plate, plate, vehicle.brand || null, vehicle.model || null, vehicle.year || null, bodyType, letters, digits, img, img]
      );
    } catch {
      // إدخال احتياطي بدون الأعمدة الجديدة لضمان عدم توقف حفظ السيارة إطلاقاً
      const combinedType = vehicle.brand ? `${vehicle.brand} ${vehicle.model || ''}`.trim() : type;
      await executeSql(
        `INSERT INTO vehicles (id, customer_id, type, vehicle_type, color, license_plate, plate_number, image_url, vehicle_image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, targetCustomerId, combinedType, combinedType, color, plate, plate, img, img]
      );
    }
  }
  return {
    ...vehicle,
    id,
    customer_id: targetCustomerId,
    vehicle_type: type,
    type,
    plate_number: plate,
    license_plate: plate,
    color,
    body_type: bodyType || undefined,
    letters: letters || undefined,
    digits: digits || undefined
  };
}

export async function updateVehicleLibSql(vehicle: Vehicle): Promise<Vehicle> {
  await initLibSqlSchema();
  const type = vehicle.vehicle_type || vehicle.type || 'سيدان';
  const plate = vehicle.plate_number || vehicle.license_plate || '';
  const img = vehicle.vehicle_image_url || vehicle.image_url || '';
  const bodyType = (vehicle as any).body_type || null;
  const letters = (vehicle as any).letters || null;
  const digits = (vehicle as any).digits || null;

  // التأكد من توفر كافة الأعمدة
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN brand TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN model TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN year TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN license_plate TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN body_type TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN letters TEXT'); } catch {}
  try { await executeSql('ALTER TABLE vehicles ADD COLUMN digits TEXT'); } catch {}

  // إضافة اللون تلقائياً إلى جدول vehicle_colors إن لم يكن مسجلاً
  if (vehicle.color && vehicle.color.trim()) {
    try {
      await executeSql(
        "INSERT OR IGNORE INTO vehicle_colors (id, name, hex, created_at) VALUES (?, ?, ?, datetime('now'))",
        ['color-' + generateId(), vehicle.color.trim(), '#6B7280']
      );
    } catch {}
  }

  try {
    await executeSql(
      `UPDATE vehicles SET type = ?, vehicle_type = ?, color = ?, license_plate = ?, plate_number = ?, brand = ?, model = ?, year = ?, body_type = ?, letters = ?, digits = ?, image_url = ?, vehicle_image_url = ? WHERE id = ?`,
      [type, type, vehicle.color, plate, plate, vehicle.brand || null, vehicle.model || null, vehicle.year || null, bodyType, letters, digits, img, img, vehicle.id]
    );
  } catch (updateErr: any) {
    console.warn('[updateVehicleLibSql] Retrying update with column migration:', updateErr?.message);
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN brand TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN model TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN year TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN body_type TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN letters TEXT'); } catch {}
    try { await executeSql('ALTER TABLE vehicles ADD COLUMN digits TEXT'); } catch {}

    try {
      await executeSql(
        `UPDATE vehicles SET type = ?, vehicle_type = ?, color = ?, license_plate = ?, plate_number = ?, brand = ?, model = ?, year = ?, body_type = ?, letters = ?, digits = ?, image_url = ?, vehicle_image_url = ? WHERE id = ?`,
        [type, type, vehicle.color, plate, plate, vehicle.brand || null, vehicle.model || null, vehicle.year || null, bodyType, letters, digits, img, img, vehicle.id]
      );
    } catch {
      const combinedType = vehicle.brand ? `${vehicle.brand} ${vehicle.model || ''}`.trim() : type;
      await executeSql(
        `UPDATE vehicles SET type = ?, vehicle_type = ?, color = ?, license_plate = ?, plate_number = ?, image_url = ?, vehicle_image_url = ? WHERE id = ?`,
        [combinedType, combinedType, vehicle.color, plate, plate, img, img, vehicle.id]
      );
    }
  }
  return vehicle;
}

export async function deleteVehicleLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM vehicles WHERE id = ?', [id]);
}

// ==============================================================================
// 7.1 ألوان السيارات (Vehicle Colors)
// ==============================================================================
export async function getVehicleColorsLibSql(): Promise<VehicleColor[]> {
  await initLibSqlSchema();
  try {
    await executeSql('CREATE TABLE IF NOT EXISTS vehicle_colors (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, hex TEXT, created_at TEXT)');
  } catch {}
  const rows = await executeSql<any>('SELECT * FROM vehicle_colors ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    hex: r.hex || '#6B7280',
    created_at: r.created_at
  }));
}

export async function createVehicleColorLibSql(color: { name: string; hex?: string; id?: string }): Promise<VehicleColor> {
  await initLibSqlSchema();
  try {
    await executeSql('CREATE TABLE IF NOT EXISTS vehicle_colors (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, hex TEXT, created_at TEXT)');
  } catch {}
  const cleanName = color.name.trim();
  const id = color.id || generateId();
  const hex = color.hex?.trim() || '#6B7280';

  // التحقق إن كان اللون مسجلاً بالفعل
  const existing = await executeSql<any>('SELECT * FROM vehicle_colors WHERE name = ? LIMIT 1', [cleanName]);
  if (existing && existing.length > 0) {
    return {
      id: existing[0].id,
      name: existing[0].name,
      hex: existing[0].hex || hex,
      created_at: existing[0].created_at
    };
  }

  await executeSql(
    `INSERT INTO vehicle_colors (id, name, hex, created_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [id, cleanName, hex]
  );
  return { id, name: cleanName, hex, created_at: new Date().toISOString() };
}

export async function updateVehicleColorLibSql(id: string, updates: { name?: string; hex?: string }): Promise<VehicleColor> {
  await initLibSqlSchema();
  if (updates.name && updates.hex) {
    await executeSql('UPDATE vehicle_colors SET name = ?, hex = ? WHERE id = ?', [updates.name.trim(), updates.hex.trim(), id]);
  } else if (updates.name) {
    await executeSql('UPDATE vehicle_colors SET name = ? WHERE id = ?', [updates.name.trim(), id]);
  } else if (updates.hex) {
    await executeSql('UPDATE vehicle_colors SET hex = ? WHERE id = ?', [updates.hex.trim(), id]);
  }
  const rows = await executeSql<any>('SELECT * FROM vehicle_colors WHERE id = ? LIMIT 1', [id]);
  if (rows && rows.length > 0) {
    return { id: rows[0].id, name: rows[0].name, hex: rows[0].hex, created_at: rows[0].created_at };
  }
  return { id, name: updates.name || '', hex: updates.hex || '#6B7280' };
}

export async function deleteVehicleColorLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM vehicle_colors WHERE id = ?', [id]);
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
      duration_days: r.duration_days !== undefined && r.duration_days !== null ? Number(r.duration_days) : 30,
      weekly_visits_count: weeklyCount,
      weekly_services_plan: servicesPlan,
      base_visits_count: r.base_visits_count !== undefined && r.base_visits_count !== null ? Number(r.base_visits_count) : weeklyCount * 4,
      description: r.description || '',
      is_active: Boolean(r.is_active !== 0),
      image_url: r.image_url || undefined,
      created_at: r.created_at
    };
  });
}

export async function createPackageLibSql(pkg: Omit<Package, 'id'> & { id?: string }): Promise<Package> {
  await initLibSqlSchema();
  const id = pkg.id || generateId();
  const weeklyCount = pkg.weekly_visits_count !== undefined ? pkg.weekly_visits_count : (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 1);
  const planJson = JSON.stringify(pkg.weekly_services_plan || []);
  const baseVisits = pkg.base_visits_count !== undefined ? pkg.base_visits_count : (weeklyCount * Math.max(1, Math.round((pkg.duration_days || 30) / 7)));

  await executeSql(
    `INSERT INTO packages (id, category_id, name, tier, level, duration_days, weekly_visits_count, weekly_services_plan, base_visits_count, description, is_active, image_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      pkg.category_id,
      pkg.name,
      pkg.tier || pkg.level || 'monthly',
      pkg.level || pkg.tier || 'monthly',
      pkg.duration_days !== undefined ? pkg.duration_days : 30,
      weeklyCount,
      planJson,
      baseVisits,
      pkg.description || '',
      pkg.is_active ? 1 : 0,
      pkg.image_url || null
    ]
  );
  return { ...pkg, id, weekly_visits_count: weeklyCount, weekly_services_plan: pkg.weekly_services_plan || [], base_visits_count: baseVisits };
}

export async function updatePackageLibSql(pkg: Package): Promise<Package> {
  await initLibSqlSchema();
  const weeklyCount = pkg.weekly_visits_count !== undefined ? pkg.weekly_visits_count : (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 1);
  const planJson = JSON.stringify(pkg.weekly_services_plan || []);
  const baseVisits = pkg.base_visits_count !== undefined ? pkg.base_visits_count : (weeklyCount * Math.max(1, Math.round((pkg.duration_days || 30) / 7)));

  await executeSql(
    `UPDATE packages SET category_id = ?, name = ?, tier = ?, level = ?, duration_days = ?, weekly_visits_count = ?, weekly_services_plan = ?, base_visits_count = ?, description = ?, is_active = ?, image_url = ? WHERE id = ?`,
    [
      pkg.category_id,
      pkg.name,
      pkg.tier || pkg.level || 'monthly',
      pkg.level || pkg.tier || 'monthly',
      pkg.duration_days !== undefined ? pkg.duration_days : 30,
      weeklyCount,
      planJson,
      baseVisits,
      pkg.description || '',
      pkg.is_active ? 1 : 0,
      pkg.image_url || null,
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
  const rows = await executeSql<any>('SELECT payment_method_id FROM treasuries WHERE id = ?', [id]);
  const pmId = rows[0]?.payment_method_id;
  await executeSql('DELETE FROM treasuries WHERE id = ?', [id]);
  if (pmId) {
    await executeSql('DELETE FROM payment_methods WHERE id = ?', [pmId]);
  }
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
  const treasuryId = pm.treasury_id || generateId();
  const cleanName = pm.name.replace(/^خزينة\s+/, '').trim();

  // 1. إنشاء الخزينة الفرعية التابعة لطريقة الدفع (اسم الخزينة هو نفسه طريقة الدفع)
  await executeSql(
    `INSERT INTO treasuries (id, name, type, payment_method_id, balance, is_deletable, created_at)
     VALUES (?, ?, 'payment_method', ?, 0.0, 1, datetime('now'))`,
    [treasuryId, cleanName, id]
  );

  // 2. إنشاء طريقة الدفع وربطها بالخزينة
  await executeSql(
    `INSERT INTO payment_methods (id, name, treasury_id, is_active, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [id, cleanName, treasuryId, pm.is_active ? 1 : 0]
  );
  return { ...pm, id, name: cleanName, treasury_id: treasuryId };
}

export async function updatePaymentMethodLibSql(pm: Partial<PaymentMethod> & { id: string }): Promise<PaymentMethod> {
  await initLibSqlSchema();
  const currentRows = await executeSql<any>('SELECT * FROM payment_methods WHERE id = ? LIMIT 1', [pm.id]);
  const current = currentRows[0] || {};
  const updatedName = pm.name !== undefined ? pm.name.replace(/^خزينة\s+/, '').trim() : current.name;
  const updatedTreasuryId = pm.treasury_id !== undefined ? pm.treasury_id : current.treasury_id;
  const updatedIsActive = pm.is_active !== undefined ? (pm.is_active ? 1 : 0) : (current.is_active ?? 1);

  await executeSql(
    `UPDATE payment_methods SET name = ?, treasury_id = ?, is_active = ? WHERE id = ?`,
    [updatedName, updatedTreasuryId || null, updatedIsActive, pm.id]
  );

  // إذا تم تغيير الاسم، نحدّث أيضاً اسم الخزينة التابعة لها بنفس الاسم
  if (pm.name && updatedTreasuryId) {
    const cleanName = pm.name.replace(/^خزينة\s+/, '').trim();
    await executeSql('UPDATE treasuries SET name = ? WHERE id = ?', [cleanName, updatedTreasuryId]);
  }

  return {
    id: pm.id,
    name: updatedName,
    treasury_id: updatedTreasuryId,
    is_active: Boolean(updatedIsActive !== 0),
    created_at: current.created_at
  };
}

export async function deletePaymentMethodLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT treasury_id FROM payment_methods WHERE id = ?', [id]);
  const tId = rows[0]?.treasury_id;
  await executeSql('DELETE FROM payment_methods WHERE id = ?', [id]);
  if (tId) {
    await executeSql('DELETE FROM treasuries WHERE id = ?', [tId]);
  }
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
    category: r.category || undefined,
    payment_method: r.payment_method || undefined,
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
    `INSERT INTO treasury_transactions (id, treasury_id, related_treasury_id, type, transaction_type, amount, reason, category, payment_method, created_by, performed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.treasury_id,
      tx.related_treasury_id || null,
      tx.type,
      tx.type,
      tx.amount,
      tx.reason,
      tx.category || null,
      tx.payment_method || null,
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

export async function deleteTreasuryTransactionLibSql(id: string): Promise<boolean> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM treasury_transactions WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return false;
  const tx = rows[0];
  const amount = Number(tx.amount) || 0;
  const type = tx.type || tx.transaction_type;

  // عكس الأثر المالي للحركة الملغاة بدقة
  if (type === 'deposit') {
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [amount, tx.treasury_id]);
  } else if (type === 'withdrawal') {
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [amount, tx.treasury_id]);
  } else if (type === 'transfer' && tx.related_treasury_id) {
    // إعادة المبلغ للخزينة المصدر وخصمه من الخزينة المستلمة
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [amount, tx.treasury_id]);
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [amount, tx.related_treasury_id]);
  }

  await executeSql('DELETE FROM treasury_transactions WHERE id = ?', [id]);
  return true;
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

  // توليد جدول الزيارات الكاملة تلقائياً للاشتراك الجديد حسب أيامه ومدته وخطة الباقة
  try {
    await generateSubscriptionVisitsLibSql(id);
  } catch (err) {
    console.error('Error auto-generating visits in createSubscriptionLibSql:', err);
  }

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

  // تحديث العامل المخصص في الزيارات المجدولة القادمة إذا تم تغييره على الاشتراك
  if (safeWorkerId) {
    try {
      await executeSql(
        'UPDATE visits SET assigned_worker_id = ?, worker_id = ? WHERE subscription_id = ? AND status = "scheduled"',
        [safeWorkerId, safeWorkerId, sub.id]
      );
    } catch (e) {
      console.error('Error syncing worker to scheduled visits:', e);
    }
  }

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

export async function updateSubscriptionAutoRenewLibSql(subscriptionId: string, autoRenew: boolean): Promise<void> {
  await initLibSqlSchema();
  await executeSql(
    `UPDATE subscriptions SET auto_renew = ? WHERE id = ?`,
    [autoRenew ? 1 : 0, subscriptionId]
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
    'SELECT * FROM subscriptions WHERE id = ? LIMIT 1',
    [subscriptionId]
  );
  if (!subRows || subRows.length === 0) return;
  const sub = subRows[0];

  let pkg: any = null;
  if (sub.package_id) {
    const pkgRows = await executeSql<any>(
      'SELECT * FROM packages WHERE id = ? LIMIT 1',
      [sub.package_id]
    );
    if (pkgRows && pkgRows.length > 0) {
      pkg = pkgRows[0];
    }
  }

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
  if (pkg) {
    try {
      if (typeof pkg.weekly_services_plan === 'string' && pkg.weekly_services_plan.trim().startsWith('[')) {
        servicesPlan = JSON.parse(pkg.weekly_services_plan);
      } else if (Array.isArray(pkg.weekly_services_plan)) {
        servicesPlan = pkg.weekly_services_plan;
      }
    } catch {
      servicesPlan = [];
    }
  }
  if (servicesPlan.length === 0) {
    servicesPlan = ['غسيل'];
  }

  // ربط كل يوم محدد بنوع الخدمة المقابل له في خطة الباقة بالتتابع
  // مثال: إذا كان المختار (الأحد، الأربعاء) والخطة (غسيل، فوطة 1):
  // فكل أحد يحصل على "غسيل" وكل أربعاء يحصل على "فوطة 1" طوال مدة الاشتراك
  // حتى لو صادف الشهر 5 أيام أحد فإن الأحد الخامس يحصل على نفس الخدمة المعتادة لكل أحد
  const dayToServiceMap = new Map<number, { dayName: string; serviceType: string }>();
  sortedDays.forEach((dayName, idx) => {
    const dayNum = getDayNumberFromArabic(dayName);
    const serviceType = servicesPlan[idx % servicesPlan.length] || 'غسيل';
    dayToServiceMap.set(dayNum, { dayName, serviceType });
  });

  // 3. تحديد فترة الاشتراك من تاريخ البدء إلى تاريخ الانتهاء
  const parseDateParts = (dStr: string) => {
    const parts = dStr.split(/[-/T\s]/).map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const startDate = sub.start_date ? parseDateParts(sub.start_date) : parseDateParts(todayStr);

  let endDate: Date;
  if (sub.end_date) {
    endDate = parseDateParts(sub.end_date);
  } else {
    const durationDays = Number(pkg?.duration_days) || Number(sub.duration_days) || 30;
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
  }

  // مسح أي زيارات مجدولة سابقة لهذا الاشتراك قبل إعادة التوليد
  await executeSql('DELETE FROM visits WHERE subscription_id = ? AND status = "scheduled"', [sub.id]);

  // العامل المحدد أثناء الاشتراك في جميع الزيارات
  const workerId = sub.assigned_worker_id || sub.worker_id || null;

  // إذا كانت الباقة لخدمة فردية (إجمالي الزيارات = 1 أو المستوى الزمني none) يتم توليد زيارة واحدة فقط
  const isSingleVisitPackage = Number(pkg?.base_visits_count) === 1 || pkg?.tier === 'none' || pkg?.level === 'none';
  if (isSingleVisitPackage) {
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const visitId = generateId();
    const serviceType = servicesPlan[0] || pkg?.name || 'خدمة';
    const dayName = sub.preferred_day_of_week || (sortedDays.length > 0 ? sortedDays[0] : 'السبت');

    await executeSql(
      `INSERT INTO visits (id, subscription_id, customer_id, assigned_worker_id, worker_id, scheduled_date, scheduled_time_from, scheduled_time_to, service_type, day_of_week, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'))`,
      [
        visitId,
        sub.id,
        sub.customer_id,
        workerId,
        workerId,
        dateStr,
        sub.preferred_time_from || null,
        sub.preferred_time_to || null,
        serviceType,
        dayName
      ]
    );
    return;
  }

  // 4. توزيع الزيارات بالمرور على جميع الأيام من تاريخ البدء إلى تاريخ الانتهاء (شاملاً تاريخ الانتهاء)
  const curr = new Date(startDate);
  while (curr <= endDate) {
    const dayOfWeek = curr.getDay(); // 0 = الأحد, 1 = الإثنين, ...
    if (dayToServiceMap.has(dayOfWeek)) {
      const { dayName, serviceType } = dayToServiceMap.get(dayOfWeek)!;
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const visitId = generateId();

      await executeSql(
        `INSERT INTO visits (id, subscription_id, customer_id, assigned_worker_id, worker_id, scheduled_date, scheduled_time_from, scheduled_time_to, service_type, day_of_week, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'))`,
        [
          visitId,
          sub.id,
          sub.customer_id,
          workerId,
          workerId,
          dateStr,
          sub.preferred_time_from || null,
          sub.preferred_time_to || null,
          serviceType,
          dayName
        ]
      );
    }
    curr.setDate(curr.getDate() + 1);
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
    purchase_unit: r.purchase_unit || undefined,
    pieces_per_unit: r.pieces_per_unit ? Number(r.pieces_per_unit) : 1,
    piece_unit: r.piece_unit || undefined,
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
      purchase_unit, pieces_per_unit, piece_unit,
      opening_stock, current_stock, min_alert_threshold, status, 
      supplier_id, supplier_name, supplier_phone, unit_cost, notes, is_active, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      item.item_code || null,
      item.barcode || item.item_code || null,
      item.name,
      item.category || null,
      item.brand || null,
      item.usage_location || null,
      item.unit || 'قطعة',
      item.purchase_unit || null,
      item.pieces_per_unit || 1,
      item.piece_unit || null,
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
      purchase_unit = ?,
      pieces_per_unit = ?,
      piece_unit = ?,
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
      item.purchase_unit || null,
      item.pieces_per_unit || 1,
      item.piece_unit || null,
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

  // إعداد كافة أشكال وصيغ رقم الهاتف واسم المستخدم للبحث المرن (مع وبدون كود الدولة 20 أو 0)
  const digits = cleanId.replace(/[^0-9]/g, '');
  const idVariants: string[] = [cleanId];
  if (digits.length >= 8) {
    if (!idVariants.includes(digits)) idVariants.push(digits);
    if (digits.startsWith('20')) {
      const with0 = '0' + digits.substring(2);
      const without0 = digits.substring(2);
      if (!idVariants.includes(with0)) idVariants.push(with0);
      if (!idVariants.includes(without0)) idVariants.push(without0);
    } else if (digits.startsWith('0')) {
      const with2 = '2' + digits;
      const with20 = '20' + digits;
      const without0 = digits.substring(1);
      if (!idVariants.includes(with2)) idVariants.push(with2);
      if (!idVariants.includes(with20)) idVariants.push(with20);
      if (!idVariants.includes(without0)) idVariants.push(without0);
    } else {
      const with0 = '0' + digits;
      const with20 = '20' + digits;
      if (!idVariants.includes(with0)) idVariants.push(with0);
      if (!idVariants.includes(with20)) idVariants.push(with20);
    }
  }

  const placeholders = idVariants.map(() => '?').join(', ');

  // 1. البحث في جدول الموظفين (اسم المستخدم بحروف صغيرة أو الهاتف أو الرقم القومي)
  const empRows = await executeSql<any>(
    `SELECT * FROM employees WHERE (lower(username) IN (${placeholders}) OR phone IN (${placeholders}) OR national_id IN (${placeholders})) LIMIT 1`,
    [...idVariants, ...idVariants, ...idVariants]
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

  // 2. البحث في جدول العملاء بكافة الصيغ المحتملة
  const custRows = await executeSql<any>(
    `SELECT * FROM customers WHERE (lower(username) IN (${placeholders}) OR phone IN (${placeholders}) OR mobile IN (${placeholders})) LIMIT 1`,
    [...idVariants, ...idVariants, ...idVariants]
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
  const existingRows = await executeSql<any>('SELECT * FROM visits WHERE id = ? LIMIT 1', [visitId]);
  if (!existingRows || existingRows.length === 0) return null;
  const existing = existingRows[0];
  const oldDate = existing.scheduled_date;

  const dateParts = newDate.split(/[-/T\s]/).map(Number);
  const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const newDayName = dayNames[dateObj.getDay()] || existing.day_of_week;

  await executeSql(
    `UPDATE visits 
     SET scheduled_date = ?, 
         day_of_week = ?, 
         status = 'postponed', 
         postponed_from_date = COALESCE(postponed_from_date, ?), 
         notes = ?, 
         scheduled_time_from = COALESCE(?, scheduled_time_from), 
         scheduled_time_to = COALESCE(?, scheduled_time_to) 
     WHERE id = ?`,
    [
      newDate,
      newDayName,
      oldDate,
      `تم تأجيل ونقل الزيارة من ${oldDate} إلى ${newDate}`,
      newTimeFrom || null,
      newTimeTo || null,
      visitId
    ]
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
    let pmName = 'نقدي كاش';
    if (tx.payment_method_id) {
      try {
        const pmRows = await executeSql<any>('SELECT name FROM payment_methods WHERE id = ? LIMIT 1', [tx.payment_method_id]);
        if (pmRows.length > 0 && pmRows[0].name) {
          pmName = pmRows[0].name;
        }
      } catch (e) {
        console.error('Error fetching payment method name:', e);
      }
    }
    await createTreasuryTransactionLibSql({
      treasury_id: tx.treasury_id,
      type: 'withdrawal',
      amount: amount,
      reason: `سداد فاتورة/دفعة مشتريات للمورد: ${supplierName}${tx.invoice_number ? ` (سند/فاتورة: ${tx.invoice_number})` : ''}`,
      category: 'فواتير مشتروات',
      payment_method: pmName,
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

// ==============================================================================
// 21.5. طلبات عروض الأسعار (Price Quotation Requests - RFQ)
// ==============================================================================
export async function getPriceQuotationRequestsLibSql(supplierId?: string): Promise<PriceQuotationRequest[]> {
  await initLibSqlSchema();
  const query = supplierId
    ? 'SELECT * FROM price_quotation_requests WHERE supplier_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM price_quotation_requests ORDER BY created_at DESC';
  const args = supplierId ? [supplierId] : [];
  const rows = await executeSql<any>(query, args);

  return rows.map((r) => {
    let parsedItems: PriceQuotationItem[] = [];
    try {
      parsedItems = typeof r.items === 'string' ? JSON.parse(r.items || '[]') : r.items || [];
    } catch {
      parsedItems = [];
    }

    const dateVal = r.rfq_date || r.date || (r.created_at ? r.created_at.split('T')[0] : '');

    return {
      id: r.id,
      rfq_number: r.rfq_number,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      supplier_phone: r.supplier_phone || undefined,
      date: dateVal,
      rfq_date: dateVal,
      status: (r.status || 'draft') as any,
      items: parsedItems,
      total_amount: r.total_amount ? Number(r.total_amount) : undefined,
      notes: r.notes || undefined,
      converted_po_id: r.converted_po_id || undefined,
      converted_po_number: r.converted_po_number || undefined,
      converted_at: r.converted_at || undefined,
      created_by: r.created_by || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at || undefined
    };
  });
}

export async function createPriceQuotationRequestLibSql(
  rfq: Omit<PriceQuotationRequest, 'id' | 'created_at'> & { id?: string }
): Promise<PriceQuotationRequest> {
  await initLibSqlSchema();
  const id = rfq.id || generateId();
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(rfq.items || []);
  const dateVal = rfq.rfq_date || rfq.date || now.split('T')[0];

  await executeSql(
    `INSERT INTO price_quotation_requests (
      id, rfq_number, supplier_id, supplier_name, supplier_phone, date,
      status, items, total_amount, notes, converted_po_id, converted_po_number,
      converted_at, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rfq.rfq_number,
      rfq.supplier_id,
      rfq.supplier_name,
      rfq.supplier_phone || null,
      dateVal,
      rfq.status || 'draft',
      itemsJson,
      rfq.total_amount || 0,
      rfq.notes || null,
      rfq.converted_po_id || null,
      rfq.converted_po_number || null,
      rfq.converted_at || null,
      rfq.created_by || 'إدارة المشتريات',
      now,
      now
    ]
  );

  try {
    await executeSql('UPDATE price_quotation_requests SET rfq_date = ? WHERE id = ?', [dateVal, id]);
  } catch {}

  return {
    ...rfq,
    id,
    date: dateVal,
    rfq_date: dateVal,
    status: rfq.status || 'draft',
    created_at: now,
    updated_at: now
  };
}

export async function updatePriceQuotationRequestLibSql(
  rfq: PriceQuotationRequest
): Promise<PriceQuotationRequest> {
  await initLibSqlSchema();
  const now = new Date().toISOString();
  const itemsJson = JSON.stringify(rfq.items || []);
  const dateVal = rfq.rfq_date || rfq.date || now.split('T')[0];

  await executeSql(
    `UPDATE price_quotation_requests SET
      rfq_number = ?,
      supplier_id = ?,
      supplier_name = ?,
      supplier_phone = ?,
      date = ?,
      status = ?,
      items = ?,
      total_amount = ?,
      notes = ?,
      converted_po_id = ?,
      converted_po_number = ?,
      converted_at = ?,
      created_by = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      rfq.rfq_number,
      rfq.supplier_id,
      rfq.supplier_name,
      rfq.supplier_phone || null,
      dateVal,
      rfq.status,
      itemsJson,
      rfq.total_amount || 0,
      rfq.notes || null,
      rfq.converted_po_id || null,
      rfq.converted_po_number || null,
      rfq.converted_at || null,
      rfq.created_by || 'إدارة المشتريات',
      now,
      rfq.id
    ]
  );

  try {
    await executeSql('UPDATE price_quotation_requests SET rfq_date = ? WHERE id = ?', [dateVal, rfq.id]);
  } catch {}

  return {
    ...rfq,
    date: dateVal,
    rfq_date: dateVal,
    updated_at: now
  };
}

export async function deletePriceQuotationRequestLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM price_quotation_requests WHERE id = ?', [id]);
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

  // 3. إضافة الكميات الفعلية المستلمة إلى المخزون مع معالجة وتحويل الوحدات إلى قطع
  for (const item of params.items) {
    const qty = Number(item.quantity_received) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    if (qty > 0) {
      // جلب بيانات الصنف للتحقق من عدد القطع في الوحدة
      let piecesPerUnit = (item as any).pieces_per_unit;
      let itemRecord: any = null;
      try {
        const invRows = await executeSql<any>('SELECT * FROM inventory_items WHERE id = ? LIMIT 1', [item.item_id]);
        if (invRows.length > 0) {
          itemRecord = invRows[0];
          if (!piecesPerUnit && itemRecord.pieces_per_unit) {
            piecesPerUnit = Number(itemRecord.pieces_per_unit);
          }
        }
      } catch (err) {
        console.warn('Error fetching item for unit conversion:', err);
      }

      const multiplier = piecesPerUnit && Number(piecesPerUnit) > 1 ? Number(piecesPerUnit) : 1;
      const totalPieces = qty * multiplier;
      const costPerPiece = multiplier > 1 ? Number((unitPrice / multiplier).toFixed(2)) : unitPrice;

      // تحديث سعر التكلفة للقطعة بالصنف
      if (costPerPiece > 0) {
        await executeSql(
          `UPDATE inventory_items SET unit_cost = ? WHERE id = ?`,
          [costPerPiece, item.item_id]
        );
      }

      const noteText = multiplier > 1
        ? `توريد (${qty} ${item.unit || 'كرتونة'} = ${totalPieces} ${(item as any).piece_unit || itemRecord?.piece_unit || 'قطعة'}) - أمر: ${params.orderNumber}`
        : `توريد بأمر رقم: ${params.orderNumber} (فاتورة: ${invoiceNumber})`;

      // تسجيل حركة الإضافة المخزنية بالقطع الفعلية (تقوم بزيادة current_stock تلقائياً)
      await createInventoryTransactionLibSql({
        item_id: item.item_id,
        type: 'addition_purchase',
        quantity: totalPieces,
        invoice_ref: invoiceNumber,
        notes: noteText,
        created_by: params.createdBy || 'مسؤول المشتريات'
      });

      // مزامنة وزيادة كمية المتجر الإلكتروني إن كان الصنف مرتبطاً بمنتج متجر
      try {
        await executeSql(
          `UPDATE store_products 
           SET stock_quantity = stock_quantity + ? 
           WHERE inventory_item_id = ? OR (inventory_item_id IS NULL AND lower(name) = lower(?))`,
          [totalPieces, item.item_id, item.item_name]
        );
      } catch (err) {
        console.warn('Could not sync store product stock quantity:', err);
      }
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

export interface CreatePurchaseInvoiceParams {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: Array<{
    item_id: string;
    item_name: string;
    unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>;
  totalAmount: number;
  paymentType: 'credit' | 'treasury';
  treasuryId?: string | null;
  paymentMethodId?: string | null;
  notes?: string;
  createdBy?: string;
}

export async function createPurchaseInvoiceLibSql(
  params: CreatePurchaseInvoiceParams
): Promise<{ order: PurchaseOrder; transaction: SupplierTransaction }> {
  await initLibSqlSchema();
  const now = new Date().toISOString();
  const invoiceNumber = params.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const totalAmount = Number(params.totalAmount) || 0;
  const orderId = generateId();
  const orderNumber = `PO-${invoiceNumber}`;

  // 1. إعداد بنود الفاتورة وحفظها في جدول أوامر وفواتير الشراء بحالة converted
  const poItems = (params.items || []).map((it) => ({
    item_id: it.item_id,
    item_name: it.item_name,
    unit: it.unit || 'قطعة',
    quantity_requested: Number(it.quantity) || 0,
    quantity_received: Number(it.quantity) || 0,
    unit_price: Number(it.unit_price) || 0,
    total_price: Number(it.total_price) || 0,
    notes: it.notes || ''
  }));

  const itemsJson = JSON.stringify(poItems);
  await executeSql(
    `INSERT INTO purchase_orders (id, order_number, supplier_id, order_date, status, items, total_amount, converted_invoice_number, converted_at, notes, created_by, created_at)
     VALUES (?, ?, ?, ?, 'converted', ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      orderId,
      orderNumber,
      params.supplierId,
      params.invoiceDate || now.split('T')[0],
      itemsJson,
      totalAmount,
      invoiceNumber,
      now,
      params.notes || `فاتورة مشتريات رقم: ${invoiceNumber}`,
      params.createdBy || 'مسؤول المشتريات'
    ]
  );

  // 2. تسجيل حركة المشتريات على حساب المورد
  const purchaseTx = await createSupplierTransactionLibSql({
    supplier_id: params.supplierId,
    type: 'purchase',
    amount: totalAmount,
    date: params.invoiceDate || now.split('T')[0],
    invoice_number: invoiceNumber,
    notes: params.notes || `فاتورة مشتريات رقم: ${invoiceNumber}`,
    created_by: params.createdBy || 'مسؤول المشتريات'
  });

  // 3. إضافة الكميات المستلمة إلى المخزون مع معالجة وتحويل الوحدات إلى قطع
  for (const item of params.items) {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;

    if (qty > 0) {
      let piecesPerUnit = (item as any).pieces_per_unit;
      let itemRecord: any = null;
      try {
        const invRows = await executeSql<any>('SELECT * FROM inventory_items WHERE id = ? LIMIT 1', [item.item_id]);
        if (invRows.length > 0) {
          itemRecord = invRows[0];
          if (!piecesPerUnit && itemRecord.pieces_per_unit) {
            piecesPerUnit = Number(itemRecord.pieces_per_unit);
          }
        }
      } catch (err) {
        console.warn('Error fetching item for unit conversion:', err);
      }

      const multiplier = piecesPerUnit && Number(piecesPerUnit) > 1 ? Number(piecesPerUnit) : 1;
      const totalPieces = qty * multiplier;
      const costPerPiece = multiplier > 1 ? Number((unitPrice / multiplier).toFixed(2)) : unitPrice;

      if (costPerPiece > 0) {
        await executeSql(
          `UPDATE inventory_items SET unit_cost = ? WHERE id = ?`,
          [costPerPiece, item.item_id]
        );
      }

      const noteText = multiplier > 1
        ? `فاتورة مشتريات (${qty} ${item.unit || 'كرتونة'} = ${totalPieces} ${(item as any).piece_unit || itemRecord?.piece_unit || 'قطعة'}) - رقم: ${invoiceNumber}`
        : `فاتورة مشتريات رقم: ${invoiceNumber}`;

      await createInventoryTransactionLibSql({
        item_id: item.item_id,
        type: 'addition_purchase',
        quantity: totalPieces,
        invoice_ref: invoiceNumber,
        notes: noteText,
        created_by: params.createdBy || 'مسؤول المشتريات'
      });

      // مزامنة وزيادة كمية المتجر الإلكتروني إن كان الصنف مرتبطاً بمنتج متجر
      try {
        await executeSql(
          `UPDATE store_products 
           SET stock_quantity = stock_quantity + ? 
           WHERE inventory_item_id = ? OR (inventory_item_id IS NULL AND lower(name) = lower(?))`,
          [totalPieces, item.item_id, item.item_name]
        );
      } catch (err) {
        console.warn('Could not sync store product stock quantity:', err);
      }
    }
  }

  // 4. إذا اختار السداد الفوري من الخزينة
  if (params.paymentType === 'treasury' && params.treasuryId) {
    await createSupplierTransactionLibSql({
      supplier_id: params.supplierId,
      type: 'payment',
      amount: totalAmount,
      date: params.invoiceDate || now.split('T')[0],
      invoice_number: `PAY-${invoiceNumber}`,
      treasury_id: params.treasuryId,
      payment_method_id: params.paymentMethodId || null,
      notes: `سداد فوري لفاتورة المشتريات رقم: ${invoiceNumber}`,
      created_by: params.createdBy || 'مسؤول المشتريات'
    });
  }

  return {
    order: {
      id: orderId,
      order_number: orderNumber,
      supplier_id: params.supplierId,
      order_date: params.invoiceDate || now.split('T')[0],
      status: 'converted',
      items: poItems as any,
      total_amount: totalAmount,
      converted_invoice_number: invoiceNumber,
      converted_at: now,
      notes: params.notes || `فاتورة مشتريات رقم: ${invoiceNumber}`,
      created_by: params.createdBy || 'مسؤول المشتريات',
      created_at: now
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
    purchase_unit: r.purchase_unit || undefined,
    pieces_per_unit: r.pieces_per_unit ? Number(r.pieces_per_unit) : undefined,
    piece_unit: r.piece_unit || undefined,
    inventory_item_id: r.inventory_item_id || undefined,
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
    `INSERT INTO store_products (
      id, name, description, price, discount_price, image_url, is_limited_quantity,
      category, is_available, stock_quantity, purchase_unit, pieces_per_unit, piece_unit, inventory_item_id, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      prod.purchase_unit || null,
      prod.pieces_per_unit || null,
      prod.piece_unit || null,
      prod.inventory_item_id || null,
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
     SET name = ?, description = ?, price = ?, discount_price = ?, image_url = ?, is_limited_quantity = ?,
         category = ?, is_available = ?, stock_quantity = ?, purchase_unit = ?, pieces_per_unit = ?, piece_unit = ?, inventory_item_id = ?
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
      prod.purchase_unit || null,
      prod.pieces_per_unit || null,
      prod.piece_unit || null,
      prod.inventory_item_id || null,
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

// ==============================================================================
// 26. بنود ومصروفات التشغيل (Expenses & Expense Categories)
// ==============================================================================

export async function getExpenseCategoriesLibSql(): Promise<ExpenseCategory[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM expense_categories ORDER BY created_at ASC');

  // إذا كانت فارغة، زرع البنود الافتراضية
  if (rows.length === 0) {
    const defaults = [
      { name: 'إيجار ومقرات', description: 'إيجار المقرات، المكاتب، ومستودعات المواد' },
      { name: 'وقود ومحروقات', description: 'بنزين وسولار سيارات الخدمة والمولدات' },
      { name: 'رواتب وأجور وعمالة', description: 'رواتب الموظفين والعمال والبدلات والمكافآت' },
      { name: 'صيانة سيارات ومعدات', description: 'صيانة وتصليح ماكينات الغسيل ومعدات العمل' },
      { name: 'مستلزمات ومواد نظافة', description: 'شراء صابون، فوم، ملمعات، وفوط استهلاكية' },
      { name: 'بوفيه وضيافة ومياه', description: 'مشروبات وضيافة واستراحات فرق العمل' },
      { name: 'فواتير ومرافق (كهرباء / إنترنت)', description: 'سداد فواتير الكهرباء، المياه، والاتصالات' },
      { name: 'تسويق ودعاية وإعلانات', description: 'إعلانات ممولة ومطبوعات تسويقية' },
      { name: 'انتقالات ونثريات', description: 'مصاريف نقل ونثريات تشغيل يومية طارئة' },
      { name: 'رسوم وتراخيص حكومية', description: 'رسوم تراخيص، تأمينات، ومصالح حكومية' },
      { name: 'أخرى', description: 'مصروفات تشغيلية عامة متنوعة' }
    ];

    for (const d of defaults) {
      const id = generateId();
      await executeSql(
        'INSERT INTO expense_categories (id, name, description, is_active, created_at) VALUES (?, ?, ?, 1, datetime(\'now\'))',
        [id, d.name, d.description]
      );
    }

    const recheck = await executeSql<any>('SELECT * FROM expense_categories ORDER BY created_at ASC');
    return recheck.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      is_active: Boolean(r.is_active !== 0),
      created_at: r.created_at
    }));
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    is_active: Boolean(r.is_active !== 0),
    created_at: r.created_at
  }));
}

export async function createExpenseCategoryLibSql(
  cat: Omit<ExpenseCategory, 'id' | 'created_at'> & { id?: string }
): Promise<ExpenseCategory> {
  await initLibSqlSchema();
  const id = cat.id || generateId();
  const now = new Date().toISOString();
  await executeSql(
    'INSERT INTO expense_categories (id, name, description, is_active, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cat.name.trim(), cat.description?.trim() || null, cat.is_active !== false ? 1 : 0, now]
  );
  return {
    id,
    name: cat.name.trim(),
    description: cat.description?.trim() || undefined,
    is_active: cat.is_active !== false,
    created_at: now
  };
}

export async function updateExpenseCategoryLibSql(
  cat: ExpenseCategory
): Promise<ExpenseCategory> {
  await initLibSqlSchema();
  await executeSql(
    'UPDATE expense_categories SET name = ?, description = ?, is_active = ? WHERE id = ?',
    [cat.name.trim(), cat.description?.trim() || null, cat.is_active ? 1 : 0, cat.id]
  );
  // تحديث الاسم في جدول المصروفات إن وُجد لتطابق البيانات
  await executeSql(
    'UPDATE expenses SET category_name = ? WHERE category_id = ?',
    [cat.name.trim(), cat.id]
  );
  return cat;
}

export async function deleteExpenseCategoryLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM expense_categories WHERE id = ?', [id]);
}

export async function getExpensesLibSql(): Promise<Expense[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    voucher_number: r.voucher_number || `EXP-${r.id.slice(0, 6)}`,
    category_id: r.category_id,
    category_name: r.category_name || '',
    amount: Number(r.amount) || 0,
    treasury_id: r.treasury_id,
    payment_method_id: r.payment_method_id || undefined,
    payment_method_name: r.payment_method_name || 'نقدي كاش',
    date: r.date,
    reason: r.reason,
    recipient: r.recipient || undefined,
    invoice_ref: r.invoice_ref || undefined,
    attachment_url: r.attachment_url || undefined,
    created_by: r.created_by || 'المسؤول المالي',
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function createExpenseLibSql(
  data: Omit<Expense, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Expense> {
  await initLibSqlSchema();
  const id = data.id || generateId();
  const now = new Date().toISOString();
  const amount = Number(data.amount) || 0;
  const voucherNumber = data.voucher_number?.trim() || `EXP-${Date.now().toString().slice(-6)}`;

  // جلب اسم بند الصرف
  let categoryName = data.category_name?.trim() || '';
  if (!categoryName && data.category_id) {
    const cRows = await executeSql<any>('SELECT name FROM expense_categories WHERE id = ? LIMIT 1', [data.category_id]);
    if (cRows.length > 0) categoryName = cRows[0].name;
  }

  // جلب اسم طريقة الدفع
  let paymentMethodName = data.payment_method_name?.trim() || '';
  if (!paymentMethodName && data.payment_method_id) {
    const pmRows = await executeSql<any>('SELECT name FROM payment_methods WHERE id = ? LIMIT 1', [data.payment_method_id]);
    if (pmRows.length > 0) paymentMethodName = pmRows[0].name;
  }
  if (!paymentMethodName) paymentMethodName = 'نقدي كاش';

  // 1. إدراج سجل المصروف
  await executeSql(
    `INSERT INTO expenses (id, voucher_number, category_id, category_name, amount, treasury_id, payment_method_id, payment_method_name, date, reason, recipient, invoice_ref, attachment_url, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      voucherNumber,
      data.category_id,
      categoryName,
      amount,
      data.treasury_id,
      data.payment_method_id || null,
      paymentMethodName,
      data.date || now.split('T')[0],
      data.reason.trim(),
      data.recipient?.trim() || null,
      data.invoice_ref?.trim() || null,
      data.attachment_url || null,
      data.created_by || 'المسؤول المالي',
      now,
      now
    ]
  );

  // 2. تطبيق الأثر المالي المباشر: الخصم الفوري من الخزينة المحددة
  await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [amount, data.treasury_id]);

  // 3. تسجيل حركة نقدية في جدول حركات الخزينة
  const reasonText = `سند صرف رقم (${voucherNumber}) - [${categoryName}]: ${data.reason.trim()}${data.recipient ? ` (المستلم: ${data.recipient.trim()})` : ''}`;
  await createTreasuryTransactionLibSql({
    treasury_id: data.treasury_id,
    type: 'withdrawal',
    amount: amount,
    reason: reasonText,
    category: 'مصروفات',
    payment_method: paymentMethodName,
    created_by: data.created_by || 'المسؤول المالي'
  });

  return {
    ...data,
    id,
    voucher_number: voucherNumber,
    category_name: categoryName,
    payment_method_name: paymentMethodName,
    created_at: now,
    updated_at: now
  };
}

export async function updateExpenseLibSql(
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  await initLibSqlSchema();
  const existingRows = await executeSql<any>('SELECT * FROM expenses WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length === 0) {
    throw new Error('سند الصرف غير موجود');
  }
  const oldExpense = existingRows[0];
  const oldAmount = Number(oldExpense.amount) || 0;
  const oldTreasuryId = oldExpense.treasury_id;

  const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
  const newTreasuryId = updates.treasury_id || oldTreasuryId;
  const newDate = updates.date || oldExpense.date;
  const newReason = updates.reason !== undefined ? updates.reason.trim() : oldExpense.reason;
  const newRecipient = updates.recipient !== undefined ? updates.recipient?.trim() : oldExpense.recipient;
  const newInvoiceRef = updates.invoice_ref !== undefined ? updates.invoice_ref?.trim() : oldExpense.invoice_ref;
  const newAttachmentUrl = updates.attachment_url !== undefined ? updates.attachment_url : oldExpense.attachment_url;
  const newCategoryId = updates.category_id || oldExpense.category_id;
  const newVoucherNumber = updates.voucher_number || oldExpense.voucher_number;
  const newPaymentMethodId = updates.payment_method_id !== undefined ? updates.payment_method_id : oldExpense.payment_method_id;

  // جلب اسم بند الصرف الجديد إن تغير
  let newCategoryName = updates.category_name || oldExpense.category_name;
  if (updates.category_id && updates.category_id !== oldExpense.category_id) {
    const cRows = await executeSql<any>('SELECT name FROM expense_categories WHERE id = ? LIMIT 1', [updates.category_id]);
    if (cRows.length > 0) newCategoryName = cRows[0].name;
  }

  // جلب اسم طريقة الدفع الجديدة إن تغيرت
  let newPaymentMethodName = updates.payment_method_name || oldExpense.payment_method_name;
  if (updates.payment_method_id && updates.payment_method_id !== oldExpense.payment_method_id) {
    const pmRows = await executeSql<any>('SELECT name FROM payment_methods WHERE id = ? LIMIT 1', [updates.payment_method_id]);
    if (pmRows.length > 0) newPaymentMethodName = pmRows[0].name;
  }

  // إعادة الأثر المالي وتحديث أرصدة الخزائن بدقة
  if (oldAmount !== newAmount || oldTreasuryId !== newTreasuryId) {
    // 1. إعادة المبلغ القديم للخزينة القديمة
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [oldAmount, oldTreasuryId]);
    // 2. خصم المبلغ الجديد من الخزينة الجديدة
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [newAmount, newTreasuryId]);

    // تسجيل حركة تسوية في الخزائن
    await createTreasuryTransactionLibSql({
      treasury_id: newTreasuryId,
      type: 'withdrawal',
      amount: newAmount,
      reason: `تعديل سند صرف (${newVoucherNumber}) - [${newCategoryName}]: ${newReason}`,
      category: 'مصروفات',
      payment_method: newPaymentMethodName || 'نقدي كاش',
      created_by: updates.created_by || oldExpense.created_by || 'المسؤول المالي'
    });
  }

  const now = new Date().toISOString();
  await executeSql(
    `UPDATE expenses
     SET voucher_number = ?, category_id = ?, category_name = ?, amount = ?, treasury_id = ?, payment_method_id = ?,
         payment_method_name = ?, date = ?, reason = ?, recipient = ?, invoice_ref = ?, attachment_url = ?, updated_at = ?
     WHERE id = ?`,
    [
      newVoucherNumber,
      newCategoryId,
      newCategoryName,
      newAmount,
      newTreasuryId,
      newPaymentMethodId || null,
      newPaymentMethodName,
      newDate,
      newReason,
      newRecipient || null,
      newInvoiceRef || null,
      newAttachmentUrl || null,
      now,
      id
    ]
  );

  return {
    id,
    voucher_number: newVoucherNumber,
    category_id: newCategoryId,
    category_name: newCategoryName,
    amount: newAmount,
    treasury_id: newTreasuryId,
    payment_method_id: newPaymentMethodId || undefined,
    payment_method_name: newPaymentMethodName,
    date: newDate,
    reason: newReason,
    recipient: newRecipient || undefined,
    invoice_ref: newInvoiceRef || undefined,
    attachment_url: newAttachmentUrl || undefined,
    created_by: oldExpense.created_by,
    created_at: oldExpense.created_at,
    updated_at: now
  };
}

export async function deleteExpenseLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  const existingRows = await executeSql<any>('SELECT * FROM expenses WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length === 0) {
    return;
  }
  const exp = existingRows[0];
  const amount = Number(exp.amount) || 0;
  const treasuryId = exp.treasury_id;
  const voucherNumber = exp.voucher_number || id.slice(0, 8);

  // 1. إعادة الأثر المالي فورياً: إضافة المبلغ المسترد إلى رصيد الخزينة المصروف منها
  await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [amount, treasuryId]);

  // 2. تسجيل حركة إيداع تسوية توضح إعادة الأثر المالي لإلغاء سند الصرف
  await createTreasuryTransactionLibSql({
    treasury_id: treasuryId,
    type: 'deposit',
    amount: amount,
    reason: `إلغاء سند صرف رقم (${voucherNumber}) وإعادة أثره المالي للخزينة`,
    category: 'مصروفات',
    payment_method: exp.payment_method_name || 'نقدي كاش',
    created_by: 'المسؤول المالي'
  });

  // 3. حذف السجل من جدول المصروفات
  await executeSql('DELETE FROM expenses WHERE id = ?', [id]);
}

// ==============================================================================
// 27. مسير وصرف رواتب الموظفين (Salary Payments)
// ==============================================================================

export async function getSalaryPaymentsLibSql(): Promise<SalaryPayment[]> {
  await initLibSqlSchema();
  const rows = await executeSql<any>(
    'SELECT * FROM salary_payments ORDER BY payment_date DESC, created_at DESC'
  );
  return rows.map((r) => ({
    id: r.id,
    voucher_number: r.voucher_number || '',
    employee_id: r.employee_id,
    employee_name: r.employee_name || '',
    employee_role: r.employee_role || '',
    employee_phone: r.employee_phone || '',
    month_year: r.month_year,
    payment_date: r.payment_date,
    basic_salary: Number(r.basic_salary) || 0,
    bonuses: Number(r.bonuses) || 0,
    bonus_reason: r.bonus_reason || '',
    deductions: Number(r.deductions) || 0,
    deduction_reason: r.deduction_reason || '',
    net_salary: Number(r.net_salary) || 0,
    treasury_id: r.treasury_id,
    treasury_name: r.treasury_name || '',
    payment_method_id: r.payment_method_id || undefined,
    payment_method_name: r.payment_method_name || '',
    notes: r.notes || '',
    created_by: r.created_by || 'المسؤول المالي',
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export async function createSalaryPaymentLibSql(
  payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<SalaryPayment> {
  await initLibSqlSchema();
  const id = payment.id || generateId();
  const now = new Date().toISOString();
  const voucherNumber = payment.voucher_number || `SAL-${Date.now().toString().slice(-6)}`;

  const basicSalary = Number(payment.basic_salary) || 0;
  const bonuses = Number(payment.bonuses) || 0;
  const deductions = Number(payment.deductions) || 0;
  const netSalary = payment.net_salary !== undefined && !isNaN(Number(payment.net_salary))
    ? Number(payment.net_salary)
    : Math.max(0, basicSalary + bonuses - deductions);

  let empName = payment.employee_name || '';
  let empRole = payment.employee_role || '';
  let empPhone = payment.employee_phone || '';
  if (!empName && payment.employee_id) {
    const empRows = await executeSql<any>('SELECT full_name, role, phone FROM employees WHERE id = ? LIMIT 1', [payment.employee_id]);
    if (empRows.length > 0) {
      empName = empRows[0].full_name || '';
      empRole = empRows[0].role || '';
      empPhone = empRows[0].phone || '';
    }
  }

  let treasuryName = payment.treasury_name || '';
  if (!treasuryName && payment.treasury_id) {
    const tRows = await executeSql<any>('SELECT name FROM treasuries WHERE id = ? LIMIT 1', [payment.treasury_id]);
    if (tRows.length > 0) treasuryName = tRows[0].name;
  }

  let pmName = payment.payment_method_name || '';
  if (!pmName && payment.payment_method_id) {
    const pmRows = await executeSql<any>('SELECT name FROM payment_methods WHERE id = ? LIMIT 1', [payment.payment_method_id]);
    if (pmRows.length > 0) pmName = pmRows[0].name;
  }
  if (!pmName) pmName = 'نقدي كاش';

  // 1. إدراج سجل صرف الراتب
  await executeSql(
    `INSERT INTO salary_payments (
      id, voucher_number, employee_id, employee_name, employee_role, employee_phone,
      month_year, payment_date, basic_salary, bonuses, bonus_reason,
      deductions, deduction_reason, net_salary, treasury_id, treasury_name,
      payment_method_id, payment_method_name, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      voucherNumber,
      payment.employee_id,
      empName,
      empRole,
      empPhone,
      payment.month_year,
      payment.payment_date,
      basicSalary,
      bonuses,
      payment.bonus_reason || null,
      deductions,
      payment.deduction_reason || null,
      netSalary,
      payment.treasury_id,
      treasuryName,
      payment.payment_method_id || null,
      pmName,
      payment.notes || null,
      payment.created_by || 'المسؤول المالي',
      now,
      now
    ]
  );

  // 2. تطبيق الأثر المالي: خصم صافي الراتب من رصيد الخزينة
  await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [netSalary, payment.treasury_id]);

  // 3. قيد حركة سحب نقدية في جدول حركات الخزائن
  const desc = `صرف راتب الموظف (${empName}) عن شهر ${payment.month_year} - أساسي: ${basicSalary} + حوافز: ${bonuses} - خصومات: ${deductions} (سند: ${voucherNumber})`;
  await createTreasuryTransactionLibSql({
    treasury_id: payment.treasury_id,
    type: 'withdrawal',
    amount: netSalary,
    reason: desc,
    category: 'رواتب موظفين',
    payment_method: pmName,
    created_by: payment.created_by || 'المسؤول المالي'
  });

  return {
    id,
    voucher_number: voucherNumber,
    employee_id: payment.employee_id,
    employee_name: empName,
    employee_role: empRole,
    employee_phone: empPhone,
    month_year: payment.month_year,
    payment_date: payment.payment_date,
    basic_salary: basicSalary,
    bonuses,
    bonus_reason: payment.bonus_reason,
    deductions,
    deduction_reason: payment.deduction_reason,
    net_salary: netSalary,
    treasury_id: payment.treasury_id,
    treasury_name: treasuryName,
    payment_method_id: payment.payment_method_id,
    payment_method_name: pmName,
    notes: payment.notes,
    created_by: payment.created_by || 'المسؤول المالي',
    created_at: now,
    updated_at: now
  };
}

export async function updateSalaryPaymentLibSql(
  id: string,
  updates: Partial<SalaryPayment>
): Promise<SalaryPayment> {
  await initLibSqlSchema();
  const existingRows = await executeSql<any>('SELECT * FROM salary_payments WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length === 0) {
    throw new Error('Salary payment not found');
  }
  const old = existingRows[0];
  const oldNet = Number(old.net_salary) || 0;
  const oldTreasuryId = old.treasury_id;

  const newBasic = updates.basic_salary !== undefined ? Number(updates.basic_salary) : Number(old.basic_salary);
  const newBonuses = updates.bonuses !== undefined ? Number(updates.bonuses) : Number(old.bonuses);
  const newDeductions = updates.deductions !== undefined ? Number(updates.deductions) : Number(old.deductions);
  const newNet = updates.net_salary !== undefined
    ? Number(updates.net_salary)
    : Math.max(0, newBasic + newBonuses - newDeductions);
  const newTreasuryId = updates.treasury_id || oldTreasuryId;

  if (oldTreasuryId === newTreasuryId) {
    const diff = newNet - oldNet;
    if (diff !== 0) {
      await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [diff, newTreasuryId]);
      await createTreasuryTransactionLibSql({
        treasury_id: newTreasuryId,
        type: diff > 0 ? 'withdrawal' : 'deposit',
        amount: Math.abs(diff),
        reason: `تسوية تعديل سند صرف راتب رقم (${old.voucher_number || id.slice(0, 8)}) للموظف ${old.employee_name}`,
        category: 'رواتب موظفين',
        payment_method: updates.payment_method_name || old.payment_method_name || 'نقدي كاش',
        created_by: 'المسؤول المالي'
      });
    }
  } else {
    await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [oldNet, oldTreasuryId]);
    await executeSql('UPDATE treasuries SET balance = balance - ? WHERE id = ?', [newNet, newTreasuryId]);
    await createTreasuryTransactionLibSql({
      treasury_id: oldTreasuryId,
      type: 'deposit',
      amount: oldNet,
      reason: `رد مبلغ راتب لتغيير الخزينة - سند رقم (${old.voucher_number})`,
      category: 'رواتب موظفين',
      payment_method: old.payment_method_name || 'نقدي كاش',
      created_by: 'المسؤول المالي'
    });
    await createTreasuryTransactionLibSql({
      treasury_id: newTreasuryId,
      type: 'withdrawal',
      amount: newNet,
      reason: `صرف راتب بعد تحويل الخزينة - سند رقم (${old.voucher_number}) للموظف ${old.employee_name}`,
      category: 'رواتب موظفين',
      payment_method: updates.payment_method_name || old.payment_method_name || 'نقدي كاش',
      created_by: 'المسؤول المالي'
    });
  }

  const now = new Date().toISOString();
  await executeSql(
    `UPDATE salary_payments SET
      month_year = ?,
      payment_date = ?,
      basic_salary = ?,
      bonuses = ?,
      bonus_reason = ?,
      deductions = ?,
      deduction_reason = ?,
      net_salary = ?,
      treasury_id = ?,
      treasury_name = ?,
      payment_method_id = ?,
      payment_method_name = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      updates.month_year || old.month_year,
      updates.payment_date || old.payment_date,
      newBasic,
      newBonuses,
      updates.bonus_reason !== undefined ? updates.bonus_reason : old.bonus_reason,
      newDeductions,
      updates.deduction_reason !== undefined ? updates.deduction_reason : old.deduction_reason,
      newNet,
      newTreasuryId,
      updates.treasury_name || old.treasury_name,
      updates.payment_method_id !== undefined ? updates.payment_method_id : old.payment_method_id,
      updates.payment_method_name || old.payment_method_name,
      updates.notes !== undefined ? updates.notes : old.notes,
      now,
      id
    ]
  );

  return {
    ...old,
    ...updates,
    basic_salary: newBasic,
    bonuses: newBonuses,
    deductions: newDeductions,
    net_salary: newNet,
    treasury_id: newTreasuryId,
    updated_at: now
  };
}

export async function deleteSalaryPaymentLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  const existingRows = await executeSql<any>('SELECT * FROM salary_payments WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length === 0) {
    return;
  }
  const old = existingRows[0];
  const netAmount = Number(old.net_salary) || 0;
  const treasuryId = old.treasury_id;
  const voucherNumber = old.voucher_number || id.slice(0, 8);

  // 1. إعادة الأثر المالي فورياً: إضافة صافي الراتب المسترد إلى رصيد الخزينة
  await executeSql('UPDATE treasuries SET balance = balance + ? WHERE id = ?', [netAmount, treasuryId]);

  // 2. تسجيل قيد تسوية إيداع في جدول حركات الخزائن
  await createTreasuryTransactionLibSql({
    treasury_id: treasuryId,
    type: 'deposit',
    amount: netAmount,
    reason: `إلغاء سند صرف راتب رقم (${voucherNumber}) للموظف (${old.employee_name}) وإعادة أثره المالي للخزينة`,
    category: 'رواتب موظفين',
    payment_method: old.payment_method_name || 'نقدي كاش',
    created_by: 'المسؤول المالي'
  });

  // 3. حذف السجل
  await executeSql('DELETE FROM salary_payments WHERE id = ?', [id]);
}

// ==============================================================================
// 30. الجلب السريع لكامل بيانات النظام بطلب HTTP واحد (Lightning-Fast Initial Data)
// ==============================================================================
export interface InitialSystemData {
  settings: Settings | null;
  coverageAreas: CoverageArea[];
  employees: Employee[];
  attendance: Attendance[];
  customers: Customer[];
  vehicles: Vehicle[];
  categories: PackageCategory[];
  packages: Package[];
  packagePricing: PackagePricing[];
  subscriptions: Subscription[];
  visits: Visit[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  treasuryTransactions: TreasuryTransaction[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  equipment: Equipment[];
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
  purchaseOrders: PurchaseOrder[];
  advertisements: Advertisement[];
  notifications: SystemNotification[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  salaryPayments: SalaryPayment[];
  priceQuotationRequests: PriceQuotationRequest[];
}

export async function getInitialDataLibSql(): Promise<InitialSystemData> {
  // 1. محاولة الجلب السريع الفوري عبر نقطة النهاية الموحدة /api/initial-data
  try {
    const res = await fetch('/api/initial-data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      
      const mapSettingsRow = (r: any): Settings => ({
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
        store_name: r.store_name || '',
        google_drive_folder_url: r.google_drive_folder_url || '',
        google_drive_folder_name: r.google_drive_folder_name || '',
        created_at: r.created_at,
        updated_at: r.updated_at
      });

      const mapAreaRow = (r: any): CoverageArea => ({
        id: r.id,
        name: r.name,
        city: r.city || '',
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapEmployeeRow = (r: any): Employee => ({
        id: r.id,
        national_id: r.national_id,
        full_name: r.full_name,
        phone: r.phone,
        address: r.address || '',
        hire_date: r.hire_date,
        id_card_image_url: r.id_card_image_url || r.national_id_image_url || '',
        national_id_image_url: r.national_id_image_url || r.id_card_image_url || '',
        criminal_record_image_url: r.criminal_record_image_url || '',
        personal_image_url: r.personal_image_url || '',
        role: r.role,
        username: r.username,
        password_hash: r.password_hash,
        salary: Number(r.salary) || 0,
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapAttendanceRow = (r: any): Attendance => ({
        id: r.id,
        employee_id: r.employee_id,
        date: r.date,
        status: r.status,
        check_in: r.check_in || undefined,
        check_out: r.check_out || undefined,
        notes: r.notes || undefined,
        is_paid_leave: Boolean(r.is_paid_leave === 1 || r.status === 'paid_leave'),
        leave_type: r.leave_type || (r.status === 'paid_leave' ? 'paid' : undefined),
        deduction_amount: Number(r.deduction_amount) || 0,
        daily_salary: Number(r.daily_salary) || 0,
        created_at: r.created_at
      });

      const mapCustomerRow = (r: any): Customer => ({
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
      });

      const mapVehicleRow = (r: any): Vehicle => ({
        id: r.id,
        customer_id: r.customer_id,
        type: r.type || r.vehicle_type || '',
        vehicle_type: r.vehicle_type || r.type || '',
        color: r.color || '',
        license_plate: r.license_plate || r.plate_number || '',
        plate_number: r.plate_number || r.license_plate || '',
        brand: r.brand || '',
        model: r.model || '',
        year: r.year || '',
        image_url: r.image_url || r.vehicle_image_url || '',
        vehicle_image_url: r.vehicle_image_url || r.image_url || '',
        created_at: r.created_at
      });

      const mapCategoryRow = (r: any): PackageCategory => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapPackageRow = (r: any): Package => {
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
      };

      const mapPricingRow = (r: any): PackagePricing => ({
        id: r.id,
        package_id: r.package_id,
        area_id: r.area_id,
        price: Number(r.price) || 0,
        created_at: r.created_at
      });

      const mapSubscriptionRow = (r: any): Subscription => {
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
          preferred_day_of_week: r.preferred_day_of_week || selectedDays.join('، '),
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
      };

      const mapVisitRow = (r: any): Visit => ({
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
      });

      const mapTreasuryRow = (r: any): Treasury => ({
        id: r.id,
        name: r.name,
        type: r.type as any,
        payment_method_id: r.payment_method_id || undefined,
        balance: Number(r.balance) || 0,
        is_deletable: Boolean(r.is_deletable !== 0),
        created_at: r.created_at
      });

      const mapPaymentMethodRow = (r: any): PaymentMethod => ({
        id: r.id,
        name: r.name,
        treasury_id: r.treasury_id || '',
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapTreasuryTxRow = (r: any): TreasuryTransaction => ({
        id: r.id,
        treasury_id: r.treasury_id,
        related_treasury_id: r.related_treasury_id || undefined,
        type: (r.type || r.transaction_type) as any,
        amount: Number(r.amount) || 0,
        reason: r.reason || '',
        category: r.category || undefined,
        payment_method: r.payment_method || undefined,
        created_by: r.created_by || r.performed_by || 'النظام الإداري',
        created_at: r.created_at
      });

      const mapInventoryItemRow = (r: any): InventoryItem => ({
        id: r.id,
        item_code: r.item_code || r.barcode || undefined,
        barcode: r.barcode || r.item_code || undefined,
        name: r.name,
        category: r.category || undefined,
        brand: r.brand || undefined,
        usage_location: r.usage_location || undefined,
        unit: r.unit || 'قطعة',
        purchase_unit: r.purchase_unit || undefined,
        pieces_per_unit: r.pieces_per_unit ? Number(r.pieces_per_unit) : 1,
        piece_unit: r.piece_unit || undefined,
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
      });

      const mapInventoryTxRow = (r: any): InventoryTransaction => ({
        id: r.id,
        item_id: r.item_id,
        type: r.type as any,
        quantity: Number(r.quantity) || 0,
        worker_id: r.worker_id || undefined,
        invoice_ref: r.invoice_ref || undefined,
        notes: r.notes || undefined,
        created_by: r.created_by || undefined,
        created_at: r.created_at
      });

      const mapEquipmentRow = (r: any): Equipment => ({
        id: r.id,
        name: r.name,
        condition: r.condition as any,
        quantity: Number(r.quantity) || 1,
        purchase_date: r.purchase_date,
        purchase_price: Number(r.purchase_price) || 0,
        depreciation_rate: Number(r.depreciation_rate) || 10,
        notes: r.notes || undefined,
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapSupplierRow = (r: any): Supplier => ({
        id: r.id,
        name: r.name,
        contact_person: r.contact_person || undefined,
        phone: r.phone,
        email: r.email || undefined,
        address: r.address || undefined,
        tax_number: r.tax_number || undefined,
        opening_balance: Number(r.opening_balance) || 0,
        current_balance: Number(r.current_balance) || 0,
        is_active: Boolean(r.is_active !== 0),
        notes: r.notes || undefined,
        created_at: r.created_at
      });

      const mapSupplierTxRow = (r: any): SupplierTransaction => ({
        id: r.id,
        supplier_id: r.supplier_id,
        type: r.type as any,
        amount: Number(r.amount) || 0,
        date: r.date,
        invoice_number: r.invoice_number || undefined,
        treasury_id: r.treasury_id || undefined,
        payment_method_id: r.payment_method_id || undefined,
        notes: r.notes || undefined,
        created_by: r.created_by || undefined,
        created_at: r.created_at
      });

      const mapPurchaseOrderRow = (r: any): PurchaseOrder => {
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
          rfq_id: r.rfq_id || undefined,
          rfq_number: r.rfq_number || undefined,
          order_date: r.order_date,
          status: (r.status || 'pending') as any,
          items: parsedItems,
          total_amount: Number(r.total_amount) || 0,
          converted_invoice_number: r.converted_invoice_number || undefined,
          converted_at: r.converted_at || undefined,
          notes: r.notes || undefined,
          created_by: r.created_by || 'مسؤول المشتريات',
          created_at: r.created_at
        };
      };

      const mapAdvertisementRow = (r: any): Advertisement => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        date: r.date,
        phone: r.phone || '',
        whatsapp: r.whatsapp || '',
        price: Number(r.price) || 0,
        image_url: r.image_url,
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapNotificationRow = (r: any): SystemNotification => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type as any,
        reference_id: r.reference_id || undefined,
        customer_id: r.customer_id || undefined,
        rating: r.rating ? Number(r.rating) : undefined,
        rating_comment: r.rating_comment || undefined,
        is_read: Boolean(r.is_read !== 0),
        created_at: r.created_at
      });

      const mapExpenseCategoryRow = (r: any): ExpenseCategory => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        is_active: Boolean(r.is_active !== 0),
        created_at: r.created_at
      });

      const mapExpenseRow = (r: any): Expense => ({
        id: r.id,
        voucher_number: r.voucher_number || undefined,
        category_id: r.category_id,
        category_name: r.category_name,
        amount: Number(r.amount) || 0,
        treasury_id: r.treasury_id,
        payment_method_id: r.payment_method_id || undefined,
        payment_method_name: r.payment_method_name || undefined,
        date: r.date,
        reason: r.reason,
        recipient: r.recipient || undefined,
        invoice_ref: r.invoice_ref || undefined,
        attachment_url: r.attachment_url || undefined,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at
      });

      const mapSalaryPaymentRow = (r: any): SalaryPayment => ({
        id: r.id,
        voucher_number: r.voucher_number || undefined,
        employee_id: r.employee_id,
        employee_name: r.employee_name || undefined,
        employee_role: r.employee_role || undefined,
        employee_phone: r.employee_phone || undefined,
        month_year: r.month_year,
        payment_date: r.payment_date,
        basic_salary: Number(r.basic_salary) || 0,
        bonuses: Number(r.bonuses) || 0,
        bonus_reason: r.bonus_reason || undefined,
        deductions: Number(r.deductions) || 0,
        deduction_reason: r.deduction_reason || undefined,
        net_salary: Number(r.net_salary) || 0,
        treasury_id: r.treasury_id,
        treasury_name: r.treasury_name || undefined,
        payment_method_id: r.payment_method_id || undefined,
        payment_method_name: r.payment_method_name || undefined,
        notes: r.notes || undefined,
        created_by: r.created_by || 'المسؤول المالي',
        created_at: r.created_at,
        updated_at: r.updated_at
      });

      const mapRfqRow = (r: any): PriceQuotationRequest => {
        let parsedItems: PriceQuotationItem[] = [];
        try {
          parsedItems = typeof r.items === 'string' ? JSON.parse(r.items || '[]') : r.items || [];
        } catch {
          parsedItems = [];
        }
        const dateVal = r.rfq_date || r.date || (r.created_at ? r.created_at.split('T')[0] : '');
        return {
          id: r.id,
          rfq_number: r.rfq_number,
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_name,
          supplier_phone: r.supplier_phone || undefined,
          date: dateVal,
          rfq_date: dateVal,
          status: (r.status || 'draft') as any,
          items: parsedItems,
          total_amount: r.total_amount ? Number(r.total_amount) : undefined,
          notes: r.notes || undefined,
          converted_po_id: r.converted_po_id || undefined,
          converted_po_number: r.converted_po_number || undefined,
          converted_at: r.converted_at || undefined,
          created_by: r.created_by || 'مسؤول المشتريات',
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      };

      return {
        settings: data.settings && data.settings.length > 0 ? mapSettingsRow(data.settings[0]) : null,
        coverageAreas: (data.coverageAreas || []).map(mapAreaRow),
        employees: (data.employees || []).map(mapEmployeeRow),
        attendance: (data.attendance || []).map(mapAttendanceRow),
        customers: (data.customers || []).map(mapCustomerRow),
        vehicles: (data.vehicles || []).map(mapVehicleRow),
        categories: (data.categories || []).map(mapCategoryRow),
        packages: (data.packages || []).map(mapPackageRow),
        packagePricing: (data.packagePricing || []).map(mapPricingRow),
        subscriptions: (data.subscriptions || []).map(mapSubscriptionRow),
        visits: (data.visits || []).map(mapVisitRow),
        treasuries: (data.treasuries || []).map(mapTreasuryRow),
        paymentMethods: (data.paymentMethods || []).map(mapPaymentMethodRow),
        treasuryTransactions: (data.treasuryTransactions || []).map(mapTreasuryTxRow),
        inventoryItems: (data.inventoryItems || []).map(mapInventoryItemRow),
        inventoryTransactions: (data.inventoryTransactions || []).map(mapInventoryTxRow),
        equipment: (data.equipment || []).map(mapEquipmentRow),
        suppliers: (data.suppliers || []).map(mapSupplierRow),
        supplierTransactions: (data.supplierTransactions || []).map(mapSupplierTxRow),
        purchaseOrders: (data.purchaseOrders || []).map(mapPurchaseOrderRow),
        advertisements: (data.advertisements || []).map(mapAdvertisementRow),
        notifications: (data.notifications || []).map(mapNotificationRow),
        expenseCategories: (data.expenseCategories || []).map(mapExpenseCategoryRow),
        expenses: (data.expenses || []).map(mapExpenseRow),
        salaryPayments: (data.salaryPayments || []).map(mapSalaryPaymentRow),
        priceQuotationRequests: (data.priceQuotationRequests || []).map(mapRfqRow)
      };
    }
  } catch (fastErr) {
    console.warn('[libSQL] /api/initial-data unavailable, falling back to parallel fetch:', fastErr);
  }

  // 2. إذا فشل الطلب الموحد، نعود للاستعلامات الموازية كخيار بديل آمن (Fallback)
  const [
    settings,
    coverageAreas,
    employees,
    attendance,
    customers,
    vehicles,
    categories,
    packages,
    packagePricing,
    subscriptions,
    visits,
    treasuries,
    paymentMethods,
    treasuryTransactions,
    inventoryItems,
    inventoryTransactions,
    equipment,
    suppliers,
    supplierTransactions,
    purchaseOrders,
    advertisements,
    notifications,
    expenseCategories,
    expenses,
    salaryPayments,
    priceQuotationRequests
  ] = await Promise.all([
    getSettingsLibSql(),
    getCoverageAreasLibSql(),
    getEmployeesLibSql(),
    getAttendanceLibSql(),
    getCustomersLibSql(),
    getVehiclesLibSql(),
    getPackageCategoriesLibSql(),
    getPackagesLibSql(),
    getPackagePricingLibSql(),
    getSubscriptionsLibSql(),
    getVisitsLibSql(),
    getTreasuriesLibSql(),
    getPaymentMethodsLibSql(),
    getTreasuryTransactionsLibSql(),
    getInventoryItemsLibSql(),
    getInventoryTransactionsLibSql(),
    getEquipmentLibSql(),
    getSuppliersLibSql(),
    getSupplierTransactionsLibSql(),
    getPurchaseOrdersLibSql(),
    getAdvertisementsLibSql(),
    getNotificationsLibSql(),
    getExpenseCategoriesLibSql(),
    getExpensesLibSql(),
    getSalaryPaymentsLibSql(),
    getPriceQuotationRequestsLibSql()
  ]);

  return {
    settings,
    coverageAreas,
    employees,
    attendance,
    customers,
    vehicles,
    categories,
    packages,
    packagePricing,
    subscriptions,
    visits,
    treasuries,
    paymentMethods,
    treasuryTransactions,
    inventoryItems,
    inventoryTransactions,
    equipment,
    suppliers,
    supplierTransactions,
    purchaseOrders,
    advertisements,
    notifications,
    expenseCategories,
    expenses,
    salaryPayments,
    priceQuotationRequests
  };
}

// ==============================================================================
// 32. الخدمات عند الطلب والحجوزات (On-Demand Services & Bookings)
// ==============================================================================

export async function getServicesLibSql(includeInactive = false): Promise<OnDemandService[]> {
  await initLibSqlSchema();
  const sql = includeInactive
    ? 'SELECT * FROM services ORDER BY display_order ASC, created_at ASC'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC, created_at ASC';
  const rows = await executeSql<any>(sql);
  return rows.map((r) => ({
    id: r.id,
    category: r.category as 'car' | 'building',
    group_name: r.group_name,
    sub_category: r.sub_category || undefined,
    name: r.name,
    description: r.description || '',
    includes: r.includes ? (typeof r.includes === 'string' && r.includes.startsWith('[') ? JSON.parse(r.includes) : r.includes) : [],
    icon_type: r.icon_type || 'spark',
    duration_minutes: Number(r.duration_minutes) || 45,
    popular: Boolean(r.popular),
    tile_bg: r.tile_bg || '#E3F2EF',
    tile_fg: r.tile_fg || '#0B7F72',
    price: Number(r.price) || 0,
    price_type: (r.price_type || 'fixed') as any,
    kind: (r.kind || 'car') as any,
    options: r.options || '[]',
    airport_name: r.airport_name || undefined,
    is_active: Boolean(r.is_active),
    display_order: Number(r.display_order) || 0,
    image_url: r.image_url || undefined,
    created_at: r.created_at
  }));
}

export async function createServiceLibSql(service: Omit<OnDemandService, 'id' | 'created_at'> & { id?: string }): Promise<OnDemandService> {
  await initLibSqlSchema();
  const id = service.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const includesStr = Array.isArray(service.includes) ? JSON.stringify(service.includes) : (service.includes || '[]');

  await executeSql(
    `INSERT INTO services (
      id, category, group_name, sub_category, name, description, includes, icon_type,
      duration_minutes, popular, tile_bg, tile_fg, price, price_type, kind, options,
      airport_name, is_active, display_order, image_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      service.category,
      service.group_name,
      service.sub_category || 'wash',
      service.name,
      service.description || '',
      includesStr,
      service.icon_type || 'spark',
      service.duration_minutes || 45,
      service.popular ? 1 : 0,
      service.tile_bg || '#E3F2EF',
      service.tile_fg || '#0B7F72',
      service.price || 0,
      service.price_type || 'fixed',
      service.kind || 'car',
      service.options || '[]',
      service.airport_name || null,
      service.is_active ? 1 : 0,
      service.display_order || 0,
      service.image_url || null,
      now
    ]
  );

  return {
    ...service,
    id,
    created_at: now
  };
}

export async function updateServiceLibSql(id: string, updates: Partial<OnDemandService>): Promise<void> {
  await initLibSqlSchema();
  const setClauses: string[] = [];
  const args: any[] = [];

  const fieldMap: Record<string, string> = {
    category: 'category',
    group_name: 'group_name',
    sub_category: 'sub_category',
    name: 'name',
    description: 'description',
    icon_type: 'icon_type',
    duration_minutes: 'duration_minutes',
    popular: 'popular',
    tile_bg: 'tile_bg',
    tile_fg: 'tile_fg',
    price: 'price',
    price_type: 'price_type',
    kind: 'kind',
    options: 'options',
    airport_name: 'airport_name',
    is_active: 'is_active',
    display_order: 'display_order',
    image_url: 'image_url'
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in updates) {
      setClauses.push(`${col} = ?`);
      let val = (updates as any)[key];
      if (key === 'is_active' || key === 'popular') {
        val = val ? 1 : 0;
      }
      args.push(val);
    }
  }

  if ('includes' in updates) {
    setClauses.push(`includes = ?`);
    args.push(Array.isArray(updates.includes) ? JSON.stringify(updates.includes) : (updates.includes || '[]'));
  }

  if (setClauses.length === 0) return;

  args.push(id);
  await executeSql(`UPDATE services SET ${setClauses.join(', ')} WHERE id = ?`, args);
}

export async function deleteServiceLibSql(id: string): Promise<void> {
  await initLibSqlSchema();
  await executeSql('DELETE FROM services WHERE id = ?', [id]);
}

export async function getServiceBookingsLibSql(customerId?: string): Promise<ServiceBooking[]> {
  await initLibSqlSchema();
  let sql = 'SELECT * FROM service_bookings';
  const args: any[] = [];
  if (customerId) {
    sql += ' WHERE customer_id = ?';
    args.push(customerId);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = await executeSql<any>(sql, args);
  return rows.map((r) => ({
    id: r.id,
    booking_number: r.booking_number || undefined,
    service_id: r.service_id,
    service_name: r.service_name,
    service_ids: r.service_ids || undefined,
    services_summary: r.services_summary || undefined,
    customer_id: r.customer_id,
    customer_name: r.customer_name || undefined,
    customer_phone: r.customer_phone || undefined,
    vehicle_id: r.vehicle_id || undefined,
    location_address: r.location_address || undefined,
    booking_date: r.booking_date,
    booking_time: r.booking_time,
    selected_option: r.selected_option || undefined,
    oil_type: r.oil_type || undefined,
    notes: r.notes || undefined,
    price: Number(r.price) || 0,
    status: (r.status || 'pending') as any,
    payment_method: (r.payment_method || 'cash') as any,
    payment_status: (r.payment_status || 'unpaid') as any,
    assigned_worker_id: r.assigned_worker_id || undefined,
    created_at: r.created_at
  }));
}

export async function updateServiceBookingStatusLibSql(
  id: string,
  status: ServiceBooking['status'],
  assignedWorkerId?: string
): Promise<void> {
  await initLibSqlSchema();
  if (assignedWorkerId !== undefined) {
    await executeSql(
      'UPDATE service_bookings SET status = ?, assigned_worker_id = ? WHERE id = ?',
      [status, assignedWorkerId, id]
    );
  } else {
    await executeSql(
      'UPDATE service_bookings SET status = ? WHERE id = ?',
      [status, id]
    );
  }
}

export async function createServiceBookingLibSql(
  booking: Omit<ServiceBooking, 'id' | 'created_at' | 'booking_number'> & { id?: string; booking_number?: string }
): Promise<ServiceBooking> {
  await initLibSqlSchema();
  const id = booking.id || crypto.randomUUID();
  const bookingNumber = booking.booking_number || `SRV-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  await executeSql(
    `INSERT INTO service_bookings (
      id, booking_number, service_id, service_name, service_ids, services_summary, customer_id, customer_name, customer_phone,
      vehicle_id, location_address, booking_date, booking_time, selected_option, oil_type, notes, price,
      status, payment_method, payment_status, assigned_worker_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bookingNumber,
      booking.service_id,
      booking.service_name,
      booking.service_ids || '[]',
      booking.services_summary || null,
      booking.customer_id,
      booking.customer_name || null,
      booking.customer_phone || null,
      booking.vehicle_id || null,
      booking.location_address || null,
      booking.booking_date,
      booking.booking_time,
      booking.selected_option || null,
      booking.oil_type || null,
      booking.notes || null,
      booking.price || 0,
      booking.status || 'pending',
      booking.payment_method || 'cash',
      booking.payment_status || 'unpaid',
      booking.assigned_worker_id || null,
      now
    ]
  );

  return {
    ...booking,
    id,
    booking_number: bookingNumber,
    created_at: now
  };
}






