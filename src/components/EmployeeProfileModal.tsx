import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Employee,
  Visit,
  Customer,
  Subscription,
  CoverageArea,
  Vehicle,
  Settings,
  EmployeeRole
} from '../types/database';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Printer,
  X,
  Eye,
  FileText,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Filter,
  Car,
  CalendarDays,
  Check,
  AlertCircle,
  Clock3,
  Edit3,
  Save,
  Upload,
  Lock,
  DollarSign,
  Loader2,
  Trash2,
  Camera,
  RefreshCw
} from 'lucide-react';
import { uploadStorageAsset } from '../utils/imageStorage';
import { formatWhatsAppNumber } from '../services/whatsappService';
import * as api from '../services/api';

interface EmployeeProfileModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  visits?: Visit[];
  customers?: Customer[];
  subscriptions?: Subscription[];
  coverageAreas?: CoverageArea[];
  vehicles?: Vehicle[];
  settings?: Settings;
  onUpdateEmployee?: (id: string, updates: Partial<Employee>) => Promise<Employee>;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  isOpen,
  onClose,
  visits = [],
  customers = [],
  subscriptions = [],
  coverageAreas = [],
  vehicles = [],
  settings,
  onUpdateEmployee
}) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(employee);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule'>('profile');
  const [scheduleFilterMode, setScheduleFilterMode] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: employee.full_name || '',
    national_id: employee.national_id || '',
    phone: employee.phone || '',
    role: (employee.role || 'worker') as EmployeeRole,
    address: employee.address || '',
    hire_date: employee.hire_date || '',
    salary: employee.salary || 0,
    username: employee.username || '',
    password: '',
    is_active: employee.is_active !== false,
    personal_image_url: employee.personal_image_url || '',
    national_id_image_url: employee.national_id_image_url || employee.id_card_image_url || '',
    criminal_record_image_url: employee.criminal_record_image_url || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDocField, setUploadingDocField] = useState<'personal' | 'national_id' | 'criminal_record' | null>(null);
  const [docUploadNotice, setDocUploadNotice] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // File input refs for documents
  const personalImageInputRef = useRef<HTMLInputElement | null>(null);
  const nationalIdImageInputRef = useRef<HTMLInputElement | null>(null);
  const criminalRecordImageInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever employee prop changes
  useEffect(() => {
    setCurrentEmployee(employee);
    setEditFormData({
      full_name: employee.full_name || '',
      national_id: employee.national_id || '',
      phone: employee.phone || '',
      role: (employee.role || 'worker') as EmployeeRole,
      address: employee.address || '',
      hire_date: employee.hire_date || '',
      salary: employee.salary || 0,
      username: employee.username || '',
      password: '',
      is_active: employee.is_active !== false,
      personal_image_url: employee.personal_image_url || '',
      national_id_image_url: employee.national_id_image_url || employee.id_card_image_url || '',
      criminal_record_image_url: employee.criminal_record_image_url || ''
    });
    setIsEditing(false);
    setStatusFeedback(null);
  }, [employee]);

  // Start Editing Handler
  const handleStartEditing = () => {
    setEditFormData({
      full_name: currentEmployee.full_name || '',
      national_id: currentEmployee.national_id || '',
      phone: currentEmployee.phone || '',
      role: (currentEmployee.role || 'worker') as EmployeeRole,
      address: currentEmployee.address || '',
      hire_date: currentEmployee.hire_date || '',
      salary: currentEmployee.salary || 0,
      username: currentEmployee.username || '',
      password: '',
      is_active: currentEmployee.is_active !== false,
      personal_image_url: currentEmployee.personal_image_url || '',
      national_id_image_url: currentEmployee.national_id_image_url || currentEmployee.id_card_image_url || '',
      criminal_record_image_url: currentEmployee.criminal_record_image_url || ''
    });
    setActiveTab('profile');
    setIsEditing(true);
    setStatusFeedback(null);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setStatusFeedback(null);
  };

  // Upload and compress employee image handler
  const handleUploadDoc = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'personal' | 'national_id' | 'criminal_record'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDocField(field);
      setDocUploadNotice('جاري ضغط الصورة بتقنية WebP الموفرة للمساحة...');

      let oldUrl: string | undefined = undefined;
      if (field === 'personal') oldUrl = editFormData.personal_image_url;
      else if (field === 'national_id') oldUrl = editFormData.national_id_image_url;
      else if (field === 'criminal_record') oldUrl = editFormData.criminal_record_image_url;

      const compressedUrl = await uploadStorageAsset(file, 'employees', oldUrl, {
        maxWidth: 600,
        quality: 0.68,
        format: 'image/webp'
      });

      if (field === 'personal') {
        setEditFormData(prev => ({ ...prev, personal_image_url: compressedUrl }));
      } else if (field === 'national_id') {
        setEditFormData(prev => ({ ...prev, national_id_image_url: compressedUrl }));
      } else if (field === 'criminal_record') {
        setEditFormData(prev => ({ ...prev, criminal_record_image_url: compressedUrl }));
      }

      setDocUploadNotice('تم رفع وضغط الصورة بنجاح!');
      setTimeout(() => setDocUploadNotice(null), 3000);
    } catch (err: any) {
      alert('فشل رفع وضغط الصورة: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setDocUploadNotice(null);
    } finally {
      setUploadingDocField(null);
      e.target.value = '';
    }
  };

  // Save changes handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.full_name.trim()) {
      setStatusFeedback({ type: 'error', message: 'يرجى إدخال اسم الموظف الكامل' });
      return;
    }
    if (!editFormData.national_id || editFormData.national_id.trim().length !== 14) {
      setStatusFeedback({
        type: 'error',
        message: 'الرقم القومي يجب أن يتكون من 14 رقماً وفقاً لبطاقة الرقم القومي المصرية!'
      });
      return;
    }
    if (!editFormData.phone.trim()) {
      setStatusFeedback({ type: 'error', message: 'يرجى إدخال رقم هاتف الموظف' });
      return;
    }
    if (!editFormData.username.trim()) {
      setStatusFeedback({ type: 'error', message: 'يرجى إدخال اسم المستخدم للنظام' });
      return;
    }

    setIsSaving(true);
    setStatusFeedback(null);

    try {
      const updates: Partial<Employee> = {
        full_name: editFormData.full_name.trim(),
        national_id: editFormData.national_id.trim(),
        phone: editFormData.phone.trim(),
        role: editFormData.role,
        address: editFormData.address.trim(),
        hire_date: editFormData.hire_date || currentEmployee.hire_date || new Date().toISOString().split('T')[0],
        salary: Number(editFormData.salary) || 0,
        username: editFormData.username.trim(),
        is_active: editFormData.is_active,
        personal_image_url: editFormData.personal_image_url || undefined,
        national_id_image_url: editFormData.national_id_image_url || undefined,
        id_card_image_url: editFormData.national_id_image_url || undefined,
        criminal_record_image_url: editFormData.criminal_record_image_url || undefined
      };

      if (editFormData.password && editFormData.password.trim()) {
        updates.password_hash = btoa(editFormData.password.trim());
      }

      let updatedEmp: Employee;
      if (onUpdateEmployee) {
        updatedEmp = await onUpdateEmployee(currentEmployee.id, updates);
      } else {
        updatedEmp = await api.updateEmployee(currentEmployee.id, updates);
      }

      if (editFormData.password && editFormData.password.trim()) {
        try {
          await api.resetEmployeePassword(currentEmployee.id, editFormData.password.trim());
        } catch (pwErr) {
          console.warn('Password reset direct call error:', pwErr);
        }
      }

      const merged = { ...currentEmployee, ...updates, ...(updatedEmp || {}) };
      setCurrentEmployee(merged);
      setIsEditing(false);
      setStatusFeedback({ type: 'success', message: 'تم حفظ وتحديث بيانات الموظف بنجاح!' });
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update employee:', err);
      setStatusFeedback({ type: 'error', message: 'فشل حفظ التعديلات: ' + (err.message || 'حدث خطأ أثناء الحفظ') });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for Arab work week (Saturday to Friday)
  const getWeekDates = (offsetWeeks: number = 0) => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const diffToSaturday = (day + 1) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - diffToSaturday + offsetWeeks * 7);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);
    return {
      from: saturday.toISOString().split('T')[0],
      to: friday.toISOString().split('T')[0]
    };
  };

  const initialWeek = getWeekDates(0);
  const [dateFrom, setDateFrom] = useState<string>(initialWeek.from);
  const [dateTo, setDateTo] = useState<string>(initialWeek.to);
  const [selectedWeekPreset, setSelectedWeekPreset] = useState<'current' | 'next' | 'all' | 'custom'>('current');

  // Print Preview Modal State
  const [isPrintingSheet, setIsPrintingSheet] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ title: string; url: string } | null>(null);

  if (!isOpen) return null;

  // 1. Filter all visits assigned to this employee
  const workerVisits = useMemo(() => {
    return visits.filter((v) => {
      if (v.assigned_worker_id === currentEmployee.id || (v as any).worker_id === currentEmployee.id) return true;
      if (v.assigned_worker_id === currentEmployee.full_name || (v as any).worker_id === currentEmployee.full_name) return true;
      const sub = subscriptions.find((s) => s.id === v.subscription_id);
      if (!v.assigned_worker_id && !(v as any).worker_id && sub?.assigned_worker_id === currentEmployee.id) return true;
      return false;
    });
  }, [visits, currentEmployee, subscriptions]);

  // Statistics
  const todayStr = new Date().toISOString().split('T')[0];

  const totalAssignedCount = workerVisits.length;
  const upcomingVisits = useMemo(() => {
    return workerVisits.filter(
      (v) => v.status === 'scheduled' || (v.status !== 'completed' && v.status !== 'cancelled' && v.scheduled_date >= todayStr)
    );
  }, [workerVisits, todayStr]);

  const completedVisits = useMemo(() => {
    return workerVisits.filter((v) => v.status === 'completed');
  }, [workerVisits]);

  const ratedVisits = useMemo(() => {
    return workerVisits.filter((v) => typeof v.rating === 'number' && v.rating > 0);
  }, [workerVisits]);

  const averageRating = useMemo(() => {
    if (ratedVisits.length === 0) return 0;
    const sum = ratedVisits.reduce((acc, v) => acc + (v.rating || 0), 0);
    return Number((sum / ratedVisits.length).toFixed(1));
  }, [ratedVisits]);

  // Filtered visits for Schedule Tab
  const filteredScheduleVisits = useMemo(() => {
    let list = [...workerVisits];

    // Filter by status mode
    if (scheduleFilterMode === 'upcoming') {
      list = list.filter(
        (v) => v.status === 'scheduled' || (v.status !== 'completed' && v.status !== 'cancelled')
      );
    } else if (scheduleFilterMode === 'past') {
      list = list.filter((v) => v.status === 'completed' || v.status === 'cancelled');
    }

    // Filter by date range if not 'all'
    if (selectedWeekPreset !== 'all') {
      if (dateFrom) {
        list = list.filter((v) => v.scheduled_date >= dateFrom);
      }
      if (dateTo) {
        list = list.filter((v) => v.scheduled_date <= dateTo);
      }
    }

    // Sort chronologically
    return list.sort((a, b) => {
      const cmp = a.scheduled_date.localeCompare(b.scheduled_date);
      if (cmp !== 0) return cmp;
      return (a.scheduled_time_from || '').localeCompare(b.scheduled_time_from || '');
    });
  }, [workerVisits, scheduleFilterMode, selectedWeekPreset, dateFrom, dateTo]);

  // Helpers to get Customer, Area, Vehicle, and Full Address
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId);

  const getCustomerAddress = (customerId: string): string => {
    const cust = getCustomer(customerId);
    if (!cust) return 'العنوان غير مسجل';
    const area = coverageAreas.find((a) => a.id === cust.area_id);
    const parts: string[] = [];
    if (area?.name) parts.push(`المنطقة: ${area.name}`);
    if (cust.building_number && cust.building_number.trim()) parts.push(`عمارة: ${cust.building_number.trim()}`);
    if (cust.block_number && cust.block_number.trim()) parts.push(`مجاورة/بلوك: ${cust.block_number.trim()}`);
    if (cust.detailed_address && cust.detailed_address.trim()) parts.push(cust.detailed_address.trim());
    return parts.length > 0 ? parts.join(' - ') : (area?.name || 'العنوان غير محدد');
  };

  const getVehicleDetails = (subscriptionId: string): string => {
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub || !sub.vehicle_id) return '';
    const veh = vehicles.find((v) => v.id === sub.vehicle_id);
    if (!veh) return '';
    const parts: string[] = [];
    if (veh.vehicle_type) parts.push(veh.vehicle_type);
    if (veh.color) parts.push(`لون ${veh.color}`);
    if (veh.plate_number) parts.push(`لوحة: ${veh.plate_number}`);
    return parts.join(' - ');
  };

  const handleApplyPreset = (preset: 'current' | 'next' | 'all') => {
    setSelectedWeekPreset(preset);
    if (preset === 'current') {
      const cur = getWeekDates(0);
      setDateFrom(cur.from);
      setDateTo(cur.to);
    } else if (preset === 'next') {
      const nxt = getWeekDates(1);
      setDateFrom(nxt.from);
      setDateTo(nxt.to);
    }
  };

  const roleText =
    currentEmployee.role === 'admin'
      ? 'مدير إداري'
      : currentEmployee.role === 'supervisor'
      ? 'مشرف مناطق'
      : 'عامل غسيل ميداني';

  const avatarUrl = currentEmployee.personal_image_url || currentEmployee.national_id_image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={currentEmployee.full_name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-400/80 shadow-md shrink-0 cursor-pointer hover:opacity-90"
                onClick={() => setLightboxImage({ title: currentEmployee.full_name, url: avatarUrl })}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-teal-800/80 border-2 border-teal-400/60 flex items-center justify-center text-teal-200 font-bold text-xl shadow-md shrink-0">
                {currentEmployee.full_name.slice(0, 1) || <User className="w-6 h-6" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-white">{currentEmployee.full_name}</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {roleText}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentEmployee.is_active !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {currentEmployee.is_active !== false ? 'حساب نشط' : 'حساب معطل'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>هاتف: {currentEmployee.phone}</span>
                <span>•</span>
                <span>الرقم القومي: {currentEmployee.national_id}</span>
                {currentEmployee.salary ? (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300 font-mono font-bold">
                      الراتب: {Number(currentEmployee.salary).toLocaleString()} {settings?.currency_symbol || 'ج.م'}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit / Cancel Toggle Button in Header */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleCancelEditing();
                } else {
                  handleStartEditing();
                }
              }}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all ${
                isEditing
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-teal-700 hover:bg-teal-600 text-white border border-teal-500/40'
              }`}
              title={isEditing ? 'إلغاء التعديل' : 'تعديل بيانات الموظف'}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'إلغاء التعديل' : 'تعديل بيانات الموظف'}</span>
            </button>

            <button
              onClick={() => setIsPrintingSheet(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة جدول الأسبوع للعامل</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 pt-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>بيانات الموظف والمستندات</span>
            {isEditing && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                وضع التعديل
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول الزيارات والمهام</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'schedule' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {upcomingVisits.length} قادمة
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-5">
          {/* ========================================================================= */}
          {/* TAB 1: SCHEDULE & VISITS (جدول الموظف والزيارات) */}
          {/* ========================================================================= */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">إجمالي الزيارات</span>
                    <span className="text-base font-black text-slate-800">{totalAssignedCount} زيارة</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">الزيارات القادمة</span>
                    <span className="text-base font-black text-sky-700">{upcomingVisits.length} زيارة</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">الزيارات المنفذة</span>
                    <span className="text-base font-black text-emerald-700">{completedVisits.length} زيارة</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">متوسط التقييم</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-amber-700">{averageRating > 0 ? averageRating : '—'}</span>
                      {averageRating > 0 && (
                        <div className="flex items-center text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= Math.round(averageRating) ? 'fill-amber-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400">({ratedVisits.length} تقييم)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Status Mode: Upcoming vs Past vs All */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setScheduleFilterMode('upcoming')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scheduleFilterMode === 'upcoming'
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الزيارات القادمة ({upcomingVisits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleFilterMode('past')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scheduleFilterMode === 'past'
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الزيارات السابقة والمنفذة ({completedVisits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleFilterMode('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scheduleFilterMode === 'all'
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      كافة الزيارات ({totalAssignedCount})
                    </button>
                  </div>

                  {/* Week Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('current')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        selectedWeekPreset === 'current'
                          ? 'bg-teal-50 border-teal-300 text-teal-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      الأسبوع الحالي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('next')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        selectedWeekPreset === 'next'
                          ? 'bg-teal-50 border-teal-300 text-teal-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      الأسبوع القادم
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        selectedWeekPreset === 'all'
                          ? 'bg-teal-50 border-teal-300 text-teal-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      جميع التواريخ
                    </button>
                  </div>
                </div>

                {/* Custom Date Range Selectors */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">من تاريخ:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setSelectedWeekPreset('custom');
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">إلى تاريخ:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setSelectedWeekPreset('custom');
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <span className="text-xs text-slate-400 mr-auto font-medium">
                    المعروض حالياً: <strong className="text-slate-800">{filteredScheduleVisits.length}</strong> زيارة
                  </span>
                </div>
              </div>

              {/* Visits Schedule Table / Cards */}
              {filteredScheduleVisits.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                  <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold">لا توجد زيارات مسجلة للموظف ضمن هذه الفترة أو الفلتر المحدد.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    يمكنك تغيير فلتر التواريخ أو استعراض الزيارات السابقة أو كافة الزيارات.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">#</th>
                          <th className="p-3.5">اليوم والتاريخ</th>
                          <th className="p-3.5">العميل والهاتف</th>
                          <th className="p-3.5">عنوان العميل بالكامل</th>
                          <th className="p-3.5">نوع الخدمة / السيارة</th>
                          <th className="p-3.5">الحالة</th>
                          <th className="p-3.5 text-center">التقييم والملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredScheduleVisits.map((vis, idx) => {
                          const cust = getCustomer(vis.customer_id);
                          const address = getCustomerAddress(vis.customer_id);
                          const vehInfo = getVehicleDetails(vis.subscription_id);

                          return (
                            <tr key={vis.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5 font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-900 block">
                                  {vis.day_of_week ? `${vis.day_of_week}، ` : ''}
                                  {vis.scheduled_date}
                                </span>
                                {(vis.scheduled_time_from || vis.scheduled_time_to) && (
                                  <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {vis.scheduled_time_from || ''} {vis.scheduled_time_to ? `إلى ${vis.scheduled_time_to}` : ''}
                                    </span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-900 block">{cust?.full_name || 'عميل غير مسجل'}</span>
                                {cust?.phone && (
                                  <a
                                    href={`tel:${cust.phone}`}
                                    className="text-[11px] font-mono text-slate-500 hover:text-teal-600 flex items-center gap-1 mt-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{cust.phone}</span>
                                  </a>
                                )}
                              </td>
                              <td className="p-3.5 max-w-xs">
                                <div className="text-[11px] text-slate-700 flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">{address}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-800 block">
                                  {vis.service_type || 'غسيل واشتراك دوري'}
                                </span>
                                {vehInfo && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Car className="w-3 h-3 text-slate-400" />
                                    <span>{vehInfo}</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    vis.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      : vis.status === 'scheduled'
                                      ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                      : vis.status === 'postponed'
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {vis.status === 'completed'
                                    ? 'تمت بنجاح'
                                    : vis.status === 'scheduled'
                                    ? 'مجدولة'
                                    : vis.status === 'postponed'
                                    ? 'مؤجلة'
                                    : 'ملغية'}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                {typeof vis.rating === 'number' && vis.rating > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-0.5 text-amber-400">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${
                                            s <= (vis.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-xs font-black text-amber-700 mr-1">{vis.rating}</span>
                                    </div>
                                    {vis.rating_comment && (
                                      <div className="text-[10px] text-slate-600 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60 max-w-[170px] italic">
                                        &quot;{vis.rating_comment}&quot;
                                      </div>
                                    )}
                                  </div>
                                ) : vis.status === 'completed' ? (
                                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                                    بلا تقييم
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">—</span>
                                )}
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
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROFILE & DOCUMENTS (بيانات الموظف والمستندات) */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* TOP ACTION BAR IN PROFILE TAB */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {isEditing ? 'تعديل بيانات وملف الموظف' : 'الملف التعريفي والبيانات الوظيفية'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isEditing
                        ? 'قم بتعديل البيانات المطلوبة ثم انقر على حفظ التعديلات'
                        : 'يمكنك مراجعة كافة بيانات الموظف، الراتب، حسابه، ووثائقه الثبوتية'}
                    </p>
                  </div>
                </div>

                <div>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={handleStartEditing}
                      className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل بيانات الموظف</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEditing}
                        disabled={isSaving}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        إلغاء التعديل
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* EDIT FORM (WHEN isEditing IS TRUE) */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Basic Information Form */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Edit3 className="w-4 h-4 text-teal-600" />
                      <span>البيانات الأساسية والوظيفية</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الكامل *</label>
                        <input
                          type="text"
                          required
                          value={editFormData.full_name}
                          onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                        />
                      </div>

                      {/* National ID */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم القومي (14 رقم) *</label>
                        <input
                          type="text"
                          required
                          maxLength={14}
                          value={editFormData.national_id}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, national_id: e.target.value.replace(/\D/g, '') })
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold text-slate-800"
                          placeholder="29901011234567"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف *</label>
                        <input
                          type="text"
                          required
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                          placeholder="01012345678"
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">الدور والمسمى الوظيفي *</label>
                        <select
                          value={editFormData.role}
                          onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as EmployeeRole })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800 bg-white"
                        >
                          <option value="worker">عامل غسيل ميداني</option>
                          <option value="supervisor">مشرف مناطق</option>
                          <option value="admin">مدير إداري</option>
                        </select>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان ومحل الإقامة</label>
                        <input
                          type="text"
                          value={editFormData.address}
                          onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-800"
                          placeholder="المدينة - الحي - الشارع"
                        />
                      </div>

                      {/* Hire Date */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ التعيين والالتحاق</label>
                        <input
                          type="date"
                          value={editFormData.hire_date}
                          onChange={(e) => setEditFormData({ ...editFormData, hire_date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-800"
                        />
                      </div>

                      {/* Salary */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">الراتب الأساسي الشهري</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={editFormData.salary || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, salary: Number(e.target.value) || 0 })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold text-slate-800 pl-12"
                            placeholder="0"
                          />
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold pointer-events-none">
                            {settings?.currency_symbol || 'ج.م'}
                          </span>
                        </div>
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم للنظام *</label>
                        <input
                          type="text"
                          required
                          value={editFormData.username}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              username: e.target.value.toLowerCase().replace(/\s/g, '')
                            })
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                        />
                      </div>

                      {/* New Password (Optional) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          كلمة المرور الجديدة (اختياري)
                        </label>
                        <input
                          type="text"
                          value={editFormData.password}
                          onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                          placeholder="اتركها فارغة للإبقاء على الحالية"
                        />
                      </div>

                      {/* Account Status */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة الحساب</label>
                        <select
                          value={editFormData.is_active ? 'active' : 'inactive'}
                          onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800 bg-white"
                        >
                          <option value="active">نشط ومصرح له بالعمل</option>
                          <option value="inactive">معطل وموقوف</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Documents & Images Upload Section */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span>تحديث المستندات والوثائق الرسمية (ضغط WebP فائق السرعة)</span>
                      </h4>
                      {docUploadNotice && (
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 animate-pulse">
                          {docUploadNotice}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Personal Photo */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">1. الصورة الشخصية</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                editFormData.personal_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {editFormData.personal_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>

                          {editFormData.personal_image_url ? (
                            <div className="relative group">
                              <img
                                src={editFormData.personal_image_url}
                                alt="الصورة الشخصية"
                                className="w-full h-36 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, personal_image_url: '' })}
                                className="absolute top-2 left-2 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                title="إزالة الصورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-1">
                              <Camera className="w-6 h-6 text-slate-300" />
                              <span>لم يتم رفع صورة شخصية</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <input
                            ref={personalImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadDoc(e, 'personal')}
                          />
                          <button
                            type="button"
                            disabled={uploadingDocField === 'personal'}
                            onClick={() => personalImageInputRef.current?.click()}
                            className="w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            {uploadingDocField === 'personal' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {uploadingDocField === 'personal'
                                ? 'جاري الضغط والرفع...'
                                : editFormData.personal_image_url
                                ? 'استبدال الصورة'
                                : 'رفع صورة شخصية'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 2. National ID Card */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">2. صورة بطاقة الرقم القومي</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                editFormData.national_id_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {editFormData.national_id_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>

                          {editFormData.national_id_image_url ? (
                            <div className="relative group">
                              <img
                                src={editFormData.national_id_image_url}
                                alt="بطاقة الرقم القومي"
                                className="w-full h-36 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, national_id_image_url: '' })}
                                className="absolute top-2 left-2 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                title="إزالة الصورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-1">
                              <FileText className="w-6 h-6 text-slate-300" />
                              <span>لم يتم رفع صورة البطاقة</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <input
                            ref={nationalIdImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadDoc(e, 'national_id')}
                          />
                          <button
                            type="button"
                            disabled={uploadingDocField === 'national_id'}
                            onClick={() => nationalIdImageInputRef.current?.click()}
                            className="w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            {uploadingDocField === 'national_id' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {uploadingDocField === 'national_id'
                                ? 'جاري الضغط والرفع...'
                                : editFormData.national_id_image_url
                                ? 'استبدال البطاقة'
                                : 'رفع صورة البطاقة'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 3. Criminal Record */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">3. صحيفة الحالة الجنائية (الفيش)</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                editFormData.criminal_record_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {editFormData.criminal_record_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>

                          {editFormData.criminal_record_image_url ? (
                            <div className="relative group">
                              <img
                                src={editFormData.criminal_record_image_url}
                                alt="الفيش الجنائي"
                                className="w-full h-36 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => setEditFormData({ ...editFormData, criminal_record_image_url: '' })}
                                className="absolute top-2 left-2 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                title="إزالة الصورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-1">
                              <ShieldCheck className="w-6 h-6 text-slate-300" />
                              <span>لم يتم رفع الفيش الجنائي</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <input
                            ref={criminalRecordImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadDoc(e, 'criminal_record')}
                          />
                          <button
                            type="button"
                            disabled={uploadingDocField === 'criminal_record'}
                            onClick={() => criminalRecordImageInputRef.current?.click()}
                            className="w-full py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            {uploadingDocField === 'criminal_record' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {uploadingDocField === 'criminal_record'
                                ? 'جاري الضغط والرفع...'
                                : editFormData.criminal_record_image_url
                                ? 'استبدال الفيش'
                                : 'رفع صورة الفيش'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Bottom Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEditing}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{isSaving ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW MODE: Read-Only Grid & Documents */
                <>
                  {/* Personal Info Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User className="w-4 h-4 text-teal-600" />
                      <span>البيانات الأساسية والوظيفية للموظف</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">الاسم الكامل</span>
                        <span className="text-slate-800 font-bold text-sm block">{currentEmployee.full_name}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">الرقم القومي (14 رقم)</span>
                        <span className="text-slate-800 font-mono font-bold text-sm block">
                          {currentEmployee.national_id}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">رقم الهاتف والتواصل</span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-800 font-mono font-bold text-sm">{currentEmployee.phone}</span>
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${currentEmployee.phone}`}
                              className="p-1 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
                              title="اتصال هاتفي"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${formatWhatsAppNumber(currentEmployee.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                              title="محادثة واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">المسمى والدور الوظيفي</span>
                        <span className="text-teal-700 font-bold text-sm block">{roleText}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">العنوان ومحل الإقامة</span>
                        <span className="text-slate-800 font-medium block">
                          {currentEmployee.address || 'غير محدد'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">الراتب الأساسي</span>
                        <span className="text-emerald-700 font-mono font-bold text-sm block">
                          {currentEmployee.salary
                            ? `${Number(currentEmployee.salary).toLocaleString()} ${settings?.currency_symbol || 'ج.م'}`
                            : 'غير محدد'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">تاريخ التعيين والالتحاق</span>
                        <span className="text-slate-800 font-medium block">
                          {currentEmployee.hire_date || 'غير مسجل'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">اسم المستخدم للنظام</span>
                        <span className="text-slate-800 font-mono font-bold block">{currentEmployee.username}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">حالة الحساب</span>
                        <span className="text-emerald-700 font-bold block">
                          {currentEmployee.is_active !== false ? 'نشط ومصرح له بالعمل' : 'معطل'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-slate-400 font-bold block">تاريخ الإنشاء في النظام</span>
                        <span className="text-slate-800 font-mono block">
                          {currentEmployee.created_at
                            ? new Date(currentEmployee.created_at).toLocaleDateString('ar-EG')
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents & Official Images Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span>المستندات والوثائق الثبوتية الرسمية (الصور المضغوطة WebP)</span>
                      </h4>
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل أو استبدال المستندات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Personal Photo */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">1. الصورة الشخصية</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                currentEmployee.personal_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {currentEmployee.personal_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>
                          {currentEmployee.personal_image_url ? (
                            <img
                              src={currentEmployee.personal_image_url}
                              alt="الصورة الشخصية"
                              className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                              onClick={() =>
                                setLightboxImage({
                                  title: 'الصورة الشخصية للموظف',
                                  url: currentEmployee.personal_image_url!
                                })
                              }
                            />
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                              لم يتم رفع صورة شخصية
                            </div>
                          )}
                        </div>
                        {currentEmployee.personal_image_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: 'الصورة الشخصية للموظف',
                                url: currentEmployee.personal_image_url!
                              })
                            }
                            className="w-full py-1.5 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تكبير الصورة</span>
                          </button>
                        )}
                      </div>

                      {/* National ID Photo */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">2. صورة بطاقة الرقم القومي</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                currentEmployee.national_id_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {currentEmployee.national_id_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>
                          {currentEmployee.national_id_image_url ? (
                            <img
                              src={currentEmployee.national_id_image_url}
                              alt="بطاقة الرقم القومي"
                              className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                              onClick={() =>
                                setLightboxImage({
                                  title: 'صورة بطاقة الرقم القومي',
                                  url: currentEmployee.national_id_image_url!
                                })
                              }
                            />
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                              لم يتم رفع صورة البطاقة
                            </div>
                          )}
                        </div>
                        {currentEmployee.national_id_image_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: 'صورة بطاقة الرقم القومي',
                                url: currentEmployee.national_id_image_url!
                              })
                            }
                            className="w-full py-1.5 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تكبير الصورة</span>
                          </button>
                        )}
                      </div>

                      {/* Criminal Record Photo */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">3. صحيفة الحالة الجنائية (الفيش)</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                currentEmployee.criminal_record_image_url
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {currentEmployee.criminal_record_image_url ? 'متوفرة' : 'غير متوفرة'}
                            </span>
                          </div>
                          {currentEmployee.criminal_record_image_url ? (
                            <img
                              src={currentEmployee.criminal_record_image_url}
                              alt="الفيش الجنائي"
                              className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                              onClick={() =>
                                setLightboxImage({
                                  title: 'صحيفة الحالة الجنائية (الفيش)',
                                  url: currentEmployee.criminal_record_image_url!
                                })
                              }
                            />
                          ) : (
                            <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                              لم يتم رفع الفيش الجنائي
                            </div>
                          )}
                        </div>
                        {currentEmployee.criminal_record_image_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                title: 'صحيفة الحالة الجنائية (الفيش)',
                                url: currentEmployee.criminal_record_image_url!
                              })
                            }
                            className="w-full py-1.5 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تكبير الصورة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT WORKER SCHEDULE MODAL (A4 PRINT FORMAT) */}
      {/* ========================================================================= */}
      {isPrintingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
            {/* Top Bar for Print Preview (Hidden in Print) */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-sm">
                  معاينة ورقة جدول مهام وزيارات العامل (قياس A4 لطباعة أسبوع العمل)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintingSheet(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Container */}
            <div
              id="print-worker-schedule-area"
              className="flex-1 overflow-y-auto p-6 sm:p-10 font-cairo bg-white text-slate-900"
            >
              {/* CSS Print Styles */}
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 8mm;
                  }
                  body * {
                    visibility: hidden;
                  }
                  #print-worker-schedule-area, #print-worker-schedule-area * {
                    visibility: visible;
                  }
                  #print-worker-schedule-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 0;
                    padding: 8mm;
                  }
                }
              `}</style>

              {/* Printable Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {settings?.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="max-h-16 max-w-[130px] object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                        WC
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-black text-slate-900">
                        {settings?.company_name || 'مؤسسة وي كير لخدمات العناية بالسيارات والمنشآت'}
                      </h1>
                      <p className="text-xs font-bold text-teal-800 mt-0.5">
                        جدول مهام وزيارات العمل الميدانية
                      </p>
                    </div>
                  </div>

                  <div className="text-left text-xs font-bold text-slate-600 space-y-1">
                    <div>
                      تاريخ الطباعة:{' '}
                      <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div>
                      المدة:{' '}
                      <span className="font-mono text-slate-900 font-bold">
                        من {dateFrom || 'البداية'} إلى {dateTo || 'النهاية'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Worker Identity Box */}
                <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">اسم الموظف / العامل:</span>
                    <strong className="text-slate-900 text-sm">{currentEmployee.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">الدور الوظيفي:</span>
                    <strong className="text-slate-800">{roleText}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">رقم هاتف العامل:</span>
                    <strong className="font-mono text-slate-800">{currentEmployee.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">عدد المهام والزيارات:</span>
                    <strong className="text-teal-800 font-black text-sm">
                      {filteredScheduleVisits.length} زيارة عمل
                    </strong>
                  </div>
                </div>
              </div>

              {/* Table of Visits */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black border border-slate-400">
                      <th className="p-2 border border-slate-300 text-center w-8">م</th>
                      <th className="p-2 border border-slate-300 w-28">اليوم والتاريخ</th>
                      <th className="p-2 border border-slate-300 w-24">الوقت</th>
                      <th className="p-2 border border-slate-300 w-32">اسم العميل</th>
                      <th className="p-2 border border-slate-300 w-28">هاتف العميل</th>
                      <th className="p-2 border border-slate-300">عنوان العميل بالكامل</th>
                      <th className="p-2 border border-slate-300 w-36">الخدمة والسيارة</th>
                      <th className="p-2 border border-slate-300 w-24 text-center">توقيع العميل / الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScheduleVisits.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 border border-slate-300 font-bold">
                          لا توجد زيارات مسجلة للموظف ضمن هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      filteredScheduleVisits.map((vis, idx) => {
                        const cust = getCustomer(vis.customer_id);
                        const address = getCustomerAddress(vis.customer_id);
                        const vehInfo = getVehicleDetails(vis.subscription_id);

                        return (
                          <tr key={vis.id} className="border border-slate-300 even:bg-slate-50/50">
                            <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">
                              {idx + 1}
                            </td>
                            <td className="p-2 border border-slate-300 font-bold text-slate-900">
                              <div>{vis.day_of_week || ''}</div>
                              <div className="font-mono text-[11px] text-slate-600">{vis.scheduled_date}</div>
                            </td>
                            <td className="p-2 border border-slate-300 font-mono text-[11px] text-slate-800">
                              {vis.scheduled_time_from || '—'} {vis.scheduled_time_to ? `إلى ${vis.scheduled_time_to}` : ''}
                            </td>
                            <td className="p-2 border border-slate-300 font-bold text-slate-900">
                              {cust?.full_name || 'عميل غير مسجل'}
                            </td>
                            <td className="p-2 border border-slate-300 font-mono text-xs text-slate-700" dir="ltr">
                              {cust?.phone || '—'}
                            </td>
                            <td className="p-2 border border-slate-300 text-slate-800 text-[11px] leading-tight font-medium">
                              {address}
                            </td>
                            <td className="p-2 border border-slate-300 text-[11px]">
                              <span className="font-bold text-slate-900 block">{vis.service_type || 'غسيل'}</span>
                              {vehInfo && <span className="text-[10px] text-slate-600 block">{vehInfo}</span>}
                            </td>
                            <td className="p-2 border border-slate-300 text-center">
                              {vis.status === 'completed' ? (
                                <span className="text-[10px] font-bold text-emerald-800">✓ تم الإنجاز</span>
                              ) : (
                                <div className="w-16 h-8 mx-auto border border-dashed border-slate-400 rounded"></div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Printable Signatures & Instructions */}
              <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-8 text-center pt-4">
                  <div className="space-y-8">
                    <p className="font-bold">توقيع الموظف / العامل:</p>
                    <p className="border-b border-slate-400 max-w-[200px] mx-auto"></p>
                  </div>
                  <div className="space-y-8">
                    <p className="font-bold">توقيع المشرف / إدارة التشغيل:</p>
                    <p className="border-b border-slate-400 max-w-[200px] mx-auto"></p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-6">
                  * تنبيه: يرجى التوجه للعملاء في المواعيد المقررة والتأكد من إنجاز المهام وفق معايير الجودة المعتمدة.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 left-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[85vh] w-auto object-contain rounded-xl mx-auto"
            />
            <p className="text-center font-bold text-slate-800 text-sm mt-2">{lightboxImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
};
