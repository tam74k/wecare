import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  InventoryItem,
  InventoryTransaction,
  Equipment,
  Employee,
  Settings,
  EquipmentCondition,
  InventoryTransactionType,
  Supplier
} from '../types/database';
import {
  Boxes,
  Plus,
  AlertTriangle,
  Wrench,
  PackageCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Coins,
  ShieldAlert,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
  Eye,
  Check,
  Loader2,
  Phone,
  Tag,
  Building,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import {
  importInventoryFromExcel,
  ExcelInventoryRow,
  InventoryImportResult,
  deleteInventoryItem as apiDeleteInventoryItem
} from '../services/api';

interface InventoryViewProps {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  equipment: Equipment[];
  employees: Employee[];
  suppliers?: Supplier[];
  settings: Settings;
  onCreateItem: (item: Omit<InventoryItem, 'id' | 'created_at'>) => Promise<InventoryItem>;
  onUpdateItem?: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onCreateTransaction: (tx: Omit<InventoryTransaction, 'id' | 'created_at'>) => Promise<InventoryTransaction>;
  onCreateEquipment: (eq: Omit<Equipment, 'id' | 'created_at'>) => Promise<Equipment>;
  onUpdateEquipment?: (id: string, updates: Partial<Equipment>) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  transactions,
  equipment,
  employees,
  suppliers = [],
  settings,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onCreateTransaction,
  onCreateEquipment,
  onUpdateEquipment,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'consumables' | 'equipment' | 'transactions'>('consumables');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // New Item State (Manual)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    item_code: '',
    name: '',
    category: '',
    brand: '',
    usage_location: '',
    unit: 'لتر',
    opening_stock: 0,
    current_stock: 0,
    min_alert_threshold: 5,
    unit_cost: 0,
    supplier_name: '',
    supplier_phone: '',
    status: 'متوفر',
    notes: '',
    is_active: true
  });

  // Edit Item State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ExcelInventoryRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<InventoryImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Transaction State
  const [newTx, setNewTx] = useState({
    item_id: items[0]?.id || '',
    type: 'worker_issuance' as InventoryTransactionType,
    quantity: 1,
    worker_id: employees[0]?.id || '',
    invoice_ref: '',
    notes: '',
    created_by: 'أمين المخزن'
  });

  // New Equipment State
  const [newEq, setNewEq] = useState({
    name: '',
    condition: 'ممتازة' as EquipmentCondition,
    quantity: 1,
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    depreciation_rate: 10,
    notes: '',
    is_active: true
  });

  // Derived lists
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category?.trim()) set.add(i.category.trim());
    });
    return Array.from(set);
  }, [items]);

  const locationsList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.usage_location?.trim()) set.add(i.usage_location.trim());
    });
    return Array.from(set);
  }, [items]);

  // Low stock calculation
  const lowStockItems = useMemo(() => {
    return items.filter((i) => Number(i.current_stock) <= Number(i.min_alert_threshold));
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.item_code && item.item_code.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(q)) ||
        (item.usage_location && item.usage_location.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchLocation = locationFilter === 'all' || item.usage_location === locationFilter;

      let matchStatus = true;
      const curr = Number(item.current_stock) || 0;
      const minTh = Number(item.min_alert_threshold) || 5;

      if (statusFilter === 'available') matchStatus = curr > minTh;
      else if (statusFilter === 'low') matchStatus = curr <= minTh && curr > 0;
      else if (statusFilter === 'out') matchStatus = curr <= 0;

      return matchSearch && matchCategory && matchLocation && matchStatus;
    });
  }, [items, searchQuery, categoryFilter, locationFilter, statusFilter]);

  // Paginated Items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Helper names
  const getItemName = (id: string) => items.find((i) => i.id === id)?.name || 'صنف غير محدد';
  const getWorkerName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'غير محدد';

  // Manual Item Creation
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    try {
      const openStock = Number(newItem.opening_stock) || Number(newItem.current_stock) || 0;
      await onCreateItem({
        item_code: newItem.item_code.trim() || undefined,
        name: newItem.name.trim(),
        category: newItem.category.trim() || undefined,
        brand: newItem.brand.trim() || undefined,
        usage_location: newItem.usage_location.trim() || undefined,
        unit: newItem.unit,
        opening_stock: openStock,
        current_stock: openStock,
        min_alert_threshold: Number(newItem.min_alert_threshold) || 5,
        unit_cost: Number(newItem.unit_cost) || 0,
        supplier_name: newItem.supplier_name.trim() || undefined,
        supplier_phone: newItem.supplier_phone.trim() || undefined,
        status: newItem.status,
        notes: newItem.notes.trim() || undefined,
        is_active: newItem.is_active
      });

      alert('تمت إضافة الصنف للمخزون بنجاح!');
      setIsManualModalOpen(false);
      setNewItem({
        item_code: '',
        name: '',
        category: '',
        brand: '',
        usage_location: '',
        unit: 'لتر',
        opening_stock: 0,
        current_stock: 0,
        min_alert_threshold: 5,
        unit_cost: 0,
        supplier_name: '',
        supplier_phone: '',
        status: 'متوفر',
        notes: '',
        is_active: true
      });
    } catch (err: any) {
      alert('حدث خطأ أثناء إضافة الصنف: ' + (err.message || ''));
    }
  };

  // Item Update
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsEditing(true);
      if (onUpdateItem) {
        await onUpdateItem(editingItem.id, editingItem);
      }
      alert('تم تحديث بيانات الصنف بنجاح!');
      setEditingItem(null);
    } catch (err: any) {
      alert('فشل تحديث بيانات الصنف: ' + (err.message || ''));
    } finally {
      setIsEditing(false);
    }
  };

  // Item Deletion
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsDeleting(true);
      if (onDeleteItem) {
        await onDeleteItem(deletingItem.id);
      } else {
        await apiDeleteInventoryItem(deletingItem.id);
        if (onRefreshData) await onRefreshData();
      }
      alert('تم حذف الصنف من المخزون بنجاح.');
      setDeletingItem(null);
    } catch (err: any) {
      alert('فشل حذف الصنف: ' + (err.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  // Transaction Creation
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.item_id || newTx.quantity <= 0) return;
    await onCreateTransaction(newTx);
    alert('تم تسجيل حركة المخزون وتحديث الكميات بنجاح!');
    setNewTx({
      item_id: items[0]?.id || '',
      type: 'worker_issuance',
      quantity: 1,
      worker_id: employees[0]?.id || '',
      invoice_ref: '',
      notes: '',
      created_by: 'أمين المخزن'
    });
    setActiveTab('consumables');
  };

  // Equipment Creation
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEq.name.trim()) return;
    await onCreateEquipment(newEq);
    alert('تم تسجيل المعدة بنجاح في سجل الأصول!');
    setNewEq({
      name: '',
      condition: 'ممتازة',
      quantity: 1,
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 0,
      depreciation_rate: 10,
      notes: '',
      is_active: true
    });
  };

  // ==============================================================================
  // دالة تصدير وتحميل نموذج إكسل تجريبي جاهز ومطابق للأعمدة المطلوبة
  // ==============================================================================
  const handleDownloadExcelTemplate = () => {
    try {
      const headers = [
        'م',
        'كود الصنف',
        'الصنف / المنتج',
        'النوع',
        'الماركة المقترحة',
        'مكان الاستخدام',
        'الوحدة',
        'الكمية',
        'حد إعادة الطلب',
        'الحالة',
        'المورد',
        'تليفون المورد',
        'ملاحظات'
      ];

      const sampleRow = [
        1,
        'WC-CW-001',
        'شامبو غسيل سيارات Wash & Wax',
        'كيماويات',
        'SONAX',
        'غسيل سيارات',
        'لتر',
        10,
        4,
        'متوفر',
        "ديتيلرز شوب Detailer's Shop",
        '01007888566',
        'يُخفف حسب تعليمات العبوة'
      ];

      const secondSampleRow = [
        2,
        'WC-TW-002',
        'فوط مايكروفايبر 40×40 سم',
        'أدوات استهلاكية',
        '3M',
        'تجفيف وتلميع',
        'قطعة',
        50,
        15,
        'متوفر',
        'الأهرام للتوريدات',
        '01123456789',
        'كثافة 450 GSM'
      ];

      const wsData = [headers, sampleRow, secondSampleRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // ضبط عرض الأعمدة
      ws['!cols'] = [
        { wch: 6 }, // م
        { wch: 15 }, // كود الصنف
        { wch: 35 }, // الصنف / المنتج
        { wch: 18 }, // النوع
        { wch: 18 }, // الماركة
        { wch: 20 }, // مكان الاستخدام
        { wch: 10 }, // الوحدة
        { wch: 10 }, // الكمية
        { wch: 15 }, // حد إعادة الطلب
        { wch: 12 }, // الحالة
        { wch: 30 }, // المورد
        { wch: 18 }, // تليفون المورد
        { wch: 30 } // ملاحظات
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'أصناف المخزون');
      XLSX.writeFile(wb, 'نموذج_أصناف_المخزون_وي_كير.xlsx');
    } catch (err: any) {
      alert('حدث خطأ أثناء تحميل النموذج: ' + (err.message || ''));
    }
  };

  // ==============================================================================
  // دالة قراءة وتحليل ملف الإكسل المرفوع
  // ==============================================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        // قراءة البيانات كمصفوفة كائنات
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('الملف فارغ أو لا يحتوي على صفوف بيانات.');
          return;
        }

        // تحويل وتعيين الأعمدة بدقة مع دعم المسميات المختلفة
        const mappedRows: ExcelInventoryRow[] = rawJson.map((row: any, idx: number) => {
          const findVal = (possibleKeys: string[]): any => {
            for (const key of possibleKeys) {
              for (const rowKey of Object.keys(row)) {
                if (rowKey.trim().toLowerCase() === key.toLowerCase()) {
                  return row[rowKey];
                }
              }
            }
            return '';
          };

          const itemCode = findVal(['كود الصنف', 'كود', 'الكود', 'code', 'item_code', 'sku']);
          const name = findVal(['الصنف / المنتج', 'الصنف', 'المنتج', 'اسم الصنف', 'اسم المنتج', 'name', 'item', 'product']);
          const category = findVal(['النوع', 'التصنيف', 'نوع الصنف', 'category', 'type']);
          const brand = findVal(['الماركة المقترحة', 'الماركة', 'ماركة', 'brand']);
          const usage = findVal(['مكان الاستخدام', 'الاستخدام', 'مكان استخدام', 'usage_location', 'location', 'usage']);
          const unit = findVal(['الوحدة', 'وحدة', 'وحدة القياس', 'unit']);
          const qty = findVal(['الكمية', 'رصيد أول المدة', 'الرصيد', 'كمية', 'quantity', 'qty', 'stock']);
          const reorder = findVal(['حد إعادة الطلب', 'حد الطلب', 'الحد الأدنى', 'حد التنبيه', 'reorder_level', 'min_alert_threshold']);
          const status = findVal(['الحالة', 'حالة', 'status']);
          const supplier = findVal(['المورد', 'اسم المورد', 'الشركة الموردة', 'supplier', 'supplier_name']);
          const supplierPhone = findVal(['تليفون المورد', 'هاتف المورد', 'رقم المورد', 'موبايل المورد', 'تليفون', 'supplier_phone', 'phone']);
          const notes = findVal(['ملاحظات', 'الملاحظات', 'البيان', 'notes', 'description']);

          return {
            index: idx + 1,
            item_code: itemCode ? String(itemCode).trim() : undefined,
            name: String(name || '').trim(),
            category: category ? String(category).trim() : undefined,
            brand: brand ? String(brand).trim() : undefined,
            usage_location: usage ? String(usage).trim() : undefined,
            unit: unit ? String(unit).trim() : 'قطعة',
            quantity: qty !== '' && !isNaN(Number(qty)) ? Number(qty) : 0,
            reorder_level: reorder !== '' && !isNaN(Number(reorder)) ? Number(reorder) : 5,
            status: status ? String(status).trim() : 'متوفر',
            supplier_name: supplier ? String(supplier).trim() : undefined,
            supplier_phone: supplierPhone ? String(supplierPhone).trim() : undefined,
            notes: notes ? String(notes).trim() : undefined
          };
        }).filter((r) => r.name.length > 0);

        if (mappedRows.length === 0) {
          alert('لم يتم العثور على عمود يحمل اسم الصنف أو أن أسماء الأصناف فارغة.');
          return;
        }

        setParsedRows(mappedRows);
        setIsImportModalOpen(true);
      } catch (err: any) {
        alert('حدث خطأ أثناء قراءة ملف الإكسل: ' + (err.message || 'يرجى التأكد من سلامة الملف'));
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // تحليل البيانات المرفوعة (الموردين الجدد والتصنيفات)
  const importAnalysis = useMemo(() => {
    if (!parsedRows.length) return null;

    const suppliersExtracted = new Set<string>();
    const newSuppliersList: { name: string; phone?: string }[] = [];
    const categoriesExtracted = new Set<string>();

    const existingSupNames = new Set(suppliers.map((s) => s.name.trim().toLowerCase()));

    parsedRows.forEach((r) => {
      if (r.supplier_name?.trim()) {
        const sName = r.supplier_name.trim();
        suppliersExtracted.add(sName);
        if (!existingSupNames.has(sName.toLowerCase())) {
          existingSupNames.add(sName.toLowerCase()); // لمنع التكرار في القائمة المعروضة
          newSuppliersList.push({ name: sName, phone: r.supplier_phone });
        }
      }
      if (r.category?.trim()) {
        categoriesExtracted.add(r.category.trim());
      }
    });

    return {
      totalItems: parsedRows.length,
      totalSuppliersCount: suppliersExtracted.size,
      newSuppliersCount: newSuppliersList.length,
      newSuppliersList,
      categoriesCount: categoriesExtracted.size,
      categoriesList: Array.from(categoriesExtracted)
    };
  }, [parsedRows, suppliers]);

  // تنفيذ الاستيراد الفعلي وحفظ البيانات
  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;

    try {
      setIsImporting(true);
      const res = await importInventoryFromExcel(parsedRows);
      setImportResult(res);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء استيراد البيانات: ' + (err.message || ''));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto" dir="rtl">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 text-teal-700 flex items-center justify-center shadow-xs">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                نظام إدارة المخزون والمعدات
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة الأصناف الاستهلاكية، رصيد أول المدة، تنبيهات النواقص، وربط الموردين وحركات الصرف
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('consumables')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'consumables'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>الأصناف الاستهلاكية</span>
            <span className="px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold">
              {items.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'equipment'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>سجل المعدات والآلات</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
              {equipment.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>حركات الصرف والإضافة</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-amber-950 block text-sm">
                تنبيه نواقص المخزون: {lowStockItems.length} صنف وصل لحد إعادة الطلب أو أوشك على النفاد!
              </span>
              <span className="text-[11px] text-amber-800">
                يرجى مراجعة الأصناف المنخفضة والتواصل مع الموردين لإصدار أوامر التوريد اللازمة.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('low')}
            className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer"
          >
            عرض النواقص فقط
          </button>
        </div>
      )}

      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* ==============================================================================
          TAB 1: Consumables Inventory
          ============================================================================== */}
      {activeTab === 'consumables' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>رفع واستيراد من ملف إكسل (Excel)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  title="تحميل ملف إكسل فارغ بنفس ترتيب الأعمدة المعتمدة"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>تحميل نموذج إكسل تجريبي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-black text-xs rounded-xl border border-teal-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>إضافة صنف يدوي</span>
                </button>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold">
                  إجمالي الأصناف: <strong className="text-slate-900 font-mono">{items.length}</strong>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold">
                  الموردين: <strong className="font-mono">{suppliers.length}</strong>
                </div>
                <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 font-bold">
                  التصنيفات: <strong className="font-mono">{categoriesList.length}</strong>
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الكود، الماركة، المورد..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">كافة التصنيفات / الأنواع</option>
                  {categoriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">كافة أماكن الاستخدام</option>
                  {locationsList.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">كافة حالات المخزون</option>
                  <option value="available">متوفر بشكل كافٍ</option>
                  <option value="low">ناقص (وصل لحد الطلب)</option>
                  <option value="out">نافد من المخزون (0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Consumables Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <span>جدول أرصدة المخزون</span>
                <span className="text-xs text-slate-400 font-normal">
                  (عرض {paginatedItems.length} من أصل {filteredItems.length} صنف)
                </span>
              </h3>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-3">
                <Boxes className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="font-bold text-slate-500">لا توجد أصناف تطابق معايير البحث الحالية.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>رفع أول ملف إكسل الآن</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-black border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-3">كود الصنف</th>
                      <th className="py-3.5 px-3">الصنف / المنتج</th>
                      <th className="py-3.5 px-3">النوع</th>
                      <th className="py-3.5 px-3">الماركة المقترحة</th>
                      <th className="py-3.5 px-3">مكان الاستخدام</th>
                      <th className="py-3.5 px-3">الوحدة</th>
                      <th className="py-3.5 px-3 text-center bg-teal-50/40 text-teal-900">
                        رصيد أول المدة
                      </th>
                      <th className="py-3.5 px-3 text-center bg-emerald-50/40 text-emerald-900">
                        الرصيد الحالي
                      </th>
                      <th className="py-3.5 px-3 text-center">حد إعادة الطلب</th>
                      <th className="py-3.5 px-3">المورد والتليفون</th>
                      <th className="py-3.5 px-3">الحالة</th>
                      <th className="py-3.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedItems.map((item) => {
                      const curr = Number(item.current_stock) || 0;
                      const minTh = Number(item.min_alert_threshold) || 5;
                      const isLow = curr <= minTh && curr > 0;
                      const isOut = curr <= 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            item.is_active === false ? 'opacity-60 bg-slate-50/30' : ''
                          }`}
                        >
                          {/* كود الصنف */}
                          <td className="py-3.5 px-3 font-mono font-black text-slate-900 text-xs">
                            {item.item_code || item.barcode ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                                {item.item_code || item.barcode}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* الصنف / المنتج */}
                          <td className="py-3.5 px-3">
                            <div className="font-black text-slate-900 text-xs">{item.name}</div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={item.notes}>
                                {item.notes}
                              </div>
                            )}
                          </td>

                          {/* النوع */}
                          <td className="py-3.5 px-3">
                            {item.category ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.category}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* الماركة المقترحة */}
                          <td className="py-3.5 px-3 font-bold text-slate-800">
                            {item.brand || <span className="text-slate-400">-</span>}
                          </td>

                          {/* مكان الاستخدام */}
                          <td className="py-3.5 px-3 text-slate-600">
                            {item.usage_location || <span className="text-slate-400">-</span>}
                          </td>

                          {/* الوحدة */}
                          <td className="py-3.5 px-3 font-bold text-slate-600">
                            {item.unit}
                          </td>

                          {/* رصيد أول المدة */}
                          <td className="py-3.5 px-3 text-center bg-teal-50/20 font-mono font-bold text-teal-800">
                            {item.opening_stock !== undefined ? item.opening_stock : item.current_stock}
                          </td>

                          {/* الرصيد الحالي */}
                          <td className="py-3.5 px-3 text-center bg-emerald-50/20">
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'text-slate-900'
                              }`}
                            >
                              {curr}
                            </span>
                          </td>

                          {/* حد إعادة الطلب */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-500">
                            {minTh}
                          </td>

                          {/* المورد وتليفونه */}
                          <td className="py-3.5 px-3">
                            {item.supplier_name ? (
                              <div>
                                <div className="font-bold text-slate-900 text-[11px]">
                                  {item.supplier_name}
                                </div>
                                {item.supplier_phone && (
                                  <a
                                    href={`tel:${item.supplier_phone}`}
                                    className="text-[10px] text-teal-700 font-mono flex items-center gap-1 hover:underline mt-0.5"
                                    dir="ltr"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{item.supplier_phone}</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">غير محدد</span>
                            )}
                          </td>

                          {/* الحالة */}
                          <td className="py-3.5 px-3">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                <span>نافد (0)</span>
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                <span>ناقص - حد الطلب</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>متوفر</span>
                              </span>
                            )}
                          </td>

                          {/* إجراءات */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingItem({ ...item })}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="تعديل بيانات الصنف والرصيد"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingItem(item)}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="حذف الصنف"
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
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/40">
                <div className="text-slate-500 font-bold">
                  الصفحة {currentPage} من {totalPages}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================
          TAB 2: Equipment Register
          ============================================================================== */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-slate-800 text-sm">سجل المعدات والأجهزة التشغيلية ({equipment.length})</h3>
              </div>
            </div>

            {equipment.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد معدات مسجلة بعد. أضف معدة جديدة بالأسفل.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">اسم المعدة / الجهاز</th>
                      <th className="p-3.5">الحالة التشغيلية</th>
                      <th className="p-3.5 text-center">العدد</th>
                      <th className="p-3.5">تاريخ الشراء</th>
                      <th className="p-3.5">سعر الشراء ({settings.currency_symbol})</th>
                      <th className="p-3.5">نسبة الإهلاك السنوية</th>
                      <th className="p-3.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {equipment.map((eq) => (
                      <tr
                        key={eq.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          eq.is_active === false ? 'opacity-70 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="p-3.5 font-bold text-slate-900">{eq.name}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              eq.condition === 'ممتازة'
                                ? 'bg-emerald-100 text-emerald-800'
                                : eq.condition === 'جيدة'
                                ? 'bg-sky-100 text-sky-800'
                                : eq.condition === 'تحتاج صيانة'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {eq.condition}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800">{eq.quantity}</td>
                        <td className="p-3.5 font-mono text-slate-600">{eq.purchase_date}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          {eq.purchase_price} {settings.currency_symbol}
                        </td>
                        <td className="p-3.5 font-mono">{eq.depreciation_rate}%</td>
                        <td className="p-3.5 text-center">
                          {onUpdateEquipment ? (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateEquipment(eq.id, {
                                  is_active: eq.is_active === false ? true : false
                                })
                              }
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                                eq.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                            >
                              <span>{eq.is_active !== false ? 'بالخدمة' : 'خارج الخدمة'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 font-bold">نشط</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Equipment Form */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs max-w-3xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-800 text-base">تسجيل معدة أو ماكينة جديدة بالأصول</h3>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المعدة / الماكينة</label>
                  <input
                    type="text"
                    required
                    placeholder="ماكينة غسيل ضغط عالي Karcher / مكنسة رطب وجاف..."
                    value={newEq.name}
                    onChange={(e) => setNewEq({ ...newEq, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                  <select
                    value={newEq.condition}
                    onChange={(e) => setNewEq({ ...newEq, condition: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ممتازة">ممتازة (جديدة)</option>
                    <option value="جيدة">جيدة (قيد الاستخدام)</option>
                    <option value="تحتاج صيانة">تحتاج صيانة</option>
                    <option value="تالفة">تالفة (تستدعي استبدال)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العدد المتوفر</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newEq.quantity}
                    onChange={(e) => setNewEq({ ...newEq, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الشراء</label>
                  <input
                    type="date"
                    required
                    value={newEq.purchase_date}
                    onChange={(e) => setNewEq({ ...newEq, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر الشراء ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newEq.purchase_price}
                    onChange={(e) => setNewEq({ ...newEq, purchase_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نسبة الإهلاك السنوية (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={newEq.depreciation_rate}
                    onChange={(e) => setNewEq({ ...newEq, depreciation_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                تسجيل المعدة بالأصول
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================================
          TAB 3: Inventory Transactions
          ============================================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-800 text-base">تسجيل حركة مخزون (صرف لعامل / إضافة بفاتورة)</h3>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="worker_issuance">صرف مستلزمات لعامل (-)</option>
                    <option value="addition_purchase">إضافة رصيد بفاتورة مشتريات (+)</option>
                    <option value="adjustment">تسوية جردية (+/-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الصنف</label>
                  <select
                    value={newTx.item_id}
                    onChange={(e) => setNewTx({ ...newTx, item_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (المتوفر: {i.current_stock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newTx.quantity}
                    onChange={(e) => setNewTx({ ...newTx, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                {newTx.type === 'worker_issuance' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الموظف / العامل المستلم</label>
                    <select
                      value={newTx.worker_id}
                      onChange={(e) => setNewTx({ ...newTx, worker_id: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newTx.type === 'addition_purchase' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم فاتورة الشراء</label>
                    <input
                      type="text"
                      placeholder="INV-98234"
                      value={newTx.invoice_ref}
                      onChange={(e) => setNewTx({ ...newTx, invoice_ref: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / الملاحظات</label>
                <input
                  type="text"
                  placeholder="ملاحظات الصرف، سبب الاستهلاك..."
                  value={newTx.notes}
                  onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                حفظ حركة المخزون
              </button>
            </form>
          </div>

          {/* History table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-black text-slate-800 text-xs">سجل حركات المخزون السابقة</h4>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد حركات مسجلة.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">المستلم / الفاتورة / البيان</th>
                      <th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          {tx.type === 'worker_issuance' ? (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">صرف لعامل</span>
                          ) : tx.type === 'opening_balance' ? (
                            <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">رصيد أول المدة</span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">إضافة شراء</span>
                          )}
                        </td>
                        <td className="p-3 font-black text-slate-800">{getItemName(tx.item_id)}</td>
                        <td className="p-3 font-mono font-black text-slate-900">{tx.quantity}</td>
                        <td className="p-3 text-slate-600">
                          {tx.notes || (tx.worker_id ? getWorkerName(tx.worker_id) : tx.invoice_ref || '-')}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">
                          {new Date(tx.created_at || Date.now()).toLocaleDateString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: استيراد وتأكيد بيانات الإكسل (Excel Import Modal)
          ============================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    معاينة واستيراد بيانات المخزون من إكسل
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    الملف: {importFileName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedRows([]);
                  setImportResult(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Import Summary & Stats */}
            {importAnalysis && !importResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[11px] text-slate-500 font-bold block">إجمالي أصناف الملف</span>
                  <span className="text-xl font-black text-slate-900 font-mono">{importAnalysis.totalItems} صنف</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl">
                  <span className="text-[11px] text-emerald-800 font-bold block">الموردين المستخرجين</span>
                  <span className="text-xl font-black text-emerald-950 font-mono">
                    {importAnalysis.totalSuppliersCount} مورد
                  </span>
                  {importAnalysis.newSuppliersCount > 0 && (
                    <span className="text-[10px] text-emerald-700 block font-bold mt-0.5">
                      (سيتم إضافة {importAnalysis.newSuppliersCount} مورد جديد لقسم الموردين تلقائياً)
                    </span>
                  )}
                </div>
                <div className="p-3.5 bg-teal-50 border border-teal-200/80 rounded-2xl">
                  <span className="text-[11px] text-teal-800 font-bold block">التصنيفات المستخرجة</span>
                  <span className="text-xl font-black text-teal-950 font-mono">
                    {importAnalysis.categoriesCount} تصنيف
                  </span>
                </div>
              </div>
            )}

            {/* Success Result View */}
            {importResult && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم استيراد وحفظ البيانات بنجاح!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 block text-[10px]">أصناف جديدة:</span>
                    <strong className="text-emerald-800 font-mono text-base">{importResult.importedItems}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 block text-[10px]">أصناف محدثة:</span>
                    <strong className="text-emerald-800 font-mono text-base">{importResult.updatedItems}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 block text-[10px]">موردين جدد بقسم الموردين:</span>
                    <strong className="text-emerald-800 font-mono text-base">{importResult.newSuppliers}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 block text-[10px]">تصنيفات مضافة:</span>
                    <strong className="text-emerald-800 font-mono text-base">{importResult.categoriesCount}</strong>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <span className="font-bold block">ملاحظات أثناء الاستيراد:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">م</th>
                    <th className="py-2.5 px-3">كود الصنف</th>
                    <th className="py-2.5 px-3">الصنف / المنتج</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">الماركة</th>
                    <th className="py-2.5 px-3">مكان الاستخدام</th>
                    <th className="py-2.5 px-3">الوحدة</th>
                    <th className="py-2.5 px-3 text-center bg-teal-50/60 font-bold">الكمية (أول المدة)</th>
                    <th className="py-2.5 px-3 text-center">حد الطلب</th>
                    <th className="py-2.5 px-3">المورد</th>
                    <th className="py-2.5 px-3">تليفون المورد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{r.index || i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.item_code || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                      <td className="py-2.5 px-3">{r.category || '-'}</td>
                      <td className="py-2.5 px-3">{r.brand || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.usage_location || '-'}</td>
                      <td className="py-2.5 px-3 font-bold">{r.unit || 'قطعة'}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-teal-800 bg-teal-50/20">
                        {r.quantity ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.reorder_level ?? 5}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{r.supplier_name || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600" dir="ltr">
                        {r.supplier_phone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 border-t border-slate-200">
                  يتم عرض أول 50 صنفاً من أصل {parsedRows.length} صنفاً في المعاينة...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                سيتم حفظ الكميات تلقائياً كرصيد أول المدة، وإضافة أي موردين جدد تلقائياً لقسم الموردين.
              </span>

              <div className="flex items-center gap-2">
                {!importResult ? (
                  <>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={handleExecuteImport}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الاستيراد والتخزين...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تأكيد واستيراد البيانات للمخزون والموردين</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setParsedRows([]);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setParsedRows([]);
                      setImportResult(null);
                    }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    تم وإغلاق
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: إضافة صنف استهلاكي يدوي (Manual Add Modal)
          ============================================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-800 text-base">إضافة صنف استهلاكي جديد للمخزون</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الصنف (اختياري)</label>
                  <input
                    type="text"
                    placeholder="WC-CW-001"
                    value={newItem.item_code}
                    onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الصنف / المنتج *</label>
                  <input
                    type="text"
                    required
                    placeholder="شامبو واكس مركز / ملمع إطارات جل"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">النوع / التصنيف</label>
                  <input
                    type="text"
                    placeholder="كيماويات / أدوات استهلاكية..."
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الماركة المقترحة</label>
                  <input
                    type="text"
                    placeholder="SONAX / 3M / Wurth..."
                    value={newItem.brand}
                    onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مكان الاستخدام</label>
                  <input
                    type="text"
                    placeholder="غسيل سيارات / تلميع داخلي..."
                    value={newItem.usage_location}
                    onChange={(e) => setNewItem({ ...newItem, usage_location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وحدة القياس</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="لتر">لتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="عبوة">عبوة</option>
                    <option value="جرام">جرام</option>
                    <option value="كيلو جرام">كيلو جرام</option>
                    <option value="جالون">جالون</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الكمية (رصيد أول المدة)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.opening_stock}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        opening_stock: Number(e.target.value),
                        current_stock: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-teal-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حد إعادة الطلب (التنبيه)</label>
                  <input
                    type="number"
                    min={1}
                    value={newItem.min_alert_threshold}
                    onChange={(e) => setNewItem({ ...newItem, min_alert_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">المورد</label>
                  <input
                    type="text"
                    placeholder="اسم الشركة الموردة أو المحل"
                    value={newItem.supplier_name}
                    onChange={(e) => setNewItem({ ...newItem, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تليفون المورد</label>
                  <input
                    type="text"
                    placeholder="01007888566"
                    value={newItem.supplier_phone}
                    onChange={(e) => setNewItem({ ...newItem, supplier_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة الصنف</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="متوفر">متوفر</option>
                    <option value="ناقص">ناقص</option>
                    <option value="غير متوفر">غير متوفر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تكلفة الوحدة ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">ملاحظات الصنف</label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات الاستخدام أو تعليمات التخفيف..."
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md cursor-pointer transition-all"
                >
                  حفظ الصنف في المخزون
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: تعديل بيانات الصنف (Edit Item Modal)
          ============================================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">تعديل بيانات الصنف والرصيد</h3>
                  <span className="text-[11px] text-slate-400 font-mono">#{editingItem.item_code || editingItem.id.slice(0, 8)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الصنف</label>
                  <input
                    type="text"
                    value={editingItem.item_code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الصنف / المنتج *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">النوع / التصنيف</label>
                  <input
                    type="text"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الماركة المقترحة</label>
                  <input
                    type="text"
                    value={editingItem.brand || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مكان الاستخدام</label>
                  <input
                    type="text"
                    value={editingItem.usage_location || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, usage_location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوحدة</label>
                  <select
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="لتر">لتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="عبوة">عبوة</option>
                    <option value="جرام">جرام</option>
                    <option value="كيلو جرام">كيلو جرام</option>
                    <option value="جالون">جالون</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-teal-800 mb-1">رصيد أول المدة</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.opening_stock ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, opening_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-teal-50/50 border border-teal-200 rounded-xl font-mono font-bold text-teal-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-800 mb-1">الرصيد الحالي المتوفر</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.current_stock}
                    onChange={(e) => setEditingItem({ ...editingItem, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono font-black text-emerald-950"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حد إعادة الطلب</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.min_alert_threshold}
                    onChange={(e) => setEditingItem({ ...editingItem, min_alert_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة المخزون</label>
                  <select
                    value={editingItem.status || 'متوفر'}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="متوفر">متوفر</option>
                    <option value="ناقص">ناقص</option>
                    <option value="غير متوفر">غير متوفر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">المورد</label>
                  <input
                    type="text"
                    value={editingItem.supplier_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تليفون المورد</label>
                  <input
                    type="text"
                    value={editingItem.supplier_phone || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={editingItem.notes || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODAL: تأكيد حذف صنف (Delete Item Confirmation)
          ============================================================================== */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-right">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-800">حذف صنف من المخزون</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف الصنف <strong>"{deletingItem.name}"</strong>؟
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800 leading-relaxed font-medium">
              تنبيه: سيتم إزالة الصنف من أرصدة المخزون ولن يظهر في قوائم الصرف والتقارير.
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف</span>
                )}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
