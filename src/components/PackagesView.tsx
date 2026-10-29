import React, { useState, useEffect } from 'react';
import {
  Package,
  PackageCategory,
  CoverageArea,
  PackagePricing,
  Settings,
  PackageTier,
  OnDemandService,
  ServiceBooking
} from '../types/database';
import * as api from '../services/api';
import {
  Package as PackageIcon,
  Plus,
  FolderPlus,
  Coins,
  MapPin,
  Save,
  Check,
  Calendar,
  Layers,
  Car,
  Building,
  Sparkles,
  X,
  Edit3,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  Tag,
  Phone,
  Filter,
  ShieldCheck,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { uploadStorageAsset } from '../utils/imageStorage';

interface PackagesViewProps {
  packages: Package[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  pricing: PackagePricing[];
  settings: Settings;
  onCreateCategory: (cat: Omit<PackageCategory, 'id' | 'created_at'>) => Promise<PackageCategory>;
  onUpdateCategory?: (id: string, updates: Partial<PackageCategory>) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onCreatePackage: (pkg: Omit<Package, 'id' | 'created_at'>) => Promise<Package>;
  onUpdatePackage?: (id: string, updates: Partial<Package>) => Promise<void>;
  onSavePricing: (packageId: string, areaId: string, price: number) => Promise<void>;
}

export const PackagesView: React.FC<PackagesViewProps> = ({
  packages,
  categories,
  coverageAreas,
  pricing,
  settings,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreatePackage,
  onUpdatePackage,
  onSavePricing
}) => {
  const [activeTab, setActiveTab] = useState<
    'packages_cars' | 'packages_buildings' | 'packages_services' | 'pricing' | 'categories'
  >('packages_cars');

  // Add Package Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'cars' | 'buildings' | 'services'>('cars');

  // New Category State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);

  // Edit Category State
  const [editingCategory, setEditingCategory] = useState<PackageCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatIsActive, setEditCatIsActive] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isDeletingCategoryId, setIsDeletingCategoryId] = useState<string | null>(null);

  // On-Demand Services & Bookings State (Matching B-Care and B-Services)
  const [servicesSubTab, setServicesSubTab] = useState<'catalog' | 'bookings' | 'packages'>('catalog');
  const [onDemandServices, setOnDemandServices] = useState<OnDemandService[]>([]);
  const [loadingOnDemandServices, setLoadingOnDemandServices] = useState(false);
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [loadingServiceBookings, setLoadingServiceBookings] = useState(false);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');

  // Modal for Add / Edit On-Demand Service
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<OnDemandService | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    category: 'car' as 'car' | 'building',
    group_name: 'غسيل وعناية',
    sub_category: 'wash',
    price: 150,
    price_type: 'fixed' as 'fixed' | 'custom' | 'starting_at',
    description: '',
    includesText: '',
    icon_type: 'spark',
    duration_minutes: 45,
    popular: false,
    tile_bg: '#E3F2EF',
    tile_fg: '#0B7F72',
    image_url: '',
    is_active: true
  });
  const [isSavingService, setIsSavingService] = useState(false);

  const loadOnDemandServices = async () => {
    try {
      setLoadingOnDemandServices(true);
      const data = await api.getServices(true);
      setOnDemandServices(data);
    } catch (err) {
      console.error('Failed to load on-demand services:', err);
    } finally {
      setLoadingOnDemandServices(false);
    }
  };

  const loadServiceBookings = async () => {
    try {
      setLoadingServiceBookings(true);
      const data = await api.getServiceBookings();
      setServiceBookings(data);
    } catch (err) {
      console.error('Failed to load service bookings:', err);
    } finally {
      setLoadingServiceBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'packages_services') {
      loadOnDemandServices();
      loadServiceBookings();
    }
  }, [activeTab]);

  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceFormData({
      name: '',
      category: 'car',
      group_name: 'غسيل وعناية',
      sub_category: 'wash',
      price: 150,
      price_type: 'fixed',
      description: '',
      includesText: 'الهيكل الخارجي, الزجاج والجنوط, المقصورة الداخلية',
      icon_type: 'spark',
      duration_minutes: 45,
      popular: false,
      tile_bg: '#E3F2EF',
      tile_fg: '#0B7F72',
      image_url: '',
      is_active: true
    });
    setShowServiceModal(true);
  };

  const handleOpenEditService = (srv: OnDemandService) => {
    setEditingService(srv);
    let inclStr = '';
    if (Array.isArray(srv.includes)) {
      inclStr = srv.includes.join(', ');
    } else if (typeof srv.includes === 'string') {
      try {
        const p = JSON.parse(srv.includes);
        inclStr = Array.isArray(p) ? p.join(', ') : srv.includes;
      } catch {
        inclStr = srv.includes;
      }
    }
    setServiceFormData({
      name: srv.name,
      category: srv.category,
      group_name: srv.group_name,
      sub_category: srv.sub_category || 'wash',
      price: srv.price,
      price_type: srv.price_type,
      description: srv.description || '',
      includesText: inclStr,
      icon_type: srv.icon_type || 'spark',
      duration_minutes: srv.duration_minutes || 45,
      popular: Boolean(srv.popular),
      tile_bg: srv.tile_bg || '#E3F2EF',
      tile_fg: srv.tile_fg || '#0B7F72',
      image_url: srv.image_url || '',
      is_active: srv.is_active
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormData.name.trim()) {
      alert('يرجى إدخال اسم الخدمة');
      return;
    }
    const includesArr = serviceFormData.includesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsSavingService(true);
      if (editingService) {
        await api.updateService(editingService.id, {
          name: serviceFormData.name.trim(),
          category: serviceFormData.category,
          group_name: serviceFormData.group_name.trim(),
          sub_category: serviceFormData.sub_category,
          price: Number(serviceFormData.price) || 0,
          price_type: serviceFormData.price_type,
          description: serviceFormData.description.trim(),
          includes: includesArr,
          icon_type: serviceFormData.icon_type,
          duration_minutes: Number(serviceFormData.duration_minutes) || 45,
          popular: serviceFormData.popular,
          tile_bg: serviceFormData.tile_bg,
          tile_fg: serviceFormData.tile_fg,
          image_url: serviceFormData.image_url || undefined,
          is_active: serviceFormData.is_active
        });
        alert('تم تحديث بيانات الخدمة بنجاح');
      } else {
        await api.createService({
          name: serviceFormData.name.trim(),
          category: serviceFormData.category,
          group_name: serviceFormData.group_name.trim(),
          sub_category: serviceFormData.sub_category,
          price: Number(serviceFormData.price) || 0,
          price_type: serviceFormData.price_type,
          kind: 'car',
          description: serviceFormData.description.trim(),
          includes: includesArr,
          icon_type: serviceFormData.icon_type,
          duration_minutes: Number(serviceFormData.duration_minutes) || 45,
          popular: serviceFormData.popular,
          tile_bg: serviceFormData.tile_bg,
          tile_fg: serviceFormData.tile_fg,
          image_url: serviceFormData.image_url || undefined,
          is_active: serviceFormData.is_active
        });
        alert('تمت إضافة الخدمة بنجاح');
      }
      setShowServiceModal(false);
      loadOnDemandServices();
    } catch (err: any) {
      alert('حدث خطأ: ' + (err.message || ''));
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف خدمة "${name}"؟`)) return;
    try {
      await api.deleteService(id);
      loadOnDemandServices();
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف: ' + (err.message || ''));
    }
  };

  const handleToggleServiceActive = async (srv: OnDemandService) => {
    try {
      await api.updateService(srv.id, { is_active: !srv.is_active });
      loadOnDemandServices();
    } catch (err: any) {
      alert('حدث خطأ أثناء تغيير الحالة: ' + (err.message || ''));
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: ServiceBooking['status']) => {
    try {
      await api.updateServiceBookingStatus(bookingId, newStatus);
      loadServiceBookings();
    } catch (err: any) {
      alert('حدث خطأ أثناء تحديث حالة الحجز: ' + (err.message || ''));
    }
  };

  // قوائم أنواع الخدمات المقترحة
  const CAR_SERVICES = [
    'غسيل',
    'فوطة 1',
    'فوطة 2',
    'تنظيف داخلي',
    'تلميع',
    'غسيل وتلميع'
  ];

  const BUILDING_SERVICES = [
    'غسيل سلم',
    'نظافة مداخل',
    'غسيل واجهات',
    'نظافة أسطح وجراج',
    'تطهير مصاعد',
    'نظافة شاملة للعمارة'
  ];

  // Helper to check if category is services ("خدمات")
  const isServicesCategory = (catId?: string) => {
    if (!catId) return false;
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return false;
    const n = (cat.name || '').trim().toLowerCase();
    return n.includes('خدمات') || n.includes('خدمة') || n.includes('service');
  };

  // Helper to check if package is a service
  const isServicesPackage = (pkg: Package): boolean => {
    if (pkg.tier === 'none') return true;
    if (isServicesCategory(pkg.category_id)) return true;
    const cat = categories.find((c) => c.id === pkg.category_id);
    const catName = (cat?.name || '').toLowerCase();
    const pkgName = (pkg.name || '').toLowerCase();
    if (catName.includes('خدمات') || catName.includes('خدمة') || catName.includes('service')) return true;
    return false;
  };

  // Helper to determine package type
  const getPackageType = (pkg: Package): 'cars' | 'buildings' | 'services' => {
    if (isServicesPackage(pkg)) {
      return 'services';
    }
    const cat = categories.find((c) => c.id === pkg.category_id);
    const catName = (cat?.name || '').toLowerCase();
    const pkgName = (pkg.name || '').toLowerCase();
    if (
      catName.includes('عمارات') ||
      catName.includes('عمارة') ||
      catName.includes('مباني') ||
      pkgName.includes('عمارة') ||
      pkgName.includes('عمارات')
    ) {
      return 'buildings';
    }
    return 'cars';
  };

  const carPackages = packages.filter((p) => getPackageType(p) === 'cars');
  const buildingPackages = packages.filter((p) => getPackageType(p) === 'buildings');
  const servicePackages = packages.filter((p) => getPackageType(p) === 'services');

  // New Package State مع نظام الزيارات الأسبوعية المتكررة
  const [pkgData, setPkgData] = useState({
    category_id: '',
    name: '',
    tier: 'monthly' as PackageTier,
    duration_days: 30 as number | string,
    weekly_visits_count: 3 as number | string,
    description: '',
    image_url: '',
    is_active: true
  });

  // مصفوفة خطة الخدمات الأسبوعية المتولدة ديناميكياً
  const [weeklyServicesPlan, setWeeklyServicesPlan] = useState<string[]>(['غسيل', 'فوطة 1', 'فوطة 2']);

  // Local Pricing Matrix Editor State: { `${pkgId}_${areaId}`: price }
  const [pricingInputs, setPricingInputs] = useState<Record<string, number>>({});
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  // Edit Package Modal State
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editPkgData, setEditPkgData] = useState({
    category_id: '',
    name: '',
    tier: 'monthly' as PackageTier,
    duration_days: 30 as number | string,
    weekly_visits_count: 3 as number | string,
    description: '',
    image_url: '',
    is_active: true
  });
  const [editWeeklyServicesPlan, setEditWeeklyServicesPlan] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    const isServices = isServicesPackage(pkg);
    const weeklyCount = isServices ? 1 : (pkg.weekly_visits_count || (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 3));
    const pkgType = getPackageType(pkg);
    const pool = pkgType === 'buildings' ? BUILDING_SERVICES : CAR_SERVICES;

    let plan = pkg.weekly_services_plan || [];
    if (isServices) {
      plan = [pkg.name || 'خدمة'];
    } else if (!plan || plan.length === 0) {
      plan = Array.from({ length: weeklyCount }).map((_, i) => pool[i % pool.length] || 'غسيل');
    } else if (plan.length < weeklyCount) {
      const extra = Array.from({ length: weeklyCount - plan.length }).map((_, i) => pool[(plan.length + i) % pool.length] || 'غسيل');
      plan = [...plan, ...extra];
    } else if (plan.length > weeklyCount) {
      plan = plan.slice(0, weeklyCount);
    }

    setEditPkgData({
      category_id: pkg.category_id,
      name: pkg.name,
      tier: isServices ? ('none' as PackageTier) : (pkg.tier || 'monthly'),
      duration_days: isServices ? 0 : (pkg.duration_days ?? 30),
      weekly_visits_count: isServices ? 1 : weeklyCount,
      description: pkg.description || '',
      image_url: pkg.image_url || '',
      is_active: pkg.is_active !== false
    });
    setEditWeeklyServicesPlan(plan);
  };

  const handleEditWeeklyVisitsChange = (countVal: number | string) => {
    const num = Math.max(1, Math.min(Number(countVal) || 1, 7));
    setEditPkgData((prev) => ({ ...prev, weekly_visits_count: num }));

    const pkgType = editingPackage ? getPackageType(editingPackage) : 'cars';
    const pool = pkgType === 'buildings' ? BUILDING_SERVICES : CAR_SERVICES;

    setEditWeeklyServicesPlan((prevPlan) => {
      const nextPlan = [...prevPlan];
      if (num > nextPlan.length) {
        for (let i = nextPlan.length; i < num; i++) {
          nextPlan.push(pool[i % pool.length] || '');
        }
      } else {
        return nextPlan.slice(0, num);
      }
      return nextPlan;
    });
  };

  const handleEditServicePlanItemChange = (index: number, value: string) => {
    setEditWeeklyServicesPlan((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSaveEditPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;
    const isServices = isServicesCategory(editPkgData.category_id);
    if (!editPkgData.name.trim() || !editPkgData.category_id || (!isServices && !editPkgData.tier)) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (isServices) {
      try {
        setIsSavingEdit(true);
        if (onUpdatePackage) {
          await onUpdatePackage(editingPackage.id, {
            category_id: editPkgData.category_id,
            name: editPkgData.name.trim(),
            tier: 'none' as PackageTier,
            duration_days: 0,
            weekly_visits_count: 1,
            weekly_services_plan: [editPkgData.name.trim() || 'خدمة'],
            base_visits_count: 1,
            description: editPkgData.description.trim(),
            image_url: editPkgData.image_url || undefined,
            is_active: editPkgData.is_active
          });
        }
        alert('تم تحديث بيانات باقة الخدمة بنجاح (زيارة واحدة فقط بدون مدة زمنية)!');
        setEditingPackage(null);
      } catch (err: any) {
        alert('فشل حفظ تعديل الباقة: ' + (err.message || 'خطأ غير معروف'));
      } finally {
        setIsSavingEdit(false);
      }
      return;
    }

    const weeklyCount = Math.max(1, Math.min(Number(editPkgData.weekly_visits_count) || 1, 7));
    if (editWeeklyServicesPlan.length < weeklyCount || editWeeklyServicesPlan.some((s) => !s || !s.trim())) {
      alert('يرجى تحديد نوع الخدمة لكافة الزيارات الأسبوعية الناتجة في مصفوفة الخطة قبل الحفظ.');
      return;
    }

    const durationDays = Number(editPkgData.duration_days) || 30;
    const weeksCount = Math.max(1, Math.round(durationDays / 7));
    const totalVisitsCount = weeklyCount * weeksCount;

    try {
      setIsSavingEdit(true);
      if (onUpdatePackage) {
        await onUpdatePackage(editingPackage.id, {
          category_id: editPkgData.category_id,
          name: editPkgData.name.trim(),
          tier: editPkgData.tier as PackageTier,
          duration_days: durationDays,
          weekly_visits_count: weeklyCount,
          weekly_services_plan: editWeeklyServicesPlan.slice(0, weeklyCount).map((s) => s.trim()),
          base_visits_count: totalVisitsCount,
          description: editPkgData.description.trim(),
          image_url: editPkgData.image_url || undefined,
          is_active: editPkgData.is_active
        });
      }
      alert('تم تحديث بيانات الباقة بنجاح!');
      setEditingPackage(null);
    } catch (err: any) {
      alert('فشل حفظ تعديل الباقة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenAddPackage = (type: 'cars' | 'buildings' | 'services') => {
    setAddModalType(type);
    if (type === 'cars') {
      const carCat = categories.find((c) => {
        const n = (c.name || '').toLowerCase();
        return n.includes('سيارات') || n.includes('سيارة') || n.includes('car');
      })?.id || categories[0]?.id || '';

      setPkgData({
        category_id: carCat,
        name: '',
        tier: 'monthly',
        duration_days: 30,
        weekly_visits_count: 3,
        description: '',
        image_url: '',
        is_active: true
      });
      setWeeklyServicesPlan(['غسيل', 'فوطة 1', 'فوطة 2']);
    } else if (type === 'buildings') {
      const bldCat = categories.find((c) => {
        const n = (c.name || '').toLowerCase();
        return n.includes('عمارات') || n.includes('عمارة') || n.includes('مباني') || n.includes('building');
      })?.id || categories[0]?.id || '';

      setPkgData({
        category_id: bldCat,
        name: '',
        tier: 'monthly',
        duration_days: 30,
        weekly_visits_count: 2,
        description: '',
        image_url: '',
        is_active: true
      });
      setWeeklyServicesPlan(['غسيل سلم', 'نظافة مداخل']);
    } else {
      // type === 'services'
      const srvCat = categories.find((c) => isServicesCategory(c.id))?.id || categories[0]?.id || '';

      setPkgData({
        category_id: srvCat,
        name: '',
        tier: 'none' as PackageTier,
        duration_days: 0,
        weekly_visits_count: 1,
        description: '',
        image_url: '',
        is_active: true
      });
      setWeeklyServicesPlan(['']);
    }
    setShowAddModal(true);
  };

  const handleWeeklyVisitsChange = (countVal: number | string) => {
    const num = Math.max(1, Math.min(Number(countVal) || 1, 7));
    setPkgData((prev) => ({ ...prev, weekly_visits_count: num }));

    const pool = addModalType === 'buildings' ? BUILDING_SERVICES : CAR_SERVICES;

    setWeeklyServicesPlan((prevPlan) => {
      const nextPlan = [...prevPlan];
      if (num > nextPlan.length) {
        for (let i = nextPlan.length; i < num; i++) {
          nextPlan.push(pool[i % pool.length] || '');
        }
      } else {
        return nextPlan.slice(0, num);
      }
      return nextPlan;
    });
  };

  const handleServicePlanItemChange = (index: number, value: string) => {
    setWeeklyServicesPlan((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await onCreateCategory({
      name: catName.trim(),
      description: catDesc.trim(),
      is_active: catIsActive
    });
    setCatName('');
    setCatDesc('');
    setCatIsActive(true);
    alert('تمت إضافة التصنيف بنجاح!');
  };

  const handleOpenEditCategory = (cat: PackageCategory) => {
    setEditingCategory(cat);
    setEditCatName(cat.name || '');
    setEditCatDesc(cat.description || '');
    setEditCatIsActive(cat.is_active !== false);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;
    try {
      setIsSavingCategory(true);
      if (onUpdateCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: editCatName.trim(),
          description: editCatDesc.trim(),
          is_active: editCatIsActive
        });
      }
      alert('تم تحديث بيانات التصنيف بنجاح!');
      setEditingCategory(null);
    } catch (err: any) {
      alert('فشل حفظ تعديل التصنيف: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: PackageCategory) => {
    if (!onDeleteCategory) return;
    const attachedCount = packages.filter((p) => p.category_id === cat.id).length;
    let warningMsg = `هل أنت متأكد من رغبتك في حذف تصنيف "${cat.name}" نهائياً؟`;
    if (attachedCount > 0) {
      warningMsg = `تنبيه: يوجد (${attachedCount}) باقات مسجلة حالياً تابعة لتصنيف "${cat.name}".\nهل أنت متأكد من رغبتك في حذف هذا التصنيف نهائياً؟`;
    }
    if (!window.confirm(warningMsg)) return;

    try {
      setIsDeletingCategoryId(cat.id);
      await onDeleteCategory(cat.id);
      alert('تم حذف التصنيف بنجاح!');
    } catch (err: any) {
      alert('فشل حذف التصنيف: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsDeletingCategoryId(null);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const isServices = addModalType === 'services' || isServicesCategory(pkgData.category_id) || pkgData.tier === 'none';
    if (!pkgData.name.trim() || !pkgData.category_id || (!isServices && !pkgData.tier)) {
      alert('يرجى ملء جميع الحقول المطلوبة واختيار التصنيف والمستوى الزمني');
      return;
    }

    if (isServices) {
      await onCreatePackage({
        category_id: pkgData.category_id,
        name: pkgData.name.trim(),
        tier: 'none' as PackageTier,
        duration_days: 0,
        weekly_visits_count: 1,
        weekly_services_plan: [weeklyServicesPlan[0]?.trim() || pkgData.name.trim() || 'خدمة'],
        base_visits_count: 1,
        description: pkgData.description.trim(),
        image_url: pkgData.image_url || undefined,
        is_active: pkgData.is_active
      });

      alert('تمت إضافة الخدمة بنجاح (زيارة واحدة فقط بدون تحديد أي مدة زمنية)!');
      setShowAddModal(false);
      setActiveTab('packages_services');
      return;
    }

    const weeklyCount = Math.max(1, Math.min(Number(pkgData.weekly_visits_count) || 1, 7));

    if (weeklyServicesPlan.length < weeklyCount || weeklyServicesPlan.some((s) => !s || !s.trim())) {
      alert('يرجى تحديد نوع الخدمة لكافة الزيارات الأسبوعية الناتجة في مصفوفة الخطة قبل الحفظ.');
      return;
    }

    const durationDays = Number(pkgData.duration_days) || 30;
    const weeksCount = Math.max(1, Math.round(durationDays / 7));
    const totalVisitsCount = weeklyCount * weeksCount;

    await onCreatePackage({
      category_id: pkgData.category_id,
      name: pkgData.name.trim(),
      tier: pkgData.tier as PackageTier,
      duration_days: durationDays,
      weekly_visits_count: weeklyCount,
      weekly_services_plan: weeklyServicesPlan.slice(0, weeklyCount).map((s) => s.trim()),
      base_visits_count: totalVisitsCount,
      description: pkgData.description.trim(),
      image_url: pkgData.image_url || undefined,
      is_active: pkgData.is_active
    });

    alert('تمت إضافة الباقة بنجاح!');
    setShowAddModal(false);
    setActiveTab(addModalType === 'cars' ? 'packages_cars' : addModalType === 'buildings' ? 'packages_buildings' : 'packages_services');
  };

  const getPrice = (packageId: string, areaId: string) => {
    const key = `${packageId}_${areaId}`;
    if (pricingInputs[key] !== undefined) return pricingInputs[key];
    const match = pricing.find((p) => p.package_id === packageId && p.area_id === areaId);
    return match ? match.price : 0;
  };

  const handleSaveAllPricing = async () => {
    for (const pkg of packages) {
      for (const area of coverageAreas) {
        const key = `${pkg.id}_${area.id}`;
        if (pricingInputs[key] !== undefined) {
          await onSavePricing(pkg.id, area.id, Number(pricingInputs[key]));
        }
      }
    }
    setPricingSavedNotice(true);
    setTimeout(() => setPricingSavedNotice(false), 3000);
  };

  const getTierLabel = (tier?: PackageTier | string) => {
    switch (tier) {
      case 'monthly': return 'شهري (30 يوم)';
      case 'quarterly': return 'ربع سنوي (90 يوم)';
      case 'semi_annual': return 'نصف سنوي (180 يوم)';
      case 'annual': return 'سنوي (365 يوم)';
      case 'none': return 'بدون تحديد مدة (خدمة فردية)';
      default: return 'بدون تحديد مدة';
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'غير محدد';

  // Render Table for Packages (Cars / Buildings / Services)
  const renderPackagesTable = (pkgList: Package[], type: 'cars' | 'buildings' | 'services') => {
    const isCars = type === 'cars';
    const isBuildings = type === 'buildings';
    const isServices = type === 'services';

    return (
      <div className="space-y-4">
        {/* Top Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCars ? 'bg-sky-50 text-sky-600' : isBuildings ? 'bg-teal-50 text-teal-600' : 'bg-purple-50 text-purple-600'
              }`}
            >
              {isCars ? <Car className="w-5 h-5" /> : isBuildings ? <Building className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {isCars ? 'جدول باقات غسيل السيارات' : isBuildings ? 'جدول باقات نظافة العمارات' : 'جدول الخدمات الفردية والإضافية'}
              </h3>
              <p className="text-xs text-slate-500">
                {isCars
                  ? `عرض تفصيلي لـ (${pkgList.length}) باقة لغسيل المركبات مع مواعيد الزيارات الأسبوعية ومصفوفة الخدمة`
                  : isBuildings
                  ? `عرض تفصيلي لـ (${pkgList.length}) باقة لنظافة وغسيل العمارات والمداخل مع خطة الخدمات`
                  : `عرض تفصيلي لـ (${pkgList.length}) خدمة فردية وإضافية (زيارة واحدة بدون تحديد مدة)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddPackage(type)}
            className={`px-4 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
              isCars
                ? 'bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700'
                : isBuildings
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isCars ? '+ إضافة باقة سيارات جديدة' : isBuildings ? '+ إضافة باقة عمارات جديدة' : '+ إضافة خدمة جديدة'}</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {pkgList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm">
                {isCars
                  ? 'لم يتم العثور على أي باقات مسجلة لغسيل السيارات.'
                  : isBuildings
                  ? 'لم يتم العثور على أي باقات مسجلة لنظافة العمارات.'
                  : 'لم يتم العثور على أي خدمات مسجلة.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddPackage(type)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isCars ? 'إضافة أول باقة سيارات' : isBuildings ? 'إضافة أول باقة عمارات' : 'إضافة أول خدمة'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-4">{isServices ? 'الخدمة والتصنيف' : 'الباقة والتصنيف'}</th>
                    <th className="p-4">المستوى الزمني</th>
                    <th className="p-4">{isServices ? 'الزيارات' : 'الزيارات الأسبوعية'}</th>
                    <th className="p-4">الصلاحية والإجمالي</th>
                    <th className="p-4">{isServices ? 'نوع الخدمة' : 'تسلسل خطة الخدمات بالأسبوع'}</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">التسعير والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {pkgList.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {pkg.image_url ? (
                            <img
                              src={pkg.image_url}
                              alt={pkg.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isCars ? 'bg-sky-50 text-sky-600' : isBuildings ? 'bg-teal-50 text-teal-600' : 'bg-purple-50 text-purple-600'
                              }`}
                            >
                              {isCars ? <Car className="w-5 h-5" /> : isBuildings ? <Building className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{pkg.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {getCategoryName(pkg.category_id)}
                              </span>
                              {pkg.description && (
                                <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={pkg.description}>
                                  {pkg.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-800">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold inline-block">
                          {getTierLabel(pkg.tier)}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-black text-teal-800 text-sm">
                          {isServicesPackage(pkg) ? '1 زيارة' : `${pkg.weekly_visits_count || 1} زيارات`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isServicesPackage(pkg) ? 'خدمة فردية' : 'في الأسبوع الواحد'}
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-slate-900 font-mono">
                          {isServicesPackage(pkg) ? 'بدون مدة محددة' : `${pkg.duration_days} يوماً`}
                        </div>
                        <div className="text-teal-700 font-bold text-[11px]">
                          {isServicesPackage(pkg) ? '1 زيارة فقط' : `${pkg.base_visits_count || (pkg.weekly_visits_count || 1) * 4} زيارة بالدورة`}
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        {pkg.weekly_services_plan && pkg.weekly_services_plan.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-sm">
                            {pkg.weekly_services_plan.map((srv, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs"
                              >
                                {!isServices && (
                                  <span className="text-[9px] bg-teal-600 text-white px-1 rounded-sm font-mono font-bold">
                                    {idx + 1}
                                  </span>
                                )}
                                <span>{srv}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">غير محدد</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {onUpdatePackage ? (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePackage(pkg.id, {
                                is_active: pkg.is_active === false ? true : false
                              })
                            }
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all border cursor-pointer ${
                              pkg.is_active !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                            }`}
                            title="انقر لتغيير حالة الباقة (نشط / معطل)"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                pkg.is_active !== false ? 'bg-emerald-500' : 'bg-slate-500'
                              }`}
                            ></span>
                            <span>{pkg.is_active !== false ? 'نشط' : 'معطل'}</span>
                          </button>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              pkg.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {pkg.is_active !== false ? 'نشط' : 'معطل'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPackage(pkg)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title={isServices ? 'تعديل بيانات الخدمة والتسعير' : 'تعديل اسم الباقة، التصنيف، عدد الزيارات، ومصفوفة الخدمات'}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isServices ? 'تعديل الخدمة' : 'تعديل الباقة'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('pricing')}
                            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl border border-sky-200 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="عرض وتعديل أسعار هذه الباقة حسب مناطق التغطية والكمبوندات"
                          >
                            <Coins className="w-3.5 h-3.5 text-sky-600" />
                            <span>الأسعار</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة الباقات والتسعير المرن</h2>
          <p className="text-sm text-slate-500 mt-1">
            تصنيفات الباقات (سيارات، عمارات، خدمات فردية)، المستويات الزمنية، وجدول التسعير المرن حسب الكمبوند / المنطقة
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('packages_cars')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'packages_cars' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 text-sky-600" />
            <span>باقات السيارات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
              {carPackages.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('packages_buildings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'packages_buildings' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4 text-teal-600" />
            <span>باقات العمارات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
              {buildingPackages.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('packages_services')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'packages_services' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>الخدمات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-[10px] font-bold text-purple-800">
              {servicePackages.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pricing' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>مصفوفة التسعير بالمناطق</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categories' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>التصنيفات الرئيسية</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Car Packages Table */}
      {activeTab === 'packages_cars' && renderPackagesTable(carPackages, 'cars')}

      {/* Tab 2: Building Packages Table */}
      {activeTab === 'packages_buildings' && renderPackagesTable(buildingPackages, 'buildings')}

      {/* Tab 3: Services Section (On-Demand Catalog, Bookings & Packages) */}
      {activeTab === 'packages_services' && (
        <div className="space-y-6">
          {/* Sub Navigation Bar */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setServicesSubTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  servicesSubTab === 'catalog'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-white/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>كتالوج خدمات العناية والطلبات الفورية (B-Care & B-Services)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  servicesSubTab === 'catalog' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {onDemandServices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setServicesSubTab('bookings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  servicesSubTab === 'bookings'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-white/60'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>طلبات وحجوزات الخدمات</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  servicesSubTab === 'bookings' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {serviceBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setServicesSubTab('packages')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  servicesSubTab === 'packages'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-white/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>باقات الخدمات الفردية (اشتراكات)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  servicesSubTab === 'packages' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {servicePackages.length}
                </span>
              </button>
            </div>

            {servicesSubTab === 'catalog' && (
              <button
                type="button"
                onClick={handleOpenAddService}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة خدمة فورية جديدة</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 1: On-Demand Services Catalog */}
          {servicesSubTab === 'catalog' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <span>إدارة خدمات العناية والطلبات الفورية (On-Demand Services)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    هذه الخدمات تظهر في تطبيق العميل في شاشتي الخدمات وتفاصيل العناية بالسيارة (B-Services & B-Care)، ويمكن للعملاء حجزها مباشرة بدون اشتراك شهري.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadOnDemandServices}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all cursor-pointer"
                  >
                    تحديث البيانات
                  </button>
                </div>
              </div>

              {loadingOnDemandServices ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-200">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-sm font-bold">جاري تحميل الخدمات...</span>
                </div>
              ) : onDemandServices.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-sm">لم يتم العثور على أي خدمات فورية مسجلة في قاعدة البيانات.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddService}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول خدمة فورية</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                        <tr>
                          <th className="p-4">الخدمة والتصنيف</th>
                          <th className="p-4">القطاع والمجموعة</th>
                          <th className="p-4">السعر والنوع</th>
                          <th className="p-4">المزايا المشمولة</th>
                          <th className="p-4 text-center">المدة</th>
                          <th className="p-4 text-center">الأكثر طلباً</th>
                          <th className="p-4 text-center">الحالة</th>
                          <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {onDemandServices.map((srv) => {
                          let includesList: string[] = [];
                          if (Array.isArray(srv.includes)) {
                            includesList = srv.includes;
                          } else if (typeof srv.includes === 'string') {
                            try {
                              const p = JSON.parse(srv.includes);
                              includesList = Array.isArray(p) ? p : [srv.includes];
                            } catch {
                              includesList = srv.includes.split(',').map((s) => s.trim());
                            }
                          }

                          return (
                            <tr key={srv.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {srv.image_url ? (
                                    <img
                                      src={srv.image_url}
                                      alt={srv.name}
                                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                                    />
                                  ) : (
                                    <div
                                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0"
                                      style={{
                                        background: srv.tile_bg || '#E3F2EF',
                                        color: srv.tile_fg || '#0B7F72'
                                      }}
                                    >
                                      <Sparkles className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">{srv.name}</div>
                                    {srv.description && (
                                      <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={srv.description}>
                                        {srv.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-4 text-xs">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                    srv.category === 'car'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                                  }`}>
                                    {srv.category === 'car' ? 'سيارات' : 'عمارات'}
                                  </span>
                                  <span className="font-semibold text-slate-700 text-xs">
                                    {srv.group_name}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-xs font-mono font-bold">
                                {srv.price > 0 ? (
                                  <span className="text-teal-700 text-sm">{srv.price} ج.م</span>
                                ) : (
                                  <span className="text-amber-600">حسب الطلب</span>
                                )}
                                <div className="text-[10px] text-slate-400 font-sans font-normal">
                                  {srv.price_type === 'fixed' ? 'سعر ثابت' : srv.price_type === 'starting_at' ? 'يبدأ من' : 'مخصص'}
                                </div>
                              </td>

                              <td className="p-4 text-xs">
                                <div className="flex flex-wrap gap-1 max-w-[240px]">
                                  {includesList.slice(0, 3).map((inc, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                      {inc}
                                    </span>
                                  ))}
                                  {includesList.length > 3 && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                                      +{includesList.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 text-center text-xs font-semibold text-slate-600">
                                {srv.duration_minutes ? `${srv.duration_minutes} د` : '—'}
                              </td>

                              <td className="p-4 text-center">
                                {srv.popular ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    الأكثر طلباً ★
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleServiceActive(srv)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                                    srv.is_active
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {srv.is_active ? 'نشط' : 'معطل'}
                                </button>
                              </td>

                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditService(srv)}
                                    title="تعديل الخدمة"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteService(srv.id, srv.name)}
                                    title="حذف الخدمة"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Service Bookings (حجوزات وطلبات الخدمات) */}
          {servicesSubTab === 'bookings' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span>سجل طلبات وحجوزات الخدمات الفورية</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الطلبات المباشرة المرسلة من العملاء لخدمات غسيل السيارات، العناية بالبخار، تغيير الزيت، والتوصيل.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Filter className="w-3.5 h-3.5" />
                    <span>تصفية:</span>
                  </div>
                  <select
                    value={bookingFilterStatus}
                    onChange={(e) => setBookingFilterStatus(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="confirmed">مؤكد</option>
                    <option value="in_progress">جاري التنفيذ</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                  <button
                    type="button"
                    onClick={loadServiceBookings}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all cursor-pointer"
                  >
                    تحديث
                  </button>
                </div>
              </div>

              {loadingServiceBookings ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-200">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-sm font-bold">جاري تحميل الحجوزات...</span>
                </div>
              ) : serviceBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm">لا توجد طلبات حجوزات مسجلة حالياً.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                        <tr>
                          <th className="p-4">رقم الطلب</th>
                          <th className="p-4">العميل والهاتف</th>
                          <th className="p-4">الخدمات المطلوبة</th>
                          <th className="p-4">الموقع / المركبة</th>
                          <th className="p-4">موعد التنفيذ</th>
                          <th className="p-4">السعر والدفع</th>
                          <th className="p-4 text-center">حالة الحجز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {serviceBookings
                          .filter((b) => bookingFilterStatus === 'all' || b.status === bookingFilterStatus)
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-4 text-xs font-mono font-bold text-slate-900">
                                {b.booking_number || b.id.slice(0, 8)}
                              </td>

                              <td className="p-4 text-xs">
                                <div className="font-bold text-slate-900">{b.customer_name || 'عميل'}</div>
                                {b.customer_phone && (
                                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{b.customer_phone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="p-4 text-xs">
                                <div className="font-bold text-purple-900">
                                  {b.services_summary || b.service_name}
                                </div>
                                {b.oil_type && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                    زيت: {b.oil_type}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-xs text-slate-600">
                                <div className="max-w-[200px] truncate" title={b.location_address || ''}>
                                  {b.location_address || '—'}
                                </div>
                              </td>

                              <td className="p-4 text-xs">
                                <div className="font-bold text-slate-900">{b.booking_date}</div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{b.booking_time}</span>
                                </div>
                              </td>

                              <td className="p-4 text-xs font-mono">
                                <div className="font-bold text-teal-800">{b.price} ج.م</div>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-sans ${
                                  b.payment_status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {b.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                </span>
                              </td>

                              <td className="p-4 text-center">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as any)}
                                  className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer ${
                                    b.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : b.status === 'confirmed'
                                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                                      : b.status === 'in_progress'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : b.status === 'cancelled'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                                      : 'bg-slate-100 text-slate-800 border-slate-300'
                                  }`}
                                >
                                  <option value="pending">قيد الانتظار</option>
                                  <option value="confirmed">مؤكد</option>
                                  <option value="in_progress">جاري التنفيذ</option>
                                  <option value="completed">مكتمل</option>
                                  <option value="cancelled">ملغي</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Legacy Single-Visit Packages */}
          {servicesSubTab === 'packages' && renderPackagesTable(servicePackages, 'services')}
        </div>
      )}

      {/* Modal: Add / Edit On-Demand Service */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingService ? 'تعديل بيانات الخدمة الفورية' : 'إضافة خدمة فورية جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ستظهر هذه الخدمة مباشرة في شاشتي الخدمات وتفاصيل العناية بالسيارة (B-Care)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الخدمة *</label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    placeholder="مثال: غسيل برة وجوة خاص"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القطاع *</label>
                  <select
                    value={serviceFormData.category}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="car">خدمات السيارات</option>
                    <option value="building">خدمات العمارات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المجموعة (العنوان التوضيحي)</label>
                  <input
                    type="text"
                    value={serviceFormData.group_name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, group_name: e.target.value })}
                    placeholder="غسيل وعناية / صيانة / تنظيف..."
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف الفرعي لفلتر شاشة العناية</label>
                  <select
                    value={serviceFormData.sub_category}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, sub_category: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="wash">غسيل</option>
                    <option value="maint">صيانة</option>
                    <option value="shine">حماية وتلميع</option>
                    <option value="general">عام / أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceFormData.price}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع السعر</label>
                  <select
                    value={serviceFormData.price_type}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, price_type: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="fixed">ثابت</option>
                    <option value="starting_at">يبدأ من</option>
                    <option value="custom">حسب التفاصيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدة التقريبية (دقيقة)</label>
                  <input
                    type="number"
                    min="5"
                    value={serviceFormData.duration_minutes}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: Number(e.target.value) || 45 })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف الخدمة</label>
                <textarea
                  rows={2}
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  placeholder="وصف مختصر يوضح طبيعة الخدمة للعميل..."
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>صورة الخدمة (تظهر في شاشات العميل بنمط بطاقات المتجر)</span>
                  <span className="text-[10px] text-purple-600 font-bold">ضغط تلقائي WebP فائق التوفير</span>
                </label>
                {serviceFormData.image_url ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img src={serviceFormData.image_url} alt="معاينة الخدمة" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setServiceFormData((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      title="إزالة الصورة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-purple-500 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-purple-50/30 transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">اضغط لاختيار صورة للخدمة</span>
                    <span className="text-[10px] text-slate-400">يتم ضغطها وتصغيرها بأعلى كفاءة لحفظ السعة</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadStorageAsset(file, 'services');
                            setServiceFormData((prev) => ({ ...prev, image_url: url }));
                          } catch (err: any) {
                            alert('فشل رفع الصورة: ' + (err.message || 'خطأ'));
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المزايا المشمولة في بطاقة الخدمة (افصل بينها بفاصلة أو سطر جديد)
                </label>
                <textarea
                  rows={2}
                  value={serviceFormData.includesText}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, includesText: e.target.value })}
                  placeholder="الهيكل الخارجي, الزجاج والجنوط, المقصورة الداخلية..."
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أيقونة الخدمة في البطاقة</label>
                  <select
                    value={serviceFormData.icon_type}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, icon_type: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="spark">Spark (لمعان ونظافة)</option>
                    <option value="drop">Drop (قطرة زيت / سوائل)</option>
                    <option value="steam">Steam (بخار وتعقيم)</option>
                    <option value="gem">Gem (ألماسة / تلميع فائق)</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={serviceFormData.popular}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, popular: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>علامة "الأكثر طلباً" ★</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={serviceFormData.is_active}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>نشط ومتاح للطلب</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingService}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSavingService && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingService ? 'حفظ التعديلات' : 'إضافة الخدمة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    addModalType === 'cars'
                      ? 'bg-sky-50 text-sky-600'
                      : addModalType === 'buildings'
                      ? 'bg-teal-50 text-teal-600'
                      : 'bg-purple-50 text-purple-600'
                  }`}
                >
                  {addModalType === 'cars' ? (
                    <Car className="w-5 h-5" />
                  ) : addModalType === 'buildings' ? (
                    <Building className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {addModalType === 'cars'
                      ? 'إضافة باقة غسيل سيارات جديدة'
                      : addModalType === 'buildings'
                      ? 'إضافة باقة نظافة عمارات جديدة'
                      : 'إضافة خدمة فردية جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {addModalType === 'services'
                      ? 'خدمة لمرة واحدة (زيارة واحدة) بدون تحديد أي مدة زمنية'
                      : 'نظام زيارات أسبوعي متكرر مع مصفوفة نوع الخدمة لكل زيارة'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Datalist for service type autocomplete */}
            <datalist id="common-services-datalist">
              {(addModalType === 'buildings' ? BUILDING_SERVICES : CAR_SERVICES).map((srv) => (
                <option key={srv} value={srv} />
              ))}
            </datalist>

            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف الرئيسي *</label>
                  <select
                    required
                    value={pkgData.category_id}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const isServices = addModalType === 'services' || isServicesCategory(newCatId);
                      if (isServices) {
                        setPkgData({
                          ...pkgData,
                          category_id: newCatId,
                          tier: 'none' as PackageTier,
                          duration_days: 0,
                          weekly_visits_count: 1
                        });
                        setWeeklyServicesPlan([pkgData.name || 'خدمة']);
                      } else {
                        setPkgData({
                          ...pkgData,
                          category_id: newCatId,
                          tier: pkgData.tier === 'none' ? 'monthly' : pkgData.tier,
                          duration_days: pkgData.duration_days === 0 ? 30 : pkgData.duration_days,
                          weekly_visits_count: pkgData.weekly_visits_count || 3
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">اختر التصنيف الرئيسي...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {addModalType === 'services' ? 'اسم الخدمة *' : 'اسم الباقة *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      addModalType === 'cars'
                        ? 'باقة 3 زيارات أسبوعياً (سيارات)'
                        : addModalType === 'buildings'
                        ? 'باقة نظافة مدخل وسلم (عمارات)'
                        : 'خدمة غسيل وتلميع سريع'
                    }
                    value={pkgData.name}
                    onChange={(e) => setPkgData({ ...pkgData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المستوى الزمني (Tier) {addModalType === 'services' || isServicesCategory(pkgData.category_id) ? '(مغلق لتصنيف الخدمات)' : '*'}
                  </label>
                  {addModalType === 'services' || isServicesCategory(pkgData.category_id) ? (
                    <div className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 flex items-center justify-between select-none">
                      <span>بدون تحديد مدة (خدمة فردية)</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">مغلق</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={pkgData.tier}
                      onChange={(e) => {
                        const tier = e.target.value as PackageTier;
                        const days = tier === 'monthly' ? 30 : tier === 'quarterly' ? 90 : tier === 'semi_annual' ? 180 : tier === 'annual' ? 365 : 30;
                        setPkgData({ ...pkgData, tier, duration_days: days });
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="monthly">شهري (30 يوم)</option>
                      <option value="quarterly">ربع سنوي (90 يوم)</option>
                      <option value="semi_annual">نصف سنوي (180 يوم)</option>
                      <option value="annual">سنوي (365 يوم)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {addModalType === 'services' || isServicesCategory(pkgData.category_id) ? 'إجمالي عدد الزيارات المقررة' : 'عدد الزيارات في الأسبوع الواحد *'}
                  </label>
                  {addModalType === 'services' || isServicesCategory(pkgData.category_id) ? (
                    <div className="w-full px-3.5 py-2.5 text-xs bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-800 flex items-center justify-between">
                      <span>زيارة واحدة فقط بدون تحديد مدة</span>
                      <span className="text-[10px] bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded font-black font-mono">1 زيارة</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        required
                        min={1}
                        max={7}
                        value={pkgData.weekly_visits_count}
                        onChange={(e) => handleWeeklyVisitsChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-teal-50/50 border border-teal-300 rounded-xl font-mono font-black text-teal-800"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        أدخل رقماً (مثلاً: 2 أو 3 أو 5) يمثل عدد الزيارات أسبوعياً
                      </span>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة الباقة (نشط / معطل)
                  </label>
                  <select
                    value={pkgData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setPkgData({ ...pkgData, is_active: e.target.value === 'active' })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="active">نشط (متاحة للاشتراك)</option>
                    <option value="inactive">معطل (غير نشطة)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Service Matrix */}
              {addModalType === 'services' || isServicesCategory(pkgData.category_id) ? (
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-teal-900">
                      تصنيف الخدمات: إجمالي الزيارات محدد بزيارة واحدة فقط بدون تحديد أي مدة زمنية.
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع ومسمى الخدمة للزيارة:</label>
                    <input
                      type="text"
                      required
                      list="common-services-datalist"
                      placeholder="مثال: غسيل شامل، تنظيف داخلي وخارجي..."
                      value={weeklyServicesPlan[0] || pkgData.name || ''}
                      onChange={(e) => handleServicePlanItemChange(0, e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-teal-300 rounded-xl font-bold text-teal-900"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 bg-white/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                    <span>إجمالي الزيارات المقررة:</span>
                    <strong className="text-teal-800 font-mono">1 زيارة واحدة فقط (خدمة لمرة واحدة)</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                      <h4 className="text-xs font-black text-teal-900">
                        مصفوفة خطة الخدمة الأسبوعية ({weeklyServicesPlan.length} زيارات في الأسبوع)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                      {Number(pkgData.weekly_visits_count) || 1} زيارات أسبوعياً
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    حدد نوع الخدمة لكل زيارة في الأسبوع. سيتم ربط الأيام المختارة بهذا الترتيب التتابعي بدقة وتكراره كل أسبوع:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {Array.from({ length: Math.max(1, Math.min(Number(pkgData.weekly_visits_count) || 1, 7)) }).map((_, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="text-teal-700 flex items-center gap-1">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 inline-flex items-center justify-center font-mono text-[11px]">
                              {idx + 1}
                            </span>
                            الزيارة {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400">نوع الخدمة</span>
                        </div>

                        <input
                          type="text"
                          required
                          list="common-services-datalist"
                          placeholder="نوع الخدمة..."
                          value={weeklyServicesPlan[idx] || ''}
                          onChange={(e) => handleServicePlanItemChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                        />

                        {/* Quick suggestion tags */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(addModalType === 'cars' ? CAR_SERVICES.slice(0, 4) : BUILDING_SERVICES.slice(0, 4)).map((quick) => (
                            <button
                              type="button"
                              key={quick}
                              onClick={() => handleServicePlanItemChange(idx, quick)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 transition-colors cursor-pointer"
                            >
                              {quick}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] font-semibold text-slate-500 bg-white/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                    <span>إجمالي الزيارات المقررة طوال فترة الباقة:</span>
                    <strong className="text-teal-800 font-mono">
                      {(Number(pkgData.weekly_visits_count) || 1) * Math.max(1, Math.round((Number(pkgData.duration_days) || 30) / 7))} زيارة ({Math.max(1, Math.round((Number(pkgData.duration_days) || 30) / 7))} أسابيع)
                    </strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {addModalType === 'services' ? 'وصف ومميزات الخدمة' : 'وصف ومميزات الباقة'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    addModalType === 'services'
                      ? 'تشمل تفاصيل ومميزات الخدمة وكيفية تنفيذها...'
                      : 'تشمل مميزات الباقة وتفاصيل تقديم الخدمة...'
                  }
                  value={pkgData.description}
                  onChange={(e) => setPkgData({ ...pkgData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>صورة الباقة (تظهر في شاشات العميل بنمط بطاقات المتجر)</span>
                  <span className="text-[10px] text-teal-600 font-bold">ضغط تلقائي WebP فائق التوفير</span>
                </label>
                {pkgData.image_url ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img src={pkgData.image_url} alt="معاينة الباقة" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPkgData((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      title="إزالة الصورة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-teal-50/30 transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">اضغط لاختيار صورة للباقة</span>
                    <span className="text-[10px] text-slate-400">يتم ضغطها وتصغيرها بأعلى كفاءة لحفظ مساحة التخزين</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadStorageAsset(file, 'packages');
                            setPkgData((prev) => ({ ...prev, image_url: url }));
                          } catch (err: any) {
                            alert('فشل رفع الصورة: ' + (err.message || 'خطأ'));
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{addModalType === 'services' ? 'حفظ وإضافة الخدمة' : 'حفظ وإضافة الباقة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-8 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    getPackageType(editingPackage) === 'cars'
                      ? 'bg-sky-50 text-sky-600'
                      : getPackageType(editingPackage) === 'buildings'
                      ? 'bg-teal-50 text-teal-600'
                      : 'bg-purple-50 text-purple-600'
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span>{isServicesPackage(editingPackage) ? 'تعديل بيانات الخدمة:' : 'تعديل بيانات الباقة:'}</span>
                    <span className="text-teal-700">{editingPackage.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isServicesPackage(editingPackage)
                      ? 'تحديث اسم الخدمة، التصنيف، الوصف والحالة'
                      : 'تحديث اسم الباقة، التصنيف، مدة الصلاحية، وعدد الزيارات وخطة الخدمات الأسبوعية'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Datalist for edit service type autocomplete */}
            <datalist id="edit-common-services-datalist">
              {(getPackageType(editingPackage) === 'buildings' ? BUILDING_SERVICES : CAR_SERVICES).map((srv) => (
                <option key={srv} value={srv} />
              ))}
            </datalist>

            <form onSubmit={handleSaveEditPackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف الرئيسي *</label>
                  <select
                    required
                    value={editPkgData.category_id}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const isServices = isServicesCategory(newCatId);
                      if (isServices) {
                        setEditPkgData({
                          ...editPkgData,
                          category_id: newCatId,
                          tier: 'none' as PackageTier,
                          duration_days: 0,
                          weekly_visits_count: 1
                        });
                        setEditWeeklyServicesPlan([editPkgData.name || 'خدمة']);
                      } else {
                        setEditPkgData({
                          ...editPkgData,
                          category_id: newCatId,
                          tier: editPkgData.tier === 'none' ? 'monthly' : editPkgData.tier,
                          duration_days: editPkgData.duration_days === 0 ? 30 : editPkgData.duration_days,
                          weekly_visits_count: editPkgData.weekly_visits_count || 3
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">اختر التصنيف الرئيسي...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الباقة *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الباقة..."
                    value={editPkgData.name}
                    onChange={(e) => setEditPkgData({ ...editPkgData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المستوى الزمني (Tier) {isServicesCategory(editPkgData.category_id) ? '(مغلق لتصنيف الخدمات)' : '*'}
                  </label>
                  {isServicesCategory(editPkgData.category_id) ? (
                    <div className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 flex items-center justify-between select-none">
                      <span>بدون تحديد مدة (خدمة فردية)</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">مغلق</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={editPkgData.tier}
                      onChange={(e) => {
                        const tier = e.target.value as PackageTier;
                        const days = tier === 'monthly' ? 30 : tier === 'quarterly' ? 90 : tier === 'semi_annual' ? 180 : tier === 'annual' ? 365 : 30;
                        setEditPkgData({ ...editPkgData, tier, duration_days: days });
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="monthly">شهري (30 يوم)</option>
                      <option value="quarterly">ربع سنوي (90 يوم)</option>
                      <option value="semi_annual">نصف سنوي (180 يوم)</option>
                      <option value="annual">سنوي (365 يوم)</option>
                    </select>
                  )}
                </div>

                {!isServicesCategory(editPkgData.category_id) ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      مدة الصلاحية بالأيام *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editPkgData.duration_days}
                      onChange={(e) => setEditPkgData({ ...editPkgData, duration_days: Number(e.target.value) || 30 })}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      مدة الصلاحية
                    </label>
                    <div className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 flex items-center justify-between select-none">
                      <span>بدون مدة زمنية محددة</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded">غير محدد</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isServicesCategory(editPkgData.category_id) ? 'إجمالي عدد الزيارات المقررة' : 'عدد الزيارات في الأسبوع الواحد *'}
                  </label>
                  {isServicesCategory(editPkgData.category_id) ? (
                    <div className="w-full px-3.5 py-2.5 text-xs bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-800 flex items-center justify-between">
                      <span>زيارة واحدة فقط بدون تحديد مدة</span>
                      <span className="text-[10px] bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded font-black font-mono">1 زيارة</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        required
                        min={1}
                        max={7}
                        value={editPkgData.weekly_visits_count}
                        onChange={(e) => handleEditWeeklyVisitsChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-teal-50/50 border border-teal-300 rounded-xl font-mono font-black text-teal-800 focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        عدد الزيارات التي يحصل عليها العميل أسبوعياً
                      </span>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة الباقة (نشط / معطل)
                  </label>
                  <select
                    value={editPkgData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditPkgData({ ...editPkgData, is_active: e.target.value === 'active' })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="active">نشط (متاحة للاشتراك)</option>
                    <option value="inactive">معطل (غير نشطة)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Service Matrix for Edit */}
              {isServicesCategory(editPkgData.category_id) ? (
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-teal-900">
                      تصنيف الخدمات: إجمالي الزيارات محدد بزيارة واحدة فقط بدون تحديد أي مدة زمنية.
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع ومسمى الخدمة للزيارة:</label>
                    <input
                      type="text"
                      required
                      list="edit-common-services-datalist"
                      placeholder="مثال: غسيل شامل، تنظيف داخلي وخارجي..."
                      value={editWeeklyServicesPlan[0] || editPkgData.name || ''}
                      onChange={(e) => handleEditServicePlanItemChange(0, e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-teal-300 rounded-xl font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 bg-white/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                    <span>إجمالي الزيارات المقررة:</span>
                    <strong className="text-teal-800 font-mono">1 زيارة واحدة فقط (خدمة لمرة واحدة)</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                      <h4 className="text-xs font-black text-teal-900">
                        مصفوفة خطة الخدمة الأسبوعية ({editWeeklyServicesPlan.length} زيارات في الأسبوع)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                      {Number(editPkgData.weekly_visits_count) || 1} زيارات أسبوعياً
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    حدد نوع الخدمة لكل زيارة في الأسبوع. سيتم توزيع الزيارات بهذا الترتيب التتابعي:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {Array.from({ length: Math.max(1, Math.min(Number(editPkgData.weekly_visits_count) || 1, 7)) }).map((_, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="text-teal-700 flex items-center gap-1">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 inline-flex items-center justify-center font-mono text-[11px]">
                              {idx + 1}
                            </span>
                            الزيارة {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400">نوع الخدمة</span>
                        </div>

                        <input
                          type="text"
                          required
                          list="edit-common-services-datalist"
                          placeholder="نوع الخدمة..."
                          value={editWeeklyServicesPlan[idx] || ''}
                          onChange={(e) => handleEditServicePlanItemChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                        />

                        {/* Quick suggestion tags */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(getPackageType(editingPackage) === 'cars' ? CAR_SERVICES.slice(0, 4) : BUILDING_SERVICES.slice(0, 4)).map((quick) => (
                            <button
                              type="button"
                              key={quick}
                              onClick={() => handleEditServicePlanItemChange(idx, quick)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 transition-colors cursor-pointer"
                            >
                              {quick}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] font-semibold text-slate-500 bg-white/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                    <span>إجمالي الزيارات المقررة طوال فترة الباقة:</span>
                    <strong className="text-teal-800 font-mono">
                      {(Number(editPkgData.weekly_visits_count) || 1) * Math.max(1, Math.round((Number(editPkgData.duration_days) || 30) / 7))} زيارة ({Math.max(1, Math.round((Number(editPkgData.duration_days) || 30) / 7))} أسابيع)
                    </strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isServicesPackage(editingPackage) ? 'وصف ومميزات الخدمة' : 'وصف ومميزات الباقة'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isServicesPackage(editingPackage)
                      ? 'تشمل تفاصيل ومميزات الخدمة وكيفية تنفيذها...'
                      : 'تشمل مميزات الباقة وتفاصيل تقديم الخدمة...'
                  }
                  value={editPkgData.description}
                  onChange={(e) => setEditPkgData({ ...editPkgData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>صورة الباقة (تظهر في شاشات العميل بنمط بطاقات المتجر)</span>
                  <span className="text-[10px] text-teal-600 font-bold">ضغط تلقائي WebP فائق التوفير</span>
                </label>
                {editPkgData.image_url ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img src={editPkgData.image_url} alt="معاينة الباقة" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditPkgData((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      title="إزالة الصورة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-teal-50/30 transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">اضغط لاختيار أو تغيير صورة الباقة</span>
                    <span className="text-[10px] text-slate-400">يتم ضغطها وتصغيرها بأعلى كفاءة لحفظ مساحة التخزين</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await uploadStorageAsset(file, 'packages');
                            setEditPkgData((prev) => ({ ...prev, image_url: url }));
                          } catch (err: any) {
                            alert('فشل رفع الصورة: ' + (err.message || 'خطأ'));
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Pricing Matrix by Area */}
      {activeTab === 'pricing' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  مصفوفة التسعير المرن حسب منطقة التغطية
                </h3>
                <p className="text-xs text-slate-400">
                  تحديد سعر مختلف لكل باقة وفقاً لكل كمبوند سكني على حدة (بالعملة: {settings.currency_symbol})
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveAllPricing}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
            >
              {pricingSavedNotice ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{pricingSavedNotice ? 'تم حفظ الأسعار بنجاح' : 'حفظ الأسعار المدخلة'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">الباقة</th>
                  <th className="p-4">التصنيف</th>
                  {coverageAreas.map((area) => (
                    <th key={area.id} className="p-4 text-center">
                      <div className="font-bold text-slate-900">{area.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">({area.city})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{pkg.name}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPackage(pkg)}
                          className="px-2 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="تعديل بيانات الباقة نفسها"
                        >
                          <Edit3 className="w-3 h-3 text-teal-600" />
                          <span>تعديل</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-teal-700">{getCategoryName(pkg.category_id)}</td>
                    {coverageAreas.map((area) => {
                      const key = `${pkg.id}_${area.id}`;
                      const val = getPrice(pkg.id, area.id);
                      return (
                        <td key={area.id} className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              value={val}
                              onChange={(e) =>
                                setPricingInputs({
                                  ...pricingInputs,
                                  [key]: Number(e.target.value)
                                })
                              }
                              className="w-24 px-2.5 py-1.5 text-center text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
                            />
                            <span className="text-xs text-slate-400 font-bold">{settings.currency_symbol}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Package Categories */}
      {activeTab === 'categories' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">تصنيفات الباقات والخدمات</h3>
              <p className="text-xs text-slate-400">التصنيفات الرئيسية (سيارات، عمارات، ...) قابلة للتوسع</p>
            </div>
          </div>

          <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="اسم التصنيف أو الخدمة (مثال: غسيل اليخوت / الدراجات)..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
            <select
              value={catIsActive ? 'active' : 'inactive'}
              onChange={(e) => setCatIsActive(e.target.value === 'active')}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              إضافة تصنيف
            </button>
          </form>

          <div className="space-y-3">
            {categories.map((c) => {
              const attachedPkgs = packages.filter((p) => p.category_id === c.id);
              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    c.is_active === false
                      ? 'bg-slate-100/70 border-slate-300 opacity-80'
                      : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono">
                        {attachedPkgs.length} باقة مسجلة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.description || 'خدمات وتصنيفات تخصصية'}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {onUpdateCategory ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCategory(c.id, {
                            is_active: c.is_active === false ? true : false
                          })
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          c.is_active !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-slate-600 bg-slate-200 border-slate-300 hover:bg-slate-300'
                        }`}
                        title="انقر لتغيير حالة التصنيف (نشط / غير نشط)"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            c.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        ></span>
                        <span>{c.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                          c.is_active !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                            : 'text-slate-500 bg-slate-100 border-slate-200'
                        }`}
                      >
                        {c.is_active !== false ? 'نشط' : 'غير نشط'}
                      </span>
                    )}

                    {/* زر تعديل التصنيف */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(c)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="تعديل اسم وبيانات التصنيف"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    {/* زر حذف التصنيف */}
                    {onDeleteCategory && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c)}
                        disabled={isDeletingCategoryId === c.id}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                        title="حذف التصنيف نهائياً"
                      >
                        {isDeletingCategoryId === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">تعديل التصنيف</h3>
                  <p className="text-xs text-slate-400">{editingCategory.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  placeholder="اسم التصنيف..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف التصنيف</label>
                <textarea
                  rows={2}
                  value={editCatDesc}
                  onChange={(e) => setEditCatDesc(e.target.value)}
                  placeholder="وصف وتفاصيل هذا التصنيف..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة</label>
                <select
                  value={editCatIsActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditCatIsActive(e.target.value === 'active')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
