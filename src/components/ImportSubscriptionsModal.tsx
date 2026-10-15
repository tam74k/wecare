import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Customer,
  Vehicle,
  Package,
  CoverageArea,
  PaymentMethod,
  ExcelSubscriptionRow,
  SubscriptionImportOptions,
  SubscriptionImportResult
} from '../types/database';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Car,
  User,
  MapPin,
  Sparkles,
  CreditCard,
  Building,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { importSubscriptionsFromExcel, normalizeEgyptianPhone } from '../services/api';

interface ImportSubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  vehicles: Vehicle[];
  packages: Package[];
  coverageAreas: CoverageArea[];
  paymentMethods: PaymentMethod[];
  onImportSuccess?: () => Promise<void>;
}

const NORM_SERVICES: Record<string, string> = {
  'غسيل': 'غسيل',
  'فوطة': 'فوطة 1',
  'فوطه': 'فوطة 1',
  'فوطة1': 'فوطة 1',
  'فوطه1': 'فوطة 1',
  'فوطة 1': 'فوطة 1',
  'فوطه 1': 'فوطة 1',
  'فوطة2': 'فوطة 2',
  'فوطه2': 'فوطة 2',
  'فوطة 2': 'فوطة 2',
  'فوطه 2': 'فوطة 2',
  'فوطة3': 'فوطة 3',
  'فوطه3': 'فوطة 3',
  'فوطة 3': 'فوطة 3',
  'فوطه 3': 'فوطة 3'
};

const normalizeServiceType = (raw: string): string => {
  const clean = (raw || '').trim();
  if (!clean) return '';
  return NORM_SERVICES[clean] || clean;
};

export const ImportSubscriptionsModal: React.FC<ImportSubscriptionsModalProps> = ({
  isOpen,
  onClose,
  customers,
  vehicles,
  packages,
  coverageAreas,
  paymentMethods,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ExcelSubscriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<SubscriptionImportResult | null>(null);

  // Settings
  const [selectedAreaId, setSelectedAreaId] = useState<string>(coverageAreas[0]?.id || '');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(packages[0]?.id || '');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    // Default to the first day of the current month
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [durationDays, setDurationDays] = useState<number>(30);
  const [autoActivate, setAutoActivate] = useState<boolean>(true);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>(paymentMethods[0]?.id || '');

  // Reset state on close or when opening
  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setImportResult(null);
    setIsLoading(false);
    onClose();
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    try {
      const headers = [
        'الاسم',
        'الموبايل',
        'العمارة',
        'منطه',
        'السيارة',
        'رقم العربية',
        'لون السيارة',
        'الجمعه',
        'السبت',
        'الاحد',
        'الاثنين',
        'الثلاثاء',
        'الاربع',
        'الخميس',
        'Column1'
      ];

      const sampleRow1 = [
        'محمد عدلى',
        '01019676666',
        '6',
        'A',
        'رينوه',
        'ج ك ل 8465',
        'رصاصى',
        '',
        'غسيل',
        '',
        'فوطة1',
        '',
        'فوطه2',
        '',
        300
      ];

      const sampleRow2 = [
        'مستر هانى',
        '0114740222',
        '6',
        'A',
        'هيونداى',
        'وم 6535',
        'أبيض',
        '',
        '',
        'غسيل',
        '',
        'فوطة2',
        '',
        'فوطه3',
        250
      ];

      const wsData = [headers, sampleRow1, sampleRow2];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 18 }, // الاسم
        { wch: 16 }, // الموبايل
        { wch: 10 }, // العمارة
        { wch: 10 }, // منطقه
        { wch: 16 }, // السيارة
        { wch: 16 }, // رقم العربية
        { wch: 12 }, // لون السيارة
        { wch: 12 }, // الجمعه
        { wch: 12 }, // السبت
        { wch: 12 }, // الاحد
        { wch: 12 }, // الاثنين
        { wch: 12 }, // الثلاثاء
        { wch: 12 }, // الاربع
        { wch: 12 }, // الخميس
        { wch: 12 }  // السعر / Column1
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الاشتراكات والزيارات');
      XLSX.writeFile(wb, 'نموذج_استيراد_الاشتراكات_وجداول_الزيارات_وي_كير.xlsx');
    } catch (e: any) {
      alert('حدث خطأ أثناء تنزيل النموذج: ' + (e.message || ''));
    }
  };

  // Helper to find column value in row
  const findVal = (row: any, possibleKeys: string[]): any => {
    for (const key of possibleKeys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.trim().toLowerCase() === key.toLowerCase()) {
          return row[rowKey];
        }
      }
    }
    return '';
  };

  // Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة.');
          return;
        }

        const rows: ExcelSubscriptionRow[] = [];

        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];
          const name = String(findVal(row, ['الاسم', 'اسم العميل', 'العميل', 'اسم', 'name', 'full_name']) || '').trim();
          const rawPhone = findVal(row, ['الموبايل', 'رقم الموبايل', 'الهاتف', 'رقم الهاتف', 'تليفون', 'موبايل', 'phone', 'mobile']);
          const phone = normalizeEgyptianPhone(rawPhone) || String(rawPhone || '').trim();
          const building = String(findVal(row, ['العمارة', 'رقم العمارة', 'عمارة', 'building', 'building_number']) || '').trim();
          const block = String(findVal(row, ['منطه', 'منطقه', 'المنطقة', 'المجموعه', 'المجموعة', 'بلوك', 'مربع', 'block', 'group', 'block_number']) || '').trim();
          const vehicle = String(findVal(row, ['السيارة', 'نوع السيارة', 'موديل السيارة', 'الموديل', 'نوع وموديل السيارة', 'car', 'vehicle', 'model']) || '').trim();
          const plate = String(findVal(row, ['رقم العربية', 'رقم السيارة', 'رقم اللوحة', 'اللوحة', 'plate', 'plate_number', 'license_plate']) || '').trim();
          const color = String(findVal(row, ['لون السيارة', 'اللون', 'لون', 'color']) || '').trim();

          // Days schedule
          const weeklySchedule: Record<string, string> = {};

          const fridayVal = normalizeServiceType(String(findVal(row, ['الجمعه', 'الجمعة', 'جمعه', 'جمعة', 'friday']) || ''));
          const saturdayVal = normalizeServiceType(String(findVal(row, ['السبت', 'سبت', 'saturday']) || ''));
          const sundayVal = normalizeServiceType(String(findVal(row, ['الاحد', 'الأحد', 'احد', 'أحد', 'sunday']) || ''));
          const mondayVal = normalizeServiceType(String(findVal(row, ['الاثنين', 'الإثنين', 'اثنين', 'إثنين', 'monday']) || ''));
          const tuesdayVal = normalizeServiceType(String(findVal(row, ['الثلاثاء', 'ثلاثاء', 'tuesday']) || ''));
          const wednesdayVal = normalizeServiceType(String(findVal(row, ['الاربع', 'الاربعاء', 'الأربعاء', 'اربع', 'أربع', 'wednesday']) || ''));
          const thursdayVal = normalizeServiceType(String(findVal(row, ['الخميس', 'خميس', 'thursday']) || ''));

          if (fridayVal) weeklySchedule['الجمعة'] = fridayVal;
          if (saturdayVal) weeklySchedule['السبت'] = saturdayVal;
          if (sundayVal) weeklySchedule['الأحد'] = sundayVal;
          if (mondayVal) weeklySchedule['الإثنين'] = mondayVal;
          if (tuesdayVal) weeklySchedule['الثلاثاء'] = tuesdayVal;
          if (wednesdayVal) weeklySchedule['الأربعاء'] = wednesdayVal;
          if (thursdayVal) weeklySchedule['الخميس'] = thursdayVal;

          // Price / Paid Amount
          const rawPrice = findVal(row, ['column1', 'السعر', 'المبلغ', 'سعر الباقة', 'المسدد', 'قيمة الباقة', 'price', 'amount']);
          const cleanPrice = Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

          if (name || phone || vehicle || plate) {
            rows.push({
              name: name || 'عميل بدون اسم',
              phone: phone,
              building_number: building,
              block_number: block,
              vehicle_type: vehicle,
              plate_number: plate,
              color: color,
              weekly_schedule: weeklySchedule,
              price: cleanPrice
            });
          }
        }

        if (rows.length === 0) {
          alert('لم يتم العثور على بيانات اشتراكات صالحة في الملف.');
          return;
        }

        setParsedRows(rows);
      } catch (err: any) {
        alert('حدث خطأ أثناء قراءة ملف الإكسل: ' + (err.message || 'يرجى مراجعة الملف'));
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Pre-analyze rows: matching status with existing data
  const analysis = useMemo(() => {
    const custPhoneMap = new Map<string, Customer>();
    const custNameMap = new Map<string, Customer>();

    customers.forEach((c) => {
      const p = c.phone || c.mobile;
      if (p) {
        const norm = normalizeEgyptianPhone(p);
        if (norm) custPhoneMap.set(norm, c);
        custPhoneMap.set(p.trim(), c);
      }
      const n = (c.full_name || c.name || '').trim().toLowerCase();
      if (n) custNameMap.set(n, c);
    });

    let newCustCount = 0;
    let existingCustCount = 0;
    let totalVisits = 0;
    let totalPrice = 0;

    const rowDetails = parsedRows.map((r) => {
      const normPhone = normalizeEgyptianPhone(r.phone);
      const normName = r.name.trim().toLowerCase();
      const existing = (normPhone && custPhoneMap.get(normPhone)) || custNameMap.get(normName);

      if (existing) {
        existingCustCount++;
      } else {
        newCustCount++;
      }

      const daysCount = Object.keys(r.weekly_schedule).length;
      const estimatedVisitsPerMonth = daysCount * Math.max(1, Math.round(durationDays / 7));
      totalVisits += estimatedVisitsPerMonth;
      totalPrice += r.price;

      return {
        ...r,
        isExistingCustomer: Boolean(existing),
        matchedCustomer: existing,
        daysCount,
        estimatedVisitsPerMonth
      };
    });

    return {
      newCustCount,
      existingCustCount,
      totalVisits,
      totalPrice,
      rowDetails
    };
  }, [parsedRows, customers, durationDays]);

  // Execute Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setIsLoading(true);
    setImportResult(null);

    try {
      const options: SubscriptionImportOptions = {
        defaultAreaId: selectedAreaId,
        defaultPackageId: selectedPackageId,
        startDate: startDate,
        durationDays: durationDays,
        status: autoActivate ? 'active' : 'pending',
        isPaid: isPaid,
        paymentMethodId: isPaid ? selectedPaymentMethodId : undefined
      };

      const result = await importSubscriptionsFromExcel(parsedRows, options);
      setImportResult(result);

      if (onImportSuccess) {
        await onImportSuccess();
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء استيراد الاشتراكات: ' + (err.message || 'يرجى مراجعة الاتصال بقاعدة البيانات'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2">
                <span>استيراد الاشتراكات وجداول الزيارات من إكسل</span>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  توليد تلقائي للزيارات
                </span>
              </h3>
              <p className="text-xs text-teal-100 mt-1 font-medium">
                سحب بيانات العملاء والمركبات، ربط الباقة، وتوزيع الزيارات الأسبوعية التتابعية (غسيل / فوطة) على أيام الشهر
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {/* Success Result View */}
          {importResult && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-slate-800 animate-fadeIn space-y-4">
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-lg font-black">اكتمل الاستيراد وتوليد الزيارات بنجاح!</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    تم ربط وتحديث كافة بيانات العملاء والمركبات، وإنشاء الاشتراكات وجداول الزيارات التتابعية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-bold block">الاشتراكات المنشأة</span>
                  <span className="text-2xl font-black text-emerald-700">{importResult.newSubscriptions}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-bold block">الزيارات المجدولة</span>
                  <span className="text-2xl font-black text-teal-700">{importResult.totalVisitsCreated}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-bold block">عملاء جدد تم تسجيلهم</span>
                  <span className="text-2xl font-black text-blue-700">{importResult.newCustomers}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-bold block">المبالغ المسددة</span>
                  <span className="text-2xl font-black text-emerald-700">{importResult.totalAmountCollected.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-xs">
                  <span className="font-bold block mb-1">ملاحظات أو تنبيهات أثناء الاستيراد:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                >
                  إغلاق ومتابعة الاشتراكات والزيارات
                </button>
              </div>
            </div>
          )}

          {!importResult && (
            <>
              {/* Step 1: Upload and Template Area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upload Card */}
                <div className="md:col-span-2 bg-white p-5 rounded-2xl border-2 border-dashed border-teal-200 hover:border-teal-400 transition-colors flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="w-12 h-12 bg-teal-50 group-hover:bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-3 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {file ? file.name : 'اضغط لاختيار ملف الإكسل أو اسحبه إلى هنا'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    يدعم ملفات (.xlsx, .xls, .csv) بهيكل الأعمدة المتضمن أيام الأسبوع (السبت، الأحد... إلخ)
                  </p>
                </div>

                {/* Template Download Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">النموذج القياسي المعتمد</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      حمّل نموذج الإكسل الجاهز الذي يحتوي على نفس ترتيب الأعمدة ونماذج بيانات لزيارات الغسيل والفوطة.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full mt-4 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نموذج الإكسل الاسترشادي</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Settings Toolbar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>إعدادات الاشتراكات المجدولة</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-bold">تطبق على الصفوف المستوردة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Default Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>المنطقة التابعة:</span>
                    </label>
                    <select
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                    >
                      {coverageAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.city || 'المدينة'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Package */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span>الباقة الافتراضية:</span>
                    </label>
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ بدء الاشتراكات:</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>مدة الاشتراك:</span>
                    </label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                    >
                      <option value={30}>شهر واحد (4 أسابيع / 30 يوم)</option>
                      <option value={60}>شهران (8 أسابيع / 60 يوم)</option>
                      <option value={90}>3 أشهر (12 أسبوع / 90 يوم)</option>
                    </select>
                  </div>
                </div>

                {/* Activation & Payment Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={autoActivate}
                      onChange={(e) => setAutoActivate(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500 border-slate-300"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">تفعيل الاشتراكات فوراً وتوليد الزيارات</span>
                      <span className="text-slate-400 text-[11px]">جدولة الزيارات تلقائياً بحالة (مجدولة) في مواعيدها الأسبوعية</span>
                    </div>
                  </label>

                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={(e) => setIsPaid(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800">المبلغ مسدد</span>
                    </label>

                    {isPaid && paymentMethods.length > 0 && (
                      <div className="flex-1 flex items-center gap-1.5 mr-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          value={selectedPaymentMethodId}
                          onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                          className="w-full text-xs font-bold p-1 bg-white border border-slate-200 rounded-lg outline-hidden"
                          title="طريقة الدفع لتوريد المبالغ في الخزينة"
                        >
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Preview Data & Summary */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block">إجمالي الاشتراكات</span>
                      <span className="text-lg font-black text-slate-800">{parsedRows.length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block">عملاء جدد سيُسجلون</span>
                      <span className="text-lg font-black text-blue-600">+{analysis.newCustCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block">عملاء مسجلين مسبقاً</span>
                      <span className="text-lg font-black text-emerald-600">{analysis.existingCustCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 block">إجمالي الزيارات المتوقعة</span>
                      <span className="text-lg font-black text-teal-600">{analysis.totalVisits} زيارة</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-bold text-slate-400 block">إجمالي التحصيل</span>
                      <span className="text-lg font-black text-emerald-700">{analysis.totalPrice.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>معاينة بيانات الاشتراكات والزيارات قبل الحفظ ({analysis.rowDetails.length} صف):</span>
                      <span className="text-[11px] text-slate-400">سيتم ربط العميل بالسيارة والزيارات بدقة</span>
                    </div>

                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100/70 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">العميل</th>
                            <th className="p-2.5">الموبايل</th>
                            <th className="p-2.5">العمارة / المجموعه</th>
                            <th className="p-2.5">السيارة واللوحة</th>
                            <th className="p-2.5">جدول الزيارات الأسبوعية</th>
                            <th className="p-2.5">المبلغ</th>
                            <th className="p-2.5">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {analysis.rowDetails.map((row, idx) => (
                            <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                              <td className="p-2.5 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">
                                {row.name}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 dir-ltr text-right">
                                {row.phone || '-'}
                              </td>
                              <td className="p-2.5 text-slate-600">
                                {row.building_number ? `عمارة ${row.building_number}` : ''}
                                {row.block_number ? ` (مجموعة ${row.block_number})` : ''}
                                {!row.building_number && !row.block_number && '-'}
                              </td>
                              <td className="p-2.5">
                                <span className="font-bold text-slate-800">{row.vehicle_type || 'سيارة'}</span>
                                {row.plate_number && (
                                  <span className="text-[11px] text-slate-500 block font-mono">
                                    {row.plate_number} {row.color ? `(${row.color})` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(row.weekly_schedule).map(([day, srv]) => (
                                    <span
                                      key={day}
                                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                        srv.includes('غسيل')
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                                      }`}
                                    >
                                      {day}: {srv}
                                    </span>
                                  ))}
                                  {Object.keys(row.weekly_schedule).length === 0 && (
                                    <span className="text-slate-400 text-[11px]">بدون زيارات محددة</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {row.daysCount} أيام / أسبوع ({row.estimatedVisitsPerMonth} زيارة شهرية)
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-emerald-700">
                                {row.price > 0 ? `${row.price} ج.م` : 'مجاناً'}
                              </td>
                              <td className="p-2.5">
                                {row.isExistingCustomer ? (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    عميل مسجل
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    عميل جديد + سيارة
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            إلغاء
          </button>

          {parsedRows.length > 0 && !importResult && (
            <button
              onClick={handleExecuteImport}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري استيراد الاشتراكات وتوليد {analysis.totalVisits} زيارة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    تأكيد واستيراد ({parsedRows.length}) اشتراك وتوليد ({analysis.totalVisits}) زيارة
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
