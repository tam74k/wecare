import React, { useState } from 'react';
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
  Clock
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
    reason: ''
  });

  // New Payment Method State
  const [newMethodName, setNewMethodName] = useState('');

  const mainTreasury = treasuries.find((t) => t.type === 'main') || treasuries[0];
  const subTreasuries = treasuries.filter((t) => t.type !== 'main');
  const totalBalance = treasuries.reduce((acc, t) => acc + Number(t.balance || 0), 0);

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
      created_by: 'المسؤول المالي'
    });

    alert('تم تسجيل الحركة بنجاح!');
    setTxData({
      treasury_id: '',
      type: 'deposit',
      amount: '',
      reason: ''
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

  const getTreasuryName = (id: string) => treasuries.find((t) => t.id === id)?.name || 'خزينة غير محددة';

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
            {subTreasuries.map((t) => (
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
                    className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>تحويل للخزينة الرئيسية</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions History Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-slate-800 text-sm">سجل حركات الخزينة والتحويلات المالية</h4>
              </div>
              <span className="text-xs text-slate-400 font-medium">سجل مدقق بالطابع الزمني والمستخدم</span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">لا توجد حركات مالية مسجلة بعد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">نوع الحركة</th>
                      <th className="p-3.5">الخزينة المعنية</th>
                      <th className="p-3.5">المبلغ ({settings.currency_symbol})</th>
                      <th className="p-3.5">السبب والبيان</th>
                      <th className="p-3.5">المستخدم المسؤول</th>
                      <th className="p-3.5">الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5">
                          {tx.type === 'deposit' && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>إيداع</span>
                            </span>
                          )}
                          {tx.type === 'withdrawal' && (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>سحب</span>
                            </span>
                          )}
                          {tx.type === 'transfer' && (
                            <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>تحويل بين الخزائن</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {getTreasuryName(tx.treasury_id)}
                          {tx.related_treasury_id && (
                            <span className="text-slate-400 font-normal"> ← {getTreasuryName(tx.related_treasury_id)}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 text-sm">
                          {tx.amount.toLocaleString()} {settings.currency_symbol}
                        </td>
                        <td className="p-3.5 text-slate-600">{tx.reason}</td>
                        <td className="p-3.5 text-slate-500">{tx.created_by}</td>
                        <td className="p-3.5 text-slate-400 font-mono">
                          {new Date(tx.created_at || Date.now()).toLocaleString('ar-EG')}
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
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تسجيل حركة نقدية مباشرة (إيداع / سحب)</h3>
              <p className="text-xs text-slate-500">إيداع رأس مال، سحب مصروفات تشغيل، أو تسويات نقدية</p>
            </div>
          </div>

          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الحركة</label>
                <select
                  value={txData.type}
                  onChange={(e) => setTxData({ ...txData, type: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="deposit">إيداع (+)</option>
                  <option value="withdrawal">سحب مصروفات (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الخزينة</label>
                <select
                  required
                  value={txData.treasury_id}
                  onChange={(e) => setTxData({ ...txData, treasury_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">اختر الخزينة...</option>
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.balance} {settings.currency_symbol})
                    </option>
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
