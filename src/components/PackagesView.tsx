import React, { useState } from 'react';
import {
  Package,
  PackageCategory,
  CoverageArea,
  PackagePricing,
  Settings,
  PackageTier
} from '../types/database';
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
  Edit3
} from 'lucide-react';

interface PackagesViewProps {
  packages: Package[];
  categories: PackageCategory[];
  coverageAreas: CoverageArea[];
  pricing: PackagePricing[];
  settings: Settings;
  onCreateCategory: (cat: Omit<PackageCategory, 'id' | 'created_at'>) => Promise<PackageCategory>;
  onUpdateCategory?: (id: string, updates: Partial<PackageCategory>) => Promise<void>;
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
  onCreatePackage,
  onUpdatePackage,
  onSavePricing
}) => {
  const [activeTab, setActiveTab] = useState<
    'packages_cars' | 'packages_buildings' | 'pricing' | 'categories'
  >('packages_cars');

  // Add Package Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'cars' | 'buildings'>('cars');

  // New Category State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);

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

  // Helper to determine package type
  const getPackageType = (pkg: Package): 'cars' | 'buildings' => {
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

  // New Package State مع نظام الزيارات الأسبوعية المتكررة
  const [pkgData, setPkgData] = useState({
    category_id: '',
    name: '',
    tier: 'monthly' as PackageTier,
    duration_days: 30 as number | string,
    weekly_visits_count: 3 as number | string,
    description: '',
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
    is_active: true
  });
  const [editWeeklyServicesPlan, setEditWeeklyServicesPlan] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    const weeklyCount = pkg.weekly_visits_count || (pkg.base_visits_count ? Math.min(pkg.base_visits_count, 7) : 3);
    const pkgType = getPackageType(pkg);
    const pool = pkgType === 'cars' ? CAR_SERVICES : BUILDING_SERVICES;

    let plan = pkg.weekly_services_plan || [];
    if (!plan || plan.length === 0) {
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
      tier: pkg.tier || 'monthly',
      duration_days: pkg.duration_days || 30,
      weekly_visits_count: weeklyCount,
      description: pkg.description || '',
      is_active: pkg.is_active !== false
    });
    setEditWeeklyServicesPlan(plan);
  };

  const handleEditWeeklyVisitsChange = (countVal: number | string) => {
    const num = Math.max(1, Math.min(Number(countVal) || 1, 7));
    setEditPkgData((prev) => ({ ...prev, weekly_visits_count: num }));

    const pkgType = editingPackage ? getPackageType(editingPackage) : 'cars';
    const pool = pkgType === 'cars' ? CAR_SERVICES : BUILDING_SERVICES;

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
    if (!editPkgData.name.trim() || !editPkgData.category_id || !editPkgData.tier) {
      alert('يرجى ملء جميع الحقول المطلوبة');
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

  const handleOpenAddPackage = (type: 'cars' | 'buildings') => {
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
        is_active: true
      });
      setWeeklyServicesPlan(['غسيل', 'فوطة 1', 'فوطة 2']);
    } else {
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
        is_active: true
      });
      setWeeklyServicesPlan(['غسيل سلم', 'نظافة مداخل']);
    }
    setShowAddModal(true);
  };

  const handleWeeklyVisitsChange = (countVal: number | string) => {
    const num = Math.max(1, Math.min(Number(countVal) || 1, 7));
    setPkgData((prev) => ({ ...prev, weekly_visits_count: num }));

    const pool = addModalType === 'cars' ? CAR_SERVICES : BUILDING_SERVICES;

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

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgData.name.trim() || !pkgData.category_id || !pkgData.tier) {
      alert('يرجى ملء جميع الحقول المطلوبة واختيار التصنيف والمستوى الزمني');
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
      is_active: pkgData.is_active
    });

    alert('تمت إضافة الباقة بنجاح!');
    setShowAddModal(false);
    setActiveTab(addModalType === 'cars' ? 'packages_cars' : 'packages_buildings');
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

  const getTierLabel = (tier: PackageTier) => {
    switch (tier) {
      case 'monthly': return 'شهري (30 يوم)';
      case 'quarterly': return 'ربع سنوي (90 يوم)';
      case 'semi_annual': return 'نصف سنوي (180 يوم)';
      case 'annual': return 'سنوي (365 يوم)';
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'غير محدد';

  // Render Table for Packages (Cars / Buildings)
  const renderPackagesTable = (pkgList: Package[], type: 'cars' | 'buildings') => {
    const isCars = type === 'cars';
    return (
      <div className="space-y-4">
        {/* Top Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCars ? 'bg-sky-50 text-sky-600' : 'bg-teal-50 text-teal-600'
              }`}
            >
              {isCars ? <Car className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {isCars ? 'جدول باقات غسيل السيارات' : 'جدول باقات نظافة العمارات'}
              </h3>
              <p className="text-xs text-slate-500">
                {isCars
                  ? `عرض تفصيلي لـ (${pkgList.length}) باقة لغسيل المركبات مع مواعيد الزيارات الأسبوعية ومصفوفة الخدمة`
                  : `عرض تفصيلي لـ (${pkgList.length}) باقة لنظافة وغسيل العمارات والمداخل مع خطة الخدمات`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddPackage(type)}
            className={`px-4 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
              isCars
                ? 'bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isCars ? '+ إضافة باقة سيارات جديدة' : '+ إضافة باقة عمارات جديدة'}</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {pkgList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm">
                {isCars
                  ? 'لم يتم العثور على أي باقات مسجلة لغسيل السيارات.'
                  : 'لم يتم العثور على أي باقات مسجلة لنظافة العمارات.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddPackage(type)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isCars ? 'إضافة أول باقة سيارات' : 'إضافة أول باقة عمارات'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-4">الباقة والتصنيف</th>
                    <th className="p-4">المستوى الزمني</th>
                    <th className="p-4">الزيارات الأسبوعية</th>
                    <th className="p-4">الصلاحية والإجمالي</th>
                    <th className="p-4">تسلسل خطة الخدمات بالأسبوع</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">التسعير والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {pkgList.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
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
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-800">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold inline-block">
                          {getTierLabel(pkg.tier)}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-black text-teal-800 text-sm">
                          {pkg.weekly_visits_count || 1} زيارات
                        </div>
                        <div className="text-[11px] text-slate-400">في الأسبوع الواحد</div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-slate-900 font-mono">
                          {pkg.duration_days} يوماً
                        </div>
                        <div className="text-teal-700 font-bold text-[11px]">
                          {pkg.base_visits_count || (pkg.weekly_visits_count || 1) * 4} زيارة بالدورة
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
                                <span className="text-[9px] bg-teal-600 text-white px-1 rounded-sm font-mono font-bold">
                                  {idx + 1}
                                </span>
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
                            title="تعديل اسم الباقة، التصنيف، عدد الزيارات، ومصفوفة الخدمات"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                            <span>تعديل الباقة</span>
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
            تصنيفات الباقات (سيارات، عمارات)، المستويات الزمنية، وجدول التسعير المرن حسب الكمبوند / المنطقة
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

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-cairo">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    addModalType === 'cars' ? 'bg-sky-50 text-sky-600' : 'bg-teal-50 text-teal-600'
                  }`}
                >
                  {addModalType === 'cars' ? <Car className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {addModalType === 'cars' ? 'إضافة باقة غسيل سيارات جديدة' : 'إضافة باقة نظافة عمارات جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    نظام زيارات أسبوعي متكرر مع مصفوفة نوع الخدمة لكل زيارة
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
              {(addModalType === 'cars' ? CAR_SERVICES : BUILDING_SERVICES).map((srv) => (
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
                    onChange={(e) => setPkgData({ ...pkgData, category_id: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الباقة *</label>
                  <input
                    type="text"
                    required
                    placeholder={addModalType === 'cars' ? 'باقة 3 زيارات أسبوعياً (سيارات)' : 'باقة نظافة مدخل وسلم (عمارات)'}
                    value={pkgData.name}
                    onChange={(e) => setPkgData({ ...pkgData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المستوى الزمني (Tier) *</label>
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عدد الزيارات في الأسبوع الواحد *
                  </label>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف ومميزات الباقة</label>
                <textarea
                  rows={2}
                  placeholder="تشمل مميزات الباقة وتفاصيل تقديم الخدمة..."
                  value={pkgData.description}
                  onChange={(e) => setPkgData({ ...pkgData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                ></textarea>
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
                  <span>حفظ وإضافة الباقة</span>
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
                    getPackageType(editingPackage) === 'cars' ? 'bg-sky-50 text-sky-600' : 'bg-teal-50 text-teal-600'
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span>تعديل بيانات الباقة:</span>
                    <span className="text-teal-700">{editingPackage.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    تحديث اسم الباقة، التصنيف، مدة الصلاحية، وعدد الزيارات وخطة الخدمات الأسبوعية
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
              {(getPackageType(editingPackage) === 'cars' ? CAR_SERVICES : BUILDING_SERVICES).map((srv) => (
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
                    onChange={(e) => setEditPkgData({ ...editPkgData, category_id: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المستوى الزمني (Tier) *</label>
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
                </div>

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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عدد الزيارات في الأسبوع الواحد *
                  </label>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف ومميزات الباقة</label>
                <textarea
                  rows={2}
                  placeholder="تشمل مميزات الباقة وتفاصيل تقديم الخدمة..."
                  value={editPkgData.description}
                  onChange={(e) => setEditPkgData({ ...editPkgData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
                ></textarea>
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
            {categories.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  c.is_active === false
                    ? 'bg-slate-100/70 border-slate-300 opacity-80'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.description || 'خدمات وتصنيفات تخصصية'}</p>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
