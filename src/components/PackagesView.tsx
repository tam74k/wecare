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
  Layers
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
  const [activeTab, setActiveTab] = useState<'packages' | 'categories' | 'pricing'>('packages');

  // New Category State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);

  // قائمة أنواع الخدمات الشائعة للاقتراح والإكمال التلقائي
  const COMMON_SERVICES = [
    'غسيل',
    'فوطة 1',
    'فوطة 2',
    'تنظيف داخلي',
    'تلميع',
    'غسيل وتلميع',
    'غسيل واجهات',
    'نظافة مداخل',
    'غسيل سلم'
  ];

  // New Package State مع نظام الزيارات الأسبوعية المتكررة
  const [pkgData, setPkgData] = useState({
    category_id: '',
    name: '',
    tier: '' as PackageTier,
    duration_days: 30 as number | string,
    weekly_visits_count: 3 as number | string, // عدد الزيارات في الأسبوع الواحد (مثلاً: 3، 5، 7)
    description: '',
    is_active: true
  });

  // مصفوفة خطة الخدمات الأسبوعية المتولدة ديناميكياً (طولها مساوٍ لـ weekly_visits_count)
  const [weeklyServicesPlan, setWeeklyServicesPlan] = useState<string[]>(['غسيل', 'فوطة 1', 'فوطة 2']);

  // Local Pricing Matrix Editor State: { `${pkgId}_${areaId}`: price }
  const [pricingInputs, setPricingInputs] = useState<Record<string, number>>({});
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  // تحديث عدد الزيارات الأسبوعية وتوليد حقول مصفوفة الخدمات تلقائياً
  const handleWeeklyVisitsChange = (countVal: number | string) => {
    const num = Math.max(1, Math.min(Number(countVal) || 1, 7));
    setPkgData((prev) => ({ ...prev, weekly_visits_count: num }));

    setWeeklyServicesPlan((prevPlan) => {
      const nextPlan = [...prevPlan];
      if (num > nextPlan.length) {
        for (let i = nextPlan.length; i < num; i++) {
          nextPlan.push(COMMON_SERVICES[i % COMMON_SERVICES.length] || '');
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

    // التحقق الصارم: لا يُسمح بحفظ الباقة إلا بعد ملء كافة حقول الزيارات الأسبوعية الناتجة
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
    setPkgData({
      category_id: '',
      name: '',
      tier: '' as PackageTier,
      duration_days: 30,
      weekly_visits_count: 3,
      description: '',
      is_active: true
    });
    setWeeklyServicesPlan(['غسيل', 'فوطة 1', 'فوطة 2']);
    setActiveTab('packages');
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

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'packages' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل الباقات
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pricing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مصفوفة التسعير بالمناطق
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            التصنيفات الرئيسية
          </button>
        </div>
      </div>

      {/* Tab 1: Packages List & Add Package */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white p-6 rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  pkg.is_active === false
                    ? 'border-dashed border-slate-300 bg-slate-50/60 opacity-85'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                      {getCategoryName(pkg.category_id)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onUpdatePackage && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePackage(pkg.id, {
                              is_active: pkg.is_active === false ? true : false
                            })
                          }
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                            pkg.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                          title="انقر لتغيير حالة الباقة (نشط / غير نشط)"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pkg.is_active !== false ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          ></span>
                          <span>{pkg.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                        </button>
                      )}
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {getTierLabel(pkg.tier)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{pkg.description || 'باقة خدمات دورية متميزة'}</p>

                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>تكرار الزيارات الأسبوعي:</span>
                      <strong className="text-teal-700 text-sm font-black">
                        {pkg.weekly_visits_count || 1} زيارات أسبوعياً
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>مدة صلاحية الباقة:</span>
                      <strong className="text-slate-900">{pkg.duration_days} يوماً ({pkg.base_visits_count || (pkg.weekly_visits_count || 1) * 4} زيارة إجمالية)</strong>
                    </div>

                    {/* خطة الخدمات الأسبوعية المتتابعة */}
                    {pkg.weekly_services_plan && pkg.weekly_services_plan.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-slate-200/60">
                        <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          تسلسل خطة الخدمات بالأسبوع:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {pkg.weekly_services_plan.map((srv, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs"
                            >
                              <span className="text-[9px] bg-teal-600 text-white px-1 rounded-sm font-mono font-bold">
                                زيارة {idx + 1}
                              </span>
                              <span>{srv}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">تسعير مرن بالكمبوند</span>
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-800"
                  >
                    تعديل الأسعار ←
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Package Card Form */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">إضافة باقة غسيل جديدة</h3>
                <p className="text-xs text-slate-500">نظام زيارات أسبوعي متكرر مع مصفوفة نوع الخدمة لكل زيارة</p>
              </div>
            </div>

            {/* Datalist for service type autocomplete */}
            <datalist id="common-services-datalist">
              {COMMON_SERVICES.map((srv) => (
                <option key={srv} value={srv} />
              ))}
            </datalist>

            <form onSubmit={handleCreatePackage} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف الرئيسي</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الباقة</label>
                  <input
                    type="text"
                    required
                    placeholder="باقة 3 زيارات أسبوعياً (بلاتينيوم)"
                    value={pkgData.name}
                    onChange={(e) => setPkgData({ ...pkgData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المستوى الزمني (Tier)</label>
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
                    <option value="">اختر المستوى الزمني...</option>
                    <option value="monthly">شهري (30 يوم)</option>
                    <option value="quarterly">ربع سنوي (90 يوم)</option>
                    <option value="semi_annual">نصف سنوي (180 يوم)</option>
                    <option value="annual">سنوي (365 يوم)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عدد الزيارات في الأسبوع الواحد (weekly_visits_count)
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
                    أدخل رقماً صحيحاً (مثلاً: 3، 5، 7) يمثل تكرار الزيارات أسبوعياً
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة الباقة (نشط / غير نشط)
                  </label>
                  <select
                    value={pkgData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setPkgData({ ...pkgData, is_active: e.target.value === 'active' })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="active">نشط (متاحة للاشتراك)</option>
                    <option value="inactive">غير نشط (معطلة)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Service Matrix توليد حقول خطة الخدمة ديناميكياً */}
              <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                    <h4 className="text-xs font-black text-teal-900">
                      مصفوفة خطة الخدمة الأسبوعية (Dynamic Service Matrix)
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
                        placeholder="مثال: غسيل، فوطة 1، فوطة 2..."
                        value={weeklyServicesPlan[idx] || ''}
                        onChange={(e) => handleServicePlanItemChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                      />

                      {/* Quick suggestion tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {['غسيل', 'فوطة 1', 'فوطة 2', 'تنظيف داخلي'].map((quick) => (
                          <button
                            type="button"
                            key={quick}
                            onClick={() => handleServicePlanItemChange(idx, quick)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-600 transition-colors"
                          >
                            {quick}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] font-semibold text-slate-500 bg-white/70 p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                  <span>
                    إجمالي الزيارات المقررة طوال فترة الباقة:
                  </span>
                  <strong className="text-teal-800 font-mono">
                    {(Number(pkgData.weekly_visits_count) || 1) * Math.max(1, Math.round((Number(pkgData.duration_days) || 30) / 7))} زيارة ({Math.max(1, Math.round((Number(pkgData.duration_days) || 30) / 7))} أسابيع)
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف ومميزات الباقة</label>
                <textarea
                  rows={2}
                  placeholder="تشمل غسيل خارجي شامبو مخصص تلميع جنوط وفرش..."
                  value={pkgData.description}
                  onChange={(e) => setPkgData({ ...pkgData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                إضافة وتفعيل الباقة بخطة الزيارات الأسبوعية
              </button>
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
                    <td className="p-4 font-bold text-slate-900">{pkg.name}</td>
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
