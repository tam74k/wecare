import React, { useState } from 'react';
import {
  User,
  LogOut,
  Car,
  ClipboardList,
  CalendarDays,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Package,
  CreditCard,
  Sparkles,
  AlertCircle,
  Camera,
  Upload,
  Loader2,
  ImageIcon,
  X
} from 'lucide-react';
import {
  AuthUser,
  Settings,
  Customer,
  Vehicle,
  Subscription,
  Visit,
  Package as PackageType,
  PackageCategory,
  CoverageArea,
  Employee,
  PaymentMethod,
  PackagePricing
} from '../types/database';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';

interface CustomerPortalViewProps {
  currentUser: AuthUser;
  settings: Settings;
  customers: Customer[];
  vehicles: Vehicle[];
  subscriptions: Subscription[];
  visits: Visit[];
  packages: PackageType[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  employees: Employee[];
  pricing?: PackagePricing[];
  paymentMethods?: PaymentMethod[];
  onLogout: () => void;
  onCreateVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle | null>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onCreateSubscription?: (subscription: Omit<Subscription, 'id' | 'status' | 'created_at'>) => Promise<Subscription>;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  currentUser,
  settings,
  customers,
  vehicles,
  subscriptions,
  visits,
  packages,
  categories,
  coverageAreas,
  employees,
  pricing = [],
  paymentMethods = [],
  onLogout,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onCreateSubscription
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'visits' | 'vehicles' | 'profile'>('subscriptions');
  const [showSubModal, setShowSubModal] = useState(false);

  // Find the live customer object
  const customerId = currentUser.customer_id || currentUser.id;
  const currentCustomer = customers.find((c) => c.id === customerId) || currentUser.customer_data;

  // Filter items belonging to this customer
  const myVehicles = vehicles.filter((v) => v.customer_id === customerId);
  const mySubscriptions = subscriptions.filter((s) => s.customer_id === customerId);
  const mySubscriptionIds = new Set(mySubscriptions.map((s) => s.id));
  const myVisits = visits.filter((v) => mySubscriptionIds.has(v.subscription_id));

  // Customer area name
  const area = coverageAreas.find((a) => a.id === currentCustomer?.area_id);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    vehicle_type: '',
    color: '',
    plate_number: '',
    vehicle_image_url: ''
  });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);
  const [vehicleMsg, setVehicleMsg] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Extract distinct vehicle types and colors for autocomplete
  const uniqueVehicleTypes = Array.from(
    new Set(vehicles.map((v) => (v.vehicle_type || (v as any).type || '').trim()).filter(Boolean) as string[])
  ).sort();

  const uniqueVehicleColors = Array.from(
    new Set(vehicles.map((v) => (v.color || '').trim()).filter(Boolean) as string[])
  ).sort();

  // Handle uploading/replacing image for new vehicle
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', newVehicle.vehicle_image_url);
      setNewVehicle((prev) => ({ ...prev, vehicle_image_url: uploadedUrl }));
    } catch (err: any) {
      alert('فشل حفظ الصورة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setNewVehicle((prev) => ({ ...prev, vehicle_image_url: '' }));
  };

  // Handle updating/replacing image for existing vehicle
  const handleUpdateExistingVehicleImage = async (
    vehicleId: string,
    file: File,
    currentImgUrl?: string
  ) => {
    try {
      setUpdatingVehicleId(vehicleId);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', currentImgUrl);
      if (onUpdateVehicle) {
        await onUpdateVehicle(vehicleId, {
          vehicle_image_url: uploadedUrl,
          image_url: uploadedUrl
        });
      } else {
        await api.updateVehicle(vehicleId, {
          vehicle_image_url: uploadedUrl,
          image_url: uploadedUrl
        });
      }
      setVehicleMsg('تم تحديث صورة السيارة بنجاح!');
      setTimeout(() => setVehicleMsg(null), 3500);
    } catch (err: any) {
      alert('فشل تحديث صورة السيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate_number.trim()) {
      alert('يرجى إدخال رقم اللوحة');
      return;
    }

    try {
      setIsAddingVehicle(true);
      await onCreateVehicle({
        customer_id: customerId,
        vehicle_type: newVehicle.vehicle_type.trim(),
        color: newVehicle.color.trim(),
        plate_number: newVehicle.plate_number.trim(),
        vehicle_image_url: newVehicle.vehicle_image_url || undefined,
        image_url: newVehicle.vehicle_image_url || undefined
      });
      setNewVehicle({ vehicle_type: '', color: '', plate_number: '', vehicle_image_url: '' });
      setVehicleMsg('تمت إضافة السيارة بنجاح!');
      setTimeout(() => setVehicleMsg(null), 3500);
    } catch (err: any) {
      alert('فشل إضافة السيارة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsAddingVehicle(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl sticky top-0 z-30 border-b border-teal-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.company_name}
                className="w-10 h-10 rounded-xl object-cover border border-teal-400/40 shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center font-bold text-white shadow">
                WC
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight">{settings.company_name}</h1>
              <p className="text-[11px] text-teal-300/80 font-medium">بوابة العميل الذكية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-xs">
              <User className="w-3.5 h-3.5 text-teal-300" />
              <span className="font-bold">{currentUser.full_name}</span>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded font-medium">عميل</span>
            </div>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome & Stats Banner */}
        <div className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-700/50 rounded-full text-xs text-teal-200 font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>أهلاً وسهلاً بك في وي كير</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">{currentUser.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-teal-100/80 mt-2 font-medium">
                {area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{area.name}</span>
                  </span>
                )}
                {currentCustomer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-teal-400" />
                    <span dir="ltr">{currentCustomer.phone}</span>
                  </span>
                )}
                {currentCustomer?.building_number && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-teal-400" />
                    <span>عمارة {currentCustomer.building_number} {currentCustomer.block_number ? `(مجموعة ${currentCustomer.block_number})` : ''}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Counters */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-white">{mySubscriptions.length}</div>
                <div className="text-[11px] text-teal-200 font-bold mt-0.5">اشتراكاتي</div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  {myVisits.filter((v) => v.status === 'completed').length}
                </div>
                <div className="text-[11px] text-teal-200 font-bold mt-0.5">غسلات مكتملة</div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-sky-400">{myVehicles.length}</div>
                <div className="text-[11px] text-teal-200 font-bold mt-0.5">سياراتي</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>اشتراكاتي ({mySubscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'visits'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>مواعيد وزيارات الغسيل ({myVisits.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>سياراتي ({myVehicles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>بيانات حسابي</span>
          </button>
        </div>

        {/* Tab Content */}
        {/* ===================== 1. SUBSCRIPTIONS TAB ===================== */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">قائمة الاشتراكات الحالية والسابقة</h3>
              <button
                onClick={() => setShowSubModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب اشتراك جديد</span>
              </button>
            </div>

            {mySubscriptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد اشتراكات مسجلة حالياً</h4>
                <p className="text-xs text-slate-400 mt-1">تواصل مع إدارة النظام أو اضغط طلب اشتراك جديد لبدء باقتك</p>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  + طلب اشتراك جديد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mySubscriptions.map((sub) => {
                  const pkg = packages.find((p) => p.id === sub.package_id);
                  const veh = vehicles.find((v) => v.id === sub.vehicle_id);
                  const worker = employees.find((e) => e.id === sub.assigned_worker_id);

                  const statusBadge = () => {
                    switch (sub.status) {
                      case 'active':
                        return <span className="bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2.5 py-1 rounded-full">نشط</span>;
                      case 'pending':
                        return <span className="bg-amber-100 text-amber-800 font-bold text-[11px] px-2.5 py-1 rounded-full">قيد المراجعة</span>;
                      case 'expired':
                        return <span className="bg-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 rounded-full">منتهي</span>;
                      case 'cancelled':
                        return <span className="bg-rose-100 text-rose-800 font-bold text-[11px] px-2.5 py-1 rounded-full">ملغي</span>;
                      default:
                        return <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-full">{sub.status}</span>;
                    }
                  };

                  return (
                    <div key={sub.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 relative hover:border-teal-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                            {pkg?.name || 'باقة غسيل'}
                          </span>
                          <h4 className="text-sm font-black text-slate-800 mt-1">
                            {sub.preferred_day_of_week ? `يوم: ${sub.preferred_day_of_week}` : ''} ({sub.preferred_time_from || ''} - {sub.preferred_time_to || ''})
                          </h4>
                        </div>
                        {statusBadge()}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">تاريخ البدء:</span>
                          <span className="font-bold text-slate-700">{sub.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">تاريخ الانتهاء:</span>
                          <span className="font-bold text-slate-700">{sub.end_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">السيارة:</span>
                          <span className="font-bold text-slate-700">
                            {veh ? `${veh.vehicle_type} (${veh.plate_number})` : 'غير محدد'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">الفني المسؤول:</span>
                          <span className="font-bold text-slate-700">{worker?.full_name || 'بانتظار التعيين'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-800">
                          الإجمالي: {sub.total_price} {settings.currency_symbol || 'ج.م'}
                        </span>
                        <span className={`text-[11px] font-bold ${sub.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sub.payment_status === 'paid' ? 'تم السداد بالكامل ✓' : 'متبقي سداد'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== 2. VISITS TAB ===================== */}
        {activeTab === 'visits' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-slate-800">جدول مواعيد وزيارات الغسيل</h3>

            {myVisits.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">لا توجد زيارات مسجلة لاشتراكاتك حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">تاريخ الزيارة</th>
                      <th className="p-3">حالة الزيارة</th>
                      <th className="p-3">الفني المسؤول</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myVisits.map((vis) => {
                      const worker = employees.find((e) => e.id === (vis.assigned_worker_id || (vis as any).worker_id));
                      return (
                        <tr key={vis.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-800">
                            {vis.scheduled_date || (vis as any).visit_date}
                            {vis.scheduled_time_from && (
                              <span className="text-[10px] text-slate-500 font-normal mr-1.5 block">
                                {vis.scheduled_time_from} {vis.scheduled_time_to ? `- ${vis.scheduled_time_to}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {vis.status === 'completed' && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                تمت بنجاح ✓
                              </span>
                            )}
                            {vis.status === 'scheduled' && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                قيد الانتظار
                              </span>
                            )}
                            {vis.status === 'cancelled' && (
                              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                                ملغاة
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">{worker?.full_name || 'فني الخدمة'}</td>
                          <td className="p-3 text-slate-500">{vis.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== 3. VEHICLES TAB ===================== */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Registered Vehicles List */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-800">المركبات المسجلة بحسابي</h3>

              {myVehicles.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">لم تسجل أي سيارة بعد. يمكنك إضافة سيارتك بالأسفل.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {myVehicles.map((v) => {
                    const carImg = v.vehicle_image_url || v.image_url;
                    const isUpdatingThis = updatingVehicleId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="p-4 bg-teal-50/40 rounded-2xl border border-teal-100 flex flex-col justify-between gap-3 shadow-2xs hover:border-teal-300 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          {carImg ? (
                            <div
                              className="relative w-16 h-16 rounded-xl overflow-hidden border border-teal-200 shrink-0 shadow-xs cursor-pointer group/img"
                              onClick={() => setExpandedImage(carImg)}
                              title="اضغط لتكبير صورة السيارة"
                            >
                              <img
                                src={carImg}
                                alt="صورة السيارة"
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                              <Car className="w-8 h-8" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-800 truncate">{v.vehicle_type || 'سيارة'}</div>
                            <div className="text-[11px] text-slate-500">اللون: {v.color || 'غير محدد'}</div>
                            <div className="text-xs font-black text-teal-800 font-mono mt-0.5">{v.plate_number}</div>
                          </div>

                          {onDeleteVehicle && (
                            <button
                              onClick={() => onDeleteVehicle(v.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="حذف المركبة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Replace / Add Photo Action Button */}
                        <div className="pt-2 border-t border-teal-100/60 flex items-center justify-between">
                          <label className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all">
                            {isUpdatingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                <span>جاري حفظ الصورة...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-3.5 h-3.5 text-teal-600" />
                                <span>{carImg ? 'استبدال الصورة' : 'إضافة صورة للسيارة'}</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUpdatingThis}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpdateExistingVehicleImage(v.id, f, carImg);
                                if (e.target) e.target.value = '';
                              }}
                            />
                          </label>

                          {carImg && (
                            <button
                              type="button"
                              onClick={() => setExpandedImage(carImg)}
                              className="text-[11px] text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                            >
                              عرض مكبر
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Vehicle Form */}
            <form onSubmit={handleAddVehicle} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>إضافة سيارة جديدة للحساب</span>
              </h4>

              {vehicleMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{vehicleMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع السيارة</label>
                  <input
                    type="text"
                    list="portal-vehicle-types"
                    placeholder="مرسيدس / هيونداي"
                    value={newVehicle.vehicle_type}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <datalist id="portal-vehicle-types">
                    {uniqueVehicleTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللون</label>
                  <input
                    type="text"
                    list="portal-vehicle-colors"
                    placeholder="أسود / أبيض"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <datalist id="portal-vehicle-colors">
                    {uniqueVehicleColors.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    placeholder="س ص ع 1234"
                    value={newVehicle.plate_number}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                    <span>صورة السيارة (اختياري)</span>
                  </span>
                  {newVehicle.vehicle_image_url && (
                    <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      ✓ تم تحديد صورة
                    </span>
                  )}
                </label>

                {newVehicle.vehicle_image_url ? (
                  <div className="p-2 bg-teal-50/40 rounded-2xl border border-teal-200 max-w-sm">
                    <div className="relative rounded-xl overflow-hidden border border-teal-200 shadow-xs">
                      <img
                        src={newVehicle.vehicle_image_url}
                        alt="صورة السيارة"
                        onClick={() => setExpandedImage(newVehicle.vehicle_image_url)}
                        className="w-full h-36 object-cover cursor-pointer"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex-1 py-1.5 px-3 bg-white hover:bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-teal-200 shadow-2xs transition-all">
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-teal-600" />
                            <span>استبدال الصورة</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingImage}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`w-full max-w-sm p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isUploadingImage
                      ? 'border-teal-400 bg-teal-50/50'
                      : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/20 bg-slate-50/50'
                  }`}>
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                        <span className="text-xs font-bold text-teal-700">جاري تحميل وحفظ الصورة...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">اضغط لاختيار أو التقاط صورة للسيارة</span>
                        <span className="text-[10px] text-slate-400">يدعم كافة صيغ الصور الشائعة</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isAddingVehicle || isUploadingImage}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50"
              >
                {isAddingVehicle ? 'جاري الحفظ...' : '+ حفظ السيارة'}
              </button>
            </form>
          </div>
        )}

        {/* ===================== 4. PROFILE TAB ===================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>بيانات العميل الشخصية ومكان الخدمة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{currentCustomer?.full_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">رقم الموبايل:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block" dir="ltr">{currentCustomer?.phone}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">اسم المستخدم للدخول:</span>
                <span className="font-bold text-teal-700 text-sm mt-0.5 block">{currentCustomer?.username || currentCustomer?.phone}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">المنطقة / الكمبوند:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{area?.name || 'غير محدد'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">العمارة والمجموعة:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  عمارة {currentCustomer?.building_number} - مجموعة {currentCustomer?.block_number || 'A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">العنوان التفصيلي:</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{currentCustomer?.detailed_address || 'لم يحدد'}</span>
              </div>

              {currentCustomer?.location_url && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">موقع الخريطة (GPS):</span>
                  <a
                    href={currentCustomer.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 mt-1 text-xs"
                  >
                    <span>فتح الموقع في خرائط Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Subscription Modal for Customer */}
      {showSubModal && (
        <CreateSubscriptionModal
          isOpen={showSubModal}
          onClose={() => setShowSubModal(false)}
          customers={customers}
          vehicles={myVehicles}
          packages={packages}
          categories={categories}
          coverageAreas={coverageAreas}
          pricing={pricing}
          employees={employees}
          settings={settings}
          paymentMethods={paymentMethods}
          canOverridePrice={false}
          onCreateSubscription={async (s) => {
            if (onCreateSubscription) {
              const res = await onCreateSubscription(s);
              setShowSubModal(false);
              return res;
            }
            throw new Error('غير متاح');
          }}
          onCreateVehicle={onCreateVehicle}
        />
      )}
      {/* Vehicle Image Zoom Lightbox */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={expandedImage}
              alt="صورة السيارة مكبرة"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
