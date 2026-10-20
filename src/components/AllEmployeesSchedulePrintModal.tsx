import React, { useState, useMemo } from 'react';
import {
  Employee,
  Visit,
  Customer,
  Subscription,
  CoverageArea,
  Vehicle,
  Settings
} from '../types/database';
import {
  Printer,
  X,
  Users,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Car,
  Filter,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

interface AllEmployeesSchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  visits: Visit[];
  employees: Employee[];
  customers: Customer[];
  subscriptions: Subscription[];
  coverageAreas: CoverageArea[];
  vehicles: Vehicle[];
  settings: Settings;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

export const AllEmployeesSchedulePrintModal: React.FC<AllEmployeesSchedulePrintModalProps> = ({
  isOpen,
  onClose,
  visits = [],
  employees = [],
  customers = [],
  subscriptions = [],
  coverageAreas = [],
  vehicles = [],
  settings,
  defaultDateFrom,
  defaultDateTo
}) => {
  // Helper for Arab work week (Saturday to Friday)
  const getWeekDates = (offsetWeeks: number = 0) => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const diffToSaturday = (day + 1) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - diffToSaturday + offsetWeeks * 7);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);
    return {
      from: saturday.toISOString().split('T')[0],
      to: friday.toISOString().split('T')[0]
    };
  };

  const initialWeek = getWeekDates(0);
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom || initialWeek.from);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo || initialWeek.to);
  const [selectedPreset, setSelectedPreset] = useState<'current' | 'next' | 'custom'>('current');
  const [onlyWorkersWithVisits, setOnlyWorkersWithVisits] = useState(true);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: 'current' | 'next') => {
    setSelectedPreset(preset);
    const w = preset === 'current' ? getWeekDates(0) : getWeekDates(1);
    setDateFrom(w.from);
    setDateTo(w.to);
  };

  // Helper to match visit to employee
  const isVisitForWorker = (v: Visit, emp: Employee) => {
    const wId = v.assigned_worker_id || (v as any).worker_id;
    if (wId === emp.id || wId === emp.full_name) return true;
    if (!wId) {
      const sub = subscriptions.find((s) => s.id === v.subscription_id);
      if (sub?.assigned_worker_id === emp.id || sub?.assigned_worker_id === emp.full_name) return true;
    }
    return false;
  };

  // Helpers to resolve Customer, Address, Vehicle
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId);

  const getCustomerAddress = (customerId: string): string => {
    const cust = getCustomer(customerId);
    if (!cust) return 'العنوان غير مسجل';
    const area = coverageAreas.find((a) => a.id === cust.area_id);
    const parts: string[] = [];
    if (area?.name) parts.push(`المنطقة: ${area.name}`);
    if (cust.building_number && cust.building_number.trim()) parts.push(`عمارة: ${cust.building_number.trim()}`);
    if (cust.block_number && cust.block_number.trim()) parts.push(`مجاورة/بلوك: ${cust.block_number.trim()}`);
    if (cust.detailed_address && cust.detailed_address.trim()) parts.push(cust.detailed_address.trim());
    return parts.length > 0 ? parts.join(' - ') : (area?.name || 'العنوان غير محدد');
  };

  const getVehicleDetails = (subscriptionId: string): string => {
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub || !sub.vehicle_id) return '';
    const veh = vehicles.find((v) => v.id === sub.vehicle_id);
    if (!veh) return '';
    const parts: string[] = [];
    if (veh.vehicle_type) parts.push(veh.vehicle_type);
    if (veh.color) parts.push(`لون ${veh.color}`);
    if (veh.plate_number) parts.push(`لوحة: ${veh.plate_number}`);
    return parts.join(' - ');
  };

  // Group visits by employee within date range
  const workersScheduleData = useMemo(() => {
    return employees
      .map((emp) => {
        const empVisits = visits
          .filter((v) => {
            if (!isVisitForWorker(v, emp)) return false;
            if (dateFrom && v.scheduled_date < dateFrom) return false;
            if (dateTo && v.scheduled_date > dateTo) return false;
            return true;
          })
          .sort((a, b) => {
            const cmp = a.scheduled_date.localeCompare(b.scheduled_date);
            if (cmp !== 0) return cmp;
            return (a.scheduled_time_from || '').localeCompare(b.scheduled_time_from || '');
          });

        return {
          employee: emp,
          visits: empVisits
        };
      })
      .filter((item) => (onlyWorkersWithVisits ? item.visits.length > 0 : true));
  }, [employees, visits, dateFrom, dateTo, onlyWorkersWithVisits, subscriptions]);

  const totalVisitsCount = workersScheduleData.reduce((acc, curr) => acc + curr.visits.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border border-slate-200">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-white">
                  طباعة جدول الأسبوع لجميع الموظفين
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  كل موظف في صفحة A4 مستقلة
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                توليد وطباعة أوراق جداول الزيارات الأسبوعية لجميع العمال تلقائياً بنقرة واحدة
              </p>
            </div>
          </div>

          {/* Quick Presets & Range Inputs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset('current')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  selectedPreset === 'current'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                الأسبوع الحالي
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('next')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  selectedPreset === 'next'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                الأسبوع القادم
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-bold">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-bold mr-1">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={workersScheduleData.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-40"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة لجميع الموظفين ({workersScheduleData.length})</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Info & Stats Subbar (Hidden in Print) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-medium text-slate-600 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>
                الموظفون المشمولون بالطباعة:{' '}
                <strong className="text-slate-900 font-bold">{workersScheduleData.length} موظف</strong>
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>
                إجمالي الزيارات المقررة:{' '}
                <strong className="text-emerald-700 font-bold">{totalVisitsCount} زيارة</strong>
              </span>
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWorkersWithVisits}
              onChange={(e) => setOnlyWorkersWithVisits(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-[11px] font-bold text-slate-700">
              طباعة موظفي الزيارات لهذا الأسبوع فقط
            </span>
          </label>
        </div>

        {/* Printable Area - Each Worker on an Independent A4 Page */}
        <div
          id="print-all-workers-schedule-area"
          className="flex-1 overflow-y-auto p-4 sm:p-8 font-cairo bg-slate-100/60 print:bg-white print:p-0"
        >
          {/* CSS Print Styles with Clean Page Breaks */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body * {
                visibility: hidden;
              }
              #print-all-workers-schedule-area,
              #print-all-workers-schedule-area * {
                visibility: visible;
              }
              #print-all-workers-schedule-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                background: white !important;
              }
              .worker-print-page {
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid;
                min-height: 98vh;
                box-sizing: border-box;
                padding: 8mm;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .worker-print-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          `}</style>

          {workersScheduleData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm max-w-xl mx-auto my-12">
              <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-base text-slate-800">
                لا توجد زيارات مسندة لأي موظف في الفترة المحددة ({dateFrom} إلى {dateTo}).
              </p>
              <p className="text-xs text-slate-400 mt-1">
                يرجى تغيير التواريخ بالأعلى أو إلغاء تفعيل خيار &quot;طباعة موظفي الزيارات لهذا الأسبوع فقط&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-0">
              {workersScheduleData.map(({ employee: emp, visits: empVisits }) => {
                const roleText =
                  emp.role === 'admin'
                    ? 'مدير إداري'
                    : emp.role === 'supervisor'
                    ? 'مشرف مناطق'
                    : 'عامل غسيل ميداني';

                return (
                  <div
                    key={emp.id}
                    className="worker-print-page bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-slate-900"
                  >
                    {/* Page Header (Identical to Single-Employee Report) */}
                    <div className="border-b-2 border-slate-900 pb-5 mb-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {settings?.logo_url ? (
                            <img
                              src={settings.logo_url}
                              alt="Logo"
                              className="max-h-16 max-w-[130px] object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                              WC
                            </div>
                          )}
                          <div>
                            <h1 className="text-xl font-black text-slate-900">
                              {settings?.company_name || 'مؤسسة وي كير لخدمات العناية بالسيارات والمنشآت'}
                            </h1>
                            <p className="text-xs font-bold text-teal-800 mt-0.5">
                              جدول مهام وزيارات العمل الميدانية
                            </p>
                          </div>
                        </div>

                        <div className="text-left text-xs font-bold text-slate-600 space-y-1">
                          <div>
                            تاريخ الطباعة:{' '}
                            <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
                          </div>
                          <div>
                            المدة:{' '}
                            <span className="font-mono text-slate-900 font-bold">
                              من {dateFrom || 'البداية'} إلى {dateTo || 'النهاية'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Worker Identity Box */}
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 font-bold block text-[11px]">اسم الموظف / العامل:</span>
                          <strong className="text-slate-900 text-sm">{emp.full_name}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[11px]">الدور الوظيفي:</span>
                          <strong className="text-slate-800">{roleText}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[11px]">رقم هاتف العامل:</span>
                          <strong className="font-mono text-slate-800">{emp.phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[11px]">عدد المهام والزيارات:</span>
                          <strong className="text-teal-800 font-black text-sm">
                            {empVisits.length} زيارة عمل
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Table of Visits */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-black border border-slate-400">
                            <th className="p-2 border border-slate-300 text-center w-8">م</th>
                            <th className="p-2 border border-slate-300 w-28">اليوم والتاريخ</th>
                            <th className="p-2 border border-slate-300 w-24">الوقت</th>
                            <th className="p-2 border border-slate-300 w-32">اسم العميل</th>
                            <th className="p-2 border border-slate-300 w-28">هاتف العميل</th>
                            <th className="p-2 border border-slate-300">عنوان العميل بالكامل</th>
                            <th className="p-2 border border-slate-300 w-36">الخدمة والسيارة</th>
                            <th className="p-2 border border-slate-300 w-24 text-center">توقيع العميل / الإنجاز</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empVisits.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="p-6 text-center text-slate-500 border border-slate-300 font-bold"
                              >
                                لا توجد زيارات مسجلة للموظف ضمن هذه الفترة
                              </td>
                            </tr>
                          ) : (
                            empVisits.map((vis, idx) => {
                              const cust = getCustomer(vis.customer_id);
                              const address = getCustomerAddress(vis.customer_id);
                              const vehInfo = getVehicleDetails(vis.subscription_id);

                              return (
                                <tr key={vis.id} className="border border-slate-300 even:bg-slate-50/50">
                                  <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border border-slate-300 font-bold text-slate-900">
                                    <div>{vis.day_of_week || ''}</div>
                                    <div className="font-mono text-[11px] text-slate-600">{vis.scheduled_date}</div>
                                  </td>
                                  <td className="p-2 border border-slate-300 font-mono text-[11px] text-slate-800">
                                    {vis.scheduled_time_from || '—'}{' '}
                                    {vis.scheduled_time_to ? `إلى ${vis.scheduled_time_to}` : ''}
                                  </td>
                                  <td className="p-2 border border-slate-300 font-bold text-slate-900">
                                    {cust?.full_name || 'عميل غير مسجل'}
                                  </td>
                                  <td className="p-2 border border-slate-300 font-mono text-xs text-slate-700" dir="ltr">
                                    {cust?.phone || '—'}
                                  </td>
                                  <td className="p-2 border border-slate-300 text-slate-800 text-[11px] leading-tight font-medium">
                                    {address}
                                  </td>
                                  <td className="p-2 border border-slate-300 text-[11px]">
                                    <span className="font-bold text-slate-900 block">{vis.service_type || 'غسيل'}</span>
                                    {vehInfo && <span className="text-[10px] text-slate-600 block">{vehInfo}</span>}
                                  </td>
                                  <td className="p-2 border border-slate-300 text-center">
                                    {vis.status === 'completed' ? (
                                      <span className="text-[10px] font-bold text-emerald-800">✓ تم الإنجاز</span>
                                    ) : (
                                      <div className="w-16 h-8 mx-auto border border-dashed border-slate-400 rounded"></div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures & Instructions */}
                    <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-700">
                      <div className="grid grid-cols-2 gap-8 text-center pt-4">
                        <div className="space-y-8">
                          <p className="font-bold">توقيع الموظف / العامل:</p>
                          <p className="border-b border-slate-400 max-w-[200px] mx-auto"></p>
                        </div>
                        <div className="space-y-8">
                          <p className="font-bold">توقيع المشرف / إدارة التشغيل:</p>
                          <p className="border-b border-slate-400 max-w-[200px] mx-auto"></p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center mt-6">
                        * تنبيه: يرجى التوجه للعملاء في المواعيد المقررة والتأكد من إنجاز المهام وفق معايير الجودة المعتمدة.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
