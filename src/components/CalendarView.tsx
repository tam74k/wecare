import React, { useState } from 'react';
import {
  Visit,
  Customer,
  Subscription,
  Employee,
  CoverageArea,
  Package,
  Vehicle,
  VisitStatus
} from '../types/database';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Car,
  Building,
  MapPin,
  Move,
  CheckCircle2,
  AlertCircle,
  Phone,
  Info,
  MessageCircle,
  Loader2
} from 'lucide-react';
import * as api from '../services/api';

interface CalendarViewProps {
  visits: Visit[];
  customers: Customer[];
  subscriptions: Subscription[];
  employees: Employee[];
  coverageAreas: CoverageArea[];
  packages: Package[];
  vehicles: Vehicle[];
  onRescheduleVisit: (visitId: string, newDate: string, newTimeFrom?: string, newTimeTo?: string) => Promise<void>;
  onUpdateVisitStatus: (visitId: string, status: VisitStatus, notes?: string) => Promise<void>;
}

type CalendarViewMode = 'week' | 'day' | 'month' | 'custom';

export const CalendarView: React.FC<CalendarViewProps> = ({
  visits,
  customers,
  subscriptions,
  employees,
  coverageAreas,
  packages,
  vehicles,
  onRescheduleVisit,
  onUpdateVisitStatus
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedVisitModal, setSelectedVisitModal] = useState<Visit | null>(null);
  const [draggedVisitId, setDraggedVisitId] = useState<string | null>(null);

  // Custom date range state
  const [customRangeStart, setCustomRangeStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // WhatsApp notification state
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  const handleSendWhatsApp = async (visitId: string) => {
    try {
      setIsSendingWhatsApp(true);
      setWhatsAppNotice(null);
      const res = await api.notifyCustomerOnVisitCompleted(visitId);
      if (res.success) {
        setWhatsAppNotice('✓ تم إرسال تفاصيل الزيارة ورابط التقييم إلى واتساب العميل بنجاح');
      } else {
        setWhatsAppNotice(`⚠️ تعذر الإرسال (${res.error || 'خطأ'})`);
        if (res.directWaLink) {
          window.open(res.directWaLink, '_blank');
        }
      }
      setTimeout(() => setWhatsAppNotice(null), 6000);
    } catch (err: any) {
      alert('حدث خطأ: ' + (err.message || ''));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper functions to get dates
  const getWeekDates = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    // Egyptian week starts on Saturday (day 6 in JS: Sun=0, Sat=6)
    const day = startOfWeek.getDay();
    const diff = (day + 1) % 7; // shift so Saturday is 0
    startOfWeek.setDate(startOfWeek.getDate() - diff);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const getMonthDates = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, visitId: string) => {
    e.dataTransfer.setData('text/plain', visitId);
    setDraggedVisitId(visitId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const visitId = e.dataTransfer.getData('text/plain') || draggedVisitId;
    if (visitId) {
      await onRescheduleVisit(visitId, targetDateStr);
      setDraggedVisitId(null);
    }
  };

  // Data helpers
  const getSubscription = (subId: string) => subscriptions.find((s) => s.id === subId);
  const getCustomer = (customerId?: string, subId?: string) => {
    if (customerId) {
      const found = customers.find((c) => c.id === customerId);
      if (found) return found;
    }
    if (subId) {
      const sub = getSubscription(subId);
      if (sub?.customer_id) {
        return customers.find((c) => c.id === sub.customer_id);
      }
    }
    return undefined;
  };
  const getWorker = (workerId?: string | null, subId?: string) => {
    if (workerId) {
      const found = employees.find((e) => e.id === workerId);
      if (found) return found;
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
  const getPkg = (pkgId?: string) => packages.find((p) => p.id === pkgId);
  const getVeh = (vehId?: string | null) => vehicles.find((v) => v.id === vehId);

  // تحديد اللون والنمط الدلالي للزيارة: لم تتم بعد (أصفر) | تمت (أخضر) | ملغية (أحمر)
  const getVisitColorTheme = (status: VisitStatus) => {
    if (status === 'completed') {
      return {
        cardBg: 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300 hover:border-emerald-500 shadow-xs',
        badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-md text-[11px]',
        timeText: 'text-emerald-800',
        timeIcon: 'text-emerald-600',
        tagBg: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
        indicatorBg: 'bg-emerald-500',
        label: 'تمت الزيارة',
        dayRowBorder: 'border-r-4 border-r-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/50 border-emerald-100',
        clockBox: 'bg-emerald-100 text-emerald-800'
      };
    }

    if (status === 'cancelled') {
      return {
        cardBg: 'bg-rose-50 hover:bg-rose-100/70 border-rose-300 hover:border-rose-500 shadow-xs',
        badge: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-md text-[11px]',
        timeText: 'text-rose-800',
        timeIcon: 'text-rose-600',
        tagBg: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
        indicatorBg: 'bg-rose-500',
        label: 'ملغية',
        dayRowBorder: 'border-r-4 border-r-rose-500 bg-rose-50/20 hover:bg-rose-50/50 border-rose-100',
        clockBox: 'bg-rose-100 text-rose-800'
      };
    }

    // الزيارات التي لم تتم بعد (scheduled, in_progress, postponed) -> أصفر
    let label = 'مجدولة (لم تتم)';
    if (status === 'in_progress') label = 'قيد التنفيذ (لم تتم)';
    if (status === 'postponed') label = 'مؤجلة (لم تتم)';

    return {
      cardBg: 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 hover:border-amber-500 shadow-xs',
      badge: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md text-[11px]',
      timeText: 'text-amber-900',
      timeIcon: 'text-amber-600',
      tagBg: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
      indicatorBg: 'bg-amber-500',
      label,
      dayRowBorder: 'border-r-4 border-r-amber-500 bg-amber-50/20 hover:bg-amber-50/50 border-amber-100',
      clockBox: 'bg-amber-100 text-amber-900'
    };
  };

  const getStatusBadge = (status: VisitStatus) => {
    const theme = getVisitColorTheme(status);
    return <span className={theme.badge}>{theme.label}</span>;
  };

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">الرزنامة والجدولة التفاعلية</h2>
          <p className="text-sm text-slate-500 mt-1">
            جدول الزيارات الميدانية مع خاصية السحب والإفلات (Drag & Drop) لإعادة الجدولة والتأجيل
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Selector */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أسبوع (افتراضي)
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              يوم
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              شهر
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              نطاق مخصص
            </button>
          </div>

          {/* Date Navigation */}
          {viewMode !== 'custom' && (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg"
              >
                اليوم
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Tip */}
      <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-center gap-3 text-xs text-teal-900 font-medium">
        <Move className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          يمكنك سحب أي موعد زيارة وإفلاته في يوم آخر لتأجيله، ويتم تحديث الموعد تلقائياً.
        </span>
      </div>

      {/* Color Legend (دليل ألوان الزيارات) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span className="font-black text-slate-800">دليل ألوان الزيارات:</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-500 shadow-xs"></span>
            <span className="font-bold text-slate-700">لم تتم بعد (أصفر)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600 shadow-xs"></span>
            <span className="font-bold text-slate-700">تمت الزيارة (أخضر)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-600 shadow-xs"></span>
            <span className="font-bold text-slate-700">ملغية (أحمر)</span>
          </div>
        </div>
      </div>

      {/* Custom Range Selector */}
      {viewMode === 'custom' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span>من تاريخ:</span>
            <input
              type="date"
              value={customRangeStart}
              onChange={(e) => setCustomRangeStart(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>إلى تاريخ:</span>
            <input
              type="date"
              value={customRangeEnd}
              onChange={(e) => setCustomRangeEnd(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>
        </div>
      )}

      {/* View 1: Week View (Default) */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDates.map((dayDate) => {
            const dateStr = formatDateStr(dayDate);
            const isToday = dateStr === formatDateStr(new Date());
            const dayVisits = visits.filter((v) => v.scheduled_date === dateStr);
            const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(dayDate);

            return (
              <div
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={`bg-white rounded-2xl border ${
                  isToday ? 'border-teal-500 shadow-teal-500/10 shadow-md ring-2 ring-teal-500/20' : 'border-slate-200'
                } p-3.5 flex flex-col min-h-[480px] transition-all`}
              >
                {/* Column Day Header */}
                <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
                  <div>
                    <h3 className={`font-bold text-xs ${isToday ? 'text-teal-700 font-black' : 'text-slate-700'}`}>
                      {dayName}
                    </h3>
                    <p className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">{dateStr}</p>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      dayVisits.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {dayVisits.length}
                  </span>
                </div>

                {/* Visits List in this Day */}
                <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar">
                  {dayVisits.map((visit) => {
                    const cust = getCustomer(visit.customer_id, visit.subscription_id);
                    const worker = getWorker(visit.assigned_worker_id, visit.subscription_id);
                    const sub = getSubscription(visit.subscription_id);
                    const timeText = visit.scheduled_time_from || sub?.preferred_time_from || 'طوال اليوم';
                    const theme = getVisitColorTheme(visit.status);

                    return (
                      <div
                        key={visit.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, visit.id)}
                        onClick={() => setSelectedVisitModal(visit)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md ${theme.cardBg}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`font-mono font-bold text-[11px] flex items-center gap-1 ${theme.timeText}`}>
                            <Clock className={`w-3 h-3 ${theme.timeIcon}`} />
                            <span>{timeText}</span>
                          </span>
                          {getStatusBadge(visit.status)}
                        </div>

                        <div className="font-black text-slate-900 text-xs truncate">
                          {cust?.full_name || (cust as any)?.name || 'عميل'}
                        </div>

                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          العامل: <strong className="text-slate-800">{worker?.full_name || 'غير معين'}</strong>
                        </div>
                      </div>
                    );
                  })}
                  {dayVisits.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl text-slate-300 text-xs">
                      اسحب زيارة إلى هنا
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Day View */}
      {viewMode === 'day' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                زيارات يوم {formatDateStr(currentDate)}
              </h3>
              <p className="text-xs text-slate-500">
                {visits.filter((v) => v.scheduled_date === formatDateStr(currentDate)).length} زيارات مجدولة لهذا اليوم
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {visits
              .filter((v) => v.scheduled_date === formatDateStr(currentDate))
              .map((v) => {
                const cust = getCustomer(v.customer_id, v.subscription_id);
                const worker = getWorker(v.assigned_worker_id, v.subscription_id);
                const sub = getSubscription(v.subscription_id);
                const timeText = v.scheduled_time_from || sub?.preferred_time_from || 'طوال اليوم';
                const theme = getVisitColorTheme(v.status);
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVisitModal(v)}
                    className={`p-4 flex items-center justify-between cursor-pointer rounded-xl transition-all border mb-2 ${theme.dayRowBorder}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl font-bold flex flex-col items-center justify-center text-xs ${theme.clockBox}`}>
                        <Clock className={`w-4 h-4 mb-0.5 ${theme.timeIcon}`} />
                        <span className="text-[10px]">{timeText}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{cust?.full_name || (cust as any)?.name || 'عميل'}</h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          العامل: {worker?.full_name || 'غير معين'} | الهاتف: {cust?.phone || (cust as any)?.mobile || '-'}
                        </div>
                      </div>
                    </div>
                    <div>{getStatusBadge(v.status)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* View 3: Month View or Custom Range View */}
      {(viewMode === 'month' || viewMode === 'custom') && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {(viewMode === 'month' ? monthDates : visits.map((v) => new Date(v.scheduled_date))).map((dayDate, idx) => {
              const dateStr = formatDateStr(dayDate);
              const dayVisits = visits.filter((v) => v.scheduled_date === dateStr);

              return (
                <div
                  key={`${dateStr}_${idx}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-teal-400 transition-colors min-h-[120px] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">{dateStr.slice(8)}</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1.5 rounded">
                      {dayVisits.length}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {dayVisits.slice(0, 3).map((v) => {
                      const theme = getVisitColorTheme(v.status);
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVisitModal(v)}
                          className={`text-[10px] p-1 rounded border truncate cursor-pointer font-bold ${theme.tagBg}`}
                        >
                          {getCustomer(v.customer_id, v.subscription_id)?.full_name || (getCustomer(v.customer_id, v.subscription_id) as any)?.name || 'عميل'}
                        </div>
                      );
                    })}
                    {dayVisits.length > 3 && (
                      <div className="text-[9px] text-slate-400 font-bold">+{dayVisits.length - 3} المزيد</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visit Click Detail Modal */}
      {selectedVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            {(() => {
              const sub = getSubscription(selectedVisitModal.subscription_id);
              const cust = getCustomer(selectedVisitModal.customer_id, selectedVisitModal.subscription_id);
              const worker = getWorker(
                selectedVisitModal.assigned_worker_id || (selectedVisitModal as any).worker_id,
                selectedVisitModal.subscription_id
              );
              const area = getArea(sub?.area_id || cust?.area_id);
              const pkg = getPkg(sub?.package_id);
              const veh = getVeh(sub?.vehicle_id);

              const timeDisplay =
                selectedVisitModal.scheduled_time_from || sub?.preferred_time_from
                  ? `${selectedVisitModal.scheduled_time_from || sub?.preferred_time_from || ''} - ${
                      selectedVisitModal.scheduled_time_to || sub?.preferred_time_to || ''
                    }`
                  : 'طوال اليوم';

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">تفاصيل الزيارة المجدولة</h3>
                        <p className="text-xs text-slate-500">
                          تاريخ: {selectedVisitModal.scheduled_date} ({timeDisplay})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedVisitModal(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1.5"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">اسم العميل:</span>
                        <strong className="text-slate-900 font-black text-sm">
                          {cust?.full_name || (cust as any)?.name || 'غير محدد'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">رقم الموبايل:</span>
                        <strong className="text-teal-700 font-mono text-sm">
                          {cust?.phone || (cust as any)?.mobile || 'غير مسجل'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">العنوان والكمبوند:</span>
                        <strong className="text-slate-900">
                          {area?.name || 'المنطقة غير محددة'}
                          {cust?.building_number ? ` - عمارة ${cust.building_number}` : ''}
                          {cust?.block_number || (cust as any)?.block
                            ? ` (مربع ${cust?.block_number || (cust as any)?.block})`
                            : ''}
                        </strong>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">الباقة المشترك بها:</span>
                        <strong className="text-slate-900">{pkg?.name || 'باقة غسيل'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">نوع خدمة الزيارة:</span>
                        <strong className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 font-bold">
                          {selectedVisitModal.service_type || 'غسيل'}
                        </strong>
                      </div>
                      {selectedVisitModal.day_of_week && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">اليوم المحدد:</span>
                          <strong className="text-slate-800 font-bold">
                            {selectedVisitModal.day_of_week}
                          </strong>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">المركبة / الخدمة:</span>
                        <strong className="text-slate-900">
                          {veh
                            ? `${veh.vehicle_type || (veh as any).type} (${veh.plate_number || (veh as any).license_plate})`
                            : 'غسيل عمارة'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">العامل المسؤول:</span>
                        <strong className="text-teal-800 font-bold">{worker?.full_name || 'غير معين'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">التوقيت المحدد:</span>
                        <strong className="text-slate-800 font-mono">{timeDisplay}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">الحالة الحالية:</span>
                        <span>{getStatusBadge(selectedVisitModal.status)}</span>
                      </div>
                    </div>

                    {/* Actions for Visit */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {selectedVisitModal.status !== 'completed' && (
                        <button
                          onClick={async () => {
                            await onUpdateVisitStatus(selectedVisitModal.id, 'completed');
                            setSelectedVisitModal(null);
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تسجيل كمكتملة (أخضر)</span>
                        </button>
                      )}

                      {selectedVisitModal.status !== 'cancelled' && (
                        <button
                          onClick={async () => {
                            if (window.confirm('هل أنت متأكد من رغبتك في إلغاء هذه الزيارة؟')) {
                              await onUpdateVisitStatus(selectedVisitModal.id, 'cancelled');
                              setSelectedVisitModal(null);
                            }
                          }}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold border border-rose-200 transition-colors"
                        >
                          إلغاء الزيارة (أحمر)
                        </button>
                      )}

                      {selectedVisitModal.status !== 'scheduled' && (
                        <button
                          onClick={async () => {
                            await onUpdateVisitStatus(selectedVisitModal.id, 'scheduled');
                            setSelectedVisitModal(null);
                          }}
                          className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-bold border border-amber-200 transition-colors"
                        >
                          إعادة للمجدولة (أصفر)
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          const newDate = prompt(
                            'أدخل التاريخ الجديد لنقل الزيارة (YYYY-MM-DD):',
                            selectedVisitModal.scheduled_date
                          );
                          if (newDate) {
                            await onRescheduleVisit(selectedVisitModal.id, newDate);
                            setSelectedVisitModal(null);
                          }
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-200 transition-colors"
                      >
                        تأجيل ونقل التاريخ
                      </button>
                    </div>

                    {/* WhatsApp Notification for Completed Visits */}
                    {selectedVisitModal.status === 'completed' && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {whatsAppNotice && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold">
                            {whatsAppNotice}
                          </div>
                        )}
                        <button
                          onClick={() => handleSendWhatsApp(selectedVisitModal.id)}
                          disabled={isSendingWhatsApp}
                          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-xs text-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingWhatsApp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري إرسال إشعار الواتساب...</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              <span>إرسال / إعادة إرسال تفاصيل الغسلة ورابط التقييم عبر واتساب</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
