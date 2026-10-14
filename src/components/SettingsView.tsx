import React, { useState } from 'react';
import { Settings, CoverageArea, PostponementReason } from '../types/database';
import { ARAB_COUNTRIES, ArabCountry } from '../data/arabCountries';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { isLibSqlConfigured, testLibSqlConnection, seedLibSqlDatabase } from '../lib/libsql';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Save,
  Check,
  Coins,
  Globe,
  UploadCloud,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';

interface SettingsViewProps {
  settings: Settings;
  coverageAreas: CoverageArea[];
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
  onCreateArea: (area: Omit<CoverageArea, 'id' | 'created_at'>) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  coverageAreas,
  onSaveSettings,
  onCreateArea,
  onDeleteArea
}) => {
  const [formData, setFormData] = useState({
    company_name: settings.company_name || '',
    logo_url: settings.logo_url || '',
    country: settings.country || '',
    currency_symbol: settings.currency_symbol || '',
    currency_code: settings.currency_code || '',
    dial_code: settings.dial_code || '',
    whatsapp_instance: settings.whatsapp_instance || '',
    whatsapp_api_key: settings.whatsapp_api_key || '',
    vodafone_cash_number: settings.vodafone_cash_number || '',
    instapay_handle: settings.instapay_handle || ''
  });

  React.useEffect(() => {
    setFormData({
      company_name: settings.company_name || '',
      logo_url: settings.logo_url || '',
      country: settings.country || '',
      currency_symbol: settings.currency_symbol || '',
      currency_code: settings.currency_code || '',
      dial_code: settings.dial_code || '',
      whatsapp_instance: settings.whatsapp_instance || '',
      whatsapp_api_key: settings.whatsapp_api_key || '',
      vodafone_cash_number: settings.vodafone_cash_number || '',
      instapay_handle: settings.instapay_handle || ''
    });
  }, [settings]);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadNotice, setLogoUploadNotice] = useState<string | null>(null);

  // New Area Form
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('');
  const [isAddingArea, setIsAddingArea] = useState(false);

  // libSQL Database Diagnostics State
  const [isTestingLibSql, setIsTestingLibSql] = useState(false);
  const [libSqlStatusMsg, setLibSqlStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSeedingLibSql, setIsSeedingLibSql] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const handleTestLibSql = async () => {
    setIsTestingLibSql(true);
    setLibSqlStatusMsg(null);
    try {
      const result = await testLibSqlConnection();
      setLibSqlStatusMsg({ ok: result.ok, text: result.message });
    } catch (e: any) {
      setLibSqlStatusMsg({ ok: false, text: e.message || 'حدث خطأ أثناء فحص اتصال libSQL' });
    } finally {
      setIsTestingLibSql(false);
    }
  };

  const handleSeedLibSql = async () => {
    if (!window.confirm('هل تريد إعادة زرع وتحديث الجداول والبيانات التأسيسية في قاعدة بيانات libSQL؟')) return;
    setIsSeedingLibSql(true);
    setSeedSuccessMsg(null);
    try {
      const ok = await seedLibSqlDatabase();
      if (ok) {
        setSeedSuccessMsg('تمت تهيئة وزرع جميع الجداول والبيانات التأسيسية في libSQL بنجاح!');
        setTimeout(() => setSeedSuccessMsg(null), 5000);
      } else {
        alert('فشل زرع البيانات في libSQL');
      }
    } catch (e: any) {
      alert('خطأ أثناء زرع البيانات: ' + e.message);
    } finally {
      setIsSeedingLibSql(false);
    }
  };

  // Postponement Reasons State (Managed by Admin for Workers)
  const [postponementReasons, setPostponementReasons] = useState<PostponementReason[]>([]);
  const [newReasonText, setNewReasonText] = useState('');

  React.useEffect(() => {
    api.getPostponementReasons().then((reasons) => setPostponementReasons(reasons));
  }, []);

  const handleAddReason = async () => {
    if (!newReasonText.trim()) return;
    const updated: PostponementReason[] = [
      ...postponementReasons,
      { id: Date.now().toString(), reason: newReasonText.trim(), is_active: true }
    ];
    setPostponementReasons(updated);
    await api.savePostponementReasons(updated);
    setNewReasonText('');
  };

  const handleDeleteReason = async (id: string) => {
    const updated = postponementReasons.filter((r) => r.id !== id);
    setPostponementReasons(updated);
    await api.savePostponementReasons(updated);
  };

  // تغيير الدولة وتحديث العملة وكود الاتصال الدولي تلقائياً
  const handleCountryChange = (countryName: string) => {
    const selected = ARAB_COUNTRIES.find((c) => c.name === countryName);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        country: selected.name,
        currency_symbol: selected.currencySymbol,
        currency_code: selected.currencyCode,
        dial_code: selected.dialCode
      }));
    }
  };

  // رفع الشعار من الجهاز مع الضغط الفوري والحفظ في المخزن
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      setLogoUploadNotice('جاري ضغط وتقليص حجم الشعار ورفعه إلى المخزن السحابي...');

      // رفع وتخزين مع حذف الشعار القديم إن وُجد
      const uploadedUrl = await uploadStorageAsset(file, 'logos', formData.logo_url);
      setFormData((prev) => ({ ...prev, logo_url: uploadedUrl }));
      setLogoUploadNotice('تم ضغط ورفع الشعار بنجاح وحفظه في مخزن الأصول (carwash-assets)');
      setTimeout(() => setLogoUploadNotice(null), 4000);
    } catch (err: any) {
      alert('حدث خطأ أثناء رفع الشعار: ' + (err.message || 'يرجى المحاولة مجدداً'));
      setLogoUploadNotice(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveSettings(formData);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    try {
      setIsAddingArea(true);
      await onCreateArea({
        name: newAreaName.trim(),
        city: newAreaCity.trim(),
        is_active: true
      });
      setNewAreaName('');
      setNewAreaCity('');
    } catch (err: any) {
      alert('حدث خطأ أثناء إضافة المنطقة: ' + (err.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsAddingArea(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900">إدارة الإعدادات العامة ومناطق التغطية</h2>
        <p className="text-sm text-slate-500 mt-1">
          تخصيص بيانات المؤسسة، هوية الفواتير، عملة النظام المعتمدة، كود واتساب الدولي، ومناطق التغطية
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organization Info Form */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">بيانات المؤسسة والهوية والعملة</h3>
              <p className="text-xs text-slate-400">تُطبق هذه البيانات في كافة صفحات وفواتير وتقارير النظام</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المؤسسة / الشركة</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* الشعار المرفوع من الجهاز مع الضغط التلقائي */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <span>شعار المؤسسة الرسمي</span>
                </span>
                <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  مخزن سحابي مضغوط (carwash-assets)
                </span>
              </label>

              <div className="flex items-center gap-4">
                <img
                  src={formData.logo_url}
                  alt="معاينة الشعار"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs bg-white"
                  onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=Logo')}
                />
                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-teal-600" />
                    )}
                    <span>{isUploadingLogo ? 'جاري ضغط ورفع الشعار...' : 'رفع شعار من الجهاز'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    يتم تقليص حجم الصورة تلقائياً للحفاظ على الأداء وحذف الشعار القديم عند الاستبدال.
                  </p>
                </div>
              </div>

              {logoUploadNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{logoUploadNotice}</span>
                </div>
              )}

              {/* رابط الشعار المباشر */}
              <div>
                <input
                  type="url"
                  required
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="رابط الشعار المعتمد..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 font-mono"
                />
              </div>
            </div>

            {/* اختيار الدولة من قائمة الدول العربية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>الدولة (اختيار من الدول العربية)</span>
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  {ARAB_COUNTRIES.map((c) => (
                    <option key={c.dialCode} value={c.name}>
                      {c.name} ({c.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* رمز العملة المستخرج والمعتمد */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-teal-600" />
                  <span>رمز العملة المعتمد بالنظام</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${formData.currency_symbol} (${formData.currency_code})`}
                  className="w-full px-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-teal-800 font-black cursor-not-allowed font-mono"
                />
              </div>
            </div>

            {/* الكود الدولي للاتصال (بدون + وبدون 00 لاستخدامه لاحقاً في واتساب) */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>كود الاتصال الدولي للدولة المحددة (لخدمة واتساب)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={formData.dial_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dial_code: e.target.value.replace(/[^0-9]/g, '') // أرقام فقط بدون + أو 00
                    })
                  }
                  placeholder="مثال: 20 أو 966"
                  className="w-32 px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl font-mono font-black text-emerald-800 text-center tracking-wider"
                />
                <span className="text-xs text-emerald-700 font-medium">
                  كود دولي نقي (بدون علامة + وبدون 00) مجهز للربط التلقائي مع أرقام العملاء عبر واتساب.
                </span>
              </div>
            </div>

            {/* إعدادات الربط مع واتساب */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">إعدادات الربط مع واتساب</h4>
                  <p className="text-[11px] text-slate-500">تهيئة بيانات الربط لإرسال الرسائل والإشعارات آلياً</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span>Instance</span>
                    <span className="text-slate-400 font-normal mr-1.5">(معرف المثيل)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp_instance}
                    onChange={(e) => setFormData({ ...formData, whatsapp_instance: e.target.value })}
                    placeholder="مثال: instance-name"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span>Api key</span>
                    <span className="text-slate-400 font-normal mr-1.5">(مفتاح الـ API)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp_api_key}
                    onChange={(e) => setFormData({ ...formData, whatsapp_api_key: e.target.value })}
                    placeholder="أدخل مفتاح الـ Api key"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* بيانات استقبال تحويلات المتجر الإلكتروني (فودافون كاش & انستاباي) */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">
                  E-Pay
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">حسابات تحويل المتجر الإلكتروني</h4>
                  <p className="text-[11px] text-slate-500">الأرقام والحسابات المعتمدة التي تظهر للعملاء لتحويل قيمة المشتريات</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    <label className="text-xs font-bold text-slate-800">رقم فودافون كاش (Vodafone Cash)</label>
                  </div>
                  <input
                    type="text"
                    value={formData.vodafone_cash_number}
                    onChange={(e) => setFormData({ ...formData, vodafone_cash_number: e.target.value })}
                    placeholder="مثال: 01012345678"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500 font-mono text-slate-800"
                    dir="ltr"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <label className="text-xs font-bold text-slate-800">حساب / عنوان انستاباي (InstaPay)</label>
                  </div>
                  <input
                    type="text"
                    value={formData.instapay_handle}
                    onChange={(e) => setFormData({ ...formData, instapay_handle: e.target.value })}
                    placeholder="مثال: username@instapay أو رقم موبايل"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono text-slate-800"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>تم حفظ الإعدادات بنجاح</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Coverage Areas Management */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">مناطق التغطية</h3>
              <p className="text-xs text-slate-400">إضافة وإدارة نطاقات وتجمعات الخدمة والتغطية الجغرافية</p>
            </div>
          </div>

          {/* Add New Area Form */}
          <form onSubmit={handleAddArea} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="اسم منطقة التغطية (مثل: التجمع الخامس، الشيخ زايد، المعادي)..."
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium"
            />
            <button
              type="submit"
              disabled={isAddingArea}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </form>

          {/* List of Coverage Areas */}
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {coverageAreas.map((area) => (
              <div
                key={area.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{area.name}</span>
                    {area.city ? <span className="text-xs text-slate-400 mr-2">({area.city})</span> : null}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm(`هل أنت متأكد من رغبتك في حذف منطقة "${area.name}"؟`)) {
                      try {
                        await onDeleteArea(area.id);
                      } catch (err: any) {
                        alert('حدث خطأ أثناء حذف المنطقة: ' + (err.message || 'قد تكون المنطقة مرتبطة باشتراكات أو عملاء'));
                      }
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="حذف المنطقة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Postponement Reasons Management Card (For Workers app) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>أسباب تأجيل الزيارات الميدانية (لتطبيق العامل)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                حدد قائمة الأسباب المعتمدة التي يُلزم فني الغسيل بالاختيار من بينها عند تعذر إتمام الزيارة وتأجيلها
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {postponementReasons.length} سبب معتمد
            </span>
          </div>

          {/* Add New Reason Form */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="اكتب سبب تأجيل جديد (مثال: عدم تواجد السيارة في الموقع)..."
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500"
            />
            <button
              onClick={handleAddReason}
              disabled={!newReasonText.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة سبب</span>
            </button>
          </div>

          {/* Reasons List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {postponementReasons.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between hover:bg-amber-50/50 hover:border-amber-200 transition-all text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <span className="font-bold text-slate-800">{item.reason}</span>
                </div>
                <button
                  onClick={() => handleDeleteReason(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md cursor-pointer transition-colors"
                  title="حذف السبب"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Database Engine & libSQL Management Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span>محرك قاعدة البيانات (libSQL / SQLite محلياً)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                النظام يعمل بقاعدة بيانات libSQL محلية ومستقلة تماماً (ملف wecare.db) بدون أي ارتباط بسوبابيز أو اعتماد على الإنترنت.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Server className="w-3.5 h-3.5" />
                <span>libSQL: محلي (wecare.db) نشط 100%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>فحص الاتصال بقاعدة libSQL</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                يقوم هذا الاختبار بإرسال استعلام SQL تجريبي للتأكد من استجابة الخادم وصحة رمز التوثيق (Auth Token).
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestLibSql}
                  disabled={isTestingLibSql || !isLibSqlConfigured}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isTestingLibSql ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isTestingLibSql ? 'جاري الفحص...' : 'اختبار اتصال libSQL'}</span>
                </button>
                {libSqlStatusMsg && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    libSqlStatusMsg.ok ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {libSqlStatusMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{libSqlStatusMsg.text}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>إعادة زرع وتهيئة بيانات libSQL</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                زرع الجداول الـ 18 وكافة بيانات النظام التأسيسية الحالية (المناطق، الموظفين، الباقات، الخزائن).
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSeedLibSql}
                  disabled={isSeedingLibSql || !isLibSqlConfigured}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isSeedingLibSql ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>{isSeedingLibSql ? 'جاري الزرع...' : 'زرع البيانات في libSQL'}</span>
                </button>
                {seedSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{seedSuccessMsg}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
