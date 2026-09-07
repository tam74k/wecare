import React, { useState } from 'react';
import {
  Subscription,
  Customer,
  Package,
  CoverageArea,
  Visit,
  Attendance,
  Treasury,
  PaymentMethod,
  Employee,
  Settings,
  Vehicle,
  PackageCategory
} from '../types/database';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Coins,
  Repeat,
  Sparkles,
  ArrowRight,
  UserCheck,
  Building,
  Car,
  Search,
  X,
  CreditCard,
  Wallet,
  Landmark,
  Check,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';

interface DashboardViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  packages: Package[];
  coverageAreas: CoverageArea[];
  visits: Visit[];
  attendance: Attendance[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  employees: Employee[];
  settings: Settings;
  vehicles?: Vehicle[];
  categories?: PackageCategory[];
  pricing?: any[];
  canOverridePrice?: boolean;
  onApproveSubscription: (id: string) => void;
  onRejectSubscription: (id: string) => void;
  onRenewSubscription: (id: string) => void;
  onNavigate: (tab: any) => void;
  onPaySubscription?: (id: string, paymentMethodId: string, amount: number) => Promise<void>;
  onCreateSubscription?: (subscription: Omit<Subscription, 'id' | 'status' | 'created_at'>) => Promise<Subscription>;
  onCreateCustomer?: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  subscriptions,
  customers,
  packages,
  coverageAreas,
  visits,
  attendance,
  treasuries,
  paymentMethods,
  employees,
  settings,
  vehicles = [],
  categories = [],
  pricing = [],
  canOverridePrice = true,
  onApproveSubscription,
  onRejectSubscription,
  onRenewSubscription,
  onNavigate,
  onPaySubscription,
  onCreateSubscription,
  onCreateCustomer,
  onCreateVehicle
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Modals state
  const [showActiveSubsModal, setShowActiveSubsModal] = useState(false);
  const [activeSubsSearch, setActiveSubsSearch] = useState('');
  const [isCreateSubModalOpen, setIsCreateSubModalOpen] = useState(false);

  // Quick Pay State inside Dashboard
  const [payingSubscription, setPayingSubscription] = useState<Subscription | null>(null);
  const [payModalMethodId, setPayModalMethodId] = useState<string>('');
  const [payModalAmount, setPayModalAmount] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showTodayVisitsModal, setShowTodayVisitsModal] = useState(false);
  const [todayVisitsFilter, setTodayVisitsFilter] = useState<'all' | 'completed' | 'pending' | 'postponed'>('all');

  const [showTreasuriesModal, setShowTreasuriesModal] = useState(false);

  const [showUnpaidSubsModal, setShowUnpaidSubsModal] = useState(false);
  const [unpaidSubsSearch, setUnpaidSubsSearch] = useState('');

  // 1. الاشتراكات قيد المراجعة
  const pendingSubscriptions = subscriptions.filter((s) => s.status === 'pending');
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');

  // 2. الاشتراكات التي أوشكت على الانتهاء (خلال 7 أيام)
  const expiringSubscriptions = subscriptions.filter((s) => {
    if (s.status !== 'active') return false;
    const endDate = new Date(s.end_date);
    const today = new Date(todayStr);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // 3. زيارات اليوم
  const todayVisits = visits.filter((v) => v.scheduled_date === todayStr);
  const todayCompletedVisits = todayVisits.filter((v) => v.status === 'completed');
  const todayPendingVisits = todayVisits.filter((v) => v.status === 'scheduled' || v.status === 'in_progress');
  const todayPostponedVisits = todayVisits.filter((v) => v.status === 'postponed');

  // 4. إحصائية حضور الموظفين لليوم
  const presentEmployees = attendance.filter((a) => a.date === todayStr && a.status === 'present').length;
  const absentEmployees = attendance.filter((a) => a.date === todayStr && a.status === 'absent').length;
  const lateEmployees = attendance.filter((a) => a.date === todayStr && a.status === 'late').length;

  // 5. إجمالي الرصيد في الخزائن
  const totalBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.full_name || 'عميل غير مسجل';
  const getCustomerPhone = (id: string) => customers.find((c) => c.id === id)?.phone || '-';
  const getPackageName = (id: string) => packages.find((p) => p.id === id)?.name || 'باقة غير محددة';
  const getAreaName = (id: string) => coverageAreas.find((a) => a.id === id)?.name || '-';
  const getWorkerName = (id?: string | null) =>
    employees.find((e) => e.id === id)?.full_name || 'غير معين';
  const getTreasuryBalance = (treasuryId: string) => {
    const t = treasuries.find((tr) => tr.id === treasuryId);
    return Number(t?.balance || 0);
  };
  const getTreasuryName = (treasuryId: string) => {
    const t = treasuries.find((tr) => tr.id === treasuryId);
    return t?.name || 'خزينة فرعية';
  };

  // فلترة الاشتراكات النشطة في النافذة المنبثقة
  const filteredActiveSubs = activeSubscriptions.filter((s) => {
    if (!activeSubsSearch.trim()) return true;
    const term = activeSubsSearch.toLowerCase();
    const custName = getCustomerName(s.customer_id).toLowerCase();
    const phone = getCustomerPhone(s.customer_id);
    const pkgName = getPackageName(s.package_id).toLowerCase();
    const areaName = getAreaName(s.area_id).toLowerCase();
    return custName.includes(term) || phone.includes(term) || pkgName.includes(term) || areaName.includes(term);
  });

  // فلترة زيارات اليوم حسب الفئة
  const filteredTodayVisits = todayVisits.filter((v) => {
    if (todayVisitsFilter === 'completed') return v.status === 'completed';
    if (todayVisitsFilter === 'pending') return v.status === 'scheduled' || v.status === 'in_progress';
    if (todayVisitsFilter === 'postponed') return v.status === 'postponed';
    return true;
  });

  // 6. الاشتراكات غير المسددة
  const unpaidSubscriptions = subscriptions.filter((s) => s.payment_status === 'unpaid');
  const unpaidTotalAmount = unpaidSubscriptions.reduce((sum, s) => sum + (Number(s.total_price) || 0), 0);

  const filteredUnpaidSubs = unpaidSubscriptions.filter((s) => {
    if (!unpaidSubsSearch.trim()) return true;
    const term = unpaidSubsSearch.toLowerCase();
    const custName = getCustomerName(s.customer_id).toLowerCase();
    const phone = getCustomerPhone(s.customer_id);
    const pkgName = getPackageName(s.package_id).toLowerCase();
    const areaName = getAreaName(s.area_id).toLowerCase();
    return custName.includes(term) || phone.includes(term) || pkgName.includes(term) || areaName.includes(term);
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* 1. Active Subscriptions Card (Clickable) */}
        <div
          onClick={() => setShowActiveSubsModal(true)}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-lg hover:border-teal-400 cursor-pointer transition-all group"
          title="انقر لفتح تفاصيل الاشتراكات النشطة مع إمكانية البحث"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold text-slate-500">الاشتراكات النشطة</p>
              <Eye className="w-3.5 h-3.5 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 group-hover:text-teal-700 transition-colors">
              {activeSubscriptions.length}
            </h3>
            <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 mt-1">
              <span>انقر للتفاصيل والبحث ←</span>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center ring-1 ring-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all">
            <Sparkles className="w-7 h-7" />
          </div>
        </div>

        {/* 2. Today's Scheduled Visits Card (Clickable) */}
        <div
          onClick={() => setShowTodayVisitsModal(true)}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-lg hover:border-sky-400 cursor-pointer transition-all group"
          title="انقر لفتح جدول زيارات اليوم مقسمة حسب الحالة"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold text-slate-500">زيارات اليوم المجدولة</p>
              <Eye className="w-3.5 h-3.5 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 group-hover:text-sky-700 transition-colors">
              {todayVisits.length}
            </h3>
            <span className="text-xs font-semibold text-sky-600 flex items-center gap-1 mt-1">
              <span>انقر لعرض الحالات والجدول ←</span>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center ring-1 ring-sky-100 group-hover:bg-sky-600 group-hover:text-white transition-all">
            <Calendar className="w-7 h-7" />
          </div>
        </div>

        {/* 3. Pending Subscriptions Alert */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">طلبات بانتظار الاعتماد</p>
            <h3 className="text-3xl font-black text-amber-600">{pendingSubscriptions.length}</h3>
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1 mt-1">
              <span>تتطلب موافقة الإدارة</span>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        {/* 4. Unpaid Subscriptions Alert (Clickable) */}
        <div
          onClick={() => setShowUnpaidSubsModal(true)}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-lg hover:border-rose-400 cursor-pointer transition-all group"
          title="انقر لفتح قائمة الاشتراكات غير المسددة ومتابعة تحصيلها"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold text-slate-500">اشتراكات غير مسددة</p>
              <Eye className="w-3.5 h-3.5 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-3xl font-black text-rose-600 group-hover:text-rose-700 transition-colors">
              {unpaidSubscriptions.length}
            </h3>
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
              <span>{unpaidTotalAmount.toLocaleString()} {settings.currency_symbol} مستحقة ←</span>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center ring-1 ring-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-all">
            <AlertCircle className="w-7 h-7" />
          </div>
        </div>

        {/* 5. Total Cash Balance Card (Clickable) */}
        <div
          onClick={() => setShowTreasuriesModal(true)}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-lg hover:border-emerald-400 cursor-pointer transition-all group"
          title="انقر لعرض تفاصيل أرصدة كافة طرق الدفع والخزائن"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold text-slate-500">رصيد الخزائن النقدية</p>
              <Eye className="w-3.5 h-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
              {totalBalance.toLocaleString()} {settings.currency_symbol}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>انقر لتفاصيل طرق الدفع ←</span>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Coins className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Subscriptions & Expiring Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Subscriptions Pending Approval */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    اشتراكات جديدة قيد المراجعة والاعتماد
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    مراجعة واعتماد الاشتراكات لجدولة مواعيد الزيارات للعملاء
                  </p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full">
                {pendingSubscriptions.length} بانتظار الموافقة
              </span>
            </div>

            {pendingSubscriptions.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <p className="text-slate-700 font-bold text-base">لا توجد طلبات اشتراك معلقة حالياً</p>
                <p className="text-slate-400 text-xs mt-1">
                  كافة الاشتراكات معتمدة ومجدولة في الرزنامة بنجاح
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {pendingSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">
                          {getCustomerName(sub.customer_id)}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {getCustomerPhone(sub.customer_id)}
                        </span>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {getAreaName(sub.area_id)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                        <span className="font-semibold text-slate-800">{getPackageName(sub.package_id)}</span>
                        <span>•</span>
                        <span>اليوم المفضل: <strong className="text-slate-900">{sub.preferred_day_of_week}</strong></span>
                        <span>•</span>
                        <span>الفترة: {sub.preferred_time_from} - {sub.preferred_time_to}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {sub.total_price} {settings.currency_symbol}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => onApproveSubscription(sub.id)}
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:from-teal-700 hover:to-emerald-700 flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد الاشتراك</span>
                      </button>
                      <button
                        onClick={() => onRejectSubscription(sub.id)}
                        className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Subscriptions (Within 7 Days) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    اشتراكات أوشكت على الانتهاء (خلال 7 أيام)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    تنبيه دوري لمتابعة العملاء وتجديد الاشتراكات فوراً قبل انتهائها
                  </p>
                </div>
              </div>
              <span className="bg-orange-100 text-orange-800 font-bold text-xs px-3 py-1 rounded-full">
                {expiringSubscriptions.length} اشتراك
              </span>
            </div>

            {expiringSubscriptions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                لا توجد اشتراكات نشطة ستنتهي خلال الأيام السبعة القادمة.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expiringSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        {getCustomerName(sub.customer_id)} ({getCustomerPhone(sub.customer_id)})
                      </h4>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span>{getPackageName(sub.package_id)}</span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold font-mono">ينتهي في: {sub.end_date}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRenewSubscription(sub.id)}
                      className="px-3.5 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs rounded-xl border border-teal-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>تجديد الاشتراك</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Staff Attendance Today & Quick Links */}
        <div className="space-y-6">
          {/* Today Staff Attendance Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">حضور وغياب الموظفين اليوم</h3>
              </div>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1"
              >
                <span>إدارة</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50/80 p-3 rounded-xl text-center border border-emerald-100">
                <p className="text-xs text-emerald-800 font-semibold mb-1">حاضر</p>
                <span className="text-xl font-black text-emerald-700">{presentEmployees}</span>
              </div>
              <div className="bg-amber-50/80 p-3 rounded-xl text-center border border-amber-100">
                <p className="text-xs text-amber-800 font-semibold mb-1">متأخر</p>
                <span className="text-xl font-black text-amber-700">{lateEmployees}</span>
              </div>
              <div className="bg-rose-50/80 p-3 rounded-xl text-center border border-rose-100">
                <p className="text-xs text-rose-800 font-semibold mb-1">غائب</p>
                <span className="text-xl font-black text-rose-700">{absentEmployees}</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 font-medium">
              إجمالي الفريق المسجل: <strong className="text-slate-800">{employees.length}</strong> موظف
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="bg-gradient-to-br from-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg space-y-4">
            <h4 className="font-bold text-sm text-teal-200">إجراءات تشغيلية سريعة</h4>
            <div className="space-y-2.5">
              <button
                onClick={() => setIsCreateSubModalOpen(true)}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-colors border border-white/10 cursor-pointer"
              >
                <span>إضافة اشتراك جديد</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>
              <button
                onClick={() => onNavigate('calendar')}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-colors border border-white/10"
              >
                <span>جدولة وزيارات الرزنامة</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>
              <button
                onClick={() => onNavigate('finance')}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-colors border border-white/10"
              >
                <span>التحويل للخزينة الرئيسية</span>
                <ArrowRight className="w-4 h-4 text-teal-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 1. نافذة تفاصيل الاشتراكات النشطة المنبثقة مع إمكانية البحث */}
      {/* ============================================================================== */}
      {showActiveSubsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">تفاصيل الاشتراكات النشطة</h3>
                  <p className="text-xs text-slate-500">
                    عرض كافة الاشتراكات السارية حالياً بالنظام ({filteredActiveSubs.length} من أصل {activeSubscriptions.length})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActiveSubsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="بحث باسم العميل، رقم الهاتف، اسم الباقة، أو المنطقة..."
                value={activeSubsSearch}
                onChange={(e) => setActiveSubsSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
              {filteredActiveSubs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  لا توجد اشتراكات نشطة مطابقة لمعيار البحث.
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3.5">العميل</th>
                      <th className="p-3.5">الهاتف</th>
                      <th className="p-3.5">الباقة</th>
                      <th className="p-3.5">الكمبوند / المنطقة</th>
                      <th className="p-3.5">الموعد الدوري</th>
                      <th className="p-3.5">تاريخ الانتهاء</th>
                      <th className="p-3.5">العامل المعين</th>
                      <th className="p-3.5">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredActiveSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{getCustomerName(sub.customer_id)}</td>
                        <td className="p-3.5 font-mono text-teal-700 font-bold">{getCustomerPhone(sub.customer_id)}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{getPackageName(sub.package_id)}</td>
                        <td className="p-3.5">{getAreaName(sub.area_id)}</td>
                        <td className="p-3.5">
                          كل {sub.preferred_day_of_week} ({sub.preferred_time_from} - {sub.preferred_time_to})
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{sub.end_date}</td>
                        <td className="p-3.5 text-slate-800 font-bold">{getWorkerName(sub.assigned_worker_id)}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          {sub.total_price} {settings.currency_symbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>إجمالي الاشتراكات المعروضة: <strong>{filteredActiveSubs.length}</strong></span>
              <button
                onClick={() => setShowActiveSubsModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 2. نافذة زيارات اليوم المجدولة (مقسمة إلى تمت، لم تتم، ومؤجلة) */}
      {/* ============================================================================== */}
      {showTodayVisitsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">جدول زيارات اليوم</h3>
                  <p className="text-xs text-slate-500">
                    تاريخ اليوم: {todayStr} (إجمالي الزيارات: {todayVisits.length})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTodayVisitsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs (الكل، تمت، لم تتم، مؤجلة) */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setTodayVisitsFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  todayVisitsFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({todayVisits.length})
              </button>
              <button
                onClick={() => setTodayVisitsFilter('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  todayVisitsFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تمت ({todayCompletedVisits.length})
              </button>
              <button
                onClick={() => setTodayVisitsFilter('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  todayVisitsFilter === 'pending'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                لم تتم ({todayPendingVisits.length})
              </button>
              <button
                onClick={() => setTodayVisitsFilter('postponed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  todayVisitsFilter === 'postponed'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مؤجلة ({todayPostponedVisits.length})
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
              {filteredTodayVisits.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  لا توجد زيارات تقع تحت هذا التصنيف لليوم.
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3.5">الوقت</th>
                      <th className="p-3.5">العميل</th>
                      <th className="p-3.5">رقم الموبايل</th>
                      <th className="p-3.5">العامل المسؤول</th>
                      <th className="p-3.5">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredTodayVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {v.scheduled_time_from} - {v.scheduled_time_to}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{getCustomerName(v.customer_id)}</td>
                        <td className="p-3.5 font-mono text-teal-700 font-bold">{getCustomerPhone(v.customer_id)}</td>
                        <td className="p-3.5 text-slate-800 font-bold">{getWorkerName(v.assigned_worker_id)}</td>
                        <td className="p-3.5">
                          {v.status === 'completed' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                              تمت بنجاح
                            </span>
                          )}
                          {(v.status === 'scheduled' || v.status === 'in_progress') && (
                            <span className="bg-sky-100 text-sky-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                              لم تتم بعد
                            </span>
                          )}
                          {v.status === 'postponed' && (
                            <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                              مؤجلة
                            </span>
                          )}
                          {v.status === 'cancelled' && (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                              ملغية
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>الزيارات المعروضة: <strong>{filteredTodayVisits.length}</strong></span>
              <button
                onClick={() => setShowTodayVisitsModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 3. نافذة رصيد كل طريقة دفع مسجلة بالنظام */}
      {/* ============================================================================== */}
      {showTreasuriesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 shadow-2xl space-y-6 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">أرصدة طرق الدفع والخزائن</h3>
                  <p className="text-xs text-slate-500">
                    رصيد كل طريقة دفع مسجلة بالنظام مع رصيد الخزينة الرئيسية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTreasuriesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Balance Spotlight */}
            <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-teal-200 font-semibold block mb-1">إجمالي السيولة النقدية بالنظام</span>
                <h2 className="text-3xl font-black text-emerald-400 font-mono">
                  {totalBalance.toLocaleString()} {settings.currency_symbol}
                </h2>
              </div>
              <div className="text-left text-xs text-teal-200">
                <span>العملة المعتمدة: </span>
                <strong className="text-white font-mono">{settings.currency_code} ({settings.currency_symbol})</strong>
              </div>
            </div>

            {/* Payment Methods & Sub-treasuries List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase">
                أرصدة طرق الدفع المسجلة ({paymentMethods.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {paymentMethods.map((pm) => {
                  const bal = getTreasuryBalance(pm.treasury_id);
                  const tName = getTreasuryName(pm.treasury_id);
                  return (
                    <div
                      key={pm.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-teal-400 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{pm.name}</div>
                          <div className="text-[11px] text-slate-400">{tName}</div>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <div className="text-base font-black text-slate-900">
                          {bal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">{settings.currency_symbol}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Central Treasury */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-emerald-950">الخزينة الرئيسية للمؤسسة</div>
                  <div className="text-xs text-emerald-700">تستقبل تحويلات الفترات من كافة طرق الدفع</div>
                </div>
              </div>
              <div className="text-left font-mono">
                <div className="text-lg font-black text-emerald-900">
                  {(treasuries.find((t) => t.type === 'main')?.balance || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">{settings.currency_symbol}</div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTreasuriesModal(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 4. نافذة الاشتراكات غير المسددة */}
      {/* ============================================================================== */}
      {showUnpaidSubsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">قائمة الاشتراكات غير المسددة</h3>
                  <p className="text-xs text-slate-500">
                    إجمالي غير المسدد: {unpaidSubscriptions.length} اشتراك بقيمة إجمالية{' '}
                    <span className="font-bold text-rose-600 font-mono">{unpaidTotalAmount.toLocaleString()} {settings.currency_symbol}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnpaidSubsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="بحث بالعميل أو الموبايل أو الباقة أو المنطقة..."
                value={unpaidSubsSearch}
                onChange={(e) => setUnpaidSubsSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Unpaid Subscriptions Table */}
            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
              {filteredUnpaidSubs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  لا توجد اشتراكات غير مسددة مطابقة للبحث
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="p-3.5">العميل</th>
                      <th className="p-3.5">الهاتف</th>
                      <th className="p-3.5">الباقة</th>
                      <th className="p-3.5">المنطقة</th>
                      <th className="p-3.5">تاريخ البدء</th>
                      <th className="p-3.5">المبلغ المطلوب</th>
                      <th className="p-3.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredUnpaidSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{getCustomerName(sub.customer_id)}</td>
                        <td className="p-3.5 font-mono text-slate-600 font-bold">{getCustomerPhone(sub.customer_id)}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{getPackageName(sub.package_id)}</td>
                        <td className="p-3.5">{getAreaName(sub.area_id)}</td>
                        <td className="p-3.5 font-mono text-slate-500">{sub.start_date}</td>
                        <td className="p-3.5 font-mono font-black text-rose-600">
                          {sub.total_price} {settings.currency_symbol}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setPayingSubscription(sub);
                              setPayModalAmount(sub.total_price);
                              setPayModalMethodId(paymentMethods[0]?.id || '');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            title="تسجيل سداد وتحصيل الاشتراك مباشرة"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                إجمالي غير المسدد المعروض: <strong>{filteredUnpaidSubs.length}</strong> اشتراك
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowUnpaidSubsModal(false);
                    onNavigate('subscriptions');
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>الانتقال لجدول الاشتراكات</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                <button
                  onClick={() => setShowUnpaidSubsModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 5. نافذة سداد الاشتراك المباشرة في لوحة التحكم */}
      {/* ============================================================================== */}
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
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
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

      {/* 6. نافذة إنشاء اشتراك جديد مباشرة داخل لوحة التحكم بدون الخروج منها */}
      {onCreateSubscription && (
        <CreateSubscriptionModal
          isOpen={isCreateSubModalOpen}
          onClose={() => setIsCreateSubModalOpen(false)}
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
      )}
    </div>
  );
};
