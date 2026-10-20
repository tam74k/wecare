import React, { useState, useMemo } from 'react';
import {
  Employee,
  Visit,
  Customer,
  Subscription,
  CoverageArea,
  Vehicle,
  Settings
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
  Clock3
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule'>('schedule');
  const [scheduleFilterMode, setScheduleFilterMode] = useState<'upcoming' | 'past' | 'all'>('upcoming');

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
      if (v.assigned_worker_id === employee.id || (v as any).worker_id === employee.id) return true;
      if (v.assigned_worker_id === employee.full_name || (v as any).worker_id === employee.full_name) return true;
      const sub = subscriptions.find((s) => s.id === v.subscription_id);
      if (!v.assigned_worker_id && !(v as any).worker_id && sub?.assigned_worker_id === employee.id) return true;
      return false;
    });
  }, [visits, employee, subscriptions]);

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
    employee.role === 'admin' ? 'مدير إداري' : employee.role === 'supervisor' ? 'مشرف مناطق' : 'عامل غسيل ميداني';

  const avatarUrl = employee.personal_image_url || employee.national_id_image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={employee.full_name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-400/80 shadow-md shrink-0 cursor-pointer hover:opacity-90"
                onClick={() => setLightboxImage({ title: employee.full_name, url: avatarUrl })}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-teal-800/80 border-2 border-teal-400/60 flex items-center justify-center text-teal-200 font-bold text-xl shadow-md shrink-0">
                {employee.full_name.slice(0, 1) || <User className="w-6 h-6" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-white">{employee.full_name}</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {roleText}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    employee.is_active !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {employee.is_active !== false ? 'حساب نشط' : 'حساب معطل'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>هاتف: {employee.phone}</span>
                <span>•</span>
                <span>الرقم القومي: {employee.national_id}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintingSheet(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
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
              {/* Personal Info Grid */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>البيانات الأساسية والوظيفية للموظف</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">الاسم الكامل</span>
                    <span className="text-slate-800 font-bold text-sm block">{employee.full_name}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">الرقم القومي (14 رقم)</span>
                    <span className="text-slate-800 font-mono font-bold text-sm block">{employee.national_id}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">رقم الهاتف والتواصل</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 font-mono font-bold text-sm">{employee.phone}</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${employee.phone}`}
                          className="p-1 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
                          title="اتصال هاتفي"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${employee.phone.replace(/[^0-9]/g, '')}`}
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
                    <span className="text-slate-800 font-medium block">{employee.address || 'غير محدد'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">تاريخ التعيين والالتحاق</span>
                    <span className="text-slate-800 font-medium block">{employee.hire_date || 'غير مسجل'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">اسم المستخدم للنظام</span>
                    <span className="text-slate-800 font-mono font-bold block">{employee.username}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">حالة الحساب</span>
                    <span className="text-emerald-700 font-bold block">
                      {employee.is_active !== false ? 'نشط ومصرح له بالعمل' : 'معطل'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-bold block">تاريخ الإنشاء في النظام</span>
                    <span className="text-slate-800 font-mono block">
                      {employee.created_at ? new Date(employee.created_at).toLocaleDateString('ar-EG') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents & Official Images Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>المستندات والوثائق الثبوتية الرسمية (الصور المضغوطة WebP)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Personal Photo */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">1. الصورة الشخصية</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            employee.personal_image_url
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {employee.personal_image_url ? 'متوفرة' : 'غير متوفرة'}
                        </span>
                      </div>
                      {employee.personal_image_url ? (
                        <img
                          src={employee.personal_image_url}
                          alt="الصورة الشخصية"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onClick={() =>
                            setLightboxImage({ title: 'الصورة الشخصية للموظف', url: employee.personal_image_url! })
                          }
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                          لم يتم رفع صورة شخصية
                        </div>
                      )}
                    </div>
                    {employee.personal_image_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({ title: 'الصورة الشخصية للموظف', url: employee.personal_image_url! })
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
                            employee.national_id_image_url
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {employee.national_id_image_url ? 'متوفرة' : 'غير متوفرة'}
                        </span>
                      </div>
                      {employee.national_id_image_url ? (
                        <img
                          src={employee.national_id_image_url}
                          alt="بطاقة الرقم القومي"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onClick={() =>
                            setLightboxImage({
                              title: 'صورة بطاقة الرقم القومي',
                              url: employee.national_id_image_url!
                            })
                          }
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                          لم يتم رفع صورة البطاقة
                        </div>
                      )}
                    </div>
                    {employee.national_id_image_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            title: 'صورة بطاقة الرقم القومي',
                            url: employee.national_id_image_url!
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
                            employee.criminal_record_image_url
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {employee.criminal_record_image_url ? 'متوفرة' : 'غير متوفرة'}
                        </span>
                      </div>
                      {employee.criminal_record_image_url ? (
                        <img
                          src={employee.criminal_record_image_url}
                          alt="الفيش الجنائي"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onClick={() =>
                            setLightboxImage({
                              title: 'صحيفة الحالة الجنائية (الفيش)',
                              url: employee.criminal_record_image_url!
                            })
                          }
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                          لم يتم رفع الفيش الجنائي
                        </div>
                      )}
                    </div>
                    {employee.criminal_record_image_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            title: 'صحيفة الحالة الجنائية (الفيش)',
                            url: employee.criminal_record_image_url!
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
                    <strong className="text-slate-900 text-sm">{employee.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">الدور الوظيفي:</span>
                    <strong className="text-slate-800">{roleText}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">رقم هاتف العامل:</span>
                    <strong className="font-mono text-slate-800">{employee.phone}</strong>
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
