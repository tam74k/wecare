import React, { useState, useMemo } from 'react';
import {
  Treasury,
  PaymentMethod,
  TreasuryTransaction,
  Settings,
  AuthUser
} from '../types/database';
import {
  Printer,
  X,
  Calendar,
  Wallet,
  Receipt,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Building2,
  Car,
  ShoppingBag,
  Sparkles,
  CreditCard,
  FileText,
  UserCheck
} from 'lucide-react';

interface CloseoutReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  settings: Settings;
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  transactions: TreasuryTransaction[];
  defaultDate?: string;
}

export const CloseoutReportModal: React.FC<CloseoutReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  treasuries,
  paymentMethods,
  transactions,
  defaultDate
}) => {
  const [printSize, setPrintSize] = useState<'a4' | 'thermal'>('a4');
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate || new Date().toISOString().split('T')[0]
  );
  const [dateMode, setDateMode] = useState<'today' | 'custom' | 'all'>('today');

  // Helper to determine payment method name for a transaction
  const getTransactionPaymentMethod = (tx: TreasuryTransaction): string => {
    if (tx.payment_method && tx.payment_method.trim()) {
      const p = tx.payment_method.trim().toLowerCase();
      if (p === 'cash' || p.includes('كاش')) return 'الكاش';
      if (p === 'visa' || p.includes('فيزا') || p === 'card') return 'الفيزا';
      if (p === 'instapay' || p.includes('انستاباي') || p.includes('إنستاباي')) return 'انستاباي';
      if (p.includes('فودافون') || p === 'vodafone_cash' || p === 'vodafone') return 'فودافون';
      return tx.payment_method.trim();
    }
    // Check matching treasury name
    const t = treasuries.find((tr) => tr.id === tx.treasury_id);
    if (t) {
      if (t.name.includes('كاش')) return 'الكاش';
      if (t.name.includes('فيزا')) return 'الفيزا';
      if (t.name.includes('انستاباي') || t.name.includes('إنستاباي')) return 'انستاباي';
      if (t.name.includes('فودافون')) return 'فودافون';
      return t.name.replace(/^خزينة\s+/, '').trim();
    }
    return 'الكاش';
  };

  // Helper to resolve transaction category & nature
  const classifyTransaction = (tx: TreasuryTransaction) => {
    const reason = (tx.reason || '').trim();
    const r = reason.toLowerCase();
    const cat = (tx.category || '').trim();

    const isDayCloseout =
      tx.type === 'transfer' &&
      (r.includes('إغلاق اليوم') || r.includes('اغلاق اليوم') || r.includes('تصفير') || r.includes('ترحيل رصيد'));
    const isSalary = r.includes('صرف راتب') || r.includes('راتب') || r.includes('رواتب') || r.includes('مرتب');
    const isAdvance = r.includes('سلفة') || r.includes('سلف') || r.includes('عهدة');
    const isPurchase =
      r.includes('توريد') ||
      r.includes('مورد') ||
      r.includes('مشتروات') ||
      r.includes('مشتريات') ||
      r.includes('فاتورة شراء');
    const isStoreSale = cat === 'مبيعات متجر' || r.includes('متجر') || r.includes('طلب متجر') || r.includes('منتج') || r.includes('مبيعات');
    const isCarSub = cat === 'اشتراكات سيارات' || r.includes('سيار') || r.includes('غسيل') || r.includes('مركبة');
    const isBuildingSub = cat === 'اشتراكات عمارات' || r.includes('عمار') || r.includes('عمارات') || r.includes('مبن') || r.includes('واجهات');
    const isCustomService = cat === 'اشتراكات خدمات خاصة' || r.includes('خدمة خاصة') || r.includes('خدمات خاصة') || r.includes('تنظيف خاص') || r.includes('خدمة');

    let section: 'cars' | 'buildings' | 'services' | 'store' | 'general_income' | 'expenses' | 'salaries' | 'advances' | 'transfers' | 'closeout' | 'withdrawals' = 'general_income';

    if (isDayCloseout) {
      section = 'closeout';
    } else if (tx.type === 'transfer') {
      section = 'transfers';
    } else if (isSalary) {
      section = 'salaries';
    } else if (isAdvance) {
      section = 'advances';
    } else if (tx.type === 'withdrawal' || isPurchase || cat === 'مصروف' || cat === 'مصروفات') {
      section = 'expenses';
    } else if (isCarSub) {
      section = 'cars';
    } else if (isBuildingSub) {
      section = 'buildings';
    } else if (isCustomService) {
      section = 'services';
    } else if (isStoreSale) {
      section = 'store';
    } else if (tx.type === 'deposit') {
      section = 'general_income';
    }

    const method = getTransactionPaymentMethod(tx);

    return {
      section,
      method,
      amount: Number(tx.amount || 0),
      reason,
      isIncome: tx.type === 'deposit',
      isExpense: tx.type === 'withdrawal' || isSalary || isAdvance || isPurchase,
      isTransfer: tx.type === 'transfer' && !isDayCloseout,
      isDayCloseout,
      isSalary,
      isAdvance
    };
  };

  // Filter transactions by selected date
  const filteredTransactions = useMemo(() => {
    if (dateMode === 'all') return transactions;
    return transactions.filter((tx) => {
      const txDate = tx.created_at ? tx.created_at.slice(0, 10) : '';
      return txDate === selectedDate;
    });
  }, [transactions, selectedDate, dateMode]);

  // Distinct Payment Methods list for columns & breakdown
  const availableMethods = useMemo(() => {
    const list: string[] = ['الكاش', 'الفيزا', 'انستاباي', 'فودافون'];
    paymentMethods.forEach((pm) => {
      let name = pm.name.replace(/^خزينة\s+/, '').trim();
      if (name === 'كاش' || name === 'الكاش') name = 'الكاش';
      else if (name === 'فيزا' || name === 'الفيزا') name = 'الفيزا';
      else if (name.includes('فودافون')) name = 'فودافون';
      else if (name.includes('انستاباي') || name.includes('إنستاباي')) name = 'انستاباي';

      if (!list.includes(name)) list.push(name);
    });
    return list;
  }, [paymentMethods]);

  // Aggregate Calculations
  const reportData = useMemo(() => {
    // 1. Collections: Cars, Buildings, Services, Store, General
    const carsByMethod: Record<string, number> = {};
    const buildingsByMethod: Record<string, number> = {};
    const servicesByMethod: Record<string, number> = {};
    const storeByMethod: Record<string, number> = {};
    const generalIncomeByMethod: Record<string, number> = {};

    // 2. Expenses, Salaries, Advances
    const expensesByMethod: Record<string, number> = {};
    const salariesByMethod: Record<string, number> = {};
    const advancesByMethod: Record<string, number> = {};

    // 3. Transfers and Closeouts list
    const transfersList: TreasuryTransaction[] = [];
    const closeoutsList: TreasuryTransaction[] = [];
    const withdrawalsList: TreasuryTransaction[] = [];

    availableMethods.forEach((m) => {
      carsByMethod[m] = 0;
      buildingsByMethod[m] = 0;
      servicesByMethod[m] = 0;
      storeByMethod[m] = 0;
      generalIncomeByMethod[m] = 0;
      expensesByMethod[m] = 0;
      salariesByMethod[m] = 0;
      advancesByMethod[m] = 0;
    });

    filteredTransactions.forEach((tx) => {
      const c = classifyTransaction(tx);
      const m = c.method;

      if (c.section === 'cars') {
        carsByMethod[m] = (carsByMethod[m] || 0) + c.amount;
      } else if (c.section === 'buildings') {
        buildingsByMethod[m] = (buildingsByMethod[m] || 0) + c.amount;
      } else if (c.section === 'services') {
        servicesByMethod[m] = (servicesByMethod[m] || 0) + c.amount;
      } else if (c.section === 'store') {
        storeByMethod[m] = (storeByMethod[m] || 0) + c.amount;
      } else if (c.section === 'general_income') {
        generalIncomeByMethod[m] = (generalIncomeByMethod[m] || 0) + c.amount;
      } else if (c.section === 'expenses') {
        expensesByMethod[m] = (expensesByMethod[m] || 0) + c.amount;
      } else if (c.section === 'salaries') {
        salariesByMethod[m] = (salariesByMethod[m] || 0) + c.amount;
      } else if (c.section === 'advances') {
        advancesByMethod[m] = (advancesByMethod[m] || 0) + c.amount;
      } else if (c.section === 'transfers') {
        transfersList.push(tx);
      } else if (c.section === 'closeout') {
        closeoutsList.push(tx);
      }

      if (tx.type === 'withdrawal' && !c.isSalary && !c.isAdvance) {
        withdrawalsList.push(tx);
      }
    });

    // Totals calculations
    const sumRecord = (rec: Record<string, number>) => Object.values(rec).reduce((a, b) => a + b, 0);

    const totalCars = sumRecord(carsByMethod);
    const totalBuildings = sumRecord(buildingsByMethod);
    const totalServices = sumRecord(servicesByMethod);
    const totalStore = sumRecord(storeByMethod);
    const totalGeneralIncome = sumRecord(generalIncomeByMethod);
    const totalIncome = totalCars + totalBuildings + totalServices + totalStore + totalGeneralIncome;

    const totalExpenses = sumRecord(expensesByMethod);
    const totalSalaries = sumRecord(salariesByMethod);
    const totalAdvances = sumRecord(advancesByMethod);
    const totalExpensesAndSalaries = totalExpenses + totalSalaries + totalAdvances;

    const totalTransfers = transfersList.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const totalCloseouts = closeoutsList.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const totalWithdrawals = withdrawalsList.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Total income by payment method across all sources
    const totalIncomeByMethod: Record<string, number> = {};
    availableMethods.forEach((m) => {
      totalIncomeByMethod[m] =
        (carsByMethod[m] || 0) +
        (buildingsByMethod[m] || 0) +
        (servicesByMethod[m] || 0) +
        (storeByMethod[m] || 0) +
        (generalIncomeByMethod[m] || 0);
    });

    const netSurplus = totalIncome - totalExpensesAndSalaries;

    return {
      carsByMethod,
      totalCars,
      buildingsByMethod,
      totalBuildings,
      servicesByMethod,
      totalServices,
      storeByMethod,
      totalStore,
      generalIncomeByMethod,
      totalGeneralIncome,
      totalIncome,
      totalIncomeByMethod,
      expensesByMethod,
      totalExpenses,
      salariesByMethod,
      totalSalaries,
      advancesByMethod,
      totalAdvances,
      totalExpensesAndSalaries,
      transfersList,
      totalTransfers,
      closeoutsList,
      totalCloseouts,
      withdrawalsList,
      totalWithdrawals,
      netSurplus
    };
  }, [filteredTransactions, availableMethods, treasuries]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTreasuryName = (id: string) => treasuries.find((t) => t.id === id)?.name || 'خزينة فرعية';

  const totalAllTreasuriesBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);
  const mainTreasury = treasuries.find((t) => t.type === 'main') || treasuries[0];
  const subTreasuries = treasuries.filter((t) => t.id !== mainTreasury?.id && t.type !== 'main');

  const todayDisplay = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const nowTimeDisplay = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn font-cairo">
      {/* Dynamic CSS Print Rules */}
      <style>{`
        @media print {
          @page {
            size: ${printSize === 'thermal' ? '80mm auto' : 'A4 portrait'};
            margin: ${printSize === 'thermal' ? '3mm' : '8mm'};
          }
          body * {
            visibility: hidden !important;
          }
          #closeout-report-print-container,
          #closeout-report-print-container * {
            visibility: visible !important;
          }
          #closeout-report-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printSize === 'thermal' ? '80mm !important' : '100% !important'};
            max-width: ${printSize === 'thermal' ? '80mm !important' : '100% !important'};
            margin: 0 auto !important;
            padding: ${printSize === 'thermal' ? '2mm !important' : '6mm !important'};
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .thermal-text {
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Controls Header (No Print) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تقرير الإغلاق المالي والتحصيلات</h3>
              <p className="text-xs text-slate-500">طباعة الإغلاق اليومي، تفصيل الخزائن وطرق السداد</p>
            </div>
          </div>

          {/* Controls: Size Switcher + Date Selector + Print Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Size Switcher */}
            <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintSize('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printSize === 'a4'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                صفحة A4
              </button>
              <button
                type="button"
                onClick={() => setPrintSize('thermal')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printSize === 'thermal'
                    ? 'bg-white text-teal-800 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حراري 8سم (80mm)
              </button>
            </div>

            {/* Date Mode Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateMode('custom');
                }}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body / Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 flex justify-center">
          <div
            id="closeout-report-print-container"
            className={`bg-white shadow-md border border-slate-200 rounded-2xl text-slate-800 transition-all ${
              printSize === 'thermal'
                ? 'w-[80mm] max-w-[80mm] p-3 text-[11px] leading-tight font-mono'
                : 'w-full max-w-3xl p-8 text-xs leading-normal font-sans'
            }`}
          >
            {/* 1. Header: Logo, Company Name, Report Title, Date, User */}
            <div
              className={`border-b pb-4 text-center ${
                printSize === 'thermal' ? 'border-dashed border-slate-400 mb-3' : 'border-slate-200 mb-6'
              }`}
            >
              {settings.logo_url && (
                <img
                  src={settings.logo_url}
                  alt={settings.company_name || 'Logo'}
                  className={`mx-auto object-contain mb-2 ${
                    printSize === 'thermal' ? 'h-10 max-w-[120px]' : 'h-14 max-w-[160px]'
                  }`}
                />
              )}
              <h2
                className={`font-black text-slate-900 ${
                  printSize === 'thermal' ? 'text-base' : 'text-xl'
                }`}
              >
                {settings.company_name || 'شركة وي كير للخدمات المتكاملة'}
              </h2>
              <div
                className={`font-black text-teal-800 mt-1 inline-block px-3 py-0.5 rounded-full ${
                  printSize === 'thermal'
                    ? 'text-xs border border-dashed border-teal-600'
                    : 'text-sm bg-teal-50 border border-teal-200'
                }`}
              >
                تقرير الإغلاق المالي اليومي وتصفير الوردية
              </div>

              <div
                className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-slate-600 ${
                  printSize === 'thermal' ? 'text-[10px] flex-col text-center' : 'text-xs px-2'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">التاريخ:</span>
                  <span className="font-bold text-slate-900">
                    {selectedDate} ({todayDisplay})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">وقت التقرير:</span>
                  <span className="font-mono font-bold text-slate-900">{nowTimeDisplay}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500">المسؤول / الكاشير:</span>
                  <span className="font-bold text-teal-900">
                    {currentUser?.full_name || currentUser?.username || 'المسؤول المالي'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Current Treasuries Totals (إجماليات كل خزينة في الوقت الحالي) */}
            <div className={`mb-5 ${printSize === 'thermal' ? 'text-[11px]' : ''}`}>
              <div
                className={`font-black text-slate-900 mb-2 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-1 text-xs'
                    : 'text-sm border-b pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-teal-700" />
                  <span>أرصدة الخزائن في الوقت الحالي</span>
                </span>
                <span className="font-mono font-black text-slate-900">
                  الإجمالي: {totalAllTreasuriesBalance.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>

              {printSize === 'thermal' ? (
                <div className="space-y-1 py-1">
                  <div className="flex justify-between font-bold border-b border-dashed border-slate-200 pb-0.5">
                    <span>{mainTreasury?.name || 'الخزينة الرئيسية'}:</span>
                    <span className="font-mono font-black text-emerald-800">
                      {Number(mainTreasury?.balance || 0).toLocaleString()} {settings.currency_symbol}
                    </span>
                  </div>
                  {subTreasuries.map((t) => (
                    <div key={t.id} className="flex justify-between text-slate-700">
                      <span>{t.name}:</span>
                      <span className="font-mono font-bold">
                        {Number(t.balance || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-2">
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                    <span className="text-[10px] text-teal-300 font-bold block">
                      {mainTreasury?.name || 'الخزينة الرئيسية'} (ثابتة)
                    </span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {Number(mainTreasury?.balance || 0).toLocaleString()} {settings.currency_symbol}
                    </span>
                  </div>
                  {subTreasuries.map((t) => (
                    <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold block">{t.name}</span>
                      <span className="text-sm font-black font-mono text-slate-900">
                        {Number(t.balance || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Collections Section (قسم التحصيلات) */}
            <div className="mb-5 space-y-3">
              <div
                className={`font-black text-slate-900 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b-2 border-dashed border-slate-400 pb-1 text-xs'
                    : 'text-sm border-b-2 border-slate-300 pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>قسم التحصيلات والإيرادات (حسب البنود وطرق الدفع)</span>
                </span>
                <span className="font-mono font-black text-emerald-700">
                  +{reportData.totalIncome.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>

              {/* Sub-item 1: اشتراكات السيارات */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-slate-900 mb-1.5">
                  <span className="flex items-center gap-1 text-xs">
                    <Car className="w-3.5 h-3.5 text-teal-600" />
                    <span>أولاً: اشتراكات السيارات</span>
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    {reportData.totalCars.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(reportData.carsByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-item 2: اشتراكات العمارات */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-slate-900 mb-1.5">
                  <span className="flex items-center gap-1 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>ثانياً: اشتراكات العمارات</span>
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    {reportData.totalBuildings.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(reportData.buildingsByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-item 3: الخدمات الخاصة والفردية */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-slate-900 mb-1.5">
                  <span className="flex items-center gap-1 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>ثالثاً: الخدمات (خاصة / فردية)</span>
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    {reportData.totalServices.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(reportData.servicesByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-item 4: مبيعات المتجر */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-slate-900 mb-1.5">
                  <span className="flex items-center gap-1 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>رابعاً: مبيعات المتجر</span>
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    {reportData.totalStore.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(reportData.storeByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Income by Payment Method Summary */}
              <div
                className={`p-3 rounded-xl ${
                  printSize === 'thermal'
                    ? 'bg-slate-50 text-[10px]'
                    : 'bg-emerald-50/80 border border-emerald-200 text-xs'
                }`}
              >
                <span className="font-black text-emerald-900 block mb-1">
                  إجمالي التحصيلات الكلية حسب طريقة الدفع:
                </span>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between font-mono bg-white px-2 py-1 rounded border border-emerald-100">
                      <span className="text-slate-700 font-bold">{m}:</span>
                      <span className="font-black text-emerald-800">
                        {(reportData.totalIncomeByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Expenses Section (قسم المصروفات) */}
            <div className="mb-5 space-y-2">
              <div
                className={`font-black text-slate-900 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b-2 border-dashed border-slate-400 pb-1 text-xs'
                    : 'text-sm border-b-2 border-slate-300 pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>قسم المصروفات العامة والتشغيلية</span>
                </span>
                <span className="font-mono font-black text-rose-700">
                  -{reportData.totalExpenses.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-slate-50/70 border border-slate-200'
                }`}
              >
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-rose-700">
                        {(reportData.expensesByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Salaries & Advances Section (قسم الرواتب والسلف) */}
            <div className="mb-5 space-y-3">
              <div
                className={`font-black text-slate-900 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b-2 border-dashed border-slate-400 pb-1 text-xs'
                    : 'text-sm border-b-2 border-slate-300 pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>قسم الرواتب والسلف</span>
                </span>
                <span className="font-mono font-black text-purple-800">
                  -{(reportData.totalSalaries + reportData.totalAdvances).toLocaleString()} {settings.currency_symbol}
                </span>
              </div>

              {/* السلف */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-amber-50/40 border border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-amber-900 mb-1.5 text-xs">
                  <span>سلف الموظفين:</span>
                  <span className="font-mono font-black text-amber-800">
                    {reportData.totalAdvances.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-amber-100">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-amber-800">
                        {(reportData.advancesByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* الرواتب */}
              <div
                className={`p-2.5 rounded-xl ${
                  printSize === 'thermal'
                    ? 'border-b border-dashed border-slate-300 pb-2'
                    : 'bg-purple-50/40 border border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between font-black text-purple-900 mb-1.5 text-xs">
                  <span>صرف الرواتب:</span>
                  <span className="font-mono font-black text-purple-800">
                    {reportData.totalSalaries.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${
                    printSize === 'thermal' ? 'grid-cols-2 text-[10px]' : 'grid-cols-2 sm:grid-cols-4 text-xs'
                  }`}
                >
                  {availableMethods.map((m) => (
                    <div key={m} className="flex justify-between bg-white px-2 py-1 rounded border border-purple-100">
                      <span className="text-slate-600">{m}:</span>
                      <span className="font-mono font-bold text-purple-800">
                        {(reportData.salariesByMethod[m] || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Transfers & Closeouts Section (قسم التحويلات بين الخزائن) */}
            <div className="mb-5 space-y-2">
              <div
                className={`font-black text-slate-900 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b-2 border-dashed border-slate-400 pb-1 text-xs'
                    : 'text-sm border-b-2 border-slate-300 pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                  <span>قسم التحويلات وإغلاق الخزائن إلى الرئيسية</span>
                </span>
                <span className="font-mono font-black text-sky-800">
                  {reportData.transfersList.length + reportData.closeoutsList.length} حركة
                </span>
              </div>

              {reportData.transfersList.length === 0 && reportData.closeoutsList.length === 0 ? (
                <div className="text-slate-400 text-center py-2 text-[11px]">
                  لا توجد حركات تحويل مسجلة خلال الفترة
                </div>
              ) : (
                <div className="space-y-1.5">
                  {reportData.closeoutsList.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        printSize === 'thermal'
                          ? 'border-b border-dashed border-slate-200 text-[10px]'
                          : 'bg-teal-50/70 border border-teal-200 text-xs'
                      }`}
                    >
                      <div>
                        <span className="font-black text-teal-900 block">[إغلاق وتصفير]</span>
                        <span className="text-slate-600">
                          من: {getTreasuryName(t.treasury_id)} ⬅ إلى: {getTreasuryName(t.related_treasury_id || mainTreasury.id)}
                        </span>
                      </div>
                      <span className="font-mono font-black text-teal-800">
                        {Number(t.amount || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  ))}

                  {reportData.transfersList.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        printSize === 'thermal'
                          ? 'border-b border-dashed border-slate-200 text-[10px]'
                          : 'bg-sky-50/70 border border-sky-200 text-xs'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sky-900 block">تحويل بين الخزائن</span>
                        <span className="text-slate-600">
                          من: {getTreasuryName(t.treasury_id)} ⬅ إلى: {getTreasuryName(t.related_treasury_id || '')}
                        </span>
                      </div>
                      <span className="font-mono font-black text-sky-800">
                        {Number(t.amount || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Withdrawals Section (قسم المسحوب من الخزائن) */}
            <div className="mb-5 space-y-2">
              <div
                className={`font-black text-slate-900 flex items-center justify-between ${
                  printSize === 'thermal'
                    ? 'border-b-2 border-dashed border-slate-400 pb-1 text-xs'
                    : 'text-sm border-b-2 border-slate-300 pb-1.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-slate-600" />
                  <span>قسم المسحوب من الخزائن</span>
                </span>
                <span className="font-mono font-black text-slate-700">
                  {reportData.totalWithdrawals.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>

              {reportData.withdrawalsList.length === 0 ? (
                <div className="text-slate-400 text-center py-1 text-[11px]">
                  لا توجد سحوبات مباشرة أخرى
                </div>
              ) : (
                <div className="space-y-1">
                  {reportData.withdrawalsList.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{getTreasuryName(t.treasury_id)}: </span>
                        <span className="text-slate-600">{t.reason || 'سحب نقدي'}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-700">
                        -{Number(t.amount || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 8. Shift Final Summary & Reconciliation Box */}
            <div
              className={`p-4 rounded-2xl border-2 ${
                printSize === 'thermal'
                  ? 'border-dashed border-slate-400 bg-slate-50 text-[11px]'
                  : 'border-slate-800 bg-slate-900 text-white'
              }`}
            >
              <h4
                className={`font-black mb-3 text-center ${
                  printSize === 'thermal' ? 'text-xs text-slate-900' : 'text-sm text-teal-300'
                }`}
              >
                ملخص التوازن المالي وصافي الفترة
              </h4>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span>إجمالي التحصيلات والإيرادات (+):</span>
                  <span className="font-black text-emerald-400 font-bold">
                    +{reportData.totalIncome.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي المصروفات والتشغيل (-):</span>
                  <span className="font-black text-rose-400 font-bold">
                    -{reportData.totalExpenses.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي الرواتب والسلف (-):</span>
                  <span className="font-black text-purple-400 font-bold">
                    -{(reportData.totalSalaries + reportData.totalAdvances).toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
                <div
                  className={`pt-2 border-t flex justify-between text-base font-black ${
                    printSize === 'thermal' ? 'border-dashed border-slate-400 text-slate-900' : 'border-slate-700 text-emerald-400'
                  }`}
                >
                  <span className="font-sans">صافي الفائض النقدي المورد:</span>
                  <span>
                    {reportData.netSurplus.toLocaleString()} {settings.currency_symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Signatures Block */}
            <div
              className={`mt-6 pt-4 border-t border-dashed border-slate-300 flex justify-between text-center ${
                printSize === 'thermal' ? 'text-[10px]' : 'text-xs px-4'
              }`}
            >
              <div>
                <span className="block font-bold text-slate-600 mb-6">توقيع المسؤول / الكاشير:</span>
                <span className="block text-slate-400 font-mono">...................................</span>
              </div>
              <div>
                <span className="block font-bold text-slate-600 mb-6">اعتماد المدير المالي / الإدارة:</span>
                <span className="block text-slate-400 font-mono">...................................</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-4 text-center text-[10px] text-slate-400">
              تم إصدار هذا التقرير آلياً من نظام {settings.company_name || 'WeCare'} • {nowTimeDisplay}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
