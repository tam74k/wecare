import React, { useState } from 'react';
import { Employee, Attendance, AttendanceStatus } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import {
  ShieldCheck,
  UserPlus,
  CalendarCheck,
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
  AlertCircle
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  attendance: Attendance[];
  onCreateEmployee: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<Employee>;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<Employee>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onMarkAttendance: (att: Omit<Attendance, 'id' | 'created_at'>) => Promise<void>;
  onNavigateToPermissions?: () => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  attendance,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onMarkAttendance,
  onNavigateToPermissions
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'attendance'>('list');

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
          <h2 className="text-2xl font-black text-slate-900">إدارة الموظفين والوثائق</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل العمال والمشرفين، حفظ المستندات الرسمية (البطاقة، الفيش الجنائي، الصورة الشخصية)، ومتابعة الحضور
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل الموظفين
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
            <button
              onClick={() => setActiveTab('create')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف</span>
            </button>
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
                              className="w-10 h-10 rounded-full object-cover border border-teal-200 shrink-0 shadow-xs cursor-pointer hover:opacity-90"
                              onClick={() => setViewingEmployeeDocs(emp)}
                              title="انقر لعرض المستندات والوثائق"
                              onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=U')}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                              {emp.full_name.slice(0, 1) || <User className="w-4 h-4" />}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{emp.full_name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
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

                        {/* Documents Status Column */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingEmployeeDocs(emp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                            title="عرض وتعديل الوثائق والمستندات الثلاثة"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>المستندات ({docCount}/3)</span>
                            <div className="flex items-center gap-1 mr-1">
                              <span
                                className={`w-2 h-2 rounded-full ${hasPersonal ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                title={hasPersonal ? 'صورة شخصية مرفوعة' : 'صورة شخصية غير متوفرة'}
                              />
                              <span
                                className={`w-2 h-2 rounded-full ${hasIdCard ? 'bg-teal-500' : 'bg-slate-300'}`}
                                title={hasIdCard ? 'صورة البطاقة مرفوعة' : 'صورة البطاقة غير متوفرة'}
                              />
                              <span
                                className={`w-2 h-2 rounded-full ${hasCriminal ? 'bg-purple-500' : 'bg-slate-300'}`}
                                title={hasCriminal ? 'الفيش الجنائي مرفوع' : 'الفيش الجنائي غير متوفر'}
                              />
                            </div>
                          </button>
                        </td>

                        <td className="p-4 font-mono text-xs">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">
                            {emp.username}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingEmployeeDocs(emp)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                              title="عرض ملف المستندات والصور"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              <span>الوثائق</span>
                            </button>
                            {onNavigateToPermissions && (
                              <button
                                onClick={onNavigateToPermissions}
                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                                title="إدارة الصلاحيات في صفحة مستخدمو النظام والصلاحيات"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                                <span>الصلاحيات</span>
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteEmployee(emp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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

      {/* Tab 2: Create Employee Form */}
      {activeTab === 'create' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-4xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">استمارة تسجيل موظف وعامل جديد</h3>
              <p className="text-xs text-slate-400">
                تسجيل البيانات الشخصية والوثائق الثبوتية (شخصية، بطاقة، فيش جنائي) وتعيين حساب الدخول
              </p>
            </div>
          </div>

          {/* Compression Info Banner */}
          <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl flex items-center gap-3 text-xs text-teal-900">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-bold">نظام الضغط الذكي للصور: </span>
              يتم تقليص حجم الصور وضغطها تلقائياً لأقصى درجة بتنسيق WebP عالي الوضوح وحجم خفيف (~25KB) لمنع تضخم قاعدة البيانات وسرعة تحميل النظام.
            </div>
          </div>

          <form onSubmit={handleSubmitEmployee} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الكامل للموظف</label>
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد إبراهيم"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الرقم القومي (14 رقماً)
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  minLength={14}
                  placeholder="29801010101234"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف / الموبايل</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ التعيين</label>
                <input
                  type="date"
                  required
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان بالتفصيل</label>
              <input
                type="text"
                required
                placeholder="الجيزة - الشيخ زايد - الحي الأول"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            {/* Document Upload Sections (3 Images: Personal Photo, ID Card, Criminal Record) */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>وثائق ومستندات الموظف الرسمية (مضغوطة أوتوماتيكياً)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الرجاء رفع الوثائق المطلوبة؛ يتم ضغط وتقليص الصور آلياً لتوفير مساحة التخزين
                  </p>
                </div>
                {docUploadNotice && (
                  <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{docUploadNotice}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. الصورة الشخصية */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>1. الصورة الشخصية</span>
                    </div>
                    {formData.personal_image_url && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {formData.personal_image_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formData.personal_image_url}
                          alt="الصورة الشخصية"
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-300 bg-white shadow-xs"
                          onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Photo')}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, personal_image_url: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-xs shadow-xs"
                          title="حذف الصورة"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-7 h-7 text-slate-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                        {uploadingDocField === 'personal' ? (
                          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{uploadingDocField === 'personal' ? 'جاري الضغط...' : 'رفع صورة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'personal')}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">صورة واضحة للوجه</p>
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

                {/* 2. صورة البطاقة الشخصية */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <IdCard className="w-4 h-4 text-teal-600" />
                      <span>2. بطاقة الرقم القومي</span>
                    </div>
                    {formData.national_id_image_url && (
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {formData.national_id_image_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formData.national_id_image_url}
                          alt="بطاقة الرقم القومي"
                          className="w-16 h-16 rounded-xl object-cover border border-teal-300 bg-white shadow-xs"
                          onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=ID')}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, national_id_image_url: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-xs shadow-xs"
                          title="حذف الصورة"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                        <IdCard className="w-7 h-7 text-slate-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                        {uploadingDocField === 'national_id' ? (
                          <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        <span>{uploadingDocField === 'national_id' ? 'جاري الضغط...' : 'رفع البطاقة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'national_id')}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">وجه أو ظهر البطاقة</p>
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

                {/* 3. صورة الفيش الجنائي */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>3. الفيش الجنائي</span>
                    </div>
                    {formData.criminal_record_image_url && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {formData.criminal_record_image_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formData.criminal_record_image_url}
                          alt="صحيفة الحالة الجنائية"
                          className="w-16 h-16 rounded-xl object-cover border border-purple-300 bg-white shadow-xs"
                          onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Record')}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, criminal_record_image_url: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-xs shadow-xs"
                          title="حذف الصورة"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="w-7 h-7 text-slate-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                        {uploadingDocField === 'criminal_record' ? (
                          <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                        )}
                        <span>{uploadingDocField === 'criminal_record' ? 'جاري الضغط...' : 'رفع الفيش'}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
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

      {/* Tab 3: Daily Attendance Tracking */}
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
              <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">المسمى الوظيفي</th>
                  <th className="p-3.5">الحالة الحالية</th>
                  <th className="p-3.5 text-center">تسجيل الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const currentAtt = attendance.find((a) => a.employee_id === emp.id && a.date === selectedDate);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60">
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
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notice if uploading in modal */}
            {docUploadNotice && (
              <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{docUploadNotice}</span>
              </div>
            )}

            {/* Modal Body: 3 Document Cards */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. الصورة الشخصية للموظف */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>الصورة الشخصية</span>
                    </span>
                    {viewingEmployeeDocs.personal_image_url ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[160px] bg-white rounded-xl border border-slate-200 p-2 relative overflow-hidden group">
                    {viewingEmployeeDocs.personal_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.personal_image_url}
                          alt="الصورة الشخصية"
                          className="max-h-36 max-w-full object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              title: `الصورة الشخصية - ${viewingEmployeeDocs.full_name}`,
                              url: viewingEmployeeDocs.personal_image_url!
                            })
                          }
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>تكبير وعرض كامل</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <User className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-1" />
                        <p className="text-xs font-medium">لم يتم رفع صورة شخصية بعد</p>
                      </div>
                    )}
                  </div>

                  {onUpdateEmployee && (
                    <div>
                      <label className="inline-flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                        {uploadingDocField === 'personal' ? (
                          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>{uploadingDocField === 'personal' ? 'جاري الضغط والرفع...' : 'تحديث / رفع صورة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'personal', viewingEmployeeDocs.id)}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. بطاقة الرقم القومي */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-teal-600" />
                      <span>بطاقة الرقم القومي</span>
                    </span>
                    {viewingEmployeeDocs.national_id_image_url ? (
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[160px] bg-white rounded-xl border border-slate-200 p-2 relative overflow-hidden group">
                    {viewingEmployeeDocs.national_id_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.national_id_image_url}
                          alt="بطاقة الرقم القومي"
                          className="max-h-36 max-w-full object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              title: `بطاقة الرقم القومي - ${viewingEmployeeDocs.full_name}`,
                              url: viewingEmployeeDocs.national_id_image_url!
                            })
                          }
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>تكبير وعرض كامل</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <IdCard className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-1" />
                        <p className="text-xs font-medium">لم يتم رفع صورة البطاقة بعد</p>
                      </div>
                    )}
                  </div>

                  {onUpdateEmployee && (
                    <div>
                      <label className="inline-flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                        {uploadingDocField === 'national_id' ? (
                          <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4 text-teal-600" />
                        )}
                        <span>{uploadingDocField === 'national_id' ? 'جاري الضغط والرفع...' : 'تحديث / رفع البطاقة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'national_id', viewingEmployeeDocs.id)}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. الفيش الجنائي */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>الفيش الجنائي</span>
                    </span>
                    {viewingEmployeeDocs.criminal_record_image_url ? (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                        مرفوعة
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
                        غير متوفرة
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[160px] bg-white rounded-xl border border-slate-200 p-2 relative overflow-hidden group">
                    {viewingEmployeeDocs.criminal_record_image_url ? (
                      <>
                        <img
                          src={viewingEmployeeDocs.criminal_record_image_url}
                          alt="صحيفة الحالة الجنائية"
                          className="max-h-36 max-w-full object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              title: `الفيش الجنائي - ${viewingEmployeeDocs.full_name}`,
                              url: viewingEmployeeDocs.criminal_record_image_url!
                            })
                          }
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>تكبير وعرض كامل</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <FileText className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-1" />
                        <p className="text-xs font-medium">لم يتم رفع الفيش الجنائي بعد</p>
                      </div>
                    )}
                  </div>

                  {onUpdateEmployee && (
                    <div>
                      <label className="inline-flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                        {uploadingDocField === 'criminal_record' ? (
                          <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4 text-purple-600" />
                        )}
                        <span>{uploadingDocField === 'criminal_record' ? 'جاري الضغط والرفع...' : 'تحديث / رفع الفيش'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDocFileUpload(e, 'criminal_record', viewingEmployeeDocs.id)}
                          disabled={uploadingDocField !== null}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                يتم ضغط جميع الصور المرفوعة لأقصى قدر لتوفير السعة التخزينية.
              </span>
              <button
                type="button"
                onClick={() => setViewingEmployeeDocs(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal for full view */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm">{lightboxImage.title}</h4>
              <button
                onClick={() => setLightboxImage(null)}
                className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-900 overflow-auto max-h-[75vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>صورة معتمدة ومضغوطة بصيغة WebP</span>
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 hover:underline flex items-center gap-1 font-bold"
              >
                <span>فتح الصورة في نافذة جديدة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
