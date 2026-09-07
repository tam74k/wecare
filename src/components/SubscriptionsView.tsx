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
  PackageCategory,
  PaymentMethod
} from '../types/database';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Archive,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Car,
  Building,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  MapPin,
  Phone,
  Check,
  ChevronDown,
  Lock,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertCircle,
  CreditCard,
  Banknote
} from 'lucide-react';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  pricing?: { id: string; package_id: string; area_id: string; price: number }[];
  employees: Employee[];
  settings: Settings;
  paymentMethods?: PaymentMethod[];
  canOverridePrice?: boolean;
  autoOpenCreateModal?: boolean;
  onResetAutoOpen?: () => void;
  onCreateSubscription: (sub: Omit<Subscription, 'id' | 'status' | 'created_at'>) => Promise<Subscription>;
  onApproveSubscription: (id: string) => Promise<void>;
  onRejectSubscription: (id: string) => Promise<void>;
  onRestoreSubscription: (id: string) => Promise<void>;
  onRenewSubscription: (id: string) => Promise<void>;
  onArchiveCheck: () => Promise<number>;
  onPauseSubscription?: (id: string) => Promise<void>;
  onResumeSubscription?: (id: string) => Promise<void>;
  onDeleteSubscription?: (id: string) => Promise<void>;
  onPaySubscription?: (subscriptionId: string, paymentMethodId: string, amount: number) => Promise<void>;
  onCreateCustomer?: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

const ARABIC_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  customers,
  vehicles,
  packages,
  categories,
  coverageAreas,
  pricing = [],
  employees,
  settings,
  paymentMethods = [],
  canOverridePrice = true,
  autoOpenCreateModal = false,
  onResetAutoOpen,
  onCreateSubscription,
  onCreateCustomer,
  onCreateVehicle,
  onApproveSubscription,
  onRejectSubscription,
  onRestoreSubscription,
  onRenewSubscription,
  onArchiveCheck,
  onPauseSubscription,
  onResumeSubscription,
  onDeleteSubscription,
  onPaySubscription
}) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (autoOpenCreateModal) {
      setIsModalOpen(true);
      onResetAutoOpen?.();
    }
  }, [autoOpenCreateModal, onResetAutoOpen]);

  // Quick Pay Modal State
  const [payingSubscription, setPayingSubscription] = useState<Subscription | null>(null);
  const [payModalMethodId, setPayModalMethodId] = useState<string>('');
  const [payModalAmount, setPayModalAmount] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleRunArchivalCheck = async () => {
    setIsArchiving(true);
    const count = await onArchiveCheck();
    setIsArchiving(false);
    alert(`تم فحص الاشتراكات المنتهية: تم أرشفة (${count}) اشتراك تجاوزت 10 أيام.`);
  };

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.full_name || 'عميل غير مسجل';
  const getCustomerPhone = (id: string) => customers.find((c) => c.id === id)?.phone || '-';
  const getPackageName = (id: string) => packages.find((p) => p.id === id)?.name || 'باقة';
  const getAreaName = (id: string) => coverageAreas.find((a) => a.id === id)?.name || '-';
  const getWorkerName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'غير معين';
  const getVehicleInfo = (id?: string | null) => {
    if (!id) return null;
    const veh = vehicles.find((v) => v.id === id);
    return veh ? `${veh.vehicle_type} (${veh.plate_number})` : null;
  };

  const filteredSubscriptions = subscriptions.filter((s) => {
    if (activeStatusFilter === 'unpaid') {
      if (s.payment_status !== 'unpaid') return false;
    } else if (activeStatusFilter !== 'all' && s.status !== activeStatusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const custName = getCustomerName(s.customer_id).toLowerCase();
      const phone = getCustomerPhone(s.customer_id);
      const pkgName = getPackageName(s.package_id).toLowerCase();
      const term = searchTerm.toLowerCase();
      return custName.includes(term) || phone.includes(term) || pkgName.includes(term);
    }
    return true;
  });

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs">قيد المراجعة</span>;
      case 'active':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs">نشط ومجدول</span>;
      case 'paused':
        return <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs">متوقف مؤقتاً</span>;
      case 'expired':
        return <span className="bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full text-xs">منتهي</span>;
      case 'archived':
        return <span className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-full text-xs">مؤرشف</span>;
      case 'cancelled':
        return <span className="bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded-full text-xs">ملغي</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة الاشتراكات وسير العمل</h2>
          <p className="text-sm text-slate-500 mt-1">
            متابعة الاشتراكات: قيد المراجعة ← اشتراكات نشطة ← متوقفة مؤقتاً ← منتهية ← مؤرشفة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunArchivalCheck}
            disabled={isArchiving}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
            title="نقل الاشتراكات المنتهية إلى سجل الأرشيف"
          >
            <Archive className="w-4 h-4 text-slate-500" />
            <span>{isArchiving ? 'جاري الأرشفة...' : 'أرشفة المنتهي (تجاوز 10 أيام)'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء اشتراك جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'كافة الحالات' },
            { id: 'pending', label: 'قيد المراجعة' },
            { id: 'active', label: 'النشطة' },
            {
              id: 'unpaid',
              label: `غير مسددة (${subscriptions.filter((s) => s.payment_status === 'unpaid').length})`
            },
            { id: 'paused', label: 'المتوقفة مؤقتاً' },
            { id: 'expired', label: 'المنتهية' },
            { id: 'archived', label: 'المؤرشفة' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeStatusFilter === f.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالعميل أو الهاتف أو الباقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            لا توجد اشتراكات مطابقة للبحث أو التصفية الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">العميل والموبايل</th>
                  <th className="p-4">الباقة والنوع</th>
                  <th className="p-4">المركبة / العمارة</th>
                  <th className="p-4">الكمبوند والعامل</th>
                  <th className="p-4">الموعد والمدة</th>
                  <th className="p-4">السعر</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">إجراءات سير العمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSubscriptions.map((sub) => {
                  const vehicleInfo = getVehicleInfo(sub.vehicle_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{getCustomerName(sub.customer_id)}</div>
                        <div className="text-xs text-slate-400 font-mono">{getCustomerPhone(sub.customer_id)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-xs">{getPackageName(sub.package_id)}</div>
                      </td>
                      <td className="p-4 text-xs">
                        {vehicleInfo ? (
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Car className="w-3.5 h-3.5 text-sky-600" />
                            <span>{vehicleInfo}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-teal-700 font-semibold">
                            <Building className="w-3.5 h-3.5 text-teal-600" />
                            <span>غسيل ونظافة العمارة</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-semibold text-slate-800">{getAreaName(sub.area_id)}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">العامل: {getWorkerName(sub.assigned_worker_id)}</div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-slate-900">
                          كل يوم: {sub.preferred_day_of_week}
                          {sub.preferred_time_from || sub.preferred_time_to ? (
                            <span className="text-teal-700 font-mono text-[11px] mr-1">
                              ({sub.preferred_time_from || '--:--'} - {sub.preferred_time_to || '--:--'})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[11px] mr-1">
                              (طوال اليوم)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          من {sub.start_date} إلى {sub.end_date}
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {sub.total_price} {settings.currency_symbol}
                        </div>
                        <div className="mt-1">
                          {sub.payment_status === 'unpaid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>غير مسدد</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>مسدد</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(sub.status)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* زر سداد الاشتراك غير المسدد */}
                          {sub.payment_status === 'unpaid' && onPaySubscription && (
                            <button
                              onClick={() => {
                                setPayingSubscription(sub);
                                setPayModalAmount(sub.total_price);
                                setPayModalMethodId(paymentMethods[0]?.id || '');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1 transition-colors"
                              title="تسجيل سداد وتحصيل الاشتراك"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>سداد</span>
                            </button>
                          )}
                          {sub.status === 'pending' && (
                            <>
                              <button
                                onClick={() => onApproveSubscription(sub.id)}
                                className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1 transition-colors"
                                title="اعتماد الاشتراك وتفعيل الجدول"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>اعتماد</span>
                              </button>
                              <button
                                onClick={() => onRejectSubscription(sub.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs border border-rose-200 transition-colors"
                                title="رفض الطلب"
                              >
                                <span>رفض</span>
                              </button>
                            </>
                          )}

                          {sub.status === 'active' && onPauseSubscription && (
                            <button
                              onClick={() => onPauseSubscription(sub.id)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs border border-amber-200 flex items-center gap-1 transition-colors"
                              title="إيقاف الاشتراك مؤقتاً"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>إيقاف مؤقت</span>
                            </button>
                          )}

                          {sub.status === 'paused' && onResumeSubscription && (
                            <button
                              onClick={() => onResumeSubscription(sub.id)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs border border-emerald-200 flex items-center gap-1 transition-colors"
                              title="استئناف وتفعيل الاشتراك"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>استئناف</span>
                            </button>
                          )}

                          {sub.status === 'expired' && (
                            <button
                              onClick={() => onRenewSubscription(sub.id)}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg font-bold text-xs border border-teal-200 flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>تجديد</span>
                            </button>
                          )}

                          {sub.status === 'archived' && (
                            <button
                              onClick={() => onRestoreSubscription(sub.id)}
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg font-bold text-xs border border-sky-200 flex items-center gap-1 transition-colors"
                              title="استعادة الاشتراك المؤرشف بكامل بياناته"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>
                          )}

                          {/* زر حذف الاشتراك متاح دائماً مع نافذة تأكيد */}
                          {onDeleteSubscription && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    'هل أنت متأكد من رغبتك في حذف هذا الاشتراك وجميع الزيارات المرتبطة به نهائياً؟'
                                  )
                                ) {
                                  onDeleteSubscription(sub.id);
                                }
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg font-bold text-xs border border-slate-200 hover:border-rose-200 transition-colors"
                              title="حذف الاشتراك"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* New Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customers={customers}
        vehicles={vehicles}
        packages={packages}
        categories={categories}
        coverageAreas={coverageAreas}
        pricing={pricing}
        employees={employees}
        settings={settings}
        paymentMethods={paymentMethods}
        canOverridePrice={canOverridePrice}
        onCreateSubscription={onCreateSubscription}
        onCreateCustomer={onCreateCustomer}
        onCreateVehicle={onCreateVehicle}
      />

      {/* Quick Pay Modal for Unpaid Subscriptions */}
      {payingSubscription && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل وسداد اشتراك</h3>
                  <p className="text-xs text-slate-500">
                    العميل: {getCustomerName(payingSubscription.customer_id)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingSubscription(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>الباقة:</span>
                  <span className="font-bold text-slate-900">{getPackageName(payingSubscription.package_id)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الهاتف:</span>
                  <span className="font-mono text-slate-900">{getCustomerPhone(payingSubscription.customer_id)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المبلغ المطلوب سداده ({settings.currency_symbol}) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={payModalAmount}
                  onChange={(e) => setPayModalAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  طريقة الدفع (الخزينة) *
                </label>
                <select
                  value={payModalMethodId}
                  onChange={(e) => setPayModalMethodId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- اختر طريقة الدفع --</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  سيتم تسجيل إيداع فوري في الخزينة المرتبطة وتعديل حالة الاشتراك إلى مسدد.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={async () => {
                    if (!payModalMethodId) {
                      alert('يرجى اختيار طريقة الدفع');
                      return;
                    }
                    if (!payModalAmount || payModalAmount <= 0) {
                      alert('يرجى إدخال مبلغ صحيح');
                      return;
                    }
                    if (onPaySubscription) {
                      try {
                        setIsProcessingPayment(true);
                        await onPaySubscription(payingSubscription.id, payModalMethodId, payModalAmount);
                        setPayingSubscription(null);
                        alert('تم تسجيل الدفع وتوريد المبلغ إلى الخزينة بنجاح.');
                      } catch (err: any) {
                        alert('حدث خطأ أثناء تسجيل الدفع: ' + (err.message || 'خطأ غير معروف'));
                      } finally {
                        setIsProcessingPayment(false);
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessingPayment ? 'جاري السداد...' : 'تأكيد السداد والتوريد'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayingSubscription(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
