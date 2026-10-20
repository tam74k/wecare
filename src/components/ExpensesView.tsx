import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Expense,
  ExpenseCategory,
  Treasury,
  PaymentMethod,
  Settings
} from '../types/database';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  Wallet,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Printer,
  Download,
  FileSpreadsheet,
  Eye,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Coins,
  Settings as SettingsIcon,
  RefreshCw,
  FileText,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  settings: Settings;
  onCreateExpense: (data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => Promise<Expense>;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  onCreateCategory: (cat: Omit<ExpenseCategory, 'id' | 'created_at'>) => Promise<ExpenseCategory>;
  onUpdateCategory: (cat: ExpenseCategory) => Promise<ExpenseCategory>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onRefreshData?: () => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses = [],
  categories = [],
  treasuries = [],
  paymentMethods = [],
  settings,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefreshData
}) => {
  // Main Treasury and Default Cash Method
  const mainTreasury = useMemo(() => {
    return treasuries.find((t) => t.type === 'main') || treasuries[0];
  }, [treasuries]);

  const defaultCashMethod = useMemo(() => {
    return paymentMethods.find((pm) => pm.name.includes('كاش') || pm.name.includes('نقدي')) || paymentMethods[0];
  }, [paymentMethods]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [treasuryFilter, setTreasuryFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Voucher Form State
  const [voucherFormData, setVoucherFormData] = useState({
    voucher_number: '',
    category_id: '',
    amount: '',
    treasury_id: '',
    payment_method_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    recipient: '',
    invoice_ref: '',
    attachment_url: ''
  });
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Inline Add Category inside Voucher Modal
  const [showInlineNewCategory, setShowInlineNewCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

  // Open Create Voucher Modal
  const handleOpenCreateVoucher = (presetCategoryId?: string) => {
    setEditingExpense(null);
    const firstCat = presetCategoryId || (categories.find(c => c.is_active)?.id || categories[0]?.id || '');
    setVoucherFormData({
      voucher_number: `EXP-${Date.now().toString().slice(-6)}`,
      category_id: firstCat,
      amount: '',
      treasury_id: mainTreasury?.id || treasuries[0]?.id || '',
      payment_method_id: defaultCashMethod?.id || paymentMethods[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      reason: '',
      recipient: '',
      invoice_ref: '',
      attachment_url: ''
    });
    setIsVoucherModalOpen(true);
  };

  // Open Edit Voucher Modal
  const handleOpenEditVoucher = (exp: Expense) => {
    setEditingExpense(exp);
    setVoucherFormData({
      voucher_number: exp.voucher_number || '',
      category_id: exp.category_id || '',
      amount: String(exp.amount),
      treasury_id: exp.treasury_id || '',
      payment_method_id: exp.payment_method_id || '',
      date: exp.date || new Date().toISOString().split('T')[0],
      reason: exp.reason || '',
      recipient: exp.recipient || '',
      invoice_ref: exp.invoice_ref || '',
      attachment_url: exp.attachment_url || ''
    });
    setIsVoucherModalOpen(true);
  };

  // Handle Attachment Upload (Base64)
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setVoucherFormData((prev) => ({
        ...prev,
        attachment_url: (event.target?.result as string) || ''
      }));
    };
    reader.readAsDataURL(file);
  };

  // Submit Voucher (Create or Edit)
  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(voucherFormData.amount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح للصرف');
      return;
    }
    if (!voucherFormData.category_id) {
      alert('يرجى اختيار بند الصرف');
      return;
    }
    if (!voucherFormData.treasury_id) {
      alert('يرجى تحديد خزينة الصرف');
      return;
    }
    if (!voucherFormData.reason.trim()) {
      alert('يرجى كتابة بيان الصرف وتفاصيله');
      return;
    }

    const selectedTreasury = treasuries.find((t) => t.id === voucherFormData.treasury_id);
    const selectedCategory = categories.find((c) => c.id === voucherFormData.category_id);
    const selectedPm = paymentMethods.find((p) => p.id === voucherFormData.payment_method_id);

    try {
      setIsSubmittingVoucher(true);

      if (editingExpense) {
        // Edit Mode: Reverses old financial impact and applies new one
        await onUpdateExpense(editingExpense.id, {
          voucher_number: voucherFormData.voucher_number.trim(),
          category_id: voucherFormData.category_id,
          category_name: selectedCategory?.name || '',
          amount: amt,
          treasury_id: voucherFormData.treasury_id,
          payment_method_id: voucherFormData.payment_method_id || null,
          payment_method_name: selectedPm?.name || 'نقدي كاش',
          date: voucherFormData.date,
          reason: voucherFormData.reason.trim(),
          recipient: voucherFormData.recipient.trim() || undefined,
          invoice_ref: voucherFormData.invoice_ref.trim() || undefined,
          attachment_url: voucherFormData.attachment_url || undefined,
          created_by: 'المسؤول المالي'
        });
        alert(`تم تحديث سند الصرف (${voucherFormData.voucher_number}) وإعادة ضبط الأثر المالي على الخزائن بنجاح!`);
      } else {
        // Create Mode
        await onCreateExpense({
          voucher_number: voucherFormData.voucher_number.trim(),
          category_id: voucherFormData.category_id,
          category_name: selectedCategory?.name || '',
          amount: amt,
          treasury_id: voucherFormData.treasury_id,
          payment_method_id: voucherFormData.payment_method_id || null,
          payment_method_name: selectedPm?.name || 'نقدي كاش',
          date: voucherFormData.date,
          reason: voucherFormData.reason.trim(),
          recipient: voucherFormData.recipient.trim() || undefined,
          invoice_ref: voucherFormData.invoice_ref.trim() || undefined,
          attachment_url: voucherFormData.attachment_url || undefined,
          created_by: 'المسؤول المالي'
        });
        alert(`تم تسجيل سند الصرف بنجاح وخصم مبلغ (${amt.toLocaleString('ar-EG')} ${settings.currency_symbol}) من ${selectedTreasury?.name || 'الخزينة'}!`);
      }

      setIsVoucherModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ سند الصرف: ' + (err.message || err));
    } finally {
      setIsSubmittingVoucher(false);
    }
  };

  // Confirm Delete Expense (with financial reversal)
  const handleExecuteDeleteExpense = async () => {
    if (!deleteConfirmExpense) return;
    try {
      await onDeleteExpense(deleteConfirmExpense.id);
      alert(`تم حذف سند الصرف رقم (${deleteConfirmExpense.voucher_number}) بنجاح وتمت إعادة أثره المالي وإيداع مبلغ (${deleteConfirmExpense.amount.toLocaleString('ar-EG')} ${settings.currency_symbol}) في الخزينة المصروف منها!`);
      setDeleteConfirmExpense(null);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert('فشل حذف سند الصرف: ' + (err.message || err));
    }
  };

  // Save Category (Create or Edit)
  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      alert('يرجى إدخال اسم بند الصرف');
      return;
    }
    try {
      setIsSubmittingCategory(true);
      if (editingCategory) {
        await onUpdateCategory({
          ...editingCategory,
          name: categoryFormData.name.trim(),
          description: categoryFormData.description.trim() || undefined,
          is_active: categoryFormData.is_active
        });
      } else {
        await onCreateCategory({
          name: categoryFormData.name.trim(),
          description: categoryFormData.description.trim() || undefined,
          is_active: categoryFormData.is_active
        });
      }
      setCategoryFormData({ name: '', description: '', is_active: true });
      setEditingCategory(null);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ بند الصرف: ' + (err.message || err));
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Inline Quick Add Category inside Voucher Modal
  const handleInlineAddCategory = async () => {
    if (!inlineCategoryName.trim()) return;
    try {
      const created = await onCreateCategory({
        name: inlineCategoryName.trim(),
        description: 'بند صرف مضاف سريعاً',
        is_active: true
      });
      setVoucherFormData((prev) => ({ ...prev, category_id: created.id }));
      setInlineCategoryName('');
      setShowInlineNewCategory(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert('تعذر إضافة البند: ' + (err.message || err));
    }
  };

  // Delete Category
  const handleDeleteCategoryItem = async (cat: ExpenseCategory) => {
    const hasExpenses = expenses.some((e) => e.category_id === cat.id);
    if (hasExpenses) {
      if (!confirm(`تحذير: هذا البند مرتبط بمصروفات سابقة مسجلة بالنظام. هل أنت متأكد من حذفه؟`)) {
        return;
      }
    } else {
      if (!confirm(`هل أنت متأكد من حذف بند الصرف (${cat.name})؟`)) return;
    }

    try {
      await onDeleteCategory(cat.id);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert('تعذر حذف البند: ' + (err.message || err));
    }
  };

  // Filtered Expenses Computation
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];

    const currentDayOfWeek = (now.getDay() + 1) % 7; // السبت = 0
    const weekStartObj = new Date(now);
    weekStartObj.setDate(now.getDate() - currentDayOfWeek);
    const weekStartStr = weekStartObj.toISOString().split('T')[0];

    return expenses.filter((exp) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesVoucher = exp.voucher_number?.toLowerCase().includes(q);
        const matchesReason = exp.reason?.toLowerCase().includes(q);
        const matchesCategory = exp.category_name?.toLowerCase().includes(q);
        const matchesRecipient = exp.recipient?.toLowerCase().includes(q);
        const matchesRef = exp.invoice_ref?.toLowerCase().includes(q);
        const matchesAmount = String(exp.amount).includes(q);
        if (!matchesVoucher && !matchesReason && !matchesCategory && !matchesRecipient && !matchesRef && !matchesAmount) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && exp.category_id !== categoryFilter) {
        return false;
      }

      // 3. Treasury Filter
      if (treasuryFilter !== 'all' && exp.treasury_id !== treasuryFilter) {
        return false;
      }

      // 4. Payment Method Filter
      if (paymentMethodFilter !== 'all' && exp.payment_method_id !== paymentMethodFilter) {
        return false;
      }

      // 5. Date Filter
      const expDate = exp.date ? exp.date.split('T')[0] : '';
      if (datePreset === 'today') {
        if (expDate !== todayStr) return false;
      } else if (datePreset === 'week') {
        if (expDate < weekStartStr || expDate > todayStr) return false;
      } else if (datePreset === 'month') {
        if (expDate < monthStart || expDate > todayStr) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate && expDate < customStartDate) return false;
        if (customEndDate && expDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    expenses,
    searchTerm,
    categoryFilter,
    treasuryFilter,
    paymentMethodFilter,
    datePreset,
    customStartDate,
    customEndDate
  ]);

  // Overall and Filtered Totals
  const totals = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    let allTotal = 0;
    let todayTotal = 0;
    let monthTotal = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      allTotal += amt;
      const d = e.date ? e.date.split('T')[0] : '';
      if (d === todayStr) todayTotal += amt;
      if (d >= monthStart && d <= todayStr) monthTotal += amt;
    });

    const filteredTotal = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      all: allTotal,
      today: todayTotal,
      month: monthTotal,
      filtered: filteredTotal,
      filteredCount: filteredExpenses.length
    };
  }, [expenses, filteredExpenses]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) {
      alert('لا توجد بيانات مصروفات للتصدير وفق الفلاتر الحالية');
      return;
    }

    const dataRows = filteredExpenses.map((exp, idx) => {
      const treasury = treasuries.find((t) => t.id === exp.treasury_id);
      return {
        '#': idx + 1,
        'رقم السند': exp.voucher_number || '',
        'التاريخ': exp.date || '',
        'بند الصرف': exp.category_name || '',
        'البيان والتفاصيل': exp.reason || '',
        'المبلغ': exp.amount,
        'العملة': settings.currency_symbol,
        'الخزينة المصروف منها': treasury ? `${treasury.name} (${treasury.type === 'main' ? 'رئيسية' : 'فرعية'})` : '',
        'طريقة الدفع': exp.payment_method_name || 'نقدي كاش',
        'المستلم / الجهة': exp.recipient || 'غير محدد',
        'رقم الإيصال / الفاتورة': exp.invoice_ref || '',
        'المسؤول': exp.created_by || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
    XLSX.writeFile(wb, `wecare_expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper name lookup
  const getTreasuryInfo = (id: string) => {
    const t = treasuries.find((tr) => tr.id === id);
    return t || { name: 'خزينة غير محددة', type: 'sub', balance: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">سجل المصروفات ونفقات التشغيل</h2>
              <p className="text-xs text-slate-500 font-medium">
                إدارة بنود الصرف، إصدار بطاقات الصرف النقدية، وضبط الأثر المالي على الخزائن لحظياً
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manage Categories Button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-200"
          >
            <SettingsIcon className="w-4 h-4 text-slate-600" />
            <span>بنود ومجالات الصرف ({categories.length})</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير إكسل</span>
          </button>

          {/* New Expense Voucher Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateVoucher()}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm shadow-rose-600/20 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ تسجيل سند صرف جديد</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Filtered */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>إجمالي المصروفات (للفترة)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 font-mono">
            {totals.filtered.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-600">{settings.currency_symbol}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            {totals.filteredCount} سند صرف محدد
          </span>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>مصروفات اليوم</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {totals.today.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-600">{settings.currency_symbol}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            حتى هذه اللحظة
          </span>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>مصروفات الشهر الحالي</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {totals.month.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-600">{settings.currency_symbol}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            منذ بداية الشهر
          </span>
        </div>

        {/* Main Treasury Balance */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200/80 bg-teal-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-teal-800 text-xs font-bold">
            <span>رصيد الخزينة الرئيسية</span>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-teal-800 font-mono">
            {(mainTreasury?.balance || 0).toLocaleString('ar-EG')} <span className="text-xs font-bold text-teal-700">{settings.currency_symbol}</span>
          </div>
          <span className="text-[10px] text-teal-600 font-bold block">
            جاهز ومتاح للصرف الفوري ★
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث برقم السند، البيان، المستلم، المبلغ، رقم الفاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 outline-none"
            />
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                datePreset === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('week')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                datePreset === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('month')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                datePreset === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                datePreset === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                datePreset === 'custom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تاريخ مخصص
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Custom Date Inputs if selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-rose-50/50 p-1.5 px-3 rounded-xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-900">من:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
              <span className="text-[11px] font-bold text-rose-900">إلى:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">بند الصرف:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="all">جميع بنود الصرف</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Treasury Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">الخزينة المصروف منها:</span>
            <select
              value={treasuryFilter}
              onChange={(e) => setTreasuryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="all">جميع الخزائن</option>
              {mainTreasury && (
                <option value={mainTreasury.id} className="font-bold text-rose-800">
                  ★ {mainTreasury.name} (الخزينة الرئيسية)
                </option>
              )}
              {treasuries
                .filter((t) => t.id !== mainTreasury?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">طريقة الدفع:</span>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="all">جميع طرق الدفع</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm || categoryFilter !== 'all' || treasuryFilter !== 'all' || paymentMethodFilter !== 'all' || datePreset !== 'month') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setTreasuryFilter('all');
                setPaymentMethodFilter('all');
                setDatePreset('month');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer mr-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3.5">رقم السند</th>
                <th className="py-3 px-3.5">التاريخ</th>
                <th className="py-3 px-3.5">بند الصرف</th>
                <th className="py-3 px-3.5">البيان والوصف التفصيلي</th>
                <th className="py-3 px-3.5 text-center">الخزينة المصروف منها</th>
                <th className="py-3 px-3.5 text-center">طريقة الدفع</th>
                <th className="py-3 px-3.5 text-center">المستلم / الجهة</th>
                <th className="py-3 px-3.5 text-left">المبلغ</th>
                <th className="py-3 px-3.5 text-center">المرفق</th>
                <th className="py-3 px-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-sm">لا توجد سندات صرف مطابقة لمعايير البحث</p>
                    <p className="text-xs text-slate-400 mt-1">
                      يمكنك تسجيل سند صرف جديد بنقرة زر على «+ تسجيل سند صرف جديد» بالأعلى
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const treasury = getTreasuryInfo(exp.treasury_id);
                  const isMain = treasury.type === 'main';

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Voucher Number */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                        <button
                          type="button"
                          onClick={() => setViewingVoucher(exp)}
                          className="text-teal-700 hover:text-teal-900 hover:underline cursor-pointer flex items-center gap-1 font-mono"
                          title="عرض بطاقة السند للطباعة"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>{exp.voucher_number || `EXP-${exp.id.slice(0, 6)}`}</span>
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {exp.date}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {exp.category_name || 'عام'}
                        </span>
                      </td>

                      {/* Reason / Description */}
                      <td className="py-3 px-3.5 font-medium text-slate-800 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed" title={exp.reason}>
                          {exp.reason}
                        </p>
                        {exp.invoice_ref && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            فاتورة خارجية: #{exp.invoice_ref}
                          </span>
                        )}
                      </td>

                      {/* Treasury */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isMain
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isMain && <span>★</span>}
                          <span>{treasury.name}</span>
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-600 text-xs whitespace-nowrap">
                        {exp.payment_method_name || 'نقدي كاش'}
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700 text-xs whitespace-nowrap">
                        {exp.recipient || <span className="text-slate-300">-</span>}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-left whitespace-nowrap font-mono font-black text-rose-600 text-sm">
                        -{exp.amount.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-500">{settings.currency_symbol}</span>
                      </td>

                      {/* Attachment */}
                      <td className="py-3 px-3.5 text-center">
                        {exp.attachment_url ? (
                          <a
                            href={exp.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                            title="عرض الإيصال المرفق"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                            <span>مرفق</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View / Print Voucher */}
                          <button
                            type="button"
                            onClick={() => setViewingVoucher(exp)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                            title="معاينة وطباعة بطاقة السند"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Voucher */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditVoucher(exp)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="تعديل المصروف (مع إعادة ضبط الأثر المالي)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Voucher */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmExpense(exp)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف المصروف وإعادة أثره المالي للخزينة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                  <td colSpan={7} className="py-3 px-3.5 text-right font-bold text-xs text-slate-600">
                    إجمالي مصروفات الفترة المحددة ({filteredExpenses.length} سند):
                  </td>
                  <td className="py-3 px-3.5 text-left font-mono font-black text-rose-600 text-base whitespace-nowrap">
                    -{totals.filtered.toLocaleString('ar-EG')} {settings.currency_symbol}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ==============================================================================
          1. Expense Voucher Modal (بطاقة الصرف - إضافة وتعديل)
         ============================================================================== */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingExpense ? `تعديل سند صرف نقدي (${editingExpense.voucher_number})` : 'إصدار بطاقة / سند صرف نقدي جديد'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingExpense
                      ? 'سيتم استرجاع أثر المبلغ القديم تلقائياً وتطبيق المبلغ والخزينة الجديدة بدقة'
                      : 'سيتم خصم المبلغ فورياً من الخزينة المحددة وتسجيل الأثر المالي في الحركات'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitVoucher} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Row 1: Voucher Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم سند الصرف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={voucherFormData.voucher_number}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, voucher_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                    placeholder="EXP-XXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الصرف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherFormData.date}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Category (بند الصرف) & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      بند ومجال الصرف <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewCategory(!showInlineNewCategory)}
                      className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>بند جديد</span>
                    </button>
                  </div>

                  {showInlineNewCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="اسم البند الجديد..."
                        value={inlineCategoryName}
                        onChange={(e) => setInlineCategoryName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={handleInlineAddCategory}
                        className="px-2.5 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                      >
                        إضافة
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      value={voucherFormData.category_id}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, category_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">-- اختر بند الصرف --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {!c.is_active ? '(معطل)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المطلوب صرفه ({settings.currency_symbol}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      value={voucherFormData.amount}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 pl-12 bg-white border border-slate-200 rounded-xl text-sm font-mono font-black text-rose-600 focus:ring-2 focus:ring-rose-500/20"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      {settings.currency_symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Treasury (خزينة الصرف) & Quick Selection */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    خزينة الصرف (مصدر الدفع) <span className="text-rose-500">*</span>
                  </label>
                  {mainTreasury && (
                    <button
                      type="button"
                      onClick={() => setVoucherFormData({ ...voucherFormData, treasury_id: mainTreasury.id })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        voucherFormData.treasury_id === mainTreasury.id
                          ? 'bg-amber-500 text-white shadow-2xs ring-2 ring-amber-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      <span>★ الصرف من الخزينة الرئيسية</span>
                      <span className="font-mono text-[10px] opacity-90">({mainTreasury.balance.toLocaleString('ar-EG')})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <select
                      required
                      value={voucherFormData.treasury_id}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, treasury_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">-- اختر الخزينة --</option>
                      {mainTreasury && (
                        <option value={mainTreasury.id} className="font-bold text-amber-900 bg-amber-50">
                          ★ {mainTreasury.name} (الخزينة النقدية الرئيسية) - الرصيد: {mainTreasury.balance.toLocaleString('ar-EG')} {settings.currency_symbol}
                        </option>
                      )}
                      {treasuries
                        .filter((t) => t.id !== mainTreasury?.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (رصيدها: {t.balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={voucherFormData.payment_method_id}
                      onChange={(e) => setVoucherFormData({ ...voucherFormData, payment_method_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="">طريقة الدفع (اختياري)</option>
                      {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Financial Impact Confirmation Badge */}
                {voucherFormData.treasury_id && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-900 text-[11px] font-bold">
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      سيتم خصم مبلغ{' '}
                      <strong className="font-mono text-rose-700">
                        {Number(voucherFormData.amount || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                      </strong>{' '}
                      فورياً من {getTreasuryInfo(voucherFormData.treasury_id).name} (الرصيد المتاح:{' '}
                      <strong className="font-mono">{getTreasuryInfo(voucherFormData.treasury_id).balance.toLocaleString('ar-EG')} {settings.currency_symbol}</strong>)
                    </span>
                  </div>
                )}
              </div>

              {/* Row 4: Reason and Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البيان والوصف المفصل للمصروف <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="اكتب تفاصيل الصرف كاملة (مثال: سداد إيجار مقر شهر نوفمبر، شراء أدوات نظافة وكمية صابون...)"
                  value={voucherFormData.reason}
                  onChange={(e) => setVoucherFormData({ ...voucherFormData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Row 5: Recipient & External Invoice Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الشخص / الجهة المستلمة للمبلغ:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شركة الكهرباء، محطة وقود، الموظف أحمد..."
                    value={voucherFormData.recipient}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, recipient: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الفاتورة أو الإيصال الخارجي:
                  </label>
                  <input
                    type="text"
                    placeholder="رقم سند القبض أو الفاتورة إن وُجد"
                    value={voucherFormData.invoice_ref}
                    onChange={(e) => setVoucherFormData({ ...voucherFormData, invoice_ref: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Attachment Photo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إرفاق صورة الفاتورة / إيصال الصرف (اختياري):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-200"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>{voucherFormData.attachment_url ? 'تغيير الصورة المرفقة' : 'رفع صورة الإيصال'}</span>
                  </button>

                  {voucherFormData.attachment_url && (
                    <div className="flex items-center gap-2">
                      <img
                        src={voucherFormData.attachment_url}
                        alt="المرفق"
                        className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setVoucherFormData((prev) => ({ ...prev, attachment_url: '' }))}
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        حذف الصورة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  disabled={isSubmittingVoucher}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoucher}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-rose-600/20 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVoucher ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingExpense ? 'حفظ التعديل وإعادة ضبط الأثر المالي' : 'اعتماد وصرف السند الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================================
          2. Expense Categories Modal (إدارة بنود ومجالات الصرف)
         ============================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">إدارة بنود ومجالات الصرف</h3>
                  <p className="text-xs text-slate-500">إضافة وتعديل بنود النفقات التشغيلية لتنظيم حركة الصرف والتقارير</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form for Add / Edit Category */}
            <form onSubmit={handleSubmitCategory} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 text-xs block">
                {editingCategory ? `تعديل بند الصرف (${editingCategory.name})` : 'إضافة بند صرف تشغيلي جديد:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    اسم بند الصرف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: وقود وبنزين، إيجار مقرات..."
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    الوصف أو التوضيح (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="ملاحظات حول هذا البند ومجالاته..."
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>البند نشط ومتاح في قائمة إصدار السندات</span>
                </label>

                <div className="flex items-center gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryFormData({ name: '', description: '', is_active: true });
                      }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-bold"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingCategory}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingCategory ? 'حفظ التعديل' : 'إضافة البند'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Categories List */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">اسم بند الصرف</th>
                    <th className="py-2.5 px-3">الوصف</th>
                    <th className="py-2.5 px-3 text-center">إجمالي المصروف عليه</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                    <th className="py-2.5 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat, idx) => {
                    const totalSpent = expenses
                      .filter((e) => e.category_id === cat.id)
                      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{cat.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{cat.description || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                          {totalSpent > 0 ? `${totalSpent.toLocaleString('ar-EG')} ${settings.currency_symbol}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              cat.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {cat.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryFormData({
                                  name: cat.name,
                                  description: cat.description || '',
                                  is_active: cat.is_active
                                });
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                              title="تعديل اسم البند"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategoryItem(cat)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="حذف البند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          3. View / Print Voucher Modal (بطاقة السند الرسمية القابلة للطباعة)
         ============================================================================== */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[92vh] flex flex-col">
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-slate-900 text-base">بطاقة سند صرف نقدي رسمي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة السند</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVoucher(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Paper */}
            <div className="border-2 border-slate-800 rounded-2xl p-6 bg-white space-y-5 text-right font-sans">
              {/* Institution Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  {settings.logo_url && (
                    <img
                      src={settings.logo_url}
                      alt={settings.company_name}
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  )}
                  <div>
                    <h2 className="text-base font-black text-slate-900">{settings.company_name || 'وي كير'}</h2>
                    <p className="text-[11px] text-slate-600 font-bold">{settings.store_name || 'إدارة خدمات الغسيل المتنقل والعقاري'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">سجل تجاري / ملف ضريبي رسمي</p>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-lg inline-block mb-1">
                    سند صرف نفقات تشغيل
                  </div>
                  <div className="text-xs font-black text-slate-800">
                    رقم: <span className="text-rose-600 font-mono">{viewingVoucher.voucher_number || `EXP-${viewingVoucher.id.slice(0, 6)}`}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    التاريخ: {viewingVoucher.date}
                  </div>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">المبلغ المصروف:</span>
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    {viewingVoucher.amount.toLocaleString('ar-EG')} <span className="text-sm font-bold text-slate-800">{settings.currency_symbol}</span>
                  </span>
                </div>
                <div className="text-left text-xs font-bold text-slate-600">
                  <span className="block text-[10px] text-slate-400">بند الصرف:</span>
                  <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg inline-block font-black text-slate-900 mt-1">
                    {viewingVoucher.category_name}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2 text-xs border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-500 min-w-[120px]">يُصرف إلى السيد/الجهة:</span>
                  <span className="font-black text-slate-900 font-sans">{viewingVoucher.recipient || 'غير محدد'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-500 min-w-[120px]">وذلك مقابل (البيان):</span>
                  <span className="font-bold text-slate-800 leading-relaxed">{viewingVoucher.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 min-w-[120px]">خزينة الصرف:</span>
                  <span className="font-bold text-teal-800">
                    {getTreasuryInfo(viewingVoucher.treasury_id).name} ({viewingVoucher.payment_method_name || 'كاش'})
                  </span>
                </div>
                {viewingVoucher.invoice_ref && (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 min-w-[120px]">رقم الفاتورة المرفقة:</span>
                    <span className="font-mono font-bold text-slate-800">#{viewingVoucher.invoice_ref}</span>
                  </div>
                )}
              </div>

              {/* Attachment Preview if any */}
              {viewingVoucher.attachment_url && (
                <div className="border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">صورة الفاتورة / المستند المرفق:</span>
                  <img
                    src={viewingVoucher.attachment_url}
                    alt="المرفق"
                    className="max-h-40 mx-auto object-contain rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-slate-800 text-center text-xs">
                <div>
                  <span className="font-bold text-slate-600 block mb-8">المسؤول / المحاسب</span>
                  <span className="font-mono text-slate-400 text-[11px]">{viewingVoucher.created_by || 'المسؤول المالي'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block mb-8">المدير المالي / الاعتماد</span>
                  <span className="font-mono text-slate-300 text-[11px]">.......................</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600 block mb-8">توقيع المستلم</span>
                  <span className="font-mono text-slate-300 text-[11px]">.......................</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          4. Delete Confirmation Modal (مع توضيح إعادة الأثر المالي)
         ============================================================================== */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">تأكيد حذف سند الصرف وإعادة أثره المالي</h3>
              <p className="text-xs text-slate-500 font-medium">
                هل أنت متأكد من حذف سند الصرف رقم{' '}
                <strong className="font-mono text-slate-800">({deleteConfirmExpense.voucher_number})</strong>؟
              </p>
            </div>

            {/* Reversal Explanation Card */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5 font-bold">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>إعادة الأثر المالي تلقائياً:</span>
              </div>
              <p className="text-[11px] font-normal leading-relaxed text-amber-800">
                سيتم فورياً استرجاع مبلغ{' '}
                <strong className="font-mono font-black text-amber-950">
                  {deleteConfirmExpense.amount.toLocaleString('ar-EG')} {settings.currency_symbol}
                </strong>{' '}
                وإيداعه من جديد في رصيد{' '}
                <strong className="font-black text-amber-950">
                  {getTreasuryInfo(deleteConfirmExpense.treasury_id).name}
                </strong>
                ، وتسجيل حركة تسوية استردادية في سجل الخزينة.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteExpense}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 active:scale-98 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف واسترجاع المبلغ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
