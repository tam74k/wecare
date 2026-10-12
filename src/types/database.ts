export interface Settings {
  id: string;
  company_name: string;
  logo_url: string;
  country: string;
  currency_symbol: string;
  currency_code: string;
  dial_code: string; // كود الاتصال الدولي بدون + وبدون 00 (مثال: 20، 966)
  created_at?: string;
  updated_at?: string;
}

export interface CoverageArea {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
  created_at?: string;
}

export type EmployeeRole = 'admin' | 'supervisor' | 'worker';

export type UserRoleType = 'admin' | 'supervisor' | 'worker' | 'customer';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRoleType;
  phone?: string;
  employee_id?: string;
  customer_id?: string;
  customer_data?: Customer;
  employee_data?: Employee;
  permissions?: Record<string, boolean>;
}

export interface Employee {
  id: string;
  national_id: string;
  full_name: string;
  phone: string;
  address: string;
  hire_date: string;
  national_id_image_url?: string;
  id_card_image_url?: string;
  role: EmployeeRole;
  username: string;
  password_hash: string;
  is_active: boolean;
  created_at?: string;
}

export interface EmployeePermission {
  id: string;
  employee_id: string;
  page_key: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  notes?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name?: string;
  full_name: string;
  mobile?: string;
  phone: string; // UNIQUE
  area_id: string;
  building_number: string;
  block?: string;
  block_number?: string;
  detailed_address?: string; // عنوان تفصيلي (غير إلزامي)
  location_url?: string; // Location رابط الموقع أو الإحداثيات (غير إلزامي)
  username?: string;
  password_hash?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  type?: string;
  vehicle_type: string;
  color: string;
  license_plate?: string;
  plate_number: string;
  image_url?: string;
  vehicle_image_url?: string;
  created_at?: string;
}

export interface PackageCategory {
  id: string;
  name: string; // e.g., 'سيارات', 'عمارات'
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export type PackageTier = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface Package {
  id: string;
  category_id: string;
  name: string;
  tier: PackageTier;
  level?: string;
  duration_days: number;
  weekly_visits_count?: number; // عدد الزيارات في الأسبوع الواحد (مثلاً: 3، 5، 7)
  weekly_services_plan?: string[]; // خطة ومصفوفة الخدمات الأسبوعية (مثلاً: ['غسيل', 'فوطة 1', 'فوطة 2'])
  base_visits_count: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface PackagePricing {
  id: string;
  package_id: string;
  area_id: string;
  price: number;
  created_at?: string;
}

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'archived' | 'cancelled' | 'paused';

export type PaymentStatus = 'paid' | 'unpaid';

export interface Subscription {
  id: string;
  customer_id: string;
  vehicle_id?: string | null;
  package_id: string;
  area_id: string;
  assigned_worker_id?: string | null;
  status: SubscriptionStatus;
  preferred_day_of_week: string; // 'السبت', 'الأحد', ...
  selected_days?: string[]; // أيام الزيارة الأسبوعية المختارة للعميل (مثلاً: ['الأحد', 'الثلاثاء', 'الخميس'])
  preferred_time_from?: string; // '09:00' (اختياري)
  preferred_time_to?: string; // '11:00' (اختياري)
  start_date: string;
  end_date: string;
  total_price: number;
  notes?: string;
  payment_status?: PaymentStatus;
  payment_method_id?: string | null;
  paid_at?: string;
  approved_at?: string;
  approved_by?: string;
  archived_at?: string;
  created_at?: string;
}

export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

export interface Visit {
  id: string;
  subscription_id: string;
  customer_id: string;
  assigned_worker_id?: string | null;
  scheduled_date: string;
  scheduled_time_from?: string;
  scheduled_time_to?: string;
  status: VisitStatus;
  service_type?: string; // نوع الخدمة المحددة بدقة لتلك الزيارة (غسيل، فوطة 1، فوطة 2...)
  day_of_week?: string; // اسم اليوم (الأحد، الثلاثاء، الخميس...)
  postponed_from_date?: string;
  postponed_reason?: string;
  notes?: string;
  rating?: number; // تقييم العميل من 1 إلى 5 نجوم
  rating_comment?: string; // تعليق العميل على الزيارة
  completed_at?: string;
  created_at?: string;
}

export interface PostponementReason {
  id: string;
  reason: string;
  is_active: boolean;
  created_at?: string;
}

export interface Treasury {
  id: string;
  name: string;
  type: 'main' | 'sub' | 'payment_method';
  payment_method_id?: string | null;
  balance: number;
  is_deletable: boolean;
  created_at?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  treasury_id: string;
  is_active: boolean;
  created_at?: string;
}

export type TreasuryTransactionType = 'deposit' | 'withdrawal' | 'transfer';

export interface TreasuryTransaction {
  id: string;
  treasury_id: string;
  related_treasury_id?: string;
  type: TreasuryTransactionType;
  amount: number;
  reason: string;
  created_by: string;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode?: string;
  unit: string;
  current_stock: number;
  min_alert_threshold: number;
  unit_cost: number;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
}

export type InventoryTransactionType = 'worker_issuance' | 'addition_purchase' | 'adjustment';

export interface InventoryTransaction {
  id: string;
  item_id: string;
  type: InventoryTransactionType;
  quantity: number;
  worker_id?: string;
  invoice_ref?: string;
  notes?: string;
  created_by: string;
  created_at?: string;
}

export type EquipmentCondition = 'ممتازة' | 'جيدة' | 'تحتاج صيانة' | 'تالفة';

export interface Equipment {
  id: string;
  name: string;
  condition: EquipmentCondition;
  quantity: number;
  purchase_date: string;
  purchase_price: number;
  depreciation_rate: number; // percentage
  notes?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string; // اسم المورد أو الشركة
  contact_person?: string; // جهة الاتصال / الشخص المسؤول
  phone: string; // رقم الهاتف
  email?: string; // البريد الإلكتروني
  address?: string; // العنوان
  tax_number?: string; // الرقم الضريبي / السجل التجاري
  opening_balance: number; // الرصيد الافتتاحي (دائن / مستحق له)
  current_balance: number; // الرصيد الحالي التراكمي
  is_active: boolean; // نشط أو غير نشط
  notes?: string; // ملاحظات
  created_at?: string;
}

export type SupplierTransactionType = 'purchase' | 'payment' | 'return' | 'opening_balance';

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
  type: SupplierTransactionType; // purchase: توريد/مشتريات، payment: سداد دفعة، return: مرتجع، opening_balance: رصيد افتتاحي
  amount: number; // المبلغ
  date: string; // تاريخ المعاملة
  invoice_number?: string; // رقم الفاتورة أو إيصال السند
  treasury_id?: string | null; // الخزينة المسحوب منها في حالة الدفعة
  payment_method_id?: string | null; // طريقة الدفع
  notes?: string; // البيان والملاحظات
  created_by: string; // المستخدم المسجل للحركة
  created_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  item_id: string;
  item_name: string;
  barcode?: string;
  unit: string;
  quantity_requested: number;
  quantity_received?: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
}

export type PurchaseOrderStatus = 'pending' | 'converted' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  order_date: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  total_amount?: number;
  converted_invoice_number?: string;
  converted_at?: string;
  notes?: string;
  created_by: string;
  created_at?: string;
}

