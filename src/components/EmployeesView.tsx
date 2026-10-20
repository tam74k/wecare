import React, { useState, useEffect } from 'react';
import {
  Employee,
  Attendance,
  AttendanceStatus,
  Visit,
  Customer,
  Subscription,
  CoverageArea,
  Vehicle,
  Settings,
  SalaryPayment,
  Treasury,
  PaymentMethod
} from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { SalariesSection } from './SalariesSection';
import {
  ShieldCheck,
  UserPlus,
  CalendarCheck,
  Calendar,
  Phone,
  MapPin,
  User,
  Trash2,
  Clock,
  UploadCloud,
  ImageIcon,
  Loader2,
  CheckCircle2,
  FileText,
  Eye,
  X,
  ExternalLink,
  ShieldAlert,
  IdCard,
  Camera,
  ZoomIn,
  AlertCircle,
  Wallet,
  DollarSign
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  attendance: Attendance[];
  visits?: Visit[];
  customers?: Customer[];
  subscriptions?: Subscription[];
  coverageAreas?: CoverageArea[];
  vehicles?: Vehicle[];
  settings?: Settings;
  salaryPayments?: SalaryPayment[];
  treasuries?: Treasury[];
  paymentMethods?: PaymentMethod[];
  onCreateEmployee: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<Employee>;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<Employee>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onMarkAttendance: (att: Omit<Attendance, 'id' | 'created_at'>) => Promise<void>;
  onNavigateToPermissions?: () => void;
  onCreateSalaryPayment?: (payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>) => Promise<SalaryPayment>;
  onUpdateSalaryPayment?: (id: string, updates: Partial<SalaryPayment>) => Promise<SalaryPayment>;
  onDeleteSalaryPayment?: (id: string) => Promise<boolean>;
  onRefreshData?: () => Promise<void>;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  attendance,
  visits: propsVisits,
  customers: propsCustomers,
  subscriptions: propsSubscriptions,
  coverageAreas: propsCoverageAreas,
  vehicles: propsVehicles,
  settings: propsSettings,
  salaryPayments = [],
  treasuries = [],
  paymentMethods = [],
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onMarkAttendance,
  onNavigateToPermissions,
  onCreateSalaryPayment,
  onUpdateSalaryPayment,
  onDeleteSalaryPayment,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'attendance' | 'salaries'>('list');

  // Employee Profile & Schedule Modal State
  const [viewingEmployeeProfile, setViewingEmployeeProfile] = useState<Employee | null>(null);

  // Synchronized entities for employee schedule and print sheet
  const [internalVisits, setInternalVisits] = useState<Visit[]>(propsVisits || []);
  const [internalCustomers, setInternalCustomers] = useState<Customer[]>(propsCustomers || []);
  const [internalSubscriptions, setInternalSubscriptions] = useState<Subscription[]>(propsSubscriptions || []);
  const [internalCoverageAreas, setInternalCoverageAreas] = useState<CoverageArea[]>(propsCoverageAreas || []);
  const [internalVehicles, setInternalVehicles] = useState<Vehicle[]>(propsVehicles || []);
  const [internalSettings, setInternalSettings] = useState<Settings | undefined>(propsSettings);

  useEffect(() => {
    if (propsVisits) setInternalVisits(propsVisits);
    else api.getVisits().then(setInternalVisits).catch(() => {});
  }, [propsVisits]);

  useEffect(() => {
    if (propsCustomers) setInternalCustomers(propsCustomers);
    else api.getCustomers().then(setInternalCustomers).catch(() => {});
  }, [propsCustomers]);

  useEffect(() => {
    if (propsSubscriptions) setInternalSubscriptions(propsSubscriptions);
    else api.getSubscriptions().then(setInternalSubscriptions).catch(() => {});
  }, [propsSubscriptions]);

  useEffect(() => {
    if (propsCoverageAreas) setInternalCoverageAreas(propsCoverageAreas);
    else api.getCoverageAreas().then(setInternalCoverageAreas).catch(() => {});
  }, [propsCoverageAreas]);

  useEffect(() => {
    if (propsVehicles) setInternalVehicles(propsVehicles);
    else api.getVehicles().then(setInternalVehicles).catch(() => {});
  }, [propsVehicles]);

  useEffect(() => {
    if (propsSettings) setInternalSettings(propsSettings);
    else api.getSettings().then(setInternalSettings).catch(() => {});
  }, [propsSettings]);

  // New Employee Form State
  const [formData, setFormData] = useState({
    national_id: '',
    full_name: '',
    phone: '',
    address: '',
    hire_date: '',
    personal_image_url: '',
    national_id_image_url: '',
    criminal_record_image_url: '',
    role: '' as 'admin' | 'supervisor' | 'worker',
    salary: 0,
    username: '',
    password_hash: ''
  });

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Document Upload State
  const [uploadingDocField, setUploadingDocField] = useState<'personal' | 'national_id' | 'criminal_record' | null>(null);
  const [docUploadNotice, setDocUploadNotice] = useState<string | null>(null);

  // Document Viewer / Edit Modal State
  const [viewingEmployeeDocs, setViewingEmployeeDocs] = useState<Employee | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ title: string; url: string } | null>(null);

  // Maximum Compression File Upload Handler
  const handleDocFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'personal' | 'national_id' | 'criminal_record',
    targetEmployeeId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDocField(field);
      setDocUploadNotice('جاري ضغط وتقليص حجم الصورة لأقصى درجة (WebP) وتوفير سعة التخزين...');

      let oldUrl: string | undefined = undefined;
      if (targetEmployeeId && viewingEmployeeDocs) {
        if (field === 'personal') oldUrl = viewingEmployeeDocs.personal_image_url;
        else if (field === 'national_id') oldUrl = viewingEmployeeDocs.national_id_image_url;
        else if (field === 'criminal_record') oldUrl = viewingEmployeeDocs.criminal_record_image_url;
      } else {
        if (field === 'personal') oldUrl = formData.personal_image_url;
        else if (field === 'national_id') oldUrl = formData.national_id_image_url;
        else if (field === 'criminal_record') oldUrl = formData.criminal_record_image_url;
      }

      // Maximum compression: 600px width, quality 0.68 WebP (typically 20-35KB per photo)
      const compressedUrl = await uploadStorageAsset(file, 'employees', oldUrl, {
        maxWidth: 600,
        quality: 0.68,
        format: 'image/webp'
      });

      if (targetEmployeeId && onUpdateEmployee) {
        const fieldKey = field === 'personal'
          ? 'personal_image_url'
          : field === 'national_id'
          ? 'national_id_image_url'
          : 'criminal_record_image_url';

        await onUpdateEmployee(targetEmployeeId, { [fieldKey]: compressedUrl });

        // Update viewing modal state
        setViewingEmployeeDocs(prev => prev ? { ...prev, [fieldKey]: compressedUrl } : null);
        setDocUploadNotice('تم حفظ الصورة المضغوطة وتحديث ملف الموظف بنجاح!');
      } else {
        // Form creation state
        if (field === 'personal') {
          setFormData(prev => ({ ...prev, personal_image_url: compressedUrl }));
        } else if (field === 'national_id') {
          setFormData(prev => ({ ...prev, national_id_image_url: compressedUrl }));
        } else if (field === 'criminal_record') {
          setFormData(prev => ({ ...prev, criminal_record_image_url: compressedUrl }));
        }
        setDocUploadNotice('تم ضغط الصورة لأقصى درجة وحفظها بنجاح!');
      }

      setTimeout(() => setDocUploadNotice(null), 3500);
    } catch (err: any) {
      alert('فشل رفع وضغط الصورة: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setDocUploadNotice(null);
    } finally {
      setUploadingDocField(null);
      e.target.value = '';
    }
  };

  // Handle Create Employee
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.national_id || formData.national_id.length !== 14) {
      alert('الرقم القومي يجب أن يتكون من 14 رقماً وفقاً لبطاقة الرقم القومي المصرية!');
      return;
    }
    if (!formData.role) {
      alert('يرجى تحديد المسمى الوظيفي للموظف');
      return;
    }

    await onCreateEmployee({
      ...formData,
      role: formData.role,
      salary: Number(formData.salary) || 0,
      password_hash: btoa(formData.password_hash || '123456'),
      is_active: true
    });

    alert('تم تسجيل الموظف ومستنداته بنجاح!');
    setActiveTab('list');
    setFormData({
      national_id: '',
      full_name: '',
      phone: '',
      address: '',
      hire_date: '',
      personal_image_url: '',
      national_id_image_url: '',
      criminal_record_image_url: '',
      role: '' as any,
      salary: 0,
      username: '',
      password_hash: ''
    });
  };

  // Mark Attendance
  const handleAttendanceChange = async (empId: string, status: AttendanceStatus) => {
    const nowTime = new Date().toTimeString().slice(0, 5);
    await onMarkAttendance({
      employee_id: empId,
      date: selectedDate,
      status,
      check_in: status === 'present' || status === 'late' ? nowTime : undefined,
      notes: `تسجيل حالة ${status}`
    });
  };

  const getStatusBadge = (status?: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs">حاضر</span>;
      case 'absent':
        return <span className="bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-lg text-xs">غائب</span>;
      case 'late':
        return <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-lg text-xs">متأخر</span>;
      case 'leave':
        return <span className="bg-sky-100 text-sky-800 font-bold px-3 py-1 rounded-lg text-xs">إجازة</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 font-medium px-3 py-1 rounded-lg text-xs">لم يسجل</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة الموظفين والوثائق والرواتب</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل العمال والمشرفين، مسير الرواتب والبدلات، حفظ المستندات الرسمية، ومتابعة الحضور والزيارات
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل الموظفين
          </button>
          <button
            onClick={() => setActiveTab('salaries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'salaries' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>مسير الرواتب والبدلات</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'create' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + تسجيل موظف جديد
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تتبع الحضور والغياب
          </button>
        </div>
      </div>

      {/* Tab 1: Employees List */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">قائمة الموظفين والعمال المسجلين ({employees.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('salaries')}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>إدارة الرواتب</span>
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة موظف</span>
              </button>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              لم يتم تسجيل أي موظف حتى الآن. انقر على &quot;تسجيل موظف جديد&quot; للبدء.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-4">الموظف / الاسم</th>
                    <th className="p-4">الرقم القومي</th>
                    <th className="p-4">رقم الهاتف</th>
                    <th className="p-4">الدور الوظيفي</th>
                    <th className="p-4 text-center">الراتب الأساسي</th>
                    <th className="p-4 text-center">المستندات والوثائق</th>
                    <th className="p-4">حساب الدخول</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {employees.map((emp) => {
                    const avatarUrl = emp.personal_image_url || emp.national_id_image_url;
                    const hasPersonal = !!emp.personal_image_url;
                    const hasIdCard = !!emp.national_id_image_url;
                    const hasCriminal = !!emp.criminal_record_image_url;
                    const docCount = [hasPersonal, hasIdCard, hasCriminal].filter(Boolean).length;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={emp.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-teal-200 shrink-0 shadow-xs cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-teal-500 transition-all"
                              onClick={() => setViewingEmployeeProfile(emp)}
                              title="انقر لعرض بطاقة وبيانات الموظف وجدوله"
                              onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=U')}
                            />
                          ) : (
                            <div
                              onClick={() => setViewingEmployeeProfile(emp)}
                              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0 cursor-pointer hover:bg-teal-50 hover:text-teal-700 transition-colors"
                              title="انقر لعرض بطاقة وبيانات الموظف وجدوله"
                            >
                              {emp.full_name.slice(0, 1) || <User className="w-4 h-4" />}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => setViewingEmployeeProfile(emp)}
                              className="font-bold text-slate-900 hover:text-teal-700 hover:underline cursor-pointer text-right inline-flex items-center gap-1.5 transition-colors group"
                              title="انقر لفتح بطاقة الموظف وجدول الزيارات كاملة"
                            >
                              <span>{emp.full_name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                            </button>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{emp.address}</span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs font-bold text-slate-600">{emp.national_id}</td>
                        <td className="p-4 font-mono text-xs">{emp.phone}</td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              emp.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : emp.role === 'supervisor'
                                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {emp.role === 'admin' ? 'مدير إداري' : emp.role === 'supervisor' ? 'مشرف مناطق' : 'عامل غسيل'}
                          </span>
                        </td>

                        {/* Salary Column */}
                        <td className="p-4 text-center font-mono font-bold text-slate-800 text-xs">
                          {emp.salary ? (
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800">
                              {Number(emp.salary).toLocaleString()} {(propsSettings || internalSettings)?.currency_symbol || 'ج.م'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">غير محدد</span>
                          )}
                        </td>

                        {/* Documents Status Column */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingEmployeeDocs(emp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                            title="عرض وتعديل الوثائق والمستندات الثلاثة"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>الوثائق ({docCount}/3)</span>
                            {docCount === 3 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                            )}
                          </button>
                        </td>

                        <td className="p-4 font-mono text-xs text-slate-500">
                          {emp.username ? (
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">@{emp.username}</span>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveTab('salaries')}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                              title="صرف راتب للموظف"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>صرف راتب</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف الموظف "${emp.full_name}"؟`)) {
                                  onDeleteEmployee(emp.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف الموظف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Salaries, Bonuses & Deductions Management */}
      {activeTab === 'salaries' && (
        <SalariesSection
          salaryPayments={salaryPayments}
          employees={employees}
          treasuries={treasuries}
          paymentMethods={paymentMethods}
          settings={propsSettings || internalSettings}
          onCreateSalaryPayment={onCreateSalaryPayment || (async () => ({} as any))}
          onUpdateSalaryPayment={onUpdateSalaryPayment || (async () => ({} as any))}
          onDeleteSalaryPayment={onDeleteSalaryPayment || (async () => true)}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Tab 3: Create Employee Form */}
      {activeTab === 'create' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-bold text-slate-900 text-lg">تسجيل موظف جديد وحفظ مستنداته الرسمية</h3>
            <p className="text-xs text-slate-500 mt-1">
              يتم حفظ بيانات الموظف والوثائق الرسمية (البطاقة، الفيش الجنائي، الصورة الشخصية) بأعلى تقنية ضغط للحفاظ على سعة التخزين
            </p>
          </div>

          <form onSubmit={handleSubmitEmployee} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم بالكامل رباعي</label>
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد إبراهيم علي"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الرقم القومي (14 رقماً وفقاً للبطاقة)
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  minLength={14}
                  placeholder="29501011234567"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono tracking-wider font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف / الواتساب</label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ التعيين / بدء العمل</label>
                <input
                  type="date"
                  required
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان السكن بالتفصيل</label>
                <input
                  type="text"
                  required
                  placeholder="المدينة، الحي، اسم الشارع، رقم العقار"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Document Uploads Box */}
            <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    <span>المستندات والوثائق الرسمية للموظف (رفع وتخزين آمن ومضغوط)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يتم تحويل الصور آلياً لصيغة WebP المضغوطة لتوفير المساحة والحفاظ على سرعة النظام
                  </p>
                </div>
                {docUploadNotice && (
                  <div className="text-xs font-bold text-teal-700 bg-white px-3 py-1 rounded-lg border border-teal-200 animate-pulse">
                    {docUploadNotice}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Personal Photo */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>الصورة الشخصية</span>
                    </span>
                    {formData.personal_image_url && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">تم الرفع</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    {formData.personal_image_url ? (
                      <img
                        src={formData.personal_image_url}
                        alt="شخصية"
                        className="w-14 h-14 rounded-full object-cover border border-teal-300 shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold w-full transition-colors">
                        {uploadingDocField === 'personal' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        <span>{formData.personal_image_url ? 'تغيير الصورة' : 'رفع صورة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'personal')}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">صورة واضحة لوجه الموظف</p>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="رابط مباشر (اختياري)..."
                    value={formData.personal_image_url}
                    onChange={(e) => setFormData({ ...formData, personal_image_url: e.target.value })}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 font-mono"
                  />
                </div>

                {/* 2. National ID Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-teal-600" />
                      <span>صورة بطاقة الرقم القومي</span>
                    </span>
                    {formData.national_id_image_url && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">تم الرفع</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    {formData.national_id_image_url ? (
                      <img
                        src={formData.national_id_image_url}
                        alt="البطاقة"
                        className="w-16 h-12 rounded-lg object-cover border border-teal-300 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <IdCard className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold w-full transition-colors">
                        {uploadingDocField === 'national_id' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        <span>{formData.national_id_image_url ? 'تغيير صورة البطاقة' : 'رفع البطاقة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'national_id')}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">صورة واضحة للرقم القومي</p>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="رابط مباشر (اختياري)..."
                    value={formData.national_id_image_url}
                    onChange={(e) => setFormData({ ...formData, national_id_image_url: e.target.value })}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 font-mono"
                  />
                </div>

                {/* 3. Criminal Record */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-teal-600" />
                      <span>الفيش الجنائي (الحالة الجنائية)</span>
                    </span>
                    {formData.criminal_record_image_url && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">تم الرفع</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    {formData.criminal_record_image_url ? (
                      <img
                        src={formData.criminal_record_image_url}
                        alt="الفيش"
                        className="w-16 h-12 rounded-lg object-cover border border-teal-300 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold w-full transition-colors">
                        {uploadingDocField === 'criminal_record' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        <span>{formData.criminal_record_image_url ? 'تغيير الفيش' : 'رفع الفيش'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'criminal_record')}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">صحيفة الحالة الجنائية</p>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="رابط مباشر (اختياري)..."
                    value={formData.criminal_record_image_url}
                    onChange={(e) => setFormData({ ...formData, criminal_record_image_url: e.target.value })}
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المسمى الوظيفي</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                >
                  <option value="">اختر المسمى الوظيفي...</option>
                  <option value="worker">عامل غسيل ميداني</option>
                  <option value="supervisor">مشرف مناطق</option>
                  <option value="admin">مدير إداري</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الراتب الأساسي الشهري (ج.م) [اختياري]
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="مثال: 5000"
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم (تطبيق العامل)
                </label>
                <input
                  type="text"
                  required
                  placeholder="worker_ahmed"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password_hash}
                  onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm rounded-xl shadow-md hover:from-teal-700 hover:to-emerald-700 transition-all"
              >
                حفظ وتسجيل الموظف
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Daily Attendance Tracking */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">سجل تتبع الحضور والغياب اليومي</h3>
                <p className="text-xs text-slate-400">تسجيل ومتابعة حضور عمال الغسيل والمشرفين يومياً</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">التاريخ:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">الوظيفة</th>
                  <th className="p-3.5">الحالة اليوم</th>
                  <th className="p-3.5 text-center">إجراءات تسجيل الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {employees.map((emp) => {
                  const currentAtt = attendance.find(
                    (a) => a.employee_id === emp.id && a.date === selectedDate
                  );

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{emp.full_name}</td>
                      <td className="p-3.5 text-xs text-slate-500 font-medium">{emp.role}</td>
                      <td className="p-3.5">{getStatusBadge(currentAtt?.status)}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAttendanceChange(emp.id, 'present')}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            حاضر
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(emp.id, 'late')}
                            className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200"
                          >
                            متأخر
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(emp.id, 'absent')}
                            className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                          >
                            غائب
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(emp.id, 'leave')}
                            className="px-2.5 py-1 text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg border border-sky-200"
                          >
                            إجازة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View & Edit Documents for Selected Employee */}
      {viewingEmployeeDocs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>مستندات ووثائق الموظف: {viewingEmployeeDocs.full_name}</span>
                    <span className="text-xs bg-teal-50 text-teal-700 font-mono px-2 py-0.5 rounded border border-teal-200">
                      {viewingEmployeeDocs.national_id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    استعراض، تكبير، أو تحديث الوثائق الثلاث (الصورة الشخصية، البطاقة، الفيش الجنائي) مع ضغط تلقائي فائق
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployeeDocs(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice / Feedback Bar */}
            {docUploadNotice && (
              <div className="bg-teal-50 text-teal-800 text-xs px-5 py-2.5 font-bold border-b border-teal-100 flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{docUploadNotice}</span>
              </div>
            )}

            {/* Modal Content - 3 Document Cards */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Document 1: Personal Image */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-teal-600" />
                      <span>الصورة الشخصية للموظف</span>
                    </span>
                    {viewingEmployeeDocs.personal_image_url ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        مرفقة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="relative group bg-white rounded-xl border border-slate-200 overflow-hidden h-48 flex items-center justify-center shadow-xs">
                    {viewingEmployeeDocs.personal_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.personal_image_url}
                          alt="الصورة الشخصية"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: `الصورة الشخصية - ${viewingEmployeeDocs?.full_name}`,
                                url: viewingEmployeeDocs?.personal_image_url || ''
                              })
                            }
                            className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow font-bold text-xs flex items-center gap-1 transition-transform hover:scale-105"
                          >
                            <ZoomIn className="w-4 h-4" />
                            <span>تكبير</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <User className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-1" />
                        <span className="text-xs">لم يتم رفع صورة شخصية</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs">
                    {uploadingDocField === 'personal' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                    )}
                    <span>
                      {viewingEmployeeDocs.personal_image_url ? 'استبدال وتحديث الصورة' : 'رفع صورة الآن'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDocFileUpload(e, 'personal', viewingEmployeeDocs.id)}
                      disabled={uploadingDocField !== null}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Document 2: National ID Card */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-teal-600" />
                      <span>بطاقة الرقم القومي</span>
                    </span>
                    {viewingEmployeeDocs.national_id_image_url ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        مرفقة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="relative group bg-white rounded-xl border border-slate-200 overflow-hidden h-48 flex items-center justify-center shadow-xs">
                    {viewingEmployeeDocs.national_id_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.national_id_image_url}
                          alt="بطاقة الرقم القومي"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: `بطاقة الرقم القومي - ${viewingEmployeeDocs?.full_name}`,
                                url: viewingEmployeeDocs?.national_id_image_url || ''
                              })
                            }
                            className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow font-bold text-xs flex items-center gap-1 transition-transform hover:scale-105"
                          >
                            <ZoomIn className="w-4 h-4" />
                            <span>تكبير</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <IdCard className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-1" />
                        <span className="text-xs">لم يتم رفع صورة البطاقة</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs">
                    {uploadingDocField === 'national_id' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                    )}
                    <span>
                      {viewingEmployeeDocs.national_id_image_url ? 'استبدال وتحديث البطاقة' : 'رفع البطاقة الآن'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDocFileUpload(e, 'national_id', viewingEmployeeDocs.id)}
                      disabled={uploadingDocField !== null}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Document 3: Criminal Record */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-teal-600" />
                      <span>الفيش الجنائي (الحالة الجنائية)</span>
                    </span>
                    {viewingEmployeeDocs.criminal_record_image_url ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        مرفقة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="relative group bg-white rounded-xl border border-slate-200 overflow-hidden h-48 flex items-center justify-center shadow-xs">
                    {viewingEmployeeDocs.criminal_record_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.criminal_record_image_url}
                          alt="الفيش الجنائي"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: `الفيش الجنائي - ${viewingEmployeeDocs?.full_name}`,
                                url: viewingEmployeeDocs?.criminal_record_image_url || ''
                              })
                            }
                            className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow font-bold text-xs flex items-center gap-1 transition-transform hover:scale-105"
                          >
                            <ZoomIn className="w-4 h-4" />
                            <span>تكبير</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-1" />
                        <span className="text-xs">لم يتم رفع الفيش الجنائي</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs">
                    {uploadingDocField === 'criminal_record' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                    )}
                    <span>
                      {viewingEmployeeDocs.criminal_record_image_url ? 'استبدال وتحديث الفيش' : 'رفع الفيش الآن'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDocFileUpload(e, 'criminal_record', viewingEmployeeDocs.id)}
                      disabled={uploadingDocField !== null}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingEmployeeDocs(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Zooming */}
      {lightboxImage && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between text-xs font-bold border-b border-slate-700">
              <span>{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[82vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile and Schedule Modal */}
      {viewingEmployeeProfile && (
        <EmployeeProfileModal
          employee={viewingEmployeeProfile}
          isOpen={!!viewingEmployeeProfile}
          onClose={() => setViewingEmployeeProfile(null)}
          visits={internalVisits}
          customers={internalCustomers}
          subscriptions={internalSubscriptions}
          coverageAreas={internalCoverageAreas}
          vehicles={internalVehicles}
          settings={internalSettings || propsSettings}
          onUpdateEmployee={onUpdateEmployee}
        />
      )}
    </div>
  );
};
