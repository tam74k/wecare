import React, { useState } from 'react';
import { Employee, EmployeePermission, Attendance, AttendanceStatus } from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import {
  ShieldCheck,
  UserPlus,
  CalendarCheck,
  KeyRound,
  IdCard,
  Phone,
  MapPin,
  Calendar,
  Check,
  Lock,
  User,
  Trash2,
  Edit2,
  Clock,
  UploadCloud,
  ImageIcon,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  attendance: Attendance[];
  onCreateEmployee: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<Employee>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onMarkAttendance: (att: Omit<Attendance, 'id' | 'created_at'>) => Promise<void>;
  onNavigateToPermissions?: () => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  attendance,
  onCreateEmployee,
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
    national_id_image_url: '',
    role: '' as 'admin' | 'supervisor' | 'worker',
    username: '',
    password_hash: ''
  });

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Employee Image Upload State
  const [isUploadingEmployeeImage, setIsUploadingEmployeeImage] = useState(false);
  const [employeeUploadNotice, setEmployeeUploadNotice] = useState<string | null>(null);

  const handleEmployeeImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingEmployeeImage(true);
      setEmployeeUploadNotice('جاري ضغط وتقليص حجم صورة الموظف/البطاقة وحفظها...');
      const uploadedUrl = await uploadStorageAsset(file, 'employees', formData.national_id_image_url);
      setFormData((prev) => ({ ...prev, national_id_image_url: uploadedUrl }));
      setEmployeeUploadNotice('تم تقليص حجم الصورة وحفظها بنجاح في قاعدة البيانات ومخزن الأصول (carwash-assets)');
      setTimeout(() => setEmployeeUploadNotice(null), 4000);
    } catch (err: any) {
      alert('فشل رفع صورة الموظف: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setEmployeeUploadNotice(null);
    } finally {
      setIsUploadingEmployeeImage(false);
    }
  };

  // Handle Create Employee
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.national_id || formData.national_id.length !== 14) {
      alert('الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً وفقاً لبطاقة الرقم القومي المصرية!');
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
    alert('تم تسجيل الموظف وحسابه بنجاح!');
    setActiveTab('list');
    setFormData({
      national_id: '',
      full_name: '',
      phone: '',
      address: '',
      hire_date: '',
      national_id_image_url: '',
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
          <h2 className="text-2xl font-black text-slate-900">إدارة الموظفين</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل العمال والمشرفين، حسابات تطبيق العامل، ومتابعة سجلات الحضور والغياب اليومية
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
                    <th className="p-4">تاريخ التعيين</th>
                    <th className="p-4">الدور الوظيفي</th>
                    <th className="p-4">حساب الدخول</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {emp.national_id_image_url ? (
                          <img
                            src={emp.national_id_image_url}
                            alt={emp.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-teal-200 shrink-0"
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
                      <td className="p-4 text-xs text-slate-500">{emp.hire_date}</td>
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
                      <td className="p-4 font-mono text-xs">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">
                          {emp.username}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {onNavigateToPermissions && (
                            <button
                              onClick={onNavigateToPermissions}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Create Employee Form */}
      {activeTab === 'create' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">استمارة تسجيل موظف وعامل جديد</h3>
              <p className="text-xs text-slate-400">
                تسجيل البيانات الشخصية والبطاقة وتعيين حساب الدخول لتطبيق العامل
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitEmployee} className="space-y-4">
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

            {/* صورة الموظف / البطاقة الشخصية مع خاصية الضغط والرفع المباشر */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <span>صورة الموظف / البطاقة الشخصية (الرقم القومي)</span>
                </span>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  مخزن سحابي مضغوط (carwash-assets)
                </span>
              </label>

              <div className="flex items-center gap-4">
                {formData.national_id_image_url ? (
                  <img
                    src={formData.national_id_image_url}
                    alt="معاينة صورة الموظف"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-xs"
                    onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=ID')}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                    {isUploadingEmployeeImage ? (
                      <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                    )}
                    <span>{isUploadingEmployeeImage ? 'جاري ضغط ورفع الصورة...' : 'رفع الصورة من الجهاز'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEmployeeImageFileChange}
                      disabled={isUploadingEmployeeImage}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    يتم تقليص حجم الصورة وضغطها آلياً لتوفير مساحة التخزين وحفظها بقاعدة البيانات ومخزن الأصول.
                  </p>
                </div>
              </div>

              {employeeUploadNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{employeeUploadNotice}</span>
                </div>
              )}

              <input
                type="url"
                placeholder="أو ضع رابط مباشر لصورة الموظف / البطاقة..."
                value={formData.national_id_image_url}
                onChange={(e) => setFormData({ ...formData, national_id_image_url: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 font-mono"
              />
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
    </div>
  );
};
