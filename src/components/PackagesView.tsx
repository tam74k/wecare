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
  onCreatePackage: (pkg: Omit<Package, 'id' | 'created_at'>) => Promise<Package>;
  onSavePricing: (packageId: string, areaId: string, price: number) => Promise<void>;
}

export const PackagesView: React.FC<PackagesViewProps> = ({
  packages,
  categories,
  coverageAreas,
  pricing,
  settings,
  onCreateCategory,
  onCreatePackage,
  onSavePricing
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'categories' | 'pricing'>('packages');

  // New Category State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Package State
  const [pkgData, setPkgData] = useState({
    category_id: '',
    name: '',
    tier: '' as PackageTier,
    duration_days: '' as number | string,
    base_visits_count: '' as number | string,
    description: ''
  });

  // Local Pricing Matrix Editor State: { `${pkgId}_${areaId}`: price }
  const [pricingInputs, setPricingInputs] = useState<Record<string, number>>({});
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await onCreateCategory({
      name: catName.trim(),
      description: catDesc.trim(),
      is_active: true
    });
    setCatName('');
    setCatDesc('');
    alert('تمت إضافة التصنيف بنجاح!');
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgData.name.trim() || !pkgData.category_id || !pkgData.tier) {
      alert('يرجى ملء جميع الحقول المطلوبة واختيار التصنيف والمستوى الزمني');
      return;
    }
    await onCreatePackage({
      category_id: pkgData.category_id,
      name: pkgData.name.trim(),
      tier: pkgData.tier as PackageTier,
      duration_days: Number(pkgData.duration_days) || 30,
      base_visits_count: Number(pkgData.base_visits_count) || 4,
      description: pkgData.description.trim(),
      is_active: true
    });
    alert('تمت إضافة الباقة بنجاح!');
    setPkgData({
      category_id: '',
      name: '',
      tier: '' as PackageTier,
      duration_days: '',
      base_visits_count: '',
      description: ''
    });
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
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                      {getCategoryName(pkg.category_id)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {getTierLabel(pkg.tier)}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{pkg.description || 'باقة خدمات دورية متميزة'}</p>

                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>عدد الزيارات المقررة:</span>
                      <strong className="text-teal-700 text-sm font-black">{pkg.base_visits_count} زيارات</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>مدة صلاحية الباقة:</span>
                      <strong className="text-slate-900">{pkg.duration_days} يوماً</strong>
                    </div>
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
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">إضافة باقة غسيل جديدة</h3>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4">
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
                    placeholder="باقة السيارات الذهبية"
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
                      const days = tier === 'monthly' ? 30 : tier === 'quarterly' ? 90 : tier === 'semi_annual' ? 180 : tier === 'annual' ? 365 : '';
                      const visits = tier === 'monthly' ? 4 : tier === 'quarterly' ? 12 : tier === 'semi_annual' ? 24 : tier === 'annual' ? 48 : '';
                      setPkgData({ ...pkgData, tier, duration_days: days, base_visits_count: visits });
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">اختر المستوى الزمني...</option>
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="semi_annual">نصف سنوي</option>
                    <option value="annual">سنوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد الزيارات الإجمالي</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pkgData.base_visits_count}
                    onChange={(e) => setPkgData({ ...pkgData, base_visits_count: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
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
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                إضافة وتفعيل الباقة
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

          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="اسم التصنيف الجديد (مثال: غسيل اليخوت / الدراجات)..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              إضافة تصنيف
            </button>
          </form>

          <div className="space-y-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.description || 'خدمات تخصصية'}</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  نشط
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
