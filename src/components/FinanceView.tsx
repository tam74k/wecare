import React, { useState, useMemo } from 'react';
import {
  Treasury,
  PaymentMethod,
  TreasuryTransaction,
  Settings,
  TreasuryTransactionType
} from '../types/database';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Coins,
  Receipt,
  Wallet,
  Check,
  Lock,
  User,
  Clock,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface FinanceViewProps {
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  transactions: TreasuryTransaction[];
  settings: Settings;
  onCreatePaymentMethod: (name: string) => Promise<PaymentMethod>;
  onCreateTransaction: (tx: Omit<TreasuryTransaction, 'id' | 'created_at'>) => Promise<TreasuryTransaction>;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  treasuries,
  paymentMethods,
  transactions,
  settings,
  onCreatePaymentMethod,
  onCreateTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transfer' | 'new_tx' | 'methods'>('overview');

  // Transfer Modal State
  const [transferData, setTransferData] = useState({
    fromTreasuryId: '',
    toTreasuryId: '',
    amount: '',
    reason: ''
  });

  // Direct Transaction Form State
  const [txData, setTxData] = useState({
    treasury_id: '',
    type: 'deposit' as TreasuryTransactionType,
    amount: '',
    reason: '',
    category: 'إيرادات عامة',
    payment_method: 'نقدي كاش'
  });

  // Filters State for Treasury Transactions Log
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [treasuryFilter, setTreasuryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New Payment Method State
  const [newMethodName, setNewMethodName] = useState('');

  const safeTreasuries = treasuries || [];
  const mainTreasury = safeTreasuries.find((t) => t.type === 'main') || safeTreasuries[0] || {
    id: 'main-treasury',
    name: 'الخزينة النقدية الرئيسية',
    type: 'main' as const,
    balance: 0,
    is_deletable: false,
    created_at: new Date().toISOString()
  };
  const subTreasuries = safeTreasuries.filter((t) => t.type !== 'main' && t.id !== mainTreasury?.id);
  const totalBalance = safeTreasuries.reduce((acc, t) => acc + Number(t.balance || 0), 0);

  // Helper to resolve Category & Payment Method for any transaction
  const resolveTransactionMeta = (tx: TreasuryTransaction) => {
    let category = tx.category || '';
    let paymentMethod = tx.payment_method || '';

    if (!category) {
      const r = (tx.reason || '').toLowerCase();
      if (r.includes('سيار') || r.includes('غسيل') || r.includes('مركبة')) {
        category = 'اشتراكات سيارات';
      } else if (r.includes('عمار') || r.includes('عمارات') || r.includes('مبن') || r.includes('واجهات')) {
        category = 'اشتراكات عمارات';
      } else if (r.includes('خدمة خاصة') || r.includes('خدمات خاصة') || r.includes('تنظيف خاص')) {
        category = 'اشتراكات خدمات خاصة';
      } else if (r.includes('متجر') || r.includes('طلب متجر') || r.includes('منتج') || r.includes('مبيعات')) {
        category = 'مبيعات متجر';
      } else if (
        r.includes('توريد') ||
        r.includes('مورد') ||
        r.includes('مشتروات') ||
        r.includes('مشتريات') ||
        r.includes('فاتورة شراء')
      ) {
        category = 'فواتير مشتروات';
      } else if (tx.type === 'transfer' || r.includes('تحويل')) {
        category = 'تحويل بين الخزائن';
      } else if (tx.type === 'withdrawal' || r.includes('مصروف') || r.includes('صرف') || r.includes('نثريات')) {
        category = 'مصروفات';
      } else if (r.includes('اشتراك')) {
        category = 'اشتراكات سيارات';
      } else {
        category = tx.type === 'deposit' ? 'إيرادات عامة' : 'مصروفات متنوعة';
      }
    }

    if (!paymentMethod) {
      const r = tx.reason || '';
      const matchReason = r.match(/عبر\s*\(([^)]+)\)/) || r.match(/عبر\s+([\u0600-\u06FFa-zA-Z0-9_\s]+)/);
      if (matchReason && matchReason[1]) {
        paymentMethod = matchReason[1].trim();
      } else {
        const t = safeTreasuries.find((tr) => tr.id === tx.treasury_id);
        if (t) {
          paymentMethod = t.type === 'main' ? 'نقدي كاش' : t.name;
        } else {
          paymentMethod = 'نقدي كاش';
        }
      }
    }

    return { category, paymentMethod };
  };

  const handleApplyDatePreset = (preset: 'all' | 'today' | 'week' | 'month') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'week') {
      const day = today.getDay(); // 0 is Sunday, 6 is Saturday
      const diffToSaturday = (day + 1) % 7;
      const saturday = new Date(today);
      saturday.setDate(today.getDate() - diffToSaturday);
      const friday = new Date(saturday);
      friday.setDate(saturday.getDate() + 6);
      setDateFrom(saturday.toISOString().split('T')[0]);
      setDateTo(friday.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    }
  };

  const handleResetFilters = () => {
    setCategoryFilter('all');
    setTreasuryFilter('all');
    setTypeFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const meta = resolveTransactionMeta(tx);

      // 1. Classification / Source Filter
      if (categoryFilter !== 'all' && meta.category !== categoryFilter) {
        return false;
      }

      // 2. Treasury Filter
      if (treasuryFilter !== 'all') {
        const matchesTreasury = tx.treasury_id === treasuryFilter || tx.related_treasury_id === treasuryFilter;
        if (!matchesTreasury) return false;
      }

      // 3. Type Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // 4. Date Range Filter
      const txDate = tx.created_at ? tx.created_at.slice(0, 10) : '';
      if (dateFrom && txDate && txDate < dateFrom) {
        return false;
      }
      if (dateTo && txDate && txDate > dateTo) {
        return false;
      }

      // 5. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchReason = (tx.reason || '').toLowerCase().includes(q);
        const matchUser = (tx.created_by || '').toLowerCase().includes(q);
        const matchAmt = tx.amount.toString().includes(q);
        const matchCategory = meta.category.toLowerCase().includes(q);
        const matchMethod = meta.paymentMethod.toLowerCase().includes(q);
        const matchTreasury = (safeTreasuries.find((t) => t.id === tx.treasury_id)?.name || '').toLowerCase().includes(q);

        if (!matchReason && !matchUser && !matchAmt && !matchCategory && !matchMethod && !matchTreasury) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, categoryFilter, treasuryFilter, typeFilter, dateFrom, dateTo, searchTerm, safeTreasuries]);

  // Filtered KPI Totals
  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'deposit') {
        income += Number(tx.amount || 0);
      } else if (tx.type === 'withdrawal') {
        expense += Number(tx.amount || 0);
      }
    });

    return {
      income,
      expense,
      net: income - expense
    };
  }, [filteredTransactions]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.fromTreasuryId || !transferData.toTreasuryId) {
      alert('يرجى تحديد الخزينة المصدر والخزينة المستلمة');
      return;
    }
    const amt = Number(transferData.amount);
    if (amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const source = treasuries.find((t) => t.id === transferData.fromTreasuryId);
    if (source && Number(source.balance) < amt) {
      alert(`رصيد الخزينة المصدر (${source.balance} ${settings.currency_symbol}) غير كافٍ لإتمام التحويل!`);
      return;
    }

    await onCreateTransaction({
      treasury_id: transferData.fromTreasuryId,
      related_treasury_id: transferData.toTreasuryId,
      type: 'transfer',
      amount: amt,
      reason: transferData.reason,
      created_by: 'المسؤول المالي'
    });

    alert('تم تحويل المبلغ بنجاح وتحديث أرصدة الخزائن!');
    setTransferData({
      fromTreasuryId: '',
      toTreasuryId: '',
      amount: '',
      reason: ''
    });
    setActiveTab('overview');
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txData.treasury_id) {
      alert('يرجى اختيار الخزينة');
      return;
    }
    const amt = Number(txData.amount);
    if (amt <= 0) return;

    await onCreateTransaction({
      treasury_id: txData.treasury_id,
      type: txData.type,
      amount: amt,
      reason: txData.reason,
      category: txData.category,
      payment_method: txData.payment_method,
      created_by: 'المسؤول المالي'
    });

    alert('تم تسجيل الحركة بنجاح!');
    setTxData({
      treasury_id: '',
      type: 'deposit',
      amount: '',
      reason: '',
      category: 'إيرادات عامة',
      payment_method: 'نقدي كاش'
    });
    setActiveTab('overview');
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    await onCreatePaymentMethod(newMethodName.trim());
    alert('تمت إضافة طريقة الدفع وإنشاء خزينتها الفرعية تلقائياً!');
    setNewMethodName('');
    setActiveTab('overview');
  };

  const getTreasuryName = (id: string) => safeTreasuries.find((t) => t.id === id)?.name || 'خزينة غير محددة';

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">النظام المالي وإدارة الخزائن</h2>
          <p className="text-sm text-slate-500 mt-1">
            الخزينة الرئيسية الثابتة، الخزائن الفرعية لكل وسيلة دفع، حركات التحويل والإيداع والسحب
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نظرة عامة على الخزائن
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'transfer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تحويل إلى الخزينة الرئيسية
          </button>
          <button
            onClick={() => setActiveTab('new_tx')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'new_tx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + حركة خزينة مباشرة
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'methods' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            طرق الدفع
          </button>
        </div>
      </div>

      {/* Main Treasury Spotlight Card */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-teal-800/40">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-lg">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>ثابتة وغير قابلة للحذف</span>
              </span>
            </div>
            <h3 className="text-xl font-black">{mainTreasury?.name}</h3>
            <p className="text-xs text-teal-200/70 mt-1">تستقبل تحويلات الفترات والأرصدة الدورية من الخزائن الفرعية</p>
          </div>
        </div>

        <div className="text-left md:text-right bg-white/5 p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-teal-300 font-bold">الرصيد الفعلي الحالي</span>
          <h2 className="text-3xl font-black text-emerald-400 font-mono mt-0.5">
            {Number(mainTreasury?.balance || 0).toLocaleString()} {settings.currency_symbol}
          </h2>
        </div>
      </div>

      {/* Tab 1: Treasuries Overview & Sub-treasuries */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              الخزائن الفرعية لوسائل الدفع (تتراكم فيها المبالغ المحصلة)
            </h3>
            <span className="text-xs font-bold text-slate-500">
              إجمالي كافة الأرصدة: <strong className="text-slate-900">{totalBalance.toLocaleString()} {settings.currency_symbol}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subTreasuries.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">لا توجد خزائن فرعية مضافة حالياً.</p>
                <p className="text-xs text-slate-500 mt-1">
                  يمكنك إضافة طرق دفع وخزائن فرعية جديدة من تبويب "طرق الدفع".
                </p>
              </div>
            ) : (
              subTreasuries.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                        خزينة فرعية
                      </span>
                      <Wallet className="w-5 h-5 text-teal-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{t.name}</h4>
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 font-semibold block mb-0.5">الرصيد المتراكم:</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {Number(t.balance || 0).toLocaleString()} {settings.currency_symbol}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setTransferData((prev) => ({
                          ...prev,
                          fromTreasuryId: t.id,
                          toTreasuryId: mainTreasury?.id || ''
                        }));
                        setActiveTab('transfer');
                      }}
                      className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>تحويل للخزينة الرئيسية</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Transactions History Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            {/* Log Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-teal-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">سجل حركات الخزينة والتحويلات المالية</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    متابعة وتصنيف مصادر الدخل، طرق الدفع، وتصفية الحركات حسب الخزينة والنوع والفترة
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600">
                إجمالي السجل: <strong className="font-mono text-slate-900">{transactions.length}</strong> حركة
              </span>
            </div>

            {/* Filter Bar (نوع محدد - خزينة محددة - خلال مدة) */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Classification / Source Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    مصدر الدخل / التصنيف
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    <option value="all">كافة المصادر والتصنيفات</option>
                    <option value="اشتراكات سيارات">اشتراكات سيارات</option>
                    <option value="اشتراكات عمارات">اشتراكات عمارات</option>
                    <option value="اشتراكات خدمات خاصة">اشتراكات خدمات خاصة</option>
                    <option value="مبيعات متجر">مبيعات متجر</option>
                    <option value="فواتير مشتروات">فواتير مشتروات</option>
                    <option value="مصروفات">مصروفات</option>
                    <option value="تحويل بين الخزائن">تحويل بين الخزائن</option>
                    <option value="إيرادات عامة">إيرادات عامة</option>
                  </select>
                </div>

                {/* 2. Treasury Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    الخزينة المحددة
                  </label>
                  <select
                    value={treasuryFilter}
                    onChange={(e) => setTreasuryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    <option value="all">كافة الخزائن ({safeTreasuries.length})</option>
                    {safeTreasuries.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Transaction Type (Deposit / Withdrawal / Transfer) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    نوع الحركة (إيداع / سحب)
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    <option value="all">الكل (إيداعات ومسحوبات وتحويلات)</option>
                    <option value="deposit">إيداعات / مقبوضات (+)</option>
                    <option value="withdrawal">مسحوبات / مصروفات (-)</option>
                    <option value="transfer">تحويلات بين الخزائن (↔)</option>
                  </select>
                </div>

                {/* 4. Duration Preset */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    الفترة الزمنية
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('all')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        datePreset === 'all'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('today')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        datePreset === 'today'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      اليوم
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('week')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        datePreset === 'week'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      الأسبوع
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('month')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        datePreset === 'month'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      الشهر
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Date Range & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-bold text-[11px]">من تاريخ:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-bold text-[11px]">إلى تاريخ:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  {(categoryFilter !== 'all' ||
                    treasuryFilter !== 'all' ||
                    typeFilter !== 'all' ||
                    datePreset !== 'all' ||
                    searchTerm) && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>إعادة ضبط الفلاتر</span>
                    </button>
                  )}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث في البيان، المستخدم، المبلغ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Filtered Financial Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/50 border-b border-slate-200 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">إجمالي المقبوضات (+)</span>
                <span className="text-sm font-black text-emerald-600 font-mono">
                  +{filteredTotals.income.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">إجمالي المصروفات (-)</span>
                <span className="text-sm font-black text-rose-600 font-mono">
                  -{filteredTotals.expense.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">صافي الحركة (المقبوضات - المصروفات)</span>
                <span
                  className={`text-sm font-black font-mono ${
                    filteredTotals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {filteredTotals.net >= 0 ? '+' : ''}
                  {filteredTotals.net.toLocaleString()} {settings.currency_symbol}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">عدد الحركات المفلترة</span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  {filteredTransactions.length} حركة
                </span>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">لا توجد حركات مالية مطابقة للفلاتر المحددة.</p>
                <p className="text-[11px] text-slate-400">
                  يمكنك تغيير فلاتر التصنيف أو الخزينة أو الفترة الزمنية لاستعراض الحركات.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">نوع الحركة</th>
                      <th className="p-3.5">مصدر الدخل / التصنيف</th>
                      <th className="p-3.5">طريقة الدفع</th>
                      <th className="p-3.5">الخزينة المعنية</th>
                      <th className="p-3.5">المبلغ ({settings.currency_symbol})</th>
                      <th className="p-3.5">السبب والبيان</th>
                      <th className="p-3.5">المستخدم المسؤول</th>
                      <th className="p-3.5">الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredTransactions.map((tx) => {
                      const meta = resolveTransactionMeta(tx);
                      const isIncome = tx.type === 'deposit';
                      const isExpense = tx.type === 'withdrawal';
                      const isTransfer = tx.type === 'transfer';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Transaction Type */}
                          <td className="p-3.5">
                            {isIncome && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                <span>إيداع</span>
                              </span>
                            )}
                            {isExpense && (
                              <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                <span>سحب</span>
                              </span>
                            )}
                            {isTransfer && (
                              <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                <ArrowRightLeft className="w-3 h-3 text-sky-600" />
                                <span>تحويل بين الخزائن</span>
                              </span>
                            )}
                          </td>

                          {/* 2. Source / Classification (Green for Income, Red for Expense) */}
                          <td className="p-3.5">
                            {isIncome && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                <span>{meta.category}</span>
                              </span>
                            )}
                            {isExpense && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                <span>{meta.category}</span>
                              </span>
                            )}
                            {isTransfer && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                <span>{meta.category}</span>
                              </span>
                            )}
                          </td>

                          {/* 3. Payment Method Column */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
                              <CreditCard className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{meta.paymentMethod}</span>
                            </div>
                          </td>

                          {/* 4. Treasury */}
                          <td className="p-3.5 font-bold text-slate-900">
                            {getTreasuryName(tx.treasury_id)}
                            {tx.related_treasury_id && (
                              <span className="text-slate-400 font-normal">
                                {' '}
                                ← {getTreasuryName(tx.related_treasury_id)}
                              </span>
                            )}
                          </td>

                          {/* 5. Amount */}
                          <td className="p-3.5 font-mono font-bold text-sm">
                            <span
                              className={
                                isIncome
                                  ? 'text-emerald-700'
                                  : isExpense
                                  ? 'text-rose-700'
                                  : 'text-sky-700'
                              }
                            >
                              {isIncome ? '+' : isExpense ? '-' : ''}
                              {tx.amount.toLocaleString()} {settings.currency_symbol}
                            </span>
                          </td>

                          {/* 6. Reason */}
                          <td className="p-3.5 text-slate-600 max-w-xs">{tx.reason}</td>

                          {/* 7. Performed By */}
                          <td className="p-3.5 text-slate-500">{tx.created_by}</td>

                          {/* 8. Timestamp */}
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(tx.created_at || Date.now()).toLocaleString('ar-EG')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Transfer Form to Main Treasury */}
      {activeTab === 'transfer' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تحويل أموال الفترات إلى الخزينة الرئيسية</h3>
              <p className="text-xs text-slate-500">نقل المبالغ النقدية المحصلة من الخزائن الفرعية للخزينة المركزية</p>
            </div>
          </div>

          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الخزينة المصدر (الفرعية)</label>
              <select
                required
                value={transferData.fromTreasuryId}
                onChange={(e) => setTransferData({ ...transferData, fromTreasuryId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value="">اختر الخزينة المحصلة...</option>
                {subTreasuries.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (الرصيد: {t.balance} {settings.currency_symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الخزينة الهدف (المستلمة)</label>
              <select
                required
                value={transferData.toTreasuryId || mainTreasury?.id}
                onChange={(e) => setTransferData({ ...transferData, toTreasuryId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value={mainTreasury?.id}>{mainTreasury?.name} (الخزينة الرئيسية للمؤسسة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المبلغ المراد تحويله ({settings.currency_symbol})
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="مثال: 5000"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">السبب والبيان</label>
              <input
                type="text"
                required
                value={transferData.reason}
                onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm rounded-xl shadow-md hover:from-teal-700 hover:to-emerald-700 transition-all"
            >
              تأكيد التحويل الآن
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Direct Transaction */}
      {activeTab === 'new_tx' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">تسجيل حركة نقدية مباشرة (إيداع / سحب)</h3>
                <p className="text-xs text-slate-500">إيداع رأس مال، سحب مصروفات تشغيل، أو تسويات نقدية</p>
              </div>
            </div>

            {/* Quick Action: Disburse directly from Main Treasury */}
            {mainTreasury && (
              <button
                type="button"
                onClick={() => {
                  setTxData({
                    ...txData,
                    type: 'withdrawal',
                    category: 'مصروفات',
                    treasury_id: mainTreasury.id,
                    payment_method: 'نقدي كاش'
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  txData.type === 'withdrawal' && txData.treasury_id === mainTreasury.id
                    ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>صرف مصروف من الخزينة الرئيسية</span>
                <span className="font-mono text-[10px] opacity-90">({mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol})</span>
              </button>
            )}
          </div>

          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الحركة</label>
                <select
                  value={txData.type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setTxData({
                      ...txData,
                      type: newType,
                      treasury_id: (!txData.treasury_id && newType === 'withdrawal' && mainTreasury) ? mainTreasury.id : txData.treasury_id,
                      category: newType === 'withdrawal' ? 'مصروفات' : 'إيرادات عامة'
                    });
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="deposit">إيداع (+)</option>
                  <option value="withdrawal">سحب مصروفات (-)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">الخزينة</label>
                  {mainTreasury && (
                    <button
                      type="button"
                      onClick={() => setTxData({ ...txData, treasury_id: mainTreasury.id })}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                    >
                      ★ اختيار الخزينة الرئيسية
                    </button>
                  )}
                </div>
                <select
                  required
                  value={txData.treasury_id}
                  onChange={(e) => setTxData({ ...txData, treasury_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">اختر الخزينة...</option>
                  {mainTreasury && (
                    <option value={mainTreasury.id} className="font-bold text-teal-900 bg-teal-50">
                      ★ {mainTreasury.name} (الخزينة النقدية الرئيسية للمؤسسة) - الرصيد: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol}
                    </option>
                  )}
                  {treasuries
                    .filter((t) => t.id !== mainTreasury?.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {mainTreasury && txData.treasury_id === mainTreasury.id && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {txData.type === 'withdrawal'
                    ? `سيتم صرف هذا المبلغ مباشرة من الخزينة النقدية الرئيسية (رصيدها الحالي: ${mainTreasury.balance.toLocaleString('ar-EG')} ${settings.currency_symbol})`
                    : `سيتم إيداع هذا المبلغ في الخزينة النقدية الرئيسية (رصيدها الحالي: ${mainTreasury.balance.toLocaleString('ar-EG')} ${settings.currency_symbol})`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تصنيف الحركة / مصدر الدخل</label>
                <select
                  value={txData.category}
                  onChange={(e) => setTxData({ ...txData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="مصروفات">مصروفات</option>
                  <option value="فواتير مشتروات">فواتير مشتروات</option>
                  <option value="اشتراكات سيارات">اشتراكات سيارات</option>
                  <option value="اشتراكات عمارات">اشتراكات عمارات</option>
                  <option value="اشتراكات خدمات خاصة">اشتراكات خدمات خاصة</option>
                  <option value="مبيعات متجر">مبيعات متجر</option>
                  <option value="إيرادات عامة">إيرادات عامة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الدفع</label>
                <select
                  value={txData.payment_method}
                  onChange={(e) => setTxData({ ...txData, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="نقدي كاش">نقدي كاش</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="انستاباي">انستاباي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="فيزا / ماستركارد">فيزا / ماستركارد</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المبلغ ({settings.currency_symbol})
              </label>
              <input
                type="number"
                required
                min={1}
                value={txData.amount}
                onChange={(e) => setTxData({ ...txData, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">السبب والبيان المفصل</label>
              <input
                type="text"
                required
                placeholder="سداد فواتير وقود، شراء مستلزمات، عهدة تشغيل..."
                value={txData.reason}
                onChange={(e) => setTxData({ ...txData, reason: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all"
            >
              حفظ وتطبيق الحركة
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Payment Methods */}
      {activeTab === 'methods' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">إدارة طرق الدفع والخزائن التابعة لها</h3>
              <p className="text-xs text-slate-500">
                كل طريقة دفع جديدة تنشئ تلقائياً خزينة فرعية خاصة بها لتتبع التحصيلات
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPaymentMethod} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="اسم طريقة الدفع (مثال: محفظة إلكترونية، فودافون كاش، إنستاباي)..."
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              إضافة طريقة دفع
            </button>
          </form>

          <div className="space-y-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{pm.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الخزينة المرتبطة: <strong className="text-teal-700">{getTreasuryName(pm.treasury_id)}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-slate-400 block font-sans">الرصيد المحصل:</span>
                    <span className="text-sm font-black text-slate-800">
                      {Number(treasuries.find((t) => t.id === pm.treasury_id)?.balance || 0).toLocaleString()} {settings.currency_symbol}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    نشط
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
