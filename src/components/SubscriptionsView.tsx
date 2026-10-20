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
  PaymentMethod,
  Visit
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
  Banknote,
  Edit3,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { ManageSubscriptionVisitsModal } from './ManageSubscriptionVisitsModal';
import { ImportSubscriptionsModal } from './ImportSubscriptionsModal';

interface SubscriptionsViewProps {
  subscriptionType?: 'cars' | 'buildings' | 'public' | 'all';
  subscriptions: Subscription[];
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  pricing?: { id: string; package_id: string; area_id: string; price: number }[];
  employees: Employee[];
  settings: Settings;
  visits?: Visit[];
  paymentMethods?: PaymentMethod[];
  canOverridePrice?: boolean;
  autoOpenCreateModal?: boolean;
  onResetAutoOpen?: () => void;
  onCreateSubscription: (sub: Omit<Subscription, 'id' | 'status' | 'created_at'> & { status?: SubscriptionStatus }) => Promise<Subscription>;
  onUpdateSubscription?: (id: string, updates: Partial<Subscription>, regenerateVisits?: boolean) => Promise<void>;
  onUpdateVisit?: (visitId: string, updates: Partial<Visit>) => Promise<void>;
  onCreateVisit?: (visit: Omit<Visit, 'id'> & { id?: string }) => Promise<Visit>;
  onDeleteVisit?: (visitId: string) => Promise<void>;
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
  onRefreshData?: () => Promise<void>;
}

const ARABIC_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptionType = 'all',
  subscriptions,
  customers,
  vehicles,
  packages,
  categories,
  coverageAreas,
  pricing = [],
  employees,
  settings,
  visits = [],
  paymentMethods = [],
  canOverridePrice = true,
  autoOpenCreateModal = false,
  onResetAutoOpen,
  onCreateSubscription,
  onUpdateSubscription,
  onUpdateVisit,
  onCreateVisit,
  onDeleteVisit,
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
  onPaySubscription,
  onRefreshData
}) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [managingVisitsSubscription, setManagingVisitsSubscription] = useState<Subscription | null>(null);

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

  const getSubCategoryType = (sub: Subscription): 'cars' | 'buildings' | 'public' => {
    if (sub.vehicle_id) return 'cars';

    const pkg = packages.find((p) => p.id === sub.package_id);
    const cat = categories.find((c) => c.id === pkg?.category_id);
    const catName = (cat?.name || '').toLowerCase();
    const pkgName = (pkg?.name || '').toLowerCase();

    if (
      catName.includes('عمارات') ||
      catName.includes('عمارة') ||
      catName.includes('مباني') ||
      pkgName.includes('عمارة') ||
      pkgName.includes('عمارات') ||
      (pkg as any)?.is_building === 1
    ) {
      return 'buildings';
    }
    if (
      catName.includes('خدمات عامة') ||
      catName.includes('خدمة عامة') ||
      catName.includes('عامة') ||
      catName.includes('خدمات') ||
      catName.includes('خدمة') ||
      pkgName.includes('خدمات عامة') ||
      pkgName.includes('خدمة عامة') ||
      pkgName.includes('خدمات') ||
      pkgName.includes('خدمة')
    ) {
      return 'public';
    }
    return 'cars';
  };

  const typeFilteredSubscriptions = subscriptions.filter((s) => {
    if (!subscriptionType || subscriptionType === 'all') return true;
    return getSubCategoryType(s) === subscriptionType;
  });

  const filteredSubscriptions = typeFilteredSubscriptions.filter((s) => {
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

  const viewConfig = {
    cars: {
      title: 'اشتراكات غسيل السيارات وسير العمل',
      description: 'متابعة وإدارة سير عمل اشتراكات غسيل سيارات العملاء بالباقات الدورية',
      createBtnLabel: 'إنشاء اشتراك سيارة جديد',
      colHeader: 'السيارة واللوحة',
      emptyMsg: 'لا توجد اشتراكات سيارات مطابقة للبحث أو التصفية الحالية.'
    },
    buildings: {
      title: 'اشتراكات نظافة العمارات وسير العمل',
      description: 'متابعة وإدارة سير عمل اشتراكات نظافة المداخل والسلالم والواجهات بالعمارات',
      createBtnLabel: 'إنشاء اشتراك عمارة جديد',
      colHeader: 'العمارة والموقع',
      emptyMsg: 'لا توجد اشتراكات عمارات مطابقة للبحث أو التصفية الحالية.'
    },
    public: {
      title: 'اشتراكات الخدمات العامة وسير العمل',
      description: 'متابعة وإدارة سير عمل اشتراكات الخدمات العامة والمرافق والمساحات المشتركة',
      createBtnLabel: 'إنشاء اشتراك خدمة عامة جديد',
      colHeader: 'موقع / تفاصيل الخدمة',
      emptyMsg: 'لا توجد اشتراكات خدمات عامة مطابقة للبحث أو التصفية الحالية.'
    },
    all: {
      title: 'إدارة الاشتراكات وسير العمل',
      description: 'متابعة الاشتراكات: قيد المراجعة ← اشتراكات نشطة ← متوقفة مؤقتاً ← منتهية ← مؤرشفة',
      createBtnLabel: 'إنشاء اشتراك جديد',
      colHeader: 'المركبة / العمارة',
      emptyMsg: 'لا توجد اشتراكات مطابقة للبحث أو التصفية الحالية.'
    }
  }[subscriptionType || 'all'];

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
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            {subscriptionType === 'cars' && <Car className="w-6 h-6 text-sky-600" />}
            {subscriptionType === 'buildings' && <Building className="w-6 h-6 text-teal-600" />}
            {subscriptionType === 'public' && <Sparkles className="w-6 h-6 text-amber-600" />}
            <span>{viewConfig.title}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {viewConfig.description}
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
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="استيراد الاشتراكات وجداول الزيارات من ملف إكسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد من إكسل</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{viewConfig.createBtnLabel}</span>
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
              label: `غير مسددة (${typeFilteredSubscriptions.filter((s) => s.payment_status === 'unpaid').length})`
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
            {viewConfig.emptyMsg}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">العميل والموبايل</th>
                  <th className="p-4">الباقة والنوع</th>
                  <th className="p-4">{viewConfig.colHeader}</th>
                  <th className="p-4 min-w-[200px]">العنوان بالكامل</th>
                  <th className="p-4 min-w-[120px]">الفني المسؤول</th>
                  <th className="p-4">الموعد والمدة</th>
                  <th className="p-4">السعر</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">إجراءات سير العمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSubscriptions.map((sub) => {
                  const vehicleInfo = getVehicleInfo(sub.vehicle_id);
                  const cust = customers.find((c) => c.id === sub.customer_id);
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
                        {subscriptionType === 'cars' ? (
                          vehicleInfo ? (
                            <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                              <Car className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>{vehicleInfo}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">- لا توجد مركبة محددة -</span>
                          )
                        ) : subscriptionType === 'buildings' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-teal-800 font-bold">
                              <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>
                                عمارة {cust?.building_number || '-'}
                                {cust?.block_number ? ` (مجموعة ${cust.block_number})` : ''}
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-500">نظافة وغسيل العمارة</span>
                          </div>
                        ) : subscriptionType === 'public' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-amber-800 font-bold">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>خدمة عامة / مرفق</span>
                            </span>
                            {cust?.detailed_address && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                {cust.detailed_address}
                              </span>
                            )}
                          </div>
                        ) : vehicleInfo ? (
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Car className="w-3 h-3 text-sky-600 shrink-0" />
                            <span>{vehicleInfo}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-teal-700 font-semibold">
                            <Building className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>غسيل ونظافة العمارة</span>
                          </span>
                        )}
                      </td>
                      {/* Full Address */}
                      <td className="p-4 text-xs min-w-[200px]">
                        {(() => {
                          const addr = getCustomerFullAddress(cust, sub.area_id);
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
                                  <span>📍 رابط الخريطة ↗</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Assigned Worker */}
                      <td className="p-4 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const emp = employees.find((e) => e.id === sub.assigned_worker_id);
                            const photo = emp?.personal_image_url || emp?.national_id_image_url;
                            if (photo) {
                              return (
                                <img
                                  src={photo}
                                  alt={emp?.full_name}
                                  className="w-6 h-6 rounded-lg object-cover border border-teal-400 shrink-0"
                                />
                              );
                            }
                            if (emp) {
                              return (
                                <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {emp.full_name.slice(0, 1)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <span className="font-bold text-slate-800">
                            {getWorkerName(sub.assigned_worker_id)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div>
                          {sub.selected_days && sub.selected_days.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {sub.selected_days.map((d) => (
                                <span key={d} className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200 text-[10px] font-bold">
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="font-bold text-slate-900">
                              أيام: {sub.preferred_day_of_week}
                            </div>
                          )}
                          {sub.preferred_time_from || sub.preferred_time_to ? (
                            <span className="text-teal-700 font-mono text-[11px]">
                              ({sub.preferred_time_from || '--:--'} - {sub.preferred_time_to || '--:--'})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[11px]">
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
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* زر عرض وتعديل الزيارات الميدانية لهذا الاشتراك */}
                          {onUpdateVisit && (
                            <button
                              onClick={() => setManagingVisitsSubscription(sub)}
                              className="h-7 px-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 rounded-lg border border-sky-200 flex items-center gap-1 transition-colors shadow-2xs"
                              title={`عرض وتعديل جدول زيارات هذا الاشتراك (${visits ? visits.filter((v) => v.subscription_id === sub.id).length : 0} زيارة)`}
                            >
                              <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              {visits && (
                                <span className="px-1 py-0.2 bg-sky-200/80 text-sky-900 rounded-full text-[10px] font-mono font-bold leading-none">
                                  {visits.filter((v) => v.subscription_id === sub.id).length}
                                </span>
                              )}
                            </button>
                          )}

                          {/* زر تعديل بيانات الاشتراك */}
                          {onUpdateSubscription && (
                            <button
                              onClick={() => setEditingSubscription(sub)}
                              className="w-7 h-7 bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg border border-slate-200 hover:border-teal-300 flex items-center justify-center transition-colors shadow-2xs"
                              title="تعديل بيانات الاشتراك (الباقة، المواعيد، الأيام، الأسعار، العامل)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* زر سداد الاشتراك غير المسدد */}
                          {sub.payment_status === 'unpaid' && onPaySubscription && (
                            <button
                              onClick={() => {
                                setPayingSubscription(sub);
                                setPayModalAmount(sub.total_price);
                                setPayModalMethodId(paymentMethods[0]?.id || '');
                              }}
                              className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border border-emerald-600 flex items-center justify-center transition-colors shadow-2xs"
                              title="تسجيل سداد وتحصيل الاشتراك"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* أزرار اعتماد أو رفض في حالة الطلب المعلق */}
                          {sub.status === 'pending' && (
                            <>
                              <button
                                onClick={() => onApproveSubscription(sub.id)}
                                className="w-7 h-7 bg-teal-600 hover:bg-teal-700 text-white rounded-lg border border-teal-600 flex items-center justify-center transition-colors shadow-2xs"
                                title="اعتماد الاشتراك وتفعيل الجدول"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onRejectSubscription(sub.id)}
                                className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 flex items-center justify-center transition-colors shadow-2xs"
                                title="رفض طلب الاشتراك"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* إيقاف مؤقت للاشتراك النشط */}
                          {sub.status === 'active' && onPauseSubscription && (
                            <button
                              onClick={() => onPauseSubscription(sub.id)}
                              className="w-7 h-7 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 flex items-center justify-center transition-colors shadow-2xs"
                              title="إيقاف الاشتراك مؤقتاً"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* استئناف الاشتراك المتوقف */}
                          {sub.status === 'paused' && onResumeSubscription && (
                            <button
                              onClick={() => onResumeSubscription(sub.id)}
                              className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 flex items-center justify-center transition-colors shadow-2xs"
                              title="استئناف وتفعيل الاشتراك"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* تجديد الاشتراك المنتهي */}
                          {sub.status === 'expired' && (
                            <button
                              onClick={() => onRenewSubscription(sub.id)}
                              className="w-7 h-7 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 flex items-center justify-center transition-colors shadow-2xs"
                              title="تجديد الاشتراك"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* استعادة الاشتراك المؤرشف */}
                          {sub.status === 'archived' && (
                            <button
                              onClick={() => onRestoreSubscription(sub.id)}
                              className="w-7 h-7 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg border border-sky-200 flex items-center justify-center transition-colors shadow-2xs"
                              title="استعادة الاشتراك المؤرشف بكامل بياناته"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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
                              className="w-7 h-7 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors shadow-2xs"
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
        defaultCategoryType={subscriptionType}
        onCreateSubscription={async (subData) => {
          const res = await onCreateSubscription(subData);
          setActiveStatusFilter('all');
          setSearchTerm('');
          return res;
        }}
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

      {/* Edit Subscription Modal */}
      {editingSubscription && onUpdateSubscription && (
        <EditSubscriptionModal
          isOpen={Boolean(editingSubscription)}
          onClose={() => setEditingSubscription(null)}
          subscription={editingSubscription}
          customers={customers}
          vehicles={vehicles}
          packages={packages}
          coverageAreas={coverageAreas}
          employees={employees}
          settings={settings}
          onUpdateSubscription={onUpdateSubscription}
        />
      )}

      {/* Manage Visits Modal */}
      {managingVisitsSubscription && onUpdateVisit && onCreateVisit && onDeleteVisit && (
        <ManageSubscriptionVisitsModal
          isOpen={Boolean(managingVisitsSubscription)}
          onClose={() => setManagingVisitsSubscription(null)}
          subscription={managingVisitsSubscription}
          visits={visits}
          customers={customers}
          employees={employees}
          packages={packages}
          coverageAreas={coverageAreas}
          vehicles={vehicles}
          onUpdateVisit={onUpdateVisit}
          onCreateVisit={onCreateVisit}
          onDeleteVisit={onDeleteVisit}
        />
      )}

      {/* Import Subscriptions & Visits Modal */}
      <ImportSubscriptionsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        customers={customers}
        vehicles={vehicles}
        packages={packages}
        coverageAreas={coverageAreas}
        paymentMethods={paymentMethods}
        onImportSuccess={onRefreshData}
      />
    </div>
  );
};
