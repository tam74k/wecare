import React, { useState } from 'react';
import {
  Employee,
  EmployeePermission,
  Customer,
  CoverageArea,
  Vehicle,
  Subscription
} from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import {
  ShieldCheck,
  KeyRound,
  Check,
  Lock,
  Unlock,
  User,
  Users,
  UserCheck,
  UserPlus,
  Search,
  CheckCircle2,
  Info,
  X,
  UploadCloud,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Edit3,
  Layers,
  DollarSign,
  AlertCircle,
  Phone,
  Building,
  MapPin,
  Car,
  ClipboardList,
  MessageCircle,
  Key,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ArrowUpDown,
  Filter,
  RotateCcw,
  LayoutGrid,
  List
} from 'lucide-react';

interface PermissionsViewProps {
  employees: Employee[];
  customers?: Customer[];
  coverageAreas?: CoverageArea[];
  vehicles?: Vehicle[];
  subscriptions?: Subscription[];
  onSavePermissions: (empId: string, permissions: Omit<EmployeePermission, 'id' | 'employee_id'>[]) => Promise<void>;
  onCreateEmployee?: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<Employee>;
  onResetPassword?: (empId: string, newPass: string) => Promise<void>;
  onResetCustomerPassword?: (customerId: string, newPass: string | null) => Promise<void>;
  onUpdateCustomer?: (customerId: string, updates: Partial<Customer>) => Promise<void>;
}

export interface GranularPermissionDefinition {
  key: string;
  category: string;
  name: string;
  description: string;
  defaultAdmin: boolean;
  defaultSupervisor: boolean;
  defaultWorker: boolean;
}

// قائمة العمليات والصلاحيات الدقيقة والخاصيات الحصرية في النظام بالكامل
export const SYSTEM_OPERATIONS: GranularPermissionDefinition[] = [
  // 1. الاشتراكات والأسعار
  {
    key: 'subs_override_price',
    category: 'الاشتراكات والأسعار',
    name: 'تغيير السعر المعتمد للباقة يدوياً',
    description: 'السماح للمستخدم بتعديل سعر الباقة يدوياً عند إنشاء الاشتراك وعدم التقيد بالسعر الإجباري التلقائي',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'subs_create',
    category: 'الاشتراكات والأسعار',
    name: 'إنشاء وتسجيل اشتراك جديد',
    description: 'إدخال وتسجيل طلبات اشتراك جديدة للعملاء في النظام',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'subs_approve',
    category: 'الاشتراكات والأسعار',
    name: 'اعتماد وتفعيل الاشتراكات الجديدة',
    description: 'الموافقة على الاشتراكات وتوليد جدول الزيارات الميدانية آلياً',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'subs_reject_cancel',
    category: 'الاشتراكات والأسعار',
    name: 'رفض أو إلغاء الاشتراكات',
    description: 'رفض طلبات الاشتراك أو إلغائها وتغيير حالتها',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'subs_renew',
    category: 'الاشتراكات والأسعار',
    name: 'تجديد الاشتراكات المنتهية',
    description: 'تجديد اشتراك منتهي لعميل وتمديد فترة الخدمة',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'subs_archive',
    category: 'الاشتراكات والأسعار',
    name: 'أرشفة واستعادة الاشتراكات',
    description: 'نقل الاشتراكات القديمة للأرشيف أو استعادتها',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },

  // 2. الرزنامة والجدولة
  {
    key: 'calendar_reschedule',
    category: 'الرزنامة والجدولة',
    name: 'إعادة جدولة وترحيل مواعيد الزيارات',
    description: 'تأجيل أو تغيير يوم ووقت غسيل سيارة أو عمارة العميل',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'calendar_change_status',
    category: 'الرزنامة والجدولة',
    name: 'تحديث حالة الزيارة الميدانية',
    description: 'تأكيد اكتمال الغسيل (مكتملة / جاري العمل / ملغاة)',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: true
  },
  {
    key: 'calendar_reassign_worker',
    category: 'الرزنامة والجدولة',
    name: 'تغيير أو إعادة تعيين عامل الزيارة',
    description: 'نقل مهمة غسيل من عامل إلى عامل آخر في التقويم',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },

  // 3. العملاء والمركبات
  {
    key: 'cust_create',
    category: 'العملاء والمركبات',
    name: 'إضافة عميل أو مركبة جديدة',
    description: 'تسجيل بيانات العميل ورقم الموبايل وإضافة مركباته',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'cust_edit',
    category: 'العملاء والمركبات',
    name: 'تعديل بيانات العملاء والمركبات',
    description: 'تحديث أرقام الهواتف أو العناوين أو بيانات اللوحات',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'cust_delete',
    category: 'العملاء والمركبات',
    name: 'حذف عميل أو سيارة',
    description: 'حذف العميل أو أي من مركباته بشكل نهائي',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'cust_reset_pwd',
    category: 'العملاء والمركبات',
    name: 'إعادة تعيين كلمة مرور العميل',
    description: 'تغيير وتعيين كلمة مرور حساب الدخول لتطبيق العميل',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },

  // 4. الباقات والتسعير
  {
    key: 'pkg_manage',
    category: 'الباقات والتسعير',
    name: 'إضافة وتعديل الباقات والتصنيفات',
    description: 'إنشاء باقات شهرية أو سنوية وتحديد عدد الزيارات',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'pkg_pricing_matrix',
    category: 'الباقات والتسعير',
    name: 'تعديل جدول مصفوفة أسعار المناطق',
    description: 'تحديد الأسعار الرسمية المعتمدة لكل باقة في كل كمبوند ومنطقة',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },

  // 5. المالية والخزائن
  {
    key: 'finance_view_balances',
    category: 'المالية والخزائن',
    name: 'الاطلاع على أرصدة الخزائن النقدية',
    description: 'رؤية إجمالي الرصيد النقدي وأرصدة البنوك والمحافظ',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'finance_create_tx',
    category: 'المالية والخزائن',
    name: 'تسجيل وتغذية حركات الإيداع والصرف',
    description: 'إدخال سندات قبض أو مدفوعات ومصروفات في الخزائن',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'finance_manage_methods',
    category: 'المالية والخزائن',
    name: 'إضافة وإدارة طرق الدفع والخزائن',
    description: 'إنشاء خزائن فرعية أو حسابات بنكية ومحافظ جديدة',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },

  // 6. المخزون والمعدات
  {
    key: 'inv_add_item',
    category: 'المخزون والمعدات',
    name: 'إضافة وتعديل أصناف المخزون',
    description: 'إدخال الشامبو، المايكروفايبر، وأدوات النظافة وأسعارها',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'inv_tx_in_out',
    category: 'المخزون والمعدات',
    name: 'صرف وتوريد المواد للمشرفين والعمال',
    description: 'تسجيل حركات الاستلام والتسليم من المخزن',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },
  {
    key: 'inv_equipment',
    category: 'المخزون والمعدات',
    name: 'إدارة عُهد المعدات والمضخات',
    description: 'تسجيل مضخات المياه والمكانس وتعيين عهدتها للعمال',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },

  // 7. الموظفين والحضور
  {
    key: 'emp_manage',
    category: 'الموظفين والحضور',
    name: 'إضافة وتعديل وحذف بيانات الموظفين',
    description: 'تسجيل عمال الغسيل وتحديث بياناتهم وصور بطاقاتهم',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'emp_attendance_record',
    category: 'الموظفين والحضور',
    name: 'تسجيل ومتابعة الحضور والغياب اليومي',
    description: 'تسجيل حضور العمال والمشرفين (حاضر / متأخر / غائب)',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  },

  // 8. الصلاحيات والإعدادات
  {
    key: 'perm_manage_users',
    category: 'الصلاحيات والإعدادات',
    name: 'إدارة وتعديل مستخدمي النظام والصلاحيات',
    description: 'إنشاء حسابات إدارية وتعديل الصلاحيات المتقدمة',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'settings_company_areas',
    category: 'الصلاحيات والإعدادات',
    name: 'تعديل بيانات المؤسسة ومناطق التغطية',
    description: 'تغيير اسم المنشأة، الشعار، وإضافة كمبوندات جديدة',
    defaultAdmin: true,
    defaultSupervisor: false,
    defaultWorker: false
  },
  {
    key: 'reports_export',
    category: 'التقارير الشاملة',
    name: 'الاطلاع على التقارير المالية والتشغيلية وتصديرها',
    description: 'عرض الرسوم البيانية وطباعة كشوفات الأرباح والزيارات',
    defaultAdmin: true,
    defaultSupervisor: true,
    defaultWorker: false
  }
];

export const AVAILABLE_PAGES = [
  { key: 'dashboard', name: 'لوحة التحكم والمعلومات' },
  { key: 'subscriptions', name: 'الاشتراكات وسير العمل' },
  { key: 'calendar', name: 'الرزنامة والجدولة' },
  { key: 'customers', name: 'العملاء والمركبات' },
  { key: 'packages', name: 'الباقات والتسعير المرن' },
  { key: 'finance', name: 'المالية والخزائن' },
  { key: 'inventory', name: 'المخزون والمعدات' },
  { key: 'employees', name: 'الموظفين والحضور' },
  { key: 'permissions', name: 'مستخدمو النظام والصلاحيات' },
  { key: 'reports', name: 'التقارير الشاملة' },
  { key: 'settings', name: 'الإعدادات' }
];

export const PermissionsView: React.FC<PermissionsViewProps> = ({
  employees,
  customers = [],
  coverageAreas = [],
  vehicles = [],
  subscriptions = [],
  onSavePermissions,
  onCreateEmployee,
  onResetPassword,
  onResetCustomerPassword,
  onUpdateCustomer
}) => {
  // Top-level account category tab: 'staff' vs 'customers'
  const [accountTypeTab, setAccountTypeTab] = useState<'staff' | 'customers'>('staff');

  // Customer accounts states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'with_pass' | 'without_pass' | 'pending_review'>('all');
  const [customerAreaFilter, setCustomerAreaFilter] = useState<string>('all');
  const [customerSortBy, setCustomerSortBy] = useState<'newest' | 'name_asc' | 'name_desc' | 'vehicles' | 'subscriptions'>('newest');
  const [customerViewMode, setCustomerViewMode] = useState<'table' | 'grid'>('table');
  const [customerCurrentPage, setCustomerCurrentPage] = useState<number>(1);
  const [customerPageSize, setCustomerPageSize] = useState<number>(10);
  const [clearPassCustomer, setClearPassCustomer] = useState<Customer | null>(null);
  const [setPassCustomer, setSetPassCustomer] = useState<Customer | null>(null);
  const [newCustPassword, setNewCustPassword] = useState('');
  const [isProcessingCustomerPass, setIsProcessingCustomerPass] = useState(false);
  const [editUsernameCustomer, setEditUsernameCustomer] = useState<Customer | null>(null);
  const [newUsernameVal, setNewUsernameVal] = useState('');
  const [customerNotice, setCustomerNotice] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'operations' | 'custom'>('operations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees.length > 0 ? employees[0].id : ''
  );
  const [permissionsState, setPermissionsState] = useState<
    Record<string, { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; can_approve: boolean }>
  >({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset Password Modal State
  const [resetModalEmployee, setResetModalEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  // Custom Operation Permissions state (New dynamically added operations)
  const [customOperations, setCustomOperations] = useState<GranularPermissionDefinition[]>([]);
  const [newOpData, setNewOpData] = useState({
    key: '',
    category: 'الاشتراكات والأسعار',
    name: '',
    description: ''
  });
  const [isAddingNewOp, setIsAddingNewOp] = useState(false);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Add User Form State
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'admin' as 'admin' | 'supervisor' | 'worker',
    username: '',
    password: '',
    phone: '',
    national_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    address: '',
    national_id_image_url: ''
  });

  const allOperations = [...SYSTEM_OPERATIONS, ...customOperations];

  // Filtered employees for list (Search by Name, Mobile/Phone, Username, or Role)
  const cleanSearch = searchTerm.trim().toLowerCase();
  const filteredEmployees = employees.filter((emp) => {
    if (!cleanSearch) return true;
    const nameMatch = emp.full_name?.toLowerCase().includes(cleanSearch);
    const phoneMatch = emp.phone?.includes(cleanSearch);
    const userMatch = emp.username?.toLowerCase().includes(cleanSearch);
    const roleMatch = emp.role?.toLowerCase().includes(cleanSearch);
    return nameMatch || phoneMatch || userMatch || roleMatch;
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Initialize permissions state when an employee is selected
  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setSaveSuccess(false);

    const initial: Record<string, any> = {};
    // 1. Pages Matrix Defaults
    AVAILABLE_PAGES.forEach((p) => {
      initial[p.key] = {
        can_create: emp.role === 'admin',
        can_read: true,
        can_update: emp.role === 'admin' || emp.role === 'supervisor',
        can_delete: emp.role === 'admin',
        can_approve: emp.role === 'admin' || emp.role === 'supervisor'
      };
    });

    // 2. Granular System Operations Defaults
    allOperations.forEach((op) => {
      let isAllowed = false;
      if (emp.role === 'admin') isAllowed = op.defaultAdmin;
      else if (emp.role === 'supervisor') isAllowed = op.defaultSupervisor;
      else if (emp.role === 'worker') isAllowed = op.defaultWorker;

      initial[op.key] = {
        can_create: isAllowed,
        can_read: isAllowed,
        can_update: isAllowed,
        can_delete: false,
        can_approve: isAllowed
      };
    });

    setPermissionsState(initial);
  };

  // Run initial setup if selected employee has empty state
  React.useEffect(() => {
    if (selectedEmployeeId && Object.keys(permissionsState).length === 0) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      if (emp) {
        handleSelectEmployee(emp);
      }
    } else if (!selectedEmployeeId && employees.length > 0) {
      handleSelectEmployee(employees[0]);
    }
  }, [selectedEmployeeId, employees]);

  // Toggle single operation permission for selected user
  const handleToggleOperation = (opKey: string) => {
    const currentVal = permissionsState[opKey]?.can_create ?? false;
    const newVal = !currentVal;
    setPermissionsState({
      ...permissionsState,
      [opKey]: {
        can_create: newVal,
        can_read: newVal,
        can_update: newVal,
        can_delete: false,
        can_approve: newVal
      }
    });
  };

  // Toggle Page Matrix Column
  const handleToggleColumn = (action: 'can_read' | 'can_create' | 'can_update' | 'can_delete' | 'can_approve') => {
    const allChecked = AVAILABLE_PAGES.every((p) => permissionsState[p.key]?.[action]);
    const newState = { ...permissionsState };
    AVAILABLE_PAGES.forEach((p) => {
      newState[p.key] = {
        ...newState[p.key],
        [action]: !allChecked
      };
    });
    setPermissionsState(newState);
  };

  const handleSavePerms = async () => {
    if (!selectedEmployeeId) return;
    try {
      setIsSaving(true);
      const combinedKeys = [...AVAILABLE_PAGES.map((p) => p.key), ...allOperations.map((o) => o.key)];
      const arrayPerms = combinedKeys.map((key) => ({
        page_key: key,
        can_create: permissionsState[key]?.can_create || false,
        can_read: permissionsState[key]?.can_read ?? true,
        can_update: permissionsState[key]?.can_update || false,
        can_delete: permissionsState[key]?.can_delete || false,
        can_approve: permissionsState[key]?.can_approve || false
      }));

      await onSavePermissions(selectedEmployeeId, arrayPerms);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      alert('فشل حفظ الصلاحيات: ' + (e.message || 'حدث خطأ'));
    } finally {
      setIsSaving(false);
    }
  };

  // Add custom operation definition
  const handleAddCustomOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpData.name || !newOpData.key) {
      alert('يرجى ملء اسم الصلاحية والمعرف الفريد');
      return;
    }
    const cleanKey = newOpData.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (allOperations.some((o) => o.key === cleanKey)) {
      alert('معرف الصلاحية موجود مسبقاً، يرجى اختيار رمز فريد');
      return;
    }

    const newOp: GranularPermissionDefinition = {
      key: cleanKey,
      category: newOpData.category,
      name: newOpData.name,
      description: newOpData.description || newOpData.name,
      defaultAdmin: true,
      defaultSupervisor: false,
      defaultWorker: false
    };

    setCustomOperations((prev) => [...prev, newOp]);
    // Also give permission to current selected user if admin
    setPermissionsState((prev) => ({
      ...prev,
      [cleanKey]: {
        can_create: selectedEmployee?.role === 'admin',
        can_read: selectedEmployee?.role === 'admin',
        can_update: selectedEmployee?.role === 'admin',
        can_delete: false,
        can_approve: selectedEmployee?.role === 'admin'
      }
    }));

    setNewOpData({ key: '', category: 'الاشتراكات والأسعار', name: '', description: '' });
    setIsAddingNewOp(false);
    alert('تم إضافة الصلاحية الجديدة للنظام بنجاح!');
  };

  // Delete custom operation
  const handleDeleteCustomOperation = (key: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه الصلاحية المخصصة من النظام؟')) {
      setCustomOperations((prev) => prev.filter((o) => o.key !== key));
      const newState = { ...permissionsState };
      delete newState[key];
      setPermissionsState(newState);
    }
  };

  // Handle Image Upload for New User
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      setUploadNotice('جاري ضغط وتقليص حجم الصورة وحفظها...');
      const uploadedUrl = await uploadStorageAsset(file, 'employees', formData.national_id_image_url);
      setFormData((prev) => ({ ...prev, national_id_image_url: uploadedUrl }));
      setUploadNotice('تم تقليص حجم الصورة وحفظها بنجاح!');
      setTimeout(() => setUploadNotice(null), 3000);
    } catch (err: any) {
      alert('فشل رفع الصورة: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setUploadNotice(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Submit New User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.username) {
      alert('يرجى ملء الاسم الكامل واسم المستخدم');
      return;
    }
    if (!onCreateEmployee) {
      alert('خاصية إضافة المستخدم غير مفعلة حالياً');
      return;
    }

    try {
      setIsSubmittingUser(true);
      const created = await onCreateEmployee({
        full_name: formData.full_name,
        role: formData.role,
        username: formData.username,
        password_hash: btoa(formData.password || '123456'),
        phone: formData.phone || formData.username,
        national_id: formData.national_id || (Math.floor(10000000000000 + Math.random() * 90000000000000)).toString(),
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        address: formData.address || 'المقر الرئيسي',
        national_id_image_url: formData.national_id_image_url,
        is_active: true
      });

      alert(`تم إضافة المستخدم (${created.full_name}) بنجاح! يمكنك الآن ضبط وتعديل صلاحياته.`);
      setIsAddUserModalOpen(false);
      setFormData({
        full_name: '',
        role: 'admin',
        username: '',
        password: '',
        phone: '',
        national_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        address: '',
        national_id_image_url: ''
      });
      setSelectedEmployeeId(created.id);
      handleSelectEmployee(created);
    } catch (err: any) {
      alert('حدث خطأ أثناء إضافة المستخدم: ' + (err.message || 'يرجى مراجعة البيانات'));
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Reset Password for User
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalEmployee) return;
    if (!newPassword || newPassword.trim().length < 4) {
      alert('يرجى كتابة كلمة مرور صالحة (4 خانات أو أكثر)');
      return;
    }

    try {
      setIsResettingPassword(true);
      if (onResetPassword) {
        await onResetPassword(resetModalEmployee.id, newPassword.trim());
      }
      setResetSuccessNotice(`تم بنجاح تصفير وتعيين كلمة المرور الجديدة للمستخدم (${resetModalEmployee.full_name})!`);
      setTimeout(() => setResetSuccessNotice(null), 4000);
      setResetModalEmployee(null);
      setNewPassword('');
    } catch (err: any) {
      alert('فشل تصفير كلمة المرور: ' + (err.message || 'يرجى المحاولة مرة أخرى'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle Customer Clear Password (إلغاء كلمة المرور)
  const handleConfirmClearPassword = async () => {
    if (!clearPassCustomer) return;
    try {
      setIsProcessingCustomerPass(true);
      if (onResetCustomerPassword) {
        await onResetCustomerPassword(clearPassCustomer.id, null);
      } else if (onUpdateCustomer) {
        await onUpdateCustomer(clearPassCustomer.id, { password_hash: '' });
      }
      setCustomerNotice(`تم بنجاح إلغاء كلمة المرور للعميل (${clearPassCustomer.full_name}). يمكنه الآن تسجيل الدخول مباشرة برقم الموبايل دون كلمة مرور!`);
      setTimeout(() => setCustomerNotice(null), 5000);
      setClearPassCustomer(null);
    } catch (err: any) {
      alert('فشل إلغاء كلمة المرور: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsProcessingCustomerPass(false);
    }
  };

  // Handle Customer Set/Reset Password
  const handleConfirmSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setPassCustomer) return;
    if (!newCustPassword || newCustPassword.trim().length < 4) {
      alert('يرجى إدخال كلمة مرور مكونة من 4 خانات على الأقل');
      return;
    }
    try {
      setIsProcessingCustomerPass(true);
      if (onResetCustomerPassword) {
        await onResetCustomerPassword(setPassCustomer.id, newCustPassword.trim());
      } else if (onUpdateCustomer) {
        await onUpdateCustomer(setPassCustomer.id, { password_hash: btoa(newCustPassword.trim()) });
      }
      setCustomerNotice(`تم تعيين كلمة المرور الجديدة للعميل (${setPassCustomer.full_name}) بنجاح!`);
      setTimeout(() => setCustomerNotice(null), 5000);
      setSetPassCustomer(null);
      setNewCustPassword('');
    } catch (err: any) {
      alert('فشل تعيين كلمة المرور: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsProcessingCustomerPass(false);
    }
  };

  // Handle Customer Username Update
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsernameCustomer) return;
    if (!newUsernameVal.trim()) {
      alert('يرجى إدخال اسم مستخدم صالح');
      return;
    }
    try {
      setIsProcessingCustomerPass(true);
      if (onUpdateCustomer) {
        await onUpdateCustomer(editUsernameCustomer.id, { username: newUsernameVal.trim() });
      }
      setCustomerNotice(`تم تحديث اسم المستخدم للعميل (${editUsernameCustomer.full_name}) إلى @${newUsernameVal.trim()}`);
      setTimeout(() => setCustomerNotice(null), 4000);
      setEditUsernameCustomer(null);
      setNewUsernameVal('');
    } catch (err: any) {
      alert('فشل تحديث اسم المستخدم: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsProcessingCustomerPass(false);
    }
  };

  // Activate Customer Account (from pending_review or suspended to active)
  const handleActivateCustomer = async (cust: Customer) => {
    if (!onUpdateCustomer) return;
    try {
      setIsProcessingCustomerPass(true);
      await onUpdateCustomer(cust.id, { status: 'active' });
      setCustomerNotice(`تم تفعيل حساب العميل (${cust.full_name || cust.name}) بنجاح.`);
      setTimeout(() => setCustomerNotice(null), 4000);
    } catch (err: any) {
      alert('فشل تفعيل الحساب: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsProcessingCustomerPass(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = React.useMemo(() => {
    return (customers || []).filter((cust) => {
      const hasPass = Boolean(cust.password_hash && cust.password_hash.trim() !== '');
      if (customerFilter === 'with_pass' && !hasPass) return false;
      if (customerFilter === 'without_pass' && hasPass) return false;
      if (customerFilter === 'pending_review' && cust.status !== 'pending_review') return false;

      if (customerAreaFilter !== 'all' && cust.area_id !== customerAreaFilter) {
        return false;
      }

      if (!customerSearch.trim()) return true;
      const term = customerSearch.trim().toLowerCase();
      const nameMatch = (cust.full_name || cust.name || '').toLowerCase().includes(term);
      const phoneMatch = (cust.phone || '').includes(term) || (cust.mobile || '').includes(term);
      const userMatch = (cust.username || '').toLowerCase().includes(term);
      const bldMatch = (cust.building_number || '').toLowerCase().includes(term);
      const addressMatch = (cust.detailed_address || cust.block || cust.block_number || '').toLowerCase().includes(term);
      const area = (coverageAreas || []).find((a) => a.id === cust.area_id);
      const areaMatch = area?.name?.toLowerCase().includes(term);

      return Boolean(nameMatch || phoneMatch || userMatch || bldMatch || addressMatch || areaMatch);
    });
  }, [customers, customerFilter, customerAreaFilter, customerSearch, coverageAreas]);

  // Sorted customer list
  const sortedCustomers = React.useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      if (customerSortBy === 'name_asc') {
        return (a.full_name || '').localeCompare(b.full_name || '', 'ar');
      }
      if (customerSortBy === 'name_desc') {
        return (b.full_name || '').localeCompare(a.full_name || '', 'ar');
      }
      if (customerSortBy === 'vehicles') {
        const aCount = (vehicles || []).filter((v) => v.customer_id === a.id).length;
        const bCount = (vehicles || []).filter((v) => v.customer_id === b.id).length;
        return bCount - aCount;
      }
      if (customerSortBy === 'subscriptions') {
        const aCount = (subscriptions || []).filter((s) => s.customer_id === a.id).length;
        const bCount = (subscriptions || []).filter((s) => s.customer_id === b.id).length;
        return bCount - aCount;
      }
      // 'newest' default
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredCustomers, customerSortBy, vehicles, subscriptions]);

  // Reset page when filter or search changes
  React.useEffect(() => {
    setCustomerCurrentPage(1);
  }, [customerSearch, customerFilter, customerAreaFilter, customerSortBy, customerPageSize]);

  // Pagination calculation
  const totalCustomerPages = Math.max(1, Math.ceil(sortedCustomers.length / customerPageSize));
  const safeCustomerPage = Math.min(Math.max(1, customerCurrentPage), totalCustomerPages);
  const startIdx = (safeCustomerPage - 1) * customerPageSize;
  const paginatedCustomers = sortedCustomers.slice(startIdx, startIdx + customerPageSize);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-purple-200">مدير إداري</span>;
      case 'supervisor':
        return <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-sky-200">مشرف مناطق</span>;
      default:
        return <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-teal-200">عامل غسيل</span>;
    }
  };

  // Group operations by category
  const categoriesList = Array.from(new Set(allOperations.map((op) => op.category)));
  const pendingCustomersCount = (customers || []).filter((c) => c.status === 'pending_review').length;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Top Segmented Account Type Tabs: Staff & Management vs Customer Accounts */}
      <div className="bg-slate-200/90 p-1.5 rounded-2xl flex flex-wrap gap-2 border border-slate-300/70 shadow-xs">
        <button
          type="button"
          onClick={() => setAccountTypeTab('staff')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            accountTypeTab === 'staff'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>طاقم العمل والموظفين والإدارة ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAccountTypeTab('customers')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            accountTypeTab === 'customers'
              ? 'bg-teal-700 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Users className="w-4 h-4 text-teal-300" />
          <span>حسابات العملاء وبوابة الدخول ({(customers || []).length})</span>
          {pendingCustomersCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
              {pendingCustomersCount} معلق
            </span>
          )}
        </button>
      </div>

      {customerNotice && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span>{customerNotice}</span>
          </div>
          <button
            onClick={() => setCustomerNotice(null)}
            className="text-teal-700 hover:text-teal-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: STAFF & MANAGEMENT PERMISSIONS TAB           */}
      {/* ======================================================== */}
      {accountTypeTab === 'staff' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <KeyRound className="w-7 h-7 text-teal-600" />
                <span>مستخدمو النظام والصلاحيات المتقدمة</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                إدارة مستخدمي النظام، التحكم الدقيق في عمليات وخصائص كل شاشة، وتخصيص صلاحيات العمليات الحصرية
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* زر إضافة مستخدم جديد */}
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>

              {selectedEmployee && (
                <button
                  onClick={handleSavePerms}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isSaving ? 'جاري الحفظ...' : `حفظ صلاحيات ${selectedEmployee.full_name}`}</span>
                </button>
              )}
            </div>
          </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تم حفظ وتحديث مصفوفة الصلاحيات بنجاح لهذا المستخدم!</span>
        </div>
      )}

      {resetSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{resetSuccessNotice}</span>
          </div>
          <button
            onClick={() => setResetSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-4">
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <p>لا يوجد مستخدمون مسجلون في النظام حتى الآن.</p>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة أول مستخدم الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: User Selection */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">مستخدمو النظام ({employees.length})</h3>
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  title="إضافة مستخدم جديد"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو رقم الموبايل أو اليوزر..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredEmployees.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  لا توجد نتائج تطابق &quot;{searchTerm}&quot;
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = emp.id === selectedEmployeeId;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`w-full text-right p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-300/80 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.full_name.slice(0, 1) || <User className="w-4 h-4" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className={`font-bold text-xs truncate ${isSelected ? 'text-teal-950' : 'text-slate-800'}`}>
                            {emp.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5">
                            <span>@{emp.username || 'بدون يوزر'}</span>
                            {emp.phone && (
                              <span className="text-teal-700 font-semibold bg-teal-50 px-1 rounded text-[10px]">
                                {emp.phone}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">{getRoleBadge(emp.role)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: RBAC & Granular Operations Details */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {selectedEmployee ? (
              <div className="p-6 space-y-6">
                {/* Employee Card Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-teal-50/20 to-sky-50/30 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                      {selectedEmployee.full_name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{selectedEmployee.full_name}</h3>
                        {getRoleBadge(selectedEmployee.role)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        اسم المستخدم: <span className="font-mono text-slate-700 font-bold">{selectedEmployee.username || '-'}</span> | الهاتف: <span className="font-mono text-slate-700 font-bold">{selectedEmployee.phone || '-'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setResetModalEmployee(selectedEmployee);
                        setNewPassword('');
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      title="تصفير وتعيين كلمة مرور جديدة لهذا المستخدم"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>تصفير كلمة المرور</span>
                    </button>

                    <button
                      onClick={handleSavePerms}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs: Granular Operations vs Pages Matrix vs Add Custom Perm */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveSubTab('operations')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeSubTab === 'operations' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-teal-600" />
                      <span>صلاحيات العمليات والخصائص المحددة ({allOperations.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveSubTab('matrix')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeSubTab === 'matrix' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-sky-600" />
                      <span>مصفوفة الشاشات (CRUD)</span>
                    </button>
                    <button
                      onClick={() => setActiveSubTab('custom')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeSubTab === 'custom' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                      <span>إضافة/حذف صلاحية مخصصة</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: Granular Operations & Specific Features (مثل تعديل سعر الباقة، الخزائن، إلخ) */}
                {activeSubTab === 'operations' && (
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Important Featured Operation Notice */}
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">التحكم في العمليات الحصرية: </span>
                        <span>
                          يمكنك هنا منح أو حظر ميزات معينة داخل نفس الشاشة. مثلاً: يمكن للمستخدم إنشاء اشتراك ولكن يُحظر عليه تغيير سعر الباقة يدوياً (مفتاح: subs_override_price).
                        </span>
                      </div>
                    </div>

                    {categoriesList.map((category) => {
                      const categoryOps = allOperations.filter((op) => op.category === category);
                      return (
                        <div key={category} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                              <span>{category}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {categoryOps.length} صلاحيات
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100 bg-white">
                            {categoryOps.map((op) => {
                              const isAllowed = permissionsState[op.key]?.can_create ?? false;
                              return (
                                <div
                                  key={op.key}
                                  onClick={() => handleToggleOperation(op.key)}
                                  className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                    isAllowed ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-xs ${isAllowed ? 'text-teal-950' : 'text-slate-800'}`}>
                                        {op.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({op.key})
                                      </span>
                                      {op.key === 'subs_override_price' && (
                                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.2 rounded border border-amber-300">
                                          ميزة هامة
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                      {op.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                      isAllowed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {isAllowed ? 'متاح ومفعل' : 'غير متاح (محظور)'}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={isAllowed}
                                      onChange={() => {}} // Handled by container onClick
                                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: Screen Matrix (CRUD) */}
                {activeSubTab === 'matrix' && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">الشاشة / الصفحة</th>
                            <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleColumn('can_read')}>
                              قراءة (Read)
                            </th>
                            <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleColumn('can_create')}>
                              إنشاء (Create)
                            </th>
                            <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleColumn('can_update')}>
                              تعديل (Update)
                            </th>
                            <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleColumn('can_delete')}>
                              حذف (Delete)
                            </th>
                            <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleColumn('can_approve')}>
                              اعتماد (Approve)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {AVAILABLE_PAGES.map((page) => {
                            const state = permissionsState[page.key] || {
                              can_create: false,
                              can_read: true,
                              can_update: false,
                              can_delete: false,
                              can_approve: false
                            };
                            return (
                              <tr key={page.key} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                                  <span>{page.name}</span>
                                </td>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={state.can_read}
                                    onChange={(e) =>
                                      setPermissionsState({
                                        ...permissionsState,
                                        [page.key]: { ...state, can_read: e.target.checked }
                                      })
                                    }
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={state.can_create}
                                    onChange={(e) =>
                                      setPermissionsState({
                                        ...permissionsState,
                                        [page.key]: { ...state, can_create: e.target.checked }
                                      })
                                    }
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={state.can_update}
                                    onChange={(e) =>
                                      setPermissionsState({
                                        ...permissionsState,
                                        [page.key]: { ...state, can_update: e.target.checked }
                                      })
                                    }
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={state.can_delete}
                                    onChange={(e) =>
                                      setPermissionsState({
                                        ...permissionsState,
                                        [page.key]: { ...state, can_delete: e.target.checked }
                                      })
                                    }
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={state.can_approve}
                                    onChange={(e) =>
                                      setPermissionsState({
                                        ...permissionsState,
                                        [page.key]: { ...state, can_approve: e.target.checked }
                                      })
                                    }
                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: Add / Edit / Delete Custom Permissions */}
                {activeSubTab === 'custom' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-200">
                      <div>
                        <h4 className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>إضافة صلاحية جديدة لأي ميزة مستقبلية في النظام</span>
                        </h4>
                        <p className="text-xs text-purple-700 mt-0.5">
                          يمكنك هنا تعريف أي صلاحية جديدة لخاصية محددة وإتاحتها فوراً لكافة مستخدمي النظام
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAddingNewOp(!isAddingNewOp)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAddingNewOp ? 'إغلاق النموذج' : 'إضافة صلاحية جديدة'}</span>
                      </button>
                    </div>

                    {isAddingNewOp && (
                      <form onSubmit={handleAddCustomOperation} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الصلاحية *</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: خصم إضافي خاص بالاشتراك"
                              value={newOpData.name}
                              onChange={(e) => setNewOpData({ ...newOpData, name: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">المعرف البرمجي (Key) *</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: subs_apply_discount"
                              value={newOpData.key}
                              onChange={(e) => setNewOpData({ ...newOpData, key: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">القسم / التصنيف *</label>
                            <select
                              value={newOpData.category}
                              onChange={(e) => setNewOpData({ ...newOpData, category: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                            >
                              <option value="الاشتراكات والأسعار">الاشتراكات والأسعار</option>
                              <option value="الرزنامة والجدولة">الرزنامة والجدولة</option>
                              <option value="العملاء والمركبات">العملاء والمركبات</option>
                              <option value="الباقات والتسعير">الباقات والتسعير</option>
                              <option value="المالية والخزائن">المالية والخزائن</option>
                              <option value="المخزون والمعدات">المخزون والمعدات</option>
                              <option value="الموظفين والحضور">الموظفين والحضور</option>
                              <option value="الصلاحيات والإعدادات">الصلاحيات والإعدادات</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف الصلاحية والغرض منها</label>
                          <input
                            type="text"
                            placeholder="شرح تفصيلي لما تتيحه هذه الصلاحية للمستخدم..."
                            value={newOpData.description}
                            onChange={(e) => setNewOpData({ ...newOpData, description: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
                          >
                            حفظ الصلاحية وتفعيلها للنظام
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewOp(false)}
                            className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                          >
                            إلغاء
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Custom Operations List */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-slate-700">الصلاحيات المخصصة المضافة حديثاً ({customOperations.length})</h4>
                      {customOperations.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                          لم يتم إضافة صلاحيات مخصصة بعد. كافة صلاحيات النظام الأساسية متوفرة في تبويب &quot;صلاحيات العمليات والخصائص&quot;.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                          {customOperations.map((op) => (
                            <div key={op.key} className="p-3.5 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">{op.name}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                    {op.key}
                                  </span>
                                  <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold">
                                    {op.category}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">{op.description}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteCustomOperation(op.key)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="حذف الصلاحية"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-sm">
                يرجى اختيار مستخدم من القائمة الجانبية لتعديل صلاحياته
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: CUSTOMER ACCOUNTS TAB                        */}
      {/* ======================================================== */}
      {accountTypeTab === 'customers' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-teal-600" />
                <span>حسابات العملاء وبوابة الدخول الذكية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                إدارة حسابات دخول العملاء المسجلين، مع إمكانية إلغاء كلمة المرور للدخول المباشر برقم الجوال أو إعادة تعيينها
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCustomerViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customerViewMode === 'table'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض جدول"
              >
                <List className="w-4 h-4" />
                <span>عرض جدولي</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customerViewMode === 'grid'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض شبكي (بطاقات)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>عرض بطاقات</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">إجمالي حسابات العملاء</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{(customers || []).length}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">حسابات بكلمة مرور نشطة</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {(customers || []).filter((c) => Boolean(c.password_hash && c.password_hash.trim() !== '')).length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 block">دخول مباشر (كلمة المرور ملغاة)</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {(customers || []).filter((c) => !c.password_hash || c.password_hash.trim() === '').length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Unlock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Filter Controls Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            {/* Top Row: Search Input & Password Status Buttons */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  placeholder="بحث سريع: اسم العميل، رقم الهاتف، اسم المستخدم، المنطقة، أو المبنى..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pr-10 pl-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium transition-all"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Password Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomerFilter('all')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل ({(customers || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('with_pass')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    customerFilter === 'with_pass'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>بكلمة مرور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('without_pass')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    customerFilter === 'without_pass'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>دخول مباشر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('pending_review')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    customerFilter === 'pending_review'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : pendingCustomersCount > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <AlertCircle className={`w-3.5 h-3.5 ${pendingCustomersCount > 0 && customerFilter !== 'pending_review' ? 'text-amber-600 animate-pulse' : ''}`} />
                  <span>معلق للمراجعة ({pendingCustomersCount})</span>
                </button>
              </div>
            </div>

            {/* Second Row: Detailed Filters (Area, Sort, Page Size, Reset) */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Area Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>المنطقة:</span>
                  </span>
                  <select
                    value={customerAreaFilter}
                    onChange={(e) => setCustomerAreaFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">جميع المناطق</option>
                    {(coverageAreas || []).map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} {area.city ? `(${area.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" />
                    <span>الترتيب:</span>
                  </span>
                  <select
                    value={customerSortBy}
                    onChange={(e) => setCustomerSortBy(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="newest">الأحدث تسجيلاً</option>
                    <option value="name_asc">الاسم (أ - ي)</option>
                    <option value="name_desc">الاسم (ي - أ)</option>
                    <option value="subscriptions">الأكثر اشتراكات</option>
                    <option value="vehicles">الأكثر مركبات</option>
                  </select>
                </div>

                {/* Per Page */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">عرض:</span>
                  <select
                    value={customerPageSize}
                    onChange={(e) => setCustomerPageSize(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={10}>10 في الصفحة</option>
                    <option value={25}>25 في الصفحة</option>
                    <option value={50}>50 في الصفحة</option>
                    <option value={100}>100 في الصفحة</option>
                  </select>
                </div>
              </div>

              {/* Reset Filters & Results Count */}
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-bold">
                  النتائج: <span className="text-teal-700 font-black">{sortedCustomers.length}</span> من أصل {(customers || []).length}
                </span>

                {(customerSearch || customerFilter !== 'all' || customerAreaFilter !== 'all' || customerSortBy !== 'newest') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('');
                      setCustomerFilter('all');
                      setCustomerAreaFilter('all');
                      setCustomerSortBy('newest');
                    }}
                    className="text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Customers Data Presentation (Table or Grid) */}
          {sortedCustomers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold">لا توجد حسابات عملاء تطابق معايير البحث والتصفية المحددة.</p>
              <button
                type="button"
                onClick={() => {
                  setCustomerSearch('');
                  setCustomerFilter('all');
                  setCustomerAreaFilter('all');
                  setCustomerSortBy('newest');
                }}
                className="text-xs text-teal-600 hover:text-teal-700 underline font-bold mt-2 inline-block cursor-pointer"
              >
                إعادة ضبط خيارات البحث
              </button>
            </div>
          ) : customerViewMode === 'table' ? (
            /* ======================================================== */
            /* TABLE VIEW (جدولي)                                      */
            /* ======================================================== */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">العميل / الحساب</th>
                      <th className="py-3.5 px-4">رقم الموبايل / الاتصال</th>
                      <th className="py-3.5 px-4">المنطقة والموقع</th>
                      <th className="py-3.5 px-4 text-center">المركبات / الاشتراكات</th>
                      <th className="py-3.5 px-4 text-center">بوابة الدخول الذكية</th>
                      <th className="py-3.5 px-4 text-center">إدارة الحساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {paginatedCustomers.map((c, idx) => {
                      const area = (coverageAreas || []).find((a) => a.id === c.area_id);
                      const custVehicles = (vehicles || []).filter((v) => v.customer_id === c.id);
                      const custSubs = (subscriptions || []).filter((s) => s.customer_id === c.id);
                      const hasPassword = Boolean(c.password_hash && c.password_hash.trim() !== '');
                      const rowNum = startIdx + idx + 1;

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-teal-50/30 transition-colors"
                        >
                          {/* Row Number */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>

                          {/* Customer Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 font-black text-xs flex items-center justify-center shrink-0">
                                {c.full_name?.slice(0, 1) || <User className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 leading-snug">
                                  {c.full_name || c.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                    @{c.username || c.phone}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditUsernameCustomer(c);
                                      setNewUsernameVal(c.username || '');
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                    title="تعديل اسم المستخدم"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone & Direct Contact */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span dir="ltr" className="font-bold text-slate-800 font-mono text-xs">
                                {c.phone || c.mobile || '—'}
                              </span>
                              {c.phone && (
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="p-1 hover:bg-slate-100 text-teal-700 rounded transition-colors"
                                    title="اتصال هاتفي"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-slate-100 text-emerald-600 rounded transition-colors"
                                    title="محادثة واتساب"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Area & Location */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="font-bold">
                                {area?.name || 'غير محدد'}
                              </span>
                              {c.building_number && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  (عمارة {c.building_number})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Vehicles & Subscriptions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700"
                                title="عدد المركبات المسجلة"
                              >
                                <Car className="w-3 h-3 text-teal-600" />
                                <span>{custVehicles.length}</span>
                              </span>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700"
                                title="عدد الاشتراكات"
                              >
                                <ClipboardList className="w-3 h-3 text-teal-600" />
                                <span>{custSubs.length}</span>
                              </span>
                            </div>
                          </td>

                          {/* Password & Account Status */}
                          <td className="py-3.5 px-4 text-center">
                            {c.status === 'pending_review' ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>معلق للمراجعة</span>
                                </span>
                              </div>
                            ) : c.status === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span>حساب موقوف</span>
                              </span>
                            ) : hasPassword ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>كلمة مرور مفعلة</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <Unlock className="w-3 h-3 text-sky-600" />
                                <span>دخول مباشر برقم الجوال</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {c.status === 'pending_review' && (
                                <button
                                  type="button"
                                  onClick={() => handleActivateCustomer(c)}
                                  disabled={isProcessingCustomerPass}
                                  className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  title="تفعيل حساب العميل والسماح له بالدخول"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>تفعيل الحساب</span>
                                </button>
                              )}

                              {hasPassword ? (
                                <button
                                  type="button"
                                  onClick={() => setClearPassCustomer(c)}
                                  className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  title="إلغاء كلمة المرور لتمكين الدخول المباشر برقم الموبايل"
                                >
                                  <Unlock className="w-3 h-3 text-rose-600" />
                                  <span>إلغاء كلمة المرور</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-bold border border-sky-200">
                                  دخول مباشر
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSetPassCustomer(c);
                                  setNewCustPassword('');
                                }}
                                className="py-1 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title={hasPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور'}
                              >
                                <KeyRound className="w-3 h-3 text-teal-600" />
                                <span>{hasPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar inside table card */}
              <div className="bg-slate-50/90 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Information */}
                <div className="text-slate-500 font-bold">
                  عرض <span className="text-slate-800 font-mono">{startIdx + 1}</span> إلى{' '}
                  <span className="text-slate-800 font-mono">
                    {Math.min(startIdx + customerPageSize, sortedCustomers.length)}
                  </span>{' '}
                  من إجمالي <span className="text-teal-700 font-mono font-black">{sortedCustomers.length}</span> عميل
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  {/* First Page (RTL: ChevronsRight) */}
                  <button
                    type="button"
                    disabled={safeCustomerPage <= 1}
                    onClick={() => setCustomerCurrentPage(1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة الأولى"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>

                  {/* Previous Page (RTL: ChevronRight) */}
                  <button
                    type="button"
                    disabled={safeCustomerPage <= 1}
                    onClick={() => setCustomerCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Numbered Page Buttons */}
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalCustomerPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalCustomerPages ||
                          Math.abs(page - safeCustomerPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCustomerCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                                page === safeCustomerPage
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  {/* Next Page (RTL: ChevronLeft) */}
                  <button
                    type="button"
                    disabled={safeCustomerPage >= totalCustomerPages}
                    onClick={() => setCustomerCurrentPage((prev) => Math.min(totalCustomerPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة التالية"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Last Page (RTL: ChevronsLeft) */}
                  <button
                    type="button"
                    disabled={safeCustomerPage >= totalCustomerPages}
                    onClick={() => setCustomerCurrentPage(totalCustomerPages)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة الأخيرة"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* GRID VIEW (البطاقات) مع نظام الصفحات                    */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedCustomers.map((c) => {
                  const area = (coverageAreas || []).find((a) => a.id === c.area_id);
                  const custVehicles = (vehicles || []).filter((v) => v.customer_id === c.id);
                  const custSubs = (subscriptions || []).filter((s) => s.customer_id === c.id);
                  const hasPassword = Boolean(c.password_hash && c.password_hash.trim() !== '');

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Top Header of Card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 font-black text-sm flex items-center justify-center shrink-0">
                              {c.full_name?.slice(0, 1) || <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm leading-snug">{c.full_name || c.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-bold">
                                  @{c.username || c.phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditUsernameCustomer(c);
                                    setNewUsernameVal(c.username || '');
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                  title="تعديل اسم المستخدم"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Password & Account Status Badge */}
                          {c.status === 'pending_review' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0 shadow-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>معلق للمراجعة</span>
                            </span>
                          ) : c.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                              <span>حساب موقوف</span>
                            </span>
                          ) : hasPassword ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              <span>كلمة المرور مفعلة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                              <Unlock className="w-3 h-3 text-sky-600" />
                              <span>دخول مباشر</span>
                            </span>
                          )}
                        </div>

                        {/* Meta Information */}
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-medium block">رقم الموبايل:</span>
                            <div className="flex items-center justify-between mt-1">
                              <span dir="ltr" className="font-bold text-slate-800 font-mono text-xs">
                                {c.phone || c.mobile}
                              </span>
                              <div className="flex items-center gap-1">
                                {c.phone && (
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="p-1 hover:bg-slate-200 rounded text-teal-700"
                                    title="اتصال"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {c.phone && (
                                  <a
                                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-slate-200 rounded text-emerald-600"
                                    title="مراسلة واتساب"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-medium block">المنطقة والموقع:</span>
                            <span className="font-bold text-slate-800 truncate block mt-1">
                              {area?.name || 'غير محدد'} {c.building_number ? `- عمارة ${c.building_number}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Badges for counts */}
                        <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-600 font-bold">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-slate-700">
                            <Car className="w-3 h-3 text-teal-600" />
                            <span>{custVehicles.length} مركبات</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-slate-700">
                            <ClipboardList className="w-3 h-3 text-teal-600" />
                            <span>{custSubs.length} اشتراكات</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Cancel Password & Reset Password & Activation */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                        {c.status === 'pending_review' && (
                          <button
                            type="button"
                            onClick={() => handleActivateCustomer(c)}
                            disabled={isProcessingCustomerPass}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تفعيل واعتماد الحساب</span>
                          </button>
                        )}

                        <div className="flex items-center gap-2">
                        {hasPassword ? (
                          <button
                            type="button"
                            onClick={() => setClearPassCustomer(c)}
                            className="flex-1 py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="إلغاء كلمة المرور لتمكين الدخول المباشر برقم الموبايل"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>إلغاء كلمة المرور</span>
                          </button>
                        ) : (
                          <div className="flex-1 py-2 px-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 font-bold flex items-center justify-center gap-1">
                            <Unlock className="w-3.5 h-3.5 text-amber-600" />
                            <span>دخول مباشر برقم الجوال</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSetPassCustomer(c);
                            setNewCustPassword('');
                          }}
                          className="flex-1 py-2 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                          <span>{hasPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {/* Grid Pagination Controls */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-bold">
                  عرض <span className="text-slate-800 font-mono">{startIdx + 1}</span> إلى{' '}
                  <span className="text-slate-800 font-mono">
                    {Math.min(startIdx + customerPageSize, sortedCustomers.length)}
                  </span>{' '}
                  من إجمالي <span className="text-teal-700 font-mono font-black">{sortedCustomers.length}</span> عميل
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCustomerPage <= 1}
                    onClick={() => setCustomerCurrentPage(1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة الأولى"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={safeCustomerPage <= 1}
                    onClick={() => setCustomerCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalCustomerPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalCustomerPages ||
                          Math.abs(page - safeCustomerPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCustomerCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                                page === safeCustomerPage
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={safeCustomerPage >= totalCustomerPages}
                    onClick={() => setCustomerCurrentPage((prev) => Math.min(totalCustomerPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة التالية"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={safeCustomerPage >= totalCustomerPages}
                    onClick={() => setCustomerCurrentPage(totalCustomerPages)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة الأخيرة"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* نافذة Modal لإضافة مستخدم جديد */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">إضافة مستخدم جديد للنظام</h3>
                  <p className="text-xs text-slate-500">
                    إنشاء حساب مدير إداري، مشرف، أو أي مستخدم آخر مع تحديد دوره
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الدور / المسمى الوظيفي *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="admin">مدير إداري (Admin) - صلاحيات كاملة</option>
                  <option value="supervisor">مشرف مناطق (Supervisor)</option>
                  <option value="worker">عامل ميداني (Worker)</option>
                </select>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="م. أحمد الشناوي"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف / الموبايل</label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="admin_ahmed"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* National ID & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم القومي (اختياري)</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="14 رقماً"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان / الفرع</label>
                  <input
                    type="text"
                    placeholder="الشيخ زايد - الإدارة"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">صورة المستخدم / الموظف (اختياري)</label>
                <div className="flex items-center gap-3">
                  {formData.national_id_image_url ? (
                    <img
                      src={formData.national_id_image_url}
                      alt="معاينة"
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" /> : <UploadCloud className="w-3.5 h-3.5 text-teal-600" />}
                    <span>{isUploadingImage ? 'جاري الرفع...' : 'رفع صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadNotice && (
                  <p className="text-[11px] text-emerald-700 font-medium">{uploadNotice}</p>
                )}
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingUser || isUploadingImage}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-teal-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingUser ? 'جاري الإضافة...' : 'حفظ وإضافة المستخدم'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تصفير كلمة مرور المستخدم</h3>
                  <p className="text-xs text-slate-500">
                    المستخدم: <span className="font-bold text-slate-800">{resetModalEmployee.full_name}</span> (@{resetModalEmployee.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>تنبيه أمني للإدارة:</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  سيتم استبدال وتصفير كلمة مرور هذا المستخدم فوراً، وسيتمكن من استخدام كلمة المرور الجديدة عند تسجيل دخوله القادم للنظام.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور الجديدة (New Password) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="أدخل كلمة المرور الجديدة (مثال: 123456)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد وتصفير كلمة المرور</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isResettingPassword}
                  onClick={() => setResetModalEmployee(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد إلغاء كلمة المرور للعميل */}
      {clearPassCustomer && (
        <div
          onClick={() => setClearPassCustomer(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp p-6 space-y-4 text-right"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <Unlock className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                إلغاء كلمة المرور لحساب العميل
              </h3>
              <p className="text-sm font-bold text-teal-700 mt-1">
                {clearPassCustomer.full_name} (@{clearPassCustomer.username || clearPassCustomer.phone})
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ماذا سيحدث بعد إلغاء كلمة المرور؟</span>
              </p>
              <p>
                سيتم مسح كلمة المرور القديمة، وسيتمكن العميل من <strong>تسجيل الدخول مباشرة</strong> إلى حسابه وبوابته باستخدام رقم هاتفه <strong>({clearPassCustomer.phone})</strong> أو اسم المستخدم دون الحاجة لإدخال أي كلمة مرور.
              </p>
              <p className="text-[11px] text-amber-800">
                يمكنك إعادة تعيين كلمة مرور له في أي وقت لاحقاً إذا رغب في ذلك.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessingCustomerPass}
                onClick={handleConfirmClearPassword}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingCustomerPass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإلغاء...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>تأكيد إلغاء كلمة المرور</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isProcessingCustomerPass}
                onClick={() => setClearPassCustomer(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعيين أو تغيير كلمة المرور للعميل */}
      {setPassCustomer && (
        <div
          onClick={() => setSetPassCustomer(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp p-6 space-y-4 text-right"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                {setPassCustomer.password_hash ? 'تغيير كلمة المرور للعميل' : 'تعيين كلمة مرور جديدة للعميل'}
              </h3>
              <p className="text-sm font-bold text-teal-700 mt-1">
                {setPassCustomer.full_name} (@{setPassCustomer.username || setPassCustomer.phone})
              </p>
            </div>

            <form onSubmit={handleConfirmSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور الجديدة *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="أدخل كلمة مرور (4 خانات على الأقل)"
                    value={newCustPassword}
                    onChange={(e) => setNewCustPassword(e.target.value)}
                    className="w-full pr-3.5 pl-24 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCustPassword('123456')}
                    className="absolute left-2 top-2 px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    تعيين 123456
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isProcessingCustomerPass}
                  className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingCustomerPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ وتفعيل كلمة المرور</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isProcessingCustomerPass}
                  onClick={() => setSetPassCustomer(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل اسم المستخدم للعميل */}
      {editUsernameCustomer && (
        <div
          onClick={() => setEditUsernameCustomer(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp p-6 space-y-4 text-right"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                تعديل اسم المستخدم للعميل
              </h3>
              <p className="text-sm font-bold text-teal-700 mt-1">
                {editUsernameCustomer.full_name}
              </p>
            </div>

            <form onSubmit={handleSaveUsername} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم الجديد (Username) *
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold text-sm">@</span>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={newUsernameVal}
                    onChange={(e) => setNewUsernameVal(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                    className="w-full pr-8 pl-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isProcessingCustomerPass}
                  className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingCustomerPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تحديث اسم المستخدم</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isProcessingCustomerPass}
                  onClick={() => setEditUsernameCustomer(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
