import React, { useState, useMemo } from 'react';
import {
  Employee,
  Attendance,
  AttendanceStatus,
  Settings
} from '../types/database';
import {
  CalendarCheck,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CalendarDays,
  FileText,
  DollarSign,
  Printer,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AttendanceViewProps {
  employees: Employee[];
  attendance: Attendance[];
  settings?: Settings;
  onMarkAttendance: (att: Omit<Attendance, 'id' | 'created_at'>) => Promise<void>;
  onNavigateToSalaries?: (prefillEmployeeId?: string, monthYear?: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  employees = [],
  attendance = [],
  settings,
  onMarkAttendance,
  onNavigateToSalaries
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7)); // e.g. "2026-10"
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Custom Detail Modal State
  const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);
  const [modalForm, setModalForm] = useState<{
    status: AttendanceStatus;
    is_paid_leave: boolean;
    leave_type: string;
    deduction_amount: number;
    check_in: string;
    check_out: string;
    notes: string;
  }>({
    status: 'present',
    is_paid_leave: false,
    leave_type: 'annual',
    deduction_amount: 0,
    check_in: '08:00',
    check_out: '16:00',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isPrintingMonthly, setIsPrintingMonthly] = useState(false);

  const currencySymbol = settings?.currency_symbol || 'ج.م';

  // Helper: calculate employee daily rate based on 30-day standard month
  const getEmployeeDailyRate = (emp: Employee): number => {
    const salary = Number(emp.salary) || 0;
    if (salary <= 0) return 0;
    return Math.round((salary / 30) * 100) / 100;
  };

  // Helper: Shift selected date
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filtered employees for Daily table
  const filteredDailyEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Role filter
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        const att = attendance.find((a) => a.employee_id === emp.id && a.date === selectedDate);
        if (statusFilter === 'unrecorded' && att) return false;
        if (statusFilter === 'paid_leave' && (!att || (!att.is_paid_leave && att.status !== 'paid_leave'))) return false;
        if (statusFilter === 'absent' && (!att || att.status !== 'absent' || att.is_paid_leave)) return false;
        if (statusFilter === 'present' && att?.status !== 'present') return false;
        if (statusFilter === 'late' && att?.status !== 'late') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = emp.full_name.toLowerCase().includes(q);
        const matchesPhone = emp.phone?.includes(q);
        const matchesId = emp.national_id?.includes(q);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }

      return true;
    });
  }, [employees, attendance, selectedDate, roleFilter, statusFilter, searchQuery]);

  // Daily Statistics for selectedDate
  const dailyStats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let paidLeaveCount = 0;
    let totalDeductions = 0;

    employees.forEach((emp) => {
      const att = attendance.find((a) => a.employee_id === emp.id && a.date === selectedDate);
      const dailyRate = getEmployeeDailyRate(emp);

      if (att) {
        if (att.status === 'present') {
          presentCount++;
        } else if (att.status === 'late') {
          lateCount++;
        } else if (att.is_paid_leave || att.status === 'paid_leave') {
          paidLeaveCount++;
        } else if (att.status === 'absent' || (att.status === 'leave' && !att.is_paid_leave)) {
          absentCount++;
          const ded = att.deduction_amount !== undefined ? Number(att.deduction_amount) : dailyRate;
          totalDeductions += ded;
        }
      }
    });

    return {
      totalEmployees: employees.length,
      presentCount,
      lateCount,
      absentCount,
      paidLeaveCount,
      unrecordedCount: Math.max(0, employees.length - (presentCount + lateCount + absentCount + paidLeaveCount)),
      totalDeductions: Math.round(totalDeductions * 100) / 100
    };
  }, [employees, attendance, selectedDate]);

  // Quick Action: Mark an employee attendance
  const handleQuickMark = async (
    emp: Employee,
    status: AttendanceStatus,
    isPaidLeave = false
  ) => {
    const dailyRate = getEmployeeDailyRate(emp);
    const nowTime = new Date().toTimeString().slice(0, 5);

    let deduction = 0;
    if (status === 'absent' && !isPaidLeave) {
      deduction = dailyRate;
    }

    try {
      await onMarkAttendance({
        employee_id: emp.id,
        date: selectedDate,
        status: isPaidLeave ? 'paid_leave' : status,
        is_paid_leave: isPaidLeave,
        leave_type: isPaidLeave ? 'paid' : status === 'leave' ? 'unpaid' : undefined,
        deduction_amount: deduction,
        daily_salary: dailyRate,
        check_in: status === 'present' || status === 'late' ? nowTime : undefined,
        notes: isPaidLeave
          ? 'إجازة مدفوعة الأجر (بدون خصم من الراتب)'
          : status === 'absent'
          ? `غياب غير مدفوع (خصم يومية ${dailyRate} ${currencySymbol})`
          : `تسجيل حالة ${status}`
      });

      setNotification(`تم تحديث حالة ${emp.full_name} بنجاح!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert('فشل تسجيل الحضور: ' + (err.message || 'يرجى المحاولة مجدداً'));
    }
  };

  // Bulk action: Mark all unrecorded as Present
  const handleBulkMarkPresent = async () => {
    if (!window.confirm(`هل أنت متأكد من تسجيل حضور جماعي لجميع العمال الذين لم يُسجلوا اليوم (${selectedDate}) كـ "حاضر"؟`)) {
      return;
    }

    const unrecorded = employees.filter((emp) => {
      return !attendance.some((a) => a.employee_id === emp.id && a.date === selectedDate);
    });

    if (unrecorded.length === 0) {
      alert('جميع الموظفين مسجلون بالفعل لهذا اليوم!');
      return;
    }

    setIsSaving(true);
    try {
      const nowTime = new Date().toTimeString().slice(0, 5);
      for (const emp of unrecorded) {
        const dailyRate = getEmployeeDailyRate(emp);
        await onMarkAttendance({
          employee_id: emp.id,
          date: selectedDate,
          status: 'present',
          is_paid_leave: false,
          deduction_amount: 0,
          daily_salary: dailyRate,
          check_in: nowTime,
          notes: 'تسجيل حضور جماعي تلقائي'
        });
      }
      setNotification(`تم تسجيل حضور جماعي لـ ${unrecorded.length} موظف بنجاح!`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert('حدث خطأ أثناء التسجيل الجماعي: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Open Detailed Modal
  const handleOpenDetailModal = (emp: Employee) => {
    const existing = attendance.find((a) => a.employee_id === emp.id && a.date === selectedDate);
    const dailyRate = getEmployeeDailyRate(emp);

    setModalEmployee(emp);
    setModalForm({
      status: existing?.status || 'present',
      is_paid_leave: Boolean(existing?.is_paid_leave || existing?.status === 'paid_leave'),
      leave_type: existing?.leave_type || (existing?.is_paid_leave ? 'paid' : 'annual'),
      deduction_amount:
        existing?.deduction_amount !== undefined
          ? existing.deduction_amount
          : existing?.status === 'absent'
          ? dailyRate
          : 0,
      check_in: existing?.check_in || '08:00',
      check_out: existing?.check_out || '16:00',
      notes: existing?.notes || ''
    });
  };

  // Save Detailed Modal
  const handleSaveDetailModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmployee) return;

    setIsSaving(true);
    try {
      const dailyRate = getEmployeeDailyRate(modalEmployee);
      let calculatedDeduction = Number(modalForm.deduction_amount) || 0;

      // If marked as paid leave, deduction must be 0
      if (modalForm.is_paid_leave || modalForm.status === 'paid_leave') {
        calculatedDeduction = 0;
      } else if (modalForm.status === 'absent' && calculatedDeduction <= 0) {
        calculatedDeduction = dailyRate;
      }

      await onMarkAttendance({
        employee_id: modalEmployee.id,
        date: selectedDate,
        status: modalForm.is_paid_leave ? 'paid_leave' : modalForm.status,
        is_paid_leave: modalForm.is_paid_leave,
        leave_type: modalForm.leave_type,
        deduction_amount: calculatedDeduction,
        daily_salary: dailyRate,
        check_in: modalForm.check_in || undefined,
        check_out: modalForm.check_out || undefined,
        notes: modalForm.notes || undefined
      });

      setModalEmployee(null);
      setNotification(`تم حفظ تفاصيل حضور ${modalEmployee.full_name} بنجاح!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert('فشل حفظ البيانات: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly Attendance & Salary Impact Aggregations
  const monthlyData = useMemo(() => {
    return employees.map((emp) => {
      const basic = Number(emp.salary) || 0;
      const dailyRate = getEmployeeDailyRate(emp);

      // Find all records in selected month
      const monthRecords = attendance.filter(
        (a) => a.employee_id === emp.id && a.date.startsWith(selectedMonth)
      );

      const presentDays = monthRecords.filter((a) => a.status === 'present').length;
      const lateDays = monthRecords.filter((a) => a.status === 'late').length;
      const paidLeaveDays = monthRecords.filter((a) => a.is_paid_leave || a.status === 'paid_leave').length;
      const absentDays = monthRecords.filter(
        (a) => !a.is_paid_leave && (a.status === 'absent' || a.status === 'leave')
      ).length;

      // Calculate total deductions
      const totalDeductions = monthRecords.reduce((sum, a) => {
        if (!a.is_paid_leave && (a.status === 'absent' || a.status === 'leave')) {
          return sum + (Number(a.deduction_amount) || dailyRate);
        }
        return sum;
      }, 0);

      const expectedNetSalary = Math.max(0, basic - totalDeductions);

      return {
        employee: emp,
        basic,
        dailyRate,
        presentDays,
        lateDays,
        paidLeaveDays,
        absentDays,
        totalDaysRecorded: monthRecords.length,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        expectedNetSalary: Math.round(expectedNetSalary * 100) / 100
      };
    });
  }, [employees, attendance, selectedMonth]);

  // Overall totals for monthly view
  const monthlyTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, item) => {
        acc.totalBasic += item.basic;
        acc.totalDeductions += item.totalDeductions;
        acc.totalNet += item.expectedNetSalary;
        acc.totalAbsentDays += item.absentDays;
        acc.totalPaidLeaveDays += item.paidLeaveDays;
        return acc;
      },
      { totalBasic: 0, totalDeductions: 0, totalNet: 0, totalAbsentDays: 0, totalPaidLeaveDays: 0 }
    );
  }, [monthlyData]);

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Header & Sub-Tabs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">إثبات الحضور والغياب اليومي للعمال</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تسجيل الحضور والغياب، إجازات مدفوعة الأجر، واحتساب الخصم المالي التلقائي على صافي الراتب الشهري
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'daily'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>تسجيل الحضور اليومي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'monthly'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-600" />
            <span>كشف الشهر وأثر الخصم على الراتب</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DAILY ATTENDANCE (تسجيل الحضور اليومي) */}
      {/* ========================================================================= */}
      {activeSubTab === 'daily' && (
        <div className="space-y-5">
          {/* Date Picker Bar & Bulk Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">تاريخ الحضور:</span>
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                title="اليوم السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-800"
              />

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                title="اليوم التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                اليوم
              </button>

              <span className="text-xs font-medium text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {new Date(selectedDate).toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkMarkPresent}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="تسجيل جميع العمال غير المسجلين كـ حاضرين بنقرة واحدة"
              >
                <Sparkles className="w-4 h-4" />
                <span>تسجيل حضور جماعي للجميع (حاضر)</span>
              </button>
            </div>
          </div>

          {/* Daily Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي العمال</span>
                <span className="text-base font-black text-slate-900">{dailyStats.totalEmployees}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3 bg-emerald-50/20">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 block">حاضرون</span>
                <span className="text-base font-black text-emerald-700">{dailyStats.presentCount}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3 bg-amber-50/20">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <Clock3 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 block">متأخرون</span>
                <span className="text-base font-black text-amber-700">{dailyStats.lateCount}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-3 bg-rose-50/20">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-800 block">غائبون (خصم)</span>
                <span className="text-base font-black text-rose-700">{dailyStats.absentCount}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-sky-200 shadow-xs flex items-center gap-3 bg-sky-50/20">
              <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-800 block">إجازة مدفوعة</span>
                <span className="text-base font-black text-sky-700">{dailyStats.paidLeaveCount}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-xs flex items-center gap-3 bg-purple-50/20">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-800 block">خصومات اليوم</span>
                <span className="text-base font-black text-purple-700 font-mono">
                  {dailyStats.totalDeductions} {currencySymbol}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الموظف أو رقم الهاتف..."
                className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold"
              >
                <option value="all">كل الوظائف</option>
                <option value="worker">عامل غسيل ميداني</option>
                <option value="supervisor">مشرف مناطق</option>
                <option value="admin">مدير إداري</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-bold"
              >
                <option value="all">كل الحالات اليوم</option>
                <option value="present">حاضر</option>
                <option value="late">متأخر</option>
                <option value="absent">غائب (يخصم)</option>
                <option value="paid_leave">إجازة مدفوعة الأجر</option>
                <option value="unrecorded">لم يسجل بعد</option>
              </select>
            </div>
          </div>

          {/* Daily Attendance Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <span>سجل الموظفين والعمال ({filteredDailyEmployees.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  — اليومية محسوبة على أساس الراتب ÷ 30 يوماً
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الموظف / العامل</th>
                    <th className="p-3.5">الدور الوظيفي</th>
                    <th className="p-3.5 text-center">الراتب وقيمة اليومية</th>
                    <th className="p-3.5 text-center">الحالة اليوم</th>
                    <th className="p-3.5 text-center">الأثر المالي لليوم</th>
                    <th className="p-3.5 text-center">وقت الحضور</th>
                    <th className="p-3.5 text-center">إجراءات إثبات الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredDailyEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        لا يوجد موظفون مطابقون لخيارات البحث
                      </td>
                    </tr>
                  ) : (
                    filteredDailyEmployees.map((emp) => {
                      const currentAtt = attendance.find(
                        (a) => a.employee_id === emp.id && a.date === selectedDate
                      );
                      const dailyRate = getEmployeeDailyRate(emp);
                      const isPaid = Boolean(currentAtt?.is_paid_leave || currentAtt?.status === 'paid_leave');
                      const isAbsent = !isPaid && (currentAtt?.status === 'absent' || currentAtt?.status === 'leave');

                      const currentDeduction = isAbsent
                        ? currentAtt?.deduction_amount !== undefined
                          ? Number(currentAtt.deduction_amount)
                          : dailyRate
                        : 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Employee Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {emp.personal_image_url || emp.national_id_image_url ? (
                                <img
                                  src={emp.personal_image_url || emp.national_id_image_url}
                                  alt={emp.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0">
                                  {emp.full_name.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block">{emp.full_name}</span>
                                <span className="font-mono text-[10px] text-slate-400 block">{emp.phone}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                emp.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : emp.role === 'supervisor'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {emp.role === 'admin'
                                ? 'مدير إداري'
                                : emp.role === 'supervisor'
                                ? 'مشرف مناطق'
                                : 'عامل غسيل'}
                            </span>
                          </td>

                          {/* Salary & Daily Rate */}
                          <td className="p-3.5 text-center font-mono">
                            {emp.salary ? (
                              <div>
                                <span className="text-slate-800 font-bold block text-xs">
                                  {Number(emp.salary).toLocaleString()} {currencySymbol}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  اليومية: <strong>{dailyRate}</strong> {currencySymbol}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">غير محدد</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                <Sparkles className="w-3 h-3 text-sky-600" />
                                <span>إجازة مدفوعة الأجر</span>
                              </span>
                            ) : currentAtt?.status === 'present' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>حاضر</span>
                              </span>
                            ) : currentAtt?.status === 'late' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>متأخر</span>
                              </span>
                            ) : currentAtt?.status === 'absent' || currentAtt?.status === 'leave' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <X className="w-3 h-3 text-rose-600" />
                                <span>غائب (خصم)</span>
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400">
                                لم يُسجل
                              </span>
                            )}
                          </td>

                          {/* Financial Impact */}
                          <td className="p-3.5 text-center font-mono">
                            {isPaid ? (
                              <span className="text-sky-700 font-bold text-[11px] bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                                0 {currencySymbol} (مدفوعة)
                              </span>
                            ) : isAbsent ? (
                              <span className="text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                -{currentDeduction} {currencySymbol}
                              </span>
                            ) : currentAtt?.status === 'present' ? (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                0 {currencySymbol}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Check-in Time */}
                          <td className="p-3.5 text-center font-mono text-xs text-slate-500">
                            {currentAtt?.check_in ? (
                              <span>{currentAtt.check_in}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {/* Present */}
                              <button
                                type="button"
                                onClick={() => handleQuickMark(emp, 'present')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                  currentAtt?.status === 'present'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="إثبات حضور الموظف اليوم"
                              >
                                حاضر
                              </button>

                              {/* Late */}
                              <button
                                type="button"
                                onClick={() => handleQuickMark(emp, 'late')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                  currentAtt?.status === 'late'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                                title="تسجيل متأخر"
                              >
                                متأخر
                              </button>

                              {/* Absent (Deduction) */}
                              <button
                                type="button"
                                onClick={() => handleQuickMark(emp, 'absent', false)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                                title={`تسجيل غياب مع خصم قيمة يومية (${dailyRate} ${currencySymbol}) من الراتب`}
                              >
                                غائب (خصم)
                              </button>

                              {/* Paid Leave */}
                              <button
                                type="button"
                                onClick={() => handleQuickMark(emp, 'leave', true)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                  isPaid
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                                }`}
                                title="تسجيل إجازة مدفوعة الأجر (بدون أي خصم مالي من الراتب)"
                              >
                                إجازة مدفوعة
                              </button>

                              {/* More / Custom */}
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(emp)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                                title="تفاصيل وملاحظات إضافية وتحديد وقت الحضور والخصم يدوياً"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MONTHLY ATTENDANCE SHEET & SALARY IMPACT */}
      {/* ========================================================================= */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar & Print Button */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">الشهر المستهدف:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
              <span className="text-xs text-slate-400 font-medium">
                (يتم احتساب أيام الغياب وخصوماتها خلال هذا الشهر وترحيلها لصافي الراتب)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintingMonthly(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحضور الشهري (A4)</span>
              </button>
            </div>
          </div>

          {/* Monthly Grand Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-slate-400 text-xs font-bold block">إجمالي الرواتب الأساسية</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {monthlyTotals.totalBasic.toLocaleString()} {currencySymbol}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs space-y-1">
              <span className="text-rose-700 text-xs font-bold block">إجمالي أيام الغياب المخصومة</span>
              <span className="text-lg font-black text-rose-700 font-mono">
                {monthlyTotals.totalAbsentDays} يوم
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs space-y-1">
              <span className="text-rose-800 text-xs font-bold block">إجمالي خصومات الغياب للشهر</span>
              <span className="text-lg font-black text-rose-800 font-mono">
                -{monthlyTotals.totalDeductions.toLocaleString()} {currencySymbol}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
              <span className="text-emerald-800 text-xs font-bold block">صافي الرواتب المتوقع بعد خصم الغياب</span>
              <span className="text-lg font-black text-emerald-800 font-mono">
                {monthlyTotals.totalNet.toLocaleString()} {currencySymbol}
              </span>
            </div>
          </div>

          {/* Monthly Attendance & Payroll Impact Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-xs">
                بيان أثر حضور وغياب العمال على مسير رواتب شهر ({selectedMonth})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الموظف</th>
                    <th className="p-3.5">الوظيفة</th>
                    <th className="p-3.5 text-center">الراتب الأساسي</th>
                    <th className="p-3.5 text-center">قيمة اليومية (÷30)</th>
                    <th className="p-3.5 text-center text-emerald-700">أيام الحضور</th>
                    <th className="p-3.5 text-center text-sky-700">إجازات مدفوعة</th>
                    <th className="p-3.5 text-center text-rose-700">أيام الغياب (مخصومة)</th>
                    <th className="p-3.5 text-center text-rose-800">إجمالي خصم الغياب</th>
                    <th className="p-3.5 text-center text-emerald-800">صافي الراتب المستحق</th>
                    <th className="p-3.5 text-center">الإجراء المالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {monthlyData.map((item) => {
                    return (
                      <tr key={item.employee.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{item.employee.full_name}</td>
                        <td className="p-3.5 text-slate-500">{item.employee.role}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                          {item.basic.toLocaleString()} {currencySymbol}
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-600">
                          {item.dailyRate} {currencySymbol}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {item.presentDays}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-sky-700 bg-sky-50/30">
                          {item.paidLeaveDays}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                          {item.absentDays}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-800 bg-rose-50/60">
                          {item.totalDeductions > 0 ? `-${item.totalDeductions} ${currencySymbol}` : '0'}
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/40 text-sm">
                          {item.expectedNetSalary.toLocaleString()} {currencySymbol}
                        </td>
                        <td className="p-3.5 text-center">
                          {onNavigateToSalaries ? (
                            <button
                              type="button"
                              onClick={() => onNavigateToSalaries(item.employee.id, selectedMonth)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs inline-flex items-center gap-1 transition cursor-pointer"
                              title="صرف الراتب في قسم الرواتب مع ترحيل خصم الغياب تلقائياً"
                            >
                              <span>صرف الراتب</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">جاهز للصرف</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED ATTENDANCE MODAL (تخصيص الحضور والأثر المالي) */}
      {/* ========================================================================= */}
      {modalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">إثبات حضور الموظف وتحديد الأثر المالي</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  الموظف: {modalEmployee.full_name} ({selectedDate})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetailModal} className="p-6 space-y-5">
              {/* Daily Rate Info Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[11px]">الراتب الأساسي:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {Number(modalEmployee.salary || 0).toLocaleString()} {currencySymbol}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[11px]">قيمة اليومية (÷30):</span>
                  <span className="font-mono font-bold text-teal-700">
                    {getEmployeeDailyRate(modalEmployee)} {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة الحضور</label>
                <select
                  value={modalForm.status}
                  onChange={(e) => {
                    const st = e.target.value as AttendanceStatus;
                    const dailyRate = getEmployeeDailyRate(modalEmployee);
                    setModalForm((prev) => ({
                      ...prev,
                      status: st,
                      is_paid_leave: st === 'paid_leave' ? true : prev.is_paid_leave,
                      deduction_amount:
                        st === 'absent' && !prev.is_paid_leave
                          ? dailyRate
                          : prev.is_paid_leave
                          ? 0
                          : prev.deduction_amount
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold bg-white text-slate-800"
                >
                  <option value="present">حاضر (يوم عمل كامل)</option>
                  <option value="late">متأخر عن موعد الحضور</option>
                  <option value="absent">غائب (غياب عن العمل)</option>
                  <option value="leave">إجازة</option>
                  <option value="paid_leave">إجازة مدفوعة الأجر</option>
                </select>
              </div>

              {/* Paid Leave Checkbox Toggle */}
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalForm.is_paid_leave}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setModalForm((prev) => ({
                        ...prev,
                        is_paid_leave: checked,
                        status: checked && prev.status === 'present' ? 'paid_leave' : prev.status,
                        deduction_amount: checked ? 0 : getEmployeeDailyRate(modalEmployee)
                      }));
                    }}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-sky-900 block">
                      اعتبار هذا اليوم إجازة مدفوعة الأجر (بدون خصم من الراتب)
                    </span>
                    <span className="text-[11px] text-sky-700 block mt-0.5">
                      عند التفعيل، لن يتم خصم قيمة اليومية من راتب الموظف الشهري وسيظهر كيوم إجازة معتمد ومدفوع.
                    </span>
                  </div>
                </label>
              </div>

              {/* Deduction Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  قيمة الخصم المالي المطبق على هذا اليوم
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    disabled={modalForm.is_paid_leave}
                    value={modalForm.deduction_amount}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, deduction_amount: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 pl-12"
                  />
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold pointer-events-none">
                    {currencySymbol}
                  </span>
                </div>
                {modalForm.is_paid_leave ? (
                  <p className="text-[10px] text-sky-600 font-bold mt-1">
                    * الخصم 0 لأن اليوم محدد كإجازة مدفوعة الأجر.
                  </p>
                ) : modalForm.status === 'absent' ? (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">
                    * سيتم خصم هذا المبلغ تلقائياً من صافي راتب الموظف لنهاية الشهر.
                  </p>
                ) : null}
              </div>

              {/* In & Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وقت الحضور</label>
                  <input
                    type="time"
                    value={modalForm.check_in}
                    onChange={(e) => setModalForm({ ...modalForm, check_in: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وقت الانصراف</label>
                  <input
                    type="time"
                    value={modalForm.check_out}
                    onChange={(e) => setModalForm({ ...modalForm, check_out: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات أو سبب الإجازة/الغياب</label>
                <input
                  type="text"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  placeholder="مثال: إجازة اعتيادية / إذن نصف يوم / مرضية..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEmployee(null)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات الحضور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT MONTHLY ATTENDANCE SHEET (A4) */}
      {/* ========================================================================= */}
      {isPrintingMonthly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 print:hidden">
              <span className="font-bold text-sm">
                معاينة كشف حضور وغياب العمال والخصومات لشهر ({selectedMonth})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintingMonthly(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50 flex-1 print:p-0 print:bg-white">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-2 max-w-4xl mx-auto space-y-6">
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {settings?.company_name || 'شركة وي كير لخدمات الغسيل'}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      كشف الحضور والغياب الشهري وأثر الخصومات على صافي الرواتب — شهر ({selectedMonth})
                    </p>
                  </div>
                  <div className="text-left text-xs font-mono text-slate-600 space-y-1">
                    <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                  </div>
                </div>

                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border border-slate-300">
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300">الموظف / العامل</th>
                      <th className="p-2 border border-slate-300">الوظيفة</th>
                      <th className="p-2 border border-slate-300 text-center">الراتب الأساسي</th>
                      <th className="p-2 border border-slate-300 text-center">اليومية</th>
                      <th className="p-2 border border-slate-300 text-center">أيام الحضور</th>
                      <th className="p-2 border border-slate-300 text-center">إجازة مدفوعة</th>
                      <th className="p-2 border border-slate-300 text-center">أيام الغياب</th>
                      <th className="p-2 border border-slate-300 text-center">خصم الغياب</th>
                      <th className="p-2 border border-slate-300 text-center">صافي الراتب المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((item, idx) => (
                      <tr key={item.employee.id} className="border border-slate-300">
                        <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">{item.employee.full_name}</td>
                        <td className="p-2 border border-slate-300">{item.employee.role}</td>
                        <td className="p-2 border border-slate-300 text-center font-mono">
                          {item.basic.toLocaleString()} {currencySymbol}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono">
                          {item.dailyRate} {currencySymbol}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-emerald-800">
                          {item.presentDays}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-sky-800">
                          {item.paidLeaveDays}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">
                          {item.absentDays}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-rose-800">
                          {item.totalDeductions > 0 ? `-${item.totalDeductions} ${currencySymbol}` : '0'}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono font-black text-slate-900">
                          {item.expectedNetSalary.toLocaleString()} {currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border border-slate-300">
                      <td colSpan={3} className="p-2 border border-slate-300 text-center">
                        الإجمالي الكلي
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {monthlyTotals.totalBasic.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-2 border border-slate-300 text-center">—</td>
                      <td className="p-2 border border-slate-300 text-center">—</td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {monthlyTotals.totalPaidLeaveDays}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {monthlyTotals.totalAbsentDays}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono text-rose-800">
                        -{monthlyTotals.totalDeductions.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono text-slate-900">
                        {monthlyTotals.totalNet.toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                  <div>
                    <p className="font-bold">إعداد المسؤول الإداري</p>
                    <div className="h-10 mt-2 border-b border-dashed border-slate-400"></div>
                  </div>
                  <div>
                    <p className="font-bold">اعتماد الإدارة العامة</p>
                    <div className="h-10 mt-2 border-b border-dashed border-slate-400"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
