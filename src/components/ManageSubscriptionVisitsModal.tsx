import React, { useState, useMemo } from 'react';
import {
  Subscription,
  Visit,
  Customer,
  Employee,
  Package,
  CoverageArea,
  Vehicle,
  VisitStatus
} from '../types/database';
import {
  X,
  Calendar,
  User,
  Plus,
  CheckCircle2,
  Clock,
  Car,
  Building,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Check,
  RefreshCw,
  FileText
} from 'lucide-react';

interface ManageSubscriptionVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  visits: Visit[];
  customers: Customer[];
  employees: Employee[];
  packages: Package[];
  coverageAreas: CoverageArea[];
  vehicles: Vehicle[];
  onUpdateVisit: (visitId: string, updates: Partial<Visit>) => Promise<void>;
  onCreateVisit: (visit: Omit<Visit, 'id'> & { id?: string }) => Promise<Visit>;
  onDeleteVisit: (visitId: string) => Promise<void>;
}

const COMMON_SERVICES = [
  'غسيل',
  'فوطة 1',
  'فوطة 2',
  'تنظيف داخلي',
  'تلميع',
  'غسيل وتلميع',
  'زيارة إضافية',
  'زيارة تعويضية',
  'نظافة مداخل',
  'غسيل واجهات'
];

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const getDayNameFromDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return ARABIC_DAYS[d.getDay()] || '';
  } catch {
    return '';
  }
};

export const ManageSubscriptionVisitsModal: React.FC<ManageSubscriptionVisitsModalProps> = ({
  isOpen,
  onClose,
  subscription,
  visits,
  customers,
  employees,
  packages,
  coverageAreas,
  vehicles,
  onUpdateVisit,
  onCreateVisit,
  onDeleteVisit
}) => {
  if (!isOpen || !subscription) return null;

  const customer = customers.find((c) => c.id === subscription.customer_id);
  const pkg = packages.find((p) => p.id === subscription.package_id);
  const area = coverageAreas.find((a) => a.id === subscription.area_id);
  const vehicle = vehicles.find((v) => v.id === subscription.vehicle_id);

  // Filter visits belonging to this subscription
  const subVisits = useMemo(() => {
    return visits
      .filter((v) => v.subscription_id === subscription.id)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [visits, subscription.id]);

  // Status Filter State
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Add Extra Visit Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newVisitService, setNewVisitService] = useState('غسيل');
  const [newVisitWorkerId, setNewVisitWorkerId] = useState(
    subscription.assigned_worker_id || ''
  );
  const [newVisitNotes, setNewVisitNotes] = useState('زيارة إضافية للعميل');
  const [isAddingVisit, setIsAddingVisit] = useState(false);

  // Per-visit Editing Local State map: { [visitId]: { scheduled_date, service_type, assigned_worker_id, notes, status, isSaving } }
  const [editingMap, setEditingMap] = useState<
    Record<
      string,
      {
        scheduled_date: string;
        day_of_week: string;
        service_type: string;
        assigned_worker_id: string;
        notes: string;
        status: VisitStatus;
        isSaving?: boolean;
        saveSuccess?: boolean;
      }
    >
  >({});

  // Initialize editing state for a visit if not yet initialized
  const getVisitState = (visit: Visit) => {
    if (editingMap[visit.id]) {
      return editingMap[visit.id];
    }
    return {
      scheduled_date: visit.scheduled_date,
      day_of_week: visit.day_of_week || getDayNameFromDate(visit.scheduled_date),
      service_type: visit.service_type || 'غسيل',
      assigned_worker_id: visit.assigned_worker_id || '',
      notes: visit.notes || '',
      status: visit.status,
      isSaving: false,
      saveSuccess: false
    };
  };

  const updateVisitLocalState = (visitId: string, updates: Partial<ReturnType<typeof getVisitState>>) => {
    setEditingMap((prev) => {
      const current = prev[visitId] || getVisitState(subVisits.find((v) => v.id === visitId)!);
      return {
        ...prev,
        [visitId]: {
          ...current,
          ...updates
        }
      };
    });
  };

  // Save changes to a specific visit
  const handleSaveVisit = async (visit: Visit) => {
    const state = editingMap[visit.id] || getVisitState(visit);
    try {
      updateVisitLocalState(visit.id, { isSaving: true, saveSuccess: false });
      await onUpdateVisit(visit.id, {
        scheduled_date: state.scheduled_date,
        day_of_week: state.day_of_week,
        service_type: state.service_type,
        assigned_worker_id: state.assigned_worker_id || null,
        notes: state.notes,
        status: state.status
      });
      updateVisitLocalState(visit.id, { isSaving: false, saveSuccess: true });
      setTimeout(() => {
        updateVisitLocalState(visit.id, { saveSuccess: false });
      }, 2500);
    } catch (err: any) {
      updateVisitLocalState(visit.id, { isSaving: false });
      alert('فشل حفظ تعديل الزيارة: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  // Add extra visit handler
  const handleCreateExtraVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitDate) {
      alert('يرجى تحديد تاريخ الزيارة الإضافية');
      return;
    }
    try {
      setIsAddingVisit(true);
      const dayName = getDayNameFromDate(newVisitDate);
      await onCreateVisit({
        subscription_id: subscription.id,
        customer_id: subscription.customer_id,
        scheduled_date: newVisitDate,
        day_of_week: dayName,
        service_type: newVisitService,
        assigned_worker_id: newVisitWorkerId || null,
        notes: newVisitNotes,
        status: 'scheduled'
      });
      setShowAddForm(false);
      setNewVisitNotes('زيارة إضافية للعميل');
      alert('تمت إضافة الزيارة الإضافية بنجاح.');
    } catch (err: any) {
      alert('فشل إضافة الزيارة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsAddingVisit(false);
    }
  };

  // Delete visit handler
  const handleDeleteVisit = async (visitId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموعد نهائياً من سجل الاشتراك؟')) {
      try {
        await onDeleteVisit(visitId);
      } catch (err: any) {
        alert('فشل حذف الزيارة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  // Filtered visits
  const displayedVisits = subVisits.filter((v) => {
    if (filterStatus === 'all') return true;
    return v.status === filterStatus;
  });

  const completedCount = subVisits.filter((v) => v.status === 'completed').length;
  const scheduledCount = subVisits.filter((v) => v.status === 'scheduled').length;
  const otherCount = subVisits.length - completedCount - scheduledCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-cairo">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-scaleUp border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Calendar className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">جدول زيارات الاشتراك</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                  {subVisits.length} زيارات
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                العميل: {customer?.full_name || 'غير معروف'} ({customer?.phone || '-'}) | باقة: {pkg?.name || 'باقة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Stats Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>فترة الاشتراك:</span>
              <span className="font-bold text-slate-800 font-mono">
                {subscription.start_date} إلى {subscription.end_date}
              </span>
            </div>

            {vehicle ? (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Car className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-slate-800">{vehicle.vehicle_type} ({vehicle.plate_number})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-teal-700">
                <Building className="w-4 h-4 text-teal-600" />
                <span className="font-bold">خدمات ونظافة العمارة</span>
              </div>
            )}
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>مكتملة: {completedCount}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>مجدولة: {scheduledCount}</span>
            </span>
            {otherCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">
                أخرى/مؤجلة: {otherCount}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'كافة الزيارات' },
              { id: 'scheduled', label: `المجدولة (${scheduledCount})` },
              { id: 'completed', label: `المكتملة (${completedCount})` },
              { id: 'postponed', label: 'المؤجلة' },
              { id: 'cancelled', label: 'الملغية' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Add Extra Visit Trigger Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة زيارة إضافية للعميل</span>
          </button>
        </div>

        {/* Add Extra Visit Form (Collapsible Card) */}
        {showAddForm && (
          <div className="p-4 sm:px-6 bg-emerald-50/70 border-b border-emerald-200 animate-slideDown shrink-0">
            <form onSubmit={handleCreateExtraVisit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>بيانات الزيارة الإضافية الجديدة</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    تاريخ الزيارة *
                  </label>
                  <input
                    type="date"
                    value={newVisitDate}
                    onChange={(e) => setNewVisitDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    اليوم: {getDayNameFromDate(newVisitDate)}
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    نوع الخدمة *
                  </label>
                  <input
                    type="text"
                    list="services-datalist-add"
                    value={newVisitService}
                    onChange={(e) => setNewVisitService(e.target.value)}
                    placeholder="غسيل / فوطة / تلميع..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <datalist id="services-datalist-add">
                    {COMMON_SERVICES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Assigned Worker */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    العامل المخصص
                  </label>
                  <select
                    value={newVisitWorkerId}
                    onChange={(e) => setNewVisitWorkerId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- بدون تعيين --</option>
                    {employees
                      .filter((emp) => emp.role === 'worker')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Notes & Submit */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    الملاحظة
                  </label>
                  <input
                    type="text"
                    value={newVisitNotes}
                    onChange={(e) => setNewVisitNotes(e.target.value)}
                    placeholder="ملاحظات الزيارة الإضافية..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick suggestions pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-emerald-800 font-bold">اقتراحات سريعة للخدمة:</span>
                {COMMON_SERVICES.slice(0, 6).map((serviceName) => (
                  <button
                    key={serviceName}
                    type="button"
                    onClick={() => setNewVisitService(serviceName)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors cursor-pointer ${
                      newVisitService === serviceName
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {serviceName}
                  </button>
                ))}

                <button
                  type="submit"
                  disabled={isAddingVisit}
                  className="mr-auto px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingVisit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>حفظ وإضافة الزيارة</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Visits List Scrollable Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
          {displayedVisits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm">لا توجد زيارات مطابقة للتصفية المحددة</p>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك الضغط على زر "إضافة زيارة إضافية للعميل" لإنشاء مواعيد جديدة.
              </p>
            </div>
          ) : (
            displayedVisits.map((visit, index) => {
              const visitState = editingMap[visit.id] || getVisitState(visit);
              const assignedEmp = employees.find((e) => e.id === visitState.assigned_worker_id);

              return (
                <div
                  key={visit.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-teal-300 bg-white hover:shadow-sm transition-all space-y-3"
                >
                  {/* Top Bar of Visit Item: Index, Day Badge, Status & Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-black text-xs flex items-center justify-center font-mono border border-teal-200">
                        #{index + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800">
                        {visitState.day_of_week || getDayNameFromDate(visitState.scheduled_date)}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {visitState.scheduled_date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Dropdown */}
                      <select
                        value={visitState.status}
                        onChange={(e) =>
                          updateVisitLocalState(visit.id, {
                            status: e.target.value as VisitStatus
                          })
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                          visitState.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : visitState.status === 'scheduled'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : visitState.status === 'postponed'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="scheduled">مجدولة</option>
                        <option value="completed">مكتملة</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="postponed">مؤجلة</option>
                        <option value="cancelled">ملغية</option>
                      </select>

                      {/* Delete Visit Button */}
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا الموعد نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Form Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* 1. Edit Date (col-span-3) */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        تعديل التاريخ:
                      </label>
                      <input
                        type="date"
                        value={visitState.scheduled_date}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newDay = getDayNameFromDate(val);
                          updateVisitLocalState(visit.id, {
                            scheduled_date: val,
                            day_of_week: newDay
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* 2. Change Service Type (col-span-3) */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        نوع الخدمة (فوطة / غسيل...):
                      </label>
                      <input
                        type="text"
                        list={`service-types-${visit.id}`}
                        value={visitState.service_type}
                        onChange={(e) =>
                          updateVisitLocalState(visit.id, {
                            service_type: e.target.value
                          })
                        }
                        placeholder="غسيل / فوطة 1..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-teal-800 focus:ring-2 focus:ring-teal-500"
                      />
                      <datalist id={`service-types-${visit.id}`}>
                        {COMMON_SERVICES.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    {/* 3. Change Assigned Worker (col-span-3) */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        العامل المخصص:
                      </label>
                      <select
                        value={visitState.assigned_worker_id}
                        onChange={(e) =>
                          updateVisitLocalState(visit.id, {
                            assigned_worker_id: e.target.value
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">-- بدون تعيين --</option>
                        {employees
                          .filter((emp) => emp.role === 'worker')
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 4. Save Button (col-span-3) */}
                    <div className="sm:col-span-3 flex justify-end pt-5">
                      <button
                        onClick={() => handleSaveVisit(visit)}
                        disabled={visitState.isSaving}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          visitState.saveSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                        }`}
                      >
                        {visitState.isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : visitState.saveSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم الحفظ بنجاح</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>حفظ التعديل</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Service Type Chips for Rapid Switching */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-bold">تغيير سريع للنوع:</span>
                    {['غسيل', 'فوطة 1', 'فوطة 2', 'تنظيف داخلي', 'تلميع'].map((quickType) => (
                      <button
                        key={quickType}
                        type="button"
                        onClick={() =>
                          updateVisitLocalState(visit.id, {
                            service_type: quickType
                          })
                        }
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors cursor-pointer ${
                          visitState.service_type === quickType
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {quickType}
                      </button>
                    ))}
                  </div>

                  {/* Notes Field */}
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={visitState.notes}
                        onChange={(e) =>
                          updateVisitLocalState(visit.id, {
                            notes: e.target.value
                          })
                        }
                        placeholder="تسجيل ملاحظة خاصة على هذه الزيارة (مثلاً: رغبة العميل في تقديم الموعد، حالة السيارة...)"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            * التعديلات تسري فوراً في النظام والتقويم وتطبيق العامل وتطبيق العميل.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
