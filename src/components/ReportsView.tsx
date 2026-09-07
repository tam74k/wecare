import React, { useState } from 'react';
import {
  Subscription,
  Visit,
  Customer,
  Employee,
  CoverageArea,
  Package,
  InventoryItem,
  Settings
} from '../types/database';
import {
  FileBarChart,
  Filter,
  Download,
  Printer,
  Calendar,
  Coins,
  MapPin,
  User,
  Package as PackageIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ReportsViewProps {
  subscriptions: Subscription[];
  visits: Visit[];
  customers: Customer[];
  employees: Employee[];
  coverageAreas: CoverageArea[];
  packages: Package[];
  inventoryItems: InventoryItem[];
  settings: Settings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  subscriptions,
  visits,
  customers,
  employees,
  coverageAreas,
  packages,
  inventoryItems,
  settings
}) => {
  // Filters State
  const [filterType, setFilterType] = useState<'visits' | 'subscriptions' | 'financial'>('visits');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (filterType === 'visits') {
      headers = ['تاريخ الزيارة', 'الوقت', 'العميل', 'الهاتف', 'المنطقة', 'العامل المسؤول', 'الحالة'];
      rows = filteredVisits.map((v) => {
        const cust = customers.find((c) => c.id === v.customer_id);
        const worker = employees.find((e) => e.id === v.assigned_worker_id);
        const sub = subscriptions.find((s) => s.id === v.subscription_id);
        const area = coverageAreas.find((a) => a.id === sub?.area_id);
        return [
          v.scheduled_date,
          `${v.scheduled_time_from} - ${v.scheduled_time_to}`,
          cust?.full_name || '',
          cust?.phone || '',
          area?.name || '',
          worker?.full_name || '',
          v.status
        ];
      });
    } else {
      headers = ['العميل', 'الهاتف', 'الباقة', 'الكمبوند', 'تاريخ البدء', 'تاريخ الانتهاء', 'السعر', 'الحالة'];
      rows = filteredSubscriptions.map((s) => {
        const cust = customers.find((c) => c.id === s.customer_id);
        const pkg = packages.find((p) => p.id === s.package_id);
        const area = coverageAreas.find((a) => a.id === s.area_id);
        return [
          cust?.full_name || '',
          cust?.phone || '',
          pkg?.name || '',
          area?.name || '',
          s.start_date,
          s.end_date,
          `${s.total_price} ${settings.currency_symbol}`,
          s.status
        ];
      });
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeCompanyName = (settings.company_name || 'wecare').replace(/\s+/g, '_');
    link.setAttribute('download', `${safeCompanyName}_report_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Visits
  const filteredVisits = visits.filter((v) => {
    if (dateFrom && v.scheduled_date < dateFrom) return false;
    if (dateTo && v.scheduled_date > dateTo) return false;
    if (selectedWorkerId && v.assigned_worker_id !== selectedWorkerId) return false;
    if (selectedStatus && v.status !== selectedStatus) return false;
    if (selectedAreaId) {
      const sub = subscriptions.find((s) => s.id === v.subscription_id);
      if (sub && sub.area_id !== selectedAreaId) return false;
    }
    return true;
  });

  // Filtered Subscriptions
  const filteredSubscriptions = subscriptions.filter((s) => {
    if (dateFrom && s.start_date < dateFrom) return false;
    if (dateTo && s.end_date > dateTo) return false;
    if (selectedAreaId && s.area_id !== selectedAreaId) return false;
    if (selectedWorkerId && s.assigned_worker_id !== selectedWorkerId) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    if (selectedPackageId && s.package_id !== selectedPackageId) return false;
    return true;
  });

  // Financial calculations
  const totalRevenue = filteredSubscriptions
    .filter((s) => s.status === 'active' || s.status === 'expired')
    .reduce((sum, s) => sum + Number(s.total_price || 0), 0);

  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.full_name || '-';
  const getCustomerPhone = (id: string) => customers.find((c) => c.id === id)?.phone || '-';
  const getWorkerName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'غير معين';
  const getAreaName = (id?: string) => coverageAreas.find((a) => a.id === id)?.name || '-';
  const getPackageName = (id: string) => packages.find((p) => p.id === id)?.name || '-';

  const reportTitle =
    filterType === 'visits'
      ? 'تقرير الزيارات الميدانية المجدولة والتنفيذية'
      : filterType === 'subscriptions'
      ? 'تقرير الاشتراكات والعقود التشغيلية'
      : 'التقرير المالي وحصيلة الإيرادات';

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Official Print Letterhead - Appears ONLY when printing */}
      <div className="hidden print-only print:flex flex-col border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.company_name}
                className="w-16 h-16 object-contain rounded-lg border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 text-white font-black text-2xl flex items-center justify-center rounded-lg">
                WC
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900">{settings.company_name}</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                الدولة: {settings.country} • العملة: {settings.currency_symbol} ({settings.currency_code})
              </p>
            </div>
          </div>
          <div className="text-left text-xs text-slate-600 font-mono">
            <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>الوقت: {new Date().toLocaleTimeString('ar-EG')}</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">{reportTitle}</h2>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-slate-600 font-medium">
              الفترة: {dateFrom || 'البداية'} إلى {dateTo || 'الآن'}
            </span>
          )}
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900">مركز التقارير والتحليلات الشاملة</h2>
          <p className="text-sm text-slate-500 mt-1">
            استخراج تقارير قابلة للتصفية بالتواريخ، المناطق، العمال، وحالات الزيارات والاشتراكات
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-800 text-xs uppercase">معايير التصفية والفرز المتقدم</h3>
        </div>

        {/* Report Type */}
        <div className="flex gap-2">
          {[
            { id: 'visits', label: 'تقرير الزيارات الميدانية' },
            { id: 'subscriptions', label: 'تقرير الاشتراكات والعقود' },
            { id: 'financial', label: 'التقرير المالي والإيرادات' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === t.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمبوند / المنطقة</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value="">كافة المناطق</option>
              {coverageAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">العامل المسؤول</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value="">كافة العمال</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(dateFrom || dateTo || selectedAreaId || selectedWorkerId || selectedStatus) && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedAreaId('');
                setSelectedWorkerId('');
                setSelectedStatus('');
                setSelectedPackageId('');
              }}
              className="text-xs text-rose-600 hover:underline font-bold"
            >
              إعادة تعيين كافة الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Counters for filtered data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-bold mb-1">الزيارات المشمولة</p>
          <h4 className="text-2xl font-black text-slate-800 font-mono">{filteredVisits.length}</h4>
          <span className="text-[11px] text-teal-600 font-semibold">
            منها {filteredVisits.filter((v) => v.status === 'completed').length} مكتملة
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-bold mb-1">الاشتراكات المشمولة</p>
          <h4 className="text-2xl font-black text-slate-800 font-mono">{filteredSubscriptions.length}</h4>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {filteredSubscriptions.filter((s) => s.status === 'active').length} نشطة حالياً
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-bold mb-1">إجمالي الإيراد المالي</p>
          <h4 className="text-2xl font-black text-emerald-700 font-mono">
            {totalRevenue.toLocaleString()} {settings.currency_symbol}
          </h4>
          <span className="text-[11px] text-slate-400 font-medium">العملة: {settings.currency_code}</span>
        </div>
      </div>

      {/* Report Data Display Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filterType === 'visits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">تاريخ الزيارة</th>
                  <th className="p-4">الوقت المجدول</th>
                  <th className="p-4">اسم العميل</th>
                  <th className="p-4">الهاتف</th>
                  <th className="p-4">العامل المسؤول</th>
                  <th className="p-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-900">{v.scheduled_date}</td>
                    <td className="p-4 font-mono">{v.scheduled_time_from} - {v.scheduled_time_to}</td>
                    <td className="p-4 font-bold text-slate-800">{getCustomerName(v.customer_id)}</td>
                    <td className="p-4 font-mono">{getCustomerPhone(v.customer_id)}</td>
                    <td className="p-4 text-teal-800 font-bold">{getWorkerName(v.assigned_worker_id)}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(filterType === 'subscriptions' || filterType === 'financial') && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">العميل</th>
                  <th className="p-4">الهاتف</th>
                  <th className="p-4">الباقة</th>
                  <th className="p-4">الكمبوند</th>
                  <th className="p-4">الفترة</th>
                  <th className="p-4">قيمة الاشتراك ({settings.currency_symbol})</th>
                  <th className="p-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                {filteredSubscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">{getCustomerName(s.customer_id)}</td>
                    <td className="p-4 font-mono">{getCustomerPhone(s.customer_id)}</td>
                    <td className="p-4">{getPackageName(s.package_id)}</td>
                    <td className="p-4">{getAreaName(s.area_id)}</td>
                    <td className="p-4 font-mono text-[11px]">
                      من {s.start_date} إلى {s.end_date}
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-700">
                      {s.total_price} {settings.currency_symbol}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
