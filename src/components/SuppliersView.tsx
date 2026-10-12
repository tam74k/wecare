import React, { useState, useMemo } from 'react';
import {
  Supplier,
  SupplierTransaction,
  SupplierTransactionType,
  Treasury,
  PaymentMethod,
  Settings
} from '../types/database';
import {
  Truck,
  Plus,
  Search,
  Filter,
  FileText,
  CreditCard,
  Receipt,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Calendar,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Clock,
  Eye,
  Check,
  X,
  Wallet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  transactions: SupplierTransaction[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  settings: Settings;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'current_balance' | 'created_at'>) => Promise<Supplier>;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  onDeleteSupplier: (id: string) => Promise<boolean>;
  onCreateTransaction: (tx: Omit<SupplierTransaction, 'id' | 'created_at'>) => Promise<SupplierTransaction>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  transactions,
  treasuries,
  paymentMethods,
  settings,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onCreateTransaction,
  onDeleteTransaction
}) => {
  // Navigation tabs within Suppliers
  const [activeTab, setActiveTab] = useState<'list' | 'statement' | 'transactions'>('list');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'with_balance'>('all');

  // Statement selected supplier and date filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetSupplierId, setPaymentTargetSupplierId] = useState<string>('');

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTargetSupplierId, setPurchaseTargetSupplierId] = useState<string>('');

  // Form states
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    opening_balance: 0,
    is_active: true,
    notes: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    treasury_id: treasuries[0]?.id || '',
    payment_method_id: paymentMethods[0]?.id || '',
    invoice_number: '',
    notes: ''
  });

  const [purchaseFormData, setPurchaseFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    notes: ''
  });

  // Calculate Overall Statistics
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.is_active).length;
    const totalBalanceDue = suppliers.reduce((acc, s) => acc + (s.current_balance || 0), 0);
    const totalPaid = transactions
      .filter((t) => t.type === 'payment')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalPurchases = transactions
      .filter((t) => t.type === 'purchase')
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    return {
      totalSuppliers,
      activeSuppliers,
      totalBalanceDue,
      totalPaid,
      totalPurchases
    };
  }, [suppliers, transactions]);

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.tax_number && s.tax_number.includes(searchQuery));

      if (!matchSearch) return false;

      if (statusFilter === 'active') return s.is_active;
      if (statusFilter === 'inactive') return !s.is_active;
      if (statusFilter === 'with_balance') return s.current_balance > 0;

      return true;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Selected supplier object for statement
  const currentStatementSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0] || null;
  }, [suppliers, selectedSupplierId]);

  // Statement transactions with running balance
  const statementData = useMemo(() => {
    if (!currentStatementSupplier) return { list: [], totalDebit: 0, totalCredit: 0, finalBalance: 0 };

    // Get all transactions for this supplier
    let supplierTxs = transactions.filter((t) => t.supplier_id === currentStatementSupplier.id);

    // Sort by date ASC, then created_at ASC
    supplierTxs.sort((a, b) => {
      const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    let runningBalance = 0;
    let totalDebit = 0; // مدين (دفعات مسددة + مرتجعات)
    let totalCredit = 0; // دائن (مشتريات + رصيد افتتاحي)

    const listWithBalance = supplierTxs.map((tx) => {
      let debit = 0;
      let credit = 0;

      if (tx.type === 'purchase') {
        credit = tx.amount;
        runningBalance += tx.amount;
        totalCredit += tx.amount;
      } else if (tx.type === 'payment' || tx.type === 'return') {
        debit = tx.amount;
        runningBalance -= tx.amount;
        totalDebit += tx.amount;
      } else if (tx.type === 'opening_balance') {
        credit = tx.amount;
        runningBalance += tx.amount;
        totalCredit += tx.amount;
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance
      };
    });

    // Apply date range filter if specified
    const filteredList = listWithBalance.filter((row) => {
      if (statementStartDate && row.date < statementStartDate) return false;
      if (statementEndDate && row.date > statementEndDate) return false;
      return true;
    });

    return {
      list: filteredList,
      totalDebit,
      totalCredit,
      finalBalance: runningBalance
    };
  }, [currentStatementSupplier, transactions, statementStartDate, statementEndDate]);

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      tax_number: supplier.tax_number || '',
      opening_balance: supplier.opening_balance || 0,
      is_active: supplier.is_active,
      notes: supplier.notes || ''
    });
    setIsSupplierModalOpen(true);
  };

  // Open Create Supplier Modal
  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      tax_number: '',
      opening_balance: 0,
      is_active: true,
      notes: ''
    });
    setIsSupplierModalOpen(true);
  };

  // Submit Supplier Modal
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name || !supplierFormData.phone) {
      alert('يرجى ملء اسم المورد ورقم الهاتف على الأقل');
      return;
    }

    try {
      if (editingSupplier) {
        await onUpdateSupplier(editingSupplier.id, supplierFormData);
      } else {
        await onCreateSupplier(supplierFormData);
      }
      setIsSupplierModalOpen(false);
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ بيانات المورد: ' + (err?.message || err));
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (supplierId?: string) => {
    const targetId = supplierId || selectedSupplierId || (suppliers[0]?.id ?? '');
    setPaymentTargetSupplierId(targetId);
    setPaymentFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      treasury_id: treasuries[0]?.id || '',
      payment_method_id: paymentMethods[0]?.id || '',
      invoice_number: '',
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentFormData.amount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }
    if (!paymentTargetSupplierId) {
      alert('يرجى اختيار المورد المستحق للدفعة');
      return;
    }

    try {
      await onCreateTransaction({
        supplier_id: paymentTargetSupplierId,
        type: 'payment',
        amount,
        date: paymentFormData.date,
        treasury_id: paymentFormData.treasury_id || null,
        payment_method_id: paymentFormData.payment_method_id || null,
        invoice_number: paymentFormData.invoice_number,
        notes: paymentFormData.notes,
        created_by: 'الإدارة'
      });
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      alert('فشل تسجيل الدفعة: ' + (err?.message || err));
    }
  };

  // Open Purchase Modal
  const handleOpenPurchaseModal = (supplierId?: string) => {
    const targetId = supplierId || selectedSupplierId || (suppliers[0]?.id ?? '');
    setPurchaseTargetSupplierId(targetId);
    setPurchaseFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      notes: ''
    });
    setIsPurchaseModalOpen(true);
  };

  // Submit Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(purchaseFormData.amount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح للفاتورة');
      return;
    }
    if (!purchaseTargetSupplierId) {
      alert('يرجى تحديد المورد');
      return;
    }

    try {
      await onCreateTransaction({
        supplier_id: purchaseTargetSupplierId,
        type: 'purchase',
        amount,
        date: purchaseFormData.date,
        invoice_number: purchaseFormData.invoice_number,
        notes: purchaseFormData.notes,
        created_by: 'الإدارة'
      });
      setIsPurchaseModalOpen(false);
    } catch (err: any) {
      alert('فشل تسجيل الفاتورة: ' + (err?.message || err));
    }
  };

  // Navigate directly to Statement for a specific supplier
  const handleViewStatement = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setActiveTab('statement');
  };

  // Print Account Statement
  const handlePrintStatement = () => {
    window.print();
  };

  const paymentSupplierObj = suppliers.find((s) => s.id === paymentTargetSupplierId);
  const purchaseSupplierObj = suppliers.find((s) => s.id === purchaseTargetSupplierId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-cairo">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-sky-600 rounded-xl text-white shadow-md shadow-teal-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <span>إدارة الموردين ودفعات التوريد</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة شاملة لبيانات الموردين، فواتير التوريد، سداد الدفعات النقدية مع استخراج كشف حساب تفصيلي رسمي لكل مورد
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenPaymentModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-emerald-600/20"
          >
            <CreditCard className="w-4 h-4" />
            <span>تسجيل دفعة سداد</span>
          </button>

          <button
            onClick={() => handleOpenPurchaseModal()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-sky-600/20"
          >
            <Receipt className="w-4 h-4" />
            <span>تسجيل فاتورة توريد</span>
          </button>

          <button
            onClick={handleOpenCreateSupplier}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي الموردين</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalSuppliers}</h3>
            <p className="text-[11px] text-teal-600 font-bold mt-1">
              {stats.activeSuppliers} موردين نشطين
            </p>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">الأرصدة المستحقة للموردين</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {stats.totalBalanceDue.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-500">{settings.currency_symbol}</span>
            </h3>
            <p className="text-[11px] text-rose-500 font-bold mt-1">إجمالي الديون القائمة</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي المدفوعات المسددة</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.totalPaid.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-500">{settings.currency_symbol}</span>
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">دفعات نقدية وبنكية</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي المشتريات والتوريدات</p>
            <h3 className="text-2xl font-black text-sky-700 mt-1">
              {stats.totalPurchases.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-500">{settings.currency_symbol}</span>
            </h3>
            <p className="text-[11px] text-sky-600 font-bold mt-1">قيمة فواتير التوريد</p>
          </div>
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Sub Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex items-center gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'list'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>قائمة الموردين ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'statement'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>كشف حساب المورد التفصيلي</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل حركات ودفعات التوريد ({transactions.length})</span>
        </button>
      </div>

      {/* ============================================================================== */}
      {/* TAB 1: SUPPLIERS LIST VIEW */}
      {/* ============================================================================== */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="بحث باسم المورد، الهاتف، المسؤول، الرقم الضريبي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-400 font-bold ml-1">تصفية:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('with_balance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'with_balance'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                مستحق له مبالغ
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                نشط فقط
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'inactive'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                غير نشط
              </button>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-slate-500 uppercase">
                  <th className="py-3 px-4">اسم المورد / الشركة</th>
                  <th className="py-3 px-4">جهة الاتصال والهاتف</th>
                  <th className="py-3 px-4">العنوان / الرقم الضريبي</th>
                  <th className="py-3 px-4">الرصيد الافتتاحي</th>
                  <th className="py-3 px-4">الرصيد الحالي المستحق</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Truck className="w-12 h-12 mx-auto stroke-[1.2] mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-500">لا يوجد موردين مطابقين للبحث</p>
                      <p className="text-xs text-slate-400 mt-1">يمكنك إضافة مورد جديد عبر الزر أعلاه</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-800 text-sm">{sup.name}</div>
                        {sup.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{sup.notes}</div>}
                      </td>

                      {/* Contact & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{sup.phone}</span>
                        </div>
                        {sup.contact_person && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            المسؤول: {sup.contact_person}
                          </div>
                        )}
                      </td>

                      {/* Address & Tax Number */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {sup.address && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{sup.address}</span>
                          </div>
                        )}
                        {sup.tax_number && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            الرقم الضريبي: {sup.tax_number}
                          </div>
                        )}
                      </td>

                      {/* Opening Balance */}
                      <td className="py-3.5 px-4 font-bold text-slate-500">
                        {(sup.opening_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>

                      {/* Current Balance */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                            sup.current_balance > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : sup.current_balance < 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {(sup.current_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={async () => {
                            await onUpdateSupplier(sup.id, { is_active: !sup.is_active });
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 transition ${
                            sup.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {sup.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>نشط</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>غير نشط</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Record Payment */}
                          <button
                            onClick={() => handleOpenPaymentModal(sup.id)}
                            title="تسجيل دفعة سداد"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>

                          {/* Record Purchase */}
                          <button
                            onClick={() => handleOpenPurchaseModal(sup.id)}
                            title="تسجيل فاتورة توريد"
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Account Statement */}
                          <button
                            onClick={() => handleViewStatement(sup.id)}
                            title="كشف حساب المورد"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditSupplier(sup)}
                            title="تعديل المورد"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من حذف المورد "${sup.name}" وجميع حركاته المالية؟`)) {
                                await onDeleteSupplier(sup.id);
                              }
                            }}
                            title="حذف المورد"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 2: SUPPLIER ACCOUNT STATEMENT (كشف حساب المورد) */}
      {/* ============================================================================== */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Selector & Date Filters Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">اختيار المورد:</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 w-full md:w-64"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (المستحق: {s.current_balance} {settings.currency_symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>من:</span>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>إلى:</span>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {(statementStartDate || statementEndDate) && (
                <button
                  onClick={() => {
                    setStatementStartDate('');
                    setStatementEndDate('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition"
                >
                  إلغاء التصفية
                </button>
              )}

              <button
                onClick={handlePrintStatement}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب</span>
              </button>
            </div>
          </div>

          {/* Statement Document Container (Styled for both Screen and Clean A4 Print) */}
          {currentStatementSupplier ? (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-6">
              {/* Header / Brand info for Statement */}
              <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    {settings.logo_url && (
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="w-12 h-12 object-contain rounded-xl border border-slate-200 p-1"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-black text-slate-800">
                        {settings.company_name || 'وي كير لخدمات إدارة النظافة'}
                      </h2>
                      <p className="text-xs text-slate-500 font-bold">
                        كشف حساب مورد معتمد (Supplier Statement of Account)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left text-xs text-slate-500 space-y-1">
                  <div>
                    تاريخ استخراج الكشف: <span className="font-bold text-slate-800">{new Date().toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div>
                    العملة المعتمدة: <span className="font-bold text-slate-800">{settings.currency_symbol || 'ج.م'}</span>
                  </div>
                </div>
              </div>

              {/* Supplier Info & Statement Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div className="space-y-1.5 text-xs">
                  <div className="text-sm font-black text-slate-800">{currentStatementSupplier.name}</div>
                  {currentStatementSupplier.contact_person && (
                    <div className="text-slate-600">المسؤول: {currentStatementSupplier.contact_person}</div>
                  )}
                  <div className="text-slate-600">الهاتف: <span dir="ltr">{currentStatementSupplier.phone}</span></div>
                  {currentStatementSupplier.tax_number && (
                    <div className="text-slate-600">الرقم الضريبي / السجل: {currentStatementSupplier.tax_number}</div>
                  )}
                  {currentStatementSupplier.address && (
                    <div className="text-slate-600">العنوان: {currentStatementSupplier.address}</div>
                  )}
                </div>

                <div className="flex flex-col justify-center items-end space-y-2 border-t md:border-t-0 md:border-r md:pr-6 border-slate-200 text-xs">
                  <div className="flex justify-between w-full max-w-xs">
                    <span className="text-slate-500">الرصيد الافتتاحي:</span>
                    <span className="font-bold text-slate-700">
                      {(currentStatementSupplier.opening_balance || 0).toLocaleString('ar-EG')} {settings.currency_symbol}
                    </span>
                  </div>

                  <div className="flex justify-between w-full max-w-xs">
                    <span className="text-slate-500">إجمالي المشتريات / التوريدات:</span>
                    <span className="font-bold text-sky-700">
                      {statementData.totalCredit.toLocaleString('ar-EG')} {settings.currency_symbol}
                    </span>
                  </div>

                  <div className="flex justify-between w-full max-w-xs">
                    <span className="text-slate-500">إجمالي المدفوعات المسددة:</span>
                    <span className="font-bold text-emerald-700">
                      {statementData.totalDebit.toLocaleString('ar-EG')} {settings.currency_symbol}
                    </span>
                  </div>

                  <div className="flex justify-between w-full max-w-xs pt-2 border-t border-slate-300">
                    <span className="font-black text-slate-800 text-sm">صافي الرصيد المستحق الحالي:</span>
                    <span className="font-black text-rose-600 text-base">
                      {statementData.finalBalance.toLocaleString('ar-EG')} {settings.currency_symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-black text-slate-700 uppercase border-b border-slate-200">
                      <th className="py-2.5 px-3 border-l border-slate-200">التاريخ</th>
                      <th className="py-2.5 px-3 border-l border-slate-200">نوع الحركة</th>
                      <th className="py-2.5 px-3 border-l border-slate-200">رقم السند / الفاتورة</th>
                      <th className="py-2.5 px-3 border-l border-slate-200">البيان والتفاصيل</th>
                      <th className="py-2.5 px-3 border-l border-slate-200 text-center bg-emerald-50 text-emerald-800">
                        مدين (دفعات مسددة)
                      </th>
                      <th className="py-2.5 px-3 border-l border-slate-200 text-center bg-sky-50 text-sky-800">
                        دائن (مشتريات/توريد)
                      </th>
                      <th className="py-2.5 px-3 text-center bg-slate-200/60 font-black">
                        الرصيد التراكمي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {statementData.list.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          لا توجد أي حركات مسجلة لهذا المورد في الفترة المحددة
                        </td>
                      </tr>
                    ) : (
                      statementData.list.map((row) => {
                        const treasuryObj = treasuries.find((t) => t.id === row.treasury_id);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 border-l border-slate-200 font-bold whitespace-nowrap">
                              {row.date}
                            </td>

                            <td className="py-2.5 px-3 border-l border-slate-200 whitespace-nowrap">
                              {row.type === 'purchase' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                                  فاتورة توريد
                                </span>
                              )}
                              {row.type === 'payment' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  سداد دفعة
                                </span>
                              )}
                              {row.type === 'return' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  مرتجع توريد
                                </span>
                              )}
                              {row.type === 'opening_balance' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  رصيد افتتاحي
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 border-l border-slate-200 font-mono text-[11px] text-slate-600">
                              {row.invoice_number || '-'}
                            </td>

                            <td className="py-2.5 px-3 border-l border-slate-200 text-slate-600">
                              <div>{row.notes || (row.type === 'payment' ? 'دفعة نقدية مسددة' : 'فاتورة بضاعة وتوريد')}</div>
                              {treasuryObj && (
                                <div className="text-[10px] text-emerald-600 font-bold">
                                  تم الصرف من: {treasuryObj.name}
                                </div>
                              )}
                            </td>

                            {/* Debit (Payment) */}
                            <td className="py-2.5 px-3 border-l border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/30">
                              {row.debit > 0 ? row.debit.toLocaleString('ar-EG') : '-'}
                            </td>

                            {/* Credit (Purchase) */}
                            <td className="py-2.5 px-3 border-l border-slate-200 text-center font-bold text-sky-700 bg-sky-50/30">
                              {row.credit > 0 ? row.credit.toLocaleString('ar-EG') : '-'}
                            </td>

                            {/* Running Balance */}
                            <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50">
                              {row.runningBalance.toLocaleString('ar-EG')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 text-xs font-black text-slate-800 border-t-2 border-slate-300">
                      <td colSpan={4} className="py-3 px-3 text-left pl-6">
                        الإجماليات:
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-700 bg-emerald-100/40">
                        {statementData.totalDebit.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-3 text-center text-sky-700 bg-sky-100/40">
                        {statementData.totalCredit.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-3 text-center text-rose-700 bg-slate-200">
                        {statementData.finalBalance.toLocaleString('ar-EG')} {settings.currency_symbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures Footer (Visible in print) */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
                <div className="space-y-8">
                  <div>توقيع وختم الإدارة المالية:</div>
                  <div className="border-b border-dashed border-slate-300 w-48 mx-auto"></div>
                </div>
                <div className="space-y-8">
                  <div>توقيع واعتماد المورد:</div>
                  <div className="border-b border-dashed border-slate-300 w-48 mx-auto"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              يرجى إضافة مورد أولاً لعرض كشف الحساب
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 3: ALL TRANSACTIONS LEDGER VIEW */}
      {/* ============================================================================== */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">
              سجل كافة المعاملات المالية وفواتير ودفعات الموردين ({transactions.length})
            </h3>
            <p className="text-xs text-slate-400">مرتبة ترتيباً زمنياً من الأحدث إلى الأقدم</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black text-slate-500 uppercase">
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المورد</th>
                  <th className="py-3 px-4">نوع الحركة</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4">رقم الفاتورة / السند</th>
                  <th className="py-3 px-4">الخزينة المسحوب منها</th>
                  <th className="py-3 px-4">البيان والملاحظات</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      لا توجد أي معاملات مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const sup = suppliers.find((s) => s.id === tx.supplier_id);
                    const treasury = treasuries.find((t) => t.id === tx.treasury_id);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold">{tx.date}</td>
                        <td className="py-3 px-4 font-black text-slate-800">
                          {sup ? sup.name : 'مورد غير محدد'}
                        </td>
                        <td className="py-3 px-4">
                          {tx.type === 'purchase' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              فاتورة توريد
                            </span>
                          )}
                          {tx.type === 'payment' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              سداد دفعة
                            </span>
                          )}
                          {tx.type === 'return' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              مرتجع
                            </span>
                          )}
                          {tx.type === 'opening_balance' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              رصيد افتتاحي
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-black text-sm">
                          {tx.amount.toLocaleString('ar-EG')} {settings.currency_symbol}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{tx.invoice_number || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {treasury ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Wallet className="w-3.5 h-3.5" />
                              <span>{treasury.name}</span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{tx.notes || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={async () => {
                              if (confirm('هل أنت متأكد من حذف هذه المعاملة وتعديل رصيد المورد تلقائياً؟')) {
                                await onDeleteTransaction(tx.id);
                              }
                            }}
                            title="حذف المعاملة"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {/* ============================================================================== */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                <span>{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</span>
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المورد / الشركة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    placeholder="مثال: شركة النصر للكيماويات"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    جهة الاتصال / المسؤول
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    placeholder="مثال: أ. أحمد ممدوح"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف / الجوال <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    placeholder="supplier@company.com"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / المقر</label>
                  <input
                    type="text"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    placeholder="المنطقة الصناعية / المدينة"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرقم الضريبي / السجل التجاري
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.tax_number}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, tax_number: e.target.value })}
                    placeholder="مثال: 123-456-789"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {!editingSupplier && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرصيد الافتتاحي المستحق للمورد ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={supplierFormData.opening_balance}
                    onChange={(e) =>
                      setSupplierFormData({ ...supplierFormData, opening_balance: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00 (المبلغ المستحق للمورد في بداية التعامل)"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    إذا كان للمورد مستحقات سابقة، اكتب المبلغ هنا وسيسجل تلقائياً في كشف الحساب كـ "رصيد افتتاحي".
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  placeholder="أي تفاصيل خاصة بشروط الدفع أو التوريد..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="supActiveCheck"
                  checked={supplierFormData.is_active}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="supActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  حساب المورد نشط
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: RECORD PAYMENT (سداد دفعة للمورد) */}
      {/* ============================================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="text-base font-black text-emerald-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>تسجيل دفعة سداد لمورد</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المورد المستحق <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={paymentTargetSupplierId}
                  onChange={(e) => setPaymentTargetSupplierId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (المستحق: {s.current_balance} {settings.currency_symbol})
                    </option>
                  ))}
                </select>
                {paymentSupplierObj && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    الرصيد المستحق الحالي للمورد:{' '}
                    <span className="font-bold text-rose-600">
                      {paymentSupplierObj.current_balance} {settings.currency_symbol}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مبلغ السداد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السداد</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                    className="w-full py-2 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الخزينة المسحوب منها المبلغ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={paymentFormData.treasury_id}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, treasury_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (الرصيد المتوفر: {t.balance.toLocaleString('ar-EG')} {settings.currency_symbol})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                  سيتم خصم المبلغ تلقائياً من رصيد الخزينة وإنشاء حركة صرف مالية.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                <select
                  value={paymentFormData.payment_method_id}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method_id: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم سند الصرف / الشيك</label>
                <input
                  type="text"
                  value={paymentFormData.invoice_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, invoice_number: e.target.value })}
                  placeholder="مثال: سند رقم #402"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بيان السداد / ملاحظات</label>
                <textarea
                  rows={2}
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  placeholder="سداد دفعة تحت الحساب / سداد فاتورة توريد رقم..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  تأكيد وسداد الدفعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: RECORD PURCHASE / INVOICE (تسجيل فاتورة توريد / مشتريات) */}
      {/* ============================================================================== */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50">
              <h3 className="text-base font-black text-sky-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600" />
                <span>تسجيل فاتورة توريد / مشتريات</span>
              </h3>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المورد <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={purchaseTargetSupplierId}
                  onChange={(e) => setPurchaseTargetSupplierId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قيمة الفاتورة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={purchaseFormData.amount}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-sky-700 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    required
                    value={purchaseFormData.date}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, date: e.target.value })}
                    className="w-full py-2 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم فاتورة المورد</label>
                <input
                  type="text"
                  value={purchaseFormData.invoice_number}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, invoice_number: e.target.value })}
                  placeholder="مثال: INV-9854"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بيان البضاعة الموردة والملاحظات</label>
                <textarea
                  rows={2}
                  value={purchaseFormData.notes}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, notes: e.target.value })}
                  placeholder="توريد شامبو سيارات، مناشف مايكروفايبر، ملمعات..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                ></textarea>
                <p className="text-[10px] text-sky-600 mt-1 font-bold">
                  سيتم إضافة قيمة الفاتورة لحساب المورد وزيادة مديونيته المستحقة فوراً.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  تسجيل الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
