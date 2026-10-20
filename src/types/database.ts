export interface Settings {
  id: string;
  company_name: string;
  logo_url: string;
  country: string;
  currency_symbol: string;
  currency_code: string;
  dial_code: string; // كود الاتصال الدولي بدون + وبدون 00 (مثال: 20، 966)
  whatsapp_instance?: string;
  whatsapp_api_key?: string;
  vodafone_cash_number?: string;
  instapay_handle?: string;
  store_name?: string;
  google_drive_folder_url?: string;
  google_drive_folder_name?: string;
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
  criminal_record_image_url?: string;
  personal_image_url?: string;
  role: EmployeeRole;
  username: string;
  password_hash: string;
  salary?: number;
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
  status?: 'active' | 'pending_review' | 'suspended';
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
  category?: string;
  payment_method?: string;
  transaction_type?: string;
  created_by: string;
  created_at?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  item_code?: string; // كود الصنف (مثل WC-CW-001)
  barcode?: string;
  name: string; // الصنف / المنتج
  category?: string; // النوع / التصنيف (مثل كيماويات)
  brand?: string; // الماركة المقترحة (مثل SONAX)
  usage_location?: string; // مكان الاستخدام (مثل غسيل سيارات)
  unit: string; // الوحدة (لتر، قطعة، كجم، إلخ)
  purchase_unit?: string; // وحدة الشراء (كرتونة، باكت، دستة...)
  pieces_per_unit?: number; // عدد القطع في وحدة الشراء (مثلاً 20 علبة)
  piece_unit?: string; // وحدة التجزئة أو القطعة (علبة، قطعة، لتر)
  opening_stock?: number; // رصيد أول المدة
  current_stock: number; // الرصيد الحالي المتوفر
  min_alert_threshold: number; // حد إعادة الطلب
  status?: string; // الحالة (متوفر، منخفض، غير متوفر)
  supplier_id?: string; // معرف المورد
  supplier_name?: string; // اسم المورد
  supplier_phone?: string; // تليفون المورد
  unit_cost: number; // تكلفة الوحدة
  notes?: string; // ملاحظات الصنف
  is_active?: boolean;
  created_at?: string;
}

export type InventoryTransactionType = 'worker_issuance' | 'addition_purchase' | 'adjustment' | 'opening_balance';

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
  pieces_per_unit?: number;
  piece_unit?: string;
  total_pieces?: number;
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
  rfq_id?: string;
  rfq_number?: string;
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

export interface Advertisement {
  id: string;
  title: string; // اسم الاعلان
  description: string; // وصف الاعلان
  date: string; // تاريخ الاعلان
  phone: string; // رقم للاتصال
  whatsapp: string; // رقم واتساب
  price: number; // السعر
  image_url: string; // صورة الاعلان
  is_active: boolean; // نشط او غير نشط
  created_at?: string;
}

export type NotificationType = 'rating' | 'comment' | 'order' | 'system' | 'info' | 'warning';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  customer_id?: string;
  rating?: number;
  rating_comment?: string;
  is_read: boolean;
  created_at?: string;
}

// ==============================================================================
// المتجر الإلكتروني (E-Commerce Store)
// ==============================================================================

export interface StoreProduct {
  id: string;
  name: string; // اسم السلعة
  description?: string; // بيانات ووصف السلعة
  price: number; // السعر الأصلي
  discount_price?: number; // سعر الخصم (إن وجد)
  image_url: string; // صورة السلعة
  is_limited_quantity?: boolean; // إشعار كمية محدودة
  category?: string; // التصنيف (معطرات، منظفات، أدوات، إلخ)
  purchase_unit?: string; // وحدة الشراء (كرتونة، باكت...)
  pieces_per_unit?: number; // عدد القطع في وحدة الشراء (مثلاً 20 علبة بالكرتونة)
  piece_unit?: string; // وحدة البيع بالتجزئة (علبة، قطعة)
  inventory_item_id?: string; // ربط الصنف بالمخزون
  is_available: boolean; // متوفر للبيع أم لا
  stock_quantity?: number; // الكمية المتوفرة
  created_at?: string;
}

export type StoreOrderStatus =
  | 'pending' // جديد / قيد المراجعة
  | 'preparing' // جاري استكمال الاصناف المطلوبة
  | 'paid' // تم الدفع
  | 'delivered' // تم التوصيل
  | 'cancelled'; // الغاء الطلب

export interface StoreOrderItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  image_url?: string;
  price: number;
  quantity: number;
  total: number;
}

export interface StoreOrder {
  id: string;
  order_number: string; // رقم الطلب الفريد
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_date: string; // التاريخ المناسب للاستلام
  delivery_time: string; // الوقت المناسب للاستلام
  delivery_address?: string; // العنوان أو المنطقة
  payment_method: 'vodafone_cash' | 'instapay' | 'cash';
  transfer_receipt_url?: string; // صورة إيصال التحويل
  status: StoreOrderStatus;
  items: StoreOrderItem[];
  subtotal: number;
  discount_amount?: number;
  total_amount: number;
  notes?: string;
  created_at?: string;
}

export interface ExcelSubscriptionRow {
  name: string;
  phone: string;
  building_number: string;
  block_number: string;
  vehicle_type: string;
  plate_number: string;
  color: string;
  weekly_schedule: Record<string, string>; // e.g. { 'السبت': 'غسيل', 'الإثنين': 'فوطة 1', ... }
  price: number;
}

export interface SubscriptionImportOptions {
  defaultAreaId?: string;
  defaultPackageId?: string;
  startDate?: string;
  durationDays?: number;
  status?: SubscriptionStatus;
  isPaid?: boolean;
  paymentMethodId?: string;
}

export interface SubscriptionImportResult {
  totalRows: number;
  newCustomers: number;
  existingCustomers: number;
  newVehicles: number;
  existingVehicles: number;
  newSubscriptions: number;
  totalVisitsCreated: number;
  totalAmountCollected: number;
  errors: string[];
}


// ==============================================================================
// 22. بنود ومصروفات التشغيل (Expenses & Expense Categories)
// ==============================================================================
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Expense {
  id: string;
  voucher_number: string;
  category_id: string;
  category_name?: string;
  amount: number;
  treasury_id: string;
  payment_method_id?: string | null;
  payment_method_name?: string;
  date: string;
  reason: string;
  recipient?: string;
  invoice_ref?: string;
  attachment_url?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================================================================
// 23. مسير ورواتب الموظفين (Salary Payments)
// ==============================================================================
export interface SalaryPayment {
  id: string;
  voucher_number: string;
  employee_id: string;
  employee_name?: string;
  employee_role?: string;
  employee_phone?: string;
  month_year: string; // e.g. '2026-10'
  payment_date: string; // '2026-10-20'
  basic_salary: number;
  bonuses: number;
  bonus_reason?: string;
  deductions: number;
  deduction_reason?: string;
  net_salary: number;
  treasury_id: string;
  treasury_name?: string;
  payment_method_id?: string | null;
  payment_method_name?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}


// ==============================================================================
// 24. طلبات عروض الأسعار والمشتريات (Price Quotation Requests - RFQ)
// ==============================================================================
export type PriceQuotationStatus = 'draft' | 'sent' | 'received' | 'priced' | 'converted' | 'converted_to_po' | 'cancelled';

export interface PriceQuotationItem {
  id?: string;
  item_id?: string;
  item_name: string;
  unit: string; // الوحدة (كرتونة، باكت، دستة، قطعة...)
  pieces_per_unit?: number; // عدد القطع في الوحدة (مثلاً 20 علبة بالكرتونة)
  piece_unit?: string; // وحدة القطعة (علبة، قطعة، زجاجة)
  quantity_requested?: number; // العدد المطلوب
  quantity?: number;
  unit_price?: number; // سعر الوحدة المقترح من المورد
  total_price?: number; // السعر الإجمالي
  notes?: string;
}

export interface PriceQuotationRequest {
  id: string;
  rfq_number: string; // رقم طلب عرض السعر مثل RFQ-2610-001
  supplier_id: string;
  supplier_name?: string;
  supplier_phone?: string;
  date?: string;
  rfq_date?: string;
  status: PriceQuotationStatus;
  items: PriceQuotationItem[];
  total_amount?: number;
  notes?: string;
  created_by?: string;
  converted_po_id?: string;
  converted_po_number?: string;
  converted_at?: string;
  created_at?: string;
  updated_at?: string;
}
