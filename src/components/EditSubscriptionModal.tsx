import React, { useState, useEffect } from 'react';
import {
  Subscription,
  Customer,
  Vehicle,
  Package,
  CoverageArea,
  Employee,
  Settings,
  SubscriptionStatus,
  PaymentStatus
} from '../types/database';
import {
  X,
  Save,
  Calendar,
  Clock,
  User,
  Car,
  Building,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Edit3
} from 'lucide-react';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  coverageAreas: CoverageArea[];
  employees: Employee[];
  settings: Settings;
  onUpdateSubscription: (
    id: string,
    updates: Partial<Subscription>,
    regenerateVisits?: boolean
  ) => Promise<void>;
}

const ARABIC_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const EditSubscriptionModal: React.FC<EditSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  customers,
  vehicles,
  packages,
  coverageAreas,
  employees,
  settings,
  onUpdateSubscription
}) => {
  if (!isOpen || !subscription) return null;

  const [packageId, setPackageId] = useState(subscription.package_id || '');
  const [areaId, setAreaId] = useState(subscription.area_id || '');
  const [workerId, setWorkerId] = useState(subscription.assigned_worker_id || '');
  const [vehicleId, setVehicleId] = useState(subscription.vehicle_id || '');
  const [startDate, setStartDate] = useState(subscription.start_date || '');
  const [endDate, setEndDate] = useState(subscription.end_date || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    subscription.selected_days && subscription.selected_days.length > 0
      ? subscription.selected_days
      : subscription.preferred_day_of_week
      ? subscription.preferred_day_of_week.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [preferredTimeFrom, setPreferredTimeFrom] = useState(subscription.preferred_time_from || '');
  const [preferredTimeTo, setPreferredTimeTo] = useState(subscription.preferred_time_to || '');
  const [totalPrice, setTotalPrice] = useState<number>(subscription.total_price || 0);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    subscription.payment_status || 'unpaid'
  );
  const [notes, setNotes] = useState(subscription.notes || '');
  const [regenerateVisits, setRegenerateVisits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when subscription prop changes
  useEffect(() => {
    if (subscription) {
      setPackageId(subscription.package_id || '');
      setAreaId(subscription.area_id || '');
      setWorkerId(subscription.assigned_worker_id || '');
      setVehicleId(subscription.vehicle_id || '');
      setStartDate(subscription.start_date || '');
      setEndDate(subscription.end_date || '');
      setSelectedDays(
        subscription.selected_days && subscription.selected_days.length > 0
          ? subscription.selected_days
          : subscription.preferred_day_of_week
          ? subscription.preferred_day_of_week.split(',').map((s) => s.trim()).filter(Boolean)
          : []
      );
      setPreferredTimeFrom(subscription.preferred_time_from || '');
      setPreferredTimeTo(subscription.preferred_time_to || '');
      setTotalPrice(subscription.total_price || 0);
      setStatus(subscription.status);
      setPaymentStatus(subscription.payment_status || 'unpaid');
      setNotes(subscription.notes || '');
      setRegenerateVisits(false);
    }
  }, [subscription]);

  const customer = customers.find((c) => c.id === subscription.customer_id);
  const customerVehicles = vehicles.filter((v) => v.customer_id === subscription.customer_id);
  const currentPackage = packages.find((p) => p.id === packageId);
  const weeklyVisitsCount = currentPackage?.weekly_visits_count || 1;

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      if (selectedDays.length >= weeklyVisitsCount) {
        alert(`الباقة المحددة تسمح باختيار ${weeklyVisitsCount} أيام فقط في الأسبوع.`);
        return;
      }
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('يرجى تحديد تاريخ البداية والنهاية');
      return;
    }
    if (selectedDays.length === 0) {
      alert('يرجى اختيار يوم واحد على الأقل للزيارات الأسبوعية');
      return;
    }

    try {
      setIsSubmitting(true);
      const updates: Partial<Subscription> = {
        package_id: packageId,
        area_id: areaId,
        assigned_worker_id: workerId || null,
        vehicle_id: vehicleId || null,
        start_date: startDate,
        end_date: endDate,
        selected_days: selectedDays,
        preferred_day_of_week: selectedDays.join('، '),
        preferred_time_from: preferredTimeFrom || undefined,
        preferred_time_to: preferredTimeTo || undefined,
        total_price: Number(totalPrice) || 0,
        status: status,
        payment_status: paymentStatus,
        notes: notes
      };

      await onUpdateSubscription(subscription.id, updates, regenerateVisits);
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء تعديل بيانات الاشتراك: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-scaleUp border border-slate-100">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Edit3 className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h3 className="font-black text-base">تعديل بيانات الاشتراك</h3>
              <p className="text-xs text-teal-100 font-medium">
                العميل: {customer?.full_name || 'غير معروف'} ({customer?.phone || '-'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Package & Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الباقة المشترك بها *
              </label>
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.weekly_visits_count || 1} زيارات أسبوعياً)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                منطقة التغطية / الكمبوند *
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
              >
                {coverageAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Assigned Worker & Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العامل المخصص للاشتراك
              </label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- بدون تعيين مسبق --</option>
                {employees
                  .filter((emp) => emp.role === 'worker')
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.phone})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المركبة أو المنشأة
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- بدون مركبة (نظافة مبنى / خدمات عامة) --</option>
                {customerVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_type} - {v.plate_number} ({v.color})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تاريخ بداية الاشتراك *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تاريخ نهاية الاشتراك *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Preferred Days Multi-Selector */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                أيام الزيارة الأسبوعية المفضلة للعميل *
              </label>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                المختار: {selectedDays.length} من {weeklyVisitsCount} أيام
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ARABIC_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Preferred Time Window */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوقت المفضل (من)
              </label>
              <input
                type="time"
                value={preferredTimeFrom}
                onChange={(e) => setPreferredTimeFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوقت المفضل (إلى)
              </label>
              <input
                type="time"
                value={preferredTimeTo}
                onChange={(e) => setPreferredTimeTo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 5: Pricing, Status & Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                السعر الإجمالي ({settings.currency_symbol}) *
              </label>
              <input
                type="number"
                min={0}
                value={totalPrice}
                onChange={(e) => setTotalPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة الاشتراك
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
              >
                <option value="pending">قيد المراجعة</option>
                <option value="active">نشط ومجدول</option>
                <option value="paused">متوقف مؤقتاً</option>
                <option value="expired">منتهي</option>
                <option value="cancelled">ملغي</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة السداد
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-teal-500"
              >
                <option value="unpaid">غير مسدد</option>
                <option value="paid">مسدد بالكامل</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات أو تعليمات خاصة
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أو رغبات محددة للعميل..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Optional: Regenerate Visits Checkbox */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="regenerateVisitsCheckbox"
              checked={regenerateVisits}
              onChange={(e) => setRegenerateVisits(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="regenerateVisitsCheckbox" className="text-xs text-amber-900 leading-relaxed cursor-pointer select-none">
              <span className="font-bold block">إعادة توزيع وتوليد مواعيد الزيارات في الجدول تلقائياً</span>
              <span className="text-[11px] text-amber-700">
                عند تحديد هذا الخيار، سيقوم النظام بإعادة بناء مواعيد الزيارات المجدولة للاشتراك وفقاً للأيام والتواريخ المحدثة بترتيب الخدمات الأسبوعي.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
