import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  PackageTier,
  PackagePricing,
  Subscription,
  Visit,
  Treasury,
  PaymentMethod,
  TreasuryTransaction,
  TreasuryTransactionType,
  InventoryItem,
  InventoryTransaction,
  Equipment,
  SubscriptionStatus,
  VisitStatus,
  AuthUser,
  UserRoleType,
  PostponementReason
} from '../types/database';

// تحويل أسماء الأيام بالعربية لرقم اليوم
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

// مولد المعرفات الفريدة عند العمل في الذاكرة
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ==============================================================================
// حالة النظام التشغيلية الأساسية - خالية تماماً من أي بيانات تجريبية أو وهمية
// جميع البيانات تأتي وتُحفظ حصرياً في قاعدة بيانات Supabase كمصدر وحيد للحقيقة
// ==============================================================================

let memorySettings: Settings = {
  id: '',
  company_name: '',
  logo_url: '',
  country: '',
  currency_symbol: '',
  currency_code: '',
  dial_code: ''
};

let memoryCoverageAreas: CoverageArea[] = [];
let memoryTreasuries: Treasury[] = [];
let memoryPaymentMethods: PaymentMethod[] = [];
let memoryCategories: PackageCategory[] = [];
let memoryPackages: Package[] = [];
let memoryPackagePricing: PackagePricing[] = [];
let memoryEmployees: Employee[] = [];
let memoryEmployeePermissions: EmployeePermission[] = [];
let memoryAttendance: Attendance[] = [];
let memoryCustomers: Customer[] = [];
let memoryVehicles: Vehicle[] = [];
let memorySubscriptions: Subscription[] = [];
let memoryVisits: Visit[] = [];
let memoryTreasuryTransactions: TreasuryTransaction[] = [];
let memoryInventoryItems: InventoryItem[] = [];
let memoryInventoryTransactions: InventoryTransaction[] = [];
let memoryEquipment: Equipment[] = [];

// ==============================================================================
// 1. إدارة الإعدادات العامة (Settings API)
// ==============================================================================

export const getSettings = async (): Promise<Settings> => {
  if (supabase) {
    try {
      // 1. محاولة جلب السجل الأول من جدول system_settings
      const { data, error } = await supabase.from('system_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        // دمج الحقول الموجودة في قاعدة البيانات مع دعم كافة التسميات المحتملة
        const liveSettings: Settings = {
          id: row.id || memorySettings.id,
          company_name: row.company_name || row.company || row.name || row.title || row.system_name || memorySettings.company_name,
          logo_url: row.logo_url || row.logo || memorySettings.logo_url,
          country: row.country || memorySettings.country,
          currency_symbol: row.currency_symbol || row.currency || memorySettings.currency_symbol,
          currency_code: row.currency_code || memorySettings.currency_code,
          dial_code: row.dial_code || memorySettings.dial_code,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        memorySettings = liveSettings;
        return liveSettings;
      }

      // 2. محاولة احتياطية من جدول settings في حال وجوده
      const { data: fbData } = await supabase.from('settings').select('*').limit(1);
      if (fbData && fbData.length > 0) {
        const row = fbData[0];
        const liveSettings: Settings = {
          id: row.id || memorySettings.id,
          company_name: row.company_name || row.name || memorySettings.company_name,
          logo_url: row.logo_url || memorySettings.logo_url,
          country: row.country || memorySettings.country,
          currency_symbol: row.currency_symbol || memorySettings.currency_symbol,
          currency_code: row.currency_code || memorySettings.currency_code,
          dial_code: row.dial_code || memorySettings.dial_code
        };
        memorySettings = liveSettings;
        return liveSettings;
      }
    } catch (e) {
      console.error('Error fetching settings from Supabase:', e);
    }
  }
  return memorySettings;
};

export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  memorySettings = { ...memorySettings, ...settings };

  if (supabase) {
    try {
      // تحضير الحقول المتوافقة فقط لتجنب أخطاء الأعمدة غير الموجودة
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (settings.country !== undefined) payload.country = settings.country;
      if (settings.currency_symbol !== undefined) payload.currency_symbol = settings.currency_symbol;
      if (settings.logo_url !== undefined) payload.logo_url = settings.logo_url;
      if (settings.company_name !== undefined) {
        payload.company_name = settings.company_name;
      }

      // فحص هل يوجد سجل موجود في system_settings
      const { data: existingRows } = await supabase.from('system_settings').select('id').limit(1);
      if (existingRows && existingRows.length > 0) {
        const existingId = existingRows[0].id;
        const { data, error } = await supabase
          .from('system_settings')
          .update(payload)
          .eq('id', existingId)
          .select();
        
        // إذا فشل التحديث بسبب حقل company_name مثلاً، نعيد المحاولة بالأعمدة الأساسية المؤكدة
        if (error && error.message.includes('column')) {
          delete payload.company_name;
          await supabase.from('system_settings').update(payload).eq('id', existingId);
        }
      } else {
        // محاولة إنشاء السجل الأول
        const { error: insertErr } = await supabase.from('system_settings').insert([payload]);
        if (insertErr && insertErr.message.includes('column')) {
          delete payload.company_name;
          await supabase.from('system_settings').insert([payload]);
        }
      }
    } catch (e) {
      console.error('Error saving settings to Supabase:', e);
    }
  }

  return memorySettings;
};

// ==============================================================================
// 2. مناطق التغطية (Coverage Areas API)
// ==============================================================================

export const getCoverageAreas = async (): Promise<CoverageArea[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('coverage_areas').select('*').order('created_at', { ascending: true });
    if (data && !error) {
      memoryCoverageAreas = data.map((a: any) => ({
        id: a.id,
        name: a.name || '',
        city: a.city || '',
        is_active: a.is_active !== false,
        created_at: a.created_at
      }));
      return memoryCoverageAreas;
    }
  }
  return memoryCoverageAreas;
};

export const createCoverageArea = async (area: Omit<CoverageArea, 'id' | 'created_at'>): Promise<CoverageArea> => {
  const cleanName = area.name.trim();
  if (supabase) {
    // إرسال الحقول المتطابقة مع هيكل جدول coverage_areas في Supabase لتفادي خطأ 400 Bad Request
    const dbPayload = {
      name: cleanName
    };
    const { data, error } = await supabase.from('coverage_areas').insert(dbPayload).select().single();
    if (error) {
      console.error('Error creating coverage area in Supabase:', error);
      throw new Error(error.message || 'فشل حفظ المنطقة في قاعدة البيانات');
    }
    if (data) {
      const created: CoverageArea = {
        id: data.id,
        name: data.name,
        city: area.city || '',
        is_active: true,
        created_at: data.created_at
      };
      memoryCoverageAreas.push(created);
      return created;
    }
  }
  const newArea: CoverageArea = { id: generateId(), name: cleanName, city: area.city || '', is_active: true, created_at: new Date().toISOString() };
  memoryCoverageAreas.push(newArea);
  return newArea;
};

export const updateCoverageArea = async (id: string, updates: Partial<CoverageArea>): Promise<CoverageArea> => {
  if (supabase) {
    const dbPayload: Record<string, any> = {};
    if (updates.name !== undefined) dbPayload.name = updates.name.trim();
    if (Object.keys(dbPayload).length > 0) {
      const { data, error } = await supabase.from('coverage_areas').update(dbPayload).eq('id', id).select().single();
      if (error) {
        console.error('Error updating coverage area in Supabase:', error);
        throw new Error(error.message || 'فشل تحديث المنطقة في قاعدة البيانات');
      }
      if (data) {
        const updated: CoverageArea = {
          id: data.id,
          name: data.name,
          city: updates.city || '',
          is_active: updates.is_active ?? true,
          created_at: data.created_at
        };
        memoryCoverageAreas = memoryCoverageAreas.map(a => a.id === id ? updated : a);
        return updated;
      }
    }
  }
  memoryCoverageAreas = memoryCoverageAreas.map(a => a.id === id ? { ...a, ...updates } : a);
  return memoryCoverageAreas.find(a => a.id === id)!;
};

export const deleteCoverageArea = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('coverage_areas').delete().eq('id', id);
    if (error) {
      console.error('Error deleting coverage area from Supabase:', error);
      throw new Error(error.message || 'فشل حذف المنطقة من قاعدة البيانات');
    }
  }
  memoryCoverageAreas = memoryCoverageAreas.filter(a => a.id !== id);
  return true;
};

// ==============================================================================
// 3. إدارة الموظفين والصلاحيات والحضور (Employees & RBAC & Attendance API)
// ==============================================================================

export const getEmployees = async (): Promise<Employee[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      return data.map((e: any) => ({
        id: e.id,
        national_id: e.national_id || '',
        full_name: e.full_name || '',
        phone: e.phone || e.mobile || '',
        address: e.address || '',
        hire_date: e.hire_date || '',
        national_id_image_url: e.id_card_image_url || e.national_id_image_url || '',
        id_card_image_url: e.id_card_image_url || e.national_id_image_url || '',
        role: e.role || 'worker',
        username: e.username || '',
        password_hash: e.password_hash || '',
        is_active: e.status === 'active' || e.is_active !== false,
        created_at: e.created_at
      }));
    }
  }
  return memoryEmployees;
};

export const createEmployee = async (employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> => {
  const imageUrl = employee.id_card_image_url || employee.national_id_image_url || '';

  if (supabase) {
    const dbPayload: Record<string, any> = {
      national_id: employee.national_id,
      full_name: employee.full_name,
      address: employee.address,
      hire_date: employee.hire_date,
      role: employee.role,
      username: employee.username,
      password_hash: employee.password_hash,
      status: employee.is_active ? 'active' : 'inactive',
      id_card_image_url: imageUrl || null
    };

    const { data, error } = await supabase.from('employees').insert(dbPayload).select().single();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return {
        id: data.id,
        national_id: data.national_id,
        full_name: data.full_name,
        phone: employee.phone,
        address: data.address,
        hire_date: data.hire_date,
        national_id_image_url: data.id_card_image_url || imageUrl,
        id_card_image_url: data.id_card_image_url || imageUrl,
        role: data.role,
        username: data.username,
        password_hash: data.password_hash,
        is_active: data.status === 'active',
        created_at: data.created_at
      };
    }
  }

  const newEmployee: Employee = {
    id: generateId(),
    ...employee,
    national_id_image_url: imageUrl,
    id_card_image_url: imageUrl,
    created_at: new Date().toISOString()
  };
  memoryEmployees.push(newEmployee);
  return newEmployee;
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee> => {
  if (supabase) {
    const dbUpdates: Record<string, any> = {};
    if (updates.national_id !== undefined) dbUpdates.national_id = updates.national_id;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.hire_date !== undefined) dbUpdates.hire_date = updates.hire_date;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password_hash !== undefined) dbUpdates.password_hash = updates.password_hash;
    if (updates.is_active !== undefined) dbUpdates.status = updates.is_active ? 'active' : 'inactive';
    if (updates.id_card_image_url !== undefined || updates.national_id_image_url !== undefined) {
      dbUpdates.id_card_image_url = updates.id_card_image_url || updates.national_id_image_url || null;
    }

    const { data, error } = await supabase.from('employees').update(dbUpdates).eq('id', id).select().single();
    if (data && !error) {
      return {
        id: data.id,
        national_id: data.national_id,
        full_name: data.full_name,
        phone: updates.phone || '',
        address: data.address,
        hire_date: data.hire_date,
        national_id_image_url: data.id_card_image_url,
        id_card_image_url: data.id_card_image_url,
        role: data.role,
        username: data.username,
        password_hash: data.password_hash,
        is_active: data.status === 'active',
        created_at: data.created_at
      };
    }
  }
  memoryEmployees = memoryEmployees.map(e => e.id === id ? { ...e, ...updates } : e);
  return memoryEmployees.find(e => e.id === id)!;
};

export const resetEmployeePassword = async (id: string, newPasswordPlain: string): Promise<void> => {
  const password_hash = btoa(newPasswordPlain);
  if (supabase) {
    const { error } = await supabase.from('employees').update({ password_hash }).eq('id', id);
    if (error) {
      console.error('Error resetting employee password in Supabase:', error);
      throw new Error(error.message || 'فشل تحديث كلمة المرور في قاعدة البيانات');
    }
  }
  memoryEmployees = memoryEmployees.map(e => e.id === id ? { ...e, password_hash } : e);
};

export const deleteEmployee = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) return true;
  }
  memoryEmployees = memoryEmployees.filter(e => e.id !== id);
  return true;
};

export const getEmployeePermissions = async (employeeId: string): Promise<EmployeePermission[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('employee_permissions').select('*').eq('employee_id', employeeId);
    if (data && !error) return data;
  }
  return memoryEmployeePermissions.filter(p => p.employee_id === employeeId);
};

export const saveEmployeePermissions = async (employeeId: string, permissions: Omit<EmployeePermission, 'id' | 'employee_id'>[]): Promise<void> => {
  if (supabase) {
    await supabase.from('employee_permissions').delete().eq('employee_id', employeeId);
    const inserts = permissions.map(p => ({ ...p, employee_id: employeeId }));
    await supabase.from('employee_permissions').insert(inserts);
    return;
  }
  memoryEmployeePermissions = memoryEmployeePermissions.filter(p => p.employee_id !== employeeId);
  for (const p of permissions) {
    memoryEmployeePermissions.push({ id: generateId(), employee_id: employeeId, ...p });
  }
};

let attendanceTableExists: boolean | null = null;

export const getAttendance = async (date: string): Promise<Attendance[]> => {
  if (supabase && attendanceTableExists !== false) {
    try {
      const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
      if (!error && data) {
        attendanceTableExists = true;
        return data;
      }
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        // الجدول غير منشأ في سوبابيز حالياً، تجنب تكرار الطلب الفاشل
        attendanceTableExists = false;
      }
    } catch {
      attendanceTableExists = false;
    }
  }
  return memoryAttendance.filter(a => a.date === date);
};

export const markAttendance = async (attendance: Omit<Attendance, 'id' | 'created_at'>): Promise<Attendance> => {
  if (supabase && attendanceTableExists !== false) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendance, { onConflict: 'employee_id,date' })
        .select()
        .single();
      if (!error && data) {
        attendanceTableExists = true;
        return data;
      }
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        attendanceTableExists = false;
      }
    } catch {
      attendanceTableExists = false;
    }
  }
  const existingIdx = memoryAttendance.findIndex(a => a.employee_id === attendance.employee_id && a.date === attendance.date);
  if (existingIdx >= 0) {
    memoryAttendance[existingIdx] = { ...memoryAttendance[existingIdx], ...attendance };
    return memoryAttendance[existingIdx];
  } else {
    const newAtt: Attendance = { id: generateId(), ...attendance, created_at: new Date().toISOString() };
    memoryAttendance.push(newAtt);
    return newAtt;
  }
};

// ==============================================================================
// 3.5 تسجيل الدخول والتحقق من اسم المستخدم
// ==============================================================================

/**
 * فحص فرادة اسم المستخدم في جدول الموظفين وجدول العملاء
 * يعيد true إذا كان اسم المستخدم متاحاً وغير مكرر، أو false إذا كان مأخوذاً
 */
export const checkUsernameAvailability = async (username: string, excludeId?: string): Promise<boolean> => {
  const clean = username.trim();
  if (!clean) return false;

  if (supabase) {
    try {
      // 1. فحص جدول الموظفين
      let empQuery = supabase.from('employees').select('id').ilike('username', clean);
      if (excludeId) empQuery = empQuery.neq('id', excludeId);
      const { data: empData } = await empQuery;
      if (empData && empData.length > 0) return false;

      // 2. فحص جدول العملاء
      let custQuery = supabase.from('customers').select('id').ilike('username', clean);
      if (excludeId) custQuery = custQuery.neq('id', excludeId);
      const { data: custData } = await custQuery;
      if (custData && custData.length > 0) return false;

      return true;
    } catch {
      // In case of network/db error fallback to memory
    }
  }

  const cleanLower = clean.toLowerCase();
  const empConflict = memoryEmployees.some(
    (e) => e.id !== excludeId && e.username?.toLowerCase() === cleanLower
  );
  const custConflict = memoryCustomers.some(
    (c) => c.id !== excludeId && (c.username?.toLowerCase() === cleanLower || c.phone === clean)
  );
  return !empConflict && !custConflict;
};

/**
 * تسجيل الدخول الموحد والتعرف التلقائي على الصلاحيات ونوع المستخدم عبر اسم المستخدم
 */
export const loginUser = async (usernameInput: string, passwordPlain: string): Promise<AuthUser> => {
  const cleanUser = usernameInput.trim();
  if (!cleanUser || !passwordPlain) {
    throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
  }

  const base64Pass = btoa(passwordPlain);

  if (supabase) {
    // 1. البحث في جدول الموظفين (Employees)
    const { data: empData, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (empData && !empErr) {
      const storedPass = empData.password_hash || '';
      const isMatch = storedPass === base64Pass || storedPass === passwordPlain;
      if (!isMatch) {
        throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
      }

      if (empData.status === 'inactive' || empData.is_active === false) {
        throw new Error('عفواً، هذا الحساب معطل أو موقوف حالياً من قبل الإدارة.');
      }

      // جلب الصلاحيات الدقيقة للموظف
      const permsMap: Record<string, boolean> = {};
      try {
        const { data: pData } = await supabase
          .from('employee_permissions')
          .select('*')
          .eq('employee_id', empData.id);
        if (pData) {
          pData.forEach((p: any) => {
            if (p.can_read) permsMap[`${p.page_key}_read`] = true;
            if (p.can_create) permsMap[`${p.page_key}_create`] = true;
            if (p.can_update) permsMap[`${p.page_key}_update`] = true;
            if (p.can_delete) permsMap[`${p.page_key}_delete`] = true;
            if (p.can_approve) permsMap[`${p.page_key}_approve`] = true;
          });
        }
      } catch {
        // ignore
      }

      const role: UserRoleType = (empData.role as UserRoleType) || 'worker';
      return {
        id: empData.id,
        username: empData.username,
        full_name: empData.full_name || 'موظف',
        role,
        phone: empData.phone || '',
        employee_id: empData.id,
        employee_data: {
          id: empData.id,
          national_id: empData.national_id || '',
          full_name: empData.full_name || '',
          phone: empData.phone || empData.mobile || '',
          address: empData.address || '',
          hire_date: empData.hire_date || '',
          role: empData.role || 'worker',
          username: empData.username,
          password_hash: empData.password_hash,
          is_active: empData.status === 'active' || empData.is_active !== false,
          created_at: empData.created_at
        },
        permissions: permsMap
      };
    }

    // 2. البحث في جدول العملاء (Customers) إما عبر اسم المستخدم أو رقم الموبايل
    let { data: custData, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (!custData || custErr) {
      const { data: custByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('mobile', cleanUser)
        .maybeSingle();
      custData = custByPhone;
    }

    if (custData) {
      const storedPass = custData.password_hash || '';
      const isMatch =
        storedPass === base64Pass ||
        storedPass === passwordPlain ||
        (!storedPass && passwordPlain === '123456');

      if (!isMatch) {
        throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
      }

      const customerObj: Customer = {
        id: custData.id,
        full_name: custData.name || custData.full_name || '',
        name: custData.name || custData.full_name || '',
        phone: custData.mobile || custData.phone || '',
        mobile: custData.mobile || custData.phone || '',
        area_id: custData.area_id || '',
        building_number: custData.building_number || '',
        block: custData.block || 'A',
        block_number: custData.block || 'A',
        detailed_address: custData.detailed_address || '',
        location_url: custData.location_url || '',
        username: custData.username,
        password_hash: custData.password_hash,
        created_at: custData.created_at
      };

      return {
        id: custData.id,
        username: custData.username || custData.mobile || 'عميل',
        full_name: customerObj.full_name,
        role: 'customer',
        phone: customerObj.phone,
        customer_id: custData.id,
        customer_data: customerObj
      };
    }
  } else {
    // Memory fallback
    const cleanLower = cleanUser.toLowerCase();
    const emp = memoryEmployees.find((e) => e.username?.toLowerCase() === cleanLower);
    if (emp) {
      const isMatch = emp.password_hash === base64Pass || emp.password_hash === passwordPlain;
      if (!isMatch) throw new Error('كلمة المرور غير صحيحة');
      return {
        id: emp.id,
        username: emp.username,
        full_name: emp.full_name,
        role: emp.role || 'worker',
        phone: emp.phone,
        employee_id: emp.id,
        employee_data: emp
      };
    }

    const cust = memoryCustomers.find(
      (c) => c.username?.toLowerCase() === cleanLower || c.phone === cleanUser
    );
    if (cust) {
      const isMatch =
        cust.password_hash === base64Pass ||
        cust.password_hash === passwordPlain ||
        passwordPlain === '123456';
      if (!isMatch) throw new Error('كلمة المرور غير صحيحة');
      return {
        id: cust.id,
        username: cust.username || cust.phone,
        full_name: cust.full_name,
        role: 'customer',
        phone: cust.phone,
        customer_id: cust.id,
        customer_data: cust
      };
    }
  }

  throw new Error('اسم المستخدم المدخل غير مسجل في النظام. يرجى التأكد من كتابته بشكل صحيح أو إنشاء حساب جديد.');
};

// ==============================================================================
// 4. إدارة العملاء والمركبات (Customers & Vehicles API)
// ==============================================================================

export const getCustomers = async (): Promise<Customer[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      return data.map((c: any) => ({
        id: c.id,
        full_name: c.name || c.full_name || '',
        name: c.name || c.full_name || '',
        phone: c.mobile || c.phone || '',
        mobile: c.mobile || c.phone || '',
        area_id: c.area_id,
        building_number: c.building_number || '',
        block: c.block || c.block_number || '',
        block_number: c.block || c.block_number || '',
        detailed_address: c.detailed_address || '',
        location_url: c.location_url || c.location || '',
        username: c.username || '',
        password_hash: c.password_hash || '',
        created_at: c.created_at
      }));
    }
  }
  return memoryCustomers;
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
  const phone = (customer.phone || customer.mobile || '').trim();
  const name = (customer.full_name || customer.name || '').trim();
  const block = (customer.block || customer.block_number || 'A').trim();
  const detailed_address = (customer.detailed_address || '').trim();
  const location_url = (customer.location_url || '').trim();

  const desiredUsername = (customer.username && customer.username.trim()) || phone;

  // التحقق من أن رقم الموبايل فريد وغير مكرر
  const existingByPhone = memoryCustomers.find(c => c.phone.trim() === phone);
  if (existingByPhone) {
    throw new Error(`رقم الهاتف (${phone}) مسجل بالفعل لعميل آخر! يجب أن يكون رقم الموبايل فريداً.`);
  }

  // التحقق من توفر اسم المستخدم عبر الموظفين والعملاء
  const isAvailable = await checkUsernameAvailability(desiredUsername);
  if (!isAvailable) {
    throw new Error(`اسم المستخدم (${desiredUsername}) مسجل بالفعل لمستخدم آخر في النظام! يرجى اختيار اسم مستخدم مختلف.`);
  }

  if (supabase) {
    const dbPayload: Record<string, any> = {
      name: name,
      mobile: phone,
      area_id: customer.area_id,
      building_number: customer.building_number,
      block: block,
      username: desiredUsername,
      password_hash: customer.password_hash || btoa('123456')
    };
    if (detailed_address) dbPayload.detailed_address = detailed_address;
    if (location_url) dbPayload.location_url = location_url;

    let { data, error } = await supabase.from('customers').insert(dbPayload).select().single();
    if (error && (error.message.includes('column') || error.code === '42703')) {
      delete dbPayload.detailed_address;
      delete dbPayload.location_url;
      const retry = await supabase.from('customers').insert(dbPayload).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('username') || error.message.includes('customers_username_key')) {
          throw new Error(`اسم المستخدم (${desiredUsername}) مأخوذ بالفعل في قاعدة البيانات! يرجى اختيار اسم آخر.`);
        }
        throw new Error(`رقم الهاتف (${phone}) مسجل مسبقاً في قاعدة البيانات!`);
      }
      throw new Error(error.message);
    }
    if (data) {
      return {
        id: data.id,
        full_name: data.name || name,
        name: data.name || name,
        phone: data.mobile || phone,
        mobile: data.mobile || phone,
        area_id: data.area_id,
        building_number: data.building_number,
        block: data.block,
        block_number: data.block,
        detailed_address: data.detailed_address || detailed_address,
        location_url: data.location_url || location_url,
        username: data.username,
        password_hash: data.password_hash,
        created_at: data.created_at
      };
    }
  }

  const newCustomer: Customer = {
    id: generateId(),
    ...customer,
    full_name: name,
    phone: phone,
    block: block,
    block_number: block,
    detailed_address,
    location_url,
    created_at: new Date().toISOString()
  };
  memoryCustomers.push(newCustomer);
  return newCustomer;
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  const phone = updates.phone || updates.mobile;
  if (phone) {
    const conflict = memoryCustomers.find(c => c.id !== id && c.phone.trim() === phone.trim());
    if (conflict) {
      throw new Error(`رقم الهاتف (${phone}) مسجل مسبقاً لعميل آخر.`);
    }
  }

  if (supabase) {
    const dbUpdates: Record<string, any> = {};
    if (updates.full_name !== undefined || updates.name !== undefined) {
      dbUpdates.name = updates.full_name || updates.name;
    }
    if (updates.phone !== undefined || updates.mobile !== undefined) {
      dbUpdates.mobile = updates.phone || updates.mobile;
    }
    if (updates.area_id !== undefined) dbUpdates.area_id = updates.area_id;
    if (updates.building_number !== undefined) dbUpdates.building_number = updates.building_number;
    if (updates.block !== undefined || updates.block_number !== undefined) {
      dbUpdates.block = updates.block || updates.block_number;
    }
    if (updates.detailed_address !== undefined) dbUpdates.detailed_address = updates.detailed_address;
    if (updates.location_url !== undefined) dbUpdates.location_url = updates.location_url;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.password_hash !== undefined) dbUpdates.password_hash = updates.password_hash;

    let { data, error } = await supabase.from('customers').update(dbUpdates).eq('id', id).select().single();
    if (error && (error.message.includes('column') || error.code === '42703')) {
      delete dbUpdates.detailed_address;
      delete dbUpdates.location_url;
      const retry = await supabase.from('customers').update(dbUpdates).eq('id', id).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (data && !error) {
      return {
        id: data.id,
        full_name: data.name || updates.full_name || '',
        name: data.name || updates.name || '',
        phone: data.mobile || updates.phone || '',
        mobile: data.mobile || updates.mobile || '',
        area_id: data.area_id,
        building_number: data.building_number,
        block: data.block,
        block_number: data.block,
        detailed_address: data.detailed_address || updates.detailed_address || '',
        location_url: data.location_url || updates.location_url || '',
        username: data.username,
        password_hash: data.password_hash,
        created_at: data.created_at
      };
    }
  }
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, ...updates } : c);
  return memoryCustomers.find(c => c.id === id)!;
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) return true;
  }
  memoryCustomers = memoryCustomers.filter(c => c.id !== id);
  memoryVehicles = memoryVehicles.filter(v => v.customer_id !== id);
  return true;
};

export const resetCustomerPassword = async (id: string, newPasswordPlain: string): Promise<void> => {
  const password_hash = btoa(newPasswordPlain); // Base64 encoding for safe transport
  if (supabase) {
    await supabase.from('customers').update({ password_hash }).eq('id', id);
    return;
  }
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, password_hash } : c);
};

export const getVehicles = async (customerId?: string): Promise<Vehicle[]> => {
  if (supabase) {
    let query = supabase.from('vehicles').select('*');
    if (customerId) query = query.eq('customer_id', customerId);
    const { data, error } = await query;
    if (data && !error) {
      return data.map((v: any) => ({
        id: v.id,
        customer_id: v.customer_id,
        vehicle_type: v.type || v.vehicle_type || '',
        type: v.type || v.vehicle_type || '',
        color: v.color || '',
        plate_number: v.license_plate || v.plate_number || '',
        license_plate: v.license_plate || v.plate_number || '',
        vehicle_image_url: v.image_url || v.vehicle_image_url,
        image_url: v.image_url || v.vehicle_image_url,
        created_at: v.created_at
      }));
    }
  }
  if (customerId) {
    return memoryVehicles.filter(v => v.customer_id === customerId);
  }
  return memoryVehicles;
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle> => {
  const vType = vehicle.type || vehicle.vehicle_type || '';
  const vPlate = vehicle.license_plate || vehicle.plate_number || '';
  const vImage = vehicle.image_url || vehicle.vehicle_image_url || '';

  if (supabase) {
    const dbPayload: Record<string, any> = {
      customer_id: vehicle.customer_id,
      type: vType,
      color: vehicle.color,
      license_plate: vPlate,
      image_url: vImage
    };
    const { data, error } = await supabase.from('vehicles').insert(dbPayload).select().single();
    if (data && !error) {
      return {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_type: data.type || vType,
        type: data.type || vType,
        color: data.color,
        plate_number: data.license_plate || vPlate,
        license_plate: data.license_plate || vPlate,
        vehicle_image_url: data.image_url || vImage,
        image_url: data.image_url || vImage,
        created_at: data.created_at
      };
    }
  }
  const newVeh: Vehicle = {
    id: generateId(),
    ...vehicle,
    vehicle_type: vType,
    plate_number: vPlate,
    vehicle_image_url: vImage,
    created_at: new Date().toISOString()
  };
  memoryVehicles.push(newVeh);
  return newVeh;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) return true;
  }
  memoryVehicles = memoryVehicles.filter(v => v.id !== id);
  return true;
};

// ==============================================================================
// 5. إدارة الباقات والتسعير المرن (Packages & Area Pricing API)
// ==============================================================================

export const getPackageCategories = async (): Promise<PackageCategory[]> => {
  if (supabase) {
    // محاولة من جدول categories المعتمد في سوبابيز أولاً
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (data && !error) {
      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        is_active: c.is_active !== false,
        created_at: c.created_at
      }));
    }
    // محاولة احتياطية من package_categories
    const { data: altData } = await supabase.from('package_categories').select('*').order('created_at', { ascending: true });
    if (altData) return altData;
  }
  return memoryCategories;
};

export const createPackageCategory = async (cat: Omit<PackageCategory, 'id' | 'created_at'>): Promise<PackageCategory> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: cat.name })
      .select()
      .single();
    if (data && !error) {
      return {
        id: data.id,
        name: data.name,
        description: cat.description || '',
        is_active: true,
        created_at: data.created_at
      };
    }
  }
  const newCat: PackageCategory = { id: generateId(), ...cat, created_at: new Date().toISOString() };
  memoryCategories.push(newCat);
  return newCat;
};

export const getPackages = async (): Promise<Package[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: true });
    if (data && !error) {
      return data.map((p: any) => ({
        id: p.id,
        category_id: p.category_id,
        name: p.name,
        tier: (p.level || p.tier || 'monthly') as PackageTier,
        level: p.level || p.tier || 'monthly',
        duration_days: Number(p.duration_days) || 30,
        base_visits_count: Number(p.base_visits_count) || 4,
        description: p.description || '',
        is_active: p.is_active !== false,
        created_at: p.created_at
      }));
    }
  }
  return memoryPackages;
};

export const createPackage = async (pkg: Omit<Package, 'id' | 'created_at'>): Promise<Package> => {
  const level = pkg.level || pkg.tier || 'monthly';
  if (supabase) {
    const dbPayload: Record<string, any> = {
      category_id: pkg.category_id,
      name: pkg.name,
      level: level,
      duration_days: Number(pkg.duration_days) || 30,
      base_visits_count: Number(pkg.base_visits_count) || 4
    };
    const { data, error } = await supabase.from('packages').insert(dbPayload).select().single();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return {
        id: data.id,
        category_id: data.category_id,
        name: data.name,
        tier: (data.level || level) as PackageTier,
        level: data.level || level,
        duration_days: data.duration_days,
        base_visits_count: data.base_visits_count,
        description: pkg.description || '',
        is_active: true,
        created_at: data.created_at
      };
    }
  }
  const newPkg: Package = { id: generateId(), ...pkg, level, created_at: new Date().toISOString() };
  memoryPackages.push(newPkg);
  return newPkg;
};

export const updatePackage = async (id: string, updates: Partial<Package>): Promise<Package> => {
  if (supabase) {
    const dbUpdates: Record<string, any> = {};
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.tier !== undefined || updates.level !== undefined) {
      dbUpdates.level = updates.level || updates.tier;
    }
    if (updates.duration_days !== undefined) dbUpdates.duration_days = updates.duration_days;
    if (updates.base_visits_count !== undefined) dbUpdates.base_visits_count = updates.base_visits_count;

    const { data, error } = await supabase.from('packages').update(dbUpdates).eq('id', id).select().single();
    if (data && !error) {
      return {
        id: data.id,
        category_id: data.category_id,
        name: data.name,
        tier: (data.level || updates.tier || 'monthly') as PackageTier,
        level: data.level,
        duration_days: data.duration_days,
        base_visits_count: data.base_visits_count,
        description: updates.description || '',
        is_active: true,
        created_at: data.created_at
      };
    }
  }
  memoryPackages = memoryPackages.map(p => p.id === id ? { ...p, ...updates } : p);
  return memoryPackages.find(p => p.id === id)!;
};

export const getPackagePricing = async (packageId?: string, areaId?: string): Promise<PackagePricing[]> => {
  if (supabase) {
    // فحص الجدول الحقيقي package_area_pricing
    let query = supabase.from('package_area_pricing').select('*');
    if (packageId) query = query.eq('package_id', packageId);
    if (areaId) query = query.eq('area_id', areaId);
    const { data, error } = await query;
    if (data && !error) return data;
  }
  return memoryPackagePricing.filter(p => {
    if (packageId && p.package_id !== packageId) return false;
    if (areaId && p.area_id !== areaId) return false;
    return true;
  });
};

export const savePackagePricing = async (packageId: string, areaId: string, price: number): Promise<PackagePricing> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('package_area_pricing')
      .upsert({ package_id: packageId, area_id: areaId, price }, { onConflict: 'package_id,area_id' })
      .select()
      .single();
    if (data && !error) return data;
  }
  const idx = memoryPackagePricing.findIndex(p => p.package_id === packageId && p.area_id === areaId);
  if (idx >= 0) {
    memoryPackagePricing[idx].price = price;
    return memoryPackagePricing[idx];
  } else {
    const newPrice: PackagePricing = { id: generateId(), package_id: packageId, area_id: areaId, price };
    memoryPackagePricing.push(newPrice);
    return newPrice;
  }
};

// ==============================================================================
// 6. إدارة الاشتراكات وتوليد الزيارات وسير العمل (Subscriptions & Visit Generation)
// ==============================================================================

export const getSubscriptions = async (statusFilter?: SubscriptionStatus): Promise<Subscription[]> => {
  if (supabase) {
    let query = supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (data && !error) {
      return data.map((s: any) => {
        const isPaid = s.payment_status === 'paid' || (s.notes && s.notes.includes('[تم السداد'));
        const paymentStatus = isPaid ? 'paid' : (s.payment_status || 'unpaid');
        return {
          id: s.id,
          customer_id: s.customer_id,
          vehicle_id: s.vehicle_id || null,
          package_id: s.package_id,
          area_id: s.area_id,
          assigned_worker_id: s.worker_id || s.assigned_worker_id || null,
          status: s.status as SubscriptionStatus,
          preferred_day_of_week: s.preferred_day_of_week || '',
          preferred_time_from: s.preferred_time_from || undefined,
          preferred_time_to: s.preferred_time_to || undefined,
          start_date: s.start_date,
          end_date: s.end_date,
          total_price: Number(s.total_price || s.price || s.amount) || 0,
          notes: s.notes || '',
          payment_status: paymentStatus,
          payment_method_id: s.payment_method_id || null,
          paid_at: s.paid_at || (isPaid ? s.created_at : undefined),
          approved_at: s.approved_at || undefined,
          approved_by: s.approved_by || undefined,
          archived_at: s.archived_at || undefined,
          created_at: s.created_at
        };
      });
    }
  }
  if (statusFilter) {
    return memorySubscriptions.filter(s => s.status === statusFilter);
  }
  return memorySubscriptions;
};

export const createSubscription = async (sub: Omit<Subscription, 'id' | 'status' | 'created_at'>): Promise<Subscription> => {
  const isPaid = sub.payment_status === 'paid';
  const paymentStatus = isPaid ? 'paid' : 'unpaid';

  let paymentMethodName = '';
  let resolvedTreasury: Treasury | null = null;
  if (sub.payment_method_id) {
    resolvedTreasury = await resolveTreasuryForPaymentMethod(sub.payment_method_id);
    const pms = await getPaymentMethods();
    const pm = pms.find(m => m.id === sub.payment_method_id || m.treasury_id === sub.payment_method_id);
    paymentMethodName = pm?.name || resolvedTreasury?.name || '';
  }

  let notesWithPayment = sub.notes || '';
  if (isPaid) {
    notesWithPayment = `[تم السداد${paymentMethodName ? ` - طريقة الدفع: ${paymentMethodName}` : ''}] ${notesWithPayment}`.trim();
  } else {
    notesWithPayment = `[غير مسدد] ${notesWithPayment}`.trim();
  }

  const newSubData: Subscription = {
    id: generateId(),
    ...sub,
    notes: notesWithPayment,
    payment_status: paymentStatus,
    payment_method_id: sub.payment_method_id || null,
    paid_at: isPaid ? (sub.paid_at || new Date().toISOString()) : undefined,
    status: 'pending' as SubscriptionStatus,
    created_at: new Date().toISOString()
  };

  // إذا تم اختيار تأكيد الدفع وكانت طريقة الدفع محددة، يتم توريد المبلغ فوراً للخزينة المرتبطة
  if (isPaid && Number(sub.total_price) > 0) {
    try {
      if (!resolvedTreasury && sub.payment_method_id) {
        resolvedTreasury = await resolveTreasuryForPaymentMethod(sub.payment_method_id);
      }
      if (resolvedTreasury) {
        await createTreasuryTransaction({
          treasury_id: resolvedTreasury.id,
          amount: Number(sub.total_price),
          type: 'deposit',
          reason: `تحصيل سداد اشتراك جديد عبر (${resolvedTreasury.name})`,
          created_by: 'النظام'
        });
      }
    } catch (e) {
      console.error('Error depositing subscription payment to treasury:', e);
    }
  }

  if (supabase) {
    const dbPayload: Record<string, any> = {
      customer_id: sub.customer_id,
      package_id: sub.package_id,
      area_id: sub.area_id,
      status: 'pending',
      preferred_day_of_week: sub.preferred_day_of_week,
      start_date: sub.start_date,
      end_date: sub.end_date
    };

    if (sub.vehicle_id) dbPayload.vehicle_id = sub.vehicle_id;
    if (sub.assigned_worker_id) dbPayload.worker_id = sub.assigned_worker_id;
    if (sub.preferred_time_from) dbPayload.preferred_time_from = sub.preferred_time_from;
    if (sub.preferred_time_to) dbPayload.preferred_time_to = sub.preferred_time_to;
    if (sub.total_price !== undefined) dbPayload.total_price = sub.total_price;
    if (notesWithPayment) dbPayload.notes = notesWithPayment;

    const { data, error } = await supabase.from('subscriptions').insert(dbPayload).select().single();
    if (data && !error) {
      const createdSub: Subscription = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        package_id: data.package_id,
        area_id: data.area_id,
        assigned_worker_id: data.worker_id || null,
        status: data.status as SubscriptionStatus,
        preferred_day_of_week: data.preferred_day_of_week,
        preferred_time_from: data.preferred_time_from || undefined,
        preferred_time_to: data.preferred_time_to || undefined,
        start_date: data.start_date,
        end_date: data.end_date,
        total_price: Number(data.total_price) || 0,
        notes: data.notes || '',
        payment_status: paymentStatus,
        payment_method_id: sub.payment_method_id || null,
        paid_at: isPaid ? (sub.paid_at || new Date().toISOString()) : undefined,
        created_at: data.created_at
      };
      memorySubscriptions.unshift(createdSub);
      return createdSub;
    }
  }

  memorySubscriptions.unshift(newSubData);
  return newSubData;
};

// سداد اشتراك غير مسدد وتوريد المبلغ للخزينة
export const paySubscription = async (
  subscriptionId: string,
  paymentMethodId: string,
  amount: number
): Promise<Subscription> => {
  let sub = memorySubscriptions.find(s => s.id === subscriptionId);
  if (!sub && supabase) {
    const { data } = await supabase.from('subscriptions').select('*').eq('id', subscriptionId).single();
    if (data) {
      sub = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        package_id: data.package_id,
        area_id: data.area_id,
        assigned_worker_id: data.worker_id || null,
        status: data.status,
        preferred_day_of_week: data.preferred_day_of_week,
        start_date: data.start_date,
        end_date: data.end_date,
        total_price: Number(data.total_price) || 0,
        notes: data.notes || '',
        payment_status: 'unpaid',
        created_at: data.created_at
      };
    }
  }
  if (!sub) throw new Error('الاشتراك غير موجود');

  // جلب طريقة الدفع والخزينة المرتبطة بها
  const targetTreasury = await resolveTreasuryForPaymentMethod(paymentMethodId);
  const pms = await getPaymentMethods();
  const pm = pms.find(m => m.id === paymentMethodId || m.treasury_id === paymentMethodId);
  const methodName = pm?.name || targetTreasury?.name || 'طريقة دفع';

  // تسجيل الإيداع المالي في الخزينة
  if (targetTreasury && Number(amount) > 0) {
    await createTreasuryTransaction({
      treasury_id: targetTreasury.id,
      amount: Number(amount),
      type: 'deposit',
      reason: `تحصيل سداد اشتراك (${sub.id.slice(0, 8)}) عبر ${methodName}`,
      created_by: 'النظام'
    });
  }

  const nowStr = new Date().toISOString();
  const cleanOldNotes = (sub.notes || '').replace(/\[غير مسدد\]\s*/g, '').trim();
  const updatedNotes = `[تم السداد عبر ${methodName} بتاريخ ${nowStr.split('T')[0]}] ${cleanOldNotes}`.trim();

  // تحديث الملاحظات وحالة السداد في قاعدة البيانات
  if (supabase) {
    const dbUpdates: Record<string, any> = {
      notes: updatedNotes
    };
    await supabase.from('subscriptions').update(dbUpdates).eq('id', subscriptionId);
  }

  const updatedSub: Subscription = {
    ...sub,
    notes: updatedNotes,
    payment_status: 'paid',
    payment_method_id: paymentMethodId,
    paid_at: nowStr
  };

  memorySubscriptions = memorySubscriptions.map(s => s.id === subscriptionId ? updatedSub : s);
  return updatedSub;
};

// توليد الزيارات المستقبلية عند اعتماد الاشتراك
export const generateVisitsForSubscription = async (subscriptionId: string): Promise<Visit[]> => {
  let sub = memorySubscriptions.find(s => s.id === subscriptionId);
  if (!sub && supabase) {
    const { data } = await supabase.from('subscriptions').select('*').eq('id', subscriptionId).single();
    if (data) {
      sub = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        package_id: data.package_id,
        area_id: data.area_id,
        assigned_worker_id: data.worker_id || null,
        status: data.status,
        preferred_day_of_week: data.preferred_day_of_week,
        preferred_time_from: data.preferred_time_from,
        preferred_time_to: data.preferred_time_to,
        start_date: data.start_date,
        end_date: data.end_date,
        total_price: Number(data.total_price) || 0,
        notes: data.notes || '',
        created_at: data.created_at
      };
    }
  }

  if (!sub) return [];

  let pkg = memoryPackages.find(p => p.id === sub!.package_id);
  if (!pkg && supabase && sub.package_id) {
    const { data } = await supabase.from('packages').select('*').eq('id', sub.package_id).single();
    if (data) pkg = data;
  }

  if (!pkg) return [];

  const targetDayNum = getDayNumberFromArabic(sub.preferred_day_of_week);
  const startDate = new Date(sub.start_date);
  const endDate = new Date(sub.end_date);

  // إيجاد أول يوم يوافق اليوم المفضل
  let currentDate = new Date(startDate);
  while (currentDate.getDay() !== targetDayNum) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const generatedVisits: Visit[] = [];
  const maxVisits = pkg.base_visits_count || 4;
  let count = 0;

  while (count < maxVisits && currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const visitData: Visit = {
      id: generateId(),
      subscription_id: sub.id,
      customer_id: sub.customer_id,
      assigned_worker_id: sub.assigned_worker_id || null,
      scheduled_date: dateStr,
      scheduled_time_from: sub.preferred_time_from,
      scheduled_time_to: sub.preferred_time_to,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    generatedVisits.push(visitData);
    count++;
    currentDate.setDate(currentDate.getDate() + 7); // إضافة أسبوع
  }

  if (supabase) {
    try {
      // تجهيز الحقول المتوافقة مع جدول visits في Supabase (worker_id بدلاً من assigned_worker_id)
      const dbVisits = generatedVisits.map(v => ({
        subscription_id: v.subscription_id,
        worker_id: v.assigned_worker_id || null,
        scheduled_date: v.scheduled_date,
        scheduled_time_from: v.scheduled_time_from || null,
        scheduled_time_to: v.scheduled_time_to || null,
        status: v.status,
        notes: v.notes || null
      }));
      await supabase.from('visits').insert(dbVisits);
    } catch (e) {
      console.error('Error inserting visits to Supabase:', e);
    }
  }

  memoryVisits.push(...generatedVisits);
  return generatedVisits;
};

// اعتماد أو رفض أو تغيير حالة الاشتراك
export const updateSubscriptionStatus = async (
  id: string,
  newStatus: SubscriptionStatus,
  adminName: string = 'الإدارة'
): Promise<Subscription> => {
  const updates: Partial<Subscription> = { status: newStatus };
  if (newStatus === 'active') {
    updates.approved_at = new Date().toISOString();
  }

  if (supabase) {
    const dbUpdates: Record<string, any> = { status: newStatus };
    const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    // في قاعدة البيانات حقل approved_by نوعه UUID؛ لذا إذا لم يكن معرف UUID صالحاً لا نرسله حتى لا يحدث خطأ 400 Bad Request
    if (newStatus === 'active' && adminName && isUUID(adminName)) {
      dbUpdates.approved_by = adminName;
    }
    const { data, error } = await supabase.from('subscriptions').update(dbUpdates).eq('id', id).select().single();
    if (error) {
      console.error('Error updating subscription in Supabase:', error);
      throw new Error(error.message || 'فشل تحديث حالة الاشتراك في قاعدة البيانات');
    }
    if (newStatus === 'active') {
      await generateVisitsForSubscription(id);
    }
    if (data && !error) {
      const updated: Subscription = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        package_id: data.package_id,
        area_id: data.area_id,
        assigned_worker_id: data.worker_id || null,
        status: data.status,
        preferred_day_of_week: data.preferred_day_of_week,
        preferred_time_from: data.preferred_time_from,
        preferred_time_to: data.preferred_time_to,
        start_date: data.start_date,
        end_date: data.end_date,
        total_price: Number(data.total_price) || 0,
        notes: data.notes || '',
        approved_at: data.approved_at || (newStatus === 'active' ? new Date().toISOString() : undefined),
        approved_by: data.approved_by || adminName,
        created_at: data.created_at
      };
      memorySubscriptions = memorySubscriptions.map(s => s.id === id ? { ...s, ...updated } : s);
      return updated;
    }
  }

  memorySubscriptions = memorySubscriptions.map(s => s.id === id ? { ...s, ...updates } : s);
  if (newStatus === 'active') {
    await generateVisitsForSubscription(id);
  }
  return memorySubscriptions.find(s => s.id === id)!;
};

// أرشفة الاشتراكات المنتهية لأكثر من 10 أيام
export const checkAndArchiveExpiredSubscriptions = async (): Promise<number> => {
  const now = new Date();
  const tenDaysAgo = new Date(now.setDate(now.getDate() - 10));

  if (supabase) {
    try {
      const { data } = await supabase.rpc('archive_expired_subscriptions');
      if (typeof data === 'number') return data;
    } catch (e) {
      // fallback
    }
  }

  let count = 0;
  memorySubscriptions = memorySubscriptions.map(s => {
    if (s.status === 'expired' && new Date(s.end_date) < tenDaysAgo) {
      count++;
      return { ...s, status: 'archived', archived_at: new Date().toISOString() };
    }
    return s;
  });
  return count;
};

// استعادة اشتراك مؤرشف
export const restoreArchivedSubscription = async (id: string): Promise<Subscription> => {
  return updateSubscriptionStatus(id, 'active');
};

// تجديد اشتراك منتهي
export const renewSubscription = async (subscriptionId: string): Promise<Subscription> => {
  const oldSub = memorySubscriptions.find(s => s.id === subscriptionId);
  if (!oldSub) throw new Error('الاشتراك غير موجود');

  const pkg = memoryPackages.find(p => p.id === oldSub.package_id);
  const duration = pkg?.duration_days || 30;

  const startDate = new Date().toISOString().split('T')[0];
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() + duration);
  const endDate = endDateObj.toISOString().split('T')[0];

  const renewedSub = await createSubscription({
    customer_id: oldSub.customer_id,
    vehicle_id: oldSub.vehicle_id,
    package_id: oldSub.package_id,
    area_id: oldSub.area_id,
    assigned_worker_id: oldSub.assigned_worker_id,
    preferred_day_of_week: oldSub.preferred_day_of_week,
    preferred_time_from: oldSub.preferred_time_from,
    preferred_time_to: oldSub.preferred_time_to,
    start_date: startDate,
    end_date: endDate,
    total_price: oldSub.total_price,
    notes: `تجديد للاشتراك السابق (${oldSub.id.slice(0, 8)})`
  });

  return renewedSub;
};

// حذف اشتراك وجميع الزيارات المرتبطة به
export const deleteSubscription = async (id: string): Promise<boolean> => {
  if (supabase) {
    try {
      await supabase.from('visits').delete().eq('subscription_id', id);
    } catch (e) {
      console.warn('Visits delete warning:', e);
    }
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subscription in Supabase:', error);
      throw new Error(error.message || 'فشل حذف الاشتراك من قاعدة البيانات');
    }
  }

  memorySubscriptions = memorySubscriptions.filter(s => s.id !== id);
  memoryVisits = memoryVisits.filter(v => v.subscription_id !== id);
  return true;
};

// ==============================================================================
// 7. الجدولة والرزنامة التفاعلية (Calendar & Visits API)
// ==============================================================================

export const getVisits = async (startDate?: string, endDate?: string): Promise<Visit[]> => {
  if (supabase) {
    let query = supabase.from('visits').select('*').order('scheduled_date', { ascending: true });
    if (startDate) query = query.gte('scheduled_date', startDate);
    if (endDate) query = query.lte('scheduled_date', endDate);
    const { data, error } = await query;
    if (data && !error) {
      // جلب الاشتراكات لربط customer_id و worker_id بدقة
      let subs = memorySubscriptions;
      if (subs.length === 0) {
        const { data: subData } = await supabase.from('subscriptions').select('*');
        if (subData) subs = subData;
      }
      return data.map((v: any) => {
        const sub = subs.find((s: any) => s.id === v.subscription_id);
        return {
          id: v.id,
          subscription_id: v.subscription_id,
          customer_id: v.customer_id || sub?.customer_id || '',
          assigned_worker_id: v.worker_id || v.assigned_worker_id || (sub as any)?.worker_id || sub?.assigned_worker_id || null,
          scheduled_date: v.scheduled_date,
          scheduled_time_from: v.scheduled_time_from || sub?.preferred_time_from || undefined,
          scheduled_time_to: v.scheduled_time_to || sub?.preferred_time_to || undefined,
          status: v.status as VisitStatus,
          postponed_from_date: v.postponed_from_date || undefined,
          postponed_reason: v.postponed_reason || undefined,
          notes: v.notes || '',
          rating: v.rating || undefined,
          rating_comment: v.rating_comment || undefined,
          completed_at: v.completed_at || undefined,
          created_at: v.created_at
        };
      });
    }
  }
  return memoryVisits.filter(v => {
    if (startDate && v.scheduled_date < startDate) return false;
    if (endDate && v.scheduled_date > endDate) return false;
    return true;
  });
};

// تأجيل ونقل الزيارة بالسحب والإفلات مع تعيين حالة 'مؤجل' دون التأثير على باقي الزيارات
export const rescheduleVisit = async (
  visitId: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string
): Promise<Visit> => {
  const target = memoryVisits.find(v => v.id === visitId);
  const oldDate = target?.scheduled_date;

  const updates: Partial<Visit> = {
    scheduled_date: newDate,
    status: 'postponed' as VisitStatus,
    postponed_from_date: oldDate,
    notes: `تم تأجيل ونقل موعد الزيارة من ${oldDate} إلى ${newDate}`
  };
  if (newTimeFrom) updates.scheduled_time_from = newTimeFrom;
  if (newTimeTo) updates.scheduled_time_to = newTimeTo;

  if (supabase) {
    const dbUpdates: Record<string, any> = {
      scheduled_date: newDate,
      status: 'postponed',
      notes: updates.notes
    };
    if (newTimeFrom) dbUpdates.scheduled_time_from = newTimeFrom;
    if (newTimeTo) dbUpdates.scheduled_time_to = newTimeTo;

    const { data, error } = await supabase.from('visits').update(dbUpdates).eq('id', visitId).select().single();
    if (data && !error) {
      const sub = memorySubscriptions.find(s => s.id === data.subscription_id);
      const updated: Visit = {
        id: data.id,
        subscription_id: data.subscription_id,
        customer_id: data.customer_id || sub?.customer_id || '',
        assigned_worker_id: data.worker_id || data.assigned_worker_id || sub?.assigned_worker_id || null,
        scheduled_date: data.scheduled_date,
        scheduled_time_from: data.scheduled_time_from || sub?.preferred_time_from || undefined,
        scheduled_time_to: data.scheduled_time_to || sub?.preferred_time_to || undefined,
        status: data.status,
        postponed_from_date: oldDate,
        notes: data.notes || updates.notes,
        created_at: data.created_at
      };
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updated } : v);
      return updated;
    }
  }

  memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
  return memoryVisits.find(v => v.id === visitId)!;
};

export const updateVisitStatus = async (visitId: string, status: VisitStatus, notes?: string): Promise<Visit> => {
  const updates: Partial<Visit> = { status };
  if (notes !== undefined) updates.notes = notes;
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  if (supabase) {
    const dbUpdates: Record<string, any> = { status };
    if (notes !== undefined) dbUpdates.notes = notes;
    if (status === 'completed') dbUpdates.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from('visits').update(dbUpdates).eq('id', visitId).select().single();
    if (data && !error) {
      const sub = memorySubscriptions.find(s => s.id === data.subscription_id);
      const updated: Visit = {
        id: data.id,
        subscription_id: data.subscription_id,
        customer_id: data.customer_id || sub?.customer_id || '',
        assigned_worker_id: data.worker_id || data.assigned_worker_id || sub?.assigned_worker_id || null,
        scheduled_date: data.scheduled_date,
        scheduled_time_from: data.scheduled_time_from || sub?.preferred_time_from || undefined,
        scheduled_time_to: data.scheduled_time_to || sub?.preferred_time_to || undefined,
        status: data.status,
        postponed_from_date: data.postponed_from_date || undefined,
        notes: data.notes || '',
        completed_at: data.completed_at || undefined,
        created_at: data.created_at
      };
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updated } : v);
      return updated;
    }
  }

  memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
  return memoryVisits.find(v => v.id === visitId)!;
};

export const completeVisit = async (visitId: string, notes?: string): Promise<Visit> => {
  return updateVisitStatus(visitId, 'completed', notes);
};

export const postponeVisit = async (
  visitId: string,
  reason: string,
  workerNote: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string
): Promise<Visit> => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const cleanReason = reason.trim();
  const cleanNote = workerNote.trim();
  const formattedNote = `[${dateStr} ${timeStr}] تم التأجيل: ${cleanReason}${cleanNote ? ` - ملاحظة: ${cleanNote}` : ''}`;

  const target = memoryVisits.find(v => v.id === visitId);
  const oldDate = target?.scheduled_date;

  const updates: Partial<Visit> = {
    scheduled_date: newDate,
    status: 'postponed' as VisitStatus,
    postponed_from_date: oldDate,
    postponed_reason: cleanReason,
    notes: formattedNote
  };
  if (newTimeFrom) updates.scheduled_time_from = newTimeFrom;
  if (newTimeTo) updates.scheduled_time_to = newTimeTo;

  if (supabase) {
    const dbUpdates: Record<string, any> = {
      scheduled_date: newDate,
      status: 'postponed',
      notes: formattedNote
    };
    if (newTimeFrom) dbUpdates.scheduled_time_from = newTimeFrom;
    if (newTimeTo) dbUpdates.scheduled_time_to = newTimeTo;

    const { data, error } = await supabase.from('visits').update(dbUpdates).eq('id', visitId).select().single();
    if (data && !error) {
      const sub = memorySubscriptions.find(s => s.id === data.subscription_id);
      const updated: Visit = {
        id: data.id,
        subscription_id: data.subscription_id,
        customer_id: data.customer_id || sub?.customer_id || '',
        assigned_worker_id: data.worker_id || data.assigned_worker_id || sub?.assigned_worker_id || null,
        scheduled_date: data.scheduled_date,
        scheduled_time_from: data.scheduled_time_from || sub?.preferred_time_from || undefined,
        scheduled_time_to: data.scheduled_time_to || sub?.preferred_time_to || undefined,
        status: data.status,
        postponed_from_date: oldDate,
        postponed_reason: cleanReason,
        notes: data.notes || formattedNote,
        completed_at: data.completed_at || undefined,
        created_at: data.created_at
      };
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updated } : v);
      return updated;
    }
  }

  memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
  return memoryVisits.find(v => v.id === visitId)!;
};

// إدارة أسباب تأجيل الزيارات (Postponement Reasons)
const DEFAULT_POSTPONEMENT_REASONS: PostponementReason[] = [
  { id: '1', reason: 'السيارة غير متواجدة في الموقع', is_active: true },
  { id: '2', reason: 'العميل طلب التأجيل هاتفياً', is_active: true },
  { id: '3', reason: 'مفتاح السيارة غير متوفر / السيارة مغلقة', is_active: true },
  { id: '4', reason: 'سوء الأحوال الجوية / أمطار أو عواصف', is_active: true },
  { id: '5', reason: 'عطل طارئ في المعدات أو انقطاع المياه', is_active: true },
  { id: '6', reason: 'ازدحام أو تعذر الوصول لمكان الركن', is_active: true },
  { id: '7', reason: 'أخرى (موضحة في الملاحظات التفصيلية)', is_active: true }
];

let memoryPostponementReasons = [...DEFAULT_POSTPONEMENT_REASONS];

export const getPostponementReasons = async (): Promise<PostponementReason[]> => {
  try {
    const saved = localStorage.getItem('wecare_postponement_reasons');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return memoryPostponementReasons;
};

export const savePostponementReasons = async (reasons: PostponementReason[]): Promise<void> => {
  memoryPostponementReasons = reasons;
  try {
    localStorage.setItem('wecare_postponement_reasons', JSON.stringify(reasons));
  } catch {
    // ignore
  }
};

// ==============================================================================
// 8. النظام المالي والخزائن (Finance & Treasuries API)
// ==============================================================================

export const getTreasuries = async (): Promise<Treasury[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('treasuries').select('*').order('type', { ascending: true });
    if (data && !error) {
      memoryTreasuries = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        payment_method_id: t.payment_method_id || null,
        balance: Number(t.balance) || 0,
        is_deletable: t.is_deletable,
        created_at: t.created_at
      }));
      return memoryTreasuries;
    }
  }
  return memoryTreasuries;
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  let pms: any[] = [];
  let treasuries: Treasury[] = [];

  if (supabase) {
    const [pmRes, tRes] = await Promise.all([
      supabase.from('payment_methods').select('*'),
      supabase.from('treasuries').select('*')
    ]);
    if (pmRes.data && !pmRes.error) pms = pmRes.data;
    if (tRes.data && !tRes.error) {
      treasuries = tRes.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        payment_method_id: t.payment_method_id || null,
        balance: Number(t.balance) || 0,
        is_deletable: t.is_deletable,
        created_at: t.created_at
      }));
      memoryTreasuries = treasuries;
    }
  } else {
    pms = memoryPaymentMethods;
    treasuries = memoryTreasuries;
  }

  // ربط كل طريقة دفع بخزينتها المعنية بدقة
  const result: PaymentMethod[] = pms.map((pm) => {
    const cleanPmName = pm.name.replace(/^خزينة\s+/, '').trim().toLowerCase();
    const matchedTreasury = treasuries.find(
      (t) =>
        t.payment_method_id === pm.id ||
        t.name.trim().toLowerCase() === pm.name.trim().toLowerCase() ||
        t.name.trim().toLowerCase() === `خزينة ${cleanPmName}` ||
        t.name.replace(/^خزينة\s+/, '').trim().toLowerCase() === cleanPmName
    );
    return {
      id: pm.id,
      name: pm.name,
      treasury_id: matchedTreasury ? matchedTreasury.id : (pm.treasury_id || pm.id),
      is_active: pm.is_active ?? true,
      created_at: pm.created_at
    };
  });

  // إضافة أي خزينة مضافة في جدول الخزائن ولم تسجل بعد في طرق الدفع لتظهر في كافة أماكن الدفع
  for (const t of treasuries) {
    if (t.type === 'main') continue;
    const cleanName = t.name.replace(/^خزينة\s+/, '').trim();
    const alreadyExists = result.some(
      (m) =>
        m.id === t.payment_method_id ||
        m.treasury_id === t.id ||
        m.name.trim().toLowerCase() === cleanName.toLowerCase() ||
        m.name.trim().toLowerCase() === t.name.trim().toLowerCase()
    );
    if (!alreadyExists) {
      result.push({
        id: t.payment_method_id || t.id,
        name: cleanName,
        treasury_id: t.id,
        is_active: true
      });
    }
  }

  memoryPaymentMethods = result;
  return result;
};

export const createPaymentMethod = async (name: string): Promise<PaymentMethod> => {
  const cleanName = name.replace(/^خزينة\s+/, '').trim();

  if (supabase) {
    // 1. إنشاء طريقة الدفع أولاً في جدول payment_methods
    const { data: mData, error: mErr } = await supabase
      .from('payment_methods')
      .insert({ name: cleanName, is_active: true })
      .select()
      .single();

    if (mData && !mErr) {
      // 2. إنشاء الخزينة التابعة لها وربطها بطريقة الدفع
      const treasuryData = {
        name: `خزينة ${cleanName}`,
        type: 'payment_method' as const,
        payment_method_id: mData.id,
        balance: 0.0,
        is_deletable: true
      };
      const { data: tData } = await supabase
        .from('treasuries')
        .insert(treasuryData)
        .select()
        .single();

      const createdPM: PaymentMethod = {
        id: mData.id,
        name: cleanName,
        treasury_id: tData?.id || mData.id,
        is_active: true,
        created_at: mData.created_at
      };
      memoryPaymentMethods.push(createdPM);
      return createdPM;
    }
  }

  // بديل في الذاكرة
  const pmId = generateId();
  const tId = generateId();
  const newTreasury: Treasury = {
    id: tId,
    name: `خزينة ${cleanName}`,
    type: 'payment_method' as any,
    payment_method_id: pmId,
    balance: 0.0,
    is_deletable: true,
    created_at: new Date().toISOString()
  };
  memoryTreasuries.push(newTreasury);

  const newMethod: PaymentMethod = {
    id: pmId,
    name: cleanName,
    treasury_id: tId,
    is_active: true,
    created_at: new Date().toISOString()
  };
  memoryPaymentMethods.push(newMethod);
  return newMethod;
};

// الدالة المرجعية الموثوقة لتحديد الخزينة بدقة من خلال أي معرف (طريقة دفع، اسم، أو كود خزينة)
export const resolveTreasuryForPaymentMethod = async (identifier: string): Promise<Treasury | null> => {
  if (!identifier) return null;
  const treasuries = await getTreasuries();

  // 1. مطابقة مباشرة على معرف الخزينة
  let match = treasuries.find(t => t.id === identifier);
  if (match) return match;

  // 2. مطابقة على payment_method_id المخزن في جدول الخزائن
  match = treasuries.find(t => t.payment_method_id === identifier);
  if (match) return match;

  // 3. مطابقة من خلال مصفوفة طرق الدفع
  const pms = await getPaymentMethods();
  const pm = pms.find(m => m.id === identifier || m.treasury_id === identifier);
  if (pm) {
    if (pm.treasury_id) {
      const byTId = treasuries.find(t => t.id === pm.treasury_id);
      if (byTId) return byTId;
    }
    const cleanPmName = pm.name.replace(/^خزينة\s+/, '').trim().toLowerCase();
    match = treasuries.find(t => {
      const cleanTName = t.name.replace(/^خزينة\s+/, '').trim().toLowerCase();
      return cleanTName === cleanPmName || t.name.toLowerCase() === pm.name.toLowerCase();
    });
    if (match) return match;
  }

  // 4. مطابقة على الاسم الصريح
  const cleanId = identifier.replace(/^خزينة\s+/, '').trim().toLowerCase();
  match = treasuries.find(t => {
    const cleanTName = t.name.replace(/^خزينة\s+/, '').trim().toLowerCase();
    return cleanTName === cleanId || t.name.toLowerCase() === identifier.toLowerCase();
  });
  if (match) return match;

  // 5. في حالة عدم العثور، نأخذ الخزينة الرئيسية أو أول خزينة متاحة
  return treasuries.find(t => t.type !== 'main') || treasuries[0] || null;
};

export const getTreasuryTransactions = async (): Promise<TreasuryTransaction[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('treasury_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data && !error) {
      return data.map((d: any) => ({
        id: d.id,
        treasury_id: d.treasury_id,
        type: (d.transaction_type || d.type || 'deposit') as TreasuryTransactionType,
        amount: Number(d.amount) || 0,
        reason: d.reason || '',
        related_treasury_id: d.related_payment_method_id || d.related_treasury_id || undefined,
        created_by: d.performed_by || 'النظام',
        created_at: d.created_at
      }));
    }
  }
  return memoryTreasuryTransactions;
};

export const createTreasuryTransaction = async (
  tx: Omit<TreasuryTransaction, 'id' | 'created_at'>
): Promise<TreasuryTransaction> => {
  const newTxId = generateId();
  const nowIso = new Date().toISOString();
  const numAmount = Number(tx.amount) || 0;

  // تحديد الخزينة المستهدفة بدقة
  const targetTreasury = await resolveTreasuryForPaymentMethod(tx.treasury_id);
  const targetTreasuryId = targetTreasury ? targetTreasury.id : tx.treasury_id;

  if (tx.type === 'deposit') {
    let currentBal = 0;
    if (supabase) {
      const { data } = await supabase.from('treasuries').select('balance').eq('id', targetTreasuryId).single();
      if (data) currentBal = Number(data.balance) || 0;
    } else {
      const mem = memoryTreasuries.find(t => t.id === targetTreasuryId);
      if (mem) currentBal = Number(mem.balance) || 0;
    }
    const newBal = currentBal + numAmount;

    if (supabase) {
      await supabase.from('treasuries').update({ balance: newBal }).eq('id', targetTreasuryId);
      await supabase.from('treasury_transactions').insert({
        treasury_id: targetTreasuryId,
        transaction_type: 'deposit',
        amount: numAmount,
        reason: tx.reason || 'إيداع نقدي',
        performed_by: null
      });
    }

    memoryTreasuries = memoryTreasuries.map(t => t.id === targetTreasuryId ? { ...t, balance: newBal } : t);

  } else if (tx.type === 'withdrawal') {
    let currentBal = 0;
    if (supabase) {
      const { data } = await supabase.from('treasuries').select('balance').eq('id', targetTreasuryId).single();
      if (data) currentBal = Number(data.balance) || 0;
    } else {
      const mem = memoryTreasuries.find(t => t.id === targetTreasuryId);
      if (mem) currentBal = Number(mem.balance) || 0;
    }
    const newBal = Math.max(0, currentBal - numAmount);

    if (supabase) {
      await supabase.from('treasuries').update({ balance: newBal }).eq('id', targetTreasuryId);
      await supabase.from('treasury_transactions').insert({
        treasury_id: targetTreasuryId,
        transaction_type: 'withdrawal',
        amount: numAmount,
        reason: tx.reason || 'صرف نقدي',
        performed_by: null
      });
    }

    memoryTreasuries = memoryTreasuries.map(t => t.id === targetTreasuryId ? { ...t, balance: newBal } : t);

  } else if (tx.type === 'transfer' && tx.related_treasury_id) {
    const destTreasury = await resolveTreasuryForPaymentMethod(tx.related_treasury_id);
    const destTreasuryId = destTreasury ? destTreasury.id : tx.related_treasury_id;

    let sourceBal = 0;
    let destBal = 0;

    if (supabase) {
      const [srcRes, destRes] = await Promise.all([
        supabase.from('treasuries').select('balance').eq('id', targetTreasuryId).single(),
        supabase.from('treasuries').select('balance').eq('id', destTreasuryId).single()
      ]);
      if (srcRes.data) sourceBal = Number(srcRes.data.balance) || 0;
      if (destRes.data) destBal = Number(destRes.data.balance) || 0;
    } else {
      const srcMem = memoryTreasuries.find(t => t.id === targetTreasuryId);
      const destMem = memoryTreasuries.find(t => t.id === destTreasuryId);
      if (srcMem) sourceBal = Number(srcMem.balance) || 0;
      if (destMem) destBal = Number(destMem.balance) || 0;
    }

    const newSourceBal = Math.max(0, sourceBal - numAmount);
    const newDestBal = destBal + numAmount;

    if (supabase) {
      await Promise.all([
        supabase.from('treasuries').update({ balance: newSourceBal }).eq('id', targetTreasuryId),
        supabase.from('treasuries').update({ balance: newDestBal }).eq('id', destTreasuryId),
        supabase.from('treasury_transactions').insert({
          treasury_id: targetTreasuryId,
          transaction_type: 'transfer',
          amount: numAmount,
          reason: tx.reason || 'تحويل رصيد',
          performed_by: null
        })
      ]);
    }

    memoryTreasuries = memoryTreasuries.map(t => {
      if (t.id === targetTreasuryId) return { ...t, balance: newSourceBal };
      if (t.id === destTreasuryId) return { ...t, balance: newDestBal };
      return t;
    });
  }

  const resultTx: TreasuryTransaction = {
    id: newTxId,
    ...tx,
    treasury_id: targetTreasuryId,
    created_at: nowIso
  };

  memoryTreasuryTransactions.unshift(resultTx);
  return resultTx;
};

// ==============================================================================
// 9. نظام المخزون والمعدات (Inventory & Equipment API)
// ==============================================================================

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name', { ascending: true });
    if (data && !error) return data;
  }
  return memoryInventoryItems;
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory_items').insert(item).select().single();
    if (data && !error) return data;
  }
  const newItem: InventoryItem = { id: generateId(), ...item, created_at: new Date().toISOString() };
  memoryInventoryItems.push(newItem);
  return newItem;
};

export const getInventoryTransactions = async (): Promise<InventoryTransaction[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false });
    if (data && !error) return data;
  }
  return memoryInventoryTransactions;
};

export const createInventoryTransaction = async (
  tx: Omit<InventoryTransaction, 'id' | 'created_at'>
): Promise<InventoryTransaction> => {
  const newTx: InventoryTransaction = { id: generateId(), ...tx, created_at: new Date().toISOString() };

  // تحديث كمية الصنف في المخزون
  memoryInventoryItems = memoryInventoryItems.map(item => {
    if (item.id === tx.item_id) {
      const delta = tx.type === 'addition_purchase' ? Number(tx.quantity) : -Number(tx.quantity);
      const newStock = Math.max(0, Number(item.current_stock) + delta);
      return { ...item, current_stock: newStock };
    }
    return item;
  });

  if (supabase) {
    await supabase.from('inventory_transactions').insert(newTx);
    const updated = memoryInventoryItems.find(i => i.id === tx.item_id);
    if (updated) {
      await supabase.from('inventory_items').update({ current_stock: updated.current_stock }).eq('id', updated.id);
    }
  }

  memoryInventoryTransactions.unshift(newTx);
  return newTx;
};

export const getEquipment = async (): Promise<Equipment[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('equipment').select('*').order('purchase_date', { ascending: false });
    if (data && !error) return data;
  }
  return memoryEquipment;
};

export const createEquipment = async (eq: Omit<Equipment, 'id' | 'created_at'>): Promise<Equipment> => {
  if (supabase) {
    const { data, error } = await supabase.from('equipment').insert(eq).select().single();
    if (data && !error) return data;
  }
  const newEq: Equipment = { id: generateId(), ...eq, created_at: new Date().toISOString() };
  memoryEquipment.push(newEq);
  return newEq;
};
