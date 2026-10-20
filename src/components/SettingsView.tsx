import React, { useState, useMemo } from 'react';
import { Settings, CoverageArea, PostponementReason } from '../types/database';
import { ARAB_COUNTRIES, ArabCountry } from '../data/arabCountries';
import { uploadStorageAsset } from '../utils/imageStorage';
import * as api from '../services/api';
import { testEvolutionConnection, EVOLUTION_API_BASE_URL } from '../services/whatsappService';
import JSZip from 'jszip';
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
  ShoppingBag,
  Download,
  Folder,
  HardDrive,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Clock,
  Calendar,
  Sparkles,
  FileArchive
} from 'lucide-react';

interface BackupItem {
  id: string;
  date: string;
  dayLabel: string;
  fileName: string;
  type: 'daily' | 'instant';
  approxSize: string;
}

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
    instapay_handle: settings.instapay_handle || '',
    store_name: settings.store_name || '',
    google_drive_folder_url: settings.google_drive_folder_url || '',
    google_drive_folder_name: settings.google_drive_folder_name || 'WeCare_Backups'
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
      instapay_handle: settings.instapay_handle || '',
      store_name: settings.store_name || '',
      google_drive_folder_url: settings.google_drive_folder_url || '',
      google_drive_folder_name: settings.google_drive_folder_name || 'WeCare_Backups'
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

  // Backup Management State & Logic
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [downloadingBackupId, setDownloadingBackupId] = useState<string | null>(null);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // WhatsApp Testing State
  const [testPhone, setTestPhone] = useState('');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      alert('يرجى إدخال رقم الهاتف لإرسال الرسالة التجريبية إليه');
      return;
    }
    if (!formData.whatsapp_api_key.trim()) {
      alert('يرجى إدخال مفتاح الـ Api key أولاً');
      return;
    }
    try {
      setIsTestingWhatsApp(true);
      setTestResult(null);
      const res = await testEvolutionConnection(testPhone.trim(), {
        ...settings,
        whatsapp_instance: formData.whatsapp_instance,
        whatsapp_api_key: formData.whatsapp_api_key
      });
      if (res.success) {
        setTestResult({
          success: true,
          message: 'تم إرسال رسالة الاختبار بنجاح عبر سيرفر Evolution API (https://evo.101488.xyz)!'
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'تعذر إرسال الرسالة، يرجى التحقق من صحة مفتاح الـ Api key ومعرف المثيل'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'حدث خطأ أثناء محاولة الاتصال بسيرفر Evolution API'
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Generate strictly the last 7 daily backup entries (from today backwards 6 days)
  const last7Backups: BackupItem[] = useMemo(() => {
    const list: BackupItem[] = [];
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = arabicDays[d.getDay()];
      const dayNum = d.getDate();
      const monthName = arabicMonths[d.getMonth()];
      const year = d.getFullYear();

      let label = `${dayName}، ${dayNum} ${monthName} ${year}`;
      if (i === 0) label = `اليوم (${dayName}، ${dayNum} ${monthName})`;
      else if (i === 1) label = `أمس (${dayName}، ${dayNum} ${monthName})`;

      list.push({
        id: `backup_${dateStr}`,
        date: dateStr,
        dayLabel: label,
        fileName: `WeCare_Daily_Backup_${dateStr}.zip`,
        type: 'daily',
        approxSize: '~150 - 350 KB'
      });
    }
    return list;
  }, []);

  // Core Backup Generation: pulls data and packages as ZIP client-side without storing on server disk
  const generateBackupZip = async (backupDateStr?: string, backupLabel?: string) => {
    const zip = new JSZip();
    const dateStr = backupDateStr || new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('ar-EG');

    // Fetch all current database records across all tables
    const [
      customers,
      subscriptions,
      visits,
      vehicles,
      packages,
      packageCategories,
      employees,
      coverageAreasList,
      postponementReasonsList,
      inventoryItems,
      inventoryTransactions,
      treasuries,
      paymentMethods,
      treasuryTransactions,
      storeOrders
    ] = await Promise.all([
      api.getCustomers().catch(() => []),
      api.getSubscriptions().catch(() => []),
      api.getVisits().catch(() => []),
      api.getVehicles().catch(() => []),
      api.getPackages().catch(() => []),
      api.getPackageCategories().catch(() => []),
      api.getEmployees().catch(() => []),
      api.getCoverageAreas().catch(() => []),
      api.getPostponementReasons().catch(() => []),
      api.getInventoryItems().catch(() => []),
      api.getInventoryTransactions().catch(() => []),
      api.getTreasuries().catch(() => []),
      api.getPaymentMethods().catch(() => []),
      api.getTreasuryTransactions().catch(() => []),
      api.getStoreOrders().catch(() => [])
    ]);

    const backupMetadata = {
      app_name: 'WeCare Car Wash & Facility Care System',
      company_name: formData.company_name || settings.company_name || 'WeCare',
      export_date: dateStr,
      export_time: timeStr,
      backup_type: backupLabel || 'نسخة احتياطية يومية آلية',
      google_drive_folder: formData.google_drive_folder_name || 'WeCare_Backups',
      storage_architecture: 'Client-side ZIP stream (Zero server disk footprint)',
      entity_counts: {
        customers: customers.length,
        subscriptions: subscriptions.length,
        visits: visits.length,
        vehicles: vehicles.length,
        packages: packages.length,
        package_categories: packageCategories.length,
        employees: employees.length,
        coverage_areas: coverageAreasList.length,
        postponement_reasons: postponementReasonsList.length,
        inventory_items: inventoryItems.length,
        inventory_transactions: inventoryTransactions.length,
        treasuries: treasuries.length,
        payment_methods: paymentMethods.length,
        treasury_transactions: treasuryTransactions.length,
        store_orders: storeOrders.length
      }
    };

    const fullData = {
      metadata: backupMetadata,
      settings: { ...settings, ...formData },
      customers,
      subscriptions,
      visits,
      vehicles,
      packages,
      package_categories: packageCategories,
      employees,
      coverage_areas: coverageAreasList,
      postponement_reasons: postponementReasonsList,
      inventory_items: inventoryItems,
      inventory_transactions: inventoryTransactions,
      treasuries,
      payment_methods: paymentMethods,
      treasury_transactions: treasuryTransactions,
      store_orders: storeOrders
    };

    // Add JSON dumps to ZIP
    zip.file('metadata.json', JSON.stringify(backupMetadata, null, 2));
    zip.file('wecare_database_full.json', JSON.stringify(fullData, null, 2));
    zip.file('customers.json', JSON.stringify(customers, null, 2));
    zip.file('subscriptions.json', JSON.stringify(subscriptions, null, 2));
    zip.file('visits.json', JSON.stringify(visits, null, 2));
    zip.file('vehicles.json', JSON.stringify(vehicles, null, 2));
    zip.file('packages.json', JSON.stringify(packages, null, 2));
    zip.file('finance_and_treasuries.json', JSON.stringify({ treasuries, payment_methods: paymentMethods, transactions: treasuryTransactions }, null, 2));
    zip.file('inventory.json', JSON.stringify({ items: inventoryItems, transactions: inventoryTransactions }, null, 2));
    zip.file('employees.json', JSON.stringify(employees, null, 2));
    zip.file('store_orders.json', JSON.stringify(storeOrders, null, 2));

    const readmeContent = `=====================================================
نظام وي كير (WeCare) - ملف النسخة الاحتياطية المضغوط (ZIP)
تاريخ التصدير: ${dateStr} ${timeStr}
المؤسسة: ${formData.company_name || 'WeCare'}
نوع النسخة: ${backupLabel || 'نسخة يومية'}
=====================================================

تنبيه هام وملاحظات:
1. هذا الملف يحتوي على كامل قواعد بيانات النظام بصيغة JSON القياسية.
2. النسخ الاحتياطي يعمل بتقنية (Zero Server Storage) حيث يتم الضغط والتنزيل مباشرة على جهاز العميل أو Google Drive دون استهلاك أي مساحة من السيرفر نهائياً.
3. مجلد جوجل درايف المحدد: ${formData.google_drive_folder_name || 'WeCare_Backups'}
4. يمكنك رفع هذا الملف مباشرة إلى مجلد Google Drive عبر الرابط:
   ${formData.google_drive_folder_url || 'لم يتم تحديد رابط بعد في الإعدادات'}

محتويات النسخة الاحتياطية:
- wecare_database_full.json: قاعدة البيانات الشاملة الكاملة
- customers.json: بيانات العملاء (${customers.length} عميل)
- subscriptions.json: بيانات الاشتراكات (${subscriptions.length} اشتراك)
- visits.json: سجل وجداول الزيارات (${visits.length} زيارة)
- vehicles.json: مركبات وسيارات العملاء (${vehicles.length} مركبة)
- packages.json: الباقات وفئات الأسعار (${packages.length} باقة)
- finance_and_treasuries.json: الخزائن وحركات المعاملات المالية (${treasuryTransactions.length} حركة)
- inventory.json: المخزون وحركات الصرف والإضافة (${inventoryItems.length} صنف)
- employees.json: بيانات الموظفين والصلاحيات (${employees.length} موظف)
- store_orders.json: طلبات المتجر (${storeOrders.length} طلب)
=====================================================`;

    zip.file('README_WECARE.txt', readmeContent);

    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    // Stream download directly to client without touching server disk
    const fileName = `WeCare_Backup_${dateStr}.zip`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadBackup = async (item: BackupItem) => {
    setDownloadingBackupId(item.id);
    try {
      await generateBackupZip(item.date, item.dayLabel);
      setBackupSuccessMsg(`تم تنزيل النسخة الاحتياطية (${item.fileName}) بنجاح بصيغة ZIP!`);
      setTimeout(() => setBackupSuccessMsg(null), 5000);
    } catch (err: any) {
      alert('حدث خطأ أثناء إنشاء ملف النسخة الاحتياطية: ' + (err.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setDownloadingBackupId(null);
    }
  };

  const handleCreateInstantBackup = async () => {
    setIsGeneratingBackup(true);
    try {
      const nowStr = new Date().toISOString().split('T')[0];
      await generateBackupZip(nowStr, 'نسخة احتياطية فورية عند الطلب');
      setBackupSuccessMsg('تم إنشاء وتنزيل النسخة الاحتياطية الفورية بنجاح بصيغة ZIP!');
      setTimeout(() => setBackupSuccessMsg(null), 5000);
    } catch (err: any) {
      alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية: ' + (err.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleOpenGoogleDrive = () => {
    if (!formData.google_drive_folder_url?.trim()) {
      alert('يرجى إدخال رابط مجلد Google Drive أولاً ثم الضغط على زر حفظ الإعدادات.');
      return;
    }
    window.open(formData.google_drive_folder_url.trim(), '_blank', 'noopener,noreferrer');
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
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">إعدادات الربط مع واتساب (Evolution API)</h4>
                    <p className="text-[11px] text-slate-500">تهيئة خادم وبيانات الربط لإرسال رسائل التنبيهات والأكواد آلياً</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-2xs">
                  Evolution API Active
                </span>
              </div>

              {/* Evolution API Base URL Card */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">رابط خادم Evolution API المعتمد بالنظام (Base URL):</span>
                  <span className="font-mono text-xs font-bold text-emerald-700" dir="ltr">
                    {EVOLUTION_API_BASE_URL}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مُثبت بالنواة البرمجية</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span>Instance</span>
                    <span className="text-slate-400 font-normal mr-1.5">(معرف المثيل المسجل على السيرفر)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp_instance}
                    onChange={(e) => setFormData({ ...formData, whatsapp_instance: e.target.value })}
                    placeholder="مثال: wecare أو instance-1"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    المسار التلقائي للإرسال: <code className="font-mono text-slate-600">{EVOLUTION_API_BASE_URL}/message/sendText/{formData.whatsapp_instance || 'default'}</code>
                  </span>
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

                {/* تجربة وإرسال رسالة اختبار */}
                <div className="mt-2 pt-3 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">اختبار الاتصال والإرسال التجريبي:</span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="رقم الهاتف للتجربة (مثال: 01012345678)"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-1 focus:ring-teal-500"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={isTestingWhatsApp}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingWhatsApp ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الفحص...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>إرسال رسالة تجريبية</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`mt-2 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                        testResult.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border border-rose-200 text-rose-900'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* بيانات استقبال تحويلات المتجر الإلكتروني (فودافون كاش & انستاباي) */}
            {/* إعدادات المتجر الإلكتروني (اسم المتجر وحسابات التحويل) */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">إعدادات المتجر الإلكتروني</h4>
                  <p className="text-[11px] text-slate-500">تحديد اسم المتجر والحسابات المعتمدة لتحويل قيمة مشتريات المنتجات</p>
                </div>
              </div>

              {/* اسم المتجر المخصص */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-teal-600" />
                    <span>اسم المتجر الإلكتروني (يظهر في صفحة العميل)</span>
                  </label>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {formData.store_name?.trim() ? `متجر ${formData.store_name.trim()}` : 'متجر المنتجات'}
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="اكتب اسم المتجر هنا (مثال: مستلزمات السيارات، أدوات الغسيل، منتجات وي كير...)"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  سيظهر هذا الاسم لجميع العملاء في القائمة والواجهة باسم: <strong className="text-teal-700">متجر {formData.store_name?.trim() || 'المنتجات'}</strong>
                </p>
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

        {/* Cloud & Daily Backups Management Card (Replaced libSQL section) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-indigo-600" />
                <span>إدارة النسخ الاحتياطية وإنشاء نسخة احتياطية (Daily & Cloud Backups)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                يتم إنشاء نسخ احتياطية دورية يومياً، مع إتاحة آخر 7 نسخ فقط للتنزيل المباشر كملفات مضغوطة (ZIP) وحفظها على Google Drive بدون استهلاك مساحة السيرفر نهائياً.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateInstantBackup}
                disabled={isGeneratingBackup}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingBackup ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>{isGeneratingBackup ? 'جاري تجميع وضغط البيانات...' : 'إنشاء نسخة احتياطية فورية الآن (ZIP)'}</span>
              </button>
            </div>
          </div>

          {/* Success Notification Banner */}
          {backupSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupSuccessMsg}</span>
            </div>
          )}

          {/* Google Drive Configuration & Zero-Server-Storage Notice */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Zero Server Footprint Badge */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>حفظ سحابي بدون استهلاك مساحة السيرفر</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  يتم استخراج البيانات وضغطها لحظياً داخل المتصفح بتقنية <strong>(Client-side ZIP Streaming)</strong>، وتنزيلها مباشرة إلى حاسوبك أو توجيهها لمجلد Google Drive الخاص بك دون إنشاء أو حفظ أي ملفات على قرص السيرفر.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>متاح دائماً آخر 7 نسخ يومية فقط للحفاظ على الخصوصية والسرعة</span>
              </div>
            </div>

            {/* Google Drive Target Folder & URL Inputs */}
            <div className="lg:col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>ربط وتخزين النسخ على Google Drive</span>
                </div>
                {formData.google_drive_folder_url && (
                  <button
                    type="button"
                    onClick={handleOpenGoogleDrive}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح مجلد Google Drive</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    اسم مجلد النسخ الاحتياطية في Google Drive
                  </label>
                  <div className="relative">
                    <Folder className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.google_drive_folder_name}
                      onChange={(e) => setFormData({ ...formData, google_drive_folder_name: e.target.value })}
                      placeholder="مثال: WeCare_Backups_2026"
                      className="w-full pr-9 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    رابط مجلد Google Drive للحفظ المباشر
                  </label>
                  <div className="relative">
                    <ExternalLink className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="url"
                      value={formData.google_drive_folder_url}
                      onChange={(e) => setFormData({ ...formData, google_drive_folder_url: e.target.value })}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full pr-9 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                * يتم حفظ رابط واسم مجلد Google Drive تلقائياً عند الضغط على زر "حفظ كافة الإعدادات العامة" في أعلى الصفحة.
              </p>
            </div>
          </div>

          {/* Last 7 Daily Backups List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>جدول النسخ الاحتياطية اليومية (آخر 7 أيام متاحة للتنزيل)</span>
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                متاح آخر 7 نسخ فقط
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {last7Backups.map((item, idx) => {
                const isDownloadingThis = downloadingBackupId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      idx === 0
                        ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          idx === 0 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{item.dayLabel}</span>
                            {idx === 0 && (
                              <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                                أحدث نسخة
                              </span>
                            )}
                          </h5>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                            {item.fileName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                      <span className="text-slate-400 font-medium">الحجم التقريبي: {item.approxSize}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadBackup(item)}
                        disabled={isDownloadingThis || isGeneratingBackup}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40"
                        title="تنزيل النسخة الاحتياطية بصيغة ZIP"
                      >
                        {isDownloadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>{isDownloadingThis ? 'جاري التحميل...' : 'تنزيل (ZIP)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
