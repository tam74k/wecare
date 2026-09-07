import React, { useState, useEffect } from 'react';
import {
  User,
  LogOut,
  Calendar,
  Clock,
  Car,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  X,
  ExternalLink,
  MessageCircle,
  Star,
  Sparkles,
  CalendarDays,
  History,
  Check,
  Loader2,
  ImageIcon
} from 'lucide-react';
import {
  AuthUser,
  Settings,
  Visit,
  Customer,
  Vehicle,
  CoverageArea,
  PostponementReason,
  Subscription,
  Package as PackageType
} from '../types/database';
import { supabase } from '../lib/supabase';
import * as api from '../services/api';

interface WorkerAppViewProps {
  currentUser: AuthUser;
  settings: Settings;
  visits: Visit[];
  customers: Customer[];
  vehicles: Vehicle[];
  subscriptions?: Subscription[];
  coverageAreas: CoverageArea[];
  packages: PackageType[];
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
}

export const WorkerAppView: React.FC<WorkerAppViewProps> = ({
  currentUser,
  settings,
  visits,
  customers,
  vehicles,
  coverageAreas,
  packages,
  onLogout,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Postponement form state
  const [postponementReasons, setPostponementReasons] = useState<PostponementReason[]>([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [workerNote, setWorkerNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTimeFrom, setNewTimeFrom] = useState('');
  const [newTimeTo, setNewTimeTo] = useState('');
  const [postponeError, setPostponeError] = useState<string | null>(null);

  // Image lightbox
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const workerId = currentUser.employee_id || currentUser.id;

  // Load postponement reasons
  useEffect(() => {
    api.getPostponementReasons().then((reasons) => {
      const active = reasons.filter((r) => r.is_active);
      setPostponementReasons(active);
      if (active.length > 0) setSelectedReason(active[0].reason);
    });
  }, []);

  // Filter visits for current worker
  const myVisits = visits.filter((v) => v.assigned_worker_id === workerId);

  // 1. Today's Scheduled Visits (not completed or cancelled)
  const todayVisits = myVisits
    .filter((v) => v.scheduled_date === todayStr && v.status !== 'completed' && v.status !== 'cancelled')
    .sort((a, b) => (a.scheduled_time_from || '').localeCompare(b.scheduled_time_from || ''));

  // 2. Upcoming Visits
  const upcomingVisits = myVisits
    .filter((v) => v.scheduled_date > todayStr && v.status !== 'completed' && v.status !== 'cancelled')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  // 3. Past Visits (completed or past dates)
  const pastVisits = myVisits
    .filter((v) => v.status === 'completed' || v.scheduled_date < todayStr)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  // Find associated customer, vehicle, and area for a visit
  const getVisitMeta = (visit: Visit) => {
    const customer = customers.find((c) => c.id === visit.customer_id);
    const vehicle = vehicles.find((v) => v.customer_id === visit.customer_id);
    const area = coverageAreas.find((a) => a.id === customer?.area_id);
    return { customer, vehicle, area };
  };

  // Complete visit handler
  const handleExecuteVisit = async () => {
    if (!selectedVisit) return;
    try {
      setIsExecuting(true);
      await api.completeVisit(selectedVisit.id, 'تم تنفيذ الغسيل بنجاح بواسطة فني الخدمة');
      await onRefreshData();
      setActionSuccessMsg('✓ تم تأكيد تنفيذ الزيارة بنجاح وتمت إزالتها من جدول اليوم');
      setSelectedVisit(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('فشل تنفيذ الزيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsExecuting(false);
    }
  };

  // Open postpone modal
  const handleOpenPostponeModal = () => {
    setPostponeError(null);
    setWorkerNote('');
    // Default new date to tomorrow
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setNewDate(tmrw.toISOString().split('T')[0]);
    setNewTimeFrom(selectedVisit?.scheduled_time_from || '');
    setNewTimeTo(selectedVisit?.scheduled_time_to || '');
    setShowPostponeModal(true);
  };

  // Postpone visit submit handler
  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    if (!selectedReason.trim()) {
      setPostponeError('يرجى اختيار سبب التأجيل من القائمة المعتمدة');
      return;
    }
    if (!newDate) {
      setPostponeError('يرجى تحديد التاريخ الجديد للزيارة');
      return;
    }

    try {
      setIsPostponing(true);
      await api.postponeVisit(
        selectedVisit.id,
        selectedReason,
        workerNote,
        newDate,
        newTimeFrom || undefined,
        newTimeTo || undefined
      );
      await onRefreshData();
      setShowPostponeModal(false);
      setSelectedVisit(null);
      setActionSuccessMsg(`✓ تم تأجيل الزيارة بنجاح ونقل موعدها إلى ${newDate}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setPostponeError('فشل تأجيل الزيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsPostponing(false);
    }
  };

  const todayDateFormatted = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center selection:bg-teal-500 selection:text-white" dir="rtl">
      {/* Mobile-style Frame Container */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl flex flex-col relative border-x border-slate-200">
        {/* Top App Header with Worker Info */}
        <header className="bg-gradient-to-b from-teal-900 via-slate-900 to-slate-900 text-white p-4 pt-5 pb-4 sticky top-0 z-30 shadow-lg border-b border-teal-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white shadow-md font-black ring-2 ring-teal-400/30">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] text-teal-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>فني غسيل معتمد</span>
                </div>
                <h1 className="text-base font-black tracking-tight text-white leading-tight">
                  مرحباً، {currentUser.full_name}
                </h1>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>

          {/* Date & Quick Meta */}
          <div className="mt-3 flex items-center justify-between text-xs text-teal-200/90 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
            <span className="flex items-center gap-1.5 font-bold">
              <Calendar className="w-3.5 h-3.5 text-teal-300" />
              <span>{todayDateFormatted}</span>
            </span>
            <span className="text-[11px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded font-bold">
              {todayVisits.length} زيارات متبقية اليوم
            </span>
          </div>
        </header>

        {/* Global Action Toast Notification */}
        {actionSuccessMsg && (
          <div className="m-3 p-3.5 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 animate-fadeIn z-20">
            <Check className="w-4 h-4 shrink-0 bg-white text-emerald-600 rounded-full p-0.5" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Mobile Navigation Tabs */}
        <div className="bg-white p-2 border-b border-slate-200 grid grid-cols-3 gap-1.5 sticky top-[108px] z-20 shadow-xs">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'today'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>زيارات اليوم</span>
            </div>
            {todayVisits.length > 0 && (
              <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                activeTab === 'today' ? 'bg-amber-400 text-slate-900' : 'bg-teal-100 text-teal-800'
              }`}>
                {todayVisits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>الزيارات القادمة</span>
            </div>
            <span className={`text-[10px] px-1.5 rounded-full font-bold ${
              activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {upcomingVisits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`py-2 px-1 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'past'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              <span>الزيارات السابقة</span>
            </div>
            <span className={`text-[10px] px-1.5 rounded-full font-bold ${
              activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {pastVisits.length}
            </span>
          </button>
        </div>

        {/* Tab Content Section */}
        <main className="flex-1 p-3.5 space-y-3 overflow-y-auto">
          {/* ====================== TAB 1: TODAY'S VISITS ====================== */}
          {activeTab === 'today' && (
            <div className="space-y-3 animate-fadeIn">
              {todayVisits.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm mt-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">ممتاز! لا توجد زيارات متبقية اليوم</h3>
                  <p className="text-xs text-slate-500 mt-1">لقد قمت بإتمام أو تأجيل كافة زيارات جدول اليوم بنجاح</p>
                </div>
              ) : (
                todayVisits.map((vis, idx) => {
                  const { customer, vehicle, area } = getVisitMeta(vis);
                  return (
                    <div
                      key={vis.id}
                      onClick={() => setSelectedVisit(vis)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-teal-400 transition-all cursor-pointer active:scale-[0.99] relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-black border border-teal-200 shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 leading-tight">
                              {customer?.full_name || 'عميل'}
                            </h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              <span>{area?.name || 'المنطقة'}</span>
                              {customer?.building_number && <span>• عمارة {customer.building_number}</span>}
                            </p>
                          </div>
                        </div>

                        {vis.scheduled_time_from && (
                          <span className="text-[11px] font-bold bg-sky-50 text-sky-800 px-2 py-0.5 rounded-lg border border-sky-200 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-sky-600" />
                            <span>{vis.scheduled_time_from}</span>
                          </span>
                        )}
                      </div>

                      {/* Car Details Strip */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-teal-600" />
                          <span className="font-bold text-slate-800">{vehicle?.vehicle_type || 'سيارة'}</span>
                          {vehicle?.color && <span className="text-slate-500 font-medium">({vehicle.color})</span>}
                        </div>
                        <span className="font-black text-teal-800 font-mono tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                          {vehicle?.plate_number || '-'}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-teal-600 font-bold">
                        <span>اضغط لعرض التفاصيل والتنفيذ</span>
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ====================== TAB 2: UPCOMING VISITS ====================== */}
          {activeTab === 'upcoming' && (
            <div className="space-y-3 animate-fadeIn">
              {upcomingVisits.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm mt-6">
                  <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">لا توجد زيارات مجدولة في التواريخ القادمة</h3>
                </div>
              ) : (
                upcomingVisits.map((vis) => {
                  const { customer, vehicle, area } = getVisitMeta(vis);
                  return (
                    <div
                      key={vis.id}
                      onClick={() => setSelectedVisit(vis)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-teal-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block mb-1">
                            {vis.scheduled_date}
                          </span>
                          <h4 className="text-xs font-black text-slate-800">{customer?.full_name}</h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-teal-600" />
                            <span>{area?.name}</span>
                          </p>
                        </div>

                        <div className="text-left">
                          <span className="font-bold text-xs text-teal-800 block">{vehicle?.plate_number}</span>
                          <span className="text-[11px] text-slate-500">{vehicle?.vehicle_type}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ====================== TAB 3: PAST VISITS & RATINGS (READ-ONLY) ====================== */}
          {activeTab === 'past' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900 font-bold flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-600 shrink-0" />
                <span>سجل الزيارات السابقة وتقييمات العملاء (عرض للقراءة فقط)</span>
              </div>

              {pastVisits.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm mt-6">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">لا توجد زيارات سابقة مسجلة حتى الآن</h3>
                </div>
              ) : (
                pastVisits.map((vis) => {
                  const { customer, vehicle } = getVisitMeta(vis);
                  return (
                    <div
                      key={vis.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-slate-800">{customer?.full_name}</span>
                            {vis.status === 'completed' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                تم التنفيذ ✓
                              </span>
                            )}
                            {vis.status === 'postponed' && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                مؤجلة
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                            تاريخ الزيارة: {vis.scheduled_date}
                          </span>
                        </div>

                        <div className="text-left text-xs font-bold text-teal-800">
                          {vehicle?.plate_number}
                        </div>
                      </div>

                      {/* Customer Rating Display if present */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500 font-bold ml-1">تقييم العميل:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                (vis.rating || 5) >= star
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-amber-600">
                          {vis.rating ? `${vis.rating} / 5` : 'ممتاز (5/5)'}
                        </span>
                      </div>

                      {vis.rating_comment && (
                        <div className="p-2 bg-amber-50/50 rounded-lg text-[11px] text-slate-700 italic border border-amber-100">
                          "{vis.rating_comment}"
                        </div>
                      )}

                      {vis.notes && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {vis.notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>

        {/* ====================== VISIT FULL DETAILS MODAL ====================== */}
        {selectedVisit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-slate-200 animate-slideUp">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Car className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">تفاصيل زيارة الغسيل الكاملة</h3>
                </div>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const { customer, vehicle, area } = getVisitMeta(selectedVisit);
                const isTodayVisit = selectedVisit.scheduled_date === todayStr && selectedVisit.status !== 'completed';

                return (
                  <div className="space-y-4 text-xs">
                    {/* Customer Info Card */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">بيانات العميل:</span>
                        <span className="font-black text-slate-800 text-sm">{customer?.full_name}</span>
                      </div>

                      {/* Direct Phone & WhatsApp Actions */}
                      {customer?.phone && (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>اتصال هاتفياً</span>
                          </a>

                          <a
                            href={`https://wa.me/${(settings.dial_code || '20') + customer.phone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Address & GPS Card */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block">مكان وموقع الخدمة:</span>
                      <div className="space-y-1 text-slate-800 font-medium">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="font-bold">{area?.name}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>عمارة {customer?.building_number} {customer?.block_number ? `- مجموعة ${customer.block_number}` : ''}</span>
                        </p>
                        {customer?.detailed_address && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            العنوان: {customer.detailed_address}
                          </p>
                        )}
                      </div>

                      {customer?.location_url && (
                        <a
                          href={customer.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح موقع العميل في خرائط Google</span>
                        </a>
                      )}
                    </div>

                    {/* Vehicle Details & Image Card */}
                    <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2.5">
                      <span className="text-[11px] font-bold text-teal-800 block">بيانات السيارة المطلوب غسيلها:</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-teal-100">
                          <span className="text-slate-400 text-[10px] block">نوع السيارة:</span>
                          <span className="font-bold text-slate-800">{vehicle?.vehicle_type || 'سيارة'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-teal-100">
                          <span className="text-slate-400 text-[10px] block">اللون:</span>
                          <span className="font-bold text-slate-800">{vehicle?.color || 'غير محدد'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-teal-100 col-span-2 flex items-center justify-between">
                          <span className="text-slate-400 text-[10px]">رقم اللوحة:</span>
                          <span className="font-black text-sm text-teal-800 font-mono">{vehicle?.plate_number}</span>
                        </div>
                      </div>

                      {/* Vehicle Image with zoom modal */}
                      {vehicle?.vehicle_image_url && (
                        <div className="mt-2">
                          <span className="text-[10px] text-slate-500 font-bold block mb-1">صورة السيارة المسجلة:</span>
                          <img
                            src={vehicle.vehicle_image_url}
                            alt="صورة السيارة"
                            onClick={() => setExpandedImage(vehicle.vehicle_image_url!)}
                            className="w-full h-36 object-cover rounded-xl border border-teal-200 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Today's Scheduled Visits */}
                    {isTodayVisit && (
                      <div className="pt-2 space-y-2">
                        {/* 1. Complete Button */}
                        <button
                          onClick={handleExecuteVisit}
                          disabled={isExecuting}
                          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري تأكيد التنفيذ...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>✓ تم تنفيذ الزيارة (إخفاء من جدول اليوم)</span>
                            </>
                          )}
                        </button>

                        {/* 2. Postpone Button */}
                        <button
                          onClick={handleOpenPostponeModal}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>تأجيل الزيارة لموعد آخر</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ====================== POSTPONE MODAL ====================== */}
        {showPostponeModal && selectedVisit && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <form
              onSubmit={handlePostponeSubmit}
              className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-3.5 shadow-2xl border border-slate-200 animate-slideUp text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-slate-800">تأجيل موعد زيارة الغسيل</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostponeModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {postponeError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold border border-rose-200">
                  {postponeError}
                </div>
              )}

              {/* Mandatory Reason Dropdown */}
              <div>
                <label className="block font-black text-slate-700 mb-1">
                  سبب التأجيل (إلزامي) *
                </label>
                <select
                  required
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {postponementReasons.map((r) => (
                    <option key={r.id} value={r.reason}>
                      {r.reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timestamped Worker Note */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">ملاحظة العامل الإضافية</label>
                  <span className="text-[10px] text-teal-600 font-medium">تسجل بالتاريخ والوقت تلقائياً</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="اكتب توضيح إضافي (مثال: تم الاتصال بالعميل وأفاد بأنه خارج الكمبوند)..."
                  value={workerNote}
                  onChange={(e) => setWorkerNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* New Date & Time Selection */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
                <span className="font-black text-amber-900 block text-[11px]">تحديد الموعد الجديد للزيارة:</span>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">اليوم الجديد *</label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">الوقت من</label>
                    <input
                      type="time"
                      value={newTimeFrom}
                      onChange={(e) => setNewTimeFrom(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">الوقت إلى</label>
                    <input
                      type="time"
                      value={newTimeTo}
                      onChange={(e) => setNewTimeTo(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isPostponing}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {isPostponing ? 'جاري التأجيل...' : 'تأكيد التأجيل ونقل الموعد'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPostponeModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Image Zoom Lightbox */}
        {expandedImage && (
          <div
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
          >
            <div className="relative max-w-lg w-full">
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={expandedImage} alt="صورة السيارة مكبرة" className="w-full h-auto rounded-2xl shadow-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
