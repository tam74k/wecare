import React, { useState, useMemo } from 'react';
import {
  Visit,
  Subscription,
  Customer,
  Vehicle,
  Package,
  Employee,
  CoverageArea,
  Settings,
  VisitStatus
} from '../types/database';
import {
  Calendar,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Search,
  Filter,
  Car,
  Building,
  Sparkles,
  RotateCcw,
  MessageCircle,
  Check,
  ZoomIn,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Send,
  Printer,
  Star,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft
} from 'lucide-react';
import { generateWhatsAppChatLink, sendEvolutionWhatsAppText } from '../services/whatsappService';
import { AllEmployeesSchedulePrintModal } from './AllEmployeesSchedulePrintModal';

interface VisitsViewProps {
  visits: Visit[];
  subscriptions: Subscription[];
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  employees: Employee[];
  coverageAreas: CoverageArea[];
  settings: Settings;
  onUpdateVisit: (visitId: string, updates: Partial<Visit>) => Promise<void>;
  onDeleteVisit: (visitId: string) => Promise<void>;
  onRescheduleVisit?: (visitId: string, newDate: string, newTimeFrom?: string, newTimeTo?: string) => Promise<void>;
  onUpdateVisitStatus?: (visitId: string, status: VisitStatus, notes?: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

type StatusTabFilter = 'all' | 'completed' | 'scheduled' | 'postponed' | 'cancelled';

const ARABIC_DAYS_LIST = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
];

export const VisitsView: React.FC<VisitsViewProps> = ({
  visits = [],
  subscriptions = [],
  customers = [],
  vehicles = [],
  packages = [],
  employees = [],
  coverageAreas = [],
  settings,
  onUpdateVisit,
  onDeleteVisit,
  onRescheduleVisit,
  onUpdateVisitStatus,
  onRefreshData
}) => {
  // 1. Status Tab filter (Default: 'all' as requested)
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTabFilter>('all');

  // 2. Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'>('all');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');

  // 3. Postpone Modal State
  const [postponingVisit, setPostponingVisit] = useState<Visit | null>(null);
  const [postponeNewDate, setPostponeNewDate] = useState<string>('');
  const [postponeNewTimeFrom, setPostponeNewTimeFrom] = useState<string>('');
  const [postponeNewTimeTo, setPostponeNewTimeTo] = useState<string>('');
  const [postponeReason, setPostponeReason] = useState<string>('بناءً على طلب العميل');
  const [postponeNotifyWhatsApp, setPostponeNotifyWhatsApp] = useState<boolean>(true);
  const [isSubmittingPostpone, setIsSubmittingPostpone] = useState<boolean>(false);

  // 4. Inline worker saving indicator map { [visitId]: boolean }
  const [savingWorkerMap, setSavingWorkerMap] = useState<Record<string, boolean>>({});
  const [savedWorkerSuccessMap, setSavedWorkerSuccessMap] = useState<Record<string, boolean>>({});

  // 5. Lightbox for worker photo
  const [enlargedWorker, setEnlargedWorker] = useState<Employee | null>(null);

  // 6. Print all employees weekly schedule modal state
  const [isPrintAllWorkersModalOpen, setIsPrintAllWorkersModalOpen] = useState(false);

  // Helper: Get day name from date string safely
  const getDayNameFromDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split(/[-/T\s]/).map(Number);
      if (parts.length >= 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[d.getDay()] || '';
      }
    } catch {}
    return '';
  };

  // Helper Lookups
  const getSubscription = (subId?: string) => subscriptions.find((s) => s.id === subId);
  const getCustomer = (custId?: string, subId?: string) => {
    if (custId) {
      const c = customers.find((item) => item.id === custId);
      if (c) return c;
    }
    if (subId) {
      const sub = getSubscription(subId);
      if (sub?.customer_id) return customers.find((item) => item.id === sub.customer_id);
    }
    return undefined;
  };

  const getVehicle = (subId?: string) => {
    const sub = getSubscription(subId);
    if (!sub?.vehicle_id) return undefined;
    return vehicles.find((v) => v.id === sub.vehicle_id);
  };

  const getPackage = (subId?: string) => {
    const sub = getSubscription(subId);
    if (!sub?.package_id) return undefined;
    return packages.find((p) => p.id === sub.package_id);
  };

  const getWorker = (workerId?: string | null, subId?: string) => {
    if (workerId) {
      const emp = employees.find((e) => e.id === workerId);
      if (emp) return emp;
    }
    if (subId) {
      const sub = getSubscription(subId);
      if (sub?.assigned_worker_id) {
        return employees.find((e) => e.id === sub.assigned_worker_id);
      }
    }
    return undefined;
  };

  const getArea = (areaId?: string) => coverageAreas.find((a) => a.id === areaId);

  const getCustomerFullAddress = (cust?: Customer, areaId?: string) => {
    const area = coverageAreas.find((a) => a.id === areaId || a.id === cust?.area_id);
    const parts: string[] = [];
    if (area?.name) parts.push(area.name);
    if (cust?.building_number) parts.push(`عمارة ${cust.building_number}`);
    const block = cust?.block_number || cust?.block;
    if (block) parts.push(`مجاورة/بلوك ${block}`);
    if (cust?.detailed_address && cust.detailed_address.trim()) parts.push(cust.detailed_address.trim());
    return {
      text: parts.length > 0 ? parts.join(' - ') : (area?.name || 'العنوان غير محدد'),
      locationUrl: cust?.location_url || undefined
    };
  };

  // Calculate status counts
  const counts = useMemo(() => {
    return {
      all: visits.length,
      completed: visits.filter((v) => v.status === 'completed').length,
      scheduled: visits.filter((v) => v.status === 'scheduled').length,
      postponed: visits.filter((v) => v.status === 'postponed').length,
      cancelled: visits.filter((v) => v.status === 'cancelled').length
    };
  }, [visits]);

  // Handle Preset Date changes
  const handlePresetDateChange = (preset: 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'today') {
      setSelectedDateFilter(todayStr);
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tY = tomorrow.getFullYear();
      const tM = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tD = String(tomorrow.getDate()).padStart(2, '0');
      setSelectedDateFilter(`${tY}-${tM}-${tD}`);
    } else {
      setSelectedDateFilter('');
    }
  };

  // Filter Visits
  const filteredVisits = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Calculate week range
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    // Calculate month range
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

    return visits
      .filter((v) => {
        // 1. Status Filter
        if (activeStatusTab !== 'all' && v.status !== activeStatusTab) {
          return false;
        }

        // 2. Day of Week Filter
        if (selectedDayFilter !== 'all') {
          const visitDay = v.day_of_week || getDayNameFromDate(v.scheduled_date);
          if (visitDay !== selectedDayFilter) return false;
        }

        // 3. Date Filter
        if (datePreset === 'today') {
          if (v.scheduled_date !== todayStr) return false;
        } else if (datePreset === 'tomorrow') {
          if (v.scheduled_date !== selectedDateFilter) return false;
        } else if (datePreset === 'week') {
          if (v.scheduled_date < startOfWeekStr || v.scheduled_date > endOfWeekStr) return false;
        } else if (datePreset === 'month') {
          if (!v.scheduled_date.startsWith(currentMonthStr)) return false;
        } else if (selectedDateFilter) {
          if (v.scheduled_date !== selectedDateFilter) return false;
        }

        // 4. Worker Filter
        if (selectedWorkerFilter !== 'all') {
          const wId = v.assigned_worker_id || (v as any).worker_id;
          if (wId !== selectedWorkerFilter) return false;
        }

        // 5. Search Text Filter
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const cust = getCustomer(v.customer_id, v.subscription_id);
          const veh = getVehicle(v.subscription_id);
          const pkg = getPackage(v.subscription_id);
          const worker = getWorker(v.assigned_worker_id, v.subscription_id);

          const matchName = cust?.full_name?.toLowerCase().includes(q);
          const matchPhone = cust?.phone?.includes(q) || (cust as any)?.mobile?.includes(q);
          const matchPlate = veh?.plate_number?.toLowerCase().includes(q);
          const matchService = v.service_type?.toLowerCase().includes(q);
          const matchPkg = pkg?.name?.toLowerCase().includes(q);
          const matchWorker = worker?.full_name?.toLowerCase().includes(q);
          const matchDate = v.scheduled_date?.includes(q);

          if (!matchName && !matchPhone && !matchPlate && !matchService && !matchPkg && !matchWorker && !matchDate) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort chronologically by scheduled_date
        const dDiff = a.scheduled_date.localeCompare(b.scheduled_date);
        if (dDiff !== 0) return dDiff;
        return (a.scheduled_time_from || '').localeCompare(b.scheduled_time_from || '');
      });
  }, [
    visits,
    activeStatusTab,
    selectedDayFilter,
    selectedDateFilter,
    datePreset,
    selectedWorkerFilter,
    searchTerm,
    subscriptions,
    customers,
    vehicles,
    packages,
    employees
  ]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Reset to page 1 on filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, selectedDayFilter, selectedDateFilter, datePreset, selectedWorkerFilter, searchTerm, pageSize]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredVisits.length);

  const paginatedVisits = useMemo(() => {
    return filteredVisits.slice(startIndex, startIndex + pageSize);
  }, [filteredVisits, startIndex, pageSize]);

  // Handle Inline Worker Change
  const handleInlineWorkerChange = async (visitId: string, newWorkerId: string) => {
    try {
      setSavingWorkerMap((prev) => ({ ...prev, [visitId]: true }));
      await onUpdateVisit(visitId, { assigned_worker_id: newWorkerId || null });
      setSavedWorkerSuccessMap((prev) => ({ ...prev, [visitId]: true }));
      setTimeout(() => {
        setSavedWorkerSuccessMap((prev) => ({ ...prev, [visitId]: false }));
      }, 2500);
    } catch (err: any) {
      alert('فشل حفظ تعيين العامل: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSavingWorkerMap((prev) => ({ ...prev, [visitId]: false }));
    }
  };

  // Open Postpone Modal
  const openPostponeModal = (visit: Visit) => {
    setPostponingVisit(visit);
    // Suggest next day as default
    const current = new Date(visit.scheduled_date + 'T12:00:00');
    current.setDate(current.getDate() + 1);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setPostponeNewDate(`${yyyy}-${mm}-${dd}`);
    setPostponeNewTimeFrom(visit.scheduled_time_from || '');
    setPostponeNewTimeTo(visit.scheduled_time_to || '');
    setPostponeReason('بناءً على طلب العميل');
    setPostponeNotifyWhatsApp(true);
  };

  // Submit Postponement
  const handleConfirmPostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponingVisit || !postponeNewDate) {
      alert('يرجى تحديد التاريخ الجديد للزيارة');
      return;
    }

    try {
      setIsSubmittingPostpone(true);
      const newDay = getDayNameFromDate(postponeNewDate);

      if (onRescheduleVisit) {
        await onRescheduleVisit(
          postponingVisit.id,
          postponeNewDate,
          postponeNewTimeFrom || undefined,
          postponeNewTimeTo || undefined
        );
      } else {
        await onUpdateVisit(postponingVisit.id, {
          scheduled_date: postponeNewDate,
          day_of_week: newDay,
          status: 'postponed',
          postponed_from_date: postponingVisit.postponed_from_date || postponingVisit.scheduled_date,
          postponed_reason: postponeReason,
          notes: `تم تأجيل ونقل الزيارة من ${postponingVisit.scheduled_date} إلى ${postponeNewDate} (${postponeReason})`
        });
      }

      // WhatsApp Notification if checked
      if (postponeNotifyWhatsApp) {
        const cust = getCustomer(postponingVisit.customer_id, postponingVisit.subscription_id);
        const veh = getVehicle(postponingVisit.subscription_id);
        if (cust?.phone) {
          const msg = `مرحباً بك عميلنا العزيز ${cust.full_name || ''} 🌸\nنود إحاطتكم بأنه تم تعديل موعد زيارتكم ${veh ? `للسيارة (${veh.plate_number})` : ''} لتكون في موعدها الجديد يوم *${newDay}* الموافق *${postponeNewDate}*.\nنسعد دائماً بخدمتكم في *${settings.company_name || 'وي كير'}* ✨`;
          try {
            const sendRes = await sendEvolutionWhatsAppText(cust.phone, msg, settings);
            if (!sendRes.success) {
              const waUrl = generateWhatsAppChatLink(cust.phone, msg);
              window.open(waUrl, '_blank');
            }
          } catch {
            const waUrl = generateWhatsAppChatLink(cust.phone, msg);
            window.open(waUrl, '_blank');
          }
        }
      }

      setPostponingVisit(null);
      await onRefreshData?.();
    } catch (err: any) {
      alert('فشل تأجيل الزيارة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmittingPostpone(false);
    }
  };

  // Handle Cancel Visit
  const handleCancelVisit = async (visit: Visit) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إلغاء زيارة يوم ${visit.scheduled_date}؟`)) {
      try {
        if (onUpdateVisitStatus) {
          await onUpdateVisitStatus(visit.id, 'cancelled', 'تم إلغاء الزيارة من جدول الزيارات');
        } else {
          await onUpdateVisit(visit.id, { status: 'cancelled' });
        }
        await onRefreshData?.();
      } catch (err: any) {
        alert('فشل إلغاء الزيارة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  // Handle Complete Visit Quick Action
  const handleQuickCompleteVisit = async (visit: Visit) => {
    if (window.confirm(`تأكيد إتمام تنفيذ زيارة يوم ${visit.scheduled_date}؟`)) {
      try {
        if (onUpdateVisitStatus) {
          await onUpdateVisitStatus(visit.id, 'completed', 'تم التنفيذ بنجاح');
        } else {
          await onUpdateVisit(visit.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        }
        await onRefreshData?.();
      } catch (err: any) {
        alert('فشل تأكيد إتمام الزيارة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  // Handle Permanent Delete
  const handleDeletePermanent = async (visit: Visit) => {
    if (window.confirm(`⚠️ تحذير: هل أنت متأكد تماماً من حذف هذه الزيارة نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      try {
        await onDeleteVisit(visit.id);
        await onRefreshData?.();
      } catch (err: any) {
        alert('فشل حذف الزيارة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setActiveStatusTab('all');
    setSearchTerm('');
    setSelectedDayFilter('all');
    setSelectedDateFilter('');
    setDatePreset('all');
    setSelectedWorkerFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* 1. Header & Summary Stats */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                جدول ومواعيد الزيارات
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                متابعة وإدارة جميع الزيارات المجدولة، التعديل المباشر للفنيين، والتأجيل والإلغاء
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Badges & Print All Action */}
        <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>الكل: <strong className="font-mono text-slate-900">{counts.all}</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>تمت: <strong className="font-mono text-emerald-900">{counts.completed}</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>مجدولة: <strong className="font-mono text-sky-900">{counts.scheduled}</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>مؤجلة: <strong className="font-mono text-amber-900">{counts.postponed}</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>ملغية: <strong className="font-mono text-rose-900">{counts.cancelled}</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPrintAllWorkersModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="طباعة جدول الأسبوع لجميع الموظفين - كل موظف في صفحة مستقلة"
          >
            <Printer className="w-4 h-4" />
            <Users className="w-4 h-4" />
            <span>طباعة جدول الأسبوع لجميع الموظفين</span>
          </button>
        </div>
      </div>

      {/* 2. Main Tabs Bar (التقسيم المطلوب: عرض الكل - تمت - مجدولة - مؤجلة - ملغية) */}
      <div className="bg-white rounded-2xl p-2 shadow-xs border border-slate-100 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveStatusTab('all')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStatusTab === 'all'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>عرض الكل</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            activeStatusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('completed')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStatusTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>تمت</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            activeStatusTab === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('scheduled')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStatusTab === 'scheduled'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>مجدولة</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            activeStatusTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
          }`}>
            {counts.scheduled}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('postponed')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStatusTab === 'postponed'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>مؤجلة</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            activeStatusTab === 'postponed' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {counts.postponed}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('cancelled')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStatusTab === 'cancelled'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
              : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/50'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>ملغية</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            activeStatusTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
          }`}>
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* 3. Filters Section (عوامل التصفية بالتاريخ، باليوم، بالبحث وبالعامل) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>عوامل التصفية والبحث المتقدم</span>
          </div>

          {(searchTerm || selectedDayFilter !== 'all' || selectedDateFilter || datePreset !== 'all' || selectedWorkerFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Quick Search (col-span-4) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              بحث سريع (العميل / الهاتف / اللوحة / الخدمة / الفني):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو رقم اللوحة أو الجوال..."
                className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter by Day (سبت - أحد - إثنين... إلخ) (col-span-3) */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              تصفية حسب اليوم من الأسبوع:
            </label>
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">📅 جميع الأيام (السبت إلى الجمعة)</option>
              {ARABIC_DAYS_LIST.map((day) => (
                <option key={day} value={day}>
                  يوم {day}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Worker (col-span-2) */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              تصفية حسب الفني:
            </label>
            <select
              value={selectedWorkerFilter}
              onChange={(e) => setSelectedWorkerFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">👨‍🔧 جميع الفنيين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker (col-span-3) */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              تصفية بتاريخ محدد:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => {
                  setSelectedDateFilter(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter('');
                    setDatePreset('all');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="مسح التاريخ"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="pt-2 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold ml-1 text-[11px] shrink-0">الفترة:</span>
          {[
            { id: 'all', label: 'كامل المدة' },
            { id: 'today', label: 'اليوم' },
            { id: 'tomorrow', label: 'غداً' },
            { id: 'week', label: 'هذا الأسبوع' },
            { id: 'month', label: 'هذا الشهر' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetDateChange(preset.id as any)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-teal-100 text-teal-900 border border-teal-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Visits Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              النتائج المعروضة:
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-teal-100 text-teal-900 border border-teal-200">
              {filteredVisits.length} زيارة
            </span>
            {selectedDayFilter !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                يوم: {selectedDayFilter}
              </span>
            )}
            {selectedDateFilter && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-100 text-sky-900">
                التاريخ: {selectedDateFilter}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            💡 يمكنك تعديل الفني مباشرة من خانة العامل، أو استخدام الأيقونات المصغرة للتأجيل والإلغاء والحذف.
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80 select-none">
                <th className="p-3.5 text-center w-12">#</th>
                <th className="p-3.5">التاريخ واليوم</th>
                <th className="p-3.5">العميل والهاتف</th>
                <th className="p-3.5 min-w-[200px]">العنوان بالكامل والموقع</th>
                <th className="p-3.5">المركبة / الاشتراك</th>
                <th className="p-3.5">الخدمة والباقة</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center min-w-[120px]">التقييم</th>
                <th className="p-3.5 min-w-[210px]">
                  العامل المخصص
                  <span className="text-[10px] text-teal-600 block font-normal">(تعديل مباشر من السطر)</span>
                </th>
                <th className="p-3.5 text-center min-w-[140px]">إجراءات الزيارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedVisits.map((visit, idx) => {
                const sub = getSubscription(visit.subscription_id);
                const cust = getCustomer(visit.customer_id, visit.subscription_id);
                const veh = getVehicle(visit.subscription_id);
                const pkg = getPackage(visit.subscription_id);
                const worker = getWorker(visit.assigned_worker_id, visit.subscription_id);
                const area = getArea(sub?.area_id || cust?.area_id);
                const isSavingWorker = savingWorkerMap[visit.id];
                const isSavedWorkerSuccess = savedWorkerSuccessMap[visit.id];

                const currentWorkerPhoto = worker?.personal_image_url || worker?.national_id_image_url;
                const dayName = visit.day_of_week || getDayNameFromDate(visit.scheduled_date);

                return (
                  <tr
                    key={visit.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      visit.status === 'completed'
                        ? 'bg-emerald-50/20'
                        : visit.status === 'cancelled'
                        ? 'bg-rose-50/20'
                        : visit.status === 'postponed'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                      {startIndex + idx + 1}
                    </td>

                    {/* Scheduled Date & Day */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>{visit.scheduled_date}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            {dayName}
                          </span>
                        </div>

                        {/* If Postponed Badge */}
                        {visit.postponed_from_date && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                            <CalendarClock className="w-3 h-3 text-amber-600" />
                            <span>مؤجلة من: {visit.postponed_from_date}</span>
                          </div>
                        )}

                        {/* Preferred Time */}
                        {(visit.scheduled_time_from || sub?.preferred_time_from) && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {visit.scheduled_time_from || sub?.preferred_time_from}
                              {(visit.scheduled_time_to || sub?.preferred_time_to) && ` - ${visit.scheduled_time_to || sub?.preferred_time_to}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-3.5">
                      <div className="space-y-1 min-w-[150px]">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{cust?.full_name || 'عميل غير مسجل'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cust?.phone && (
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span dir="ltr">{cust.phone}</span>
                            </span>
                          )}
                          {cust?.phone && (
                            <a
                              href={generateWhatsAppChatLink(cust.phone, `مرحباً بك ${cust.full_name} بخصوص زيارتك المقررة بتاريخ ${visit.scheduled_date}...`)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5 transition-colors"
                              title="محادثة واتساب سريعة"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Full Address */}
                    <td className="p-3.5 min-w-[200px]">
                      {(() => {
                        const addr = getCustomerFullAddress(cust, sub?.area_id);
                        return (
                          <div className="space-y-1">
                            <div className="flex items-start gap-1.5 text-slate-800 font-bold">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{addr.text}</span>
                            </div>
                            {addr.locationUrl && (
                              <a
                                href={addr.locationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-bold bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors w-fit"
                                title="فتح موقع العميل على خرائط جوجل"
                              >
                                <span>📍 فتح الخريطة ↗</span>
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Target Vehicle / Subscription Type */}
                    <td className="p-3.5 whitespace-nowrap">
                      {veh ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-slate-500" />
                            <span>{veh.plate_number}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {veh.vehicle_type || 'سيارة'} {veh.color ? `• ${veh.color}` : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>اشتراك مبنى / خدمة</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {sub ? `رقم #${sub.id.slice(0, 8)}` : '-'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Service & Package */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-900 border border-teal-200 rounded-lg font-bold text-[11px]">
                          <Sparkles className="w-3 h-3 text-teal-600" />
                          <span>{visit.service_type || 'غسيل'}</span>
                        </span>
                        {pkg && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={pkg.name}>
                            باقة: {pkg.name}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      {visit.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>تمت بنجاح</span>
                        </span>
                      )}
                      {visit.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          <Clock className="w-3 h-3 text-sky-600" />
                          <span>مجدولة</span>
                        </span>
                      )}
                      {visit.status === 'postponed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <CalendarClock className="w-3 h-3 text-amber-600" />
                          <span>مؤجلة</span>
                        </span>
                      )}
                      {visit.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>ملغية</span>
                        </span>
                      )}
                    </td>

                    {/* Customer Rating */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {visit.status === 'completed' ? (
                        typeof visit.rating === 'number' && visit.rating > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= (visit.rating || 0)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono text-xs font-black text-amber-600">
                                ({visit.rating}/5)
                              </span>
                            </div>
                            {visit.rating_comment && (
                              <div
                                className="text-[10px] text-slate-500 italic max-w-[140px] truncate"
                                title={visit.rating_comment}
                              >
                                "{visit.rating_comment}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                            بلا تقييم
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Worker Selector: تعديل العامل من نفس السطر بدون الدخول إلى تفاصيل أخرى */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* Worker Photo / Initials with Zoom */}
                        {currentWorkerPhoto ? (
                          <div
                            onClick={() => setEnlargedWorker(worker!)}
                            className="relative group shrink-0 cursor-pointer"
                            title="اضغط لتكبير صورة الفني"
                          >
                            <img
                              src={currentWorkerPhoto}
                              alt={worker?.full_name}
                              className="w-7 h-7 rounded-xl object-cover border-2 border-teal-500 shadow-2xs group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        ) : worker ? (
                          <div className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {worker.full_name.slice(0, 1)}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Inline Dropdown */}
                        <div className="relative flex-1 min-w-[130px]">
                          <select
                            value={visit.assigned_worker_id || (visit as any).worker_id || ''}
                            onChange={(e) => handleInlineWorkerChange(visit.id, e.target.value)}
                            disabled={isSavingWorker}
                            className={`w-full py-1.5 px-2 text-xs bg-white border rounded-xl font-medium focus:ring-2 focus:ring-teal-500 cursor-pointer transition-all ${
                              isSavedWorkerSuccess
                                ? 'border-emerald-500 text-emerald-800 bg-emerald-50/50'
                                : 'border-slate-200 hover:border-teal-400 text-slate-800'
                            }`}
                          >
                            <option value="">-- بدون تعيين --</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name} {emp.role ? `(${emp.role})` : ''}
                              </option>
                            ))}
                          </select>

                          {/* Quick Success Checkmark Indicator */}
                          {isSavedWorkerSuccess && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Small Icon Action Buttons: وازرار تأجيل - الغاء -حذف نهائي ايقونات صغيرة */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Quick Complete (Only if scheduled or postponed) */}
                        {(visit.status === 'scheduled' || visit.status === 'postponed') && (
                          <button
                            type="button"
                            onClick={() => handleQuickCompleteVisit(visit)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="تأكيد إتمام الزيارة بنجاح"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* 2. Postpone Button (Small Icon) */}
                        <button
                          type="button"
                          onClick={() => openPostponeModal(visit)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="تأجيل الزيارة لموعد آخر"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {/* 3. Cancel Button (Small Icon) */}
                        {visit.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleCancelVisit(visit)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="إلغاء الزيارة"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* 4. Delete Permanent Button (Small Icon) */}
                        <button
                          type="button"
                          onClick={() => handleDeletePermanent(visit)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف نهائي للزيارة من السجلات"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVisits.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarDays className="w-10 h-10 text-slate-300" />
                      <p className="text-sm">لا توجد زيارات تطابق معايير التصفية المحددة.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                      >
                        عرض جميع الزيارات
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredVisits.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <span>
                عرض <strong className="text-slate-900 font-bold">{filteredVisits.length === 0 ? 0 : startIndex + 1}</strong> إلى{' '}
                <strong className="text-slate-900 font-bold">{endIndex}</strong> من إجمالي{' '}
                <strong className="text-teal-700 font-bold">{filteredVisits.length}</strong> زيارة
              </span>

              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-slate-400 text-[11px]">في الصفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
                  title="الصفحة الأولى"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - safeCurrentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={page}>
                          {prev && page - prev > 1 && (
                            <span className="px-1 text-slate-400 font-bold text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              safeCurrentPage === page
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
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
                  title="الصفحة الأخيرة"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Postpone Modal (وعند التأجيل يتم اختيار تاريخ اخر للزيارة وتظهر في التاريخ الجديد) */}
      {postponingVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-4 animate-scaleUp border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">تأجيل ونقل موعد الزيارة</h3>
                  <p className="text-xs text-amber-100">
                    نقل الزيارة لتاريخ جديد وتحديث حالتها إلى مؤجلة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPostponingVisit(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmPostpone} className="p-5 space-y-4">
              {/* Current Visit Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">الموعد الحالي:</span>
                  <span className="font-mono font-black text-slate-800">
                    {postponingVisit.scheduled_date} ({postponingVisit.day_of_week || getDayNameFromDate(postponingVisit.scheduled_date)})
                  </span>
                </div>
                {(() => {
                  const cust = getCustomer(postponingVisit.customer_id, postponingVisit.subscription_id);
                  const veh = getVehicle(postponingVisit.subscription_id);
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">العميل:</span>
                        <span className="font-bold text-slate-900">{cust?.full_name || '-'}</span>
                      </div>
                      {veh && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">المركبة:</span>
                          <span className="font-mono font-bold text-slate-800">{veh.plate_number}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* New Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تاريخ الزيارة الجديد *
                </label>
                <input
                  type="date"
                  value={postponeNewDate}
                  onChange={(e) => setPostponeNewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  required
                />
                <div className="text-xs text-amber-700 font-bold mt-1">
                  اليوم الجديد: {getDayNameFromDate(postponeNewDate) || 'يرجى تحديد التاريخ'}
                </div>
              </div>

              {/* Optional Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوقت من (اختياري):
                  </label>
                  <input
                    type="time"
                    value={postponeNewTimeFrom}
                    onChange={(e) => setPostponeNewTimeFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوقت إلى (اختياري):
                  </label>
                  <input
                    type="time"
                    value={postponeNewTimeTo}
                    onChange={(e) => setPostponeNewTimeTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Reason for Postponement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب التأجيل:
                </label>
                <input
                  type="text"
                  list="postpone-reasons-list"
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  placeholder="حدد أو اكتب سبب التأجيل..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
                <datalist id="postpone-reasons-list">
                  <option value="بناءً على طلب العميل" />
                  <option value="العميل غير متواجد في الموقع" />
                  <option value="ظروف جوية طارئة" />
                  <option value="انشغال الفني أو عطل في المعدات" />
                  <option value="تأجيل بطلب من الإدارة" />
                </datalist>
              </div>

              {/* WhatsApp Notification Checkbox */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="notifyWhatsAppCheck"
                  checked={postponeNotifyWhatsApp}
                  onChange={(e) => setPostponeNotifyWhatsApp(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="notifyWhatsAppCheck" className="text-xs text-emerald-900 font-bold cursor-pointer select-none">
                  إرسال رسالة واتساب للعميل بالموعد الجديد فور التأجيل
                  <span className="block text-[11px] font-normal text-emerald-700 mt-0.5">
                    سيتم فتح محادثة الواتساب بنص التعديل المعتمد لراحة العميل.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPostponingVisit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPostpone}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>{isSubmittingPostpone ? 'جاري التأجيل...' : 'تأكيد التأجيل للموعد الجديد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Lightbox for enlarged worker photo */}
      {enlargedWorker && (
        <div
          onClick={() => setEnlargedWorker(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fadeIn font-cairo"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center animate-scaleUp"
          >
            <div className="relative inline-block mx-auto">
              <img
                src={enlargedWorker.personal_image_url || enlargedWorker.national_id_image_url || ''}
                alt={enlargedWorker.full_name}
                className="w-48 h-48 object-cover rounded-2xl mx-auto shadow-md border-4 border-teal-500"
              />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{enlargedWorker.full_name}</h3>
              <p className="text-xs text-teal-700 font-bold mt-0.5">{enlargedWorker.role || 'فني خدمات'}</p>
              {enlargedWorker.phone && (
                <p className="text-xs text-slate-500 font-mono mt-1" dir="ltr">{enlargedWorker.phone}</p>
              )}
            </div>
            <button
              onClick={() => setEnlargedWorker(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}

      {/* 7. Print All Employees Weekly Schedule Modal */}
      {isPrintAllWorkersModalOpen && (
        <AllEmployeesSchedulePrintModal
          isOpen={isPrintAllWorkersModalOpen}
          onClose={() => setIsPrintAllWorkersModalOpen(false)}
          visits={visits}
          employees={employees}
          customers={customers}
          subscriptions={subscriptions}
          coverageAreas={coverageAreas}
          vehicles={vehicles}
          settings={settings}
        />
      )}
    </div>
  );
};
