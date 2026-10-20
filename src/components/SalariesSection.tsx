import React, { useState, useMemo, useEffect } from 'react';
import {
  SalaryPayment,
  Employee,
  Treasury,
  PaymentMethod,
  Settings,
  Attendance
} from '../types/database';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileText,
  Building,
  Phone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  X,
  CreditCard,
  Layers,
  CalendarCheck
} from 'lucide-react';

interface SalariesSectionProps {
  salaryPayments: SalaryPayment[];
  employees: Employee[];
  attendance?: Attendance[];
  treasuries: Treasury[];
  paymentMethods: PaymentMethod[];
  settings?: Settings;
  initialEmployeeId?: string;
  initialMonthYear?: string;
  onCreateSalaryPayment: (payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>) => Promise<SalaryPayment>;
  onUpdateSalaryPayment: (id: string, updates: Partial<SalaryPayment>) => Promise<SalaryPayment>;
  onDeleteSalaryPayment: (id: string) => Promise<boolean>;
  onRefreshData?: () => Promise<void>;
}

export const SalariesSection: React.FC<SalariesSectionProps> = ({
  salaryPayments = [],
  employees = [],
  attendance = [],
  treasuries = [],
  paymentMethods = [],
  settings,
  initialEmployeeId,
  initialMonthYear,
  onCreateSalaryPayment,
  onUpdateSalaryPayment,
  onDeleteSalaryPayment,
  onRefreshData
}) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthYear || currentMonthStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<SalaryPayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SalaryPayment | null>(null);
  const [isPrintingPayrollSheet, setIsPrintingPayrollSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const mainTreasury = useMemo(() => {
    return treasuries.find(t => t.name.includes('الرئيسية') || (t as any).is_default) || treasuries[0];
  }, [treasuries]);

  const [formData, setFormData] = useState({
    employee_id: '',
    month_year: currentMonthStr,
    payment_date: new Date().toISOString().split('T')[0],
    basic_salary: 0,
    bonuses: 0,
    bonus_reason: '',
    deductions: 0,
    deduction_reason: '',
    treasury_id: '',
    payment_method_id: '',
    notes: ''
  });

  const currencySymbol = settings?.currency_symbol || 'ج.م';

  // Helper: calculate employee attendance stats for a specific month
  const getEmployeeAttendanceStats = (empId: string, monthYear: string) => {
    const emp = employees.find(e => e.id === empId);
    const basic = Number(emp?.salary) || 0;
    const dailyRate = basic > 0 ? Math.round((basic / 30) * 100) / 100 : 0;

    const monthRecords = attendance.filter(
      (a) => a.employee_id === empId && a.date.startsWith(monthYear)
    );

    const presentDays = monthRecords.filter((a) => a.status === 'present').length;
    const lateDays = monthRecords.filter((a) => a.status === 'late').length;
    const paidLeaveDays = monthRecords.filter((a) => a.is_paid_leave || a.status === 'paid_leave').length;
    const absentDays = monthRecords.filter(
      (a) => !a.is_paid_leave && (a.status === 'absent' || a.status === 'leave')
    ).length;

    const totalAbsenceDeduction = monthRecords.reduce((sum, a) => {
      if (!a.is_paid_leave && (a.status === 'absent' || a.status === 'leave')) {
        return sum + (Number(a.deduction_amount) || dailyRate);
      }
      return sum;
    }, 0);

    return {
      basic,
      dailyRate,
      presentDays,
      lateDays,
      paidLeaveDays,
      absentDays,
      totalAbsenceDeduction: Math.round(totalAbsenceDeduction * 100) / 100
    };
  };

  // Compute live attendance stats for current form state
  const currentFormAttendanceStats = useMemo(() => {
    if (!formData.employee_id || !formData.month_year) return null;
    return getEmployeeAttendanceStats(formData.employee_id, formData.month_year);
  }, [formData.employee_id, formData.month_year, employees, attendance]);

  // Open modal for Create
  const handleOpenCreate = (prefillEmployeeId?: string, prefillMonth?: string) => {
    setEditingPayment(null);
    const targetEmpId = prefillEmployeeId || (employees.length > 0 ? employees[0].id : '');
    const emp = employees.find(e => e.id === targetEmpId);
    const initialBasic = emp?.salary ? Number(emp.salary) : 0;
    const targetMonth = prefillMonth || (selectedMonth !== 'all' ? selectedMonth : currentMonthStr);

    const attStats = targetEmpId ? getEmployeeAttendanceStats(targetEmpId, targetMonth) : null;
    const initialDeduction = attStats ? attStats.totalAbsenceDeduction : 0;
    const initialDeductionReason =
      attStats && attStats.absentDays > 0 ? `خصم غياب ${attStats.absentDays} يوم لشهر ${targetMonth}` : '';

    setFormData({
      employee_id: targetEmpId,
      month_year: targetMonth,
      payment_date: new Date().toISOString().split('T')[0],
      basic_salary: initialBasic,
      bonuses: 0,
      bonus_reason: '',
      deductions: initialDeduction,
      deduction_reason: initialDeductionReason,
      treasury_id: mainTreasury?.id || (treasuries[0]?.id || ''),
      payment_method_id: paymentMethods[0]?.id || '',
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  // If initialEmployeeId was passed, auto-trigger open
  useEffect(() => {
    if (initialEmployeeId) {
      handleOpenCreate(initialEmployeeId, initialMonthYear);
    }
  }, [initialEmployeeId, initialMonthYear]);

  // Open modal for Edit
  const handleOpenEdit = (payment: SalaryPayment) => {
    setEditingPayment(payment);
    setFormData({
      employee_id: payment.employee_id,
      month_year: payment.month_year || currentMonthStr,
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      basic_salary: Number(payment.basic_salary) || 0,
      bonuses: Number(payment.bonuses) || 0,
      bonus_reason: payment.bonus_reason || '',
      deductions: Number(payment.deductions) || 0,
      deduction_reason: payment.deduction_reason || '',
      treasury_id: payment.treasury_id || (mainTreasury?.id || ''),
      payment_method_id: payment.payment_method_id || '',
      notes: payment.notes || ''
    });
    setIsFormModalOpen(true);
  };

  // Change employee in form and auto-fill their basic salary & absence deductions
  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const newBasic = emp?.salary ? Number(emp.salary) : 0;
    const attStats = getEmployeeAttendanceStats(empId, formData.month_year);

    setFormData(prev => ({
      ...prev,
      employee_id: empId,
      basic_salary: newBasic,
      deductions: attStats.totalAbsenceDeduction,
      deduction_reason:
        attStats.absentDays > 0 ? `خصم غياب ${attStats.absentDays} يوم لشهر ${formData.month_year}` : prev.deduction_reason
    }));
  };

  // Change month in form and recalculate absence deductions
  const handleMonthChange = (newMonth: string) => {
    let newDeductions = formData.deductions;
    let newDeductionReason = formData.deduction_reason;

    if (formData.employee_id) {
      const attStats = getEmployeeAttendanceStats(formData.employee_id, newMonth);
      newDeductions = attStats.totalAbsenceDeduction;
      newDeductionReason =
        attStats.absentDays > 0 ? `خصم غياب ${attStats.absentDays} يوم لشهر ${newMonth}` : '';
    }

    setFormData(prev => ({
      ...prev,
      month_year: newMonth,
      deductions: newDeductions,
      deduction_reason: newDeductionReason
    }));
  };

  // Calculated live net salary
  const liveNetSalary = useMemo(() => {
    const basic = Number(formData.basic_salary) || 0;
    const bon = Number(formData.bonuses) || 0;
    const ded = Number(formData.deductions) || 0;
    return Math.max(0, basic + bon - ded);
  }, [formData.basic_salary, formData.bonuses, formData.deductions]);

  // Submit create or edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      alert('يرجى اختيار الموظف');
      return;
    }
    if (!formData.treasury_id) {
      alert('يرجى اختيار خزينة الصرف');
      return;
    }
    if (liveNetSalary < 0) {
      alert('صافي الراتب لا يمكن أن يكون سالباً');
      return;
    }

    const selectedEmp = employees.find(e => e.id === formData.employee_id);
    const selectedTreasury = treasuries.find(t => t.id === formData.treasury_id);
    const selectedPm = paymentMethods.find(p => p.id === formData.payment_method_id);

    setIsSubmitting(true);
    try {
      if (editingPayment) {
        await onUpdateSalaryPayment(editingPayment.id, {
          employee_id: formData.employee_id,
          employee_name: selectedEmp?.full_name || editingPayment.employee_name,
          employee_role: selectedEmp?.role || editingPayment.employee_role,
          employee_phone: selectedEmp?.phone || editingPayment.employee_phone,
          month_year: formData.month_year,
          payment_date: formData.payment_date,
          basic_salary: Number(formData.basic_salary) || 0,
          bonuses: Number(formData.bonuses) || 0,
          bonus_reason: formData.bonus_reason,
          deductions: Number(formData.deductions) || 0,
          deduction_reason: formData.deduction_reason,
          net_salary: liveNetSalary,
          treasury_id: formData.treasury_id,
          treasury_name: selectedTreasury?.name,
          payment_method_id: formData.payment_method_id || undefined,
          payment_method_name: selectedPm?.name || 'نقدي كاش',
          notes: formData.notes
        });
        alert('تم تعديل سند صرف الراتب وضبط الأثر المالي بنجاح!');
      } else {
        await onCreateSalaryPayment({
          voucher_number: `SAL-${Date.now().toString().slice(-6)}`,
          employee_id: formData.employee_id,
          employee_name: selectedEmp?.full_name || '',
          employee_role: selectedEmp?.role || '',
          employee_phone: selectedEmp?.phone || '',
          month_year: formData.month_year,
          payment_date: formData.payment_date,
          basic_salary: Number(formData.basic_salary) || 0,
          bonuses: Number(formData.bonuses) || 0,
          bonus_reason: formData.bonus_reason,
          deductions: Number(formData.deductions) || 0,
          deduction_reason: formData.deduction_reason,
          net_salary: liveNetSalary,
          treasury_id: formData.treasury_id,
          treasury_name: selectedTreasury?.name,
          payment_method_id: formData.payment_method_id || undefined,
          payment_method_name: selectedPm?.name || 'نقدي كاش',
          notes: formData.notes
        });
        alert('تم تسجيل صرف الراتب وخصم المبلغ من الخزينة بنجاح!');
      }
      setIsFormModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      console.error('Error saving salary payment:', err);
      alert('حدث خطأ أثناء حفظ سند الراتب: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingPayment) return;
    setIsSubmitting(true);
    try {
      await onDeleteSalaryPayment(deletingPayment.id);
      alert('تم حذف السند وإعادة كامل الأثر المالي إلى رصيد الخزينة بنجاح!');
      setDeletingPayment(null);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      console.error('Error deleting salary payment:', err);
      alert('فشل حذف السند: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered List
  const filteredPayments = useMemo(() => {
    return salaryPayments.filter(p => {
      // Month filter
      if (selectedMonth !== 'all' && p.month_year !== selectedMonth) {
        return false;
      }
      // Employee filter
      if (selectedEmployeeId !== 'all' && p.employee_id !== selectedEmployeeId) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.employee_name || '').toLowerCase().includes(q);
        const matchVoucher = (p.voucher_number || '').toLowerCase().includes(q);
        const matchNotes = (p.notes || '').toLowerCase().includes(q);
        const matchBonus = (p.bonus_reason || '').toLowerCase().includes(q);
        const matchDed = (p.deduction_reason || '').toLowerCase().includes(q);
        if (!matchName && !matchVoucher && !matchNotes && !matchBonus && !matchDed) {
          return false;
        }
      }
      return true;
    });
  }, [salaryPayments, selectedMonth, selectedEmployeeId, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalBasic = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    filteredPayments.forEach(p => {
      totalBasic += Number(p.basic_salary) || 0;
      totalBonuses += Number(p.bonuses) || 0;
      totalDeductions += Number(p.deductions) || 0;
      totalNet += Number(p.net_salary) || 0;
    });

    return {
      count: filteredPayments.length,
      totalBasic,
      totalBonuses,
      totalDeductions,
      totalNet
    };
  }, [filteredPayments]);

  // Format month to Arabic readable text
  const formatMonthArabic = (monthStr: string) => {
    if (!monthStr || monthStr === 'all') return 'جميع الفترات';
    try {
      const [year, month] = monthStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  // Available unique months from payments
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthStr);
    salaryPayments.forEach(p => {
      if (p.month_year) set.add(p.month_year);
    });
    return Array.from(set).sort().reverse();
  }, [salaryPayments, currentMonthStr]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }
    const headers = [
      'رقم السند',
      'شهر الاستحقاق',
      'تاريخ الصرف',
      'الموظف',
      'الوظيفة',
      'الراتب الأساسي',
      'المكافآت',
      'سبب المكافأة',
      'الخصومات',
      'سبب الخصم',
      'صافي الراتب المستلم',
      'خزينة الصرف',
      'طريقة الدفع',
      'البيان والملاحظات'
    ];

    const rows = filteredPayments.map(p => [
      p.voucher_number || '',
      p.month_year || '',
      p.payment_date || '',
      `"${p.employee_name || ''}"`,
      `"${p.employee_role || ''}"`,
      p.basic_salary,
      p.bonuses,
      `"${p.bonus_reason || ''}"`,
      p.deductions,
      `"${p.deduction_reason || ''}"`,
      p.net_salary,
      `"${p.treasury_name || ''}"`,
      `"${p.payment_method_name || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مسير_رواتب_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">مسير وصرف رواتب الموظفين</h3>
              <p className="text-xs text-slate-500">
                تسجيل استحقاق وصرف الرواتب، حساب المكافآت والخصومات، وخصم الصافي آلياً من الخزينة
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsPrintingPayrollSheet(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            title="طباعة كشف مسير الرواتب الكامل للشهر"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة مسير الشهر</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            title="تصدير بيانات الرواتب إلى ملف Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ صرف راتب موظف</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Salaries Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-2 left-2 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between text-emerald-100 text-xs font-bold mb-2">
            <span>إجمالي صافي الرواتب المصروفة</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{formatMonthArabic(selectedMonth)}</span>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {stats.totalNet.toLocaleString()} <span className="text-sm font-normal text-emerald-200">{currencySymbol}</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-100/90 flex items-center gap-1">
            <span>عدد العمليات:</span>
            <span className="font-bold">{stats.count} موظف</span>
          </div>
        </div>

        {/* Basic Salaries Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>إجمالي الرواتب الأساسية</span>
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-800">
            {stats.totalBasic.toLocaleString()} <span className="text-xs font-medium text-slate-400">{currencySymbol}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            الاستحقاق الأساسي المعتمد
          </div>
        </div>

        {/* Bonuses Card */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-2">
            <span>إجمالي المكافآت والحوافز</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700">
            +{stats.totalBonuses.toLocaleString()} <span className="text-xs font-medium text-emerald-500">{currencySymbol}</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600/80">
            بدلات ومكافآت إضافية مضافة
          </div>
        </div>

        {/* Deductions Card */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold mb-2">
            <span>إجمالي الخصومات والجزاءات</span>
            <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-rose-700">
            -{stats.totalDeductions.toLocaleString()} <span className="text-xs font-medium text-rose-500">{currencySymbol}</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600/80">
            غياب وتأخيرات وجزاءات مستقطعة
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Month Filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">الشهر:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="all">جميع الأشهر</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {formatMonthArabic(m)} ({m})
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <User className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">الموظف:</span>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="all">كافة الموظفين ({employees.length})</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.role === 'admin' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'عامل'})
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم السند، الموظف، أو سبب المكافأة / الخصم..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {(selectedMonth !== 'all' || selectedEmployeeId !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedMonth('all');
              setSelectedEmployeeId('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط</span>
          </button>
        )}
      </div>

      {/* 4. Salary Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs">سجلات صرف الرواتب</span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[11px] font-bold">
              {filteredPayments.length} سند
            </span>
          </div>

          <div className="text-xs text-slate-500">
            الصافي الإجمالي بالجدول: <strong className="text-emerald-700 font-mono font-black">{stats.totalNet.toLocaleString()} {currencySymbol}</strong>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Wallet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">لا توجد سجلات صرف رواتب مطابقة للبحث</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedMonth !== 'all' ? `لم يتم تسجيل صرف رواتب لشهر ${formatMonthArabic(selectedMonth)} حتى الآن` : 'ابدأ بصرف راتب جديد بالضغط على الزر أعلاه'}
            </p>
            <button
              onClick={() => handleOpenCreate()}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل صرف راتب الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">رقم السند والتاريخ</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">الشهر</th>
                  <th className="p-3.5 text-center">الراتب الأساسي</th>
                  <th className="p-3.5 text-center">المكافآت (+)</th>
                  <th className="p-3.5 text-center">الخصومات (-)</th>
                  <th className="p-3.5 text-center">صافي الراتب المستحق</th>
                  <th className="p-3.5">خزينة الصرف</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPayments.map((p) => {
                  const emp = employees.find(e => e.id === p.employee_id);
                  const avatarUrl = emp?.personal_image_url || emp?.national_id_image_url;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Voucher & Date */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900 text-[11px]">
                          {p.voucher_number || `SAL-${p.id.slice(0, 6)}`}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{p.payment_date}</span>
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={p.employee_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {(p.employee_name || 'م').slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{p.employee_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {p.employee_role === 'admin' ? 'مدير إداري' : p.employee_role === 'supervisor' ? 'مشرف مناطق' : 'عامل غسيل'}
                              {p.employee_phone && ` • ${p.employee_phone}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Month */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">
                          {formatMonthArabic(p.month_year)}
                        </span>
                      </td>

                      {/* Basic */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                        {Number(p.basic_salary).toLocaleString()} {currencySymbol}
                      </td>

                      {/* Bonuses */}
                      <td className="p-3.5 text-center font-mono">
                        {Number(p.bonuses) > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                              +{Number(p.bonuses).toLocaleString()} {currencySymbol}
                            </span>
                            {p.bonus_reason && (
                              <div className="text-[10px] text-emerald-700 font-sans mt-0.5 max-w-[140px] truncate mx-auto" title={p.bonus_reason}>
                                {p.bonus_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Deductions */}
                      <td className="p-3.5 text-center font-mono">
                        {Number(p.deductions) > 0 ? (
                          <div>
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                              -{Number(p.deductions).toLocaleString()} {currencySymbol}
                            </span>
                            {p.deduction_reason && (
                              <div className="text-[10px] text-rose-700 font-sans mt-0.5 max-w-[140px] truncate mx-auto" title={p.deduction_reason}>
                                {p.deduction_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Net Salary */}
                      <td className="p-3.5 text-center font-mono font-black text-xs text-emerald-800 bg-emerald-50/50">
                        <div className="px-2.5 py-1 bg-emerald-100/80 text-emerald-900 rounded-lg inline-block border border-emerald-200">
                          {Number(p.net_salary).toLocaleString()} {currencySymbol}
                        </div>
                      </td>

                      {/* Treasury & Payment Method */}
                      <td className="p-3.5">
                        <div className="text-slate-800 font-bold flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{p.treasury_name || 'الخزينة الرئيسية'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.payment_method_name || 'نقدي كاش'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingPayslip(p)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="معاينة وطباعة قسيمة الراتب"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل السند والأثر المالي"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingPayment(p)}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف السند واسترداد المبلغ للخزينة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================================== */}
      {/* MODAL 1: Form (Create or Edit Salary Payment) */}
      {/* ============================================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingPayment ? 'تعديل سند صرف راتب' : 'تسجيل صرف راتب جديد'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingPayment ? 'سيتم ضبط الأثر المالي على الخزائن تلقائياً عند الحفظ' : 'يتم احتساب الصافي وخصم المبلغ من الخزينة تلقائياً'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموظف المستحق *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  required
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.role === 'admin' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'عامل'})
                      {emp.salary ? ` - الراتب المسجل: ${emp.salary} ${currencySymbol}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شهر الاستحقاق *
                  </label>
                  <input
                    type="month"
                    value={formData.month_year}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الصرف الفعلي *
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Basic Salary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الراتب الأساسي ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basic_salary || ''}
                  onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
              </div>

              {/* Live Attendance Impact Box for Month */}
              {currentFormAttendanceStats && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-teal-600" />
                      <span>سجل حضور وغياب الموظف لشهر {formData.month_year}:</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                      اليومية (÷30): {currentFormAttendanceStats.dailyRate} {currencySymbol}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">أيام الحضور</span>
                      <strong className="text-emerald-700 font-bold">{currentFormAttendanceStats.presentDays}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">إجازات مدفوعة</span>
                      <strong className="text-sky-700 font-bold">{currentFormAttendanceStats.paidLeaveDays}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">أيام الغياب</span>
                      <strong className="text-rose-700 font-bold">{currentFormAttendanceStats.absentDays}</strong>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-[10px] text-rose-600 block font-bold">خصم الغياب</span>
                      <strong className="text-rose-700 font-bold font-mono">
                        {currentFormAttendanceStats.totalAbsenceDeduction > 0
                          ? `-${currentFormAttendanceStats.totalAbsenceDeduction}`
                          : '0'} {currencySymbol}
                      </strong>
                    </div>
                  </div>

                  {currentFormAttendanceStats.absentDays > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-rose-700 font-medium">
                        * غياب {currentFormAttendanceStats.absentDays} يوم × {currentFormAttendanceStats.dailyRate} = {currentFormAttendanceStats.totalAbsenceDeduction} {currencySymbol}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            deductions: currentFormAttendanceStats.totalAbsenceDeduction,
                            deduction_reason: `خصم غياب ${currentFormAttendanceStats.absentDays} يوم لشهر ${formData.month_year}`
                          }));
                        }}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition cursor-pointer"
                      >
                        تطبيق الخصم في الراتب
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bonuses / Incentives */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>المكافآت والحوافز والبدلات (+)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.bonuses || ''}
                      onChange={(e) => setFormData({ ...formData, bonuses: parseFloat(e.target.value) || 0 })}
                      placeholder="قيمة المكافأة (0.00)"
                      className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-800 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.bonus_reason}
                      onChange={(e) => setFormData({ ...formData, bonus_reason: e.target.value })}
                      placeholder="سبب المكافأة (حافز أداء، بدل انتقال...)"
                      className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>الخصومات والجزاءات (-)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.deductions || ''}
                      onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                      placeholder="قيمة الخصم (0.00)"
                      className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-800 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.deduction_reason}
                      onChange={(e) => setFormData({ ...formData, deduction_reason: e.target.value })}
                      placeholder="سبب الخصم (غياب، تأخير، تلفيات...)"
                      className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Net Salary Summary Card */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-emerald-100 font-bold">صافي الراتب المستحق للصرف</div>
                  <div className="text-xs text-emerald-200 mt-0.5">
                    الأساسي ({formData.basic_salary}) + المكافآت ({formData.bonuses}) - الخصومات ({formData.deductions})
                  </div>
                </div>
                <div className="text-xl font-black font-mono">
                  {liveNetSalary.toLocaleString()} <span className="text-xs font-normal text-emerald-200">{currencySymbol}</span>
                </div>
              </div>

              {/* Treasury Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    خزينة الصرف *
                  </label>
                  {mainTreasury && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, treasury_id: mainTreasury.id })}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md"
                    >
                      ★ الصرف من الخزينة الرئيسية
                    </button>
                  )}
                </div>
                <select
                  value={formData.treasury_id}
                  onChange={(e) => setFormData({ ...formData, treasury_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  required
                >
                  <option value="">-- اختر الخزينة --</option>
                  {treasuries.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (الرصيد المتوفر: {Number(t.balance).toLocaleString()} {currencySymbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={formData.payment_method_id}
                  onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                >
                  <option value="">-- نقدي كاش (افتراضي) --</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو بيان إضافي
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي تفاصيل محاسبية إضافية..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingPayment ? 'حفظ التعديلات وضبط الخزينة' : 'اعتماد وصرف الراتب'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: Printable Payslip (قسيمة راتب الموظف) */}
      {/* ============================================================================== */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
              <h3 className="font-black text-slate-900 text-sm">معاينة وطباعة قسيمة الراتب</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة القسيمة</span>
                </button>
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Payslip Template */}
            <div className="p-6 border-2 border-slate-200 rounded-2xl bg-white mt-4 space-y-5 print:border-none print:p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                <div className="flex items-center gap-3">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt={settings.company_name}
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                      WC
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-black text-slate-900">{settings?.company_name || 'وي كير'}</h2>
                    <p className="text-[11px] text-slate-600 font-bold">{settings?.store_name || 'إدارة خدمات الغسيل المتنقل والعقاري'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">سجل تجاري / قسم الموارد البشرية والرواتب</p>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-lg inline-block mb-1">
                    قسيمة راتب واستحقاق موظف
                  </div>
                  <div className="text-xs font-black text-slate-800">
                    رقم السند: <span className="text-emerald-700">{viewingPayslip.voucher_number || `SAL-${viewingPayslip.id.slice(0, 6)}`}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    تاريخ الصرف: {viewingPayslip.payment_date}
                  </div>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">اسم الموظف</div>
                  <div className="font-black text-slate-900 mt-0.5">{viewingPayslip.employee_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">المسمى الوظيفي</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {viewingPayslip.employee_role === 'admin' ? 'مدير إداري' : viewingPayslip.employee_role === 'supervisor' ? 'مشرف مناطق' : 'عامل غسيل'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">شهر الاستحقاق</div>
                  <div className="font-bold text-emerald-800 mt-0.5">{formatMonthArabic(viewingPayslip.month_year)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">طريقة الصرف</div>
                  <div className="font-bold text-slate-800 mt-0.5">{viewingPayslip.payment_method_name || 'نقدي كاش'}</div>
                </div>
              </div>

              {/* Salary Breakdown Table */}
              <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">بند الاستحقاق / الاستقطاع</th>
                    <th className="p-3">البيان والتفاصيل</th>
                    <th className="p-3 text-center">المبلغ المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold text-slate-800">الراتب الأساسي المعتمد</td>
                    <td className="p-3 text-slate-500">الراتب الشهري الأساسي للموظف</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {Number(viewingPayslip.basic_salary).toLocaleString()} {currencySymbol}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-emerald-700">المكافآت والحوافز (+)</td>
                    <td className="p-3 text-emerald-700">{viewingPayslip.bonus_reason || 'حافز انتظام ومكافأة تميز'}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      +{Number(viewingPayslip.bonuses).toLocaleString()} {currencySymbol}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-rose-700">الخصومات والجزاءات (-)</td>
                    <td className="p-3 text-rose-700">{viewingPayslip.deduction_reason || 'خصومات غياب أو جزاءات مستقطعة'}</td>
                    <td className="p-3 text-center font-mono font-bold text-rose-700">
                      -{Number(viewingPayslip.deductions).toLocaleString()} {currencySymbol}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 font-black text-sm">
                    <td className="p-3 text-emerald-950" colSpan={2}>
                      صافي الراتب المستلم نقداً / تحويلاً
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-900 font-black text-base">
                      {Number(viewingPayslip.net_salary).toLocaleString()} {currencySymbol}
                    </td>
                  </tr>
                </tbody>
              </table>

              {viewingPayslip.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <strong>ملاحظات: </strong>
                  <span>{viewingPayslip.notes}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-8">إعداد الحسابات</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-8">اعتماد الإدارة</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع والختم</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-8">استلام الموظف</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">توقيع المستلم بما يفيد الاستلام</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: Print Monthly Payroll Sheet (كشف مسير الرواتب الكامل) */}
      {/* ============================================================================== */}
      {isPrintingPayrollSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
              <h3 className="font-black text-slate-900 text-sm">كشف مسير الرواتب - {formatMonthArabic(selectedMonth)}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  onClick={() => setIsPrintingPayrollSheet(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-white mt-4 space-y-4 print:p-0">
              <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                <div className="flex items-center gap-3">
                  {settings?.logo_url && (
                    <img src={settings.logo_url} alt="" className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <h2 className="text-base font-black text-slate-900">{settings?.company_name || 'وي كير'}</h2>
                    <p className="text-xs text-slate-600 font-bold">كشف مسير صرف رواتب الموظفين والعمال</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-slate-800">شهر الاستحقاق: {formatMonthArabic(selectedMonth)}</div>
                  <div className="text-slate-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                </div>
              </div>

              <table className="w-full text-right text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border">م</th>
                    <th className="p-2 border">رقم السند</th>
                    <th className="p-2 border">الموظف</th>
                    <th className="p-2 border">الوظيفة</th>
                    <th className="p-2 border text-center">الأساسي</th>
                    <th className="p-2 border text-center">المكافآت</th>
                    <th className="p-2 border text-center">الخصومات</th>
                    <th className="p-2 border text-center">صافي الراتب</th>
                    <th className="p-2 border">الخزينة</th>
                    <th className="p-2 border text-center">توقيع الموظف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="p-2 border text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border font-mono font-bold">{p.voucher_number}</td>
                      <td className="p-2 border font-bold">{p.employee_name}</td>
                      <td className="p-2 border text-slate-600">{p.employee_role}</td>
                      <td className="p-2 border text-center font-mono">{Number(p.basic_salary).toLocaleString()}</td>
                      <td className="p-2 border text-center font-mono text-emerald-700">{Number(p.bonuses).toLocaleString()}</td>
                      <td className="p-2 border text-center font-mono text-rose-700">{Number(p.deductions).toLocaleString()}</td>
                      <td className="p-2 border text-center font-mono font-black text-emerald-800 bg-emerald-50/30">
                        {Number(p.net_salary).toLocaleString()}
                      </td>
                      <td className="p-2 border text-slate-600">{p.treasury_name}</td>
                      <td className="p-2 border text-center w-28"></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black">
                    <td className="p-2.5 border text-center" colSpan={4}>
                      الإجمالي العام ({filteredPayments.length} موظف)
                    </td>
                    <td className="p-2.5 border text-center font-mono">{stats.totalBasic.toLocaleString()}</td>
                    <td className="p-2.5 border text-center font-mono text-emerald-700">+{stats.totalBonuses.toLocaleString()}</td>
                    <td className="p-2.5 border text-center font-mono text-rose-700">-{stats.totalDeductions.toLocaleString()}</td>
                    <td className="p-2.5 border text-center font-mono text-emerald-900 bg-emerald-100 text-sm">
                      {stats.totalNet.toLocaleString()} {currencySymbol}
                    </td>
                    <td className="p-2.5 border" colSpan={2}></td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700 mb-8">المحاسب المسؤول</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-8">المدير العام / الاعتماد</div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400">التوقيع والختم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: Confirm Delete with Financial Reversal */}
      {/* ============================================================================== */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-black text-slate-900 text-base text-center">
              تأكيد حذف سند الراتب واسترداد الأثر المالي
            </h3>

            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-800 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>رقم السند:</span>
                <span className="font-mono">{deletingPayment.voucher_number}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>الموظف:</span>
                <span>{deletingPayment.employee_name}</span>
              </div>
              <div className="flex justify-between font-black text-rose-900 border-t border-rose-200/60 pt-1.5">
                <span>المبلغ المسترد للخزينة:</span>
                <span className="font-mono text-sm">{Number(deletingPayment.net_salary).toLocaleString()} {currencySymbol}</span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                سيتم تلقائياً إعادة مبلغ <strong>{Number(deletingPayment.net_salary).toLocaleString()} {currencySymbol}</strong> كاملاً إلى رصيد خزينة ({deletingPayment.treasury_name || 'الرئيسية'}) فور الحذف.
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                disabled={isSubmitting}
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? 'جاري الاسترداد والحذف...' : 'تأكيد الحذف واسترداد المبلغ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
