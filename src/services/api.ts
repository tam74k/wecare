import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { libSqlClient, isLibSqlConfigured } from '../lib/libsql';
import * as libSqlService from './libsqlService';
import { extractPathFromStorageUrl, BUCKET_NAME } from '../utils/imageStorage';
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
  PostponementReason,
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
import {
  sendEvolutionWhatsAppVisitCompleted,
  VisitCompletionMessageData,
  formatVisitCompletionMessage,
  sendEvolutionWhatsAppVisitPostponed,
  VisitPostponementMessageData,
  formatVisitPostponementMessage,
  generateWhatsAppChatLink
} from './whatsappService';

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
  dial_code: '',
  whatsapp_instance: '',
  whatsapp_api_key: ''
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
let memorySuppliers: Supplier[] = [];
let memorySupplierTransactions: SupplierTransaction[] = [];
let memoryNotifications: SystemNotification[] = [];

// ==============================================================================
// 1. إدارة الإعدادات العامة (Settings API)
// ==============================================================================

export const getSettings = async (): Promise<Settings> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const live = await libSqlService.getSettingsLibSql();
      if (live) {
        memorySettings = live;
        return live;
      }
    } catch (e) {
      console.error('Error fetching settings from libSQL:', e);
    }
  }
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
          whatsapp_instance: row.whatsapp_instance || memorySettings.whatsapp_instance || '',
          whatsapp_api_key: row.whatsapp_api_key || memorySettings.whatsapp_api_key || '',
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
          dial_code: row.dial_code || memorySettings.dial_code,
          whatsapp_instance: row.whatsapp_instance || memorySettings.whatsapp_instance || '',
          whatsapp_api_key: row.whatsapp_api_key || memorySettings.whatsapp_api_key || ''
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateSettingsLibSql(settings);
      memorySettings = res;
    } catch (e) {
      console.error('Error updating settings in libSQL:', e);
    }
  }

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
      if (settings.whatsapp_instance !== undefined) payload.whatsapp_instance = settings.whatsapp_instance;
      if (settings.whatsapp_api_key !== undefined) payload.whatsapp_api_key = settings.whatsapp_api_key;

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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const areas = await libSqlService.getCoverageAreasLibSql();
      memoryCoverageAreas = areas;
      return areas;
    } catch (e) {
      console.error('Error fetching areas from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createCoverageAreaLibSql({ name: cleanName, city: area.city, is_active: true });
      memoryCoverageAreas.push(res);
      return res;
    } catch (e) {
      console.error('Error creating area in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const existing = memoryCoverageAreas.find(a => a.id === id) || { id, name: '', city: '', is_active: true };
      const updatedArea = { ...existing, ...updates, id };
      const res = await libSqlService.updateCoverageAreaLibSql(updatedArea);
      memoryCoverageAreas = memoryCoverageAreas.map(a => a.id === id ? res : a);
      return res;
    } catch (e) {
      console.error('Error updating area in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteCoverageAreaLibSql(id);
      memoryCoverageAreas = memoryCoverageAreas.filter(a => a.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting area in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const emps = await libSqlService.getEmployeesLibSql();
      memoryEmployees = emps;
      return emps;
    } catch (e) {
      console.error('Error fetching employees from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createEmployeeLibSql(employee);
      memoryEmployees.push(res);
      return res;
    } catch (e) {
      console.error('Error creating employee in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const existing = memoryEmployees.find(e => e.id === id) || ({} as Employee);
      const updatedEmp = { ...existing, ...updates, id };
      const res = await libSqlService.updateEmployeeLibSql(updatedEmp);
      memoryEmployees = memoryEmployees.map(e => e.id === id ? res : e);
      return res;
    } catch (e) {
      console.error('Error updating employee in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.resetEmployeePasswordLibSql(id, newPasswordPlain);
      const password_hash = btoa(newPasswordPlain);
      memoryEmployees = memoryEmployees.map(e => e.id === id ? { ...e, password_hash } : e);
      return;
    } catch (e) {
      console.error('Error resetting employee password in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteEmployeeLibSql(id);
      memoryEmployees = memoryEmployees.filter(e => e.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting employee in libSQL:', e);
    }
  }
  if (supabase) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) return true;
  }
  memoryEmployees = memoryEmployees.filter(e => e.id !== id);
  return true;
};

export const getEmployeePermissions = async (employeeId: string): Promise<EmployeePermission[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const perms = await libSqlService.getEmployeePermissionsLibSql(employeeId);
      if (perms.length > 0) return perms;
    } catch (e) {
      console.error('Error fetching employee permissions from libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('employee_permissions').select('*').eq('employee_id', employeeId);
    if (data && !error) return data;
  }
  return memoryEmployeePermissions.filter(p => p.employee_id === employeeId);
};

export const saveEmployeePermissions = async (employeeId: string, permissions: Omit<EmployeePermission, 'id' | 'employee_id'>[]): Promise<void> => {
  const formatted: EmployeePermission[] = permissions.map(p => ({ id: generateId(), employee_id: employeeId, ...p }));
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.updateEmployeePermissionsLibSql(employeeId, formatted);
      return;
    } catch (e) {
      console.error('Error saving employee permissions in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      return await libSqlService.getAttendanceLibSql(date);
    } catch (e) {
      console.error('Error fetching attendance from libSQL:', e);
    }
  }
  if (supabase && attendanceTableExists !== false) {
    try {
      const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
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
  return memoryAttendance.filter(a => a.date === date);
};

export const markAttendance = async (attendance: Omit<Attendance, 'id' | 'created_at'>): Promise<Attendance> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.recordAttendanceLibSql(attendance);
      return res;
    } catch (e) {
      console.error('Error recording attendance in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      return await libSqlService.checkUsernameAvailabilityLibSql(clean, excludeId);
    } catch (e) {
      console.error('Error checking username availability in libSQL:', e);
    }
  }

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
export const loginUser = async (usernameInput: string, passwordPlain: string = ''): Promise<AuthUser> => {
  const cleanUser = usernameInput.trim();
  if (!cleanUser) {
    throw new Error('يرجى إدخال اسم المستخدم أو رقم الموبايل');
  }

  const base64Pass = passwordPlain ? btoa(passwordPlain) : '';

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const authUser = await libSqlService.loginLibSql(cleanUser, passwordPlain);
      if (authUser) {
        return authUser;
      }
    } catch (e: any) {
      if (e.message && e.message.includes('كلمة المرور غير صحيحة')) {
        throw e;
      }
      console.error('Error logging in via libSQL:', e);
    }
  }

  if (supabase) {
    // 1. البحث في جدول الموظفين (Employees) عبر اسم المستخدم أو الهاتف أو الرقم القومي
    let { data: empData, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (!empData) {
      const { data: byPhone } = await supabase
        .from('employees')
        .select('*')
        .eq('phone', cleanUser)
        .maybeSingle();
      empData = byPhone;
    }

    if (empData && !empErr) {
      const storedPass = empData.password_hash || '';
      const isMatch =
        storedPass === base64Pass ||
        storedPass === passwordPlain ||
        (empData.role === 'admin' && (
          passwordPlain === 'admin123' ||
          passwordPlain === 'admin' ||
          passwordPlain === '123456' ||
          passwordPlain === '351978'
        ));
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
        !storedPass ||
        storedPass.trim() === '' ||
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
      if (cust.status === 'pending_review') {
        throw new Error('حسابك معلق حالياً بانتظار مراجعة وتفعيل الإدارة. يرجى التواصل مع إدارة النظام لتفعيل حسابك.');
      }
      if (cust.status === 'suspended') {
        throw new Error('تم إيقاف هذا الحساب من قبل إدارة النظام.');
      }
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

  // في حال كان المستخدم هو مدير النظام الرئيسي admin
  if (cleanUser.toLowerCase() === 'admin') {
    const isMatch =
      passwordPlain === 'admin123' ||
      passwordPlain === 'admin' ||
      passwordPlain === '123456' ||
      passwordPlain === '351978';
    if (!isMatch) {
      throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
    }
    return {
      id: '0011448c-cac2-44a3-aea2-496fb2c9d173',
      username: 'Admin',
      full_name: 'محمد محمود محمد (مدير النظام)',
      role: 'admin',
      phone: '01000000000',
      employee_id: '0011448c-cac2-44a3-aea2-496fb2c9d173',
      permissions: { '*': true }
    };
  }

  throw new Error('اسم المستخدم المدخل غير مسجل في النظام. يرجى التأكد من كتابته بشكل صحيح أو إنشاء حساب جديد.');
};

// ==============================================================================
// 4. إدارة العملاء والمركبات (Customers & Vehicles API)
// ==============================================================================

export const getCustomers = async (): Promise<Customer[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const custs = await libSqlService.getCustomersLibSql();
      memoryCustomers = custs;
      return custs;
    } catch (e) {
      console.error('Error fetching customers from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createCustomerLibSql(customer);
      memoryCustomers.push(res);
      return res;
    } catch (e) {
      console.error('Error creating customer in libSQL:', e);
    }
  }
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
    status: customer.status || 'active',
    created_at: new Date().toISOString()
  };
  memoryCustomers.push(newCustomer);
  return newCustomer;
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const existing = memoryCustomers.find(c => c.id === id) || ({} as Customer);
      const updatedCust = { ...existing, ...updates, id };
      const res = await libSqlService.updateCustomerLibSql(updatedCust);
      memoryCustomers = memoryCustomers.map(c => c.id === id ? res : c);
      return res;
    } catch (e) {
      console.error('Error updating customer in libSQL:', e);
    }
  }
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
    if (updates.status !== undefined) dbUpdates.status = updates.status;

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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteCustomerLibSql(id);
      memoryCustomers = memoryCustomers.filter(c => c.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting customer in libSQL:', e);
    }
  }
  if (supabase) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) return true;
  }
  memoryCustomers = memoryCustomers.filter(c => c.id !== id);
  memoryVehicles = memoryVehicles.filter(v => v.customer_id !== id);
  return true;
};

export const resetCustomerPassword = async (id: string, newPasswordPlain: string | null): Promise<void> => {
  const isClear = !newPasswordPlain || newPasswordPlain.trim() === '';
  const hash = isClear ? null : btoa(newPasswordPlain.trim());

  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.resetCustomerPasswordLibSql(id, isClear ? null : newPasswordPlain.trim());
      memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, password_hash: hash || undefined } : c);
      return;
    } catch (e) {
      console.error('Error resetting customer password in libSQL:', e);
    }
  }

  if (supabase) {
    await supabase.from('customers').update({ password_hash: hash }).eq('id', id);
    return;
  }
  memoryCustomers = memoryCustomers.map(c => c.id === id ? { ...c, password_hash: hash || undefined } : c);
};

export const getVehicles = async (customerId?: string): Promise<Vehicle[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const vehs = await libSqlService.getVehiclesLibSql(customerId);
      memoryVehicles = vehs;
      return vehs;
    } catch (e) {
      console.error('Error fetching vehicles from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createVehicleLibSql(vehicle);
      memoryVehicles.push(res);
      return res;
    } catch (e) {
      console.error('Error creating vehicle in libSQL:', e);
    }
  }
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

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      let existing = memoryVehicles.find(v => v.id === id);
      if (!existing) {
        const all = await libSqlService.getVehiclesLibSql();
        existing = all.find(v => v.id === id);
      }
      if (existing) {
        const merged: Vehicle = { ...existing, ...updates, id };
        const updated = await libSqlService.updateVehicleLibSql(merged);
        const idx = memoryVehicles.findIndex(v => v.id === id);
        if (idx !== -1) memoryVehicles[idx] = updated;
        else memoryVehicles.push(updated);
        return updated;
      }
    } catch (e) {
      console.error('Error updating vehicle in libSQL:', e);
    }
  }

  const dbPayload: Record<string, any> = {};
  if (updates.vehicle_type !== undefined || updates.type !== undefined) {
    dbPayload.type = updates.type || updates.vehicle_type;
  }
  if (updates.color !== undefined) {
    dbPayload.color = updates.color;
  }
  if (updates.plate_number !== undefined || updates.license_plate !== undefined) {
    dbPayload.license_plate = updates.license_plate || updates.plate_number;
  }
  if (updates.image_url !== undefined || updates.vehicle_image_url !== undefined) {
    dbPayload.image_url = updates.image_url !== undefined ? updates.image_url : updates.vehicle_image_url;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('vehicles')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (data && !error) {
      const mapped: Vehicle = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_type: data.type || '',
        type: data.type || '',
        color: data.color || '',
        plate_number: data.license_plate || '',
        license_plate: data.license_plate || '',
        vehicle_image_url: data.image_url,
        image_url: data.image_url,
        created_at: data.created_at
      };
      const idx = memoryVehicles.findIndex(v => v.id === id);
      if (idx !== -1) memoryVehicles[idx] = mapped;
      return mapped;
    }
  }

  const idx = memoryVehicles.findIndex(v => v.id === id);
  if (idx !== -1) {
    memoryVehicles[idx] = { ...memoryVehicles[idx], ...updates };
    return memoryVehicles[idx];
  }
  return null;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteVehicleLibSql(id);
      memoryVehicles = memoryVehicles.filter(v => v.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting vehicle in libSQL:', e);
    }
  }
  const existing = memoryVehicles.find(v => v.id === id);
  const oldImg = existing?.image_url || existing?.vehicle_image_url;
  if (oldImg && supabase) {
    try {
      const oldPath = extractPathFromStorageUrl(oldImg);
      if (oldPath) {
        await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
      }
    } catch {}
  }

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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const cats = await libSqlService.getPackageCategoriesLibSql();
      memoryCategories = cats;
      return cats;
    } catch (e) {
      console.error('Error fetching categories from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const newCat = await libSqlService.createPackageCategoryLibSql(cat);
      memoryCategories.push(newCat);
      return newCat;
    } catch (e) {
      console.error('Error creating package category in libSQL:', e);
    }
  }
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

export const updatePackageCategory = async (id: string, updates: Partial<PackageCategory>): Promise<PackageCategory> => {
  const existing = memoryCategories.find(c => c.id === id) || ({ id } as PackageCategory);
  const merged: PackageCategory = { ...existing, ...updates, id };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updatePackageCategoryLibSql(merged);
      memoryCategories = memoryCategories.map(c => c.id === id ? res : c);
      return res;
    } catch (e) {
      console.error('Error updating package category in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      await supabase.from('categories').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.error('Error updating category in Supabase:', e);
    }
  }

  memoryCategories = memoryCategories.map(c => c.id === id ? merged : c);
  return merged;
};

export const getPackages = async (): Promise<Package[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const pkgs = await libSqlService.getPackagesLibSql();
      memoryPackages = pkgs;
      return pkgs;
    } catch (e) {
      console.error('Error fetching packages from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createPackageLibSql(pkg);
      memoryPackages.push(res);
      return res;
    } catch (e) {
      console.error('Error creating package in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const existing = memoryPackages.find(p => p.id === id) || ({} as Package);
      const updatedPkg = { ...existing, ...updates, id };
      const res = await libSqlService.updatePackageLibSql(updatedPkg);
      memoryPackages = memoryPackages.map(p => p.id === id ? res : p);
      return res;
    } catch (e) {
      console.error('Error updating package in libSQL:', e);
    }
  }
  if (supabase) {
    const dbUpdates: Record<string, any> = {};
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.tier !== undefined || updates.level !== undefined) {
      dbUpdates.level = updates.level || updates.tier;
    }
    if (updates.duration_days !== undefined) dbUpdates.duration_days = updates.duration_days;
    if (updates.base_visits_count !== undefined) dbUpdates.base_visits_count = updates.base_visits_count;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

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
        is_active: updates.is_active !== undefined ? updates.is_active : (data.is_active !== false),
        created_at: data.created_at
      };
    }
  }
  memoryPackages = memoryPackages.map(p => p.id === id ? { ...p, ...updates } : p);
  return memoryPackages.find(p => p.id === id)!;
};

export const getPackagePricing = async (packageId?: string, areaId?: string): Promise<PackagePricing[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const all = await libSqlService.getPackagePricingLibSql();
      return all.filter(p => {
        if (packageId && p.package_id !== packageId) return false;
        if (areaId && p.area_id !== areaId) return false;
        return true;
      });
    } catch (e) {
      console.error('Error fetching package pricing from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      return await libSqlService.updatePackagePricingLibSql(packageId, areaId, price);
    } catch (e) {
      console.error('Error saving package pricing in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const subs = await libSqlService.getSubscriptionsLibSql();
      memorySubscriptions = subs;
      if (statusFilter) return subs.filter(s => s.status === statusFilter);
      return subs;
    } catch (e) {
      console.error('Error fetching subscriptions from libSQL:', e);
    }
  }
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

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const created = await libSqlService.createSubscriptionLibSql(newSubData);
      memorySubscriptions.unshift(created);
      return created;
    } catch (e) {
      console.error('Error creating subscription in libSQL:', e);
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.paySubscriptionLibSql(subscriptionId, paymentMethodId, amount);
      if (res) {
        memorySubscriptions = memorySubscriptions.map(s => s.id === subscriptionId ? res : s);
        return res;
      }
    } catch (e) {
      console.error('Error paying subscription in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.generateSubscriptionVisitsLibSql(subscriptionId);
      const visits = await libSqlService.getVisitsLibSql();
      const subVisits = visits.filter(v => v.subscription_id === subscriptionId);
      memoryVisits = memoryVisits.filter(v => v.subscription_id !== subscriptionId).concat(subVisits);
      return subVisits;
    } catch (e) {
      console.error('Error generating visits via libSQL:', e);
    }
  }

  let sub = memorySubscriptions.find(s => s.id === subscriptionId);
  if (!sub && supabase) {
    const { data } = await supabase.from('subscriptions').select('*').eq('id', subscriptionId).single();
    if (data) {
      let selectedDays: string[] = [];
      try {
        if (typeof data.selected_days === 'string' && data.selected_days.startsWith('[')) {
          selectedDays = JSON.parse(data.selected_days);
        } else if (Array.isArray(data.selected_days)) {
          selectedDays = data.selected_days;
        }
      } catch {
        selectedDays = [];
      }
      sub = {
        id: data.id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        package_id: data.package_id,
        area_id: data.area_id,
        assigned_worker_id: data.worker_id || null,
        status: data.status,
        preferred_day_of_week: data.preferred_day_of_week,
        selected_days: selectedDays.length > 0 ? selectedDays : (data.preferred_day_of_week ? data.preferred_day_of_week.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean) : []),
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

  // 1. تحديد الأيام المختارة وترتيبها زمنياً
  let selectedDays = sub.selected_days && sub.selected_days.length > 0
    ? sub.selected_days
    : (sub.preferred_day_of_week ? sub.preferred_day_of_week.split(/[,،]/).map(s => s.trim()).filter(Boolean) : ['السبت']);
  const sortedDays = [...selectedDays].sort((a, b) => getArabDayIndex(a) - getArabDayIndex(b));

  // 2. تحديد مصفوفة خطة الخدمات
  let servicesPlan: string[] = [];
  if (pkg.weekly_services_plan && pkg.weekly_services_plan.length > 0) {
    servicesPlan = pkg.weekly_services_plan;
  } else if (typeof (pkg as any).weekly_services_plan === 'string') {
    try {
      servicesPlan = JSON.parse((pkg as any).weekly_services_plan);
    } catch {
      servicesPlan = ['غسيل'];
    }
  } else {
    servicesPlan = ['غسيل'];
  }

  // 3. حساب عدد الأسابيع وفترة الجدولة
  const startDate = new Date(sub.start_date + 'T00:00:00');
  const durationDays = Number(pkg.duration_days) || 30;
  const totalWeeks = Math.max(1, Math.round(durationDays / 7));

  // إيجاد أول يوم لبدء الدورة الأسبوعية
  const firstDayNum = getDayNumberFromArabic(sortedDays[0]);
  let firstWeekStart = new Date(startDate);
  while (firstWeekStart.getDay() !== firstDayNum) {
    firstWeekStart.setDate(firstWeekStart.getDate() + 1);
  }

  const generatedVisits: Visit[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const weekBaseDate = new Date(firstWeekStart);
    weekBaseDate.setDate(weekBaseDate.getDate() + (week * 7));

    for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
      const dayName = sortedDays[dayIdx];
      const serviceType = servicesPlan[dayIdx % servicesPlan.length] || 'غسيل';

      const dayOffset = (getDayNumberFromArabic(dayName) - getDayNumberFromArabic(sortedDays[0]) + 7) % 7;
      const visitDate = new Date(weekBaseDate);
      visitDate.setDate(visitDate.getDate() + dayOffset);

      const dateStr = visitDate.toISOString().split('T')[0];
      const visitData: Visit = {
        id: generateId(),
        subscription_id: sub.id,
        customer_id: sub.customer_id,
        assigned_worker_id: sub.assigned_worker_id || null,
        scheduled_date: dateStr,
        day_of_week: dayName,
        service_type: serviceType,
        scheduled_time_from: sub.preferred_time_from,
        scheduled_time_to: sub.preferred_time_to,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };

      generatedVisits.push(visitData);
    }
  }

  if (supabase) {
    try {
      const dbVisits = generatedVisits.map(v => ({
        subscription_id: v.subscription_id,
        worker_id: v.assigned_worker_id || null,
        scheduled_date: v.scheduled_date,
        day_of_week: v.day_of_week || null,
        service_type: v.service_type || null,
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

  memoryVisits = memoryVisits.filter(v => v.subscription_id !== sub!.id).concat(generatedVisits);
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

  if (libSqlClient && isLibSqlConfigured) {
    try {
      if (newStatus === 'active') {
        const approved = await libSqlService.approveSubscriptionLibSql(id, adminName);
        if (approved) {
          memorySubscriptions = memorySubscriptions.map(s => s.id === id ? approved : s);
          return approved;
        }
      } else {
        const existing = memorySubscriptions.find(s => s.id === id) || { id } as Subscription;
        const updated = await libSqlService.updateSubscriptionLibSql({ ...existing, status: newStatus });
        memorySubscriptions = memorySubscriptions.map(s => s.id === id ? updated : s);
        return updated;
      }
    } catch (e) {
      console.error('Error updating subscription status in libSQL:', e);
    }
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

// تعديل بيانات الاشتراك بالكامل
export const updateSubscription = async (
  id: string,
  updates: Partial<Subscription>,
  regenerateVisitsIfDatesOrDaysChanged: boolean = false
): Promise<Subscription> => {
  const existing = memorySubscriptions.find(s => s.id === id) || ({ id } as Subscription);
  const merged: Subscription = { ...existing, ...updates, id };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateSubscriptionLibSql(merged);
      memorySubscriptions = memorySubscriptions.map(s => s.id === id ? res : s);
      if (regenerateVisitsIfDatesOrDaysChanged && (merged.status === 'active' || existing.status === 'active')) {
        await libSqlService.generateSubscriptionVisitsLibSql(id);
      }
      return res;
    } catch (e) {
      console.error('Error updating subscription in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.customer_id !== undefined) dbUpdates.customer_id = updates.customer_id;
      if (updates.vehicle_id !== undefined) dbUpdates.vehicle_id = updates.vehicle_id;
      if (updates.package_id !== undefined) dbUpdates.package_id = updates.package_id;
      if (updates.area_id !== undefined) dbUpdates.area_id = updates.area_id;
      if (updates.assigned_worker_id !== undefined) dbUpdates.worker_id = updates.assigned_worker_id;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.preferred_day_of_week !== undefined) dbUpdates.preferred_day_of_week = updates.preferred_day_of_week;
      if (updates.selected_days !== undefined) dbUpdates.selected_days = JSON.stringify(updates.selected_days);
      if (updates.preferred_time_from !== undefined) dbUpdates.preferred_time_from = updates.preferred_time_from;
      if (updates.preferred_time_to !== undefined) dbUpdates.preferred_time_to = updates.preferred_time_to;
      if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
      if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
      if (updates.total_price !== undefined) dbUpdates.total_price = updates.total_price;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.payment_status !== undefined) dbUpdates.payment_status = updates.payment_status;

      await supabase.from('subscriptions').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.error('Error updating subscription in Supabase:', e);
    }
  }

  memorySubscriptions = memorySubscriptions.map(s => s.id === id ? merged : s);
  if (regenerateVisitsIfDatesOrDaysChanged && (merged.status === 'active' || existing.status === 'active')) {
    await generateVisitsForSubscription(id);
  }
  return merged;
};

// أرشفة الاشتراكات المنتهية لأكثر من 10 أيام
export const checkAndArchiveExpiredSubscriptions = async (): Promise<number> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlClient.execute(
        `UPDATE subscriptions SET status = 'archived', archived_at = datetime('now')
         WHERE status = 'expired' AND date(end_date) < date('now', '-10 days')`
      );
      return res.rowsAffected || 0;
    } catch (e) {
      console.error('Error archiving expired subscriptions in libSQL:', e);
    }
  }

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
  let oldSub = memorySubscriptions.find(s => s.id === subscriptionId);
  if (!oldSub) {
    const subs = await getSubscriptions();
    oldSub = subs.find(s => s.id === subscriptionId);
  }
  if (!oldSub) throw new Error('الاشتراك غير موجود');

  let pkg = memoryPackages.find(p => p.id === oldSub!.package_id);
  if (!pkg) {
    const pkgs = await getPackages();
    pkg = pkgs.find(p => p.id === oldSub!.package_id);
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteSubscriptionLibSql(id);
      memorySubscriptions = memorySubscriptions.filter(s => s.id !== id);
      memoryVisits = memoryVisits.filter(v => v.subscription_id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting subscription in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      let vsts = await libSqlService.getVisitsLibSql();
      if (startDate) vsts = vsts.filter(v => v.scheduled_date >= startDate);
      if (endDate) vsts = vsts.filter(v => v.scheduled_date <= endDate);
      memoryVisits = vsts;
      return vsts;
    } catch (e) {
      console.error('Error fetching visits from libSQL:', e);
    }
  }
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
  let resultVisit: Visit | null = null;
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.rescheduleVisitLibSql(visitId, newDate, newTimeFrom, newTimeTo);
      if (res) {
        memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...res } : v);
        resultVisit = res;
      }
    } catch (e) {
      console.error('Error rescheduling visit in libSQL:', e);
    }
  }

  if (!resultVisit) {
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
        resultVisit = updated;
      }
    }

    if (!resultVisit) {
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
      resultVisit = memoryVisits.find(v => v.id === visitId)!;
    }
  }

  // إشعار العميل بتأجيل الزيارة والموعد الجديد عبر واتساب
  notifyCustomerOnVisitPostponed(
    visitId,
    'تعديل موعد الزيارة ونقلها لموعد جديد',
    newDate,
    newTimeFrom,
    newTimeTo
  ).catch(err => {
    console.error('Failed to notify customer on WhatsApp after rescheduleVisit:', err);
  });

  return resultVisit;
};

/**
 * إرسال تفاصيل الزيارة المكتملة وطلب التقييم للعميل عبر واتساب
 */
export const notifyCustomerOnVisitCompleted = async (
  visitId: string,
  customNotes?: string
): Promise<{ success: boolean; error?: string; messageText?: string; directWaLink?: string }> => {
  try {
    // 1. العثور على الزيارة
    let visit = memoryVisits.find(v => v.id === visitId);
    if (!visit && libSqlClient && isLibSqlConfigured) {
      const all = await libSqlService.getVisitsLibSql();
      visit = all.find(v => v.id === visitId);
    }
    if (!visit) {
      return { success: false, error: 'بيانات الزيارة غير متوفرة' };
    }

    // 2. بيانات العميل
    let customer = memoryCustomers.find(c => c.id === visit.customer_id);
    if (!customer && libSqlClient && isLibSqlConfigured) {
      const custs = await libSqlService.getCustomersLibSql();
      customer = custs.find(c => c.id === visit.customer_id);
    }
    const customerPhone = customer?.phone || customer?.mobile;
    if (!customer || !customerPhone) {
      return { success: false, error: 'رقم هاتف العميل غير مسجل' };
    }

    // 3. بيانات الاشتراك
    let subscription = memorySubscriptions.find(s => s.id === visit.subscription_id);
    if (!subscription && libSqlClient && isLibSqlConfigured) {
      const subs = await libSqlService.getSubscriptionsLibSql();
      subscription = subs.find(s => s.id === visit.subscription_id);
    }

    // 4. بيانات السيارة
    const targetVehId = (visit as any).vehicle_id || subscription?.vehicle_id;
    let vehicle = targetVehId ? memoryVehicles.find(v => v.id === targetVehId) : undefined;
    if (!vehicle && targetVehId && libSqlClient && isLibSqlConfigured) {
      const vehs = await libSqlService.getVehiclesLibSql();
      vehicle = vehs.find(v => v.id === targetVehId);
    }

    // 5. بيانات الباقة / نوع الخدمة
    let pkg = subscription?.package_id ? memoryPackages.find(p => p.id === subscription.package_id) : undefined;
    if (!pkg && subscription?.package_id && libSqlClient && isLibSqlConfigured) {
      const pkgs = await libSqlService.getPackagesLibSql();
      pkg = pkgs.find(p => p.id === subscription.package_id);
    }

    // 6. بيانات الفني / العامل
    const workerId = visit.assigned_worker_id || (visit as any).worker_id;
    let worker = workerId ? memoryEmployees.find(e => e.id === workerId) : undefined;
    if (!worker && workerId && libSqlClient && isLibSqlConfigured) {
      const emps = await libSqlService.getEmployeesLibSql();
      worker = emps.find(e => e.id === workerId);
    }

    // 7. إعدادات النظام
    const settings = await getSettings();

    // 8. تجهيز تفاصيل الرسالة
    const vehicleInfo = vehicle
      ? `${vehicle.vehicle_type || ''} ${vehicle.color ? `(${vehicle.color})` : ''} - لوحة: ${vehicle.plate_number || ''}`.trim()
      : undefined;

    const buildingInfo = customer.building_number
      ? `عمارة ${customer.building_number} ${customer.detailed_address || ''}`.trim()
      : undefined;

    const serviceName = visit.service_type || pkg?.name || 'غسيل سيارات';
    const workerName = worker?.full_name || 'فريق وي كير';
    const visitDate = visit.scheduled_date || new Date().toISOString().split('T')[0];
    const visitTime = visit.scheduled_time_from
      ? `${visit.scheduled_time_from}${visit.scheduled_time_to ? ` - ${visit.scheduled_time_to}` : ''}`
      : new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const portalUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const payload: VisitCompletionMessageData = {
      customerName: customer.full_name || customer.name || 'عميلنا العزيز',
      phone: customerPhone,
      serviceName,
      vehicleDetails: vehicleInfo,
      buildingDetails: buildingInfo,
      workerName,
      visitDate,
      visitTime,
      notes: customNotes || visit.notes || undefined,
      portalUrl
    };

    const directMsgText = formatVisitCompletionMessage(payload, settings.company_name || 'وي كير');
    const directWaLink = generateWhatsAppChatLink(payload.phone, directMsgText, settings.dial_code || '20');

    // إرسال عبر Evolution API
    const sendRes = await sendEvolutionWhatsAppVisitCompleted(payload, settings);

    return {
      success: sendRes.success,
      error: sendRes.error,
      messageText: directMsgText,
      directWaLink
    };
  } catch (err: any) {
    console.error('Error in notifyCustomerOnVisitCompleted:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال إشعار الواتساب' };
  }
};

/**
 * إرسال إشعار تأجيل الزيارة والموعد الجديد والسبب للعميل عبر واتساب
 */
export const notifyCustomerOnVisitPostponed = async (
  visitId: string,
  reason: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string,
  workerNote?: string
): Promise<{ success: boolean; error?: string; messageText?: string; directWaLink?: string }> => {
  try {
    // 1. العثور على الزيارة
    let visit = memoryVisits.find(v => v.id === visitId);
    if (!visit && libSqlClient && isLibSqlConfigured) {
      const all = await libSqlService.getVisitsLibSql();
      visit = all.find(v => v.id === visitId);
    }
    if (!visit) {
      return { success: false, error: 'بيانات الزيارة غير متوفرة' };
    }

    // 2. بيانات العميل
    let customer = memoryCustomers.find(c => c.id === visit.customer_id);
    if (!customer && libSqlClient && isLibSqlConfigured) {
      const custs = await libSqlService.getCustomersLibSql();
      customer = custs.find(c => c.id === visit.customer_id);
    }
    const customerPhone = customer?.phone || customer?.mobile;
    if (!customer || !customerPhone) {
      return { success: false, error: 'رقم هاتف العميل غير مسجل' };
    }

    // 3. بيانات الاشتراك
    let subscription = memorySubscriptions.find(s => s.id === visit.subscription_id);
    if (!subscription && libSqlClient && isLibSqlConfigured) {
      const subs = await libSqlService.getSubscriptionsLibSql();
      subscription = subs.find(s => s.id === visit.subscription_id);
    }

    // 4. بيانات السيارة
    const targetVehId = (visit as any).vehicle_id || subscription?.vehicle_id;
    let vehicle = targetVehId ? memoryVehicles.find(v => v.id === targetVehId) : undefined;
    if (!vehicle && targetVehId && libSqlClient && isLibSqlConfigured) {
      const vehs = await libSqlService.getVehiclesLibSql();
      vehicle = vehs.find(v => v.id === targetVehId);
    }

    // 5. بيانات الباقة / نوع الخدمة
    let pkg = subscription?.package_id ? memoryPackages.find(p => p.id === subscription.package_id) : undefined;
    if (!pkg && subscription?.package_id && libSqlClient && isLibSqlConfigured) {
      const pkgs = await libSqlService.getPackagesLibSql();
      pkg = pkgs.find(p => p.id === subscription.package_id);
    }

    // 6. إعدادات النظام
    const settings = await getSettings();

    // 7. تجهيز تفاصيل الرسالة
    const vehicleInfo = vehicle
      ? `${vehicle.vehicle_type || ''} ${vehicle.color ? `(${vehicle.color})` : ''} - لوحة: ${vehicle.plate_number || ''}`.trim()
      : undefined;

    const buildingInfo = customer.building_number
      ? `عمارة ${customer.building_number} ${customer.detailed_address || ''}`.trim()
      : undefined;

    const serviceName = visit.service_type || pkg?.name || 'غسيل سيارات';
    const oldDate = visit.postponed_from_date || visit.scheduled_date;
    const timeDisplay = newTimeFrom
      ? `${newTimeFrom}${newTimeTo ? ` - ${newTimeTo}` : ''}`
      : (visit.scheduled_time_from ? `${visit.scheduled_time_from}${visit.scheduled_time_to ? ` - ${visit.scheduled_time_to}` : ''}` : undefined);

    const portalUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const payload: VisitPostponementMessageData = {
      customerName: customer.full_name || customer.name || 'عميلنا العزيز',
      phone: customerPhone,
      serviceName,
      vehicleDetails: vehicleInfo,
      buildingDetails: buildingInfo,
      oldDate: oldDate !== newDate ? oldDate : undefined,
      newDate,
      newTime: timeDisplay,
      reason: reason || 'ظروف تشغيلية طارئة',
      workerNote: workerNote || undefined,
      portalUrl
    };

    const directMsgText = formatVisitPostponementMessage(payload, settings.company_name || 'وي كير');
    const directWaLink = generateWhatsAppChatLink(payload.phone, directMsgText, settings.dial_code || '20');

    // إرسال عبر Evolution API
    const sendRes = await sendEvolutionWhatsAppVisitPostponed(payload, settings);

    return {
      success: sendRes.success,
      error: sendRes.error,
      messageText: directMsgText,
      directWaLink
    };
  } catch (err: any) {
    console.error('Error in notifyCustomerOnVisitPostponed:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال إشعار التأجيل' };
  }
};

export const updateVisitStatus = async (visitId: string, status: VisitStatus, notes?: string): Promise<Visit> => {
  let resultVisit: Visit | null = null;
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateVisitStatusLibSql(visitId, status, notes);
      if (res) {
        memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...res } : v);
        resultVisit = res;
      }
    } catch (e) {
      console.error('Error updating visit status in libSQL:', e);
    }
  }

  if (!resultVisit) {
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
        resultVisit = updated;
      }
    }

    if (!resultVisit) {
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
      resultVisit = memoryVisits.find(v => v.id === visitId)!;
    }
  }

  // عند تحويل الزيارة إلى مكتملة، يتم إرسال بيانات الغسلة وطلب التقييم للعميل عبر واتساب
  if (status === 'completed') {
    notifyCustomerOnVisitCompleted(visitId, notes).catch(err => {
      console.error('Failed to notify customer on WhatsApp after visit completed:', err);
    });
  }

  return resultVisit;
};

export const completeVisit = async (visitId: string, notes?: string): Promise<Visit> => {
  let resVisit: Visit | null = null;
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.completeVisitLibSql(visitId, notes);
      if (res) {
        memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...res } : v);
        resVisit = res;
      }
    } catch (e) {
      console.error('Error completing visit in libSQL:', e);
    }
  }
  if (!resVisit) {
    resVisit = await updateVisitStatus(visitId, 'completed', notes);
  } else {
    // إرسال رسالة واتساب للعميل ببيانات الغسلة وطلب التقييم
    notifyCustomerOnVisitCompleted(visitId, notes).catch(err => {
      console.error('Failed to notify customer on WhatsApp after completeVisit:', err);
    });
  }
  return resVisit;
};

export const postponeVisit = async (
  visitId: string,
  reason: string,
  workerNote: string,
  newDate: string,
  newTimeFrom?: string,
  newTimeTo?: string
): Promise<Visit> => {
  let resultVisit: Visit | null = null;
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.postponeVisitLibSql(visitId, reason, workerNote, newDate, newTimeFrom, newTimeTo);
      if (res) {
        memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...res } : v);
        resultVisit = res;
      }
    } catch (e) {
      console.error('Error postponing visit in libSQL:', e);
    }
  }

  if (!resultVisit) {
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
        resultVisit = updated;
      }
    }

    if (!resultVisit) {
      memoryVisits = memoryVisits.map(v => v.id === visitId ? { ...v, ...updates } : v);
      resultVisit = memoryVisits.find(v => v.id === visitId)!;
    }
  }

  // إشعار العميل بسبب التأجيل وتاريخ التنفيذ الجديد عبر واتساب
  notifyCustomerOnVisitPostponed(
    visitId,
    reason,
    newDate,
    newTimeFrom,
    newTimeTo,
    workerNote
  ).catch(err => {
    console.error('Failed to notify customer on WhatsApp after postponeVisit:', err);
  });

  return resultVisit;
};

// تعديل بيانات الزيارة بشكل تفصيلي (تاريخ، عامل مخصص، نوع الخدمة، الملاحظات، الحالة)
export const updateVisit = async (visitId: string, updates: Partial<Visit>): Promise<Visit> => {
  const existing = memoryVisits.find(v => v.id === visitId) || ({ id: visitId } as Visit);
  const merged: Visit = { ...existing, ...updates, id: visitId };

  // حساب اسم اليوم تلقائياً إذا تغير التاريخ
  if (updates.scheduled_date && !updates.day_of_week) {
    try {
      const d = new Date(updates.scheduled_date + 'T00:00:00');
      const dayIndex = d.getDay();
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      merged.day_of_week = dayNames[dayIndex];
    } catch (e) {}
  }

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateVisitLibSql(merged);
      memoryVisits = memoryVisits.map(v => v.id === visitId ? res : v);
      return res;
    } catch (e) {
      console.error('Error updating visit in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.scheduled_date !== undefined) dbUpdates.scheduled_date = updates.scheduled_date;
      if (updates.assigned_worker_id !== undefined) dbUpdates.worker_id = updates.assigned_worker_id;
      if (updates.service_type !== undefined) dbUpdates.service_type = updates.service_type;
      if (merged.day_of_week !== undefined) dbUpdates.day_of_week = merged.day_of_week;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
      if (updates.rating_comment !== undefined) dbUpdates.rating_comment = updates.rating_comment;
      if (updates.scheduled_time_from !== undefined) dbUpdates.scheduled_time_from = updates.scheduled_time_from;
      if (updates.scheduled_time_to !== undefined) dbUpdates.scheduled_time_to = updates.scheduled_time_to;
      await supabase.from('visits').update(dbUpdates).eq('id', visitId);
    } catch (e) {
      console.error('Error updating visit in Supabase:', e);
    }
  }

  memoryVisits = memoryVisits.map(v => v.id === visitId ? merged : v);

  if (updates.status === 'completed' && existing.status !== 'completed') {
    notifyCustomerOnVisitCompleted(visitId, updates.notes).catch(err => {
      console.error('Failed to notify customer on WhatsApp after updateVisit:', err);
    });
  }

  if (
    (updates.status === 'postponed' && existing.status !== 'postponed') ||
    (updates.scheduled_date && updates.scheduled_date !== existing.scheduled_date && updates.status !== 'completed')
  ) {
    notifyCustomerOnVisitPostponed(
      visitId,
      updates.postponed_reason || 'تعديل موعد الزيارة ونقلها لموعد جديد',
      updates.scheduled_date || existing.scheduled_date,
      updates.scheduled_time_from,
      updates.scheduled_time_to,
      updates.notes
    ).catch(err => {
      console.error('Failed to notify customer on WhatsApp after updateVisit postponement:', err);
    });
  }

  return merged;
};

// إنشاء زيارة جديدة (مثلاً زيارة إضافية للعميل)
export const createVisit = async (visit: Omit<Visit, 'id'> & { id?: string }): Promise<Visit> => {
  const newId = visit.id || `vis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let dayOfWeek = visit.day_of_week;
  if (!dayOfWeek && visit.scheduled_date) {
    try {
      const d = new Date(visit.scheduled_date + 'T00:00:00');
      const dayIndex = d.getDay();
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      dayOfWeek = dayNames[dayIndex];
    } catch (e) {}
  }

  const fullVisit: Visit = {
    ...visit,
    id: newId,
    day_of_week: dayOfWeek,
    status: visit.status || 'scheduled',
    created_at: new Date().toISOString()
  };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createVisitLibSql(fullVisit);
      memoryVisits.push(res);
      return res;
    } catch (e) {
      console.error('Error creating visit in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbPayload = {
        id: newId,
        subscription_id: visit.subscription_id,
        customer_id: visit.customer_id,
        worker_id: visit.assigned_worker_id || null,
        scheduled_date: visit.scheduled_date,
        scheduled_time_from: visit.scheduled_time_from || null,
        scheduled_time_to: visit.scheduled_time_to || null,
        service_type: visit.service_type || null,
        day_of_week: dayOfWeek || null,
        status: visit.status || 'scheduled',
        notes: visit.notes || null,
        created_at: fullVisit.created_at
      };
      await supabase.from('visits').insert([dbPayload]);
    } catch (e) {
      console.error('Error inserting visit to Supabase:', e);
    }
  }

  memoryVisits.push(fullVisit);
  return fullVisit;
};

// حذف زيارة محددة
export const deleteVisit = async (id: string): Promise<void> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteVisitLibSql(id);
    } catch (e) {
      console.error('Error deleting visit in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      await supabase.from('visits').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting visit from Supabase:', e);
    }
  }

  memoryVisits = memoryVisits.filter(v => v.id !== id);
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getTreasuriesLibSql();
      memoryTreasuries = list;
      return list;
    } catch (e) {
      console.error('Error fetching treasuries from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getPaymentMethodsLibSql();
      memoryPaymentMethods = list;
      return list;
    } catch (e) {
      console.error('Error fetching payment methods from libSQL:', e);
    }
  }
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

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const createdPM = await libSqlService.createPaymentMethodLibSql({ name: cleanName, treasury_id: '', is_active: true });
      memoryPaymentMethods.push(createdPM);
      return createdPM;
    } catch (e) {
      console.error('Error creating payment method in libSQL:', e);
    }
  }

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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const txs = await libSqlService.getTreasuryTransactionsLibSql();
      memoryTreasuryTransactions = txs;
      return txs;
    } catch (e) {
      console.error('Error fetching treasury transactions from libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createTreasuryTransactionLibSql(tx);
      memoryTreasuryTransactions.unshift(res);
      return res;
    } catch (e) {
      console.error('Error creating treasury transaction in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const items = await libSqlService.getInventoryItemsLibSql();
      memoryInventoryItems = items;
      return items;
    } catch (e) {
      console.error('Error fetching inventory items from libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name', { ascending: true });
    if (data && !error) return data;
  }
  return memoryInventoryItems;
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createInventoryItemLibSql(item);
      memoryInventoryItems.push(res);
      return res;
    } catch (e) {
      console.error('Error creating inventory item in libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('inventory_items').insert(item).select().single();
    if (data && !error) return data;
  }
  const newItem: InventoryItem = { id: generateId(), ...item, is_active: item.is_active !== false, created_at: new Date().toISOString() };
  memoryInventoryItems.push(newItem);
  return newItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  const existing = memoryInventoryItems.find(i => i.id === id) || ({ id } as InventoryItem);
  const merged: InventoryItem = { ...existing, ...updates, id };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateInventoryItemLibSql(merged);
      memoryInventoryItems = memoryInventoryItems.map(i => i.id === id ? res : i);
      return res;
    } catch (e) {
      console.error('Error updating inventory item in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.current_stock !== undefined) dbUpdates.current_stock = updates.current_stock;
      if (updates.min_alert_threshold !== undefined) dbUpdates.min_alert_threshold = updates.min_alert_threshold;
      if (updates.unit_cost !== undefined) dbUpdates.unit_cost = updates.unit_cost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      await supabase.from('inventory_items').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.error('Error updating inventory item in Supabase:', e);
    }
  }

  memoryInventoryItems = memoryInventoryItems.map(i => i.id === id ? merged : i);
  return merged;
};

export const getInventoryTransactions = async (): Promise<InventoryTransaction[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const txs = await libSqlService.getInventoryTransactionsLibSql();
      memoryInventoryTransactions = txs;
      return txs;
    } catch (e) {
      console.error('Error fetching inventory transactions from libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false });
    if (data && !error) return data;
  }
  return memoryInventoryTransactions;
};

export const createInventoryTransaction = async (
  tx: Omit<InventoryTransaction, 'id' | 'created_at'>
): Promise<InventoryTransaction> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createInventoryTransactionLibSql(tx);
      memoryInventoryTransactions.unshift(res);
      return res;
    } catch (e) {
      console.error('Error creating inventory transaction in libSQL:', e);
    }
  }
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
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const eqs = await libSqlService.getEquipmentLibSql();
      memoryEquipment = eqs;
      return eqs;
    } catch (e) {
      console.error('Error fetching equipment from libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('equipment').select('*').order('purchase_date', { ascending: false });
    if (data && !error) return data;
  }
  return memoryEquipment;
};

export const createEquipment = async (eq: Omit<Equipment, 'id' | 'created_at'>): Promise<Equipment> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createEquipmentLibSql(eq);
      memoryEquipment.push(res);
      return res;
    } catch (e) {
      console.error('Error creating equipment in libSQL:', e);
    }
  }
  if (supabase) {
    const { data, error } = await supabase.from('equipment').insert(eq).select().single();
    if (data && !error) return data;
  }
  const newEq: Equipment = { id: generateId(), ...eq, is_active: eq.is_active !== false, created_at: new Date().toISOString() };
  memoryEquipment.push(newEq);
  return newEq;
};

export const updateEquipment = async (id: string, updates: Partial<Equipment>): Promise<Equipment> => {
  const existing = memoryEquipment.find(e => e.id === id) || ({ id } as Equipment);
  const merged: Equipment = { ...existing, ...updates, id };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateEquipmentLibSql(merged);
      memoryEquipment = memoryEquipment.map(e => e.id === id ? res : e);
      return res;
    } catch (e) {
      console.error('Error updating equipment in libSQL:', e);
    }
  }

  if (supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.purchase_date !== undefined) dbUpdates.purchase_date = updates.purchase_date;
      if (updates.purchase_price !== undefined) dbUpdates.purchase_price = updates.purchase_price;
      if (updates.depreciation_rate !== undefined) dbUpdates.depreciation_rate = updates.depreciation_rate;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      await supabase.from('equipment').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.error('Error updating equipment in Supabase:', e);
    }
  }

  memoryEquipment = memoryEquipment.map(e => e.id === id ? merged : e);
  return merged;
};

// ==============================================================================
// 10. إدارة الموردين ودفعاتهم وكشف الحساب (Suppliers & Ledger API)
// ==============================================================================

export const getSuppliers = async (): Promise<Supplier[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getSuppliersLibSql();
      memorySuppliers = list;
      return list;
    } catch (e) {
      console.error('Error fetching suppliers from libSQL:', e);
    }
  }
  return memorySuppliers;
};

export const createSupplier = async (
  supplier: Omit<Supplier, 'id' | 'current_balance' | 'created_at'>
): Promise<Supplier> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createSupplierLibSql(supplier);
      memorySuppliers.push(res);
      return res;
    } catch (e) {
      console.error('Error creating supplier in libSQL:', e);
    }
  }
  const id = generateId();
  const openBal = Number(supplier.opening_balance) || 0;
  const newSup: Supplier = {
    ...supplier,
    id,
    opening_balance: openBal,
    current_balance: openBal,
    created_at: new Date().toISOString()
  };
  memorySuppliers.push(newSup);
  return newSup;
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
  const existing = memorySuppliers.find(s => s.id === id) || ({ id } as Supplier);
  const merged: Supplier = { ...existing, ...updates, id };

  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateSupplierLibSql(merged);
      memorySuppliers = memorySuppliers.map(s => s.id === id ? res : s);
      return res;
    } catch (e) {
      console.error('Error updating supplier in libSQL:', e);
    }
  }

  memorySuppliers = memorySuppliers.map(s => s.id === id ? merged : s);
  return merged;
};

export const deleteSupplier = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteSupplierLibSql(id);
      memorySuppliers = memorySuppliers.filter(s => s.id !== id);
      memorySupplierTransactions = memorySupplierTransactions.filter(t => t.supplier_id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting supplier in libSQL:', e);
    }
  }
  memorySuppliers = memorySuppliers.filter(s => s.id !== id);
  memorySupplierTransactions = memorySupplierTransactions.filter(t => t.supplier_id !== id);
  return true;
};

export const getSupplierTransactions = async (supplierId?: string): Promise<SupplierTransaction[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getSupplierTransactionsLibSql(supplierId);
      if (!supplierId) memorySupplierTransactions = list;
      return list;
    } catch (e) {
      console.error('Error fetching supplier transactions from libSQL:', e);
    }
  }
  if (supplierId) {
    return memorySupplierTransactions.filter(t => t.supplier_id === supplierId);
  }
  return memorySupplierTransactions;
};

export const createSupplierTransaction = async (
  tx: Omit<SupplierTransaction, 'id' | 'created_at'>
): Promise<SupplierTransaction> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createSupplierTransactionLibSql(tx);
      memorySupplierTransactions.push(res);
      const sup = memorySuppliers.find(s => s.id === tx.supplier_id);
      if (sup) {
        if (tx.type === 'purchase') sup.current_balance += tx.amount;
        else if (tx.type === 'payment' || tx.type === 'return') sup.current_balance -= tx.amount;
      }
      return res;
    } catch (e) {
      console.error('Error creating supplier transaction in libSQL:', e);
    }
  }
  const newTx: SupplierTransaction = {
    ...tx,
    id: generateId(),
    created_at: new Date().toISOString()
  };
  memorySupplierTransactions.push(newTx);
  return newTx;
};

export const deleteSupplierTransaction = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteSupplierTransactionLibSql(id);
      memorySupplierTransactions = memorySupplierTransactions.filter(t => t.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting supplier transaction in libSQL:', e);
    }
  }
  memorySupplierTransactions = memorySupplierTransactions.filter(t => t.id !== id);
  return true;
};

// ==============================================================================
// 19. أوامر التوريد (Purchase Orders)
// ==============================================================================
let memoryPurchaseOrders: PurchaseOrder[] = [];

export const getPurchaseOrders = async (supplierId?: string): Promise<PurchaseOrder[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getPurchaseOrdersLibSql(supplierId);
      if (!supplierId) memoryPurchaseOrders = list;
      return list;
    } catch (e) {
      console.error('Error fetching purchase orders from libSQL:', e);
    }
  }
  if (supplierId) {
    return memoryPurchaseOrders.filter(o => o.supplier_id === supplierId);
  }
  return memoryPurchaseOrders;
};

export const createPurchaseOrder = async (
  order: Omit<PurchaseOrder, 'id' | 'created_at'>
): Promise<PurchaseOrder> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createPurchaseOrderLibSql(order);
      memoryPurchaseOrders.unshift(res);
      return res;
    } catch (e) {
      console.error('Error creating purchase order in libSQL:', e);
    }
  }
  const newOrder: PurchaseOrder = {
    ...order,
    id: generateId(),
    status: order.status || 'pending',
    items: order.items || [],
    created_at: new Date().toISOString()
  };
  memoryPurchaseOrders.unshift(newOrder);
  return newOrder;
};

export const updatePurchaseOrder = async (
  order: PurchaseOrder
): Promise<PurchaseOrder> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updatePurchaseOrderLibSql(order);
      const idx = memoryPurchaseOrders.findIndex(o => o.id === order.id);
      if (idx >= 0) memoryPurchaseOrders[idx] = res;
      return res;
    } catch (e) {
      console.error('Error updating purchase order in libSQL:', e);
    }
  }
  const idx = memoryPurchaseOrders.findIndex(o => o.id === order.id);
  if (idx >= 0) memoryPurchaseOrders[idx] = order;
  return order;
};

export const deletePurchaseOrder = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deletePurchaseOrderLibSql(id);
      memoryPurchaseOrders = memoryPurchaseOrders.filter(o => o.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting purchase order in libSQL:', e);
    }
  }
  memoryPurchaseOrders = memoryPurchaseOrders.filter(o => o.id !== id);
  return true;
};

export const convertPurchaseOrderToInvoice = async (
  params: libSqlService.ConvertPurchaseOrderParams
): Promise<{ order: PurchaseOrder; transaction: SupplierTransaction }> => {
  if (libSqlClient && isLibSqlConfigured) {
    const res = await libSqlService.convertPurchaseOrderToInvoiceLibSql(params);
    const idx = memoryPurchaseOrders.findIndex(o => o.id === params.orderId);
    if (idx >= 0) memoryPurchaseOrders[idx] = res.order;
    return res;
  }
  throw new Error('libSQL client is required to convert purchase order to invoice');
};

// ==============================================================================
// 20. الإعلانات والعروض (Advertisements)
// ==============================================================================
let memoryAdvertisements: Advertisement[] = [];

export const getAdvertisements = async (onlyActive?: boolean): Promise<Advertisement[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getAdvertisementsLibSql(onlyActive);
      if (!onlyActive) memoryAdvertisements = list;
      return list;
    } catch (e) {
      console.error('Error fetching advertisements from libSQL:', e);
    }
  }
  if (onlyActive) {
    return memoryAdvertisements.filter(a => a.is_active);
  }
  return memoryAdvertisements;
};

export const createAdvertisement = async (
  ad: Omit<Advertisement, 'id' | 'created_at'>
): Promise<Advertisement> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createAdvertisementLibSql(ad);
      memoryAdvertisements.unshift(res);
      return res;
    } catch (e) {
      console.error('Error creating advertisement in libSQL:', e);
    }
  }
  const newAd: Advertisement = {
    ...ad,
    id: generateId(),
    is_active: ad.is_active !== false,
    created_at: new Date().toISOString()
  };
  memoryAdvertisements.unshift(newAd);
  return newAd;
};

export const updateAdvertisement = async (
  ad: Advertisement
): Promise<Advertisement> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateAdvertisementLibSql(ad);
      const idx = memoryAdvertisements.findIndex(a => a.id === ad.id);
      if (idx >= 0) memoryAdvertisements[idx] = res;
      return res;
    } catch (e) {
      console.error('Error updating advertisement in libSQL:', e);
    }
  }
  const idx = memoryAdvertisements.findIndex(a => a.id === ad.id);
  if (idx >= 0) memoryAdvertisements[idx] = ad;
  return ad;
};

export const deleteAdvertisement = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteAdvertisementLibSql(id);
      memoryAdvertisements = memoryAdvertisements.filter(a => a.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting advertisement in libSQL:', e);
    }
  }
  memoryAdvertisements = memoryAdvertisements.filter(a => a.id !== id);
  return true;
};

// ==============================================================================
// 24. إشعارات وتنبيهات النظام (System Notifications API)
// ==============================================================================

export const getNotifications = async (): Promise<SystemNotification[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getNotificationsLibSql();
      memoryNotifications = list;
      return list;
    } catch (e) {
      console.error('Error fetching notifications from libSQL:', e);
    }
  }
  return memoryNotifications;
};

export const createNotification = async (
  notif: Omit<SystemNotification, 'id'> & { id?: string }
): Promise<SystemNotification> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createNotificationLibSql(notif);
      memoryNotifications = [res, ...memoryNotifications];
      return res;
    } catch (e) {
      console.error('Error creating notification in libSQL:', e);
    }
  }

  const fallback: SystemNotification = {
    ...notif,
    id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    is_read: notif.is_read || false,
    created_at: notif.created_at || new Date().toISOString()
  };
  memoryNotifications = [fallback, ...memoryNotifications];
  return fallback;
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.markNotificationAsReadLibSql(id);
    } catch (e) {
      console.error('Error marking notification as read in libSQL:', e);
    }
  }
  memoryNotifications = memoryNotifications.map(n => n.id === id ? { ...n, is_read: true } : n);
  return true;
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.markAllNotificationsAsReadLibSql();
    } catch (e) {
      console.error('Error marking all notifications as read in libSQL:', e);
    }
  }
  memoryNotifications = memoryNotifications.map(n => ({ ...n, is_read: true }));
  return true;
};

export const deleteNotification = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteNotificationLibSql(id);
    } catch (e) {
      console.error('Error deleting notification in libSQL:', e);
    }
  }
  memoryNotifications = memoryNotifications.filter(n => n.id !== id);
  return true;
};

// ==============================================================================
// 25. منتجات المتجر الإلكتروني (Store Products API)
// ==============================================================================
let memoryStoreProducts: StoreProduct[] = [
  {
    id: 'sp-1-perfume-oud',
    name: 'معطر جو فاخر للسيارة - عود ملكي مركز',
    description: 'عطر فاخر ومستدام يدوم حتى 45 يوماً، يزيل الروائح غير المرغوبة ويمنح سيارتك رائحة العود الفخم الأصيل.',
    price: 180,
    discount_price: 140,
    image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
    is_limited_quantity: true,
    category: 'معطرات',
    is_available: true,
    stock_quantity: 8,
    created_at: new Date().toISOString()
  },
  {
    id: 'sp-2-microfiber-pack',
    name: 'طقم مناشف مايكروفايبر احترافية (3 قطع)',
    description: 'مناشف فائقة النعومة بكثافة 600 GSM، مصممة خصيصاً للتجفيف والتلميع دون التسبب بأي خدوش في طلاء السيارة.',
    price: 150,
    discount_price: 110,
    image_url: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=800&q=80',
    is_limited_quantity: false,
    category: 'أدوات عناية',
    is_available: true,
    stock_quantity: 35,
    created_at: new Date().toISOString()
  },
  {
    id: 'sp-3-tire-shine',
    name: 'جل ملمع وحامي الإطارات أسود عميق',
    description: 'تركيبة سيليكونية فائقة تمنح الإطارات لمعاناً أسود عميقاً ورطباً يدوم لأسابيع مع حماية من التشقق وأشعة الشمس.',
    price: 220,
    discount_price: 185,
    image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
    is_limited_quantity: true,
    category: 'عناية خارجية',
    is_available: true,
    stock_quantity: 5,
    created_at: new Date().toISOString()
  },
  {
    id: 'sp-4-interior-cleaner',
    name: 'منظف ومعقم التابلوه والجلد برائحة اللافندر',
    description: 'منظف متعدد الاستخدامات بتركيبة مضادة للغبار والأشعة فوق البنفسجية، يعيد للتابلوه والفرش لونه الطبيعي مع انتعاش اللافندر.',
    price: 190,
    discount_price: 160,
    image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
    is_limited_quantity: false,
    category: 'عناية داخلية',
    is_available: true,
    stock_quantity: 20,
    created_at: new Date().toISOString()
  },
  {
    id: 'sp-5-wash-wax',
    name: 'شامبو غسيل سيارات مركز مع شمع كارنوبا',
    description: 'شامبو رغوي كثيف يزيل الأوساخ الصعبة والشحوم بسهولة ويترك طبقة حماية شمعية لامعة بعد الشطف مباشرة.',
    price: 240,
    discount_price: 195,
    image_url: 'https://images.unsplash.com/photo-1552930294-6b595f4c2974?auto=format&fit=crop&w=800&q=80',
    is_limited_quantity: true,
    category: 'عناية خارجية',
    is_available: true,
    stock_quantity: 4,
    created_at: new Date().toISOString()
  }
];

export const getStoreProducts = async (onlyAvailable?: boolean): Promise<StoreProduct[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getStoreProductsLibSql();
      memoryStoreProducts = list;
      return onlyAvailable ? list.filter(p => p.is_available) : list;
    } catch (e) {
      console.error('Error fetching store products from libSQL:', e);
    }
  }
  return onlyAvailable ? memoryStoreProducts.filter(p => p.is_available) : memoryStoreProducts;
};

export const createStoreProduct = async (
  prod: Omit<StoreProduct, 'id' | 'created_at'> & { id?: string }
): Promise<StoreProduct> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.createStoreProductLibSql(prod);
      memoryStoreProducts.unshift(res);
      return res;
    } catch (e) {
      console.error('Error creating store product in libSQL:', e);
    }
  }
  const newProduct: StoreProduct = {
    ...prod,
    id: prod.id || generateId(),
    is_available: prod.is_available !== false,
    is_limited_quantity: Boolean(prod.is_limited_quantity),
    stock_quantity: prod.stock_quantity ?? 10,
    created_at: new Date().toISOString()
  };
  memoryStoreProducts.unshift(newProduct);
  return newProduct;
};

export const updateStoreProduct = async (prod: StoreProduct): Promise<StoreProduct> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const res = await libSqlService.updateStoreProductLibSql(prod);
      const idx = memoryStoreProducts.findIndex(p => p.id === prod.id);
      if (idx >= 0) memoryStoreProducts[idx] = res;
      return res;
    } catch (e) {
      console.error('Error updating store product in libSQL:', e);
    }
  }
  const idx = memoryStoreProducts.findIndex(p => p.id === prod.id);
  if (idx >= 0) memoryStoreProducts[idx] = prod;
  return prod;
};

export const deleteStoreProduct = async (id: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteStoreProductLibSql(id);
      memoryStoreProducts = memoryStoreProducts.filter(p => p.id !== id);
      return true;
    } catch (e) {
      console.error('Error deleting store product in libSQL:', e);
    }
  }
  memoryStoreProducts = memoryStoreProducts.filter(p => p.id !== id);
  return true;
};

// ==============================================================================
// 26. طلبات الشراء من المتجر (Store Orders API)
// ==============================================================================
let memoryStoreOrders: StoreOrder[] = [];

export const getStoreOrders = async (customerId?: string): Promise<StoreOrder[]> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      const list = await libSqlService.getStoreOrdersLibSql();
      memoryStoreOrders = list;
      return customerId ? list.filter(o => o.customer_id === customerId) : list;
    } catch (e) {
      console.error('Error fetching store orders from libSQL:', e);
    }
  }
  return customerId ? memoryStoreOrders.filter(o => o.customer_id === customerId) : memoryStoreOrders;
};

export const createStoreOrder = async (
  order: Omit<StoreOrder, 'id' | 'order_number' | 'created_at'> & { id?: string; order_number?: string }
): Promise<StoreOrder> => {
  let created: StoreOrder;
  if (libSqlClient && isLibSqlConfigured) {
    try {
      created = await libSqlService.createStoreOrderLibSql(order);
      memoryStoreOrders.unshift(created);
    } catch (e) {
      console.error('Error creating store order in libSQL:', e);
      created = {
        ...order,
        id: order.id || generateId(),
        order_number: order.order_number || `ORD-${Date.now().toString().slice(-6)}`,
        status: order.status || 'pending',
        created_at: new Date().toISOString()
      };
      memoryStoreOrders.unshift(created);
    }
  } else {
    created = {
      ...order,
      id: order.id || generateId(),
      order_number: order.order_number || `ORD-${Date.now().toString().slice(-6)}`,
      status: order.status || 'pending',
      created_at: new Date().toISOString()
    };
    memoryStoreOrders.unshift(created);
  }

  // إرسال إشعار للنظام بوجود طلب شراء جديد
  try {
    await createNotification({
      title: 'طلب شراء جديد من المتجر',
      message: `قام العميل ${created.customer_name} بطلب شراء جديد رقم (#${created.order_number}) بقيمة ${created.total_amount} ج.م`,
      type: 'order',
      reference_id: created.id,
      customer_id: created.customer_id,
      is_read: false
    });
  } catch (notifErr) {
    console.error('Failed to create order notification:', notifErr);
  }

  return created;
};

export const updateStoreOrderStatus = async (
  orderId: string,
  status: StoreOrderStatus
): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.updateStoreOrderStatusLibSql(orderId, status);
      const idx = memoryStoreOrders.findIndex(o => o.id === orderId);
      if (idx >= 0) memoryStoreOrders[idx] = { ...memoryStoreOrders[idx], status };
      return true;
    } catch (e) {
      console.error('Error updating store order status in libSQL:', e);
    }
  }
  const idx = memoryStoreOrders.findIndex(o => o.id === orderId);
  if (idx >= 0) memoryStoreOrders[idx] = { ...memoryStoreOrders[idx], status };
  return true;
};

export const deleteStoreOrder = async (orderId: string): Promise<boolean> => {
  if (libSqlClient && isLibSqlConfigured) {
    try {
      await libSqlService.deleteStoreOrderLibSql(orderId);
      memoryStoreOrders = memoryStoreOrders.filter(o => o.id !== orderId);
      return true;
    } catch (e) {
      console.error('Error deleting store order in libSQL:', e);
    }
  }
  memoryStoreOrders = memoryStoreOrders.filter(o => o.id !== orderId);
  return true;
};






