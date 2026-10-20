import React, { useState, useEffect } from 'react';
import {
  Subscription,
  Customer,
  Vehicle,
  Package,
  CoverageArea,
  Employee,
  Settings,
  PackageCategory,
  PaymentMethod
} from '../types/database';
import * as api from '../services/api';
import {
  Plus,
  CheckCircle2,
  Clock,
  User,
  Car,
  Search,
  MapPin,
  Check,
  ChevronDown,
  Lock,
  CreditCard,
  UserPlus,
  HelpCircle,
  AlertCircle,
  X,
  LocateFixed,
  ExternalLink,
  FileText,
  Camera,
  Loader2,
  Image as ImageIcon,
  UserCheck,
  ZoomIn,
  ShieldCheck
} from 'lucide-react';
import { uploadStorageAsset } from '../utils/imageStorage';

export interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  pricing?: any[];
  employees: Employee[];
  settings: Settings;
  paymentMethods?: PaymentMethod[];
  canOverridePrice?: boolean;
  preselectedCustomer?: Customer;
  defaultCategoryType?: 'cars' | 'buildings' | 'public' | 'all';
  onCreateSubscription: (subscription: Omit<Subscription, 'id' | 'status' | 'created_at'>) => Promise<Subscription>;
  onCreateCustomer?: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
  onCreateVehicle?: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => Promise<Vehicle>;
}

const ARABIC_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const getArabDayIndex = (day: string): number => {
  switch (day.trim()) {
    case 'السبت': return 0;
    case 'الأحد': return 1;
    case 'الإثنين':
    case 'الاثنين': return 2;
    case 'الثلاثاء': return 3;
    case 'الأربعاء':
    case 'الاربعاء': return 4;
    case 'الخميس': return 5;
    case 'الجمعة': return 6;
    default: return 0;
  }
};

const DEFAULT_DAY_SUGGESTIONS: Record<number, string[]> = {
  1: ['السبت'],
  2: ['الأحد', 'الأربعاء'],
  3: ['الأحد', 'الثلاثاء', 'الخميس'],
  4: ['السبت', 'الإثنين', 'الأربعاء', 'الجمعة'],
  5: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  6: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  7: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
};

export const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
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
  preselectedCustomer,
  defaultCategoryType = 'all',
  onCreateSubscription,
  onCreateCustomer,
  onCreateVehicle
}) => {
  const [customerSearchQuery, setCustomerSearchQuery] = useState(
    preselectedCustomer ? `${preselectedCustomer.full_name} (${preselectedCustomer.phone})` : ''
  );
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Local additions to immediately reflect newly created customers and vehicles
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>([]);

  // Confirmation prompt modal: "الرقم المسجل غير موجود في بيانات العملاء هل ترغب في اضافته كعميل جديد؟"
  const [showConfirmNewCustomerModal, setShowConfirmNewCustomerModal] = useState(false);
  const [unmatchedPhoneQuery, setUnmatchedPhoneQuery] = useState('');

  // Customer registration modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);
  const [isLocatingNewCust, setIsLocatingNewCust] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [enlargedWorker, setEnlargedWorker] = useState<Employee | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultCategoryType === 'cars') {
        const match = categories.find((c) => {
          const n = (c.name || '').toLowerCase();
          return n.includes('سيارات') || n.includes('سيارة') || n.includes('car');
        });
        setSelectedCategory(match ? match.id : 'all');
      } else if (defaultCategoryType === 'buildings') {
        const match = categories.find((c) => {
          const n = (c.name || '').toLowerCase();
          return n.includes('عمارات') || n.includes('عمارة') || n.includes('مباني') || n.includes('building');
        });
        setSelectedCategory(match ? match.id : 'all');
      } else if (defaultCategoryType === 'public') {
        const match = categories.find((c) => {
          const n = (c.name || '').toLowerCase();
          return n.includes('عامة') || n.includes('خدمات عامة') || n.includes('public');
        });
        setSelectedCategory(match ? match.id : 'all');
      } else {
        setSelectedCategory('all');
      }
    }
  }, [isOpen, defaultCategoryType, categories]);
  const [isUploadingNewCustCarImg, setIsUploadingNewCustCarImg] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '',
    phone: '',
    area_id: '',
    building_number: '',
    block_number: 'A',
    detailed_address: '',
    location_url: '',
    include_vehicle: true,
    vehicle_type: '',
    color: '',
    plate_number: '',
    vehicle_image_url: '',
    username: '',
    password: '123456'
  });

  const [formData, setFormData] = useState({
    customer_id: preselectedCustomer?.id || '',
    vehicle_id: vehicles.find((v) => v.customer_id === preselectedCustomer?.id)?.id || '',
    package_id: '',
    area_id: preselectedCustomer?.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : ''),
    assigned_worker_id: '',
    preferred_day_of_week: '',
    preferred_time_from: '',
    preferred_time_to: '',
    start_date: new Date().toISOString().split('T')[0],
    total_price: '' as string | number,
    notes: '',
    payment_method_id: ''
  });

  // قائمة أيام الزيارة الأسبوعية المختارة للعميل (مطابقة لـ weekly_visits_count)
  const [selectedDays, setSelectedDays] = useState<string[]>(['الأحد', 'الثلاثاء', 'الخميس']);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate matching price based on package and customer area
  const getAutoPrice = (pkgId: string, areaId: string): number | '' => {
    if (!pkgId) return '';
    if (areaId && pricing && pricing.length > 0) {
      const match = pricing.find((pr) => pr.package_id === pkgId && pr.area_id === areaId);
      if (match && match.price > 0) return match.price;
    }
    const anyMatch = pricing?.find((pr) => pr.package_id === pkgId && pr.price > 0);
    if (anyMatch) return anyMatch.price;
    return '';
  };

  // Combined customers and vehicles (combines props with locally created items)
  const allCustomers = [
    ...localCustomers.filter((lc) => !customers.some((c) => c.id === lc.id)),
    ...customers
  ];
  const allVehicles = [
    ...localVehicles.filter((lv) => !vehicles.some((v) => v.id === lv.id)),
    ...vehicles
  ];

  // Distinct vehicle types and colors for autocomplete suggestions
  const uniqueVehicleTypes = Array.from(
    new Set(allVehicles.map((v) => (v.vehicle_type || (v as any).type || '').trim()).filter(Boolean) as string[])
  ).sort();

  const uniqueVehicleColors = Array.from(
    new Set(allVehicles.map((v) => (v.color || '').trim()).filter(Boolean) as string[])
  ).sort();

  const handlePromptNewCustomer = (query: string) => {
    setUnmatchedPhoneQuery(query.trim());
    setIsCustomerDropdownOpen(false);
    setShowConfirmNewCustomerModal(true);
  };

  const handleGetNewCustomerGPS = () => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم خاصية تحديد الموقع الجغرافي (GPS)');
      return;
    }
    setIsLocatingNewCust(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setNewCustomerForm((prev) => ({ ...prev, location_url: mapsUrl }));
        setIsLocatingNewCust(false);
      },
      (err) => {
        alert('تعذر جلب الموقع الجغرافي: ' + (err.message || 'يرجى التأكد من تفعيل أذونات الموقع'));
        setIsLocatingNewCust(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenNewCustomerModal = (phoneOrQuery?: string) => {
    const rawVal = (phoneOrQuery || unmatchedPhoneQuery || customerSearchQuery).trim();
    const digitsOnly = rawVal.replace(/[^\d+]/g, '');
    const isMainlyDigits = digitsOnly.length >= 3;

    const targetPhone = digitsOnly || (isMainlyDigits ? rawVal : '');
    setNewCustomerForm({
      full_name: !isMainlyDigits ? rawVal : '',
      phone: targetPhone,
      area_id: formData.area_id || (coverageAreas[0]?.id || ''),
      building_number: '',
      block_number: 'A',
      detailed_address: '',
      location_url: '',
      include_vehicle: true,
      vehicle_type: '',
      color: '',
      plate_number: '',
      vehicle_image_url: '',
      username: targetPhone,
      password: '123456'
    });

    setShowConfirmNewCustomerModal(false);
    setIsCustomerDropdownOpen(false);
    setShowNewCustomerModal(true);
  };

  const handleNewCustCarImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingNewCustCarImg(true);
      const uploadedUrl = await uploadStorageAsset(file, 'vehicles', newCustomerForm.vehicle_image_url);
      setNewCustomerForm((prev) => ({ ...prev, vehicle_image_url: uploadedUrl }));
    } catch (err: any) {
      alert('فشل حفظ الصورة: ' + (err.message || 'حدث خطأ'));
    } finally {
      setIsUploadingNewCustCarImg(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.full_name.trim() || !newCustomerForm.phone.trim() || !newCustomerForm.area_id) {
      alert('يرجى إدخال اسم العميل الكامل، رقم الموبايل، وتحديد المنطقة/الكمبوند');
      return;
    }

    try {
      setIsSavingNewCustomer(true);
      const custPayload: Omit<Customer, 'id' | 'created_at'> = {
        full_name: newCustomerForm.full_name.trim(),
        phone: newCustomerForm.phone.trim(),
        area_id: newCustomerForm.area_id,
        building_number: newCustomerForm.building_number.trim() || '1',
        block_number: newCustomerForm.block_number.trim() || 'A',
        detailed_address: newCustomerForm.detailed_address.trim(),
        location_url: newCustomerForm.location_url.trim(),
        username: newCustomerForm.username?.trim() || newCustomerForm.phone.trim(),
        password_hash: btoa(newCustomerForm.password?.trim() || '123456'),
        status: 'active'
      };

      let createdCust: Customer;
      if (onCreateCustomer) {
        createdCust = await onCreateCustomer(custPayload);
      } else {
        createdCust = await api.createCustomer(custPayload);
      }

      setLocalCustomers((prev) => [createdCust, ...prev]);

      let createdVeh: Vehicle | undefined;
      if (newCustomerForm.include_vehicle && newCustomerForm.plate_number.trim()) {
        const vehPayload: Omit<Vehicle, 'id' | 'created_at'> = {
          customer_id: createdCust.id,
          vehicle_type: newCustomerForm.vehicle_type.trim(),
          color: newCustomerForm.color.trim(),
          plate_number: newCustomerForm.plate_number.trim(),
          vehicle_image_url: newCustomerForm.vehicle_image_url || undefined,
          image_url: newCustomerForm.vehicle_image_url || undefined
        };
        if (onCreateVehicle) {
          createdVeh = await onCreateVehicle(vehPayload);
        } else {
          createdVeh = await api.createVehicle(vehPayload);
        }
        if (createdVeh) {
          setLocalVehicles((prev) => [createdVeh!, ...prev]);
        }
      }

      // تلقائياً: تعيين العميل الجديد المضاف لاكمال الاشتراك مباشرة
      const newAreaId = createdCust.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : '');
      const newPrice = formData.package_id ? getAutoPrice(formData.package_id, newAreaId) : formData.total_price;

      setFormData((prev) => ({
        ...prev,
        customer_id: createdCust.id,
        area_id: newAreaId,
        vehicle_id: createdVeh?.id || '',
        total_price: newPrice !== '' ? newPrice : prev.total_price
      }));

      setCustomerSearchQuery(`${createdCust.full_name} (${createdCust.phone})`);
      setIsCustomerDropdownOpen(false);
      setShowNewCustomerModal(false);
      setShowConfirmNewCustomerModal(false);
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ بيانات العميل: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSavingNewCustomer(false);
    }
  };

  const handleSelectCustomer = (cust: Customer) => {
    const custVehicles = allVehicles.filter((v) => v.customer_id === cust.id);
    const newAreaId = cust.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : '');
    const newPrice = formData.package_id ? getAutoPrice(formData.package_id, newAreaId) : formData.total_price;

    setFormData((prev) => ({
      ...prev,
      customer_id: cust.id,
      area_id: newAreaId,
      vehicle_id: custVehicles[0]?.id || '',
      total_price: newPrice !== '' ? newPrice : prev.total_price
    }));

    setCustomerSearchQuery(`${cust.full_name} (${cust.phone})`);
    setIsCustomerDropdownOpen(false);
  };

  const handlePackageChange = (packageId: string) => {
    const newPrice = getAutoPrice(packageId, formData.area_id);
    const chosenPkg = packages.find((p) => p.id === packageId);
    const requiredWeeklyVisits = chosenPkg?.weekly_visits_count || (chosenPkg?.base_visits_count ? Math.min(chosenPkg.base_visits_count, 7) : 1);

    // ضبط الأيام الافتراضية المناسبة لعدد الزيارات الأسبوعية للباقة
    if (selectedDays.length !== requiredWeeklyVisits) {
      setSelectedDays(DEFAULT_DAY_SUGGESTIONS[requiredWeeklyVisits] || ARABIC_DAYS.slice(0, requiredWeeklyVisits));
    }

    setFormData((prev) => ({
      ...prev,
      package_id: packageId,
      total_price: newPrice !== '' ? newPrice : prev.total_price
    }));
  };

  const toggleDaySelection = (day: string) => {
    const targetCount = selectedPkg?.weekly_visits_count || (selectedPkg?.base_visits_count ? Math.min(selectedPkg.base_visits_count, 7) : 1);
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      if (selectedDays.length >= targetCount) {
        alert(`باقة "${selectedPkg?.name || ''}" مخصصة لـ ${targetCount} زيارات في الأسبوع فقط. يرجى إلغاء تفعيل يوم أولاً لاختيار يوم بديل.`);
        return;
      }
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAreaChange = (areaId: string) => {
    const newPrice = formData.package_id ? getAutoPrice(formData.package_id, areaId) : formData.total_price;
    setFormData((prev) => ({
      ...prev,
      area_id: areaId,
      total_price: newPrice !== '' ? newPrice : prev.total_price
    }));
  };

  const selectedCustomer = allCustomers.find((c) => c.id === formData.customer_id);
  const selectedCustomerArea = coverageAreas.find((a) => a.id === (selectedCustomer?.area_id || formData.area_id));
  const selectedCustomerVehicles = allVehicles.filter((v) => v.customer_id === formData.customer_id);

  const autocompleteCustomers = allCustomers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.building_number && c.building_number.includes(q))
    );
  });

  const selectedPkg = packages.find((p) => p.id === formData.package_id);
  const selectedPkgCategory = categories.find((c) => c.id === selectedPkg?.category_id);
  const isBuildingPackage =
    defaultCategoryType === 'buildings' ||
    Boolean(
      selectedPkgCategory?.name.includes('عمارات') ||
      selectedPkgCategory?.name.includes('عمارة') ||
      selectedPkgCategory?.name.includes('مباني') ||
      selectedPkg?.name.includes('عمارة')
    );
  const isPublicPackage =
    defaultCategoryType === 'public' ||
    Boolean(
      selectedPkgCategory?.name.includes('خدمات عامة') ||
      selectedPkgCategory?.name.includes('عامة') ||
      selectedPkg?.name.includes('خدمات عامة')
    );
  const requiresVehicle = !isBuildingPackage && !isPublicPackage;

  const targetWeeklyVisits = selectedPkg?.weekly_visits_count || (selectedPkg?.base_visits_count ? Math.min(selectedPkg.base_visits_count, 7) : 1);
  const sortedSelectedDays = [...selectedDays].sort((a, b) => getArabDayIndex(a) - getArabDayIndex(b));
  const packageServicesPlan = selectedPkg?.weekly_services_plan && selectedPkg.weekly_services_plan.length > 0
    ? selectedPkg.weekly_services_plan
    : ['غسيل'];

  const handleSaveSubscription = async (paymentStatus: 'paid' | 'unpaid') => {
    if (!formData.customer_id || !formData.package_id) {
      alert('يرجى اختيار العميل والباقة أولاً');
      return;
    }

    if (selectedDays.length !== targetWeeklyVisits) {
      alert(`يرجى تحديد بالضبط ${targetWeeklyVisits} أيام في الأسبوع حسب زيارات باقة (${selectedPkg?.name || ''}). تم تحديد ${selectedDays.length} أيام حالياً.`);
      return;
    }

    if (paymentStatus === 'paid' && !formData.payment_method_id) {
      alert('عند اختيار تأكيد الدفع الفوري، يجب اختيار طريقة الدفع لإيداع المبلغ بالخزينة.');
      return;
    }

    try {
      setIsSubmitting(true);
      const durationDays = selectedPkg?.duration_days || 30;
      const start = new Date(formData.start_date || new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + durationDays);
      const endDateStr = end.toISOString().split('T')[0];

      const effectiveAreaId = formData.area_id || selectedCustomer?.area_id || (coverageAreas.length > 0 ? coverageAreas[0].id : '');

      await onCreateSubscription({
        customer_id: formData.customer_id,
        vehicle_id: requiresVehicle ? (formData.vehicle_id || null) : null,
        package_id: formData.package_id,
        area_id: effectiveAreaId,
        assigned_worker_id: formData.assigned_worker_id || null,
        preferred_day_of_week: sortedSelectedDays.join('، '),
        selected_days: sortedSelectedDays,
        preferred_time_from: formData.preferred_time_from,
        preferred_time_to: formData.preferred_time_to,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        end_date: endDateStr,
        total_price: Number(formData.total_price),
        notes: formData.notes,
        payment_status: paymentStatus,
        payment_method_id: paymentStatus === 'paid' ? formData.payment_method_id : null,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : undefined
      });

      if (paymentStatus === 'paid') {
        alert('تم إنشاء الاشتراك وتأكيد الدفع بنجاح وإيداع المبلغ في الخزينة المحددة.');
      } else if (preselectedCustomer) {
        alert('تم تسجيل طلب اشتراكك بنجاح وهو الآن قيد مراجعة واعتماد الإدارة.');
      } else {
        alert('تم حفظ الاشتراك كدفع مؤجل (غير مسدد) وهو الآن قيد المراجعة.');
      }

      // Reset form
      setFormData({
        customer_id: '',
        vehicle_id: '',
        package_id: '',
        area_id: '',
        assigned_worker_id: '',
        preferred_day_of_week: '',
        preferred_time_from: '',
        preferred_time_to: '',
        start_date: new Date().toISOString().split('T')[0],
        total_price: '',
        notes: '',
        payment_method_id: ''
      });
      setCustomerSearchQuery('');
      setIsCustomerDropdownOpen(false);
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ الاشتراك: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {preselectedCustomer ? 'طلب اشتراك جديد' : 'إنشاء اشتراك جديد للعميل'}
              </h3>
              <p className="text-xs text-slate-500">
                {preselectedCustomer
                  ? 'اختر الباقة المناسبة واليوم المفضل لتقديم طلب الاشتراك'
                  : 'تسجيل طلب اشتراك جديد لمراجعته واعتماده من قبل الإدارة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {/* 1. Customer Autocomplete Section (Hidden if preselectedCustomer is given) */}
          {!preselectedCustomer && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>اسم أو هاتف العميل (إكمال وبحث تلقائي) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenNewCustomerModal()}
                  className="text-[11px] text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ تسجيل عميل جديد</span>
                </button>
              </div>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="ابحث باسم العميل أو رقم الموبايل أو العمارة..."
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (autocompleteCustomers.length === 0 && customerSearchQuery.trim()) {
                      handlePromptNewCustomer(customerSearchQuery);
                    }
                  }
                }}
                onBlur={() => {
                  const digits = customerSearchQuery.replace(/\D/g, '');
                  if (digits.length >= 7) {
                    const matchExists = allCustomers.some((c) => (c.phone || '').replace(/\D/g, '').includes(digits));
                    if (!matchExists && !formData.customer_id) {
                      handlePromptNewCustomer(customerSearchQuery);
                    }
                  }
                }}
                className="w-full pr-10 pl-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <button
                type="button"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown List */}
            {isCustomerDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsCustomerDropdownOpen(false)}
                />
                <div className="absolute z-20 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                  {autocompleteCustomers.length === 0 ? (
                    <div className="p-5 text-center space-y-3 bg-amber-50/40 rounded-2xl border border-amber-100 m-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">
                          الرقم المسجل غير موجود في بيانات العملاء
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          هل ترغب في اضافته كعميل جديد؟
                        </p>
                        {customerSearchQuery && (
                          <div className="font-mono text-xs font-bold text-teal-700 pt-0.5">
                            {customerSearchQuery}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenNewCustomerModal(customerSearchQuery)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>نعم، إضافة كعميل جديد</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {autocompleteCustomers.map((cust) => {
                        const isSelected = cust.id === formData.customer_id;
                        const custArea = coverageAreas.find((a) => a.id === cust.area_id);
                        return (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => handleSelectCustomer(cust)}
                            className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50 text-teal-900 border border-teal-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {cust.full_name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                  <span>{cust.full_name}</span>
                                  {custArea && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                      {custArea.name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  هاتف: {cust.phone} | عمارة: {cust.building_number || '-'}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          )}

          {/* 2. Customer Full Details Card (Appears when customer is selected) */}
          {selectedCustomer && (
            <div className="p-4 bg-gradient-to-r from-teal-50/70 via-sky-50/40 to-slate-50 border border-teal-200/80 rounded-2xl animate-fadeIn space-y-3">
              <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {selectedCustomer.full_name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{selectedCustomer.full_name}</span>
                    <span className="text-[11px] text-teal-700 font-medium mr-2 font-mono">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                  بيانات العميل المعتمدة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-slate-400 font-medium block">منطقة الإقامة / الكمبوند:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                    <span className="truncate">{selectedCustomerArea?.name || 'غير محدد'}</span>
                  </span>
                </div>

                <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-slate-400 font-medium block">رقم العمارة:</span>
                  <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                    {selectedCustomer.building_number || '-'}
                  </span>
                </div>

                <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-slate-400 font-medium block">المربع / Block:</span>
                  <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                    {selectedCustomer.block || selectedCustomer.block_number || '-'}
                  </span>
                </div>

                <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-slate-400 font-medium block">المركبات المسجلة:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Car className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{selectedCustomerVehicles.length} مركبة</span>
                  </span>
                </div>

                {(selectedCustomer.detailed_address || selectedCustomer.location_url) && (
                  <div className="col-span-2 sm:col-span-4 bg-white/90 p-2.5 rounded-xl border border-teal-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {selectedCustomer.detailed_address && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="font-medium">العنوان التفصيلي: {selectedCustomer.detailed_address}</span>
                      </div>
                    )}
                    {selectedCustomer.location_url && (
                      <a
                        href={selectedCustomer.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>موقع العميل على الخريطة</span>
                        <ExternalLink className="w-3 h-3 text-emerald-500" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Subscription Category Selection */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              تصنيف الخدمة / نوع الاشتراك *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setFormData((prev) => ({ ...prev, package_id: '' }));
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                  selectedCategory === 'all'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                جميع التصنيفات
              </button>
              {categories
                .filter((cat) => cat.is_active !== false)
                .map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setFormData((prev) => ({ ...prev, package_id: '' }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Subscription Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Select Package */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الباقة المطلوبة *</label>
              <select
                required
                value={formData.package_id}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">اختر الباقة...</option>
                {packages
                  .filter((p) => (p.is_active !== false || p.id === formData.package_id) && (selectedCategory === 'all' || p.category_id === selectedCategory))
                  .map((p) => {
                    const previewPrice = formData.area_id ? getAutoPrice(p.id, formData.area_id) : '';
                    return (
                      <option key={p.id} value={p.id} disabled={p.is_active === false}>
                        {p.name} ({p.base_visits_count} زيارات) {previewPrice ? `- ${previewPrice} ${settings.currency_symbol}` : ''} {p.is_active === false ? ' (غير نشطة)' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Coverage Area Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>منطقة التسعير والخدمة *</span>
                {preselectedCustomer ? (
                  <span className="text-[10px] text-slate-500 font-normal">منطقة سكن العميل (مثبتة)</span>
                ) : (
                  <span className="text-[10px] text-teal-600 font-normal">مربوطة بأسعار المنطقة</span>
                )}
              </label>
              <select
                required
                disabled={Boolean(preselectedCustomer && preselectedCustomer.area_id)}
                value={formData.area_id}
                onChange={(e) => handleAreaChange(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl font-bold border ${
                  preselectedCustomer && preselectedCustomer.area_id
                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-teal-500'
                }`}
              >
                <option value="">اختر المنطقة / الكمبوند...</option>
                {coverageAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection - Only for Car Packages */}
            {requiresVehicle && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مركبة العميل *
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="">اختر مركبة العميل...</option>
                  {allVehicles
                    .filter((v) => v.customer_id === formData.customer_id)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_type} - {v.color} ({v.plate_number})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Assigned Worker - Hidden for Customer */}
            {!preselectedCustomer && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">العامل المسؤول المخصص</label>
                <div className="flex items-center gap-2">
                  {(() => {
                    const selWorker = employees.find((e) => e.id === formData.assigned_worker_id);
                    const photo = selWorker?.personal_image_url || selWorker?.national_id_image_url;
                    if (photo) {
                      return (
                        <div
                          onClick={() => setEnlargedWorker(selWorker!)}
                          className="relative group shrink-0 cursor-pointer"
                          title="اضغط لتكبير صورة العامل"
                        >
                          <img
                            src={photo}
                            alt={selWorker?.full_name}
                            className="w-10 h-10 rounded-xl object-cover border-2 border-teal-500 shadow-xs group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      );
                    }
                    if (selWorker) {
                      return (
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {selWorker.full_name.slice(0, 1)}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <select
                    value={formData.assigned_worker_id}
                    onChange={(e) => setFormData({ ...formData, assigned_worker_id: e.target.value })}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">تعيين تلقائي لاحقاً</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Multi-Day Selector & Dynamic Sequential Service Mapping */}
            <div className="col-span-1 sm:col-span-2 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    أيام الزيارة الأسبوعية المفضلة للعميل
                  </label>
                  <p className="text-[11px] text-slate-500">
                    اختر <strong className="text-teal-700">{targetWeeklyVisits}</strong> أيام بالأسبوع مطابقة لزيارات الباقة المختارة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      selectedDays.length === targetWeeklyVisits
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    تم اختيار {selectedDays.length} من {targetWeeklyVisits} أيام
                  </span>
                </div>
              </div>

              {/* Day Selection Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {ARABIC_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDaySelection(day)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Sequential Service Mapping Preview */}
              {selectedDays.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700">
                      الربط التتابعي لخطة الخدمات الأسبوعية (Sequential Mapping):
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      تتكرر هذه الدورة أسبوعياً بنفس النمط حتى انتهاء الاشتراك
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {sortedSelectedDays.map((day, idx) => {
                      const service = packageServicesPlan[idx % packageServicesPlan.length] || 'غسيل';
                      return (
                        <div
                          key={day}
                          className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-mono font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-black text-slate-800">{day}</span>
                          </div>
                          <span className="text-slate-400 text-[10px]">➔</span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-100">
                            {service}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Preferred Time Window */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>من الساعة</span>
                  <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
                </label>
                <input
                  type="time"
                  value={formData.preferred_time_from}
                  onChange={(e) => setFormData({ ...formData, preferred_time_from: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>إلى الساعة</span>
                  <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
                </label>
                <input
                  type="time"
                  value={formData.preferred_time_to}
                  onChange={(e) => setFormData({ ...formData, preferred_time_to: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>تاريخ بدء الاشتراك</span>
                {preselectedCustomer && (
                  <span className="text-[10px] text-slate-500 font-normal">تاريخ اليوم تلقائياً</span>
                )}
              </label>
              <input
                type="date"
                required
                readOnly={Boolean(preselectedCustomer)}
                value={formData.start_date}
                onChange={(e) => {
                  if (!preselectedCustomer) {
                    setFormData({ ...formData, start_date: e.target.value });
                  }
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl font-medium border ${
                  preselectedCustomer
                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* Total Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>إجمالي السعر المعتمد ({settings.currency_symbol}) *</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    canOverridePrice
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-600 bg-slate-100 border-slate-300'
                  }`}
                >
                  {canOverridePrice ? 'تسعير تلقائي (متاح التعديل)' : 'السعر معتمد وثابت (لا تملك صلاحية تعديله)'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  readOnly={!canOverridePrice}
                  value={formData.total_price}
                  onChange={(e) => {
                    if (canOverridePrice) {
                      setFormData({ ...formData, total_price: Number(e.target.value) });
                    }
                  }}
                  placeholder="السعر يحسب تلقائياً عند اختيار الباقة والعميل..."
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl font-mono font-black focus:ring-2 focus:ring-teal-500 transition-all ${
                    canOverridePrice
                      ? 'bg-slate-50 border-slate-200 text-emerald-700 cursor-text'
                      : 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed select-none'
                  }`}
                />
                {!canOverridePrice && (
                  <div className="absolute left-3 top-3 text-slate-400" title="تعديل السعر محظور بحسب صلاحيات حسابك">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات إضافية أو تعليمات خاصة</label>
            <textarea
              rows={2}
              placeholder="ملاحظات دخول الكمبوند، مكان ركن السيارة، تعليمات المفتاح..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
            ></textarea>
          </div>

          {/* اختيار طريقة الدفع عند إنشاء الاشتراك (يظهر فقط للإدارة والموظفين) */}
          {!preselectedCustomer && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>طريقة الدفع (مطلوبة عند اختيار تأكيد الدفع الفوري)</span>
                </label>
                <span className="text-[11px] text-slate-500">يتم إيداع المبلغ بالخزينة المرتبطة بطريقة الدفع</span>
              </div>
              <select
                value={formData.payment_method_id}
                onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- اختر طريقة الدفع --</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* أزرار الإجراءات */}
          {preselectedCustomer ? (
            /* في حساب العميل: زر حفظ وزر إلغاء فقط */
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveSubscription('unpaid')}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتأكيد طلب الاشتراك'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          ) : (
            /* في حساب الإدارة / الموظف: دفع فوري ودفع مؤجل وإلغاء */
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveSubscription('paid')}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'تأكيد الدفع (إيداع بالخزينة)'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveSubscription('unpaid')}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'دفع مؤجل (غير مسدد)'}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ============================================================================== */}
      {/* نافذة السؤال: الرقم المسجل غير موجود في بيانات العملاء هل ترغب في اضافته كعميل جديد؟ */}
      {/* ============================================================================== */}
      {showConfirmNewCustomerModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-base">عميل غير مسجل</h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                الرقم المسجل غير موجود في بيانات العملاء هل ترغب في اضافته كعميل جديد؟
              </p>
              {unmatchedPhoneQuery && (
                <span className="inline-block font-mono font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-lg text-xs mt-1">
                  {unmatchedPhoneQuery}
                </span>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleOpenNewCustomerModal(unmatchedPhoneQuery)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>نعم، إضافة كعميل جديد</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmNewCustomerModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* شاشة تسجيل عميل جديد للاشتراك */}
      {/* ============================================================================== */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تسجيل عميل جديد للاشتراك</h3>
                  <p className="text-xs text-slate-500">
                    سيتم حفظ بيانات العميل وتحديده تلقائياً في شاشة الاشتراك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: د. طارق محمود"
                    value={newCustomerForm.full_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / الكمبوند *</label>
                  <select
                    required
                    value={newCustomerForm.area_id}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, area_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">اختر المنطقة...</option>
                    {coverageAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم العمارة *</label>
                    <input
                      type="text"
                      required
                      placeholder="12"
                      value={newCustomerForm.building_number}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, building_number: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المربع (Block)</label>
                    <input
                      type="text"
                      placeholder="A"
                      value={newCustomerForm.block_number}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, block_number: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-3 pt-1">
                  {/* Location */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600" />
                        <span>الموقع الجغرافي (Location)</span>
                        <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                      </label>
                      <button
                        type="button"
                        disabled={isLocatingNewCust}
                        onClick={handleGetNewCustomerGPS}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 ${isLocatingNewCust ? 'animate-spin' : ''}`} />
                        <span>{isLocatingNewCust ? 'جاري التحديد...' : 'موقعي الآن (GPS)'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="رابط خرائط Google أو إحداثيات..."
                        value={newCustomerForm.location_url}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, location_url: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                      {newCustomerForm.location_url && (
                        <a
                          href={newCustomerForm.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute left-3 top-2 text-xs text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                        >
                          <span>معاينة</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Detailed Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>عنوان تفصيلي (Detailed Address)</span>
                      <span className="text-[10px] text-slate-400 font-normal">(غير إلزامي)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="شقة، دور، معالم مميزة..."
                      value={newCustomerForm.detailed_address}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, detailed_address: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Options */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
                  <input
                    type="checkbox"
                    checked={newCustomerForm.include_vehicle}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, include_vehicle: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-teal-600" />
                    <span>إضافة سيارة للعميل واختيارها مباشرة في الاشتراك</span>
                  </span>
                </label>

                {newCustomerForm.include_vehicle && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-teal-50/40 border border-teal-100 rounded-2xl animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع السيارة</label>
                      <input
                        type="text"
                        list="sub-modal-vehicle-types"
                        placeholder="مرسيدس / هيونداي"
                        value={newCustomerForm.vehicle_type}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, vehicle_type: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <datalist id="sub-modal-vehicle-types">
                        {uniqueVehicleTypes.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اللون</label>
                      <input
                        type="text"
                        list="sub-modal-vehicle-colors"
                        placeholder="أسود / أبيض"
                        value={newCustomerForm.color}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, color: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <datalist id="sub-modal-vehicle-colors">
                        {uniqueVehicleColors.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم اللوحة *</label>
                      <input
                        type="text"
                        placeholder="أ ب ج 123"
                        value={newCustomerForm.plate_number}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, plate_number: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                      />
                    </div>

                    {/* Car Image Upload in Registration Modal */}
                    <div className="sm:col-span-3 pt-1 border-t border-teal-100/60 mt-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-teal-600" />
                          <span>صورة السيارة (اختياري)</span>
                        </span>
                        {newCustomerForm.vehicle_image_url && (
                          <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            ✓ تم حفظ الصورة
                          </span>
                        )}
                      </label>

                      {newCustomerForm.vehicle_image_url ? (
                        <div className="p-2 bg-white rounded-xl border border-teal-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={newCustomerForm.vehicle_image_url}
                              alt="صورة السيارة"
                              className="w-10 h-10 object-cover rounded-lg border border-teal-200 shrink-0"
                            />
                            <span className="text-xs font-bold text-slate-800 truncate">تم تحديد صورة السيارة</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <label className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 cursor-pointer">
                              <span>استبدال</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingNewCustCarImg}
                                onChange={handleNewCustCarImgUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewCustomerForm((prev) => ({ ...prev, vehicle_image_url: '' }))}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full p-2.5 bg-white hover:bg-teal-50/50 border border-dashed border-teal-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
                          {isUploadingNewCustCarImg ? (
                            <>
                              <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                              <span className="text-xs font-bold text-teal-700">جاري الرفع...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-teal-600" />
                              <span className="text-xs font-bold text-slate-700">التقاط صورة للسيارة أو اختيار من الجهاز</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingNewCustCarImg}
                            onChange={handleNewCustCarImgUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* بيانات حساب دخول العميل */}
              <div className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">بيانات حساب دخول العميل للنظام</h5>
                    <p className="text-[10px] text-teal-700">يتم إنشاء حساب نشط فوراً لتمكين العميل من تسجيل الدخول</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      placeholder={newCustomerForm.phone || "رقم الموبايل"}
                      value={newCustomerForm.username}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, username: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">كلمة المرور</label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={newCustomerForm.password}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingNewCustomer}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingNewCustomer ? 'جاري الحفظ...' : 'حفظ بيانات العميل ومتابعة الاشتراك'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Photo Enlarge Modal / Lightbox */}
      {enlargedWorker && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEnlargedWorker(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{enlargedWorker.full_name}</h4>
                  <span className="text-[10px] text-teal-600 font-bold block">
                    {enlargedWorker.role === 'worker' ? 'فني غسيل ميداني' : enlargedWorker.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEnlargedWorker(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[220px]">
              {(enlargedWorker.personal_image_url || enlargedWorker.national_id_image_url) ? (
                <img
                  src={(enlargedWorker.personal_image_url || enlargedWorker.national_id_image_url)!}
                  alt={enlargedWorker.full_name}
                  className="w-full max-h-80 object-contain rounded-2xl shadow-md"
                />
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <User className="w-16 h-16 mx-auto mb-2 text-slate-500" />
                  <p className="text-xs">لم يتم رفع صورة شخصية لهذا العامل</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">المسمى الوظيفي:</span>
                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {enlargedWorker.role === 'worker' ? 'فني غسيل ميداني' : enlargedWorker.role}
                </span>
              </div>
              {enlargedWorker.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-700">{enlargedWorker.phone}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setEnlargedWorker(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
