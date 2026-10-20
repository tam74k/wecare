import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Subscription,
  Visit,
  Customer,
  Employee,
  CoverageArea,
  Package,
  InventoryItem,
  Settings,
  Vehicle
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
  Clock,
  Search,
  X,
  Star,
  Car,
  Building,
  AlertTriangle,
  AlertCircle,
  Phone,
  Sparkles,
  ChevronDown,
  Check,
  RefreshCw,
  Users
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
  vehicles?: Vehicle[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  subscriptions,
  visits,
  customers,
  employees,
  coverageAreas,
  packages,
  inventoryItems,
  settings,
  vehicles = []
}) => {
  // Filters State
  const [filterType, setFilterType] = useState<'customer_visits' | 'visits' | 'subscriptions' | 'financial'>('customer_visits');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    // الافتراضي بداية الشهر الحالي
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    // الافتراضي نهاية الشهر الحالي
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  // بحث الإكمال التلقائي للعميل
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق قائمة البحث عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // قائمة العملاء المطابقة للبحث
  const matchingCustomers = useMemo(() => {
    const term = customerSearchTerm.toLowerCase().trim();
    if (!term) return customers.slice(0, 15);

    return customers.filter((c) => {
      const name = (c.full_name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const bld = (c.building_number || '').toLowerCase();
      const area = coverageAreas.find((a) => a.id === c.area_id)?.name.toLowerCase() || '';
      const custVehs = vehicles.filter((v) => v.customer_id === c.id);
      const plateMatch = custVehs.some((v) => (v.plate_number || '').toLowerCase().includes(term));
      return name.includes(term) || phone.includes(term) || bld.includes(term) || area.includes(term) || plateMatch;
    }).slice(0, 20);
  }, [customers, customerSearchTerm, coverageAreas, vehicles]);

  // العميل المحدد حالياً
  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // دوال مساعدة لاسترجاع البيانات
  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.full_name || '-';
  const getCustomerPhone = (id: string) => customers.find((c) => c.id === id)?.phone || '-';
  const getWorkerName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'غير معين';
  const getAreaName = (id?: string) => coverageAreas.find((a) => a.id === id)?.name || '-';
  const getPackageName = (id: string) => packages.find((p) => p.id === id)?.name || '-';

  const getVisitVehicle = (v: Visit) => {
    const sub = subscriptions.find((s) => s.id === v.subscription_id);
    const vehId = (v as any).vehicle_id || sub?.vehicle_id;
    if (vehId) {
      const found = vehicles.find((veh) => veh.id === vehId);
      if (found) return found;
    }
    return vehicles.find((veh) => veh.customer_id === v.customer_id);
  };

  const getCustomerVehicles = (customerId: string) => {
    return vehicles.filter((v) => v.customer_id === customerId);
  };

  const getCustomerActiveSub = (customerId: string) => {
    return subscriptions.find(
      (s) => s.customer_id === customerId && (s.status === 'active' || s.status === 'pending')
    );
  };

  // فلاتر الزيارات العادية
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
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
  }, [visits, dateFrom, dateTo, selectedWorkerId, selectedStatus, selectedAreaId, subscriptions]);

  // فلاتر الاشتراكات
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      if (dateFrom && s.start_date < dateFrom) return false;
      if (dateTo && s.end_date > dateTo) return false;
      if (selectedAreaId && s.area_id !== selectedAreaId) return false;
      if (selectedWorkerId && s.assigned_worker_id !== selectedWorkerId) return false;
      if (selectedStatus && s.status !== selectedStatus) return false;
      if (selectedPackageId && s.package_id !== selectedPackageId) return false;
      return true;
    });
  }, [subscriptions, dateFrom, dateTo, selectedAreaId, selectedWorkerId, selectedStatus, selectedPackageId]);

  // الحسابات المالية
  const totalRevenue = useMemo(() => {
    return filteredSubscriptions
      .filter((s) => s.status === 'active' || s.status === 'expired')
      .reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  }, [filteredSubscriptions]);

  // تجميع الزيارات بالعميل لتقرير زيارات العملاء
  const customerGroupedVisits = useMemo(() => {
    // 1. فلترة الزيارات بالمعايير
    const matchedVisits = visits.filter((v) => {
      if (dateFrom && v.scheduled_date < dateFrom) return false;
      if (dateTo && v.scheduled_date > dateTo) return false;
      if (selectedCustomerId && v.customer_id !== selectedCustomerId) return false;
      if (selectedWorkerId && v.assigned_worker_id !== selectedWorkerId) return false;
      if (selectedStatus && v.status !== selectedStatus) return false;
      if (selectedAreaId) {
        const sub = subscriptions.find((s) => s.id === v.subscription_id);
        const cust = customers.find((c) => c.id === v.customer_id);
        const areaId = sub?.area_id || cust?.area_id;
        if (areaId !== selectedAreaId) return false;
      }
      return true;
    });

    // 2. تجميع حسب معرف العميل
    const groupsMap = new Map<string, Visit[]>();
    matchedVisits.forEach((v) => {
      const list = groupsMap.get(v.customer_id) || [];
      list.push(v);
      groupsMap.set(v.customer_id, list);
    });

    // 3. ترتيب الزيارات داخل كل عميل بحسب التاريخ تصاعدياً
    const result = Array.from(groupsMap.entries())
      .map(([custId, cVisits]) => {
        const cust = customers.find((c) => c.id === custId);
        const sorted = [...cVisits].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
        return {
          customer: cust,
          customerId: custId,
          visits: sorted,
          completedCount: sorted.filter((v) => v.status === 'completed').length,
          scheduledCount: sorted.filter((v) => v.status === 'scheduled').length,
          postponedCount: sorted.filter((v) => v.status === 'postponed').length,
          cancelledCount: sorted.filter((v) => v.status === 'cancelled').length
        };
      })
      .filter((g) => g.customer !== undefined)
      .sort((a, b) => (a.customer?.full_name || '').localeCompare(b.customer?.full_name || ''));

    return result;
  }, [visits, dateFrom, dateTo, selectedCustomerId, selectedWorkerId, selectedStatus, selectedAreaId, subscriptions, customers]);

  // إجمالي الإحصائيات لتقرير زيارات العملاء
  const customerVisitsStats = useMemo(() => {
    let totalV = 0;
    let completedV = 0;
    let scheduledV = 0;
    let postponedV = 0;
    let cancelledV = 0;

    customerGroupedVisits.forEach((g) => {
      totalV += g.visits.length;
      completedV += g.completedCount;
      scheduledV += g.scheduledCount;
      postponedV += g.postponedCount;
      cancelledV += g.cancelledCount;
    });

    return {
      customersCount: customerGroupedVisits.length,
      totalV,
      completedV,
      scheduledV,
      postponedV,
      cancelledV
    };
  }, [customerGroupedVisits]);

  // طباعة
  const handlePrint = () => {
    window.print();
  };

  // تصدير CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (filterType === 'customer_visits') {
      headers = [
        'اسم العميل',
        'الهاتف',
        'المنطقة/الكمبوند',
        'العمارة/العنوان',
        'تاريخ الزيارة',
        'اليوم',
        'التوقيت المجدول',
        'نوع الزيارة والخدمة',
        'المركبة',
        'رقم اللوحة',
        'حالة الزيارة وما تم فيها',
        'تاريخ التأجيل السابق',
        'سبب التأجيل',
        'تاريخ ووقت الإتمام',
        'الفني المسؤول',
        'التقييم',
        'تعليق العميل',
        'الملاحظات'
      ];

      customerGroupedVisits.forEach((g) => {
        const cust = g.customer;
        const area = coverageAreas.find((a) => a.id === cust?.area_id);
        const bld = `عمارة ${cust?.building_number || ''} ${cust?.block_number ? `- مجموعة ${cust.block_number}` : ''}`;

        g.visits.forEach((v) => {
          const veh = getVisitVehicle(v);
          const vehDesc = veh ? `${veh.vehicle_type || ''} ${veh.color ? `(${veh.color})` : ''}`.trim() : '';
          const sub = subscriptions.find((s) => s.id === v.subscription_id);
          const pkg = packages.find((p) => p.id === sub?.package_id);
          const serviceType = v.service_type || pkg?.name || 'غسيل';

          let statusDetail = '';
          if (v.status === 'completed') statusDetail = 'تم التنفيذ بنجاح';
          else if (v.status === 'scheduled') statusDetail = 'مجدولة (بانتظار الموعد)';
          else if (v.status === 'postponed') statusDetail = `مؤجلة إلى ${v.scheduled_date}`;
          else if (v.status === 'cancelled') statusDetail = 'ملغاة';
          else statusDetail = v.status;

          rows.push([
            cust?.full_name || '',
            cust?.phone || '',
            area?.name || '',
            bld,
            v.scheduled_date,
            v.day_of_week || '',
            `${v.scheduled_time_from || ''} - ${v.scheduled_time_to || ''}`,
            serviceType,
            vehDesc,
            veh?.plate_number || '',
            statusDetail,
            v.postponed_from_date || '',
            v.postponed_reason || '',
            v.completed_at ? new Date(v.completed_at).toLocaleString('ar-EG') : '',
            getWorkerName(v.assigned_worker_id),
            v.rating ? `${v.rating} نجوم` : '',
            v.rating_comment || '',
            v.notes || ''
          ]);
        });
      });
    } else if (filterType === 'visits') {
      headers = ['تاريخ الزيارة', 'الوقت', 'العميل', 'الهاتف', 'المنطقة', 'العامل المسؤول', 'الحالة'];
      rows = filteredVisits.map((v) => {
        const cust = customers.find((c) => c.id === v.customer_id);
        const worker = employees.find((e) => e.id === v.assigned_worker_id);
        const sub = subscriptions.find((s) => s.id === v.subscription_id);
        const area = coverageAreas.find((a) => a.id === sub?.area_id);
        return [
          v.scheduled_date,
          `${v.scheduled_time_from || ''} - ${v.scheduled_time_to || ''}`,
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
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeCompanyName = (settings.company_name || 'wecare').replace(/\s+/g, '_');
    link.setAttribute('download', `${safeCompanyName}_report_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportTitle =
    filterType === 'customer_visits'
      ? selectedCustomerObj
        ? `تقرير زيارات العميل: ${selectedCustomerObj.full_name}`
        : 'تقرير زيارات العملاء التفصيلي (تجميع بالعميل)'
      : filterType === 'visits'
      ? 'تقرير الزيارات الميدانية المجدولة والتنفيذية'
      : filterType === 'subscriptions'
      ? 'تقرير الاشتراكات والعقود التشغيلية'
      : 'التقرير المالي وحصيلة الإيرادات';

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl pb-12">
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
              الفترة: من {dateFrom || 'البداية'} إلى {dateTo || 'الآن'}
            </span>
          )}
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900">مركز التقارير والتحليلات الشاملة</h2>
          <p className="text-sm text-slate-500 mt-1">
            استخراج تقارير قابلة للتجميع باسم العميل والتواريخ، وتوضيح ما تم في كل زيارة بالتفصيل
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase">معايير التصفية والفرز المتقدم</h3>
          </div>
          {(dateFrom || dateTo || selectedAreaId || selectedWorkerId || selectedStatus || selectedCustomerId) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedAreaId('');
                setSelectedWorkerId('');
                setSelectedStatus('');
                setSelectedPackageId('');
                setSelectedCustomerId('');
                setCustomerSearchTerm('');
              }}
              className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة تعيين كافة الفلاتر</span>
            </button>
          )}
        </div>

        {/* Report Type Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'customer_visits', label: '📊 تقرير زيارات العملاء (تجميع بالعميل)' },
            { id: 'visits', label: 'جدول الزيارات العام' },
            { id: 'subscriptions', label: 'تقرير الاشتراكات والعقود' },
            { id: 'financial', label: 'التقرير المالي والإيرادات' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === t.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Customer Autocomplete Search Bar - Highlighted when in customer_visits mode */}
        <div className="pt-1">
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>تحديد عميل محدد للتقرير (نظام الإكمال التلقائي):</span>
              </label>
              {selectedCustomerId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerSearchTerm('');
                  }}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-200 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>إلغاء التحديد وعرض كافة العملاء</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  اترك الحقل فارغاً لعرض كافة العملاء أو اكتب للبحث التلقائي
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setIsCustomerDropdownOpen(true);
                  if (!e.target.value.trim()) {
                    setSelectedCustomerId('');
                  }
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                placeholder="ابحث بالاسم أو رقم الهاتف أو العمارة أو رقم لوحة السيارة..."
                className={`w-full pr-10 pl-10 py-2.5 text-xs bg-slate-50 border rounded-xl font-medium transition-all ${
                  selectedCustomerId
                    ? 'border-teal-500 bg-teal-50/30 text-teal-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:bg-white'
                }`}
              />
              {customerSearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchTerm('');
                    setSelectedCustomerId('');
                  }}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Floating Autocomplete Dropdown */}
            {isCustomerDropdownOpen && matchingCustomers.length > 0 && (
              <div className="absolute z-30 mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center justify-between border-b border-slate-100">
                  <span>النتائج المطابقة ({matchingCustomers.length})</span>
                  <button
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearchTerm('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="text-teal-700 hover:underline cursor-pointer"
                  >
                    عرض كافة العملاء
                  </button>
                </div>
                {matchingCustomers.map((c) => {
                  const area = coverageAreas.find((a) => a.id === c.area_id);
                  const custVehs = vehicles.filter((v) => v.customer_id === c.id);
                  const isSelected = c.id === selectedCustomerId;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearchTerm(c.full_name);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className={`p-3 hover:bg-teal-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                        isSelected ? 'bg-teal-50 font-bold text-teal-900' : 'text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.full_name}</span>
                          {isSelected && <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.2 rounded-md font-bold">محدد</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                          <span className="font-mono">{c.phone}</span>
                          {area && <span>• {area.name}</span>}
                          {c.building_number && <span>• عمارة {c.building_number}</span>}
                          {custVehs.length > 0 && (
                            <span className="text-teal-700 font-mono">
                              • لوحة: {custVehs.map((v) => v.plate_number).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-teal-600 font-bold">اختيار</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمبوند / المنطقة</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">حالة الزيارة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              <option value="">كافة الحالات</option>
              <option value="completed">تم التنفيذ بنجاح</option>
              <option value="scheduled">مجدولة (لم يأتِ موعدها)</option>
              <option value="postponed">مؤجلة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400">فترات سريعة:</span>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
              setDateTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            هذا الشهر
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              setDateFrom(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]);
              setDateTo(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            الشهر السابق
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setDateFrom(today);
              setDateTo(today);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            زيارات اليوم
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            كافة التواريخ
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      {filterType === 'customer_visits' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-[11px] text-slate-500 font-bold mb-1">العملاء المشمولون</p>
            <h4 className="text-xl font-black text-slate-800 font-mono">{customerVisitsStats.customersCount}</h4>
            <span className="text-[10px] text-slate-400">عميل في التقرير</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-[11px] text-slate-500 font-bold mb-1">إجمالي الزيارات</p>
            <h4 className="text-xl font-black text-teal-800 font-mono">{customerVisitsStats.totalV}</h4>
            <span className="text-[10px] text-teal-600 font-semibold">خلال الفترة المحددة</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] text-emerald-700 font-bold mb-1">تم التنفيذ بنجاح</p>
            <h4 className="text-xl font-black text-emerald-700 font-mono">{customerVisitsStats.completedV}</h4>
            <span className="text-[10px] text-emerald-600 font-semibold">غسلة منفذة</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 bg-sky-50/20 shadow-xs">
            <p className="text-[11px] text-sky-700 font-bold mb-1">مجدولة قادمة</p>
            <h4 className="text-xl font-black text-sky-700 font-mono">{customerVisitsStats.scheduledV}</h4>
            <span className="text-[10px] text-sky-600 font-semibold">بانتظار الموعد</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-xs">
            <p className="text-[11px] text-amber-700 font-bold mb-1">مؤجلة</p>
            <h4 className="text-xl font-black text-amber-700 font-mono">{customerVisitsStats.postponedV}</h4>
            <span className="text-[10px] text-amber-600 font-semibold">نقلت لموعد آخر</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-xs">
            <p className="text-[11px] text-rose-700 font-bold mb-1">ملغاة</p>
            <h4 className="text-xl font-black text-rose-700 font-mono">{customerVisitsStats.cancelledV}</h4>
            <span className="text-[10px] text-rose-600 font-semibold">تم إلغاؤها</span>
          </div>
        </div>
      ) : (
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
      )}

      {/* ========================================================================= */}
      {/* ===================== TAB 1: CUSTOMER GROUPED VISITS ===================== */}
      {/* ========================================================================= */}
      {filterType === 'customer_visits' && (
        <div className="space-y-6">
          {customerGroupedVisits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">لا توجد زيارات مسجلة تطابق هذه المعايير</h3>
              <p className="text-xs text-slate-500">
                {selectedCustomerId
                  ? 'العميل المحدد ليس لديه زيارات مسجلة خلال الفترة الزمنية أو معايير الفلترة المختارة.'
                  : 'يرجى تغيير نطاق التواريخ أو إزالة الفلاتر لعرض البيانات.'}
              </p>
            </div>
          ) : (
            customerGroupedVisits.map((group, groupIdx) => {
              const cust = group.customer!;
              const custVehicles = getCustomerVehicles(cust.id);
              const activeSub = getCustomerActiveSub(cust.id);
              const area = coverageAreas.find((a) => a.id === cust.area_id);
              const pkg = packages.find((p) => p.id === activeSub?.package_id);

              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid print:border-slate-300 print:mb-6"
                >
                  {/* Customer Group Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                          {groupIdx + 1}
                        </span>
                        <h3 className="text-base font-black tracking-wide">{cust.full_name}</h3>
                        <span className="text-xs font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-teal-200">
                          {cust.phone}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        {area && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-400" />
                            <span>{area.name}</span>
                          </span>
                        )}
                        {(cust.building_number || cust.detailed_address) && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-teal-400" />
                            <span>
                              عمارة {cust.building_number} {cust.block_number ? `(مجموعة ${cust.block_number})` : ''}
                            </span>
                          </span>
                        )}
                        {custVehicles.length > 0 && (
                          <span className="flex items-center gap-1 text-teal-300">
                            <Car className="w-3.5 h-3.5" />
                            <span>
                              {custVehicles.map((v) => `${v.plate_number} (${v.vehicle_type || 'سيارة'})`).join(' • ')}
                            </span>
                          </span>
                        )}
                        {pkg && (
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            <PackageIcon className="w-3.5 h-3.5" />
                            <span>باقة: {pkg.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer Group Mini Stats */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <div className="px-2.5 py-1 bg-white/10 rounded-xl text-center">
                        <span className="text-[10px] block text-slate-300">الإجمالي</span>
                        <strong className="text-xs font-black font-mono">{group.visits.length}</strong>
                      </div>
                      <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-center">
                        <span className="text-[10px] block">منفذة</span>
                        <strong className="text-xs font-black font-mono">{group.completedCount}</strong>
                      </div>
                      <div className="px-2.5 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-center">
                        <span className="text-[10px] block">مجدولة</span>
                        <strong className="text-xs font-black font-mono">{group.scheduledCount}</strong>
                      </div>
                      {group.postponedCount > 0 && (
                        <div className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-center">
                          <span className="text-[10px] block">مؤجلة</span>
                          <strong className="text-xs font-black font-mono">{group.postponedCount}</strong>
                        </div>
                      )}
                      {group.cancelledCount > 0 && (
                        <div className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-center">
                          <span className="text-[10px] block">ملغاة</span>
                          <strong className="text-xs font-black font-mono">{group.cancelledCount}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Visits Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-10 text-center">#</th>
                          <th className="p-3">تاريخ واليوم والوقت</th>
                          <th className="p-3">نوع الزيارة / الخدمة</th>
                          <th className="p-3">المركبة</th>
                          <th className="p-3">حالة وما تم في الزيارة</th>
                          <th className="p-3">الفني المسؤول</th>
                          <th className="p-3">الملاحظات والتقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {group.visits.map((v, vIdx) => {
                          const veh = getVisitVehicle(v);
                          const sub = subscriptions.find((s) => s.id === v.subscription_id);
                          const vPkg = packages.find((p) => p.id === sub?.package_id);
                          const serviceType = v.service_type || vPkg?.name || 'غسيل';

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Serial */}
                              <td className="p-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                                {vIdx + 1}
                              </td>

                              {/* Date & Time */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="font-mono font-black text-slate-900 text-xs flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                    <span>{v.scheduled_date}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                    {v.day_of_week && <span className="font-bold text-teal-800">{v.day_of_week}</span>}
                                    {(v.scheduled_time_from || v.scheduled_time_to) && (
                                      <span className="font-mono">
                                        ({v.scheduled_time_from || ''} - {v.scheduled_time_to || ''})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Service Type */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-900 border border-teal-200 rounded-lg font-bold text-[11px]">
                                  <Sparkles className="w-3 h-3 text-teal-600" />
                                  <span>{serviceType}</span>
                                </span>
                              </td>

                              {/* Vehicle */}
                              <td className="p-3 whitespace-nowrap">
                                {veh ? (
                                  <div className="space-y-0.5">
                                    <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                                      <Car className="w-3 h-3 text-slate-400" />
                                      <span>{veh.plate_number}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {veh.vehicle_type || 'سيارة'} {veh.color ? `• ${veh.color}` : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )}
                              </td>

                              {/* What Happened in Visit Status */}
                              <td className="p-3">
                                {v.status === 'completed' && (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[11px]">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>✓ تم التنفيذ بنجاح</span>
                                    </span>
                                    {v.completed_at && (
                                      <p className="text-[10px] text-slate-500 font-mono">
                                        وقت الإتمام: {new Date(v.completed_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {v.status === 'scheduled' && (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded-md text-[11px]">
                                      <Clock className="w-3 h-3 text-sky-600" />
                                      <span>⏳ مجدولة (لم يأتِ موعدها بعد)</span>
                                    </span>
                                  </div>
                                )}

                                {v.status === 'postponed' && (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md text-[11px]">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      <span>⚠️ تم تأجيلها</span>
                                    </span>
                                    <div className="text-[10px] text-amber-800 space-y-0.5">
                                      {v.postponed_from_date && (
                                        <p>كانت مقررة في: <span className="font-mono font-bold">{v.postponed_from_date}</span></p>
                                      )}
                                      <p>الموعد الجديد: <span className="font-mono font-bold text-teal-800">{v.scheduled_date}</span></p>
                                      {v.postponed_reason && (
                                        <p className="text-slate-600">السبب: {v.postponed_reason}</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {v.status === 'cancelled' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[11px]">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span>❌ تم إلغاء الزيارة</span>
                                  </span>
                                )}

                                {v.status === 'in_progress' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md text-[11px]">
                                    <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                                    <span>جاري التنفيذ حالياً</span>
                                  </span>
                                )}
                              </td>

                              {/* Worker */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="text-slate-800 font-bold text-xs">
                                  {getWorkerName(v.assigned_worker_id)}
                                </span>
                              </td>

                              {/* Notes & Rating */}
                              <td className="p-3 min-w-[180px]">
                                <div className="space-y-1">
                                  {/* Star Rating if present */}
                                  {v.rating && v.rating > 0 && (
                                    <div className="flex items-center gap-1 bg-amber-50 p-1 rounded border border-amber-200 w-fit">
                                      <div className="flex text-amber-500">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className={`w-3 h-3 ${s <= (v.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[10px] font-bold text-amber-800">
                                        ({v.rating}/5)
                                      </span>
                                    </div>
                                  )}

                                  {/* Rating comment */}
                                  {v.rating_comment && (
                                    <p className="text-[11px] text-slate-700 italic bg-slate-50 p-1.5 rounded border border-slate-200">
                                      "{v.rating_comment}"
                                    </p>
                                  )}

                                  {/* Visit note */}
                                  {v.notes && (
                                    <p className="text-[10px] text-slate-500">
                                      {v.notes}
                                    </p>
                                  )}

                                  {(!v.rating || v.rating === 0) && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                                      بلا تقييم
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= TAB 2: GENERAL VISITS TABLE ====================== */}
      {/* ========================================================================= */}
      {filterType === 'visits' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">تاريخ الزيارة</th>
                  <th className="p-4">الوقت المجدول</th>
                  <th className="p-4">اسم العميل</th>
                  <th className="p-4">الهاتف</th>
                  <th className="p-4">نوع الخدمة</th>
                  <th className="p-4">العامل المسؤول</th>
                  <th className="p-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-900">{v.scheduled_date}</td>
                    <td className="p-4 font-mono">{v.scheduled_time_from || ''} - {v.scheduled_time_to || ''}</td>
                    <td className="p-4 font-bold text-slate-800">{getCustomerName(v.customer_id)}</td>
                    <td className="p-4 font-mono">{getCustomerPhone(v.customer_id)}</td>
                    <td className="p-4 text-teal-900 font-bold">{v.service_type || 'غسيل'}</td>
                    <td className="p-4 text-teal-800 font-bold">{getWorkerName(v.assigned_worker_id)}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold">{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================== TAB 3 & 4: SUBSCRIPTIONS & FINANCIAL ================= */}
      {/* ========================================================================= */}
      {(filterType === 'subscriptions' || filterType === 'financial') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
        </div>
      )}
    </div>
  );
};
