import React, { useState } from 'react';
import {
  InventoryItem,
  InventoryTransaction,
  Equipment,
  Employee,
  Settings,
  EquipmentCondition,
  InventoryTransactionType
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
  ShieldAlert
} from 'lucide-react';

interface InventoryViewProps {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  equipment: Equipment[];
  employees: Employee[];
  settings: Settings;
  onCreateItem: (item: Omit<InventoryItem, 'id' | 'created_at'>) => Promise<InventoryItem>;
  onUpdateItem?: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  onCreateTransaction: (tx: Omit<InventoryTransaction, 'id' | 'created_at'>) => Promise<InventoryTransaction>;
  onCreateEquipment: (eq: Omit<Equipment, 'id' | 'created_at'>) => Promise<Equipment>;
  onUpdateEquipment?: (id: string, updates: Partial<Equipment>) => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  transactions,
  equipment,
  employees,
  settings,
  onCreateItem,
  onUpdateItem,
  onCreateTransaction,
  onCreateEquipment,
  onUpdateEquipment
}) => {
  const [activeTab, setActiveTab] = useState<'consumables' | 'equipment' | 'transactions'>('consumables');

  // New Item State
  const [newItem, setNewItem] = useState({
    name: '',
    unit: 'لتر',
    current_stock: 0,
    min_alert_threshold: 5,
    unit_cost: 0,
    notes: '',
    is_active: true
  });

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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    await onCreateItem(newItem);
    alert('تمت إضافة الصنف للمخزون بنجاح!');
    setNewItem({
      name: '',
      unit: 'لتر',
      current_stock: 0,
      min_alert_threshold: 5,
      unit_cost: 0,
      notes: '',
      is_active: true
    });
  };

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

  const getItemName = (id: string) => items.find((i) => i.id === id)?.name || 'صنف غير محدد';
  const getWorkerName = (id?: string | null) => employees.find((e) => e.id === id)?.full_name || 'غير محدد';

  const lowStockItems = items.filter((i) => Number(i.current_stock) <= Number(i.min_alert_threshold));

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">نظام المخزون والمعدات</h2>
          <p className="text-sm text-slate-500 mt-1">
            إدارة الأصناف الاستهلاكية (شامبو، ملمعات، فوط)، تنبيهات النواقص، سجل المعدات، ونسب الإهلاك
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('consumables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'consumables' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الأصناف الاستهلاكية
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'equipment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل المعدات والآلات
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'transactions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            حركات الصرف والإضافة
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900 font-bold">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              يوجد <strong className="text-amber-950">{lowStockItems.length}</strong> أصناف استهلاكية وصلت للحد الأدنى
              أو أقل! يرجى إصدار فواتير شراء ومراجعة المخزون.
            </span>
          </div>
          <span className="bg-amber-200/80 px-2.5 py-1 rounded-md text-[11px]">تنبيه نواقص</span>
        </div>
      )}

      {/* Tab 1: Consumables Inventory */}
      {activeTab === 'consumables' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">أرصدة الأصناف الاستهلاكية الحالية ({items.length})</h3>
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد أصناف مسجلة بالمخزون بعد. أضف صنفاً جديداً بالأسفل.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                    <tr>
                      <th className="p-4">اسم الصنف</th>
                      <th className="p-4">وحدة القياس</th>
                      <th className="p-4">الكمية المتوفرة</th>
                      <th className="p-4">حد التنبيه الأدنى</th>
                      <th className="p-4">تكلفة الوحدة ({settings.currency_symbol})</th>
                      <th className="p-4">حالة المخزون</th>
                      <th className="p-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {items.map((item) => {
                      const isLow = Number(item.current_stock) <= Number(item.min_alert_threshold);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            item.is_active === false ? 'opacity-70 bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="p-4 font-bold text-slate-900">{item.name}</td>
                          <td className="p-4 text-xs text-slate-500">{item.unit}</td>
                          <td className="p-4 font-mono font-bold text-base text-slate-800">
                            {item.current_stock}
                          </td>
                          <td className="p-4 font-mono text-slate-500 text-xs">{item.min_alert_threshold}</td>
                          <td className="p-4 font-mono font-bold text-emerald-700 text-xs">
                            {item.unit_cost} {settings.currency_symbol}
                          </td>
                          <td className="p-4">
                            {isLow ? (
                              <span className="bg-rose-100 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-md flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>ناقص - يحتاج شراء</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-md">
                                متوفر بشكل كافٍ
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {onUpdateItem ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateItem(item.id, {
                                    is_active: item.is_active === false ? true : false
                                  })
                                }
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                  item.is_active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                                }`}
                                title="انقر للتبديل بين نشط وغير نشط"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.is_active !== false ? 'bg-emerald-500' : 'bg-slate-500'
                                  }`}
                                ></span>
                                <span>{item.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                              </button>
                            ) : (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  item.is_active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {item.is_active !== false ? 'نشط' : 'غير نشط'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Consumable Form */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">إضافة صنف استهلاكي جديد للمخزون</h3>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف</label>
                  <input
                    type="text"
                    required
                    placeholder="شامبو واكس مركز / ملمع إطارات جل"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="لتر">لتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="عبوة">عبوة</option>
                    <option value="جرام">جرام</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد المبدئي</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newItem.current_stock}
                    onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حد التنبيه الأدنى</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.min_alert_threshold}
                    onChange={(e) => setNewItem({ ...newItem, min_alert_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تكلفة الوحدة ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة الصنف / المنتج
                  </label>
                  <select
                    value={newItem.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setNewItem({ ...newItem, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="active">نشط (متاح)</option>
                    <option value="inactive">غير نشط (موقوف)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                إضافة الصنف
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Equipment Register */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">سجل المعدات والأجهزة التشغيلية ({equipment.length})</h3>
              </div>
            </div>

            {equipment.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                لا توجد معدات مسجلة بعد. أضف معدة جديدة بالأسفل.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                    <tr>
                      <th className="p-4">اسم المعدة / الجهاز</th>
                      <th className="p-4">الحالة التشغيلية</th>
                      <th className="p-4">العدد</th>
                      <th className="p-4">تاريخ الشراء</th>
                      <th className="p-4">سعر الشراء ({settings.currency_symbol})</th>
                      <th className="p-4">نسبة الإهلاك السنوية</th>
                      <th className="p-4 text-center">الحالة</th>
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
                        <td className="p-4 font-bold text-slate-900">{eq.name}</td>
                        <td className="p-4">
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
                        <td className="p-4 font-mono font-bold text-slate-800">{eq.quantity}</td>
                        <td className="p-4 font-mono text-xs">{eq.purchase_date}</td>
                        <td className="p-4 font-mono font-bold text-emerald-700 text-xs">
                          {eq.purchase_price.toLocaleString()} {settings.currency_symbol}
                        </td>
                        <td className="p-4 font-mono font-bold text-purple-700 text-xs">
                          {eq.depreciation_rate}%
                        </td>
                        <td className="p-4 text-center">
                          {onUpdateEquipment ? (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateEquipment(eq.id, {
                                  is_active: eq.is_active === false ? true : false
                                })
                              }
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                eq.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                              title="انقر للتبديل بين نشط وغير نشط"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  eq.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              ></span>
                              <span>{eq.is_active !== false ? 'نشط' : 'غير نشط'}</span>
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                eq.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {eq.is_active !== false ? 'نشط' : 'غير نشط'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Equipment Form */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">تسجيل معدة / جهاز جديد</h3>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المعدة</label>
                  <input
                    type="text"
                    required
                    placeholder="ماكينة ضغط مياه كارتشر K5 / مكنسة برميلية"
                    value={newEq.name}
                    onChange={(e) => setNewEq({ ...newEq, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                  <select
                    value={newEq.condition}
                    onChange={(e) => setNewEq({ ...newEq, condition: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="ممتازة">ممتازة</option>
                    <option value="جيدة">جيدة</option>
                    <option value="تحتاج صيانة">تحتاج صيانة</option>
                    <option value="تالفة">تالفة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العدد</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newEq.quantity}
                    onChange={(e) => setNewEq({ ...newEq, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الشراء</label>
                  <input
                    type="date"
                    required
                    value={newEq.purchase_date}
                    onChange={(e) => setNewEq({ ...newEq, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة المعدة (نشط / غير نشط)
                  </label>
                  <select
                    value={newEq.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setNewEq({ ...newEq, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="active">نشط (بالخدمة)</option>
                    <option value="inactive">غير نشط (خارج الخدمة)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                تسجيل المعدة بالأصول
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Inventory Transactions (Issuance to Worker / Purchase) */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">تسجيل حركة مخزون (صرف لعامل / إضافة بفاتورة)</h3>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
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
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                {newTx.type === 'worker_issuance' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الموظف / العامل المستلم</label>
                    <select
                      value={newTx.worker_id}
                      onChange={(e) => setNewTx({ ...newTx, worker_id: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                حفظ حركة المخزون
              </button>
            </form>
          </div>

          {/* History table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs">سجل حركات المخزون السابقة</h4>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">لا توجد حركات مسجلة.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">المستلم / الفاتورة</th>
                      <th className="p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          {tx.type === 'worker_issuance' ? (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">صرف لعامل</span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">إضافة شراء</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{getItemName(tx.item_id)}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{tx.quantity}</td>
                        <td className="p-3 text-slate-600">
                          {tx.worker_id ? getWorkerName(tx.worker_id) : tx.invoice_ref || '-'}
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
    </div>
  );
};
